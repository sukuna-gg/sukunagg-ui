import { expect, test } from '@playwright/test'

// Real playback against the bundled WebM fixture (.storybook/public/video). happy-dom has no media
// pipeline, so this is where play / seek / captions / thumbnails are proven end to end.
const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`
const currentTime = (page: import('@playwright/test').Page) =>
  page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime)

test('plays from the big button and shows the first caption', async ({ page }) => {
  await page.goto(story('video-videoplayer--playground'))
  await page.getByRole('button', { name: 'Play Last Train, Shibuya' }).click()
  await expect(page.getByText('Shibuya, 11:40 p.m.')).toBeVisible()
  await expect.poll(() => currentTime(page)).toBeGreaterThan(0.5)
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
})

test('seeks with the keyboard and jumps chapters with Shift+Arrow', async ({ page }) => {
  await page.goto(story('video-videoplayer--playground'))
  await expect(page.getByRole('button', { name: 'Chapters: Cold open' })).toBeVisible()
  const seek = page.getByRole('slider', { name: 'Seek' })
  await seek.focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => currentTime(page)).toBe(5)
  await page.keyboard.press('Shift+ArrowRight')
  await expect.poll(() => currentTime(page)).toBe(6)
  await expect(page.getByRole('button', { name: 'Chapters: Last train out' })).toBeVisible()
})

test('hovering the bar previews the sprite thumbnail and chapter', async ({ page }) => {
  await page.goto(story('video-videoplayer--playground'))
  const seek = page.getByRole('slider', { name: 'Seek' })
  await expect(page.getByRole('button', { name: 'Chapters: Cold open' })).toBeVisible()
  const box = await seek.boundingBox()
  if (!box) throw new Error('no seek bar')
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2)
  await expect(seek.locator('[data-thumbnail]')).toBeVisible()
  await expect(seek).toContainText('The scramble crossing')
})

test('changes speed and quality from the settings menu', async ({ page }) => {
  await page.goto(story('video-videoplayer--playground'))
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('menuitem', { name: /Speed/ }).click()
  await page.getByRole('menuitemradio', { name: '1.5×' }).click()
  await expect
    .poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.playbackRate))
    .toBe(1.5)
  // the menu stays open on the Speed page with the choice ticked
  await expect(page.getByRole('menuitemradio', { name: '1.5×' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.getByRole('button', { name: 'Back to settings' }).click()
  await expect(page.getByRole('menuitem', { name: /Speed/ })).toContainText('1.5×')
  await page.getByRole('menuitem', { name: /Quality/ }).click()
  await page.getByRole('menuitemradio', { name: '180p' }).click()
  await expect(page.locator('video')).toHaveAttribute('src', /night-180\.webm$/)
})

test('the error state offers Retry', async ({ page }) => {
  await page.goto(story('video-videoplayer--error-state'))
  await expect(page.getByRole('alert')).toContainText("This video couldn't be loaded.")
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
})

test('the side panel lists chapters and seeks on click', async ({ page }) => {
  await page.goto(story('video-videoplayer--chapters-panel'))
  const panel = page.getByRole('complementary', { name: 'Chapters and playlist' })
  await expect(panel.getByRole('tab', { name: 'Chapters' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await panel.getByRole('button', { name: /The scramble crossing/ }).click()
  await expect.poll(() => currentTime(page)).toBe(14)
  await panel.getByRole('tab', { name: 'Chapters' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(panel.getByRole('tab', { name: 'Transcript' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(panel.getByRole('button', { name: /Shibuya, 11:40 p\.m\./ })).toBeVisible()
})

test('playlist: next swaps the media and the panel follows', async ({ page }) => {
  await page.goto(story('video-videoplayer--playlist'))
  await expect(page.locator('video')).toHaveAttribute('src', /night-360\.webm$/)
  await page.getByRole('button', { name: 'Next video' }).click()
  await expect(page.getByRole('region', { name: 'Morning Market, Tsukiji' })).toBeVisible()
  await expect(page.locator('video')).toHaveAttribute('src', /night-180\.webm$/)
})

test('the end screen offers replay and share', async ({ page }) => {
  await page.goto(story('video-videoplayer--end-screen'))
  await page.locator('video').evaluate(async (v: HTMLVideoElement) => {
    v.muted = true
    v.currentTime = 29.5
    await v.play()
  })
  const end = page.getByRole('region', { name: 'Watch next' })
  await expect(end).toBeVisible({ timeout: 5000 })
  await end.getByRole('button', { name: 'Share' }).click()
  const sheet = page.getByRole('dialog', { name: 'Share this video' })
  await expect(sheet.getByRole('textbox', { name: 'Video link' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
})

test('picture settings zoom and mirror the video', async ({ page }) => {
  await page.goto(story('video-videoplayer--all-settings'))
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('menuitem', { name: /Picture/ }).click()
  await page.getByRole('menuitemradio', { name: 'Zoom: 150%' }).click()
  await page.getByRole('menuitemcheckbox', { name: 'Mirror view' }).click()
  await expect(page.locator('video')).toHaveCSS('scale', '-1.5 1.5')
})

test('watch limit covers the frame at the limit', async ({ page }) => {
  await page.goto(story('video-videoplayer--watch-limit'))
  await page.locator('video').evaluate((v: HTMLVideoElement) => {
    v.currentTime = 10
  })
  await expect(page.getByText('Your free preview ended')).toBeVisible()
})

test('live: the pill turns grey behind the edge and jumps back', async ({ page }) => {
  await page.goto(story('video-videoplayer--live'))
  const video = page.locator('video')
  await video.evaluate(async (v: HTMLVideoElement) => {
    v.muted = true
    await v.play()
    v.currentTime = 29.5
  })
  await expect(page.getByRole('button', { name: 'Live' })).toHaveAttribute('data-edge', '')
  await video.evaluate((v: HTMLVideoElement) => {
    v.pause()
    v.currentTime = 15
  })
  await page.getByRole('button', { name: 'Jump to live' }).click()
  await expect.poll(() => currentTime(page)).toBeGreaterThan(29)
})

test('overlay card appears in its window and closes', async ({ page }) => {
  await page.goto(story('video-videoplayer--overlays'))
  await page.locator('video').evaluate((v: HTMLVideoElement) => {
    v.currentTime = 5
  })
  const card = page.getByRole('region', { name: 'Tour offer' })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Close' }).click()
  await expect(card).toBeHidden()
})

test('HLS via hlsEngine: plays through MSE and lists manifest levels', async ({ page }) => {
  await page.goto(story('video-videoplayer--hls-stream'))
  const video = page.locator('video')
  await video.evaluate(async (v: HTMLVideoElement) => {
    v.muted = true
    await v.play()
  })
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentSrc)).toMatch(/^blob:/)
  await expect.poll(() => currentTime(page)).toBeGreaterThan(0.5)
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('menuitem', { name: /Quality/ }).click()
  await expect(page.getByRole('menuitemradio')).toHaveText(['Auto', '360p', '180p'])
  await page.getByRole('menuitemradio', { name: '180p' }).click()
  await page.getByRole('button', { name: 'Back to settings' }).click()
  await expect(page.getByRole('menuitem', { name: /Quality/ })).toContainText('180p')
  await page.getByRole('button', { name: 'Settings' }).click() // the gear closes it
  await expect(page.getByRole('menu')).toBeHidden()
})

test('±10s keeps the controls up, then they hide after inactivity', async ({ page }) => {
  await page.goto(story('video-videoplayer--playground'))
  const player = page.getByRole('region', { name: 'Last Train, Shibuya' })
  await page.locator('video').evaluate(async (v: HTMLVideoElement) => {
    v.muted = true
    await v.play()
  })
  await page.getByRole('button', { name: 'Forward 10 seconds' }).click()
  await expect.poll(() => currentTime(page)).toBeGreaterThan(9)
  await expect(player).toHaveAttribute('data-controls', 'shown')
  await expect(player).toHaveAttribute('data-controls', 'hidden', { timeout: 5000 })
})
