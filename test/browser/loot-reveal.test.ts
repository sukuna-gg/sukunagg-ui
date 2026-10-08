import { expect, type Page, test } from '@playwright/test'

// LootReveal (docs/component-loot-reveal.md §9/§10). Asserts computed styles and the Web
// Animations API (delays, names, seeking), never wall-clock timing, so it stays deterministic.
const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`
const list = (page: Page) => page.getByRole('list', { name: 'Crimson Vow Pack rewards' })
const NAMES = ['Ember Tide Spray', 'Kitsune Mask', 'Crimson Vow Gold Banner']

/** Records page errors and console errors so each test can assert there were none. */
const watchErrors = (page: Page) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  return errors
}

/** Every running animation under the list: name and resolved start delay (ms), per card. */
const timeline = (page: Page) =>
  list(page).evaluate((ul) =>
    [...ul.children].map((li) =>
      li.getAnimations({ subtree: true }).map((a) => ({
        name: (a as CSSAnimation).animationName,
        delay: Math.round(Number(a.effect?.getTiming().delay ?? 0)),
      })),
    ),
  )

/** Freezes every animation under the list at `t` ms after mount (`Infinity` = finish them all). */
const seek = (page: Page, t: number) =>
  list(page).evaluate((ul, at) => {
    for (const a of ul.getAnimations({ subtree: true })) {
      if (at === Number.POSITIVE_INFINITY) a.finish()
      else {
        a.pause()
        a.currentTime = at
      }
    }
  }, t)

const css = (page: Page, selector: string, prop: string) =>
  list(page)
    .locator(selector)
    .first()
    .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

test.beforeEach(async ({ page }) => {
  // The stories load Archivo from Google Fonts the way an app would; keep the suite offline.
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  )
})

test.describe('LootReveal', () => {
  test.describe('motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('flips the cards in stagger order; the legendary charges up, then bursts', async ({
      page,
    }) => {
      const errors = watchErrors(page)
      await page.goto(story('components-lootreveal--playground'))
      await expect(list(page).getByRole('listitem')).toHaveCount(3)
      const cards = await timeline(page)
      const delays = (i: number, name: string) =>
        (cards[i] ?? []).filter((a) => a.name === name).map((a) => a.delay)
      // card i flips at 200ms + i × 350ms (+ 450ms for the legendary's charge-up)
      expect(delays(0, 'sk-loot-reveal-flip')).toEqual([200])
      expect(delays(1, 'sk-loot-reveal-flip')).toEqual([550])
      expect(delays(2, 'sk-loot-reveal-flip')).toEqual([1350])
      expect(delays(2, 'sk-loot-reveal-charge')).toEqual([900])
      expect(delays(2, 'sk-loot-reveal-spark')).toHaveLength(24)
      for (const card of cards) {
        const names = new Set(card.map((a) => a.name))
        for (const name of ['sk-loot-reveal-flip', 'sk-loot-reveal-side', 'sk-loot-reveal-bloom']) {
          expect(names.has(name)).toBe(true)
        }
      }
      expect(delays(0, 'sk-loot-reveal-charge')).toEqual([])
      expect(delays(0, 'sk-loot-reveal-spark')).toEqual([])
      expect(errors).toEqual([])
    })

    test('starts face-down and settles on the revealed frame', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story('components-lootreveal--playground'))
      await expect(list(page).getByRole('listitem')).toHaveCount(3)

      await seek(page, 0)
      for (const name of NAMES) await expect(page.getByText(name)).toBeHidden()
      expect(await css(page, '[class*="animate-loot-reveal-back"]', 'visibility')).toBe('visible')
      expect(await css(page, '[class*="animate-loot-reveal-label"]', 'opacity')).toBe('0')

      // Mid-sequence: card 1 is up, card 2 still face-down.
      await seek(page, 1200)
      await expect(page.getByText(NAMES[0] as string)).toBeVisible()
      await expect(page.getByText(NAMES[2] as string)).toBeHidden()

      await seek(page, Number.POSITIVE_INFINITY)
      for (const name of NAMES) await expect(page.getByText(name)).toBeVisible()
      for (const label of ['Rare', 'Epic', 'Legendary']) {
        await expect(list(page).getByText(label, { exact: true })).toBeVisible()
      }
      expect(await css(page, '[class*="animate-loot-reveal-back"]', 'visibility')).toBe('hidden')
      expect(await css(page, '[class*="animate-loot-reveal-label"]', 'opacity')).toBe('1')
      expect(errors).toEqual([])
    })

    test('play={false} renders the opened pack with no animation', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story('components-lootreveal--settled'))
      await expect(list(page).getByRole('listitem')).toHaveCount(3)
      expect((await timeline(page)).flat()).toEqual([])
      for (const name of NAMES) await expect(page.getByText(name)).toBeVisible()
      expect(errors).toEqual([])
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('shows the revealed row at once, with nothing animating', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story('components-lootreveal--playground'))
      await expect(list(page).getByRole('listitem')).toHaveCount(3)
      expect(await css(page, '[class*="animate-loot-reveal-flip"]', 'animation-name')).toBe('none')
      expect((await timeline(page)).flat()).toEqual([])
      for (const name of NAMES) await expect(page.getByText(name)).toBeVisible()
      expect(await css(page, '[class*="animate-loot-reveal-label"]', 'opacity')).toBe('1')
      expect(await css(page, '[class*="animate-loot-reveal-back"]', 'visibility')).toBe('hidden')
      expect(errors).toEqual([])
    })
  })
})
