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

/**
 * For each floor layer of the first RetroGrid, as fractions of its box's height (0 = horizon,
 * 1 = bottom): `side`, where the line of the layer's left side edge meets the frame's left side
 * (above it the layer no longer reaches the frame side, so its mask must already be clear there or
 * the edge shows as a staircase), and `far`, where its far edge lies. Projects the layer's real
 * computed transform through its box's perspective.
 */
const sideEdgeDepths = (page: Page) =>
  page
    .locator(ROOT)
    .first()
    .evaluate((root) => {
      const depth = (sel: string) => {
        const el = root.querySelector(sel)
        const box = el?.parentElement
        if (!(el instanceof HTMLElement) || !box) throw new Error(`missing ${sel}`)
        const bcs = getComputedStyle(box)
        const d = Number.parseFloat(bcs.perspective)
        const [px = 0, py = 0] = bcs.perspectiveOrigin.split(' ').map(Number.parseFloat)
        const cs = getComputedStyle(el)
        const m = new DOMMatrix(cs.transform)
        const [ox = 0, oy = 0] = cs.transformOrigin.split(' ').map(Number.parseFloat)
        // A point of the layer's border box → the box's 2D plane, through the perspective.
        const project = (x: number, y: number) => {
          const p = m.transformPoint(new DOMPoint(x - ox, y - oy, 0, 1))
          const s = d / (d - p.z / p.w)
          return {
            x: px + (el.offsetLeft + ox + p.x / p.w - px) * s,
            y: py + (el.offsetTop + oy + p.y / p.w - py) * s,
          }
        }
        const far = project(0, 0)
        const near = project(0, el.offsetHeight)
        const side = far.y + ((near.y - far.y) * (0 - far.x)) / (near.x - far.x)
        return { side: side / box.clientHeight, far: far.y / box.clientHeight }
      }
      return {
        plane: depth('.retro-grid-plane'),
        near: depth('.retro-grid-plane-near'),
        sweep: depth('.retro-grid-sweep'),
      }
    })

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
      // A shared dev server can be slow to mount three stages; the default 5s once flaked.
      await expect(page.locator(ROOT)).toHaveCount(3, { timeout: 15_000 })
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
        roots
          .nth(i)
          .evaluate((el) => getComputedStyle(el).getPropertyValue('--sk-retro-grid-core').trim())
      const accent = await roots
        .nth(1)
        .evaluate((el) => getComputedStyle(el).getPropertyValue('--sk-accent').trim())
      // Dark frame: the hot line is accent mixed into text; light frame: the pure accent ink.
      expect(await core(0)).toContain('color-mix')
      expect(accent).not.toBe('')
      expect((await core(1)).toLowerCase()).toBe(accent.toLowerCase())
      // Wrap the light frame's grid in a dark region: the dark palette must win again.
      await roots.nth(1).evaluate((el) => {
        const dark = document.createElement('div')
        dark.dataset.theme = 'dark'
        el.before(dark)
        dark.append(el)
      })
      expect(await core(1)).toContain('color-mix')
    })

    // Full-viewport heroes: every floor layer must reach both frame sides before its mask turns
    // opaque, or the horizontal lines stop short near the horizon in a stepped trapezoid.
    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 2560, height: 1440 },
    ]) {
      test(`the floor reaches the frame sides in a ${viewport.width}x${viewport.height} full-viewport hero`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport)
        await page.goto(story('components-retrogrid--full-viewport'))
        await expect(page.getByRole('heading', { name: 'Arena' })).toBeVisible()
        // Freeze every loop at its first frame (the wave rests on its tilt before its delay).
        await page.evaluate(() => {
          for (const a of document.getAnimations()) {
            a.pause()
            a.currentTime = 0
          }
        })
        const height = await page
          .locator(ROOT)
          .first()
          .evaluate((el) => el.getBoundingClientRect().height)
        expect(height).toBeGreaterThanOrEqual(viewport.height - 48)
        const { plane, near, sweep } = await sideEdgeDepths(page)
        // The floor mask is clear down to 11% (far plane, wave); the near mask down to 26%. Both
        // planes' far edges sit in that clear band too; the wave is a band, so only its sides count.
        expect(Math.max(plane.side, plane.far)).toBeLessThanOrEqual(0.11)
        expect(sweep.side).toBeLessThanOrEqual(0.11)
        expect(Math.max(near.side, near.far)).toBeLessThanOrEqual(0.26)
      })
    }
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
      // Both planes rest on their 75deg tilt (m22/m11 = cos 75deg, whatever the model's zoom), and
      // the spotlights at their start angle.
      const tilts = await page
        .locator(`${ROOT} .retro-grid-plane, ${ROOT} .retro-grid-plane-near`)
        .evaluateAll((els) =>
          els.slice(0, 2).map((el) => {
            const m = new DOMMatrix(getComputedStyle(el).transform)
            return m.m22 / m.m11
          }),
        )
      expect(tilts).toHaveLength(2)
      for (const tilt of tilts) expect(tilt).toBeCloseTo(Math.cos((75 * Math.PI) / 180), 3)
      expect(await computed(page, `${ROOT} .retro-grid-beam`, 'rotate')).toBe('-28deg')
      expect(errors).toEqual([])
    })

    test('a stage under 560px wide shrinks the cells and moves the spotlights out', async ({
      page,
    }) => {
      for (const [id, cell, from, to] of [
        ['playground', '72px', 0.28, 0.72],
        ['phone', '56px', 0.18, 0.82],
      ] as const) {
        await page.goto(story(`components-retrogrid--${id}`))
        await expect(page.locator(ROOT)).toHaveCount(1)
        const layout = await page
          .locator(ROOT)
          .first()
          .evaluate((root) => {
            const width = root.getBoundingClientRect().width
            const near = root.querySelector('.retro-grid-plane-near')
            const beams = [...root.querySelectorAll('.retro-grid-beam')]
            return {
              size: near ? getComputedStyle(near).backgroundSize.split(',')[0]?.trim() : '',
              beams: beams.map((b) => Number.parseFloat(getComputedStyle(b).left) / width),
            }
          })
        expect(layout.size).toBe(`${cell} ${cell}`)
        expect(layout.beams[0]).toBeCloseTo(from, 2)
        expect(layout.beams[1]).toBeCloseTo(to, 2)
      }
    })

    test('every story is a complete still frame', async ({ page }) => {
      const errors = errorsOf(page)
      for (const id of ['landing-hero', 'full-viewport', 'speeds', 'phone', 'backdrop', 'themes']) {
        await page.goto(story(`components-retrogrid--${id}`, 'light'))
        // Six story loads in one test: allow a slow (shared) Storybook server.
        await expect(page.locator(ROOT).first()).toBeVisible({ timeout: 15_000 })
        const live = await page
          .locator(ROOT)
          .evaluateAll((els) => els.flatMap((el) => el.getAnimations({ subtree: true })).length)
        expect(live).toBe(0)
      }
      expect(errors).toEqual([])
    })
  })
})
