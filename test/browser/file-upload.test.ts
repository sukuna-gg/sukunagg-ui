import { expect, type Page, test } from '@playwright/test'

const story = (id: string) => `/iframe.html?id=components-fileupload--${id}&viewMode=story`

/** A real JPEG of the given size, drawn by the browser (a gradient, so it doesn't compress away). */
async function jpeg(page: Page, width: number, height: number) {
  const base64 = await page.evaluate(
    async ([w, h]) => {
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const context = canvas.getContext('2d') as CanvasRenderingContext2D
      const fill = context.createLinearGradient(0, 0, w, h)
      fill.addColorStop(0, '#2b3a55')
      fill.addColorStop(1, '#c9d3e6')
      context.fillStyle = fill
      context.fillRect(0, 0, w, h)
      const blob = await new Promise<Blob>((done) =>
        canvas.toBlob((b) => done(b as Blob), 'image/jpeg', 0.92),
      )
      let binary = ''
      for (const byte of new Uint8Array(await blob.arrayBuffer()))
        binary += String.fromCharCode(byte)
      return btoa(binary)
    },
    [width, height] as const,
  )
  return Buffer.from(base64, 'base64')
}

test('picking a photo shows its preview, and Remove brings the zone back', async ({ page }) => {
  await page.goto(story('playground'))
  const input = page.locator('input[type="file"]')
  await input.setInputFiles({
    name: 'front.jpg',
    mimeType: 'image/jpeg',
    buffer: await jpeg(page, 640, 400),
  })
  await expect(page.getByText('Ready', { exact: true })).toBeVisible()
  const preview = page.getByRole('img', { name: 'front.jpg' })
  await expect(preview).toBeVisible()
  expect(await preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(640)
  await expect(page.getByText(/640×400 JPEG$/)).toBeVisible()

  await page.getByRole('button', { name: 'Remove front.jpg' }).click()
  await expect(page.getByText('Choose a file or drop it here')).toBeVisible()
  await expect(input).toBeFocused()
  expect(await input.evaluate((el: HTMLInputElement) => el.files?.length)).toBe(0)
})

test('a 4000×3000 JPEG goes into the form as a ≤ 2000px JPEG', async ({ page }) => {
  await page.goto(story('id-photo'))
  const original = await jpeg(page, 4000, 3000)
  await page.locator('#ine-front').setInputFiles({
    name: 'IMG_4000.jpg',
    mimeType: 'image/jpeg',
    buffer: original,
  })
  await expect(page.getByText('Foto lista', { exact: true })).toBeVisible()
  await expect(page.getByText(/· 2000×1500 JPEG$/)).toBeVisible()

  // The prepared file was written back into the input, so FormData sends it.
  const sent = await page.locator('form').evaluate(async (form: HTMLFormElement) => {
    const file = new FormData(form).get('ine-front') as File
    const bitmap = await createImageBitmap(file)
    return { name: file.name, type: file.type, size: file.size, w: bitmap.width, h: bitmap.height }
  })
  expect(sent).toMatchObject({ name: 'IMG_4000.jpg', type: 'image/jpeg', w: 2000, h: 1500 })
  expect(sent.size).toBeLessThan(original.length)
})

test('a .txt file is refused, picked or dropped', async ({ page }) => {
  await page.goto(story('playground'))
  const input = page.locator('input[type="file"]')
  await input.setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a photo'),
  })
  const alert = page.getByRole('alert')
  await expect(alert).toHaveText("That file type isn't accepted. Use image files.")
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(await input.evaluate((el: HTMLInputElement) => el.files?.length)).toBe(0)

  await page.reload()
  const files = await page.evaluateHandle(() => {
    const transfer = new DataTransfer()
    transfer.items.add(new File(['not a photo'], 'notes.txt', { type: 'text/plain' }))
    return transfer
  })
  const zone = page.locator('label').filter({ has: page.locator('input[type="file"]') })
  await zone.dispatchEvent('dragenter', { dataTransfer: files })
  await zone.dispatchEvent('drop', { dataTransfer: files })
  await expect(page.getByRole('alert')).toHaveText(
    "That file type isn't accepted. Use image files.",
  )
})

test('several files upload in a list; Retry and Remove work per file', async ({ page }) => {
  await page.goto(story('screenshots'))
  const shot = await jpeg(page, 320, 200)
  await page.locator('#screenshots').setInputFiles(
    ['round-1.jpg', 'round-2.jpg', 'round-3.jpg'].map((name) => ({
      name,
      mimeType: 'image/jpeg',
      buffer: shot,
    })),
  )
  const rows = page.getByRole('listitem')
  await expect(rows).toHaveCount(3)
  await expect(page.getByRole('progressbar', { name: 'round-1.jpg' })).toBeVisible()

  // The story's second upload fails once.
  await expect(page.getByRole('alert')).toContainText("Couldn't upload. Check your connection.")
  await expect(rows.filter({ hasText: 'round-1.jpg' })).toContainText('Uploaded')
  await page.getByRole('button', { name: 'Retry round-2.jpg' }).click()
  await expect(rows.filter({ hasText: 'round-2.jpg' })).toContainText('Uploaded')

  await page.getByRole('button', { name: 'Remove round-3.jpg' }).click()
  await expect(rows).toHaveCount(2)
  expect(
    await page
      .locator('#screenshots')
      .evaluate((el: HTMLInputElement) => Array.from(el.files ?? []).map((f) => f.name)),
  ).toEqual(['round-1.jpg', 'round-2.jpg'])
})
