import { expect, type Page, test } from '@playwright/test'

// ScrambleText (docs/component-scramble-text.md §9/§10). Asserts the DOM state the island exposes
// (`data-state` on the layer, `data-glyph` per overlay cell), computed styles, measured geometry and
// rAF counts — never wall-clock timing — so it stays deterministic.
const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`
const LOBBY = 'components-scrambletext--match-lobby'
const COMPOSED = 'components-scrambletext--composed'
const TITLE = 'h2 [data-sk-scramble-text]'
const RUNNING = '[data-sk-scramble-text]:not([data-state="done"])'

type W = Window & {
  __rafCalls: number
  __states: string[]
  __widths: number[]
  /** Worst noise overflow seen: (text width − 1.1 × cell width) / font size. */
  __overflow: number
  /** Worst offset between a settled cell's glyph and the real glyph it covers, in px. */
  __offset: number
  __afterglow: boolean
}

// Before any page script: count rAF calls, log every glyph state the island sets, and on every
// frame (with the unwrapped rAF, so the sampler doesn't count as the island's frames) sample the
// title's width, each noise glyph's width against its cell, and each settled cell against the real
// glyph underneath.
const instrument = (page: Page) =>
  page.addInitScript(() => {
    const w = window as unknown as W
    w.__rafCalls = 0
    w.__states = []
    w.__widths = []
    w.__overflow = 0
    w.__offset = 0
    w.__afterglow = false
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
    const range = document.createRange()
    const box = (node: Node, from?: number, to?: number) => {
      if (from === undefined) range.selectNodeContents(node)
      else {
        range.setStart(node, from)
        range.setEnd(node, to as number)
      }
      return range.getBoundingClientRect()
    }
    const sample = () => {
      const title = document.querySelector('h2 [data-sk-scramble-text]')
      if (title?.getAttribute('data-state') === 'running')
        w.__widths.push(Math.round(title.getBoundingClientRect().width))
      for (const layer of document.querySelectorAll(
        '[data-sk-scramble-text][data-state="running"]',
      )) {
        const cells = Array.from(layer.querySelectorAll<HTMLElement>('[data-glyph]'))
        const real = layer.lastElementChild?.firstChild as Text
        const glyphs = Array.from(
          new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(real.data),
        ).filter((g) => !/^\s+$/.test(g.segment))
        cells.forEach((cell, i) => {
          const state = cell.getAttribute('data-glyph')
          const drawn = cell.firstChild as Text | null
          if (!drawn?.data) return
          if (state === 'noise' || state === 'lock') {
            const fs = Number.parseFloat(getComputedStyle(cell).fontSize)
            const over = (box(drawn).width - 1.1 * cell.getBoundingClientRect().width) / fs
            w.__overflow = Math.max(w.__overflow, over)
          } else if (state === 'done') {
            if (getComputedStyle(cell).animationName === 'sk-scramble-text-settle')
              w.__afterglow = true
            const g = glyphs[i] as Intl.SegmentData
            const a = box(real, g.index, g.index + g.segment.length)
            const b = box(drawn)
            w.__offset = Math.max(w.__offset, Math.abs(a.left - b.left), Math.abs(a.top - b.top))
          }
        })
      }
      raf(sample)
    }
    raf(sample)
  })

const read = <K extends keyof W>(page: Page, key: K) =>
  page.evaluate((k) => (window as unknown as W)[k], key) as Promise<W[K]>

const framesIn = async (page: Page, ms: number) => {
  const a = await read(page, '__rafCalls')
  await page.waitForTimeout(ms)
  return (await read(page, '__rafCalls')) - a
}

const settleAnimations = (page: Page) =>
  page.evaluate(
    () =>
      document
        .getAnimations()
        .filter((a) => (a as CSSAnimation).animationName === 'sk-scramble-text-settle').length,
  )

/** Waits until the story has mounted and every instance has settled (no layer still running). */
const settled = async (page: Page) => {
  await expect(page.locator('[data-sk-scramble-text]').first()).toBeAttached()
  await expect(page.locator(RUNNING)).toHaveCount(0, { timeout: 10_000 })
}

/**
 * Once the story has settled and its web fonts have loaded, resets the samplers and replays it
 * (Replay bumps the `key`), so the measurements cover a decode on the final font — a font swap
 * mid-decode reflows the line by design.
 */
const replayOnFonts = async (page: Page) => {
  await settled(page)
  await page.evaluate(async () => {
    await document.fonts.ready
    const w = window as unknown as W
    w.__widths = []
    w.__overflow = 0
    w.__offset = 0
  })
  await page.getByRole('button', { name: 'Replay' }).click()
  await expect(page.locator('[data-sk-scramble-text][data-state="running"]').first()).toBeAttached()
  await settled(page)
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

    test('decodes through noise and settles back on the plain real text', async ({ page }) => {
      const errors = collectErrors(page)
      await instrument(page)
      await page.goto(story(LOBBY))
      // The accessible name is the real text from the first paint, never noise.
      const title = page.getByRole('heading', { name: 'MATCH FOUND' })
      await expect(title).toBeVisible()

      // Every cell walked hidden → noise → lock → done, and a settled cell played the afterglow.
      await expect
        .poll(() => page.evaluate(() => (window as unknown as W).__states.slice().sort()))
        .toEqual(['done', 'hidden', 'lock', 'noise'])
      await settled(page)
      expect(await read(page, '__afterglow')).toBe(true)

      // Settled: the overlay is gone, the real text is one visible text node, nothing animates and
      // the island stops asking for frames.
      await expect(page.locator(TITLE)).toHaveText('MATCH FOUND')
      expect(await page.locator('[data-glyph]').count()).toBe(0)
      expect(
        await page
          .locator(`${TITLE} > :last-child`)
          .evaluate((el) => [getComputedStyle(el).visibility, el.childNodes.length]),
      ).toEqual(['visible', 1])
      expect(await settleAnimations(page)).toBe(0)
      expect(await framesIn(page, 400)).toBe(0)
      expect(errors).toEqual([])
    })

    test('keeps the layout still and lands exactly on the kerned text (no jitter, no snap)', async ({
      page,
    }) => {
      await instrument(page)
      await page.goto(story(LOBBY))
      await replayOnFonts(page)
      const widths = await read(page, '__widths')
      expect(widths.length).toBeGreaterThan(3)
      const final = Math.round((await page.locator(TITLE).boundingBox())?.width ?? 0)
      expect(new Set([...widths, final])).toEqual(new Set([final]))
      // Each settled cell drew its glyph where the real one sits, so dropping the overlay is seamless.
      expect(await read(page, '__offset')).toBeLessThan(1)
      // At rest every line is exactly as wide as the same text set as one plain text node.
      const drift = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-sk-scramble-text]'), (layer) => {
          const real = layer.lastElementChild as HTMLElement
          const plain = document.createElement('span')
          plain.textContent = real.textContent
          plain.style.cssText = 'position:absolute;white-space:pre;font-variant-ligatures:none'
          layer.parentElement?.append(plain)
          const d = Math.abs(
            real.getBoundingClientRect().width - plain.getBoundingClientRect().width,
          )
          plain.remove()
          return d
        }),
      )
      expect(Math.max(...drift)).toBeLessThan(0.1)
    })

    test('draws noise no wider than the glyph it covers', async ({ page }) => {
      await instrument(page)
      await page.goto(story(LOBBY))
      await replayOnFonts(page)
      // FIT is 1.1× the cell; the narrowest-four fallback (for `i`, `.`, `1`) may add a hair more.
      expect(await read(page, '__overflow')).toBeLessThan(0.1)
    })

    test('does not replay the afterglow when a hidden parent is shown again', async ({ page }) => {
      await page.goto(story(LOBBY))
      await settled(page)
      const card = page.locator(TITLE).locator('xpath=ancestor::div[contains(@class,"@container")]')
      // Hide and show with a style flush in between: CSS restarts any animation still declared on
      // the subtree (Tabs/Accordion panels, `hidden md:block`, Collapsible, Drawer).
      await card.evaluate((el) => {
        const card = el as HTMLElement
        card.style.display = 'none'
        void card.offsetWidth
        card.style.display = ''
        void card.offsetWidth
      })
      expect(await settleAnimations(page)).toBe(0)
      expect(await page.locator('[data-glyph]').count()).toBe(0)
    })

    test('hides the real text under a gradient fill and draws visible noise', async ({ page }) => {
      await page.goto(story(COMPOSED))
      const layer = page
        .getByRole('heading', { name: 'VICTORY ROYALE' })
        .locator('[data-sk-scramble-text]')
      await expect(layer).toHaveAttribute('data-state', 'running')
      // `visibility` (not color) hides it, so the parent's background-clip: text can't show it.
      expect(
        await layer.locator('> :last-child').evaluate((el) => getComputedStyle(el).visibility),
      ).toBe('hidden')
      const noise = layer.locator('[data-glyph="noise"]').first()
      await expect(noise).toBeAttached()
      const [fill, color] = await noise.evaluate((el) => {
        const cs = getComputedStyle(el)
        return [cs.webkitTextFillColor, cs.color]
      })
      expect(fill).toBe(color)
      expect(fill).not.toMatch(/rgba\(.*,\s*0\)$|transparent/)
      await expect(layer).toHaveAttribute('data-state', 'done')
      expect(
        await layer.locator('> :last-child').evaluate((el) => getComputedStyle(el).visibility),
      ).toBe('visible')
    })

    test('never lets a settled glyph fade into a transparent color (bg-clip-text text-transparent)', async ({
      page,
    }) => {
      await page.goto(story(COMPOSED))
      const layer = page
        .getByRole('heading', { name: 'FLAWLESS' })
        .locator('[data-sk-scramble-text]')
      await expect(layer).toHaveAttribute('data-state', 'running')
      // The parent's `color` is transparent and nothing strokes it: the cells are flagged…
      await expect(layer.locator('[data-clear]').first()).toBeAttached()
      // …while the stroked line (transparent `color` + text-stroke) is left alone.
      const stroked = page.getByRole('heading', { name: 'ROUND 12' }).locator('[data-glyph]')
      expect(await stroked.count()).toBeGreaterThan(0)
      expect(await stroked.and(page.locator('[data-clear]')).count()).toBe(0)
      // Sample every frame until the line settles: the lowest alpha any `done` cell's color or fill
      // computes to. Before the fix they faded into `transparent` and the word went blank.
      const seen = await layer.evaluate(
        (el) =>
          new Promise<{ done: number; min: number }>((resolve) => {
            const alpha = (c: string) => {
              if (c === 'transparent') return 0
              const m =
                /^rgba\((?:[^,]+,){3}\s*([\d.]+)\)$/.exec(c) ?? /\/\s*([\d.]+)(%?)\s*\)$/.exec(c)
              return m ? Number(m[1]) / (m[2] ? 100 : 1) : 1
            }
            let done = 0
            let min = 1
            const sample = () => {
              for (const cell of el.querySelectorAll('[data-glyph="done"]')) {
                const cs = getComputedStyle(cell)
                done++
                min = Math.min(min, alpha(cs.color), alpha(cs.webkitTextFillColor))
              }
              if (el.getAttribute('data-state') === 'done') resolve({ done, min })
              else requestAnimationFrame(sample)
            }
            sample()
          }),
      )
      expect(seen.done).toBeGreaterThan(0)
      expect(seen.min).toBeGreaterThan(0.5)
    })

    test('replays when its key changes (hovering a roster row)', async ({ page }) => {
      await page.goto(story(LOBBY))
      const row = page.getByRole('list', { name: 'Lobby roster' }).getByRole('listitem').nth(2)
      await settled(page)
      await row.hover()
      await expect
        .poll(() => row.locator('[data-sk-scramble-text][data-state="running"]').count())
        .toBeGreaterThan(0)
      await expect(row.locator(RUNNING)).toHaveCount(0)
      await expect(row.getByText('vex.inferno', { exact: true }).first()).toBeAttached()
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('renders the final text at once: no cells, no glyph states, no frames', async ({
      page,
    }) => {
      const errors = collectErrors(page)
      await instrument(page)
      await page.goto(story(LOBBY))
      await expect(page.getByRole('heading', { name: 'MATCH FOUND' })).toBeVisible()
      await settled(page)
      await expect(page.locator(TITLE)).toHaveText('MATCH FOUND')
      expect(await page.locator('[data-glyph]').count()).toBe(0)
      expect(await read(page, '__states')).toEqual([])
      expect(await framesIn(page, 400)).toBe(0)
      expect(errors).toEqual([])
    })
  })
})
