import { expect, type Page, test } from '@playwright/test'

// ScrambleText (docs/component-scramble-text.md §9/§10). Asserts the DOM state the glyph island
// exposes (`data-state` on the layer, `data-glyph` per glyph), computed styles and rAF counts —
// never wall-clock timing — so it stays deterministic.
const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`
const LOBBY = 'components-scrambletext--match-lobby'
const TITLE = 'h2 [data-sk-scramble-text]'

type W = Window & { __rafCalls: number; __states: string[]; __widths: number[] }

// Before any page script: count rAF calls, log every glyph state the island sets, and sample the
// title layer's width on every frame while it decodes (with the unwrapped rAF, so the sampler
// doesn't count as the island's frames).
const instrument = (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as W
    w.__rafCalls = 0
    w.__states = []
    w.__widths = []
    const raf = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (cb) => {
      w.__rafCalls++
      return raf(cb)
    }
    new MutationObserver((records) => {
      for (const r of records) {
        const v = (r.target as Element).getAttribute('data-glyph')
        if (v && !w.__states.includes(v)) w.__states.push(v)
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-glyph'] })
    const sample = () => {
      const el = document.querySelector('h2 [data-sk-scramble-text]')
      const state = el?.getAttribute('data-state')
      if (el && state === 'running') w.__widths.push(Math.round(el.getBoundingClientRect().width))
      if (state !== 'done') raf(sample)
    }
    raf(sample)
  })

const framesIn = async (page: Page, ms: number) => {
  const read = () => page.evaluate(() => (window as unknown as W).__rafCalls)
  const a = await read()
  await page.waitForTimeout(ms)
  return (await read()) - a
}

const collectErrors = (page: Page) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(String(e)))
  return errors
}

test.describe('ScrambleText', () => {
  test.describe('motion', () => {
    test.use({ reducedMotion: 'no-preference' }) // always explicit: the OS setting leaks in otherwise

    test('decodes through noise and settles on the real text with an afterglow', async ({
      page,
    }) => {
      const errors = collectErrors(page)
      await instrument(page)
      await page.goto(story(LOBBY))
      // The accessible name is the real text from the first paint, never noise.
      const title = page.getByRole('heading', { name: 'MATCH FOUND' })
      await expect(title).toBeVisible()

      // Every glyph walked hidden → noise → lock → done.
      await expect
        .poll(() => page.evaluate(() => (window as unknown as W).__states.slice().sort()))
        .toEqual(['done', 'hidden', 'lock', 'noise'])
      await expect(page.locator('[data-sk-scramble-text]:not([data-state="done"])')).toHaveCount(0)

      await expect(page.locator(TITLE)).toHaveText('MATCH FOUND')
      await expect(page.locator('[data-glyph]:not([data-glyph="done"])')).toHaveCount(0)
      expect(
        await page
          .locator(`${TITLE} [data-glyph="done"]`)
          .first()
          .evaluate((el) => getComputedStyle(el).animationName),
      ).toBe('sk-scramble-text-settle')
      // Settled: the island stops asking for frames.
      expect(await framesIn(page, 400)).toBe(0)
      expect(errors).toEqual([])
    })

    test('keeps the layout still while decoding (no width jitter)', async ({ page }) => {
      await instrument(page)
      await page.goto(story(LOBBY))
      await expect(page.locator(TITLE)).toHaveAttribute('data-state', 'done')
      const widths = await page.evaluate(() => (window as unknown as W).__widths)
      expect(widths.length).toBeGreaterThan(3)
      const final = Math.round((await page.locator(TITLE).boundingBox())?.width ?? 0)
      expect(new Set([...widths, final])).toEqual(new Set([final]))
    })

    test('replays when its key changes (hovering a roster row)', async ({ page }) => {
      await page.goto(story(LOBBY))
      const row = page.getByRole('list', { name: 'Lobby roster' }).getByRole('listitem').nth(2)
      await expect(page.locator('[data-sk-scramble-text]:not([data-state="done"])')).toHaveCount(0)
      await row.hover()
      await expect
        .poll(() => row.locator('[data-sk-scramble-text][data-state="running"]').count())
        .toBeGreaterThan(0)
      await expect(row.locator('[data-sk-scramble-text]:not([data-state="done"])')).toHaveCount(0)
      await expect(row.getByText('vex.inferno', { exact: true }).first()).toBeAttached()
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('renders the final text at once: no glyph states, no frames, no afterglow', async ({
      page,
    }) => {
      const errors = collectErrors(page)
      await instrument(page)
      await page.goto(story(LOBBY))
      await expect(page.getByRole('heading', { name: 'MATCH FOUND' })).toBeVisible()
      await expect(page.locator('[data-sk-scramble-text]:not([data-state="done"])')).toHaveCount(0)
      await expect(page.locator(TITLE)).toHaveText('MATCH FOUND')
      expect(await page.locator('[data-glyph]').count()).toBe(0)
      expect(await page.evaluate(() => (window as unknown as W).__states)).toEqual([])
      expect(await framesIn(page, 400)).toBe(0)
      expect(errors).toEqual([])
    })
  })
})
