# Component: LineChart

> Follows the `docs/component-button.md` template. Covers **`LineChart` and `AreaChart`** (one
> folder, two exports — an area is a line with a fill). Server components in `@sukunagg/charts`
> (wave 2, Q32/Q33); hover and keyboard come from the shared client island. Shared props, states,
> rendering model and accessibility: `docs/charts-and-stats.md` §5.

## 1. Purpose

Shows change across an ordered axis: rating over the last 30 matches, damage per round by role
per week, placement per game, gold difference per minute. `AreaChart` adds a fill, either down to
a baseline or split above/below it (who is ahead).

## 2. Files

```
packages/charts/src/components/line-chart/
├── line-chart.styles.tsx   # tv() slots: svg, line, area, dot, end label, band, reference, gap shade.
├── line-chart.logic.tsx    # forwardRef <figure>; LineChart + AreaChart share one renderer. No hooks.
├── line-chart.test.tsx
├── line-chart.stories.tsx
└── index.tsx               # export { AreaChart, LineChart } ; export type { AreaChartProps, LineChartProps }
```

## 3. API

```ts
import type { ChartBaseProps } from '../../internal/types'

export interface LineChartProps<Row> extends ChartBaseProps<Row> {
  /** default 'linear' (honest); 'monotone' smooths without overshooting */
  curve?: 'linear' | 'monotone'
  /** Value axis. Default: nice(min, max) of the data — a line need not start at 0. */
  yDomain?: readonly [number, number]
  /** Smaller values at the top (placements: 1st on top). Default false. */
  reverse?: boolean
  /** A shaded value range, e.g. { from: 1, to: 4, label: 'Top 4' }. */
  band?: { from: number; to: number; label?: string; color?: string }
  /** Horizontal reference lines, e.g. [{ value: 3.84, label: 'avg 3.84' }]. */
  references?: readonly { value: number; label: string }[]
  /** Dots: none, the latest point (default), or every point. */
  points?: 'none' | 'last' | 'all'
  /** Per-point dot color (placement buckets). Line stays the series color. */
  pointColor?: (row: Row, index: number, seriesKey: string) => string
  /** End labels: 'auto' = value for one series, series name for several. */
  endLabels?: 'auto' | 'value' | 'series' | false
  /** How a run of nulls is drawn. Default 'shade' (tinted + "Not reported"). */
  gaps?: 'shade' | 'none'
  /** Fewer known points than this → "Not enough data for a chart". Default 1. */
  minPoints?: number
}

export interface AreaChartProps<Row> extends LineChartProps<Row> {
  /** Value the fill reaches. Default: the bottom of `yDomain`. */
  baseline?: number
  /** Diverging fill (single series): color above / below `baseline`. */
  above?: string
  below?: string
  /** Make `yDomain` symmetric around `baseline` (gold difference). Default false. */
  symmetric?: boolean
  /** Default 2 — an area needs two points. */
  minPoints?: number
}
```

The x axis is ordinal (evenly spaced by index); `xFormat` labels it. Deliberately **not** in v1:
a time scale, two y axes (never — use two charts), stacked areas, zoom/brush, annotations beyond
`band` + `references`.

## 4. Variants → tokens

| Mark | Spec |
|---|---|
| line | 2px, round joins/caps, non-scaling stroke; series color |
| area fill | series color at 10% (single-color); `above`/`below` at 32% split by a clip at `baseline` |
| dot | 8px HTML dot, 2px `--sk-surface` ring; `pointColor` overrides fill |
| end label | 1 series: value, `text-xs font-semibold text-text`; ≥ 2: series name, `text-text-dim`, 8px right of the last point |
| band | color (default `--sk-chart-3`) at 7% + optional label top-left, `text-text-faint` |
| reference | 1px `--sk-text-dim` at 60% + label at the right edge |
| gap shade | `bg-text/4` over the null run + "Not reported" label |
| crosshair (hover) | 1px `--sk-text-faint` + ringed dots per series |

## 5. States

Shared table in `charts-and-stats.md` §5.4. Specific: a lone known point between nulls is a dot;
one point total renders a centred dot (`LineChart`) or the too-few state (`AreaChart`,
`minPoints` 2). With `symmetric`, the domain is ± the largest |value| rounded up to a nice step;
for a floor (the app's gold graph never shows less than ±1k) pass `yDomain` — the chart holds no
game-specific rules.

## 6. Logic (`line-chart.logic.tsx`)

- No `'use client'`. One internal renderer; `LineChart` and `AreaChart` are thin wrappers.
- Paths from `d3-shape` `line()` / `area()` with `.defined(v => v !== null)` in a 0–100 viewBox;
  `curveMonotoneX` for `curve="monotone"`. Diverging fill = the same area clipped above and below
  the baseline (two `clipPath`s with ids from `useId`-free deterministic keys: chart id prop or a
  hash of the series keys, so server and client markup match).
- `reverse` flips the y scale; ticks still come out nice.
- Island payload: x %, y % per series, tooltip title (`xFormat`) and rows ("Not reported" for null).
- Dev-only error when ≥ 2 series use `above`/`below` (diverging fill is single-series).

## 7. Styles (`line-chart.styles.tsx`)

`tv()` slots above; series color via `--sk-series-color` on each path/dot wrapper, read by
`stroke-(--sk-series-color)` / `fill-(--sk-series-color)` / `bg-(--sk-series-color)`.

## 8. Accessibility checklist

- [ ] `<figure>` named by `aria-label`/`aria-labelledby` (type-enforced); summary covers range and
      end values per series ("Rating from 1,838 to 2,012 over 30 matches").
- [ ] Marks `aria-hidden`; table view lists every point, "Not reported" for nulls.
- [ ] ≥ 2 series → legend + end labels; identity never color-alone.
- [ ] Keyboard: ←/→ move the crosshair, Home/End, Escape; live region reads the point.
- [ ] Diverging fills are explained by a legend ("Blue side ahead" / "Red side ahead").

## 9. Tests

Server render (Line + Area); path segments split at nulls (count `M`); lone points; `reverse`
puts the smallest value at the top; nice ticks for non-zero domains; `band` and `references`
positions; `pointColor` per dot; end labels auto vs value vs series; `gaps` shade spans the null
run; diverging area emits two clipped paths with deterministic ids; `symmetric` domain;
`minPoints` too-few state; empty/loading keep the frame; table + summary text; dev error for
multi-series diverging; ref; className; hydrate; axe both themes. Browser (Playwright): pointer
moves the crosshair and tooltip; arrow keys; Escape; tooltip says "Not reported" on a gap.

## 10. Stories

`Playground`, `Rating` (AreaChart, single series, end value), `DamageByRole` (LineChart, 3 series,
legend + end labels), `PlacementOverTime` (`reverse`, `yDomain={[1, 8]}`, `pointColor`, Top 4
`band`, average `references`), `GoldDifference` (AreaChart `baseline={0}` `symmetric` above/below),
`WithGaps`, `Empty`, `Loading`, `Static`. Both themes.

## 11. Decisions

- Line and Area share one spec and renderer: identical axes, gaps and interaction (Q31 mockup).
- Ordinal x only in v1 — every first-consumer chart is per match / per minute / per week (Q32).
- `reverse`, `band`, `pointColor` and diverging `above`/`below` exist because sukuna-gg-web needs
  them for "Placement over time" and the gold graph (Q32 review).
