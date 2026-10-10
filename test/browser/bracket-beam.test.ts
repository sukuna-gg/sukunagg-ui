import { expect, type Page, test } from '@playwright/test'

// BracketBeam (docs/component-bracket-beam.md §10) in a real browser. The island's state lives on
// its scroller (`[data-sk-fx="bracket-beam"] > section`); helpers as in fx-loop.test.ts.

const story = (id: string, theme = 'dark') =>
  `/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`
const PLAYGROUND = 'fx-bracketbeam--playground'
const PHONE = 'fx-bracketbeam--phone'
const DOUBLE = 'fx-bracketbeam--double-elimination'
const root = '[data-sk-fx="bracket-beam"]'
const scroller = `${root} > section`
const svg = `${scroller} svg[focusable="false"]:not([viewBox])`

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

/** The first base wire's path (the SVG's first group, after the glow filter). */
const firstWire = (page: Page) =>
  page.locator(`${svg} > g`).first().locator('path').first().getAttribute('d')

test.beforeEach(({ page }) => countFrames(page))

test.describe('BracketBeam', () => {
  test.describe('motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('swaps the CSS poster for SVG wires and plays the beam on the shared loop', async ({
      page,
    }) => {
      const errors = watchErrors(page)
      await page.goto(story(PLAYGROUND))
      await expect(page.locator(scroller)).toHaveAttribute('data-state', 'running')
      await expect.poll(() => framesIn(page, 500)).toBeGreaterThan(2)
      // The poster wires fade out, the island's SVG fades in.
      const opacity = (selector: string) =>
        page
          .locator(selector)
          .first()
          .evaluate((el) => getComputedStyle(el).opacity)
      await expect.poll(() => opacity(`${root} li > span[aria-hidden]`)).toBe('0')
      await expect.poll(() => opacity(`${svg} >> xpath=..`)).toBe('1')
      // The lit frame fades, then the beam travels: rows dim, a head appears, the trophy ignites.
      await expect(page.locator(`${root} [data-trail][data-dim]`).first()).toBeAttached({
        timeout: 4000,
      })
      await expect(page.locator(`${svg} circle[r="2.3"][visibility="visible"]`)).toBeAttached({
        timeout: 4000,
      })
      await expect(page.locator(`${root} [data-match="champion"]:not([data-dim])`)).toBeAttached({
        timeout: 6000,
      })
      expect(errors).toEqual([])
    })

    test('routes its wires from the measured layout and follows a resize', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.goto(story(PLAYGROUND))
      await expect(page.locator(scroller)).toHaveAttribute('data-state', 'running')
      await expect.poll(() => firstWire(page)).toMatch(/^M/)
      const before = await firstWire(page)
      await page.setViewportSize({ width: 820, height: 720 })
      await expect.poll(() => firstWire(page)).not.toBe(before)
    })

    test('pauses while the tab is hidden, cancelling its frame, and resumes', async ({ page }) => {
      await page.goto(story(PLAYGROUND))
      await expect(page.locator(scroller)).toHaveAttribute('data-state', 'running')
      await setHidden(page, true)
      await expect(page.locator(scroller)).toHaveAttribute('data-state', 'paused')
      await expect.poll(() => framesIn(page, 300)).toBe(0)
      await setHidden(page, false)
      await expect(page.locator(scroller)).toHaveAttribute('data-state', 'running')
    })

    test('pauses off-screen, cancelling its frame, and resumes', async ({ page }) => {
      await page.goto(story(PLAYGROUND))
      const region = page.locator(scroller)
      await expect(region).toHaveAttribute('data-state', 'running')
      await page.evaluate(() => {
        const spacer = document.createElement('div')
        spacer.id = 'bb-spacer'
        spacer.style.height = '4000px'
        document.body.prepend(spacer)
      })
      await expect(region).toHaveAttribute('data-state', 'paused')
      await expect.poll(() => framesIn(page, 300)).toBe(0)
      await page.evaluate(() => document.getElementById('bb-spacer')?.remove())
      await expect(region).toHaveAttribute('data-state', 'running')
      await expect.poll(() => framesIn(page, 500)).toBeGreaterThan(2)
    })

    // Chromium refreshes a MediaQueryList's cached value whenever `.matches` is read, so a loop
    // that reads it every frame can miss the `change` event; this pins the live path both ways.
    test('switches to the still frame and back when reduced motion changes live', async ({
      page,
    }) => {
      await page.goto(story(PLAYGROUND))
      const region = page.locator(scroller)
      await expect(region).toHaveAttribute('data-state', 'running')
      await expect.poll(() => framesIn(page, 500)).toBeGreaterThan(2)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await expect(region).toHaveAttribute('data-state', 'still')
      await expect.poll(() => framesIn(page, 300)).toBe(0)
      await expect(page.locator(`${root} [data-dim]`)).toHaveCount(0)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await expect(region).toHaveAttribute('data-state', 'running')
      await expect.poll(() => framesIn(page, 500)).toBeGreaterThan(2)
    })

    test('never widens its scroller: the trophy shock ring stays inside the grid', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1240, height: 720 })
      await page.goto(story(PLAYGROUND))
      const region = page.locator(scroller)
      await expect(region).toHaveAttribute('data-state', 'running')
      // Sample a full 6 s loop (ignition, shock ring, embers) plus a little.
      const overflow = await region.evaluate(async (el) => {
        let worst = Number.NEGATIVE_INFINITY
        const end = performance.now() + 6500
        while (performance.now() < end) {
          worst = Math.max(worst, el.scrollWidth - el.clientWidth)
          await new Promise((resolve) => setTimeout(resolve, 40))
        }
        return worst
      })
      expect(overflow).toBeLessThanOrEqual(0)
      await expect(region).not.toHaveAttribute('tabindex')
    })

    test('fills a container it fits without scrolling (columns shrink first)', async ({ page }) => {
      for (const [id, width] of [
        ['fx-bracketbeam--sixteen-teams', 1240],
        [PLAYGROUND, 900],
      ] as const) {
        await page.setViewportSize({ width, height: 720 })
        await page.goto(story(id))
        const region = page.locator(scroller)
        await expect(region).toHaveAttribute('data-state', 'running')
        await page.evaluate(() => document.fonts.ready)
        expect(await region.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(
          0,
        )
        await expect(region).not.toHaveAttribute('tabindex')
      }
    })

    test('on a phone it overflows: a tab stop that follows the beam', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story(PHONE))
      const region = page.locator(scroller)
      await expect(region).toHaveAttribute('data-state', 'running')
      await expect(region).toHaveAttribute('tabindex', '0')
      // The bold winner names fit the fixed 146px columns (no ellipsis in any engine).
      await page.evaluate(() => document.fonts.ready)
      const clipped = await region.evaluate((el) =>
        [...el.querySelectorAll<HTMLElement>('[data-row] > span')]
          .filter((s) => getComputedStyle(s).textOverflow === 'ellipsis')
          .filter((s) => s.scrollWidth > s.clientWidth)
          .map((s) => s.textContent),
      )
      expect(clipped).toEqual([])
      await expect
        .poll(() => region.evaluate((el) => el.scrollLeft), { timeout: 8000 })
        .toBeGreaterThan(0)
      expect(errors).toEqual([])
    })

    test('a bracket without a champion is static: the loop settles', async ({ page }) => {
      await page.goto(story('fx-bracketbeam--in-progress'))
      await expect(page.locator(scroller)).toHaveAttribute('data-state', 'running')
      await expect.poll(() => framesIn(page, 300)).toBe(0)
      await expect(page.locator(`${root} [data-match="champion"]`)).toHaveCount(0)
    })

    test('double elimination: the beam reaches the trophy along a lower-bracket path', async ({
      page,
    }) => {
      const errors = watchErrors(page)
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(story(DOUBLE))
      const region = page.locator(scroller)
      await expect(region).toHaveAttribute('data-state', 'running')
      // Three of the champion's rows are in the lower band, one with their drop chip.
      await expect(page.locator(`${root} [aria-label="Lower bracket"] [data-trail]`)).toHaveCount(3)
      await expect(page.locator(`${root} [data-trail] [data-drop]`)).toHaveCount(1)
      // Watch one loop: the trophy goes pending, the drop chip's row lights, the beam's head then
      // travels below the lower band's top, and the trophy ignites after that.
      const journey = await region.evaluate(async (el) => {
        const grid = el.firstElementChild as HTMLElement
        const lower = grid.querySelector('[aria-label="Lower bracket"]') as HTMLElement
        const lowerTop = lower.getBoundingClientRect().top - grid.getBoundingClientRect().top
        const card = grid.querySelector('[data-match="champion"]') as HTMLElement
        const dropRow = grid.querySelector('[data-trail]:has([data-drop])') as HTMLElement
        const head = grid.querySelector('svg circle[r="2.3"]') as SVGCircleElement
        let pending = false
        let dropLit = -1
        let headBelow = -1
        let crowned = -1
        const t0 = performance.now()
        while (performance.now() - t0 < 16000 && crowned < 0) {
          const t = Math.round(performance.now() - t0)
          const dim = card.hasAttribute('data-dim')
          if (dim) pending = true
          if (pending && dim && dropLit < 0 && !dropRow.hasAttribute('data-dim')) dropLit = t
          const below = Number(head.getAttribute('cy')) > lowerTop
          if (
            dropLit >= 0 &&
            headBelow < 0 &&
            head.getAttribute('visibility') === 'visible' &&
            below
          )
            headBelow = t
          if (headBelow >= 0 && !dim) crowned = t
          await new Promise((resolve) => setTimeout(resolve, 25))
        }
        return { pending, dropLit, headBelow, crowned }
      })
      expect(journey.pending).toBe(true)
      expect(journey.dropLit).toBeGreaterThan(0)
      expect(journey.headBelow).toBeGreaterThan(journey.dropLit)
      expect(journey.crowned).toBeGreaterThan(journey.headBelow)
      // Every row on the path is lit once the trophy has ignited.
      await expect(page.locator(`${root} [data-trail][data-dim]`)).toHaveCount(0)
      expect(errors).toEqual([])
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('one still frame: the path and the trophy lit, no loops, no frames', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story(PLAYGROUND))
      await expect(page.locator(scroller)).toHaveAttribute('data-state', 'still')
      expect(await framesIn(page, 500)).toBe(0)
      await expect(page.locator(`${root} [data-dim]`)).toHaveCount(0)
      const row = page.locator(`${root} [data-trail]`).first()
      expect(await row.evaluate((el) => getComputedStyle(el, '::before').opacity)).toBe('1')
      const card = page.locator(`${root} [data-match="champion"]`)
      expect(await card.evaluate((el) => getComputedStyle(el, '::after').animationName)).toBe(
        'none',
      )
      const bloom = card.locator(':scope > span[aria-hidden]')
      expect(await bloom.evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
      expect(await bloom.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
      // The trail is drawn in full and no beam head is out.
      await expect(page.locator(`${svg} circle[visibility="visible"]`)).toHaveCount(0)
      expect(errors).toEqual([])
    })

    test('double elimination: one still frame, the whole path and the drop chip lit', async ({
      page,
    }) => {
      await page.goto(story(DOUBLE))
      await expect(page.locator(scroller)).toHaveAttribute('data-state', 'still')
      expect(await framesIn(page, 500)).toBe(0)
      await expect(page.locator(`${root} [data-dim]`)).toHaveCount(0)
      await expect(page.locator(`${root} [data-trail]`)).toHaveCount(7)
      // The SVG trail is drawn along every wire on the path: six of the seven steps (the drop has
      // no wire, so its trail has no length).
      const lengths = await page
        .locator(`${svg} g[filter] > g:first-child > path[stroke-dasharray]`)
        .evaluateAll((paths) => paths.map((p) => Number(p.getAttribute('pathLength'))))
      expect(lengths).toHaveLength(7)
      expect(lengths.filter((length) => length > 1)).toHaveLength(6)
    })

    test('an overflowing bracket shows the trophy at once', async ({ page }) => {
      await page.goto(story(PHONE))
      const region = page.locator(scroller)
      await expect(region).toHaveAttribute('data-state', 'still')
      await expect
        .poll(() => region.evaluate((el) => el.scrollWidth - el.clientWidth - el.scrollLeft))
        .toBeLessThan(2)
    })
  })
})
