import { expect, type Locator, type Page, test } from '@playwright/test'

// MatchFound (docs/component-match-found.md §9/§10). Asserts computed styles and the Web Animations
// API (seeking paused animations), never wall-clock timing, so it stays deterministic.
const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`
const css = (el: Locator, prop: string) =>
  el.evaluate((node, p) => getComputedStyle(node).getPropertyValue(p).trim(), prop)
const animationNames = (el: Locator) =>
  el.evaluate((node) => node.getAnimations().map((a) => (a as CSSAnimation).animationName))
/** Pause every animation in the document at `ms` since it started. */
const seek = (page: Page, ms: number) =>
  page.evaluate((t) => {
    for (const a of document.getAnimations()) {
      a.pause()
      a.currentTime = t
    }
  }, ms)
/** Jump finite animations to their end; park infinite ones at 0 (finish() throws on those). */
const settle = (page: Page) =>
  page.evaluate(() => {
    for (const a of document.getAnimations()) {
      if (a.effect?.getComputedTiming().endTime === Number.POSITIVE_INFINITY) {
        a.pause()
        a.currentTime = 0
      } else a.finish()
    }
  })

/** Page errors and console errors, minus the stories' optional web-font request. */
function collectErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (
      m.type() === 'error' &&
      !/fonts\.(googleapis|gstatic)|Failed to load resource/.test(m.text())
    )
      errors.push(m.text())
  })
  return errors
}

const parts = (scope: Page | Locator) => ({
  number: scope.locator('.match-found-number').first(),
  arc: scope.locator('circle[stroke-dasharray="314.16"]').first(),
  ring: scope.locator('[class*="animate-match-found-pop-in"]').first(),
  eyebrow: scope.locator('[class*="animate-match-found-slide"]').first(),
  word: scope.locator('h2 > span').first(),
})

test.describe('MatchFound', () => {
  test.describe('motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('renders the prompt with its heading, status and screen-reader timer', async ({
      page,
    }) => {
      const errors = collectErrors(page)
      await page.goto(story('components-matchfound--playground'))
      const section = page.locator('section[data-state="pending"]')
      await expect(section).toBeVisible()
      await expect(page.getByRole('heading', { level: 2, name: 'Match found' })).toBeVisible()
      await expect(page.getByText('2/5 ready')).toBeVisible()
      await expect(page.getByText('Accept within 12 seconds')).toHaveClass(/sr-only/)
      await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible()
      expect(errors).toEqual([])
    })

    test('counts down with a registered integer and drains the ring', async ({ page }) => {
      await page.goto(story('components-matchfound--playground'))
      const { number, arc, ring } = parts(page)
      await expect(number).toBeVisible()
      expect(await animationNames(number)).toEqual(['sk-match-found-count', 'sk-match-found-tint'])
      expect(await animationNames(arc)).toEqual(['sk-match-found-sweep'])
      expect(await animationNames(ring)).toEqual(['sk-match-found-enter'])
      // @property --sk-match-found-n { syntax: '<integer>' } shipped in theme.css: a typed value.
      expect(await css(number, '--sk-match-found-n')).toMatch(/^\d+$/)

      await seek(page, 3500)
      expect(await css(number, '--sk-match-found-n')).toBe('9')
      expect(await css(arc, 'animation-timing-function')).toBe('linear')
      const mid = Number.parseFloat(await css(arc, 'stroke-dashoffset'))
      expect(mid).toBeLessThan(-80)
      expect(mid).toBeGreaterThan(-110)

      await settle(page)
      expect(await css(number, '--sk-match-found-n')).toBe('0')
      expect(Number.parseFloat(await css(arc, 'stroke-dashoffset'))).toBeCloseTo(-314.16, 2)
    })

    test('freezes the ring when declined and shows the final frame when expired', async ({
      page,
    }) => {
      const errors = collectErrors(page)
      await page.goto(story('components-matchfound--states'))
      const declined = parts(page.locator('section[data-state="declined"]'))
      await expect(declined.number).toBeVisible()
      expect(await css(declined.arc, 'animation-play-state')).toBe('paused')
      expect(await css(declined.number, 'animation-play-state')).toBe('paused, paused')

      const ready = page.locator('section[data-ready]')
      await expect(ready).toHaveCount(1)
      await expect(ready.getByText('All ready')).toBeVisible()
      expect(await css(parts(ready).arc, 'animation-play-state')).toBe('paused')

      const expired = parts(page.locator('section[data-state="expired"]'))
      expect(await animationNames(expired.number)).toEqual([])
      expect(await css(expired.number, '--sk-match-found-n')).toBe('0')
      expect(Number.parseFloat(await css(expired.arc, 'stroke-dashoffset'))).toBeCloseTo(-314.16, 2)
      expect(errors).toEqual([])
    })

    test('the lobby story renders the app chrome around the prompt', async ({ page }) => {
      const errors = collectErrors(page)
      await page.goto(story('components-matchfound--in-lobby'))
      await expect(page.getByRole('dialog', { name: 'Match found' })).toBeVisible()
      await expect(page.getByText('Finding match')).toBeAttached()
      await page.getByRole('button', { name: 'Accept' }).click()
      await expect(page.locator('section[data-state="accepted"]')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Decline' })).toBeDisabled()
      expect(errors).toEqual([])
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('keeps the countdown, stepping once per second, and drops the decoration', async ({
      page,
    }) => {
      const errors = collectErrors(page)
      await page.goto(story('components-matchfound--playground'))
      const { number, arc, ring, eyebrow, word } = parts(page)
      await expect(number).toBeVisible()

      // Information keeps moving: the count runs and the ring steps (steps(12, end)).
      expect(await animationNames(number)).toEqual(['sk-match-found-count', 'sk-match-found-tint'])
      expect(await css(arc, 'animation-timing-function')).toMatch(/^steps\(12(, end)?\)$/)
      await seek(page, 3500)
      expect(await css(number, '--sk-match-found-n')).toBe('9')
      // 3 of 12 steps drained: exactly a quarter of the circumference.
      expect(Number.parseFloat(await css(arc, 'stroke-dashoffset'))).toBeCloseTo(-78.54, 1)

      // Decoration is off and already at its final frame.
      for (const el of [ring, eyebrow, word]) {
        expect(await css(el, 'animation-name')).toBe('none')
      }
      expect(await css(ring, 'opacity')).toBe('1')
      expect(await css(eyebrow, 'opacity')).toBe('1')
      expect(await css(word, 'color')).not.toBe('rgba(0, 0, 0, 0)')
      expect(errors).toEqual([])
    })
  })
})
