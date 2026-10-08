import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { readFileSync } from 'node:fs'
import { act, render, screen } from '@testing-library/react'
import { createRef, Profiler } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { ScrambleText } from './index'
import { hashText, mulberry32, noiseAt, splitGlyphs } from './scramble-text.scramble'
import { scrambleTextStyles } from './scramble-text.styles'

const NOISE = '!<>-_\\/[]{}=+*^?#0123456789ABCDEF'

// Default every test to reduced motion, so a mount that doesn't opt into the decode schedules
// nothing (Counter's harness).
let mm: ReturnType<typeof spyOn>
beforeEach(() => {
  mm = spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
})
afterEach(() => mm.mockRestore())

/** Turn motion on and capture the rAF callback so frames can be stepped by hand. */
function mockRaf() {
  mm.mockReturnValue({ matches: false } as MediaQueryList)
  let cb: FrameRequestCallback | null = null
  let now = 0
  const raf = spyOn(globalThis, 'requestAnimationFrame').mockImplementation((fn) => {
    cb = fn
    return 7
  })
  const caf = spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})
  /** Calls the pending frame at timestamp `t`. */
  const frame = (t: number) =>
    act(() => {
      const fn = cb
      cb = null
      now = t
      fn?.(t)
    })
  return {
    raf,
    caf,
    frame,
    /** Runs 16 ms frames until `ms` more clock has passed (or the decode stops asking). */
    advance: (ms: number) => {
      const end = now + ms
      while (now < end && cb) frame(now + 16)
    },
    pending: () => cb !== null,
    restore: () => {
      raf.mockRestore()
      caf.mockRestore()
    },
  }
}

const layerOf = (root: HTMLElement) => root.querySelector('[data-sk-scramble-text]') as HTMLElement
const glyphsOf = (root: HTMLElement) => Array.from(layerOf(root).children) as HTMLElement[]
const statesOf = (root: HTMLElement) => glyphsOf(root).map((g) => g.getAttribute('data-glyph'))
const noiseOf = (root: HTMLElement) =>
  glyphsOf(root)
    .map((g) => g.lastElementChild?.textContent)
    .join('')

describe('ScrambleText', () => {
  it('server-renders the real text for AT and as the visible glyph layer', () => {
    const html = renderServer(<ScrambleText text="MATCH FOUND" />)
    expect(html.startsWith('<span')).toBe(true)
    expect(html).toContain('>MATCH FOUND</span>')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('data-sk-scramble-text=""')
    expect(html).not.toContain('data-glyph')
    expect(html).not.toContain('data-state')
    for (const as of ['p', 'div', 'strong', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const) {
      expect(renderServer(<ScrambleText as={as} text="GG" />).startsWith(`<${as}`)).toBe(true)
    }
  })

  it('splits the visible layer into glyph spans, keeping whitespace as plain text', () => {
    render(<ScrambleText text="MATCH FOUND" data-testid="s" />)
    const root = screen.getByTestId('s')
    const layer = layerOf(root)
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(glyphsOf(root)).toHaveLength(10)
    expect(glyphsOf(root).every((g) => g.tagName === 'SPAN')).toBe(true)
    expect(layer.textContent).toBe('MATCH FOUND')
    const label = root.firstElementChild as HTMLElement
    expect(label.textContent).toBe('MATCH FOUND')
    expect(label.classList.contains('sr-only')).toBe(true)
  })

  it('keeps grapheme clusters whole and merges whitespace runs', () => {
    expect(splitGlyphs('GG 🇯🇵  wp')).toEqual([
      { glyph: true, value: 'G' },
      { glyph: true, value: 'G' },
      { glyph: false, value: ' ' },
      { glyph: true, value: '🇯🇵' },
      { glyph: false, value: '  ' },
      { glyph: true, value: 'w' },
      { glyph: true, value: 'p' },
    ])
    expect(splitGlyphs(' a')).toEqual([
      { glyph: false, value: ' ' },
      { glyph: true, value: 'a' },
    ])
  })

  it('falls back to code points where Intl.Segmenter is missing', () => {
    const intl = Intl as { Segmenter?: unknown }
    const Segmenter = intl.Segmenter
    intl.Segmenter = undefined
    try {
      expect(splitGlyphs('a😀 b').map((p) => p.value)).toEqual(['a', '😀', ' ', 'b'])
    } finally {
      intl.Segmenter = Segmenter
    }
  })

  it('respects prefers-reduced-motion: final text, no glyph states, no frames', () => {
    const raf = spyOn(globalThis, 'requestAnimationFrame')
    render(<ScrambleText text="MATCH FOUND" delay={300} data-testid="s" />)
    const root = screen.getByTestId('s')
    expect(raf).not.toHaveBeenCalled()
    expect(statesOf(root).every((s) => s === null)).toBe(true)
    expect(layerOf(root).getAttribute('data-state')).toBe('done')
    expect(layerOf(root).textContent).toBe('MATCH FOUND')
    raf.mockRestore()
  })

  it('decodes glyphs through noise and lock, then lands exactly on the real text', () => {
    const r = mockRaf()
    render(<ScrambleText text="AB CD" duration={400} seed={1} data-testid="s" />)
    const root = screen.getByTestId('s')
    const layer = layerOf(root)
    // The mount paints the pre-state: the first glyph is already decoding, the rest are blank.
    expect(layer.getAttribute('data-state')).toBe('running')
    expect(statesOf(root)[0]).toBe('lock')
    expect(statesOf(root).slice(1)).toEqual(['hidden', 'hidden', 'hidden'])

    const seen = new Set<string | null>()
    let noise = ''
    while (r.pending()) {
      r.advance(16)
      for (const s of statesOf(root)) seen.add(s)
      noise += noiseOf(root)
    }
    expect([...seen].sort()).toEqual(['done', 'hidden', 'lock', 'noise'])
    expect(noise.length).toBeGreaterThan(0)
    expect([...noise].every((ch) => NOISE.includes(ch))).toBe(true)

    expect(statesOf(root)).toEqual(['done', 'done', 'done', 'done'])
    expect(noiseOf(root)).toBe('')
    expect(layer.getAttribute('data-state')).toBe('done')
    expect(layer.textContent).toBe('AB CD')
    r.restore()
  })

  it('finishes at delay + duration and holds every glyph blank during the delay', () => {
    const r = mockRaf()
    render(<ScrambleText text="GLHF" delay={300} duration={200} data-testid="s" />)
    const root = screen.getByTestId('s')
    r.frame(0) // first frame starts the clock
    r.advance(288)
    expect(statesOf(root)).toEqual(['hidden', 'hidden', 'hidden', 'hidden'])
    expect(r.pending()).toBe(true)
    // The last glyph locks in [490, 500] (±5% jitter, clamped to delay + duration).
    r.advance(192) // clock 480
    expect(r.pending()).toBe(true)
    expect(statesOf(root).at(-1)).not.toBe('done')
    r.advance(32) // clock 512
    expect(r.pending()).toBe(false)
    expect(statesOf(root)).toEqual(['done', 'done', 'done', 'done'])
    r.restore()
  })

  it('treats a negative delay as no delay', () => {
    const r = mockRaf()
    render(<ScrambleText text="X" delay={-500} duration={100} data-testid="s" />)
    expect(statesOf(screen.getByTestId('s'))).toEqual(['lock'])
    r.restore()
  })

  it('is deterministic per seed', () => {
    const run = (seed: number | undefined, text = 'VICTORY ROYALE') => {
      const r = mockRaf()
      const { unmount } = render(
        <ScrambleText text={text} duration={500} seed={seed} data-testid="s" />,
      )
      const frames: string[] = []
      while (r.pending()) {
        r.advance(16)
        frames.push(noiseOf(screen.getByTestId('s')))
      }
      unmount()
      r.restore()
      return frames.join('|')
    }
    expect(run(7)).toBe(run(7))
    expect(run(7)).not.toBe(run(8))
    // No seed → derived from the text.
    expect(run(undefined)).toBe(run(hashText('VICTORY ROYALE')))
  })

  it('seeds a reproducible PRNG and noise picker', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const xs = Array.from({ length: 5 }, () => a())
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()))
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true)
    expect(hashText('')).toBe(0x811c9dc5)
    expect(hashText('ab')).not.toBe(hashText('ba'))
    expect(noiseAt(123, 4)).toBe(noiseAt(123, 4))
    expect(NOISE.includes(noiseAt(123, 4))).toBe(true)
  })

  it('shows the text immediately when duration <= 0 or the text is empty', () => {
    const r = mockRaf()
    render(<ScrambleText text="GG" duration={0} data-testid="zero" />)
    render(<ScrambleText text="" data-testid="empty" />)
    expect(r.raf).not.toHaveBeenCalled()
    for (const id of ['zero', 'empty']) {
      const root = screen.getByTestId(id)
      expect(layerOf(root).getAttribute('data-state')).toBe('done')
      expect(statesOf(root).every((s) => s === null)).toBe(true)
    }
    r.restore()
  })

  it('caps each frame step at 64 ms and never runs the clock backwards', () => {
    const r = mockRaf()
    render(<ScrambleText text="AB" duration={300} data-testid="s" />)
    const root = screen.getByTestId('s')
    r.frame(1000)
    r.frame(60_000) // a stalled tab: the clock moves 64 ms, not 59 s
    r.frame(59_000) // a timestamp going backwards: no movement
    expect(r.pending()).toBe(true)
    expect(statesOf(root)).not.toEqual(['done', 'done'])
    r.restore()
  })

  it('paints frames without re-rendering React', () => {
    const r = mockRaf()
    let commits = 0
    render(
      <Profiler id="s" onRender={() => commits++}>
        <ScrambleText text="MATCH FOUND" duration={300} data-testid="s" />
      </Profiler>,
    )
    const afterMount = commits
    while (r.pending()) r.advance(16)
    expect(layerOf(screen.getByTestId('s')).getAttribute('data-state')).toBe('done')
    expect(commits).toBe(afterMount)
    r.restore()
  })

  it('restarts on a prop change and cleans up its nodes and attributes', () => {
    const r = mockRaf()
    const { rerender } = render(<ScrambleText text="ABCD" duration={400} data-testid="s" />)
    const root = screen.getByTestId('s')
    r.advance(64)
    expect(noiseOf(root).length).toBeGreaterThan(0)
    const before = glyphsOf(root)
    rerender(<ScrambleText text="WXYZ" duration={400} data-testid="s" />)
    expect(r.caf).toHaveBeenCalledWith(7)
    // Same spans reused by React; the new run painted its own pre-state on them.
    expect(glyphsOf(root).every((g, i) => g === before[i])).toBe(true)
    expect(glyphsOf(root).every((g) => g.lastElementChild?.childNodes.length === 1)).toBe(true)
    expect(layerOf(root).getAttribute('data-state')).toBe('running')
    while (r.pending()) r.advance(16)
    expect(layerOf(root).textContent).toBe('WXYZ')
    expect(statesOf(root)).toEqual(['done', 'done', 'done', 'done'])
    r.restore()
  })

  it('cancels the frame and removes island-owned nodes on unmount', () => {
    const r = mockRaf()
    const { unmount } = render(<ScrambleText text="GG" duration={400} data-testid="s" />)
    const glyphs = glyphsOf(screen.getByTestId('s'))
    unmount()
    expect(r.caf).toHaveBeenCalledWith(7)
    expect(glyphs.every((g) => !g.hasAttribute('data-glyph'))).toBe(true)
    expect(glyphs.every((g) => g.lastElementChild?.childNodes.length === 0)).toBe(true)
    r.restore()
  })

  it('names a heading by its real text only', () => {
    render(<ScrambleText as="h2" text="MATCH FOUND" />)
    expect(screen.getByRole('heading', { level: 2, name: 'MATCH FOUND' })).toBeDefined()
  })

  it('does not leak its props, passes native props and merges className last', () => {
    render(
      <ScrambleText
        text="GG"
        as="p"
        delay={10}
        duration={20}
        seed={3}
        id="x"
        title="tip"
        className="text-3xl"
        data-testid="s"
      />,
    )
    const el = screen.getByTestId('s')
    for (const attr of ['text', 'as', 'delay', 'duration', 'seed']) {
      expect(el.hasAttribute(attr)).toBe(false)
    }
    expect(el.id).toBe('x')
    expect(el.getAttribute('title')).toBe('tip')
    expect(el.className).toBe('text-3xl')
  })

  it('forwards ref to the rendered element', () => {
    const span = createRef<HTMLElement>()
    render(<ScrambleText ref={span} text="GG" />)
    expect(span.current).toBeInstanceOf(HTMLSpanElement)
    const h1 = createRef<HTMLElement>()
    render(<ScrambleText ref={h1} as="h1" text="GG" />)
    expect(h1.current).toBeInstanceOf(HTMLHeadingElement)
  })

  it('maps glyph states to literal utilities with reduced-motion and forced-colors guards', () => {
    const s = scrambleTextStyles()
    const glyph = s.glyph().split(' ')
    expect(glyph).toContain('data-[glyph=noise]:text-transparent')
    expect(glyph).toContain('data-[glyph=done]:animate-scramble-text-settle')
    expect(glyph).toContain('motion-reduce:data-[glyph=done]:animate-none')
    const noise = s.noise().split(' ')
    expect(noise).toContain('invisible')
    expect(noise).toContain('group-data-[glyph=noise]:text-text-faint')
    expect(noise).toContain('group-data-[glyph=lock]:text-accent')
    expect(noise).toContain('forced-colors:hidden')
    expect(s.label()).toBe('sr-only select-none')
  })

  it('ships its afterglow keyframe and utility in theme.css', () => {
    const css = readFileSync(new URL('../../styles/theme.css', import.meta.url), 'utf8')
    expect(css).toContain('@keyframes sk-scramble-text-settle')
    expect(css).toContain('@utility animate-scramble-text-settle')
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(<ScrambleText as="h1" text="MATCH FOUND" delay={60} />)
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <ScrambleText as="h2" text="MATCH FOUND" />
          <ScrambleText text="LOBBY 4471 · CUSTOM" delay={400} />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
