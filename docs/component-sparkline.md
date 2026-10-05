# Component: Sparkline

> Follows the `docs/component-button.md` template. **Server component** (no hooks, no directive) —
> pure SVG from props, so it ships zero JS. Approved in Q31/Q32 (charts & stats, wave 1).

## 1. Purpose

A word-sized trend with no axes: a rating over the last games, matches per day, a win/loss
streak. It sits inside a `StatTile`, a `Table` cell or a line of text and is read at a glance;
anything that needs axes, hover or exact values is a chart from `@sukunagg/charts`.

## 2. Files

```
packages/ui/src/components/sparkline/
├── sparkline.styles.tsx   # tv() slots root/svg/line/area/bar/dot/empty + variant. Pure.
├── sparkline.logic.tsx    # forwardRef <span>; path math (scale, gaps) is plain functions. No hooks.
├── sparkline.test.tsx
├── sparkline.stories.tsx
└── index.tsx              # export { Sparkline } ; export type { SparklineProps }
```

## 3. API

```ts
import type { ComponentPropsWithoutRef } from 'react'

export interface SparklineProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  /** Oldest → newest. `null` = missing point: the line breaks there (never drawn as 0). */
  data: readonly (number | null)[]
  variant?: 'line' | 'area' | 'bar' | 'winloss'   // default 'line'
  /** CSS length. Default '100%' of the container (min 48px). */
  width?: number | string
  height?: number            // px, default 28
  /** Mark color as a CSS color value, e.g. 'var(--l-win)'. Default: line/area/bar
   *  `--sk-text-faint` (de-emphasis) with the last point in `--sk-chart-1`. */
  color?: string
  /** winloss only: colors for wins (> 0) and losses (< 0). Defaults `--sk-chart-1` / `--sk-text-faint`. */
  winColor?: string
  lossColor?: string
  /** Mark the latest point (dot on line/area, accent bar on bar). Default true. */
  highlightLast?: boolean
  /** Shown when `data` has no numbers. Default '–'. */
  emptyLabel?: string
  /** Accessible summary. Default: "Trend from {first} to {last}" / "{w} wins, {l} losses". */
  'aria-label'?: string
}
```

Deliberately **not** here: axes, tooltips, multiple series, min/max reference lines (those are
charts). `winloss` reads only the sign of each value (`> 0` win, `< 0` loss, `0`/`null` = gap).

## 4. Variants → tokens

| Variant | Marks |
|---|---|
| line | 1.5px stroke, round caps/joins; last point = 6px dot in `--sk-chart-1` with a 2px `--sk-surface` ring |
| area | line + fill of the line color at 12% opacity down to the bottom edge |
| bar | bars 2px apart, 1.5px rounded top, square at the baseline; older bars `--sk-text-faint` at 55%, last bar `--sk-chart-1` |
| winloss | 6px bars, 2px apart: wins rise from the middle, losses hang below it; position carries the result, color only reinforces it |

Every color is a CSS value (`var(--sk-…)` or a consumer `var(--app-…)`) set through a CSS custom
property on the root (`--sk-spark-color`, `--sk-spark-win`, `--sk-spark-loss`) and read by literal
utilities (`stroke-(--sk-spark-color)`). No class name is ever built from a value (rule 7).

## 5. States

| State | Behavior |
|---|---|
| data | as above |
| missing points | `null` breaks the line/area into segments; a lone known point between gaps is a 3px dot |
| one point | a single dot at the right edge (no line) |
| empty (`[]` or all `null`) | renders `emptyLabel` ("–") in `--sk-text-faint` plus sr-only "no data"; same height so rows don't jump |
| flat (all equal) | a horizontal line through the middle |

No hover, no focus: it is a figure, not a control.

## 6. Logic (`sparkline.logic.tsx`)

- No `'use client'`. `forwardRef<HTMLSpanElement>`; root is an inline-block `<span>` so it can sit
  in text and table cells.
- **Server-side sizing without measuring:** the SVG uses `viewBox="0 0 100 {height}"`,
  `preserveAspectRatio="none"` and `vector-effect: non-scaling-stroke` on strokes, so it stretches to
  any container width with crisp 1.5px lines. Dots are **not** SVG circles (they would stretch into
  ovals): each is an absolutely positioned `<span>` at `left: x%` / `top: ypx` inside the root, so it
  stays round at every width. `width` sets the root's inline size.
- **`bar` and `winloss` are HTML, not SVG:** a flex row of spans (2px gap) whose heights are
  percentages. A stretched SVG would distort their rounded corners; HTML keeps them crisp and the
  gap a true 2px at any width.
- Scale: min/max of the known values with 6px vertical padding so the dot + ring never clip; flat
  data maps to the middle.
- Root gets `role="img"` + the `aria-label` (default summary); inner SVG is `aria-hidden`. The empty
  state has no role: "–" is `aria-hidden` and an sr-only span says "no data" (or the `aria-label`).
- Path math lives in exported pure helpers (`toSegments`, `scaleY`) so tests cover gaps and
  edge cases without rendering.

## 7. Styles (`sparkline.styles.tsx`)

`tv()` slots: `root` (`relative inline-block align-middle min-w-12`), `svg` (`block size-full
overflow-visible`), `line` (`fill-none stroke-(--sk-spark-color) [vector-effect:non-scaling-stroke]`),
`area`, `bar`, `dot` (`absolute size-1.5 -translate-1/2 rounded-full bg-chart-1 ring-2 ring-surface`),
`empty` (`text-text-faint text-sm`). `variant` switches which marks render.

## 8. Accessibility checklist

- [ ] Root `role="img"` with a meaningful `aria-label`; the SVG is `aria-hidden`.
- [ ] Default label says the range ("Trend from 1,810 to 1,902") or the record ("6 wins, 4 losses").
- [ ] Empty state has sr-only text ("no data"), not just a dash.
- [ ] Win/loss is readable without color (up vs down).
- [ ] Marks ≥ 3:1 against `surface` in all themes (tokens are validated; custom colors are the app's call).

## 9. Tests

Renders each variant on the server (`renderToString`); `null` splits the path into segments (count
`M` commands); one point → one dot, no path; empty → `emptyLabel` + sr text, no SVG; flat data
stays inside the viewBox; default and custom `aria-label`; `color`/`winColor`/`lossColor` land in
the CSS variables; `highlightLast={false}` drops the dot; `ref` forwards; `className` merges;
hydrates without warnings; axe both themes.

## 10. Stories

`Playground`, `Variants` (all four), `WithGaps`, `Empty`, `InTable` (recent-form table), `CustomColors`
(win/loss in app colors), `Widths` (48px / 96px / 100%). Both themes.

## 11. Decisions

- Server component that sizes itself with CSS (`viewBox` + `preserveAspectRatio="none"` + HTML
  dots) instead of measuring on the client — zero JS, no layout shift (D36).
- Default ink is de-emphasis grey with the current period in the accent (dataviz convention); a
  `color` prop covers app palettes (owner, Q32: game colors are passed in).
