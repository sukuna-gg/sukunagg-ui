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
/** The afterglow's length — keep in step with `animate-scramble-text-settle` (scripts/motion). */
const SETTLE = 600
/** A noise glyph may be this much wider than the glyph it covers… */
const FIT = 1.1
/** …but every cell can always pick from at least this many (the alphabet's narrowest). */
const MIN_POOL = 4
const REDUCE = '(prefers-reduced-motion: reduce)'
/** The computed properties that change how wide the noise alphabet sets: the width-cache key. */
const FONT = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'font-stretch',
  'font-variant-caps',
  'font-variant-numeric',
  'font-feature-settings',
  'font-variation-settings',
  'letter-spacing',
  'text-transform',
]
/** A fully transparent computed color: `transparent`, `rgba(…, 0)` or `…/ 0)`. */
const CLEAR = /^transparent$|^rgba\((?:[^,]+,){3}\s*0(?:\.0*)?\)$|\/\s*0(?:\.0*)?%?\s*\)$/

/**
 * The noise alphabet's measured widths (layout px, alphabet order) per computed font, so the probe
 * runs once per font rather than once per instance and resize. Emptied when a web font arrives.
 * @internal
 */
export const alphabetWidths = new Map<string, number[]>()
/** The `loadingdone` event that last emptied {@link alphabetWidths} (every running line hears it). */
let refonted: Event | undefined

/**
 * Whether glyphs drawn in the inherited paint would be invisible: a fully transparent `color` (the
 * `bg-clip-text text-transparent` gradient pattern) and no text-stroke to draw them instead.
 * @internal
 */
export const isClearFill = (color: string, strokeWidth: string): boolean =>
  CLEAR.test(color) && !(Number.parseFloat(strokeWidth) > 0)

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
 * The noise glyph a cell shows at step `k`, picked from its `pool`: a pure function of its hash, so
 * frames replay.
 * @internal
 */
export const noiseAt = (hash: number, k: number, pool: string = NOISE): string =>
  pool.charAt(Math.floor(mulberry32(hash ^ Math.imul(k + 1, 0x9e3779b1))() * pool.length))

/**
 * The noise characters a cell `width` px wide may show, given the alphabet's measured `widths` (one
 * per character, in alphabet order): those no wider than {@link FIT}× the cell, and never fewer than
 * the {@link MIN_POOL} narrowest — so a wide `#` never spills over a narrow `i` into its neighbours.
 * @internal
 */
export function noisePool(width: number, widths: readonly number[]): string {
  const floor = [...widths].sort((a, b) => a - b)[MIN_POOL - 1] as number
  const limit = Math.max(width * FIT, floor) + 0.01
  let pool = ''
  for (let i = 0; i < NOISE.length; i++) if ((widths[i] as number) <= limit) pool += NOISE[i]
  return pool
}

/**
 * One grapheme of `text` to scramble, with its UTF-16 offset in the string.
 * @internal
 */
export interface Glyph {
  /** The grapheme cluster. */
  value: string
  /** Its UTF-16 offset in `text` (a Range offset into the real text node). */
  index: number
}

/**
 * Splits `text` into grapheme clusters (`Intl.Segmenter`, or code points where it is missing) so
 * emoji, flags and combining marks stay whole, and drops whitespace (it is never drawn). Runs only
 * in the browser, inside the island's effect — the server and the first render never split, so the
 * runtime's Unicode version can't cause a hydration mismatch.
 * @internal
 */
export function splitGlyphs(text: string): Glyph[] {
  const graphemes: { segment: string; index: number }[] = []
  if (typeof Intl.Segmenter === 'function') {
    graphemes.push(...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text))
  } else {
    let index = 0
    for (const segment of text) {
      graphemes.push({ segment, index })
      index += segment.length
    }
  }
  return graphemes
    .filter((g) => !/^\s+$/.test(g.segment))
    .map((g) => ({ value: g.segment, index: g.index }))
}

type GlyphState = 'hidden' | 'noise' | 'lock' | 'done'

interface Cell {
  el: HTMLElement
  node: Text
  glyph: Glyph
  /** Clock ms when noise starts / when it locks to the real character. */
  start: number
  lock: number
  /** Ms between noise changes, and the hash that picks each noise glyph from `pool`. */
  period: number
  hash: number
  pool: string
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
 * An ancestor's `transform: scale`, from a rendered size `a` and its layout size `b`
 * (`offsetWidth`/`offsetHeight`, which are whole pixels) — 1 when either has no size or they differ
 * by no more than that rounding, so an unscaled line isn't skewed by it.
 */
const ratio = (a: number, b: number): number => (a > 0 && b > 0 && Math.abs(a - b) > 1 ? a / b : 1)

/**
 * The client half of `ScrambleText`: the `aria-hidden` visible line. It renders the real text as
 * one unsplit text node (so the line at rest — server, no-JS, reduced motion, finished — is exactly
 * plain text, kerning included, and hydration always matches) plus an empty overlay. On mount it
 * hides the real text, measures each grapheme's box with a `Range`, and decodes cells it creates in
 * the overlay out of seeded noise with `requestAnimationFrame` — React never re-renders per frame
 * and its own nodes are never touched beyond `data-state` on the layer. When the last afterglow
 * ends it removes every cell and shows the real text again. Rendered only by `ScrambleText`.
 * @internal
 */
export function ScrambleGlyphs({ text, delay, duration, seed }: ScrambleGlyphsProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const layer = ref.current as HTMLSpanElement
    const overlay = layer.firstElementChild as HTMLElement
    const real = layer.lastElementChild as HTMLElement
    const glyphs = splitGlyphs(text)
    const motion = window.matchMedia(REDUCE)
    if (
      duration <= 0 ||
      glyphs.length === 0 ||
      // No layout box (a `display: none` ancestor): nothing to see, nothing to measure.
      layer.getClientRects().length === 0 ||
      motion.matches
    ) {
      layer.setAttribute('data-state', 'done')
      return
    }

    const s = scrambleTextStyles()
    const node = real.firstChild as Text
    const rand = mulberry32(seed ?? hashText(text))
    const begin = Math.max(0, delay)
    const end = begin + duration
    const last = glyphs.length - 1
    const cells: Cell[] = glyphs.map((glyph, i) => {
      const u = last > 0 ? i / last : 0
      const start = begin + u * duration * FRONT
      const target = begin + duration * 0.18 + u * duration * 0.82 + (rand() - 0.5) * duration * 0.1
      const lock = Math.min(end, Math.max(start + 70, target))
      const el = document.createElement('span')
      el.className = s.cell()
      const shown = document.createTextNode('')
      el.append(shown)
      overlay.append(el)
      return {
        el,
        node: shown,
        glyph,
        start,
        lock,
        period: 42 + rand() * 38,
        hash: Math.floor(rand() * 4294967296),
        pool: NOISE,
        state: '',
        shown: '',
      }
    })

    const fonts = document.fonts as FontFaceSet | undefined

    /**
     * Places every cell over its real glyph and picks its noise pool by width. Positions are taken
     * relative to the overlay and divided by any ancestor scale, so they are layout coordinates.
     * Every read comes before any write (one layout per instance), and the alphabet is probed only
     * on a width-cache miss. Runs at the start, and again on a resize or a web font arriving.
     */
    const measure = (): void => {
      const origin = overlay.getBoundingClientRect()
      const box = real.getBoundingClientRect()
      const sx = ratio(box.width, real.offsetWidth)
      const sy = ratio(box.height, real.offsetHeight)
      const range = document.createRange()
      const rects = cells.map((c) => {
        range.setStart(node, c.glyph.index)
        range.setEnd(node, c.glyph.index + c.glyph.value.length)
        return range.getBoundingClientRect()
      })
      const cs = getComputedStyle(overlay)
      // Under a transparent `color` a settled cell would fade out with the inherited paint (the
      // real text stays hidden until the last afterglow ends), so it draws in `--sk-text` instead.
      const clear = isClearFill(cs.color, cs.getPropertyValue('-webkit-text-stroke-width'))
      const key = FONT.map((p) => cs.getPropertyValue(p)).join('|')
      let widths = alphabetWidths.get(key)
      if (!widths) {
        const probe = document.createElement('span')
        probe.className = s.probe()
        for (const ch of NOISE) {
          const span = document.createElement('span')
          span.textContent = ch
          probe.append(span)
        }
        overlay.append(probe)
        widths = Array.from(probe.children, (c) => c.getBoundingClientRect().width / sx)
        probe.remove()
        // A font still loading may be measured as its fallback: use it, but don't keep it.
        if (fonts?.status !== 'loading') alphabetWidths.set(key, widths)
      }
      cells.forEach((c, i) => {
        const r = rects[i] as DOMRect
        const w = r.width / sx
        c.el.style.setProperty('--sk-scramble-text-x', `${(r.left - origin.left) / sx}px`)
        c.el.style.setProperty('--sk-scramble-text-y', `${(r.top - origin.top) / sy}px`)
        c.el.style.setProperty('--sk-scramble-text-w', `${w}px`)
        c.el.style.setProperty('--sk-scramble-text-h', `${r.height / sy}px`)
        c.el.toggleAttribute('data-clear', clear)
        c.pool = noisePool(w, widths)
      })
    }
    /** A web font arrived: any cached width may be a fallback's — the first line to hear it empties the cache. */
    const refont = (e: Event): void => {
      if (e !== refonted) {
        refonted = e
        alphabetWidths.clear()
      }
      measure()
    }

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
    /** Clock ms when the last afterglow has ended (each starts when its cell turns `done`). */
    let settled = 0
    /** Paints every cell at `clock`; true while any glyph is decoding or still glowing. */
    const draw = (clock: number): boolean => {
      let busy = false
      for (const c of cells) {
        if (clock >= c.lock) {
          if (c.state !== 'done') settled = Math.max(settled, clock + SETTLE)
          paint(c, 'done', c.glyph.value)
          continue
        }
        busy = true
        if (clock < c.start) paint(c, 'hidden', '')
        else
          paint(
            c,
            clock >= c.lock - EDGE ? 'lock' : 'noise',
            noiseAt(c.hash, Math.floor((clock - c.start) / c.period), c.pool),
          )
      }
      return busy || clock < settled
    }

    let clock = 0
    let prev = -1
    let raf = 0
    /** Back to the base final frame: the real text, no cells, nothing animated left to replay. */
    const settle = (): void => {
      window.removeEventListener('resize', measure)
      fonts?.removeEventListener('loadingdone', refont)
      motion.removeEventListener('change', reduce)
      overlay.replaceChildren()
    }
    const finish = (): void => {
      settle()
      layer.setAttribute('data-state', 'done')
    }
    /** Reduced motion switched on mid-decode (it only fires on a change, and it was off): stop now. */
    const reduce = (): void => {
      cancelAnimationFrame(raf)
      finish()
    }
    window.addEventListener('resize', measure)
    fonts?.addEventListener('loadingdone', refont)
    motion.addEventListener('change', reduce)

    const tick = (now: number): void => {
      // Capped step: a stalled or hidden tab resumes the decode instead of jumping to the end.
      clock += prev < 0 ? 0 : Math.min(MAX_STEP, Math.max(0, now - prev))
      prev = now
      // The JS clock never runs ahead of real time, so once it is 600 ms past the last cell's turn
      // to `done`, that cell's CSS afterglow has ended too.
      if (draw(clock)) raf = requestAnimationFrame(tick)
      else finish()
    }
    measure()
    layer.setAttribute('data-state', 'running')
    draw(0) // the pre-state lands with the mount, not a frame later
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      settle()
      layer.removeAttribute('data-state')
    }
  }, [text, delay, duration, seed])

  const s = scrambleTextStyles()
  return (
    <span ref={ref} aria-hidden="true" data-sk-scramble-text="" className={s.glyphs()}>
      <span className={s.overlay()} />
      <span className={s.text()}>{text}</span>
    </span>
  )
}
