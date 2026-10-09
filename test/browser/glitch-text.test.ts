import { expect, type Page, test } from '@playwright/test'

// GlitchText (docs/component-glitch-text.md §9). Asserts computed styles and the Web Animations
// API, never wall-clock timing: animations are paused and seeked to a known point of the 3.5s
// cycle (the burst keyframes are stepped, so a seek lands on an exact frame).
const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`
const root = '[data-sk-glitch-text]'
/** root > frame > text (the real text) and the frame's last child (the edge streak). */
const text = `${root} > span > span:first-child`
const edge = `${root} > span > span[aria-hidden]:last-child`

const css = (page: Page, selector: string, prop: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

/** Animation names running on the root and every layer under it. */
const animationNames = (page: Page) =>
  page
    .locator(root)
    .first()
    .evaluate((el) =>
      el
        .getAnimations({ subtree: true })
        .map((a) => (a as CSSAnimation).animationName)
        .sort(),
    )

/** Pause every animation under the root at `ms` after mount (the cycle runs from a -3.08s delay). */
const seek = (page: Page, ms: number) =>
  page
    .locator(root)
    .first()
    .evaluate((el, t) => {
      for (const a of el.getAnimations({ subtree: true })) {
        a.pause()
        a.currentTime = t
      }
    }, ms)

/** Fails the test on any console error or uncaught exception. */
const watchErrors = (page: Page) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(String(e)))
  return errors
}

test.describe('GlitchText', () => {
  test.describe('motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('renders the killfeed story with the text once in the accessibility tree', async ({
      page,
    }) => {
      const errors = watchErrors(page)
      await page.goto(story('components-glitchtext--killfeed'))
      const heading = page.getByRole('heading', { name: 'Eliminated', exact: true })
      await expect(heading).toBeVisible()
      await expect(heading).toHaveAttribute('data-sk-glitch-text', '')
      // The copies are hidden from AT: one heading, no stray "Eliminated" text nodes exposed.
      await expect(page.getByRole('heading')).toHaveCount(1)
      expect(errors).toEqual([])
    })

    test('runs the burst loop, the fringe split and the intro', async ({ page }) => {
      await page.goto(story('components-glitchtext--killfeed'))
      await expect(page.locator(root)).toBeVisible()
      // Declared animations (the intro ones finish within 700ms, so read the computed names).
      expect(await css(page, root, 'animation-name')).toBe('sk-glitch-text-burst, sk-glitch-text-k')
      expect(await css(page, text, 'animation-name')).toBe(
        'sk-glitch-text-wipe, sk-glitch-text-settle',
      )
      // The loops keep running while mounted: the burst on the root, the split on both fringes.
      const names = await animationNames(page)
      expect(names.filter((n) => n === 'sk-glitch-text-burst')).toHaveLength(1)
      expect(names.filter((n) => n === 'sk-glitch-text-split')).toHaveLength(2)
    })

    test('the @property registrations shipped and the burst opens the slice band', async ({
      page,
    }) => {
      await page.goto(story('components-glitchtext--killfeed'))
      await expect(page.locator(root)).toBeVisible()

      // Clean phase (2s in): registered, typed values, band closed, intro settled.
      await seek(page, 2000)
      expect(await css(page, root, '--sk-glitch-text-y0')).toBe('0%')
      expect(await css(page, root, '--sk-glitch-text-y1')).toBe('0%')
      expect(await css(page, root, '--sk-glitch-text-k')).toBe('1')
      expect(await css(page, root, 'transform')).toBe('none')

      // 3.65s in = the third burst step (91.6% of the cycle): band 18%–27%, word nudged left.
      await seek(page, 3650)
      expect(await css(page, root, '--sk-glitch-text-y0')).toBe('18%')
      expect(await css(page, root, '--sk-glitch-text-y1')).toBe('27%')
      expect(await css(page, root, 'transform')).not.toBe('none')
      const streak = page.locator(edge)
      expect(await streak.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThan(0)
    })

    test('remounting with a new key replays it from the start', async ({ page }) => {
      await page.goto(story('components-glitchtext--killfeed'))
      await expect(page.locator(root)).toBeVisible()
      // Park the old instance far into its loop, then let the story's Replay change the key.
      await seek(page, 10_000)
      await page.getByRole('button', { name: 'Replay' }).click()
      await expect
        .poll(() =>
          page
            .locator(root)
            .first()
            .evaluate((el) =>
              el
                .getAnimations()
                .filter((a) => (a as CSSAnimation).animationName === 'sk-glitch-text-burst')
                .map((a) => a.playState === 'running' && Number(a.currentTime) < 10_000),
            ),
        )
        .toEqual([true])
    })

    test('a full-width root keeps the page scroll width through every burst step', async ({
      page,
    }) => {
      // The documented `block` setup: the heading fills its row, inside the story's gutter. The
      // copies move by text-shadow (ink overflow) and the edge streak stays in the frame, so no
      // step of the intro burst or the loop may widen the page (it used to by up to 0.4em + 8%).
      await page.setViewportSize({ width: 520, height: 700 })
      await page.goto(story('components-glitchtext--headings'))
      const heading = page.locator(root).first()
      await expect(heading).toBeVisible()
      await heading.evaluate((el) => {
        el.style.display = 'block'
        el.style.justifySelf = 'stretch'
      })
      const overflow = () =>
        page.evaluate(() => {
          const d = document.documentElement
          return d.scrollWidth - d.clientWidth
        })
      expect(await overflow()).toBe(0)
      // Each of the seven 52.5ms steps (88.6%…97.6% of 3.5s), in the first burst and a later one.
      const steps = [88.6, 90.1, 91.6, 93.1, 94.6, 96.1, 97.6].map((p) => p * 35 - 3080 + 10)
      for (const t of [...steps, ...steps.map((ms) => ms + 3500)]) {
        await seek(page, t)
        expect(await overflow(), `${t}ms after mount`).toBe(0)
      }
    })

    test('the scanline texture uses solid line stops faded by its layer', async ({ page }) => {
      // Firefox paints a color-mix() stop inside a 3px repeating gradient as one flat tint, so
      // the stops must be plain colours and the 30% comes from the layer's opacity.
      await page.goto(story('components-glitchtext--scanline'))
      await expect(page.locator(root)).toBeVisible()
      const scan = `${root} .glitch-text-scanlines`
      expect(await css(page, scan, 'opacity')).toBe('0.3')
      expect(await css(page, scan, 'background-image')).toMatch(
        /^repeating-linear-gradient\(rgba\(0, 0, 0, 0\) 0px, rgba\(0, 0, 0, 0\) 2px, rgb\(\d+, \d+, \d+\) 2px, rgb\(\d+, \d+, \d+\) 3px\)$/,
      )
    })

    test('intro={false} runs only the loop, and the layers stay aligned inside padding', async ({
      page,
    }) => {
      await page.goto(story('components-glitchtext--no-intro'))
      await expect(page.locator(root)).toBeVisible()
      expect(await css(page, root, 'animation-name')).toBe('sk-glitch-text-burst')
      expect(await css(page, text, 'animation-name')).toBe('none')
      // The story's pill pads the root; the shard must still sit exactly on the text's box.
      expect(await css(page, root, 'padding-left')).not.toBe('0px')
      const boxes = await page
        .locator(`${root} > span`)
        .first()
        .evaluate((frame) => {
          const [t, shard] = [frame.children[0], frame.children[1]] as HTMLElement[]
          return [t?.offsetLeft, t?.offsetTop, shard?.offsetLeft, shard?.offsetTop]
        })
      expect(boxes).toEqual([0, 0, 0, 0])
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('shows the clean text: no animations, no glitch layers', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story('components-glitchtext--killfeed'))
      const heading = page.getByRole('heading', { name: 'Eliminated', exact: true })
      await expect(heading).toBeVisible()
      expect(await css(page, root, 'animation-name')).toBe('none')
      expect(await css(page, text, 'animation-name')).toBe('none')
      expect(await animationNames(page)).toEqual([])
      const layers = await page
        .locator(`${root} [aria-hidden]`)
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).display))
      expect(layers.length).toBeGreaterThan(0)
      expect(layers.every((d) => d === 'none')).toBe(true)
      expect(errors).toEqual([])
    })
  })
})
