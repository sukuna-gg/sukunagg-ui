import { expect, test } from '@playwright/test'

const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`

test('BarChart: hovering a category shows every series in the tooltip', async ({ page }) => {
  await page.goto(story('charts-barchart--grouped'))
  const chart = page.getByRole('group', { name: /Kills by weapon/ })
  const box = await chart.boundingBox()
  if (!box) throw new Error('chart has no box')
  // 5 categories: the second band's centre is at 30% of the width.
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.6)
  const live = chart.locator('[aria-live]')
  await expect(live).toHaveText('SMGs: Season 3 402, Season 4 361')
  await expect(chart.getByText('SMGs', { exact: true })).toBeVisible()
  await page.mouse.move(box.x + box.width + 50, box.y)
  await expect(live).toHaveText('')
})

test('BarChart: keyboard moves between categories and Escape hides', async ({ page }) => {
  await page.goto(story('charts-barchart--stacked'))
  const chart = page.getByRole('group', { name: /MRR by plan/ })
  await chart.focus()
  await expect(chart).toBeFocused()
  const live = chart.locator('[aria-live]')
  await page.keyboard.press('ArrowRight')
  await expect(live).toContainText('Apr:')
  await expect(live).toContainText('Total $39.2K')
  await page.keyboard.press('End')
  await expect(live).toContainText('Sep:')
  await page.keyboard.press('Escape')
  await expect(live).toHaveText('')
})

test('LineChart: the crosshair follows the pointer; gaps say "Not reported"', async ({ page }) => {
  await page.goto(story('charts-linechart--with-gaps'))
  const chart = page.getByRole('group', { name: /missing minutes/ })
  const box = await chart.boundingBox()
  if (!box) throw new Error('chart has no box')
  // 32 points (0–31 min): minute 10 sits at 10/31 of the width, inside the missing run.
  await page.mouse.move(box.x + (box.width * 10) / 31, box.y + box.height / 2)
  await expect(chart.locator('[aria-live]')).toHaveText('10m: Blue − red Not reported')
  await page.mouse.move(box.x + box.width * 0.999, box.y + box.height / 2)
  await expect(chart.locator('[aria-live]')).toContainText('31m:')
})

test('Static charts ship no island', async ({ page }) => {
  await page.goto(story('charts-barchart--static'))
  await expect(page.locator('figure')).toBeVisible()
  await expect(page.locator('[aria-roledescription="chart"]')).toHaveCount(0)
})
