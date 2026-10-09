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
      // face-down, the rarity label is out of the accessibility tree too (not just transparent)
      for (const label of ['Rare', 'Epic', 'Legendary']) {
        await expect(list(page).getByText(label, { exact: true })).toBeHidden()
      }

      // Mid-sequence: card 1 is up, card 2 still face-down.
      await seek(page, 1200)
      await expect(page.getByText(NAMES[0] as string)).toBeVisible()
      await expect(page.getByText(NAMES[2] as string)).toBeHidden()
      await expect(list(page).getByText('Rare', { exact: true })).toBeVisible()
      await expect(list(page).getByText('Legendary', { exact: true })).toBeHidden()

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
      // the one-shot burst is not rendered at rest; the rays and halo are
      await expect(list(page).locator('.loot-reveal-spark, .loot-reveal-flare')).toHaveCount(0)
      await expect(list(page).locator('.rotate-20')).toHaveCount(1)
      expect(errors).toEqual([])
    })

    test('long translated names and kinds stay inside their cards', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story('components-lootreveal--long-names'))
      const ul = page.getByRole('list', { name: 'Purpurschwur-Paket rewards' })
      await expect(ul.getByRole('listitem')).toHaveCount(3)
      await ul.evaluate((el) => {
        for (const a of el.getAnimations({ subtree: true })) a.finish()
      })
      const cards = await ul.evaluate((el) =>
        [...el.children].map((li) => {
          const face = (
            li.querySelector('[class*="grid-rows"]') as HTMLElement
          ).getBoundingClientRect()
          const name = li.querySelector('[class*="font-display"]') as HTMLElement
          const kind = (
            li.querySelector('[class*="rounded-pill"]') as HTMLElement
          ).getBoundingClientRect()
          const n = name.getBoundingClientRect()
          return {
            name:
              n.left >= face.left - 0.5 && n.right <= face.right + 0.5 && n.bottom <= face.bottom,
            kind: kind.left >= face.left - 0.5 && kind.right <= face.right + 0.5,
            kindOffset: Math.abs(kind.left + kind.width / 2 - (face.left + face.width / 2)),
            nameScroll: name.scrollWidth - name.clientWidth,
          }
        }),
      )
      for (const card of cards) {
        expect(card).toMatchObject({ name: true, kind: true, nameScroll: 0 })
        expect(card.kindOffset).toBeLessThan(1) // the chip stays centred
      }
      await expect(ul.getByText('Legendär', { exact: true })).toBeVisible()
      expect(errors).toEqual([])
    })

    test('n cards share one row down to the 72px floor; a wrapped row grows its stage', async ({
      page,
    }) => {
      const errors = watchErrors(page)
      await page.goto(story('components-lootreveal--rarities'))
      const ul = page.getByRole('list', { name: 'Season drop rewards' })
      await expect(ul.getByRole('listitem')).toHaveCount(4)
      /** Resizes the story's stage, then reads the rows, the card width and the clipping. */
      const layout = (width: number) =>
        ul.evaluate((el, w) => {
          let stage = el.parentElement as HTMLElement
          while (getComputedStyle(stage).overflow !== 'hidden') {
            stage = stage.parentElement as HTMLElement
          }
          stage.style.width = `${w}px`
          const box = stage.getBoundingClientRect()
          const slots = [...el.children].map((li) => li.getBoundingClientRect())
          return {
            rows: new Set(slots.map((r) => Math.round(r.top))).size,
            card: (el.querySelector(':scope > li > div') as HTMLElement).getBoundingClientRect()
              .width,
            clipped: slots.some(
              (r) => r.left < box.left || r.right > box.right || r.bottom > box.bottom,
            ),
          }
        }, width)
      // The prototype's 540px pack screen: four cards (~104px) fit one row.
      const pack = await layout(540)
      expect(pack).toMatchObject({ rows: 1, clipped: false })
      expect(pack.card).toBeGreaterThan(72)
      expect(pack.card).toBeLessThan(124)
      // Wide: the cards stop at 124px, still one row.
      expect(await layout(680)).toMatchObject({ rows: 1, card: 124, clipped: false })
      // Only the 72px floor wraps the row (3 + 1); the stage's min-height lets it grow, so no
      // card is cut off.
      expect(await layout(320)).toMatchObject({ rows: 2, card: 72, clipped: false })
      expect(errors).toEqual([])
    })

    test('never widens the page: the burst spills vertically only', async ({ page }) => {
      const errors = watchErrors(page)
      await page.setViewportSize({ width: 375, height: 700 })
      await page.goto(story('components-lootreveal--unstaged'))
      await expect(list(page).getByRole('listitem')).toHaveCount(3)
      const scroll = () =>
        page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
      for (const t of [1500, 2000]) {
        await seek(page, t) // mid-burst: flash, shock ring and sparks at full size
        expect(await scroll()).toBe(0)
      }
      await seek(page, Number.POSITIVE_INFINITY) // at rest: rays at 30%, 290% of the card
      expect(await scroll()).toBe(0)
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

    test('the resting rays never widen a phone-width page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 700 })
      await page.goto(story('components-lootreveal--unstaged'))
      await expect(list(page).getByRole('listitem')).toHaveCount(3)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBe(0)
    })
  })
})
