'use client'

import { useEffect, useRef } from 'react'
import { scrambleTextStyles } from './scramble-text.styles'

// DECISION(open): timing and alphabet are ported from the approved Q39 mockup and are not props in
// v1 — noise front over the first 30% of `duration`, locks spread over the last 82% with a ±5%
// jitter, a 120 ms accent "lock" edge, a 42–80 ms glyph period, a 64 ms clock cap.
const NOISE = '!<>-_\\/[]{}=+*^?#0123456789ABCDEF'
const FRONT = 0.3
const EDGE = 120
const MAX_STEP = 64
const REDUCE = '(prefers-reduced-motion: reduce)'

/**
 * mulberry32: a tiny seeded PRNG returning floats in [0, 1).
 * @internal
 */
export const mulberry32 = (seed: number) => {
  let a = seed | 0
  return (): number => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 32-bit FNV-1a hash — the default seed, so the same text always decodes the same way.
 * @internal
 */
export const hashText = (text: string): number => {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
  return h >>> 0
}

/**
 * The noise glyph a cell shows at step `k`: a pure function of its hash, so frames replay.
 * @internal
 */
export const noiseAt = (hash: number, k: number): string =>
  NOISE.charAt(Math.floor(mulberry32(hash ^ Math.imul(k + 1, 0x9e3779b1))() * NOISE.length))

/**
 * A run of `text`: one grapheme to scramble, or whitespace that stays plain text (and wraps).
 * @internal
 */
export interface GlyphPart {
  /** `true` for one grapheme to scramble; `false` for a whitespace run kept as plain text. */
  glyph: boolean
  /** The grapheme, or the whitespace run. */
  value: string
}

/**
 * Splits `text` into grapheme clusters (`Intl.Segmenter`, or code points where it is missing) so
 * emoji, flags and combining marks stay whole; consecutive whitespace merges into one text run.
 * @internal
 */
export function splitGlyphs(text: string): GlyphPart[] {
  const graphemes =
    typeof Intl.Segmenter === 'function'
      ? Array.from(
          new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
          (s) => s.segment,
        )
      : Array.from(text)
  const parts: GlyphPart[] = []
  for (const g of graphemes) {
    const prev = parts[parts.length - 1]
    if (!/^\s+$/.test(g)) parts.push({ glyph: true, value: g })
    else if (prev && !prev.glyph) prev.value += g
    else parts.push({ glyph: false, value: g })
  }
  return parts
}

type GlyphState = 'hidden' | 'noise' | 'lock' | 'done'

interface Cell {
  el: HTMLElement
  node: Text
  /** Clock ms when noise starts / when it locks to the real character. */
  start: number
  lock: number
  /** Ms between noise changes, and the hash that picks each noise glyph. */
  period: number
  hash: number
  state: GlyphState | ''
  shown: string
}

interface ScrambleGlyphsProps {
  text: string
  delay: number
  duration: number
  seed: number | undefined
}

/**
 * The client half of `ScrambleText`: the `aria-hidden` glyph layer. Its first render is the real
 * text (so hydration matches and no-JS sees it); on mount it decodes the glyphs out of seeded noise
 * with `requestAnimationFrame`, writing only `data-glyph` attributes and island-owned overlay text
 * nodes — React never re-renders per frame and its own nodes are never replaced. Rendered only by
 * `ScrambleText`.
 * @internal
 */
export function ScrambleGlyphs({ text, delay, duration, seed }: ScrambleGlyphsProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const layer = ref.current as HTMLSpanElement
    const glyphs = Array.from(layer.children) as HTMLElement[]
    if (duration <= 0 || glyphs.length === 0 || window.matchMedia(REDUCE).matches) {
      layer.setAttribute('data-state', 'done')
      return
    }

    const rand = mulberry32(seed ?? hashText(text))
    const begin = Math.max(0, delay)
    const end = begin + duration
    const last = glyphs.length - 1
    const cells: Cell[] = glyphs.map((el, i) => {
      const u = last > 0 ? i / last : 0
      const start = begin + u * duration * FRONT
      const target = begin + duration * 0.18 + u * duration * 0.82 + (rand() - 0.5) * duration * 0.1
      const node = document.createTextNode('')
      ;(el.lastElementChild as HTMLElement).append(node)
      return {
        el,
        node,
        start,
        lock: Math.min(end, Math.max(start + 70, target)),
        period: 42 + rand() * 38,
        hash: Math.floor(rand() * 4294967296),
        state: '',
        shown: '',
      }
    })

    const paint = (c: Cell, state: GlyphState, shown: string): void => {
      if (c.state !== state) {
        c.state = state
        c.el.setAttribute('data-glyph', state)
      }
      if (c.shown !== shown) {
        c.shown = shown
        c.node.nodeValue = shown
      }
    }
    /** Paints every cell at `clock`; true while any glyph is still decoding. */
    const draw = (clock: number): boolean => {
      let busy = false
      for (const c of cells) {
        if (clock >= c.lock) {
          paint(c, 'done', '')
          continue
        }
        busy = true
        if (clock < c.start) paint(c, 'hidden', '')
        else
          paint(
            c,
            clock >= c.lock - EDGE ? 'lock' : 'noise',
            noiseAt(c.hash, Math.floor((clock - c.start) / c.period)),
          )
      }
      return busy
    }

    let clock = 0
    let prev = -1
    let raf = 0
    const tick = (now: number): void => {
      // Capped step: a stalled or hidden tab resumes the decode instead of jumping to the end.
      clock += prev < 0 ? 0 : Math.min(MAX_STEP, Math.max(0, now - prev))
      prev = now
      if (draw(clock)) raf = requestAnimationFrame(tick)
      else layer.setAttribute('data-state', 'done')
    }
    layer.setAttribute('data-state', 'running')
    draw(0) // the pre-state lands with the mount, not a frame later
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      for (const c of cells) {
        c.el.removeAttribute('data-glyph')
        c.node.remove()
      }
      layer.removeAttribute('data-state')
    }
  }, [text, delay, duration, seed])

  const s = scrambleTextStyles()
  return (
    <span ref={ref} aria-hidden="true" data-sk-scramble-text="" className={s.glyphs()}>
      {splitGlyphs(text).map((part, i) =>
        part.glyph ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: positional glyphs of one string.
          <span key={i} className={s.glyph()}>
            {part.value}
            <span className={s.noise()} />
          </span>
        ) : (
          part.value
        ),
      )}
    </span>
  )
}
