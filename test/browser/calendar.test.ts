import { expect, test } from '@playwright/test'

const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`

test('arrow keys cross a month boundary and focus follows', async ({ page }) => {
  await page.goto(story('components-calendar--default'))
  await page.getByRole('button', { name: /October 17, 2026/ }).click()
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown')
  // Oct 17 + 21 days = Nov 7: the grid moved to November and focus is on the new day.
  await expect(page.getByRole('button', { name: /November 2026, Choose year/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /November 7, 2026/ })).toBeFocused()
})

test('PageDown keeps the day and Shift+PageDown moves a year', async ({ page }) => {
  await page.goto(story('components-calendar--default'))
  await page.getByRole('button', { name: /October 17, 2026/ }).click()
  await page.keyboard.press('PageDown')
  await expect(page.getByRole('button', { name: /November 17, 2026/ })).toBeFocused()
  await page.keyboard.press('Shift+PageDown')
  await expect(page.getByRole('button', { name: /November 17, 2027/ })).toBeFocused()
})

test('the selected day wears the accent gradient', async ({ page }) => {
  await page.goto(story('components-calendar--default'))
  const selected = page.getByRole('button', { name: /October 17, 2026, selected/ })
  expect(await selected.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain(
    'linear-gradient',
  )
})

test('a range previews on hover and commits on the second click', async ({ page }) => {
  await page.goto(story('components-calendar--range'))
  await page.getByRole('button', { name: /October 20, 2026/ }).click()
  await page.getByRole('button', { name: /October 24, 2026/ }).hover()
  const cell = page.getByRole('button', { name: /October 22, 2026/ }).locator('xpath=..')
  expect(await cell.evaluate((el) => getComputedStyle(el, '::before').content)).not.toBe('none')
  await page.getByRole('button', { name: /October 24, 2026/ }).click()
  await expect(page.getByText('{"start":"2026-10-20","end":"2026-10-24"}')).toBeVisible()
})

test('the year grid jumps to a birth year', async ({ page }) => {
  await page.goto(story('components-calendar--year-view'))
  await page.getByRole('button', { name: '1998' }).click()
  await page.getByRole('button', { name: 'April 1998' }).click()
  await expect(page.getByRole('button', { name: /April 1, 1998/ })).toBeFocused()
})
