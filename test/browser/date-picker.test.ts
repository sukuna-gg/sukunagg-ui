import { expect, test } from '@playwright/test'

const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`

test('typing and Tab commit the date in the locale order', async ({ page }) => {
  await page.goto(story('components-datepicker--birth-date'))
  const field = page.getByRole('textbox', { name: 'Fecha de nacimiento' })
  await field.fill('12/04/1998')
  await page.keyboard.press('Tab')
  await expect(page.getByText('name="birthDate" = "1998-04-12"')).toBeVisible()
})

test('a date after max shows the custom message', async ({ page }) => {
  await page.goto(story('components-datepicker--birth-date'))
  const field = page.getByRole('textbox', { name: 'Fecha de nacimiento' })
  await field.fill('01/01/2015')
  await field.press('Enter')
  await expect(page.getByRole('alert')).toHaveText('Pitaya es solo para mayores de 18 años.')
  await expect(field).toHaveAttribute('aria-invalid', 'true')
})

test('open, arrow keys, Enter picks and focus returns to the field', async ({ page }) => {
  await page.goto(story('components-datepicker--default'))
  await page.getByRole('button', { name: 'Choose date' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  // Focus starts on today (Oct 9, 2026 in the story); move to Oct 10 and pick it.
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeHidden()
  const field = page.getByRole('textbox', { name: 'Deadline' })
  await expect(field).toHaveValue('10/10/2026')
  await expect(field).toBeFocused()
})

test('an outside click closes the popup', async ({ page }) => {
  await page.goto(story('components-datepicker--default'))
  await page.getByRole('button', { name: 'Choose date' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.mouse.click(5, 400)
  await expect(page.getByRole('dialog')).toBeHidden()
})
