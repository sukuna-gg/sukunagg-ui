import { expect, test } from '@playwright/test'

const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`

test('pick Nov 14 + 6:00 PM in Hermosillo → the instant is 01:00Z on Nov 15', async ({ page }) => {
  await page.goto(story('components-datetimepicker--default'))
  await page.getByRole('button', { name: /^Start/ }).click()
  await page.getByRole('button', { name: 'Next month' }).click()
  await page.getByRole('button', { name: /November 14, 2026/ }).click()
  await page.getByRole('option', { name: '6:00 PM' }).click()
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('button', { name: /^Start/ })).toContainText('Sat, Nov 14 · 6:00 PM')
})

test('the time listbox moves with the arrow keys', async ({ page }) => {
  await page.goto(story('components-datetimepicker--tournament-form'))
  await page.getByRole('button', { name: /^Inicio/ }).click()
  const list = page.getByRole('listbox', { name: 'Hora de inicio' })
  await list.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByText('name="startsAt" = "2026-11-15T01:30:00.000Z"')).toBeVisible()
})

test('Escape closes and focus returns to the trigger', async ({ page }) => {
  await page.goto(story('components-datetimepicker--default'))
  const trigger = page.getByRole('button', { name: /^Start/ })
  await trigger.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(trigger).toBeFocused()
})
