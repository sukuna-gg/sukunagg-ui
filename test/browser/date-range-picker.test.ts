import { expect, test } from '@playwright/test'

const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`

test('a preset then Apply updates the trigger and the URL params', async ({ page }) => {
  await page.goto(story('components-daterangepicker--match-history'))
  await page.getByRole('button', { name: 'Games played between' }).click()
  await page.getByRole('button', { name: 'Last 7 days' }).click()
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByText('?from=2026-10-03&to=2026-10-09')).toBeVisible()
})

test('two clicks then Apply commit a custom range', async ({ page }) => {
  await page.goto(story('components-daterangepicker--match-history'))
  await page.getByRole('button', { name: 'Games played between' }).click()
  await page.getByRole('button', { name: /September 14, 2026/ }).click()
  await expect(page.getByRole('button', { name: 'Apply' })).toBeDisabled()
  await page.getByRole('button', { name: /September 20, 2026/ }).click()
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByText('?from=2026-09-14&to=2026-09-20')).toBeVisible()
})

test('Escape cancels and keeps the committed range', async ({ page }) => {
  await page.goto(story('components-daterangepicker--match-history'))
  await page.getByRole('button', { name: 'Games played between' }).click()
  await page.getByRole('button', { name: 'Last 30 days' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByText('?from=2026-09-10&to=2026-10-09')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Games played between' })).toBeFocused()
})
