import { expect, type Page, test } from '@playwright/test'

// The shared @sukunagg/fx frame loop (packages/fx/src/internal/loop.ts) in a real browser, through
// its internal reference story. Every fx effect spec (test/browser/<effect>.test.ts) builds on the
// same helpers: count rAF calls to prove the loop ticks or idles, and assert `data-state`.

const story = (id: string, theme = 'dark') =>
  `/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`
const LOOP = 'fx-internals-loop--playground'
const root = '[data-sk-fx="loop"]'

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

test.beforeEach(({ page }) => countFrames(page))

test.describe('fx loop', () => {
  test.describe('motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('runs one shared frame loop and draws', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story(LOOP))
      await expect(page.locator(root)).toHaveAttribute('data-state', 'running')
      await expect.poll(() => framesIn(page, 300)).toBeGreaterThan(1)
      const canvas = page.locator(`${root} canvas`)
      const a = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())
      await page.waitForTimeout(200)
      expect(await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(a)
      expect(errors).toEqual([])
    })

    test('pauses while the tab is hidden, cancelling its frame, and resumes', async ({ page }) => {
      await page.goto(story(LOOP))
      await expect(page.locator(root)).toHaveAttribute('data-state', 'running')
      await setHidden(page, true)
      await expect(page.locator(root)).toHaveAttribute('data-state', 'paused')
      await expect.poll(() => framesIn(page, 300)).toBe(0)
      await setHidden(page, false)
      await expect(page.locator(root)).toHaveAttribute('data-state', 'running')
      await expect.poll(() => framesIn(page, 300)).toBeGreaterThan(1)
    })

    test('pauses off-screen (IntersectionObserver) and resumes in view', async ({ page }) => {
      await page.goto(story(LOOP))
      await expect(page.locator(root)).toHaveAttribute('data-state', 'running')
      await page.locator(root).evaluate((el) => {
        ;(el as HTMLElement).style.marginTop = '3000px'
      })
      await expect(page.locator(root)).toHaveAttribute('data-state', 'paused')
      await expect.poll(() => framesIn(page, 300)).toBe(0)
      await page.locator(root).scrollIntoViewIfNeeded()
      await expect(page.locator(root)).toHaveAttribute('data-state', 'running')
    })
  })

  test.describe('DPR cap', () => {
    test.use({ deviceScaleFactor: 3 })

    test('caps the backing store at 2x', async ({ page }) => {
      await page.goto(story(LOOP))
      const canvas = page.locator(`${root} canvas`)
      await expect(page.locator(root)).toHaveAttribute('data-state', 'running')
      expect(await canvas.evaluate((c: HTMLCanvasElement) => c.width / c.clientWidth)).toBeCloseTo(
        2,
        1,
      )
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('draws one still frame and never loops', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story(LOOP))
      await expect(page.locator(root)).toHaveAttribute('data-state', 'still')
      expect(await framesIn(page, 500)).toBe(0)
      const blank = await page.evaluate(() => {
        const c = document.createElement('canvas')
        return c.toDataURL()
      })
      const canvas = page.locator(`${root} canvas`)
      expect(await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(blank)
      expect(errors).toEqual([])
    })

    test('re-reads the theme and redraws the still frame on a data-theme change', async ({
      page,
    }) => {
      await page.goto(story(LOOP, 'dark'))
      const canvas = page.locator(`${root} canvas`)
      await expect(page.locator(root)).toHaveAttribute('data-state', 'still')
      const dark = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())
      await page
        .locator('[data-theme="dark"]')
        .first()
        .evaluate((el) => {
          el.setAttribute('data-theme', 'light')
        })
      await expect
        .poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
        .not.toBe(dark)
    })
  })
})

test.describe('fx DOM loop (useFxLoop)', () => {
  test.use({ reducedMotion: 'no-preference' })
  const dom = '[data-sk-fx="loop-dom"]'

  test('requests no frames once settled, and wakes on input', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto(story('fx-internals-loop--settling'))
    const el = page.locator(dom)
    await expect(el).toHaveAttribute('data-state', 'running')
    await expect.poll(() => framesIn(page, 300)).toBe(0) // at rest: running, but idle
    const box = await el.boundingBox()
    if (!box) throw new Error('no box')
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2)
    expect(await framesIn(page, 150)).toBeGreaterThan(3)
    await expect.poll(() => framesIn(page, 300), { timeout: 5000 }).toBe(0)
    const x = await el.evaluate((n) => Number(getComputedStyle(n).getPropertyValue('--sk-loop-x')))
    expect(x).toBeCloseTo(0.9, 1)
    expect(errors).toEqual([])
  })
})
