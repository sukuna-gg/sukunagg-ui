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
      await seek(page, 0)
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
