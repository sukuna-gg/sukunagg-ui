import { expect, type Page, test } from '@playwright/test'

// HoloCard (@sukunagg/fx, docs/component-holo-card.md §9–10) in a real browser. The card is flat at
// rest; the idle drift moves only its light layers (foil band and dots, glare) with compositor-only
// transform animations, so it costs no rAF and no repaint. The tilt is a spring on the shared fx
// loop that writes --sk-holo-card-x/-y/-a on the scene and requests no frames once settled.
// Helpers as in test/browser/fx-loop.test.ts.

const story = (id: string, theme = 'dark', args = '') =>
  `/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}${args ? `&args=${args}` : ''}`
const CARD = 'fx-holocard--player-card'
const root = '[data-sk-fx="holo-card"]'
const scene = `${root} > [data-state]`
const card = `${root} .holo-card-edge`
const glare = `${root} .holo-card-glare`
const DRIFT = 'sk-holo-card-drift-x, sk-holo-card-drift-y'
const FLAT = 'matrix(1, 0, 0, 1, 0, 0)'
/** The spring settles in about a second, but a software-composited engine runs few frames. */
const SETTLE = { timeout: 10_000 }

type W = Window & { __rafCalls: number }

/** Wrap rAF before any page script runs, so "is the loop ticking?" becomes a count. */
const countFrames = (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as W
    w.__rafCalls = 0
    const raf = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (cb) => {
      w.__rafCalls++
      return raf(cb)
    }
  })

/** rAF calls made during the next `ms` milliseconds. */
const framesIn = async (page: Page, ms: number) => {
  const read = () => page.evaluate(() => (window as unknown as W).__rafCalls)
  const before = await read()
  await page.waitForTimeout(ms)
  return (await read()) - before
}

/** Headless pages are always visible: fake a tab switch. */
const setHidden = (page: Page, hidden: boolean) =>
  page.evaluate((h) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (h ? 'hidden' : 'visible'),
    })
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h })
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)

/** Fail the test on any console error or uncaught exception. */
const watchErrors = (page: Page) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  return errors
}

/** The tilt the island last wrote (0 before it writes anything). */
const tilt = (page: Page) =>
  page
    .locator(scene)
    .first()
    .evaluate((el) => {
      const read = (axis: string) =>
        Number((el as HTMLElement).style.getPropertyValue(`--sk-holo-card-${axis}`) || 0)
      return { x: read('x'), y: read('y'), a: read('a') }
    })

const computed = (page: Page, selector: string, prop: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

/** Where the glare's drift has carried it: both animated properties. */
const glareAt = async (page: Page) =>
  `${await computed(page, glare, 'translate')} | ${await computed(page, glare, 'transform')}`

/** Hover the card near its top-right corner. */
const hoverCorner = async (page: Page) => {
  const box = await page.locator(root).first().boundingBox()
  if (!box) throw new Error('no box')
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.15, { steps: 4 })
}

test.beforeEach(({ page }) => countFrames(page))

test.describe('HoloCard', () => {
  test.describe('motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('rests flat, drifts its light on the compositor and requests no frames', async ({
      page,
    }) => {
      const errors = watchErrors(page)
      await page.goto(story(CARD))
      await expect(page.locator(scene)).toHaveAttribute('data-state', 'running')
      await expect(page.getByRole('group', { name: /^ryomen, Duelist/ })).toBeVisible()
      // Only the light layers animate, and only transforms (no @property, nothing repainted).
      expect(await computed(page, glare, 'animation-name')).toBe(DRIFT)
      expect(await computed(page, scene, 'animation-name')).toBe('none')
      expect(await computed(page, card, 'animation-name')).toBe('none')
      const from = await glareAt(page)
      await expect.poll(() => glareAt(page)).not.toBe(from)
      await expect.poll(() => framesIn(page, 300)).toBe(0) // settled: the loop sleeps
      // The card itself never moves at rest (no sway): flat now, and still flat later.
      expect(await computed(page, card, 'transform')).toBe(FLAT)
      await page.waitForTimeout(600)
      expect(await computed(page, card, 'transform')).toBe(FLAT)
      expect(errors).toEqual([])
    })

    test('tilts toward the pointer, then springs back and sleeps', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story(CARD))
      await expect(page.locator(scene)).toHaveAttribute('data-state', 'running')
      await hoverCorner(page)
      await expect.poll(() => framesIn(page, 150), SETTLE).toBeGreaterThan(0) // springing
      await expect.poll(async () => (await tilt(page)).a, SETTLE).toBe(1)
      const held = await tilt(page)
      expect(held.x).toBeCloseTo(0.8, 1)
      expect(held.y).toBeCloseTo(-0.7, 1)
      expect(await computed(page, card, 'transform')).toMatch(/^matrix3d\(/)
      await page.mouse.move(2, 2, { steps: 2 })
      await expect.poll(() => tilt(page), SETTLE).toEqual({ x: 0, y: 0, a: 0 })
      await expect.poll(() => framesIn(page, 300)).toBe(0)
      expect(errors).toEqual([])
    })

    test('tilts with the arrow keys, rings the card, and resets with Escape', async ({ page }) => {
      await page.goto(story(CARD))
      await expect(page.locator(scene)).toHaveAttribute('data-state', 'running')
      await page.keyboard.press('Tab')
      await expect(page.locator(root)).toBeFocused()
      await expect(page.locator(card)).toHaveCSS('outline-style', 'solid')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowUp')
      // Each axis settles on its own: wait for the whole tuple.
      await expect.poll(() => tilt(page), SETTLE).toEqual({ x: 0.68, y: -0.34, a: 1 })
      await page.keyboard.press('Escape')
      await expect.poll(() => tilt(page), SETTLE).toEqual({ x: 0, y: 0, a: 0 })
    })

    test('pauses the loop and the drift while the tab is hidden', async ({ page }) => {
      await page.goto(story(CARD))
      await expect(page.locator(scene)).toHaveAttribute('data-state', 'running')
      await setHidden(page, true)
      await expect(page.locator(scene)).toHaveAttribute('data-state', 'paused')
      expect(await computed(page, glare, 'animation-play-state')).toBe('paused')
      await setHidden(page, false)
      await expect(page.locator(scene)).toHaveAttribute('data-state', 'running')
      expect(await computed(page, glare, 'animation-play-state')).toBe('running')
    })

    test('pauses the loop and the drift while scrolled off-screen', async ({ page }) => {
      await page.goto(story(CARD))
      await expect(page.locator(scene)).toHaveAttribute('data-state', 'running')
      await page.evaluate(() => {
        const spacer = document.createElement('div')
        spacer.style.height = '4000px'
        document.body.append(spacer)
        window.scrollTo(0, 3000)
      })
      await expect(page.locator(scene)).toHaveAttribute('data-state', 'paused')
      expect(await computed(page, glare, 'animation-play-state')).toBe('paused')
      const held = await glareAt(page)
      await expect.poll(() => framesIn(page, 300)).toBe(0)
      expect(await glareAt(page)).toBe(held) // the drift holds still too
      await page.evaluate(() => window.scrollTo(0, 0))
      await expect(page.locator(scene)).toHaveAttribute('data-state', 'running')
      expect(await computed(page, glare, 'animation-play-state')).toBe('running')
    })

    test('the `paused` prop holds the drift and ignores input', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story('fx-holocard--playground', 'dark', 'paused:!true'))
      await expect(page.locator(scene)).toHaveAttribute('data-state', 'paused')
      expect(await computed(page, glare, 'animation-play-state')).toBe('paused')
      const held = await glareAt(page)
      await hoverCorner(page)
      await page.keyboard.press('Tab')
      await expect(page.locator(root)).toBeFocused()
      await page.keyboard.press('ArrowRight')
      expect(await framesIn(page, 400)).toBe(0)
      expect(await tilt(page)).toEqual({ x: 0, y: 0, a: 0 })
      expect(await glareAt(page)).toBe(held)
      expect(await computed(page, card, 'transform')).toBe(FLAT)
      expect(errors).toEqual([])
    })

    test('flattens a tilted card when reduced motion switches on, and back', async ({ page }) => {
      await page.goto(story(CARD))
      await expect(page.locator(scene)).toHaveAttribute('data-state', 'running')
      await page.keyboard.press('Tab')
      await page.keyboard.press('ArrowLeft')
      await expect.poll(async () => (await tilt(page)).a, SETTLE).toBe(1)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await expect(page.locator(scene)).toHaveAttribute('data-state', 'still')
      expect(await tilt(page)).toEqual({ x: 0, y: 0, a: 0 })
      expect(await computed(page, card, 'transform')).toBe('none')
      expect(await computed(page, glare, 'animation-name')).toBe('none')
      await expect.poll(() => framesIn(page, 300)).toBe(0)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await expect(page.locator(scene)).toHaveAttribute('data-state', 'running')
      expect(await computed(page, glare, 'animation-name')).toBe(DRIFT)
    })

    test('renders in the light theme without errors', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story('fx-holocard--roster', 'light'))
      await expect(page.locator(root)).toHaveCount(3)
      await expect(page.locator(scene).first()).toHaveAttribute('data-state', 'running')
      // The card pins dark; the page-theme accent is captured on the scene first.
      expect(await page.locator(card).first().getAttribute('data-theme')).toBe('dark')
      expect(errors).toEqual([])
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('holds a flat, still card with a static sheen and ignores input', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story(CARD))
      await expect(page.locator(scene)).toHaveAttribute('data-state', 'still')
      expect(await computed(page, glare, 'animation-name')).toBe('none')
      expect(await computed(page, card, 'transform')).toBe('none')
      expect(await computed(page, glare, 'background-image')).toMatch(/^linear-gradient\(/)
      await expect(page.getByText('Static sheen for reduced motion')).toBeVisible()
      await hoverCorner(page)
      await page.keyboard.press('Tab')
      await page.keyboard.press('ArrowRight')
      expect(await framesIn(page, 500)).toBe(0)
      expect(await tilt(page)).toEqual({ x: 0, y: 0, a: 0 })
      expect(errors).toEqual([])
    })
  })
})
