# Component: StatTile

> Follows the `docs/component-button.md` template. **Server component** (no hooks, no directive).
> Approved in Q31/Q32 (charts & stats, wave 1). Modelled on sukuna-gg-web's `t-tile`.

## 1. Purpose

One headline number with what it means: a label, the value, a caption line (record, breakdown,
scope) and optionally a signed change against a named period and a small trend. Used for the
summary row of a stats page ("Win rate 58.3% · 35W 25L", "KDA 3.42 · 7.1 / 4.2 / 7.3").

## 2. Files

```
packages/ui/src/components/stat-tile/
├── stat-tile.styles.tsx   # tv() slots root/label/row/value/caption/delta/trend + size/tone/valueFont.
├── stat-tile.logic.tsx    # forwardRef <div>; formats value + delta; composes Sparkline. No hooks.
├── stat-tile.test.tsx
├── stat-tile.stories.tsx
└── index.tsx              # export { StatTile } ; export type { StatTileProps, StatTileDelta }
```

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

export interface StatTileDelta {
  /** Signed change. 0 renders "No change". */
  value: number
  /** What it's compared to: "vs last act", "since yesterday". */
  period?: ReactNode
  format?: Intl.NumberFormatOptions   // e.g. { maximumFractionDigits: 1 }; unit text goes in `unit`
  unit?: string                       // " pts", "%", " LP" — appended after the number
  /** true when down is good (deaths, churn, latency): flips the good/bad color. */
  invert?: boolean
}

export interface StatTileProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  label: ReactNode
  /** Locale for numbers; fixed so server and browser print the same string. Default 'en-US'. */
  locale?: string
  /** number → formatted with `format`; string/node → shown as is; null → "—" (missing, never 0). */
  value: number | string | ReactNode | null
  format?: Intl.NumberFormatOptions
  /** Line under the value: record, breakdown, or why the value is missing. */
  caption?: ReactNode
  /** Value color from your own thresholds. Default 'default'. */
  tone?: 'default' | 'positive' | 'negative' | 'premium'
  /** Any CSS color for the value (app palettes, e.g. 'var(--l-great)'); overrides `tone`. */
  valueColor?: string
  delta?: StatTileDelta
  /** Sparkline data, oldest → newest (nulls allowed). */
  trend?: readonly (number | null)[]
  size?: 'md' | 'lg'                 // default 'md'; 'lg' = hero (52px value, full-width trend)
  /** Default 'display' (Archivo 900 italic, expanded) per owner (Q32). 'sans' for dense admin UIs. */
  valueFont?: 'display' | 'sans'
  /** Screen-reader text for a null value. Default 'Not reported'. */
  missingLabel?: string
  /** Skeleton of the same size; sets aria-busy. */
  loading?: boolean
}
```

Deliberately **not** here: count-up animation (wrap the value in `Counter` yourself — it's a
client component), click behaviour (wrap in a link or use `Card interactive`), threshold logic
(the app knows what "good" is; pass `tone`).

## 4. Variants → tokens

| Slot | Utilities / tokens |
|---|---|
| root | `bg-surface border border-line rounded-lg px-4 py-3.5 flex flex-col gap-1.5 min-w-0` |
| label | `font-display italic font-extrabold uppercase tracking-[.14em] text-xs text-text-dim` |
| value (display) | `font-display italic font-black font-stretch-expanded text-[28px] leading-none tabular-nums` |
| value (sans) | `font-sans font-semibold text-[28px] tracking-tight leading-none` |
| caption | `text-xs text-text-dim` |
| delta | `text-xs font-semibold`; good `text-success`, bad `text-danger`, zero `text-text-dim`; period `text-text-faint font-normal` |
| trend | `Sparkline` (`line`, md: up to 96px beside the value; lg: `area`, full width, 56px tall) |

| tone | value color |
|---|---|
| default | `text-text` |
| positive | `text-success` |
| negative | `text-danger` |
| premium | `text-premium` |

`valueColor` sets `--sk-stat-value` on the root and the value uses `text-(--sk-stat-value)`.
`size="lg"`: value `text-[52px]`, trend moves under the delta at full width. Archivo's `wdth` axis
must be loaded by the app for `font-stretch-expanded` (tokens.md: the library doesn't bundle fonts).

## 5. States

| State | Behavior |
|---|---|
| default | label, value, caption, optional delta + trend |
| missing value (`null`) | "—" in `text-text-faint` (aria-hidden) + sr-only `missingLabel`; the caption says why ("Not reported by Riot for Set 18") |
| no delta change (`value: 0`) | "– No change" in `text-text-dim` |
| no trend data | the Sparkline's own empty state is skipped: the trend slot isn't rendered |
| loading | three Skeleton bars at label/value/caption sizes, same min-height (112px md), `aria-busy="true"` |

No hover/focus of its own — it is not interactive.

## 6. Logic (`stat-tile.logic.tsx`)

- No `'use client'`. `forwardRef<HTMLDivElement>`.
- Number values (and the delta) go through `Intl.NumberFormat(locale, format)` with `locale`
  defaulting to `'en-US'`, so the server and the browser print the same string (no hydration
  mismatch from a different system locale). `Intl` options can't carry a locale, hence the prop.
- Missing values always render in `text-text-faint`, ignoring `tone`/`valueColor`.
- `leading-none` sits in the `size` variant, after the font size: tailwind-merge drops a
  line-height that comes before a font-size utility.
- Delta: arrow `▲`/`▼`/`–` and the formatted absolute value are `aria-hidden`; an sr-only sentence
  says it in words: "up 2.1 pts, better, vs last act". Good/bad = `sign(value) × (invert ? -1 : 1)`.
- Never renders `0` for `null`, and never hides a real `0`.

## 7. Styles (`stat-tile.styles.tsx`)

`tv()` with slots (above) and variants `size`, `tone`, `valueFont`, `deltaTone` (`good | bad | flat`).
Defaults: `size: 'md'`, `tone: 'default'`, `valueFont: 'display'`.

## 8. Accessibility checklist

- [ ] Reading order is label → value → caption → delta, so a screen reader hears a sentence.
- [ ] Delta meaning is in words (sr-only), never only color or arrow.
- [ ] Missing values announce `missingLabel`, not "dash".
- [ ] Value and delta text ≥ 4.5:1 in all four themes (`success`, `danger`, `premium` are text-safe).
- [ ] `loading` sets `aria-busy`; skeleton is `aria-hidden`.

## 9. Tests

Server render; number formatting (`format`); string/node value passthrough; `null` → "—" + sr
`missingLabel`, never "0"; real `0` shows "0"; each `tone` class; `valueColor` sets the variable and
beats `tone`; delta up/down/zero × `invert` → good/bad/flat class + sr sentence; `unit` + `period`;
`trend` renders a Sparkline (md beside, lg below); `size`/`valueFont` classes; `loading` skeleton +
`aria-busy`; `ref`; `className` merges; hydrate; axe both themes.

## 10. Stories

`Playground`, `TftSummary` (avg place / top 4 / wins / damage-not-reported), `LeagueSummary`
(win rate / KDA with app color / CS / LP with delta + trend), `Hero` (`size="lg"`), `Missing`,
`Deltas` (up, down, zero, inverted), `Loading`, `SansValues`. Both themes.

## 11. Decisions

- Caption + tone are first-class; delta and trend are optional (sukuna-gg-web review, Q32).
- Display face by default (owner, Q32 answer 1); `valueFont="sans"` kept for dense UIs.
- `valueColor` accepts any CSS color so apps keep their own palettes (owner, Q32 answer 2).
- Down/bad uses `--sk-danger` (coral), never the accent (Q31).
