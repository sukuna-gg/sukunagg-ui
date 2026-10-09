import { expect, type Page, test } from '@playwright/test'

// AvatarFrame (docs/component-avatar-frame.md §9). Asserts computed styles and the Web Animations
// API, never wall-clock timing: animations are paused and seeked, so it stays deterministic.
// Showcase frames: 0 = accent comet + online status, 1 = premium + sparks, 2 = live.
const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`
const frames = '[data-sk-avatar-frame]'

/** The `sk-avatar-frame-*` animations running inside frame `n`, sorted. */
const animationNames = (page: Page, n: number) =>
  page
    .locator(frames)
    .nth(n)
    .evaluate((el) =>
      el
        .getAnimations({ subtree: true })
        .map((a) => (a as CSSAnimation).animationName)
        .sort(),
    )

/** Computed style of the first match of `selector` inside frame `n`. */
const css = (page: Page, n: number, selector: string, prop: string) =>
  page
    .locator(frames)
    .nth(n)
    .locator(selector)
    .first()
    .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

/** Pauses every animation inside frame `n` at `ms` (they are all infinite loops). */
const seek = (page: Page, n: number, ms: number) =>
  page
    .locator(frames)
    .nth(n)
    .evaluate((el, t) => {
      for (const a of el.getAnimations({ subtree: true })) {
        a.pause()
        a.currentTime = t
      }
    }, ms)

const watchErrors = (page: Page) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  return errors
}

test.describe('AvatarFrame', () => {
  test.describe('motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('the Showcase renders the three framed avatars with their real text', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story('components-avatarframe--showcase'))
      await expect(page.locator(frames)).toHaveCount(3)
      for (const initials of ['RY', 'KA', 'M1']) {
        await expect(page.locator(frames).getByText(initials, { exact: true })).toBeVisible()
      }
      await expect(page.locator(frames).nth(2).getByText('Live', { exact: true })).toBeVisible()
      expect(errors).toEqual([])
    })

    test('every layer runs its sk-avatar-frame keyframes', async ({ page }) => {
      await page.goto(story('components-avatarframe--showcase'))
      await expect(page.locator(frames)).toHaveCount(3)
      // Comet: ring, glow ring and head turn together.
      expect(await animationNames(page, 0)).toEqual([
        'sk-avatar-frame-turn',
        'sk-avatar-frame-turn',
        'sk-avatar-frame-turn',
      ])
      // Premium: the sheen and three spark orbits.
      expect(await animationNames(page, 1)).toEqual(Array(4).fill('sk-avatar-frame-turn'))
      // Live: halo, ripple and the pill dot.
      expect(await animationNames(page, 2)).toEqual([
        'sk-avatar-frame-blink',
        'sk-avatar-frame-breathe',
        'sk-avatar-frame-ripple',
      ])
    })

    test('the comet turns from its rest angle (compositor rotate, 3.2s a turn)', async ({
      page,
    }) => {
      await page.goto(story('components-avatarframe--showcase'))
      await expect(page.locator(frames)).toHaveCount(3)
      await seek(page, 0, 0)
      expect(await css(page, 0, '.avatar-frame-comet', 'rotate')).toBe('40deg')
      await seek(page, 0, 800)
      expect(await css(page, 0, '.avatar-frame-comet', 'rotate')).toBe('130deg')
      // The spark orbits turn on their own clocks: 9.3s orbit at 930ms = 36deg past its rest.
      await seek(page, 1, 930)
      const orbits = page.locator(frames).nth(1).locator('.animate-avatar-frame-orbit')
      await expect(orbits).toHaveCount(3)
      expect(await orbits.nth(2).evaluate((el) => getComputedStyle(el).rotate)).toBe('47deg')
    })

    test('the status dot is cut out of the ring and the avatar', async ({ page }) => {
      await page.goto(story('components-avatarframe--showcase'))
      await expect(page.locator(frames)).toHaveCount(3)
      expect(await css(page, 0, '.avatar-frame-cutout', 'mask-image')).toContain('radial-gradient')
      expect(await css(page, 0, '.avatar-frame-cutout-avatar', 'mask-image')).toContain(
        'radial-gradient',
      )
      // The dot sits on the avatar's 45deg bottom-right edge.
      const frame = await page.locator(frames).nth(0).boundingBox()
      const dot = await page.locator(frames).nth(0).locator('.avatar-frame-status').boundingBox()
      if (!frame || !dot) throw new Error('missing boxes')
      const r = (frame.width - 12) / 2 - 1
      const cx = frame.x + frame.width / 2 + r * Math.SQRT1_2
      expect(Math.abs(dot.x + dot.width / 2 - cx)).toBeLessThan(1.5)
      expect(Math.abs(dot.width - (frame.width - 12) * 0.21)).toBeLessThan(1)
    })

    test('the LIVE pill is set at line-height 1 and hangs half its height below the frame', async ({
      page,
    }) => {
      await page.goto(story('components-avatarframe--showcase'))
      await expect(page.locator(frames)).toHaveCount(3)
      const live = page.locator(frames).nth(2)
      // A tall inherited line-height must not stretch the pill (tailwind-merge once dropped its
      // `leading-none` because it preceded the font-size class).
      await live.evaluate((el) => {
        el.style.lineHeight = '28px'
      })
      const pill = live.locator('.bg-gradient-accent')
      const [size, leading] = await pill.evaluate((el) => [
        Number.parseFloat(getComputedStyle(el).fontSize),
        Number.parseFloat(getComputedStyle(el).lineHeight),
      ])
      expect(leading).toBe(size)
      const box = await live.boundingBox()
      const p = await pill.boundingBox()
      if (!box || !p) throw new Error('missing boxes')
      // 1em of text + .27em padding top and bottom (16.9px at 11px type); the hang is half of it.
      expect(Math.abs(p.height - size * 1.54)).toBeLessThan(0.5)
      expect(Math.abs(p.y + p.height - (box.y + box.height) - p.height / 2)).toBeLessThan(0.5)
    })

    test('on large avatars the status cut-out box scales: glow and halo fade out inside it', async ({
      page,
    }) => {
      // The cut-out mask clips at its own box. A fixed bleed square-clipped the glow and the live
      // halo of a 200px avatar; the bleed is 30% of the frame, so both fade out inside it.
      await page.goto(story('components-avatarframe--large'))
      await expect(page.locator(frames)).toHaveCount(2)
      for (const n of [0, 1]) {
        await seek(page, n, 2800) // the live halo breathes out to its widest (scale 1.04)
        const frame = page.locator(frames).nth(n)
        const box = await frame.boundingBox()
        const cut = await frame.locator('.avatar-frame-cutout').boundingBox()
        if (!box || !cut) throw new Error('missing boxes')
        expect(box.width).toBeGreaterThan(200)
        const bleed = (cut.width - box.width) / 2
        expect(bleed).toBeGreaterThan(box.width * 0.3 - 1)
        // A Gaussian blur is spent by ~3 radii; all of it must sit inside the masked box.
        const blur = await frame
          .locator('.avatar-frame-cutout [class*="blur-"]')
          .first()
          .evaluate((el) => Number.parseFloat(getComputedStyle(el).filter.replace(/^blur\(/, '')))
        expect(blur).toBeGreaterThan(10)
        expect(3 * blur).toBeLessThan(bleed)
      }
      const live = page.locator(frames).nth(1)
      const cut = await live.locator('.avatar-frame-cutout').boundingBox()
      const halo = await live.locator('.avatar-frame-halo').boundingBox()
      if (!cut || !halo) throw new Error('missing boxes')
      expect(halo.width).toBeGreaterThan(300)
      expect(halo.x).toBeGreaterThanOrEqual(cut.x)
      expect(halo.y).toBeGreaterThanOrEqual(cut.y)
      expect(halo.x + halo.width).toBeLessThanOrEqual(cut.x + cut.width)
      expect(halo.y + halo.height).toBeLessThanOrEqual(cut.y + cut.height)
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('every loop stops on its designed still frame; nothing is hidden', async ({ page }) => {
      const errors = watchErrors(page)
      await page.goto(story('components-avatarframe--showcase'))
      await expect(page.locator(frames)).toHaveCount(3)
      for (const n of [0, 1, 2]) {
        expect(await animationNames(page, n)).toEqual([])
      }
      expect(await css(page, 0, '.avatar-frame-comet', 'animation-name')).toBe('none')
      expect(await css(page, 0, '.avatar-frame-comet', 'rotate')).toBe('40deg')
      expect(await css(page, 0, '.avatar-frame-head', 'rotate')).toBe('33deg')
      expect(await css(page, 1, '.avatar-frame-sheen', 'rotate')).toBe('-20deg')
      const orbits = page.locator(frames).nth(1).locator('.animate-avatar-frame-orbit')
      expect(
        await orbits.evaluateAll((els) => els.map((el) => getComputedStyle(el).rotate)),
      ).toEqual(['140deg', '259deg', '11deg'])
      expect(await css(page, 2, '.avatar-frame-halo', 'opacity')).toBe('0.7')
      await expect(page.locator(frames).nth(2).getByText('Live', { exact: true })).toBeVisible()
      for (const initials of ['RY', 'KA', 'M1']) {
        await expect(page.locator(frames).getByText(initials, { exact: true })).toBeVisible()
      }
      expect(errors).toEqual([])
    })
  })
})
