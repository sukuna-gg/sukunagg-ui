import { expect, type Page, test } from '@playwright/test'

// ParticleField (@sukunagg/fx, docs/component-particle-field.md §9) in a real browser: the canvas
// draws on the shared loop, pauses in a hidden tab, holds one still frame under reduced motion,
// and the stage stays dark under the light theme. Helpers follow test/browser/fx-loop.test.ts.

const story = (id: string, theme = 'dark') =>
  `/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`
const PLAYGROUND = 'fx-particlefield--playground'
const root = '[data-sk-fx="particle-field"]'

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

const snapshot = (page: Page) =>
  page.locator(`${root} canvas`).evaluate((c: HTMLCanvasElement) => c.toDataURL())

test.beforeEach(({ page }) => countFrames(page))

test.describe('ParticleField', () => {
  test.describe('motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('draws rising embers on the shared loop, over the CSS poster', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story(PLAYGROUND))
      const stage = page.locator(root)
      await expect(stage).toHaveAttribute('data-state', 'running')
      await expect(stage).toHaveAttribute('data-theme', 'dark')
      await expect(page.getByRole('heading', { name: 'Crimson Ascent' })).toBeVisible()
      await expect.poll(() => framesIn(page, 300)).toBeGreaterThan(5)
      const a = await snapshot(page)
      await page.waitForTimeout(200)
      expect(await snapshot(page)).not.toBe(a)
      // The poster embers fade out and the canvas fades in once the loop has drawn.
      const canvas = page.locator(`${root} canvas`)
      await expect(canvas).toHaveCSS('opacity', '1', { timeout: 5000 })
      const poster = stage.locator('[class*="particle-field-embers"]')
      await expect(poster).toHaveCSS('opacity', '0', { timeout: 5000 })
      // The haze breathes.
      const haze = stage.locator('[class*="animate-particle-field-haze"]')
      await expect(haze).toHaveCSS('animation-name', 'sk-particle-field-haze')
      expect(errors).toEqual([])
    })

    test('pauses in a hidden tab, cancelling its frame (and the haze), then resumes', async ({
      page,
    }) => {
      await page.goto(story(PLAYGROUND))
      const stage = page.locator(root)
      await expect(stage).toHaveAttribute('data-state', 'running')
      await setHidden(page, true)
      await expect(stage).toHaveAttribute('data-state', 'paused')
      await expect.poll(() => framesIn(page, 300)).toBe(0)
      const haze = stage.locator('[class*="animate-particle-field-haze"]')
      await expect(haze).toHaveCSS('animation-play-state', 'paused')
      await setHidden(page, false)
      await expect(stage).toHaveAttribute('data-state', 'running')
      await expect.poll(() => framesIn(page, 300)).toBeGreaterThan(5)
    })

    test('stays an always-dark stage under the light theme', async ({ page }) => {
      await page.goto(story(PLAYGROUND, 'light'))
      const stage = page.locator(root)
      await expect(stage).toHaveAttribute('data-state', 'running')
      await expect(stage).toHaveCSS('background-color', 'rgb(0, 0, 0)') // --sk-well, dark
      await expect(page.getByRole('heading', { name: 'Crimson Ascent' })).toBeVisible()
    })

    test('mirrors under dir="rtl" and widens the shade on a narrow stage', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story('fx-particlefield--right-to-left'))
      await expect(page.locator(root)).toHaveAttribute('data-state', 'running')
      const side = await page
        .locator(root)
        .evaluate((el) => getComputedStyle(el).getPropertyValue('--sk-particle-field-s').trim())
      expect(side).toBe('-1')
      await page.goto(story('fx-particlefield--narrow'))
      await expect(page.locator(root)).toHaveAttribute('data-state', 'running')
      const shade = await page
        .locator(`${root} [class*="particle-field-scrim"]`)
        .evaluate((el) => getComputedStyle(el, '::before').backgroundImage)
      expect(shade).toContain('75%') // the narrow (< 500 px) start-side shade
      expect(errors).toEqual([])
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('draws one still frame, never loops, and stops the haze', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story(PLAYGROUND))
      const stage = page.locator(root)
      await expect(stage).toHaveAttribute('data-state', 'still')
      expect(await framesIn(page, 500)).toBe(0)
      const blank = await page.evaluate(() => {
        const c = document.createElement('canvas')
        const box = document.querySelector(
          '[data-sk-fx="particle-field"] canvas',
        ) as HTMLCanvasElement
        c.width = box.width
        c.height = box.height
        return c.toDataURL()
      })
      expect(await snapshot(page)).not.toBe(blank)
      await expect(page.locator(`${root} canvas`)).toHaveCSS('opacity', '1')
      const haze = stage.locator('[class*="animate-particle-field-haze"]')
      await expect(haze).toHaveCSS('animation-name', 'none')
      expect(errors).toEqual([])
    })
  })
})
