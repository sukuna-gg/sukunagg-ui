import { expect, type Page, test } from '@playwright/test'

// HoloCard (@sukunagg/fx, docs/component-holo-card.md §9–10) in a real browser. The idle drift is a
// CSS @property animation (no rAF); the tilt is a spring on the shared fx loop that writes
// --sk-holo-card-x/-y/-a on the scene and requests no frames once settled. Helpers as in
// test/browser/fx-loop.test.ts.

const story = (id: string, theme = 'dark') =>
  `/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`
const CARD = 'fx-holocard--player-card'
const root = '[data-sk-fx="holo-card"]'
const scene = `${root} > [data-state]`

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

const card = `${root} .holo-card-edge`
const glare = `${root} .holo-card-glare`

test.beforeEach(({ page }) => countFrames(page))

test.describe('HoloCard', () => {
  test.describe('motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('renders flat, drifts its sheen in CSS and requests no frames at rest', async ({
      page,
    }) => {
      const errors = watchErrors(page)
      await page.goto(story(CARD))
      await expect(page.locator(scene)).toHaveAttribute('data-state', 'running')
      await expect(page.getByRole('group', { name: /^ryomen, Duelist/ })).toBeVisible()
      expect(await computed(page, scene, 'animation-name')).toBe('sk-holo-card-drift')
      // A registered <number> (the @property shipped), moving with the drift.
      const t0 = await computed(page, scene, '--sk-holo-card-t')
      expect(t0).toMatch(/^\d/)
      await expect.poll(() => computed(page, scene, '--sk-holo-card-t')).not.toBe(t0)
      await expect.poll(() => framesIn(page, 300)).toBe(0) // settled: the loop sleeps
      expect(await computed(page, card, 'transform')).toBe('matrix(1, 0, 0, 1, 0, 0)')
      expect(errors).toEqual([])
    })

    test('tilts toward the pointer, then springs back and sleeps', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story(CARD))
      await expect(page.locator(scene)).toHaveAttribute('data-state', 'running')
      const box = await page.locator(root).boundingBox()
      if (!box) throw new Error('no box')
      await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.15, { steps: 4 })
      expect(await framesIn(page, 150)).toBeGreaterThan(0) // the spring is running
      await expect.poll(async () => (await tilt(page)).a).toBe(1)
      const held = await tilt(page)
      expect(held.x).toBeCloseTo(0.8, 1)
      expect(held.y).toBeCloseTo(-0.7, 1)
      expect(await computed(page, card, 'transform')).toMatch(/^matrix3d\(/)
      await page.mouse.move(2, 2, { steps: 2 })
      await expect.poll(() => tilt(page)).toEqual({ x: 0, y: 0, a: 0 })
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
      await expect.poll(async () => (await tilt(page)).a).toBe(1)
      expect(await tilt(page)).toEqual({ x: 0.68, y: -0.34, a: 1 })
      await page.keyboard.press('Escape')
      await expect.poll(() => tilt(page)).toEqual({ x: 0, y: 0, a: 0 })
    })

    test('pauses the loop and the drift while the tab is hidden', async ({ page }) => {
      await page.goto(story(CARD))
      await expect(page.locator(scene)).toHaveAttribute('data-state', 'running')
      await setHidden(page, true)
      await expect(page.locator(scene)).toHaveAttribute('data-state', 'paused')
      expect(await computed(page, scene, 'animation-play-state')).toBe('paused')
      await setHidden(page, false)
      await expect(page.locator(scene)).toHaveAttribute('data-state', 'running')
      expect(await computed(page, scene, 'animation-play-state')).toBe('running')
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
      expect(await computed(page, scene, 'animation-name')).toBe('none')
      expect(await computed(page, card, 'transform')).toBe('none')
      expect(await computed(page, glare, 'background-image')).toMatch(/^linear-gradient\(/)
      await expect(page.getByText('Static sheen for reduced motion')).toBeVisible()
      const box = await page.locator(root).boundingBox()
      if (!box) throw new Error('no box')
      await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.15, { steps: 4 })
      await page.keyboard.press('Tab')
      await page.keyboard.press('ArrowRight')
      expect(await framesIn(page, 500)).toBe(0)
      expect(await tilt(page)).toEqual({ x: 0, y: 0, a: 0 })
      expect(errors).toEqual([])
    })
  })
})
