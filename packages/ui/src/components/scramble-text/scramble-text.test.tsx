import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { readFileSync } from 'node:fs'
import { act, render, screen } from '@testing-library/react'
import { createRef, Profiler } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { ScrambleText, type ScrambleTextProps } from './index'
import { hashText, mulberry32, noiseAt, noisePool, splitGlyphs } from './scramble-text.scramble'
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
const overlayOf = (root: HTMLElement) => layerOf(root).firstElementChild as HTMLElement
const textOf = (root: HTMLElement) => layerOf(root).lastElementChild as HTMLElement
const cellsOf = (root: HTMLElement) => Array.from(overlayOf(root).children) as HTMLElement[]
const statesOf = (root: HTMLElement) => cellsOf(root).map((c) => c.getAttribute('data-glyph'))
const drawnOf = (root: HTMLElement) => cellsOf(root).map((c) => c.textContent)
/** The noise currently drawn (cells in `noise` / `lock`). */
const noiseOf = (root: HTMLElement) =>
  cellsOf(root)
    .filter((c) => /noise|lock/.test(c.getAttribute('data-glyph') ?? ''))
    .map((c) => c.textContent)
    .join('')
const varsOf = (cell: HTMLElement) =>
  ['x', 'y', 'w', 'h'].map((k) => cell.style.getPropertyValue(`--sk-scramble-text-${k}`))

describe('ScrambleText', () => {
  it('server-renders the real text, unsplit, for AT and as the visible line', () => {
    const html = renderServer(<ScrambleText text="MATCH FOUND" />)
    expect(html.startsWith('<span')).toBe(true)
    // Once in the sr-only label, once as the visible line — one text node each, never split.
    expect(html.split('>MATCH FOUND</span>')).toHaveLength(3)
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('data-sk-scramble-text=""')
    expect(html).not.toContain('data-glyph')
    expect(html).not.toContain('data-state')
    for (const as of ['p', 'div', 'strong', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const) {
      expect(renderServer(<ScrambleText as={as} text="GG" />).startsWith(`<${as}`)).toBe(true)
    }
  })

  it('renders the visible line as one text node plus an empty overlay', () => {
    render(<ScrambleText text="MATCH FOUND" data-testid="s" />)
    const root = screen.getByTestId('s')
    const layer = layerOf(root)
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(layer.children).toHaveLength(2)
    expect(overlayOf(root).childNodes).toHaveLength(0)
    expect(textOf(root).childNodes).toHaveLength(1)
    expect(textOf(root).firstChild?.nodeValue).toBe('MATCH FOUND')
    const label = root.firstElementChild as HTMLElement
    expect(label.textContent).toBe('MATCH FOUND')
    expect(label.classList.contains('sr-only')).toBe(true)
  })

  it('splits graphemes with their offsets, keeping clusters whole and skipping whitespace', () => {
    expect(splitGlyphs('GG 🇯🇵  wp')).toEqual([
      { value: 'G', index: 0 },
      { value: 'G', index: 1 },
      { value: '🇯🇵', index: 3 },
      { value: 'w', index: 9 },
      { value: 'p', index: 10 },
    ])
    expect(splitGlyphs(' \n ')).toEqual([])
  })

  it('falls back to code points where Intl.Segmenter is missing', () => {
    const intl = Intl as { Segmenter?: unknown }
    const Segmenter = intl.Segmenter
    intl.Segmenter = undefined
    try {
      expect(splitGlyphs('a😀 b')).toEqual([
        { value: 'a', index: 0 },
        { value: '😀', index: 1 },
        { value: 'b', index: 4 },
      ])
    } finally {
      intl.Segmenter = Segmenter
    }
  })

  it('respects prefers-reduced-motion: final text, no cells, no frames', () => {
    const raf = spyOn(globalThis, 'requestAnimationFrame')
    render(<ScrambleText text="MATCH FOUND" delay={300} data-testid="s" />)
    const root = screen.getByTestId('s')
    expect(raf).not.toHaveBeenCalled()
    expect(cellsOf(root)).toHaveLength(0)
    expect(layerOf(root).getAttribute('data-state')).toBe('done')
    expect(textOf(root).textContent).toBe('MATCH FOUND')
    raf.mockRestore()
  })

  it('decodes cells through noise and lock, then removes them and shows the real text', () => {
    const r = mockRaf()
    render(<ScrambleText text="AB CD" duration={400} seed={1} data-testid="s" />)
    const root = screen.getByTestId('s')
    const layer = layerOf(root)
    // The mount hides the real text (`running`) and paints the pre-state: one cell per glyph, the
    // first already decoding, the rest blank.
    expect(layer.getAttribute('data-state')).toBe('running')
    expect(cellsOf(root)).toHaveLength(4)
    expect(statesOf(root)[0]).toBe('lock')
    expect(statesOf(root).slice(1)).toEqual(['hidden', 'hidden', 'hidden'])
    expect(drawnOf(root).slice(1)).toEqual(['', '', ''])

    const seen = new Set<string | null>()
    let noise = ''
    let tail = false
    while (r.pending()) {
      r.advance(16)
      for (const s of statesOf(root)) seen.add(s)
      noise += noiseOf(root)
      if (cellsOf(root).length && statesOf(root).every((s) => s === 'done')) {
        // The afterglow tail: every cell draws its real glyph while the real text stays hidden.
        tail = true
        expect(drawnOf(root)).toEqual(['A', 'B', 'C', 'D'])
        expect(layer.getAttribute('data-state')).toBe('running')
      }
    }
    expect(tail).toBe(true)
    expect([...seen].sort()).toEqual(['done', 'hidden', 'lock', 'noise'])
    expect(noise.length).toBeGreaterThan(0)
    expect([...noise].every((ch) => NOISE.includes(ch))).toBe(true)

    // Settled: back to the base final frame — no cell, no `data-glyph`, nothing left to replay.
    expect(cellsOf(root)).toHaveLength(0)
    expect(root.querySelector('[data-glyph]')).toBeNull()
    expect(layer.getAttribute('data-state')).toBe('done')
    expect(textOf(root).textContent).toBe('AB CD')
  })

  it('locks the last glyph at delay + duration, holds blank during the delay, settles 600 ms later', () => {
    const r = mockRaf()
    render(<ScrambleText text="GLHF" delay={300} duration={200} data-testid="s" />)
    const root = screen.getByTestId('s')
    r.frame(0) // first frame starts the clock
    r.advance(288)
    expect(statesOf(root)).toEqual(['hidden', 'hidden', 'hidden', 'hidden'])
    // The last glyph locks in [490, 500] (±5% jitter, clamped to delay + duration).
    r.advance(192) // clock 480
    expect(statesOf(root).at(-1)).not.toBe('done')
    r.advance(32) // clock 512
    expect(statesOf(root)).toEqual(['done', 'done', 'done', 'done'])
    expect(r.pending()).toBe(true) // the afterglow tail
    r.advance(560) // clock 1072
    expect(r.pending()).toBe(true)
    r.advance(48) // clock 1120 > last lock + 600
    expect(r.pending()).toBe(false)
    expect(cellsOf(root)).toHaveLength(0)
    expect(layerOf(root).getAttribute('data-state')).toBe('done')
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
    expect(noiseAt(123, 4, '!')).toBe('!')
  })

  it('picks noise no wider than the cell, never fewer than the four narrowest', () => {
    // Width = 1 + alphabet position: '!' is the narrowest (1), 'F' the widest (34).
    const widths = Array.from(NOISE, (_, i) => i + 1)
    expect(noisePool(100, widths)).toBe(NOISE) // a wide cell takes the whole alphabet
    expect(noisePool(10, widths)).toBe(NOISE.slice(0, 11)) // ≤ 1.1 × 10
    expect(noisePool(2, widths)).toBe('!<>-') // a narrow `i` or `.`: the four narrowest
    expect(
      noisePool(
        0,
        Array.from(NOISE, () => 0),
      ),
    ).toBe(NOISE) // nothing measured (no layout)
  })

  it('places each cell over its glyph and draws only noise that fits it', () => {
    const r = mockRaf()
    // Layout: the overlay sits at (10, 4); glyph i of "AiB" spans [20 + 12i, …), 'i' is 3 px wide;
    // the alphabet measures 1 px per position ('!' = 1 … 'F' = 34); everything is scaled ×2.
    const rect = (left: number, top: number, width: number, height: number) =>
      ({
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
      }) as DOMRect
    const el = spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      if (this.hasAttribute('data-sk-scramble-text') || this.className.includes('relative'))
        return rect(10, 4, 0, 40)
      if (this.childElementCount === 0 && this.textContent?.length === 1)
        return rect(0, 0, 2 * (NOISE.indexOf(this.textContent) + 1), 40)
      return rect(20, 4, 72, 40) // the real text
    })
    const rg = spyOn(Range.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Range,
    ) {
      const i = this.startOffset
      return rect(20 + 24 * i, 6, i === 1 ? 6 : 24, 40)
    })
    const ow = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')
    const oh = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get: () => 36,
    })
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => 20,
    })
    try {
      render(<ScrambleText text="AiB" duration={600} data-testid="s" />)
      const root = screen.getByTestId('s')
      const cells = cellsOf(root)
      // Layout coordinates: (glyph − overlay) / scale.
      expect(varsOf(cells[0] as HTMLElement)).toEqual(['5px', '1px', '12px', '20px'])
      expect(varsOf(cells[1] as HTMLElement)).toEqual(['17px', '1px', '3px', '20px'])
      expect(varsOf(cells[2] as HTMLElement)).toEqual(['29px', '1px', '12px', '20px'])
      // The probe used to measure the alphabet is gone.
      expect(cells).toHaveLength(3)
      const narrow = new Set<string>()
      while (r.pending()) {
        r.advance(16)
        const c = cellsOf(root)[1]
        if (c && /noise|lock/.test(c.getAttribute('data-glyph') ?? ''))
          narrow.add(c.textContent ?? '')
      }
      expect(narrow.size).toBeGreaterThan(0)
      expect([...narrow].every((ch) => '!<>-'.includes(ch))).toBe(true)
    } finally {
      el.mockRestore()
      rg.mockRestore()
      if (ow) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', ow)
      if (oh) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', oh)
      r.restore()
    }
  })

  it('re-measures on a resize or a web font arriving, and stops listening once settled', () => {
    const r = mockRaf()
    const fonts = new EventTarget()
    Object.defineProperty(document, 'fonts', { configurable: true, value: fonts })
    let left = 30
    const rg = spyOn(Range.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ left, top: 0, width: 10, height: 20 }) as DOMRect,
    )
    try {
      render(<ScrambleText text="GG" duration={300} data-testid="s" />)
      const cell = () => cellsOf(screen.getByTestId('s'))[0] as HTMLElement
      expect(varsOf(cell())[0]).toBe('30px')
      left = 50
      window.dispatchEvent(new Event('resize'))
      expect(varsOf(cell())[0]).toBe('50px')
      left = 70
      fonts.dispatchEvent(new Event('loadingdone'))
      expect(varsOf(cell())[0]).toBe('70px')
      while (r.pending()) r.advance(16)
      const calls = rg.mock.calls.length
      window.dispatchEvent(new Event('resize'))
      fonts.dispatchEvent(new Event('loadingdone'))
      expect(rg.mock.calls.length).toBe(calls)
    } finally {
      rg.mockRestore()
      delete (document as { fonts?: unknown }).fonts
      r.restore()
    }
  })

  it('shows the text immediately when duration <= 0, the text is blank, or there is no layout box', () => {
    const r = mockRaf()
    render(<ScrambleText text="GG" duration={0} data-testid="zero" />)
    render(<ScrambleText text="" data-testid="empty" />)
    render(<ScrambleText text="   " data-testid="blank" />)
    const rects = spyOn(Element.prototype, 'getClientRects').mockReturnValue(
      [] as unknown as DOMRectList,
    )
    render(<ScrambleText text="GG" data-testid="nobox" />) // e.g. inside a `display: none` panel
    rects.mockRestore()
    expect(r.raf).not.toHaveBeenCalled()
    for (const id of ['zero', 'empty', 'blank', 'nobox']) {
      const root = screen.getByTestId(id)
      expect(layerOf(root).getAttribute('data-state')).toBe('done')
      expect(cellsOf(root)).toHaveLength(0)
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

  it('restarts on a prop change and cleans up its cells', () => {
    const r = mockRaf()
    const { rerender } = render(<ScrambleText text="ABCD" duration={400} data-testid="s" />)
    const root = screen.getByTestId('s')
    r.advance(64)
    expect(noiseOf(root).length).toBeGreaterThan(0)
    const before = cellsOf(root)
    const text = textOf(root)
    rerender(<ScrambleText text="WXYZ" duration={400} data-testid="s" />)
    expect(r.caf).toHaveBeenCalledWith(7)
    // The old run's cells are gone; the new run made its own and painted its pre-state.
    expect(before.every((c) => !c.isConnected)).toBe(true)
    expect(cellsOf(root)).toHaveLength(4)
    expect(textOf(root)).toBe(text)
    expect(layerOf(root).getAttribute('data-state')).toBe('running')
    while (r.pending()) r.advance(16)
    expect(textOf(root).textContent).toBe('WXYZ')
    expect(cellsOf(root)).toHaveLength(0)
    r.restore()
  })

  it('cancels the frame and removes its cells and listeners on unmount', () => {
    const r = mockRaf()
    const off = spyOn(window, 'removeEventListener')
    const { unmount } = render(<ScrambleText text="GG" duration={400} data-testid="s" />)
    const overlay = overlayOf(screen.getByTestId('s'))
    expect(overlay.children).toHaveLength(2)
    unmount()
    expect(r.caf).toHaveBeenCalledWith(7)
    expect(overlay.children).toHaveLength(0)
    expect(off.mock.calls.some(([type]) => type === 'resize')).toBe(true)
    off.mockRestore()
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

  it('takes its content only from `text`', () => {
    // @ts-expect-error — `children` is not a prop: `text` is the content.
    const kids: ScrambleTextProps = { text: 'GG', children: 'x' }
    // @ts-expect-error — nor is `dangerouslySetInnerHTML` (React would throw with both).
    const html: ScrambleTextProps = { text: 'GG', dangerouslySetInnerHTML: { __html: 'x' } }
    expect([kids.text, html.text]).toEqual(['GG', 'GG'])
  })

  it('forwards ref to the rendered element', () => {
    const span = createRef<HTMLElement>()
    render(<ScrambleText ref={span} text="GG" />)
    expect(span.current).toBeInstanceOf(HTMLSpanElement)
    const h1 = createRef<HTMLElement>()
    render(<ScrambleText ref={h1} as="h1" text="GG" />)
    expect(h1.current).toBeInstanceOf(HTMLHeadingElement)
  })

  it('maps states to literal utilities: visibility hiding, own fill, reduced-motion guard', () => {
    const s = scrambleTextStyles()
    // The real text is hidden with visibility (not color), so a parent's gradient fill,
    // text-shadow or text-stroke can't show it during the decode.
    expect(s.text()).toBe('group-data-[state=running]/scramble-text:invisible')
    expect(s.glyphs().split(' ')).toContain('group/scramble-text')
    const cell = s.cell().split(' ')
    expect(cell).toContain('[-webkit-text-fill-color:currentColor]')
    expect(cell).toContain('data-[glyph=noise]:text-text-faint')
    expect(cell).toContain('data-[glyph=lock]:text-accent')
    expect(cell).toContain('data-[glyph=done]:animate-scramble-text-settle')
    expect(cell).toContain('motion-reduce:data-[glyph=done]:animate-none')
    expect(cell).toContain('left-(--sk-scramble-text-x)')
    expect(s.overlay().split(' ')).toContain('relative')
    expect(s.label()).toBe('sr-only select-none')
  })

  it('ships its afterglow keyframe and utility in theme.css', () => {
    const css = readFileSync(new URL('../../styles/theme.css', import.meta.url), 'utf8')
    expect(css).toContain('@keyframes sk-scramble-text-settle')
    expect(css).toContain('@utility animate-scramble-text-settle')
    expect(css).toContain('animation: sk-scramble-text-settle 600ms')
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(<ScrambleText as="h1" text="MATCH FOUND 🇯🇵 नमस्ते" delay={60} />)
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
