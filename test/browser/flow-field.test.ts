import { expect, type Page, test } from '@playwright/test'

// FlowField (docs/component-flow-field.md §10) in a real browser. Same helpers as fx-loop.test.ts:
// count rAF calls to prove the shared loop ticks or idles, and assert the loop's `data-state`.

const story = (id: string, theme = 'dark') =>
  `/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`
const QUEUE = 'fx-flowfield--matchmaking-queue'
const root = '[data-sk-fx="flow-field"]'

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

/** The trails canvas as a data URL (Canvas 2D, so it can be compared). */
const pixels = (page: Page) =>
  page
    .locator(`${root} canvas`)
    .first()
    .evaluate((c: HTMLCanvasElement) => c.toDataURL())

test.beforeEach(({ page }) => countFrames(page))

test.describe('FlowField', () => {
  test.describe('motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('renders the queue story, streams on the shared loop and fades the poster out', async ({
      page,
    }) => {
      const errors = watchErrors(page)
      await page.goto(story(QUEUE))
      const field = page.locator(root)
      await expect(field).toHaveAttribute('data-state', 'running')
      await expect(page.getByText('Searching for match…')).toBeVisible()
      await expect.poll(() => framesIn(page, 300)).toBeGreaterThan(5)
      const a = await pixels(page)
      await page.waitForTimeout(200)
      expect(await pixels(page)).not.toBe(a)
      await expect(field.locator('canvas').first()).toHaveCSS('opacity', '1')
      await expect(field.locator('.flow-field-poster')).toHaveCSS('opacity', '0')
      expect(errors).toEqual([])
    })

    test('stays dark in a light app', async ({ page }) => {
      await page.goto(story(QUEUE, 'light'))
      const field = page.locator(root)
      await expect(field).toHaveAttribute('data-theme', 'dark')
      await expect(field).toHaveCSS('background-color', 'rgb(0, 0, 0)')
    })

    test('pauses while the tab is hidden, cancelling its frame, and resumes', async ({ page }) => {
      await page.goto(story(QUEUE))
      const field = page.locator(root)
      await expect(field).toHaveAttribute('data-state', 'running')
      await setHidden(page, true)
      await expect(field).toHaveAttribute('data-state', 'paused')
      await expect.poll(() => framesIn(page, 300)).toBe(0)
      await setHidden(page, false)
      await expect(field).toHaveAttribute('data-state', 'running')
      await expect.poll(() => framesIn(page, 300)).toBeGreaterThan(5)
    })

    test('keeps streaming, calmer, after Cancel (calm), without remounting', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story(QUEUE))
      const field = page.locator(root)
      await expect(field).toHaveAttribute('data-state', 'running')
      const canvas = await field.locator('canvas').first().elementHandle()
      await page.getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByText('Ready to queue')).toBeVisible()
      await expect(field).toHaveAttribute('data-state', 'running')
      const a = await pixels(page)
      await page.waitForTimeout(200)
      expect(await pixels(page)).not.toBe(a)
      // Same canvas element: the prop change applied live.
      expect(await canvas?.evaluate((c) => c.isConnected)).toBe(true)
      expect(errors).toEqual([])
    })

    test('runs every density side by side', async ({ page }) => {
      await page.goto(story('fx-flowfield--densities'))
      const fields = page.locator(root)
      await expect(fields).toHaveCount(3)
      for (const field of await fields.all())
        await expect(field).toHaveAttribute('data-state', /running|paused/)
      await expect(fields.first()).toHaveAttribute('data-state', 'running')
    })
  })

  test.describe('DPR cap', () => {
    test.use({ deviceScaleFactor: 3, reducedMotion: 'no-preference' })

    test('caps the trails backing store at 2x and keeps the glow at a third', async ({ page }) => {
      await page.goto(story(QUEUE))
      await expect(page.locator(root)).toHaveAttribute('data-state', 'running')
      const [trails, glow] = await page
        .locator(`${root} canvas`)
        .evaluateAll((cs) =>
          (cs as HTMLCanvasElement[]).map((c) => ({ w: c.width, css: c.clientWidth })),
        )
      expect((trails?.w ?? 0) / (trails?.css ?? 1)).toBeCloseTo(2, 1)
      expect((glow?.w ?? 0) / (glow?.css ?? 1)).toBeCloseTo(1 / 3, 1)
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('draws one still frame, never loops, and the queue timer keeps ticking', async ({
      page,
    }) => {
      const errors = watchErrors(page)
      await page.goto(story(QUEUE))
      const field = page.locator(root)
      await expect(field).toHaveAttribute('data-state', 'still')
      const timer = page.getByRole('timer')
      const before = await timer.textContent()
      expect(await framesIn(page, 500)).toBe(0)
      const blank = await page.evaluate(() => document.createElement('canvas').toDataURL())
      const still = await pixels(page)
      expect(still).not.toBe(blank)
      await page.waitForTimeout(400)
      expect(await pixels(page)).toBe(still) // no motion
      // Information keeps going (brief §3): the clock still advances under reduced motion.
      await expect(timer).not.toHaveText(before ?? '', { timeout: 2500 })
      expect(errors).toEqual([])
    })

    test('redraws the still frame when calm changes', async ({ page }) => {
      await page.goto(story(QUEUE))
      await expect(page.locator(root)).toHaveAttribute('data-state', 'still')
      const active = await pixels(page)
      await page.getByRole('button', { name: 'Cancel' }).click()
      await expect.poll(() => pixels(page)).not.toBe(active)
      expect(await framesIn(page, 300)).toBe(0)
    })
  })
})
