import { expect, type Page, test } from '@playwright/test'

// RankReveal (docs/component-rank-reveal.md §9, §10). Asserts computed styles and Web Animations
// state, never wall-clock timing, so it stays deterministic.
const story = (id: string, theme: 'dark' | 'light' = 'dark') =>
  `/iframe.html?id=components-rankreveal--${id}&viewMode=story&globals=theme:${theme}`
const ROOT = '[data-sk-rank-reveal]'
const part = (name: string) => `${ROOT} [class~="animate-rank-reveal-${name}"]`

const errorsOf = (page: Page) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  return errors
}

/** Keyframe names of every CSS animation inside the first RankReveal (any play state), sorted. */
const animationNames = (page: Page) =>
  page
    .locator(ROOT)
    .first()
    .evaluate((el) =>
      [
        ...new Set(
          el.getAnimations({ subtree: true }).map((a) => (a as CSSAnimation).animationName),
        ),
      ].sort(),
    )

/** Jump the one-shot timeline to its end; park the infinite loops at t=0 (finish() throws on them). */
const settle = (page: Page) =>
  page
    .locator(ROOT)
    .first()
    .evaluate((el) => {
      for (const a of el.getAnimations({ subtree: true })) {
        if (a.effect?.getComputedTiming().endTime === Number.POSITIVE_INFINITY) {
          a.pause()
          a.currentTime = 0
        } else a.finish()
      }
    })

/** Pause every animation in the first RankReveal at `ms` on the shared timeline. */
const seek = (page: Page, ms: number) =>
  page
    .locator(ROOT)
    .first()
    .evaluate((el, t) => {
      for (const a of el.getAnimations({ subtree: true })) {
        a.pause()
        a.currentTime = t
      }
    }, ms)

/**
 * Replay (a fresh mount via `key`) and pause every animation at `ms` one frame later, inside one
 * evaluate: no one-shot part (the no-fill waves and slots) can finish and drop out of
 * getAnimations() before it is captured, however long the page took to load.
 */
const replayAndSeek = (page: Page, ms: number) =>
  page.evaluate(async (t) => {
    const replay = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Replay')
    replay?.click()
    await new Promise(requestAnimationFrame)
    const root = document.querySelector('[data-sk-rank-reveal]') as HTMLElement
    for (const a of root.getAnimations({ subtree: true })) {
      a.pause()
      a.currentTime = t
    }
  }, ms)

/** `playState@currentTime` of each animation on the first match. */
const timing = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => el.getAnimations().map((a) => `${a.playState}@${Number(a.currentTime)}`))

const computed = (page: Page, selector: string, prop: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p).trim(), prop)

// A finished `from`-only keyframe holds its implicit end (the base value) as a number — `scale: 1`,
// `translate: 0px 0%` — where the un-animated element reports `none`. Same pixels; compare as one.
const identity = (v: string) => (/^(1|0px|0px 0%|0px 0px)$/.test(v) ? 'none' : v)

/** The resting frame: what reduced motion shows at once and what the timeline settles on. */
const finalFrame = async (page: Page) => ({
  crest: [
    await computed(page, part('crest'), 'opacity'),
    identity(await computed(page, part('crest'), 'scale')),
  ],
  rays: await computed(page, part('rays'), 'opacity'),
  orbit: await computed(page, part('orbit'), 'stroke-dashoffset'),
  title: [
    await computed(page, part('title'), 'opacity'),
    identity(await computed(page, part('title'), 'translate')),
  ],
  line: await computed(page, part('line'), 'opacity'),
  // Transient bursts end hidden.
  wave: await computed(page, part('wave'), 'opacity'),
  spark: await computed(page, part('spark'), 'opacity'),
  glint: await computed(page, part('glint'), 'opacity'),
  slot: await computed(page, `${ROOT} h2`, 'clip-path'),
})
const FINAL = {
  crest: ['1', 'none'],
  rays: '0.5',
  orbit: '0px',
  title: ['1', 'none'],
  line: '1',
  wave: '0',
  spark: '0',
  glint: '0',
  slot: 'none',
}

// The story chrome loads Archivo from Google Fonts: answer with an empty stylesheet so the spec
// never depends on the network (and a blocked request can't log a console error).
test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  )
})

test.describe('RankReveal', () => {
  test.describe('motion', () => {
    test.use({ reducedMotion: 'no-preference' })

    test('plays the whole timeline on mount and settles on the final frame', async ({ page }) => {
      const errors = errorsOf(page)
      await page.goto(story('playground'))
      await expect(page.getByRole('heading', { level: 2, name: 'Master I' })).toBeVisible()
      expect(await animationNames(page)).toEqual([
        'sk-rank-reveal-breathe',
        'sk-rank-reveal-burst',
        'sk-rank-reveal-enter',
        'sk-rank-reveal-flash',
        'sk-rank-reveal-pop',
        'sk-rank-reveal-sheen',
        'sk-rank-reveal-slot',
        'sk-rank-reveal-spin',
      ])
      await settle(page)
      expect(await finalFrame(page)).toEqual(FINAL)
      expect(errors).toEqual([])
    })

    test('starts from the hidden frame: crest small, copy below its slot, bursts dark', async ({
      page,
    }) => {
      await page.goto(story('playground'))
      await expect(page.locator(ROOT)).toBeVisible()
      await replayAndSeek(page, 0)
      // Captured on the fresh mount, so the assertions below test live animations.
      expect(await timing(page, part('wave'))).toEqual(['paused@0'])
      expect(await timing(page, `${ROOT} h2`)).toEqual(['paused@0'])
      expect(await computed(page, part('crest'), 'opacity')).toBe('0')
      expect(await computed(page, part('crest'), 'scale')).toBe('0.4')
      expect(await computed(page, part('title'), 'opacity')).toBe('0')
      expect(await computed(page, part('orbit'), 'stroke-dashoffset')).toBe('1px')
      // Waves have no backwards fill: invisible during their delay, not parked at full opacity.
      expect(await computed(page, part('wave'), 'opacity')).toBe('0')
      // Mid-rise the line is clipped at its own bottom edge (a slot), then released.
      await seek(page, 1100)
      expect(await computed(page, `${ROOT} h2`, 'clip-path')).toBe('inset(-40px -60px 0px)')
      await seek(page, 2100)
      expect(await computed(page, `${ROOT} h2`, 'clip-path')).toBe('none')
    })

    test('only the two decorative loops keep running after the reveal', async ({ page }) => {
      await page.goto(story('playground'))
      await expect(page.locator(ROOT)).toBeVisible()
      await page.locator(ROOT).evaluate((el) =>
        el.getAnimations({ subtree: true }).forEach((a) => {
          if (a.effect?.getComputedTiming().endTime !== Number.POSITIVE_INFINITY) a.finish()
        }),
      )
      const running = await page.locator(ROOT).evaluate((el) =>
        el
          .getAnimations({ subtree: true })
          .filter((a) => a.playState === 'running')
          .map((a) => (a as CSSAnimation).animationName)
          .sort(),
      )
      expect(running).toEqual([
        'sk-rank-reveal-breathe',
        'sk-rank-reveal-spin',
        'sk-rank-reveal-spin',
      ])
    })

    test('Replay remounts it (new key) and the timeline starts over', async ({ page }) => {
      await page.goto(story('playground'))
      await expect(page.locator(ROOT)).toBeVisible()
      await settle(page)
      expect(await computed(page, part('crest'), 'opacity')).toBe('1')
      await page.getByRole('button', { name: 'Replay' }).click()
      const crestTime = () =>
        page
          .locator(part('crest'))
          .evaluate((el) => Number(el.getAnimations()[0]?.currentTime ?? Number.NaN))
      await expect.poll(crestTime).toBeLessThan(900)
      expect(
        await page.locator(part('crest')).evaluate((el) => el.getAnimations()[0]?.playState),
      ).toBe('running')
    })

    test('every story renders without console errors', async ({ page }) => {
      const errors = errorsOf(page)
      for (const id of [
        'playground',
        'post-match',
        'tones',
        'custom-emblem',
        'phone',
        'settled',
        'both-themes',
      ]) {
        await page.goto(story(id, 'light'))
        await expect(page.locator(ROOT).first()).toBeVisible()
      }
      expect(errors).toEqual([])
    })
  })

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' })

    test('shows the complete final frame at once, with no animation at all', async ({ page }) => {
      const errors = errorsOf(page)
      await page.goto(story('playground'))
      await expect(page.getByRole('heading', { level: 2, name: 'Master I' })).toBeVisible()
      expect(
        await page
          .locator(ROOT)
          .first()
          .evaluate((el) => el.getAnimations({ subtree: true }).length),
      ).toBe(0)
      expect(await computed(page, part('rays'), 'animation-name')).toBe('none')
      expect(await finalFrame(page)).toEqual(FINAL)
      await expect(page.getByText('Rank up')).toBeVisible()
      await expect(page.getByText('+32 RR')).toBeVisible()
      expect(errors).toEqual([])
    })

    test('the title scales with a 340px phone stage and never clips', async ({ page }) => {
      // The story's second stage is "Grandmaster"; args put a longer single word in the first.
      await page.goto(`${story('phone')}&args=title:Grossmeisterschaften`)
      await expect(page.getByRole('heading', { level: 2, name: 'Grandmaster' })).toBeVisible()
      const fit = await page.locator(ROOT).evaluateAll((roots) =>
        roots.map((root) => {
          const h2 = root.querySelector('h2') as HTMLElement
          const text = (h2.firstElementChild as HTMLElement).getBoundingClientRect()
          const box = root.getBoundingClientRect()
          const pad = Number.parseFloat(getComputedStyle(root).paddingLeft)
          const content = root.clientWidth - 2 * pad
          return {
            // clamp(20px, 9cqi, 42px): 9% of the root's content box at this width.
            size: Math.round((Number.parseFloat(getComputedStyle(h2).fontSize) / content) * 1000),
            fits:
              h2.scrollWidth <= root.clientWidth &&
              text.left >= box.left + pad - 0.5 &&
              text.right <= box.right - pad + 0.5,
          }
        }),
      )
      expect(fit).toEqual([
        { size: 90, fits: true },
        { size: 90, fits: true },
      ])
    })

    test('the effect layer lines up at any root font size (px geometry)', async ({ page }) => {
      await page.goto(story('playground'))
      await expect(page.locator(ROOT)).toBeVisible()
      // Offsets from the crest's center (the anchor), rounded to half a pixel.
      const geometry = (fontSize: string) =>
        page
          .locator(ROOT)
          .first()
          .evaluate((root, size) => {
            document.documentElement.style.fontSize = size
            const half = (n: number) => Math.round(n * 2) / 2
            const fx = root.firstElementChild as HTMLElement
            const anchor = fx.firstElementChild as HTMLElement
            const beams = anchor.firstElementChild as HTMLElement
            const a = anchor.getBoundingClientRect()
            const svg = root.querySelector('svg') as SVGSVGElement
            const box = svg.getBoundingClientRect()
            const r = (svg.querySelector('circle') as SVGCircleElement).r.baseVal.value
            const ring = {
              x: box.left + box.width / 2,
              y: box.top + box.height / 2,
              r: (r * box.width) / svg.viewBox.baseVal.width,
            }
            // Each pip's distance from the orbit ring line.
            const pipOff = Math.max(
              ...[...root.querySelectorAll('[class~="animate-rank-reveal-pip"]')].map((el) => {
                const p = el.getBoundingClientRect()
                const d = Math.hypot(p.x + p.width / 2 - ring.x, p.y + p.height / 2 - ring.y)
                return Math.abs(d - ring.r)
              }),
            )
            const crest = (
              root.querySelector('[class~="animate-rank-reveal-crest"]') as HTMLElement
            ).getBoundingClientRect()
            const style = getComputedStyle(beams)
            const mask =
              style.getPropertyValue('mask-image') || style.getPropertyValue('-webkit-mask-image')
            const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
            const [opaque = Number.NaN, clear = Number.NaN] = [
              ...mask.matchAll(/([\d.]+)(px|rem)/g),
            ].map(([, n, unit]) => Number(n) * (unit === 'rem' ? rem : 1))
            const top = beams.getBoundingClientRect().top
            return {
              fx: half(fx.getBoundingClientRect().height),
              anchor: half(a.top - fx.getBoundingClientRect().top),
              rays: half(beams.getBoundingClientRect().width),
              ring: half(ring.r),
              pipOffRing: pipOff <= 1,
              crest: [half(crest.top - a.top), half(crest.bottom - a.top)],
              // The ray field fades out below the crest: fully opaque well past its center,
              // fully clear past its bottom edge.
              maskBelowCrest: top + opaque - a.top > 40 && top + clear > crest.bottom,
            }
          }, fontSize)
      const base = await geometry('16px')
      expect(base).toEqual({
        fx: 188,
        anchor: 100,
        rays: 720,
        ring: 74,
        pipOffRing: true,
        crest: [-58.5, 58.5],
        maskBelowCrest: true,
      })
      // Chrome/Firefox "Large" (20px) and the 62.5% root trick (10px).
      for (const size of ['20px', '10px']) expect(await geometry(size)).toEqual(base)
    })

    test('a shrink-to-fit parent gets the 320px phone layout, not a collapsed box', async ({
      page,
    }) => {
      await page.goto(story('playground'))
      await expect(page.locator(ROOT)).toBeVisible()
      const width = await page
        .locator(ROOT)
        .first()
        .evaluate((root) => {
          const stage = root.parentElement as HTMLElement
          stage.style.width = 'fit-content'
          return root.getBoundingClientRect().width
        })
      expect(width).toBe(320)
      await expect(page.getByRole('heading', { level: 2, name: 'Master I' })).toBeVisible()
    })

    test('every story is a still frame', async ({ page }) => {
      for (const id of ['post-match', 'tones', 'custom-emblem', 'phone', 'both-themes']) {
        await page.goto(story(id, 'light'))
        await expect(page.locator(ROOT).first()).toBeVisible()
        const live = await page
          .locator(ROOT)
          .evaluateAll((els) => els.flatMap((el) => el.getAnimations({ subtree: true })).length)
        expect(live).toBe(0)
      }
    })
  })
})
