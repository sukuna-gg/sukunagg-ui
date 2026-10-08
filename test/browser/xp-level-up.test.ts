import { expect, type Page, test } from '@playwright/test'

// XpLevelUp (docs/component-xp-level-up.md §10). Asserts computed styles and Web Animations state,
// never wall-clock timing: animations are paused and seeked, or finished, before reading.
const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`
const STORIES = ['playground', 'xp-gain', 'narrow', 'replay', 'themes'] as const

/** Names of the running XpLevelUp keyframes (CSS animations only). */
const xpAnimations = (page: Page) =>
  page.evaluate(() =>
    document
      .getAnimations()
      .map((a) => (a as CSSAnimation).animationName)
      .filter((n) => n?.startsWith('sk-xp-level-up-')),
  )
/** Pause every animation at `ms` after mount (delays included). */
const seek = (page: Page, ms: number) =>
  page.evaluate((t) => {
    for (const a of document.getAnimations()) {
      a.pause()
      a.currentTime = t
    }
  }, ms)
/** Jump every (finite) animation to its end. */
const settle = (page: Page) =>
  page.evaluate(() => {
    for (const a of document.getAnimations()) a.finish()
  })
const css = (page: Page, selector: string, prop: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)
/** Visible fill width as a fraction of the bar (the fill is translated left inside a clip). */
const fillRatio = (page: Page, fill: string) =>
  page.evaluate((sel) => {
    const bar = document.querySelector('[role="progressbar"]')?.getBoundingClientRect()
    const f = document.querySelector(sel)?.getBoundingClientRect()
    return bar && f ? (f.right - bar.left) / bar.width : Number.NaN
  }, fill)

const NUM = '[class~="xp-level-up-level"]'
const PCT = '[class~="xp-level-up-pct"]'
const REFILL = '[class~="animate-xp-level-up-refill"]'
const PRELUDE = '[class~="animate-xp-level-up-prelude"]'
const HEADLINE = '[class~="animate-xp-level-up-headline"]'
const RING = '[class~="animate-xp-level-up-ring"]'
const FLASH = '[class~="animate-xp-level-up-flash"]'

test.describe('XpLevelUp', () => {
  test('every story renders without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    page.on('pageerror', (e) => errors.push(String(e)))
    for (const id of STORIES) {
      await page.goto(story(`components-xplevelup--${id}`))
      await expect(page.getByRole('progressbar').first()).toBeVisible()
      await expect(page.getByText('Level 42').first()).toBeAttached()
    }
    expect(errors).toEqual([])
  })

  test.describe('motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('plays fill → flash → burst → count → settle on mount', async ({ page }) => {
      await page.goto(story('components-xplevelup--playground'))
      await expect(page.getByRole('progressbar')).toBeVisible()
      const names = await xpAnimations(page)
      for (const n of ['in', 'out', 'fill', 'burst', 'spark', 'roll', 'title', 'count']) {
        expect(names, n).toContain(`sk-xp-level-up-${n}`)
      }
    })

    test('the counters are registered integers that count level − 1 → level', async ({ page }) => {
      await page.goto(story('components-xplevelup--playground'))
      await expect(page.locator(NUM)).toBeAttached()
      // Mid-fill: the pct readout runs from `from` (t 0 → 100) and the badge still shows level − 1.
      await seek(page, 700)
      const t = Number(await css(page, PCT, '--sk-xp-level-up-t'))
      expect(t).toBeGreaterThan(0)
      expect(t).toBeLessThan(100)
      expect(await css(page, NUM, '--sk-xp-level-up-step')).toBe('-1')
      expect(Number(await css(page, PCT, 'opacity'))).toBe(1)
      // Burst: flash and ring are up, the old line is gone.
      await seek(page, 1060)
      expect(Number(await css(page, FLASH, 'opacity'))).toBeGreaterThan(0.5)
      expect(Number(await css(page, RING, 'opacity'))).toBeGreaterThan(0)
      // After the roll the number is the new level (step 0, a typed integer, not a string).
      await seek(page, 1500)
      expect(await css(page, NUM, '--sk-xp-level-up-step')).toBe('0')
    })

    test('settles on the final frame', async ({ page }) => {
      await page.goto(story('components-xplevelup--playground'))
      await expect(page.locator(REFILL)).toBeAttached()
      await settle(page)
      expect(await css(page, NUM, '--sk-xp-level-up-step')).toBe('0')
      expect(await css(page, PCT, '--sk-xp-level-up-t')).toBe('100')
      // Finished animations can leave float dust (5.5e-16) in the computed opacity.
      for (const sel of [PRELUDE, RING, FLASH, PCT]) {
        expect(Number(await css(page, sel, 'opacity')), sel).toBeCloseTo(0, 3)
      }
      expect(Number(await css(page, HEADLINE, 'opacity'))).toBeCloseTo(1, 3)
      expect(await fillRatio(page, REFILL)).toBeCloseTo(0.08, 2)
      await expect(page.getByText('LV 43')).toBeVisible()
    })

    test('a plain gain fills from → progress with no burst', async ({ page }) => {
      await page.goto(story('components-xplevelup--xp-gain'))
      const gain = '[class~="animate-xp-level-up-gain"]'
      await expect(page.locator(gain)).toBeAttached()
      const names = await xpAnimations(page)
      expect(names).toContain('sk-xp-level-up-fill')
      expect(names).not.toContain('sk-xp-level-up-burst')
      expect(names).not.toContain('sk-xp-level-up-roll')
      await seek(page, 250)
      expect(await fillRatio(page, gain)).toBeCloseTo(0.08, 2)
      await settle(page)
      expect(await fillRatio(page, gain)).toBeCloseTo(0.31, 2)
    })

    test('Replay remounts and restarts the timeline', async ({ page }) => {
      await page.goto(story('components-xplevelup--replay'))
      await expect(page.locator(NUM)).toBeAttached()
      await settle(page)
      await page.getByRole('button', { name: 'Replay' }).click()
      const elapsed = await page.evaluate(() =>
        document
          .getAnimations()
          .filter((a) => (a as CSSAnimation).animationName === 'sk-xp-level-up-roll')
          .map((a) => Number(a.currentTime)),
      )
      expect(elapsed).toHaveLength(1)
      expect(elapsed[0]).toBeLessThan(1000)
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('runs no animation and shows the settled card at once', async ({ page }) => {
      for (const id of ['playground', 'narrow']) {
        await page.goto(story(`components-xplevelup--${id}`))
        await expect(page.locator(NUM)).toBeAttached()
        expect(await xpAnimations(page)).toEqual([])
        expect(await css(page, NUM, 'animation-name')).toBe('none')
        expect(await css(page, NUM, '--sk-xp-level-up-step')).toBe('0')
        for (const sel of [PRELUDE, RING, FLASH, PCT]) {
          expect(await css(page, sel, 'opacity'), sel).toBe('0')
        }
        expect(await css(page, HEADLINE, 'opacity')).toBe('1')
        expect(await fillRatio(page, REFILL)).toBeCloseTo(0.08, 2)
        await expect(page.getByText('LV 43')).toBeVisible()
      }
    })

    test('a plain gain rests at progress', async ({ page }) => {
      await page.goto(story('components-xplevelup--xp-gain'))
      const gain = '[class~="animate-xp-level-up-gain"]'
      await expect(page.locator(gain)).toBeAttached()
      expect(await xpAnimations(page)).toEqual([])
      expect(await fillRatio(page, gain)).toBeCloseTo(0.31, 2)
    })
  })
})
