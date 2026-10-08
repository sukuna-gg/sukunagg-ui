import { expect, type Page, test } from '@playwright/test'

// RetroGrid (docs/component-retro-grid.md §9, §10). Asserts computed styles and Web Animations
// state, never wall-clock timing, so it stays deterministic.
const story = (id: string, theme: 'dark' | 'light' = 'dark') =>
  `/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`
const ROOT = '[data-sk-retro-grid]'

const errorsOf = (page: Page) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  return errors
}

/** Names of the CSS animations playing inside the first RetroGrid, sorted. */
const runningAnimations = (page: Page) =>
  page
    .locator(ROOT)
    .first()
    .evaluate((el) =>
      el
        .getAnimations({ subtree: true })
        .filter((a) => a.playState === 'running')
        .map((a) => (a as CSSAnimation).animationName)
        .sort(),
    )

const computed = (page: Page, selector: string, prop: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p).trim(), prop)

// The story chrome loads Archivo from Google Fonts: answer with an empty stylesheet so the spec
// never depends on the network (and a blocked request can't log a console error).
test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  )
})

test.describe('RetroGrid', () => {
  test.describe('motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('renders the hero over the grid and runs all four loops', async ({ page }) => {
      const errors = errorsOf(page)
      await page.goto(story('components-retrogrid--playground'))
      await expect(page.getByRole('heading', { name: 'Arena' })).toBeVisible()
      await expect
        .poll(() => runningAnimations(page))
        .toEqual([
          'sk-retro-grid-beam',
          'sk-retro-grid-beam',
          'sk-retro-grid-emit',
          'sk-retro-grid-scroll',
          'sk-retro-grid-scroll',
          'sk-retro-grid-sweep',
        ])
      // The horizon line sits at 62% of the height and the copy stays above it.
      const geometry = await page
        .locator(ROOT)
        .first()
        .evaluate((el) => {
          const r = el.getBoundingClientRect()
          const line = el.querySelector('.retro-grid-line')?.getBoundingClientRect()
          const heading = el.querySelector('h1')?.getBoundingClientRect()
          return {
            horizon: ((line?.top ?? 0) + (line?.height ?? 0) / 2 - r.top) / r.height,
            copyAbove: (heading?.bottom ?? Infinity) < (line?.top ?? 0),
          }
        })
      expect(geometry.horizon).toBeCloseTo(0.62, 2)
      expect(geometry.copyAbove).toBe(true)
      expect(errors).toEqual([])
    })

    test('`speed` sets the floor tempo', async ({ page }) => {
      await page.goto(story('components-retrogrid--speeds'))
      await expect(page.locator(ROOT)).toHaveCount(3)
      const durations = await page
        .locator(`${ROOT} .retro-grid-plane`)
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).animationDuration))
      expect(durations).toEqual(['2.4s', '1.2s', '0.6s'])
    })

    test('the light theme resolves the light palette; a dark region nested in light stays dark', async ({
      page,
    }) => {
      await page.goto(story('components-retrogrid--themes'))
      const roots = page.locator(ROOT)
      await expect(roots).toHaveCount(2)
      const core = (i: number) =>
        roots.nth(i).evaluate((el) => getComputedStyle(el).getPropertyValue('--sk-retro-grid-core'))
      // Dark frame: the hot line is accent mixed into text; light frame: pure crimson ink.
      expect(await core(0)).toContain('color-mix')
      expect((await core(1)).trim().toUpperCase()).toBe('#D8253A')
      // Wrap the light frame's grid in a dark region: the dark palette must win again.
      await roots.nth(1).evaluate((el) => {
        const dark = document.createElement('div')
        dark.dataset.theme = 'dark'
        el.before(dark)
        dark.append(el)
      })
      expect(await core(1)).toContain('color-mix')
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('lands on a still, lit grid with no animation', async ({ page }) => {
      const errors = errorsOf(page)
      await page.goto(story('components-retrogrid--playground'))
      await expect(page.getByRole('heading', { name: 'Arena' })).toBeVisible()
      expect(
        await page
          .locator(ROOT)
          .first()
          .evaluate((el) => el.getAnimations({ subtree: true }).length),
      ).toBe(0)
      expect(await computed(page, `${ROOT} .retro-grid-plane`, 'animation-name')).toBe('none')
      expect(await computed(page, `${ROOT} .retro-grid-glow`, 'opacity')).toBe('0.78')
      await expect(page.locator(`${ROOT} .retro-grid-sweep`)).toBeHidden()
      // The floor rests on its tilt and the spotlights at their start angle.
      const cosTilt = await page
        .locator(`${ROOT} .retro-grid-plane`)
        .first()
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m22)
      expect(cosTilt).toBeCloseTo(Math.cos((75 * Math.PI) / 180), 3)
      expect(await computed(page, `${ROOT} .retro-grid-beam`, 'rotate')).toBe('-28deg')
      expect(errors).toEqual([])
    })

    test('every story is a complete still frame', async ({ page }) => {
      for (const id of ['landing-hero', 'speeds', 'phone', 'backdrop', 'themes']) {
        await page.goto(story(`components-retrogrid--${id}`, 'light'))
        await expect(page.locator(ROOT).first()).toBeVisible()
        const live = await page
          .locator(ROOT)
          .evaluateAll((els) => els.flatMap((el) => el.getAnimations({ subtree: true })).length)
        expect(live).toBe(0)
      }
    })
  })
})
