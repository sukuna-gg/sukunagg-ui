import { expect, type Locator, type Page, test } from '@playwright/test'

// BorderBeam (docs/component-border-beam.md §10). Asserts computed styles and the Web Animations
// API, never wall-clock timing (same rule as motion.test.ts), so it stays deterministic.
const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`
const FEATURED = 'components-borderbeam--featured-cards'
const match = (page: Page) => page.getByRole('article', { name: /Featured match/ })
const pass = (page: Page) => page.getByRole('article', { name: 'Season 07 Pass' })
const layer = (card: Locator, name: 'glow' | 'sheen' | 'ring') =>
  card.locator(`[data-sk-border-beam="${name}"]`)

// Collect console errors and page errors for the whole test.
const watchErrors = (page: Page) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  return errors
}

test.describe('BorderBeam', () => {
  test.describe('motion', () => {
    test.use({ reducedMotion: 'no-preference' }) // explicit: the OS setting leaks in otherwise

    test('renders the featured screen and orbits every layer without errors', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story(FEATURED))
      await expect(match(page)).toBeVisible()
      await expect(pass(page)).toBeVisible()

      for (const name of ['glow', 'sheen', 'ring'] as const) {
        const el = layer(match(page), name)
        await expect(el).toHaveCSS('animation-name', 'sk-border-beam-orbit')
        await expect(el).toHaveAttribute('aria-hidden', 'true')
      }
      const running = await layer(match(page), 'ring').evaluate((el) =>
        el.getAnimations().map((a) => [(a as CSSAnimation).animationName, a.playState]),
      )
      expect(running).toEqual([['sk-border-beam-orbit', 'running']])
      expect(errors).toEqual([])
    })

    test('the registered angle advances and the layers stay in lockstep', async ({ page }) => {
      await page.goto(story(FEATURED))
      const ring = layer(match(page), 'ring')
      await expect(ring).toBeVisible()
      // @property --sk-border-beam-angle is registered: a typed <angle>, not a raw string.
      const angle = () =>
        ring.evaluate((el) => getComputedStyle(el).getPropertyValue('--sk-border-beam-angle'))
      const first = await angle()
      expect(first).toMatch(/deg$/)
      await expect.poll(angle).not.toBe(first)

      // Freeze the card's animations at one time: all three layers report the same angle.
      const angles = await match(page).evaluate((card) => {
        for (const a of card.getAnimations({ subtree: true })) {
          a.pause()
          a.currentTime = 1000
        }
        return [...card.querySelectorAll('[data-sk-border-beam]')].map((el) =>
          getComputedStyle(el).getPropertyValue('--sk-border-beam-angle'),
        )
      })
      expect(angles).toEqual(['90deg', '90deg', '90deg'])
    })

    test('tone, speed and phase reach the animation', async ({ page }) => {
      await page.goto(story(FEATURED))
      const ring = layer(pass(page), 'ring')
      // Premium pass: speed="slow" (6.5s a lap) and phase={0.45} (a negative delay of 0.45 lap).
      await expect(ring).toHaveCSS('animation-duration', '6.5s')
      expect(
        Number.parseFloat(await ring.evaluate((el) => getComputedStyle(el).animationDelay)),
      ).toBeCloseTo(-2.925, 3)
      await expect(layer(match(page), 'ring')).toHaveCSS('animation-duration', '4s')
      // Each tone paints its own beam color.
      const color = (card: Locator) =>
        layer(card, 'ring').evaluate((el) => getComputedStyle(el).filter)
      expect(await color(match(page))).not.toBe(await color(pass(page)))
    })

    test('hover brightens the glow', async ({ page }) => {
      await page.goto(story(FEATURED))
      const glow = layer(match(page), 'glow')
      await expect(glow).toHaveCSS('opacity', '0.75')
      await match(page).hover()
      await expect(glow).toHaveCSS('opacity', '1')
    })

    test('a wide, short card gets a shorter tail', async ({ page }) => {
      const before = (card: Locator) =>
        layer(card, 'ring').evaluate((el) => getComputedStyle(el, '::before').backgroundImage)
      await page.setViewportSize({ width: 900, height: 600 })
      await page.goto(story(FEATURED))
      await expect(match(page)).toBeVisible()
      expect(await before(match(page))).toContain('58%')
      // The story stacks the cards on a phone: they turn wide and short.
      await page.setViewportSize({ width: 390, height: 640 })
      await expect.poll(() => before(match(page))).toContain('74%')
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('stops the orbit and rests as a still tint of the beam color', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story(FEATURED))
      await expect(match(page)).toBeVisible()
      for (const card of [match(page), pass(page)]) {
        expect(await card.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0)
        const ring = layer(card, 'ring')
        await expect(ring).toHaveCSS('animation-name', 'none')
        await expect(layer(card, 'glow')).toBeHidden()
        await expect(layer(card, 'sheen')).toBeHidden()
        const tint = await ring.evaluate((el) => {
          const cs = getComputedStyle(el, '::before')
          return { image: cs.backgroundImage, color: cs.backgroundColor }
        })
        expect(tint.image).toBe('none')
        expect(tint.color).not.toBe('rgba(0, 0, 0, 0)')
      }
      // The content is untouched.
      await expect(page.getByText('Season 07 Pass', { exact: true })).toBeVisible()
      expect(errors).toEqual([])
    })
  })
})
