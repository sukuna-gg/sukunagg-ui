import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import { render } from '@testing-library/react'
import { createRef, StrictMode } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { type FxEnv, flushEffects, installFxEnv } from '../../../../../test/fx'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { timeline } from './bracket-beam.geometry'
import { BracketBeam, type BracketRound } from './index'

// The mockup's eight-team playoffs: Crimson Vow wins it all.
const EIGHT: BracketRound[] = [
  {
    name: 'Quarter-finals',
    meta: 'Bo3',
    matches: [
      {
        teams: [
          { name: 'Crimson Vow', seed: 1 },
          { name: 'Paper Tigers', seed: 8 },
        ],
        scores: [2, 0],
        winner: 0,
      },
      { teams: ['Night Shift', 'Iron Lotus'], scores: [2, 1], winner: 0 },
      { teams: ['Kitsune Five', 'Hollow Crown'], scores: [1, 2], winner: 1 },
      { teams: ['Ember Tide', 'Static Saints'], scores: [2, 0], winner: 0 },
    ],
  },
  {
    name: 'Semi-finals',
    meta: 'Bo3',
    matches: [
      { teams: ['Crimson Vow', 'Night Shift'], scores: [2, 1], winner: 0 },
      { teams: ['Hollow Crown', 'Ember Tide'], scores: [2, 1], winner: 0 },
    ],
  },
  {
    name: 'Grand final',
    meta: 'Bo5',
    matches: [{ teams: ['Crimson Vow', 'Hollow Crown'], scores: [3, 1], winner: 0 }],
  },
]

const OPEN: BracketRound[] = [
  {
    name: 'Semi-finals',
    matches: [{ teams: ['A', 'B'], scores: [2, 0], winner: 0 }, { teams: ['C', 'D'] }],
  },
  { name: 'Final', matches: [{ teams: ['A', 'TBD'] }] },
]

const props = {
  rounds: EIGHT,
  champion: 'Crimson Vow',
  championMeta: '3–1 grand final',
  trophyMeta: 'S04',
}
const TL = timeline(3)

let env: FxEnv | undefined
afterEach(() => {
  env?.restore()
  env = undefined
})

const q = <E extends Element = HTMLElement>(root: ParentNode, selector: string) =>
  root.querySelector(selector) as E
const all = (root: ParentNode, selector: string) => [
  ...root.querySelectorAll<HTMLElement>(selector),
]
/** The island's base wires: the SVG's first group (after the glow filter). */
const basePaths = (svg: SVGSVGElement) => [...(svg.children[1]?.children ?? [])]

const rect = (x: number, y: number, w: number, h: number) =>
  ({ x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h }) as DOMRect

/**
 * Give every box the mockup's geometry (happy-dom has no layout), then tell the island's
 * ResizeObserver. Columns are 250px apart; matches are spread over a 320px list.
 */
function layOut(
  container: HTMLElement,
  { scrollWidth = 1100, clientWidth = 1100, notify = true } = {},
) {
  const scroller = q(container, '[data-sk-fx] > section')
  const grid = scroller.firstElementChild as HTMLElement
  for (const box of all(container, '[data-match]')) {
    const id = box.dataset.match ?? ''
    const [r = 3, i = 0] = id === 'champion' ? [3, 0] : id.split('-').map(Number)
    const n = id === 'champion' ? 1 : (EIGHT[r]?.matches.length ?? 1)
    const y = 50 + ((i + 0.5) * 320) / n - 27.5
    const x = 20 + r * 250
    box.getBoundingClientRect = () => rect(x, y, id === 'champion' ? 240 : 200, 55)
    for (const row of all(box, '[data-row]')) {
      const k = Number(row.dataset.row)
      row.getBoundingClientRect = () => rect(x, y + 1 + k * 27, 200, 26)
    }
  }
  Object.defineProperty(scroller, 'scrollWidth', { configurable: true, value: scrollWidth })
  Object.defineProperty(scroller, 'clientWidth', { configurable: true, value: clientWidth })
  scroller.getBoundingClientRect = () => rect(0, 0, clientWidth, 380)
  if (notify) env?.resize(grid, 1100, 380)
  else grid.getBoundingClientRect = () => rect(0, 0, 1100, 380)
  return { scroller, grid }
}

/** Run frames 50 ms apart (the loop clamps dt to 50 ms) for `ms` of animation. */
let now = 0
function play(ms: number) {
  for (let t = 0; t < ms; t += 50) {
    now += 50
    env?.frame(now)
  }
}

function mount(extra: Partial<Parameters<typeof BracketBeam>[0]> = {}) {
  const utils = render(<BracketBeam {...props} {...extra} />)
  const root = q(utils.container, '[data-sk-fx="bracket-beam"]')
  const scroller = q(root, ':scope > section')
  const svg = q<SVGSVGElement>(root, 'svg[focusable]:not([viewBox])')
  return { ...utils, root, scroller, svg }
}

describe('BracketBeam (server)', () => {
  const html = renderServer(<BracketBeam {...props} />)

  it('renders every round, team, seed and score, and the trophy card', () => {
    for (const text of ['Quarter-finals', 'Semi-finals', 'Grand final', 'Bo5', 'Trophy', 'S04']) {
      expect(html).toContain(text)
    }
    for (const team of ['Crimson Vow', 'Paper Tigers', 'Static Saints', 'Hollow Crown']) {
      expect(html).toContain(team)
    }
    expect(html).toContain('aria-label="Quarter-finals, Bo3"')
    expect(html).toContain('Champion')
    expect(html).toContain('3–1 grand final')
    expect(html).toContain('<section aria-label="Tournament bracket"')
  })

  it("draws the poster: CSS wires with inline geometry and the champion's rows lit", () => {
    const host = document.createElement('div')
    host.innerHTML = html
    const wires = all(host, '[style*="--sk-bracket-beam-ys"]')
    expect(wires).toHaveLength(7)
    expect(wires.every((w) => w.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect(wires[0]?.style.getPropertyValue('--sk-bracket-beam-hs')).toBe('0.5')
    expect(wires[0]?.style.getPropertyValue('--sk-bracket-beam-y')).toBe('-13.5')
    expect(wires[0]?.className).toContain('before:border-accent')
    expect(wires[1]?.className).toContain('before:border-line')
    expect(all(host, '[data-trail]').map((row) => row.textContent)).toEqual([
      'seed 1Crimson Vowscore 2, winner',
      'Crimson Vowscore 2, winner', // unseeded in a seeded bracket: no "seed" word
      'Crimson Vowscore 3, winner',
    ])
    expect(host.querySelector('[data-state], [data-dim]')).toBeNull()
    expect(q(host, '[data-sk-fx]').style.getPropertyValue('--sk-bracket-beam-rounds')).toBe('3')
  })

  it('maps rows to their variants: winners bold, the path lit, reduced-motion guards', () => {
    const host = document.createElement('div')
    host.innerHTML = html
    const lit = q(host, '[data-trail]')
    expect(lit.className).toContain('before:bracket-beam-glow')
    expect(lit.className).toContain('motion-reduce:before:transition-none')
    const winner = q(host, '[data-match="0-1"] [data-winner]')
    expect(winner.className).toContain('font-bold')
    expect(winner.className).not.toContain('bracket-beam-glow')
    const card = q(host, '[data-match="champion"]')
    expect(card.className).toContain('after:animate-bracket-beam-shock')
    expect(q(card, '[aria-hidden]').className).toContain('animate-bracket-beam-breathe')
  })

  it('hydrates without warnings', async () => {
    env = installFxEnv({ reducedMotion: true })
    await expectHydrates(<BracketBeam {...props} />)
    await flushEffects()
  })
})

describe('BracketBeam (island)', () => {
  it('mounts on the lit frame, paused until on screen, then runs', () => {
    env = installFxEnv()
    const { scroller, svg, container } = mount()
    expect(scroller.dataset.state).toBe('paused')
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(7)
    expect(container.querySelector('[data-dim]')).toBeNull()
    env.intersect(true)
    expect(scroller.dataset.state).toBe('running')
    expect(env.pendingFrames()).toBe(1)
  })

  it('measures the boxes and routes a wire per link', () => {
    env = installFxEnv()
    const { container, svg } = mount()
    layOut(container)
    const base = basePaths(svg)
    expect(base).toHaveLength(7)
    // q1's winning row (centre y 76.5) → s1's top row (centre y 116.5).
    expect(base[0]?.getAttribute('d')).toBe(
      'M220 76.5H238Q245 76.5 245 83.5V109.5Q245 116.5 252 116.5H270',
    )
    expect(Number(base[0]?.getAttribute('pathLength'))).toBeGreaterThan(50)
    expect(q(svg, 'filter').getAttribute('width')).toBe('1180')
  })

  it('plays the timeline: fades the path, then sends beams round by round to ignite the trophy', () => {
    env = installFxEnv()
    const { container, svg } = mount()
    layOut(container)
    env.intersect(true)
    const rows = all(container, '[data-trail]')
    const card = q(container, '[data-match="champion"]')
    const trail = q<SVGPathElement>(svg, 'g[filter] > g > path')
    now = 0
    env.frame(now) // first frame: dt = 0, still on the lit frame

    play(TL.fade - TL.still + 100) // into the fade
    expect(rows.every((row) => row.hasAttribute('data-dim'))).toBe(true)
    expect(card.hasAttribute('data-dim')).toBe(true)
    expect(Number((q(svg, 'g[filter] > g') as unknown as SVGGElement).style.opacity)).toBeLessThan(
      1,
    )

    play(TL.period - TL.fade + 100) // looped: the first row lights again
    expect(rows[0]?.hasAttribute('data-dim')).toBe(false)
    expect(rows[1]?.hasAttribute('data-dim')).toBe(true)

    play(TL.start[0] ?? 0) // the first beam is travelling
    const head = all(svg, 'circle[r="2.3"]')[0]
    expect(head?.getAttribute('visibility')).toBe('visible')
    expect(Number(trail.getAttribute('stroke-dashoffset'))).toBeLessThan(
      Number(trail.getAttribute('pathLength')),
    )

    play(TL.ignite - (TL.start[0] ?? 0)) // the last beam lands: the trophy ignites
    expect(rows.every((row) => !row.hasAttribute('data-dim'))).toBe(true)
    expect(card.hasAttribute('data-dim')).toBe(false)
    expect(all(svg, 'circle').some((c) => Number(c.getAttribute('opacity')) > 0.01)).toBe(true)

    play(600) // flow dashes march once the trophy is lit
    expect(
      all(svg, 'path').some(
        (p) =>
          p.getAttribute('class')?.includes('stroke-dasharray:2_10') &&
          p.getAttribute('visibility') === 'visible',
      ),
    ).toBe(true)
  })

  it('holds the frame while paused, and never restarts when `paused` toggles', () => {
    env = installFxEnv()
    const { scroller, rerender } = mount({ paused: true })
    env.intersect(true)
    expect(scroller.dataset.state).toBe('paused')
    expect(env.pendingFrames()).toBe(0)
    rerender(<BracketBeam {...props} paused={false} />)
    expect(scroller.dataset.state).toBe('running')
  })

  it('reduced motion: one still frame, the path and trophy lit, no frames', () => {
    env = installFxEnv({ reducedMotion: true })
    const { container, scroller, svg } = mount()
    layOut(container)
    env.intersect(true)
    expect(scroller.dataset.state).toBe('still')
    expect(env.pendingFrames()).toBe(0)
    expect(container.querySelector('[data-dim]')).toBeNull()
    const trail = q<SVGPathElement>(svg, 'g[filter] > g > path')
    expect(trail.getAttribute('stroke-dashoffset')).toBe('0')
  })

  it('switches to the still frame live when reduced motion turns on', () => {
    env = installFxEnv()
    const { container, scroller } = mount()
    layOut(container)
    env.intersect(true)
    now = 0
    play(TL.fade - TL.still + 100)
    expect(container.querySelector('[data-dim]')).not.toBeNull()
    env.reduceMotion(true)
    expect(scroller.dataset.state).toBe('still')
    expect(container.querySelector('[data-dim]')).toBeNull()
  })

  it('is static without a champion: wires only, the loop settles', () => {
    env = installFxEnv()
    const { container, svg, scroller } = mount({ rounds: OPEN, champion: undefined })
    layOut(container)
    env.intersect(true)
    env.frame(16)
    expect(scroller.dataset.state).toBe('running')
    expect(env.pendingFrames()).toBe(0)
    expect(basePaths(svg)).toHaveLength(2)
    expect(container.querySelector('[data-match="champion"]')).toBeNull()
  })

  it('is a tab stop only while the bracket overflows', () => {
    env = installFxEnv()
    const { container, scroller } = mount()
    layOut(container, { scrollWidth: 1100, clientWidth: 360 })
    expect(scroller.tabIndex).toBe(0)
    layOut(container)
    expect(scroller.hasAttribute('tabindex')).toBe(false)
  })

  it('follows the beam while it overflows, until the viewer scrolls', () => {
    env = installFxEnv()
    const { container, scroller } = mount()
    const scroll = spyOn(scroller, 'scrollTo')
    layOut(container, { scrollWidth: 1100, clientWidth: 360 })
    env.intersect(true)
    now = 0
    play(TL.period - TL.still + 100) // the loop restarts: back to the first match
    expect(scroll).toHaveBeenCalled()
    // Our own scroll landing on its goal is not the viewer's.
    const [last] = scroll.mock.calls.at(-1) ?? []
    scroller.scrollLeft = (last as ScrollToOptions | undefined)?.left ?? 0
    scroller.dispatchEvent(new Event('scroll'))
    play(TL.start[0] ?? 0) // the first beam leaves: follow it
    const calls = scroll.mock.calls.length
    expect(calls).toBeGreaterThan(1)
    // The viewer scrolls the other way: we stop following for good.
    scroller.scrollLeft = 700
    scroller.dispatchEvent(new Event('scroll'))
    play(TL.period)
    expect(scroll.mock.calls.length).toBe(calls)
  })

  it('reduced motion scrolls an overflowing bracket to the trophy once', () => {
    env = installFxEnv({ reducedMotion: true })
    const { container, scroller } = mount()
    const scroll = spyOn(scroller, 'scrollTo')
    layOut(container, { scrollWidth: 1100, clientWidth: 360 })
    expect(scroll).toHaveBeenLastCalledWith({ left: 740, behavior: 'instant' })
  })

  it('re-measures once web fonts are ready', async () => {
    env = installFxEnv()
    let ready: () => void = () => {}
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: new Promise<void>((resolve) => (ready = resolve)) },
    })
    try {
      const { container, svg } = mount()
      layOut(container, { notify: false }) // boxes move, but no ResizeObserver report
      expect(basePaths(svg)[0]?.hasAttribute('d')).toBe(false)
      ready()
      await flushEffects()
      expect(basePaths(svg)[0]?.getAttribute('d')).toMatch(/^M220 76.5/)
    } finally {
      Reflect.deleteProperty(document, 'fonts')
    }
  })

  it('ignores fonts that load after unmount', async () => {
    env = installFxEnv()
    let ready: () => void = () => {}
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: new Promise<void>((resolve) => (ready = resolve)) },
    })
    try {
      const { unmount } = mount()
      unmount()
      ready()
      await flushEffects()
    } finally {
      Reflect.deleteProperty(document, 'fonts')
    }
  })

  it('cleans up on unmount: no frames, an empty SVG, nothing dimmed', () => {
    env = installFxEnv()
    const { container, svg, unmount, root } = mount()
    layOut(container, { scrollWidth: 1100, clientWidth: 360 })
    env.intersect(true)
    now = 0
    play(TL.fade - TL.still + 100)
    const rows = all(root, '[data-trail]')
    unmount()
    expect(env.pendingFrames()).toBe(0)
    expect(svg.childElementCount).toBe(0)
    expect(rows.some((row) => row.hasAttribute('data-dim'))).toBe(false)
  })

  it('builds its SVG once under StrictMode (the first mount is torn down)', () => {
    env = installFxEnv()
    const once = mount().svg.childElementCount
    env.restore()
    env = installFxEnv()
    const { container } = render(
      <StrictMode>
        <BracketBeam {...props} />
      </StrictMode>,
    )
    expect(q(container, 'svg[focusable]:not([viewBox])').childElementCount).toBe(once)
  })

  it('rebuilds the beams when the bracket data changes', () => {
    env = installFxEnv()
    const { rerender, container } = mount()
    rerender(<BracketBeam {...props} rounds={OPEN} champion="A" />)
    expect(all(container, '[data-trail]')).toHaveLength(0)
    expect(basePaths(q(container, 'svg[focusable]:not([viewBox])'))).toHaveLength(3)
  })
})

describe('BracketBeam (props)', () => {
  it('forwards the ref, merges className and passes native props through', () => {
    const ref = createRef<HTMLDivElement>()
    const { root } = mount({
      ref,
      className: 'max-w-xl',
      id: 'playoffs',
      'data-testid': 'bb',
    } as never)
    expect(ref.current).toBe(root as HTMLDivElement)
    expect(root.id).toBe('playoffs')
    expect(root.dataset.testid).toBe('bb')
    expect(root.className).toContain('max-w-xl')
    expect(root.hasAttribute('champion')).toBe(false)
  })

  it('merges a consumer style after its own custom properties', () => {
    const { root } = mount({ style: { marginTop: 4 } })
    expect(root.style.marginTop).toBe('4px')
    expect(root.style.getPropertyValue('--sk-bracket-beam-rounds')).toBe('3')
  })

  it('names the region from aria-label or aria-labelledby', () => {
    expect(mount({ 'aria-label': 'Playoffs' }).scroller.getAttribute('aria-label')).toBe('Playoffs')
    const { scroller } = mount({ 'aria-labelledby': 'title' })
    expect(scroller.getAttribute('aria-labelledby')).toBe('title')
    expect(scroller.hasAttribute('aria-label')).toBe(false)
  })

  it('localizes its labels', () => {
    const { container } = mount({
      championLabel: 'Campeón',
      trophyLabel: 'Trofeo',
      winnerLabel: 'ganador',
      seedLabel: 'cabeza de serie',
      scoreLabel: 'marcador',
    })
    expect(container.textContent).toContain('Campeón')
    expect(container.textContent).toContain('Trofeo')
    expect(container.textContent).toContain(', ganador')
    expect(q(container, '[data-match="0-0"] [data-row="1"]').textContent).toBe(
      'cabeza de serie 8Paper Tigersmarcador 0', // a 0 score is still read
    )
  })

  it('handles undecided matches, missing scores and no seeds', () => {
    const { container } = mount({ rounds: OPEN, champion: undefined })
    expect(all(container, '[data-winner]')).toHaveLength(1)
    expect(container.querySelector('.w-3')).toBeNull() // no seed column
    expect(q(container, '[data-match="1-0"]').textContent).toBe('ATBD')
    expect(container.textContent).not.toContain('Trophy')
  })

  it('renders no meta line without championMeta', () => {
    const { container } = mount({ championMeta: undefined })
    expect(q(container, '[data-match="champion"]').querySelectorAll('p')).toHaveLength(2)
  })

  it('has no axe violations in either theme', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <BracketBeam {...props} />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
