/**
 * WCAG 2.1 contrast gate for the color tokens (improvement #36).
 *
 * Runs with the normal `bun test src` / `test:coverage` gate — no CI file needed. It locks the
 * retuned AA tokens so a future edit to `src/tokens.ts` that quietly drops a color below its
 * threshold fails the suite. Pure TypeScript, dependency-free, deterministic.
 *
 * Contrast follows WCAG 2.1:
 *   - sRGB channel → linear via the 0.03928 gamma piecewise curve
 *   - relative luminance L = 0.2126·R + 0.7152·G + 0.0722·B
 *   - ratio = (Llight + 0.05) / (Ldark + 0.05)
 * Thresholds: 4.5:1 for normal text (1.4.3), 3.0:1 for non-text UI / large text (1.4.11 / 1.4.3).
 *
 * Translucent tokens (`rgba(...)`) are alpha-composited over the relevant solid background
 * before measuring, matching what a viewer actually sees.
 */

import { describe, expect, it } from 'bun:test'
import { colors, type ThemeName } from './tokens'

type RGB = readonly [number, number, number]

/** Parse `#RRGGBB` (or `#RGB`) to 0–255 channels. */
function parseHex(hex: string): RGB {
  const h = hex.trim().replace(/^#/, '')
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

/** Parse `rgba(r, g, b, a)` / `rgb(r, g, b)` → channels (0–255) + alpha (0–1). */
function parseRgba(value: string): { rgb: RGB; alpha: number } {
  const m = value.match(/rgba?\(([^)]+)\)/i)
  if (!m?.[1]) throw new Error(`not an rgb(a) color: ${value}`)
  const parts = m[1].split(',').map((p) => Number.parseFloat(p.trim()))
  const [r = 0, g = 0, b = 0, a = 1] = parts
  return { rgb: [r, g, b], alpha: a }
}

/** Composite a source color over an opaque backdrop → the visible opaque color. */
function composite(source: string, backdrop: RGB): RGB {
  const { rgb, alpha } = parseRgba(source)
  return [
    Math.round(rgb[0] * alpha + backdrop[0] * (1 - alpha)),
    Math.round(rgb[1] * alpha + backdrop[1] * (1 - alpha)),
    Math.round(rgb[2] * alpha + backdrop[2] * (1 - alpha)),
  ]
}

/** Resolve any supported token string to an opaque RGB, compositing over `over` if translucent. */
function toRgb(value: string, over?: RGB): RGB {
  const v = value.trim()
  if (v.startsWith('#')) return parseHex(v)
  if (/^rgba?\(/i.test(v)) {
    const { rgb, alpha } = parseRgba(v)
    if (alpha >= 1) return rgb
    if (!over) throw new Error(`translucent color needs a backdrop: ${value}`)
    return composite(v, over)
  }
  throw new Error(`unsupported color token: ${value}`)
}

/** sRGB 0–255 channel → linear-light component. */
function linearize(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance of an opaque RGB. */
function luminance([r, g, b]: RGB): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

/** WCAG contrast ratio between two opaque colors (order-independent). */
function contrast(a: RGB, b: RGB): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Round to 2 decimals for readable messages. */
const r2 = (n: number) => Math.round(n * 100) / 100

const THEMES: ThemeName[] = ['dark', 'light']

/** Foreground `fg` over solid background `bg` for `theme` → contrast ratio. */
function ratio(theme: ThemeName, fg: string, bg: string): number {
  const bgRgb = toRgb(colors[bg as keyof typeof colors][theme])
  const fgRgb = toRgb(colors[fg as keyof typeof colors][theme], bgRgb)
  return contrast(fgRgb, bgRgb)
}

/** Extract the two hex stops from a `linear-gradient(..., #hex, #hex)` string. */
function gradientStops(value: string): [RGB, RGB] {
  const hexes = value.match(/#[0-9a-fA-F]{3,6}/g)
  const first = hexes?.[0]
  const last = hexes?.at(-1)
  if (!first || !last) throw new Error(`expected 2 gradient stops: ${value}`)
  return [parseHex(first), parseHex(last)]
}

// Track the tightest passing pairs so a human can see which tokens have the least headroom.
const margins: { label: string; ratio: number; threshold: number }[] = []
function assertRatio(label: string, value: number, threshold: number): void {
  margins.push({ label, ratio: value, threshold })
  expect(value, `${label} — ratio ${r2(value)} < ${threshold}`).toBeGreaterThanOrEqual(threshold)
}

const TEXT = 4.5
const UI = 3.0

describe('WCAG 2.1 color-token contrast gate', () => {
  describe.each(THEMES)('theme: %s', (theme) => {
    it('text and text-dim clear AA 4.5:1 on bg, surface, surface-2', () => {
      for (const fg of ['text', 'text-dim']) {
        for (const bg of ['bg', 'surface', 'surface-2']) {
          assertRatio(`${fg} on ${bg} (${theme})`, ratio(theme, fg, bg), TEXT)
        }
      }
    })

    it('text-faint clears AA 4.5:1 on bg, surface, surface-2 (locks the retune)', () => {
      for (const bg of ['bg', 'surface', 'surface-2']) {
        assertRatio(`text-faint on ${bg} (${theme})`, ratio(theme, 'text-faint', bg), TEXT)
      }
    })

    it('accent clears UI 3:1 on bg and surface', () => {
      for (const bg of ['bg', 'surface']) {
        assertRatio(`accent on ${bg} (${theme})`, ratio(theme, 'accent', bg), UI)
      }
    })

    it('focus-ring clears UI 3:1 on bg, surface, surface-2', () => {
      for (const bg of ['bg', 'surface', 'surface-2']) {
        assertRatio(`focus-ring on ${bg} (${theme})`, ratio(theme, 'focus-ring', bg), UI)
      }
    })

    it('on-accent clears AA 4.5:1 over both accent-gradient stops', () => {
      const onAccent = toRgb(colors['on-accent'][theme])
      const [start, end] = gradientStops(colors['gradient-accent'][theme])
      assertRatio(`on-accent on gradient-start (${theme})`, contrast(onAccent, start), TEXT)
      assertRatio(`on-accent on gradient-end (${theme})`, contrast(onAccent, end), TEXT)
    })

    it('success clears UI 3:1 on bg', () => {
      assertRatio(`success on bg (${theme})`, ratio(theme, 'success', 'bg'), UI)
    })

    it('danger clears AA 4.5:1 as text on bg, surface, surface-2 (StatTile deltas)', () => {
      for (const bg of ['bg', 'surface', 'surface-2']) {
        assertRatio(`danger on ${bg} (${theme})`, ratio(theme, 'danger', bg), TEXT)
      }
    })

    it('chart-1…6 clear UI 3:1 as marks on bg, surface, surface-2', () => {
      for (const fg of ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'chart-6']) {
        for (const bg of ['bg', 'surface', 'surface-2']) {
          assertRatio(`${fg} on ${bg} (${theme})`, ratio(theme, fg, bg), UI)
        }
      }
    })

    it('heat-1 (lowest level) clears 2:1 on surface so it never reads as empty', () => {
      assertRatio(`heat-1 on surface (${theme})`, ratio(theme, 'heat-1', 'surface'), 2)
    })
  })

  describe('theme: light', () => {
    it('premium, premium-dim, success clear AA 4.5:1 as text on surface', () => {
      for (const fg of ['premium', 'premium-dim', 'success']) {
        assertRatio(`${fg} on surface (light)`, ratio('light', fg, 'surface'), TEXT)
      }
    })
  })

  it('reports the tightest passing pairs (headroom above threshold)', () => {
    const ranked = [...margins]
      .map((m) => ({ ...m, headroom: r2(m.ratio - m.threshold) }))
      .sort((a, b) => a.headroom - b.headroom)
      .slice(0, 5)
    // Visible in `bun test` output; not an assertion, just a diagnostic.
    console.log(
      'Tightest contrast margins:\n' +
        ranked
          .map((m) => `  ${m.label}: ${r2(m.ratio)} (threshold ${m.threshold}, +${m.headroom})`)
          .join('\n'),
    )
    expect(ranked.length).toBeGreaterThan(0)
  })
})
