import { expect, test } from '@playwright/test'

const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`
const PLAYER_SEARCH = story('components-commandpalette--player-search')

// `mod` is ⌘ on Apple platforms and Ctrl elsewhere; Playwright's ControlOrMeta does the same.
const SHORTCUT = 'ControlOrMeta+k'

test('the shortcut opens it at 12vh, input focused, first item highlighted', async ({ page }) => {
  await page.goto(PLAYER_SEARCH)
  await page.getByRole('button', { name: /Search players/ }).waitFor()
  await page.keyboard.press(SHORTCUT)

  const dialog = page.getByRole('dialog', { name: 'Command palette' })
  await expect(dialog).toBeVisible()
  const input = page.getByRole('combobox', { name: 'Search players, pages, actions…' })
  await expect(input).toBeFocused()

  // The first option is highlighted and is what the input points at.
  const first = page.getByRole('option').first()
  await expect(first).toHaveAttribute('data-highlighted', '')
  await expect(input).toHaveAttribute(
    'aria-activedescendant',
    (await first.getAttribute('id')) ?? '',
  )

  // Placed at 12vh from the top, not centered (so the list grows downward). Polled: the popup
  // scales in from 98%, which shifts its box until the transition ends.
  const height = page.viewportSize()?.height ?? 0
  await expect
    .poll(async () => Math.abs(((await dialog.boundingBox())?.y ?? -100) - height * 0.12))
    .toBeLessThan(2)

  // The shortcut toggles it closed again.
  await page.keyboard.press(SHORTCUT)
  await expect(dialog).toHaveCount(0)
})

test('typing filters; arrows + Enter follow a link; focus returns to the trigger', async ({
  page,
}) => {
  await page.goto(PLAYER_SEARCH)
  const trigger = page.getByRole('button', { name: /Search players/ })
  await trigger.focus()
  await page.keyboard.press(SHORTCUT)
  const input = page.getByRole('combobox')
  await expect(input).toBeFocused()

  await page.keyboard.type('a')
  // Fuzzy + accent-insensitive: every item with an "a" stays, best matches first per group.
  await expect(page.getByRole('group', { name: 'Recent players' })).toBeVisible()
  await page.keyboard.type('ra')
  // "ara" only matches Nobara#EUW among the local items.
  await expect(page.getByRole('group', { name: 'Recent players' }).getByRole('option')).toHaveCount(
    1,
  )
  await expect(page.getByRole('group', { name: 'Pages' })).toHaveCount(0)

  await page.keyboard.press('Backspace')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Backspace')
  await expect(page.getByRole('option')).toHaveCount(9)

  await page.keyboard.press('ArrowDown')
  const second = page.getByRole('option').nth(1)
  await expect(second).toHaveAttribute('data-highlighted', '')
  // A real link: the option element is an <a href>.
  expect(await second.evaluate((el) => el.tagName)).toBe('A')
  await expect(second).toHaveAttribute('href', '/players/Megumi-NA1')

  await page.keyboard.press('Enter')
  // The story shows where the link goes instead of leaving the page.
  await expect(page.getByText('Opens /players/Megumi-NA1')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('Enter runs an action; Escape closes and returns focus', async ({ page }) => {
  await page.goto(PLAYER_SEARCH)
  const trigger = page.getByRole('button', { name: /Search players/ })
  await trigger.click()
  await page.keyboard.type('theme')
  await expect(page.getByRole('option')).toHaveCount(1)
  await page.keyboard.press('Enter')
  await expect(page.getByText('Ran “Switch theme”')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await trigger.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('remote results arrive after "Searching…", and an almost-valid Riot ID gets a hint', async ({
  page,
}) => {
  await page.goto(PLAYER_SEARCH)
  await page.getByRole('button', { name: /Search players/ }).click()
  await page.keyboard.type('fake')
  await expect(page.getByText('Searching…')).toBeVisible()
  const results = page.getByRole('group', { name: 'Results' })
  await expect(results.getByRole('option')).toHaveCount(2)
  await expect(page.getByText('Searching…')).toHaveCount(0)

  await page.keyboard.type('r#K')
  await expect(
    page.getByText('The tag after the # is 2 to 5 letters or numbers, like NA1.'),
  ).toBeVisible()
  await page.keyboard.type('R1')
  await expect(page.getByText(/The tag after the #/)).toHaveCount(0)
})
