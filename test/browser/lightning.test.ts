import { expect, type Page, test } from '@playwright/test'

// Lightning (@sukunagg/fx, docs/component-lightning.md §10) in a real browser: the WebGL island on
// the shared loop. Asserts `data-state`, rAF counts and canvas reads (the context keeps its drawing
// buffer, so toDataURL works), never wall-clock timing. Helpers copied from fx-loop.test.ts.

const story = (id: string, theme = 'dark') =>
  `/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`
const GRAND_FINAL = 'fx-lightning--grand-final'
const root = '[data-sk-fx="lightning"]'
const canvas = `${root} canvas`

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

const pixels = (page: Page) =>
  page.locator(canvas).evaluate((c: HTMLCanvasElement) => c.toDataURL())

/** The canvas column (0–1 across) with the brightest pixels on its middle row. */
const boltX = (page: Page) =>
  page.locator(canvas).evaluate((c: HTMLCanvasElement) => {
    const gl = c.getContext('webgl') as WebGLRenderingContext
    const y = Math.floor(c.height / 2)
    const row = new Uint8Array(c.width * 4)
    gl.readPixels(0, y, c.width, 1, gl.RGBA, gl.UNSIGNED_BYTE, row)
    let best = 0
    let at = 0
    for (let x = 0; x < c.width; x++) {
      const sum = (row[x * 4] ?? 0) + (row[x * 4 + 1] ?? 0) + (row[x * 4 + 2] ?? 0)
      if (sum > best) [best, at] = [sum, x]
    }
    return at / c.width
  })

test.beforeEach(({ page }) => countFrames(page))

test.describe('Lightning', () => {
  test.describe('motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('renders the banner and storms on the shared loop', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story(GRAND_FINAL))
      await expect(page.getByRole('heading', { name: 'Grand Final' })).toBeVisible()
      await expect(page.locator(root)).toHaveAttribute('data-state', 'running')
      await expect(page.locator(root)).toHaveAttribute('data-theme', 'dark')
      await expect(page.locator(canvas)).toHaveCSS('opacity', '1')
      // > 0, not ~60/s: software WebGL (WebKit, CI) renders a full-screen shader slowly.
      await expect.poll(() => framesIn(page, 300)).toBeGreaterThan(0)
      const a = await pixels(page)
      await expect.poll(() => pixels(page)).not.toBe(a)
      expect(errors).toEqual([])
    })

    test('puts the bolt where `position` says', async ({ page }) => {
      await page.goto(`${story('fx-lightning--playground')}&args=position:0.3;paused:!true`)
      await expect(page.locator(root)).toHaveAttribute('data-state', 'paused')
      expect(await boltX(page)).toBeLessThan(0.45)
      await page.goto(`${story('fx-lightning--playground')}&args=position:0.85;paused:!true`)
      await expect(page.locator(root)).toHaveAttribute('data-state', 'paused')
      expect(await boltX(page)).toBeGreaterThan(0.7)
    })

    test('pauses while the tab is hidden, and resumes', async ({ page }) => {
      await page.goto(story(GRAND_FINAL))
      await expect(page.locator(root)).toHaveAttribute('data-state', 'running')
      await setHidden(page, true)
      await expect(page.locator(root)).toHaveAttribute('data-state', 'paused')
      await expect.poll(() => framesIn(page, 300)).toBe(0)
      await setHidden(page, false)
      await expect(page.locator(root)).toHaveAttribute('data-state', 'running')
    })

    test('falls back to the poster on context loss, and rebuilds on restore', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story(GRAND_FINAL))
      await expect(page.locator(root)).toHaveAttribute('data-state', 'running')
      await page.locator(canvas).evaluate((c: HTMLCanvasElement) => {
        const ext = c.getContext('webgl')?.getExtension('WEBGL_lose_context')
        ;(window as unknown as { __lose: unknown }).__lose = ext
        ext?.loseContext()
      })
      await expect(page.locator(root)).toHaveAttribute('data-state', 'lost')
      await expect(page.locator(canvas)).toHaveCSS('opacity', '0')
      await expect(page.locator(`${root} svg`).first()).toBeVisible()
      await page.evaluate(() =>
        (window as unknown as { __lose: WEBGL_lose_context }).__lose.restoreContext(),
      )
      await expect(page.locator(root)).toHaveAttribute('data-state', 'running')
      await expect(page.locator(canvas)).toHaveCSS('opacity', '1')
      expect(errors).toEqual([])
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('holds one still frame of the bolt and never loops', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story(GRAND_FINAL, 'light'))
      await expect(page.locator(root)).toHaveAttribute('data-state', 'still')
      await page.waitForTimeout(300) // let page-load frames (not ours) drain first
      expect(await framesIn(page, 500)).toBe(0)
      const blank = await page.evaluate(() => document.createElement('canvas').toDataURL())
      const still = await pixels(page)
      expect(still).not.toBe(blank)
      await page.waitForTimeout(200)
      expect(await pixels(page)).toBe(still)
      expect(errors).toEqual([])
    })
  })

  test.describe('without WebGL', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('keeps the server-rendered poster and reports `off`', async ({ page }) => {
      const errors = watchErrors(page)
      await page.addInitScript(() => {
        const get = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...a) {
          return /webgl/.test(String(a[0])) ? null : Reflect.apply(get, this, a)
        } as typeof get
      })
      await page.goto(story(GRAND_FINAL))
      await expect(page.locator(root)).toHaveAttribute('data-state', 'off')
      await expect(page.locator(canvas)).toHaveCSS('opacity', '0')
      await expect(page.locator(`${root} svg`)).toHaveCount(2)
      await expect(page.locator(`${root} svg`).first()).toBeVisible()
      await page.waitForTimeout(300) // let page-load frames (not ours) drain first
      expect(await framesIn(page, 300)).toBe(0)
      expect(errors).toEqual([])
    })
  })
})
