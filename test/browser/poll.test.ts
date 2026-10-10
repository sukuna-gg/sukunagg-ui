import { expect, type Page, test } from '@playwright/test'

// Poll (docs/component-poll.md §5, §9): the bar motion and its reduced-motion fallback, and the
// write-in island in a real browser. Asserts computed styles and geometry, never timing.
const story = (id: string) => `/iframe.html?id=components-poll--${id}&viewMode=story`
const BAR = 'li > [aria-hidden="true"]'

/** The first bar's width as a share of its row (0–1). */
const barShare = (page: Page) =>
  page
    .locator(BAR)
    .first()
    .evaluate(
      (bar) =>
        bar.getBoundingClientRect().width /
        (bar.parentElement as HTMLElement).getBoundingClientRect().width,
    )

const animationName = (page: Page) =>
  page
    .locator(BAR)
    .first()
    .evaluate((el) => getComputedStyle(el).animationName)

test.describe('Poll', () => {
  test.describe('motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('result bars grow from 0 and settle at their share', async ({ page }) => {
      await page.goto(story('voted'))
      await expect(page.locator(BAR)).toHaveCount(4)
      expect(await animationName(page)).toBe('sk-poll-bar')
      const seek = (end: boolean) =>
        page
          .locator(BAR)
          .first()
          .evaluate((el, toEnd) => {
            for (const a of el.getAnimations()) {
              if (toEnd) a.finish()
              else {
                a.pause()
                a.currentTime = 0
              }
            }
          }, end)
      await seek(false)
      expect(await barShare(page)).toBeCloseTo(0, 2)
      await seek(true)
      // Street Fighter 6: 34 of 82 votes → 41%.
      expect(await barShare(page)).toBeCloseTo(0.41, 2)
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('draws the bars at full width at once', async ({ page }) => {
      await page.goto(story('voted'))
      await expect(page.locator(BAR)).toHaveCount(4)
      expect(await animationName(page)).toBe('none')
      expect(await barShare(page)).toBeCloseTo(0.41, 2)
    })
  })

  const formData = (page: Page) =>
    page
      .locator('form')
      .evaluate((form) => Object.fromEntries(new FormData(form as HTMLFormElement)))

  test('clicking the write-in field selects "Other"', async ({ page }) => {
    await page.goto(story('with-write-in'))
    const other = page.getByRole('radio', { name: 'Otro' })
    await expect(other).not.toBeChecked()
    await page.getByRole('textbox', { name: 'Otro' }).click()
    await expect(other).toBeChecked()
    await page.keyboard.type('Brawlhalla')
    expect(await formData(page)).toEqual({ game: '__other', gameOther: 'Brawlhalla' })
  })

  test('tabbing through the write-in keeps the choice; typing selects "Other"', async ({
    page,
  }) => {
    await page.goto(story('with-write-in'))
    await page.getByText('Tekken 8').click()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('textbox', { name: 'Otro' })).toBeFocused()
    expect(await formData(page)).toEqual({ game: 'Tekken 8', gameOther: '' })
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Votar' })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.type('Smash')
    expect(await formData(page)).toEqual({ game: '__other', gameOther: 'Smash' })
  })

  test('a vote needs a choice (native required)', async ({ page }) => {
    await page.goto(story('open'))
    const valid = () => page.locator('form').evaluate((f) => (f as HTMLFormElement).checkValidity())
    expect(await valid()).toBe(false)
    await page.getByText('Tekken 8').click()
    await expect(page.getByRole('radio', { name: 'Tekken 8' })).toBeChecked()
    expect(await valid()).toBe(true)
  })
})
