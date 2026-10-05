# Component: BarChart

> Follows the `docs/component-button.md` template. **Server component** in `@sukunagg/charts`
> (wave 2, Q32/Q33); hover and keyboard come from the shared client island. Shared props, states,
> rendering model and accessibility: `docs/charts-and-stats.md` §5.

## 1. Purpose

Compares amounts across categories: games per placement, kills per weapon by season, revenue per
plan per month, pick rate per agent. One component, three layouts: `grouped` (side by side),
`stacked` (parts of a total) and `horizontal` (long category names, ranked lists).

## 2. Files

```
packages/charts/src/components/bar-chart/
├── bar-chart.styles.tsx   # tv() slots: bands, bar, segment, cap label, row (horizontal) + layout.
├── bar-chart.logic.tsx    # forwardRef <figure>; scales, bars as HTML, island props. No hooks.
├── bar-chart.test.tsx
├── bar-chart.stories.tsx
└── index.tsx              # export { BarChart } ; export type { BarChartProps }
```

## 3. API

```ts
import type { ChartBaseProps } from '../../internal/types'

export interface BarChartProps<Row> extends ChartBaseProps<Row> {
  /** default 'grouped' */
  layout?: 'grouped' | 'stacked' | 'horizontal'
  /** Print each bar's value at its end (stacked: the total on top). Default false. */
  valueLabels?: boolean
  /** Value axis. Default nice(0, max). Must include 0. */
  yDomain?: readonly [number, number]
}
```

`series[i].color` may be a function `(row, index) => string` for one color per bar (placement
buckets). Pass `legend={[{ label: '1st', color: 'var(--t-first)' }, …]}` to explain such colors.

Deliberately **not** in v1: negative values (diverging bars), a time axis, more than 24
categories (use a horizontal layout or a table), animated bar growth, bar click handlers.

## 4. Variants → tokens

| Mark | Spec |
|---|---|
| bar (grouped) | ≤ 24px thick, centred in its band; 2px gap between bars of a group; 4px rounded data end, square at the baseline; color `--sk-chart-n` or the series/row color |
| segment (stacked) | same width; 2px surface gap between segments; only the top segment is rounded |
| row (horizontal) | category label column (`text-text-dim`, auto width) · bar ≤ 18px tall, rounded right end · value at the tip |
| cap label | `text-xs font-bold text-text tabular-nums`, 6px above the bar; `0` printed, `null` → "–" in `text-text-faint` |
| grid / axis | gridlines `--sk-line-soft`, baseline `--sk-line`; tick labels `text-xs text-text-faint` |
| hover band | `bg-text/5` across the category |

## 5. States

Shared table in `charts-and-stats.md` §5.4. Specific to bars: a `null` value draws no bar and its
cap shows "–"; a `0` draws no bar and its cap shows "0"; a stacked category with every segment
`null` shows "–" as its total. Hover/focus highlights the whole category and the tooltip lists
every series (stacked adds a Total row).

## 6. Logic (`bar-chart.logic.tsx`)

- No `'use client'`; generic component via `forwardRef` + a cast that keeps `Row` inference.
- Band scale over categories (padding 0.28), linear value scale from `yDomain` or nice(0, max).
- Bars are absolutely positioned HTML in % of the plot (see §5.2 of the wave spec).
- Builds the island payload (x centres %, top of the tallest bar %, formatted tooltip rows) and the
  table rows on the server; renders `<ChartInteraction>` only when `interactive`.
- Throws a dev-only error for negative values or a `yDomain` without 0.

## 7. Styles (`bar-chart.styles.tsx`)

`tv()` slots with a `layout` variant (`grouped | stacked | horizontal`). Colors are CSS custom
properties per bar (`--sk-bar-color`) read by `bg-(--sk-bar-color)` — no built class names.

## 8. Accessibility checklist

- [ ] `<figure>` named by `aria-label`/`aria-labelledby` (type-enforced), summary as description.
- [ ] Bars and labels `aria-hidden`; the table view (sr-only by default) has every value.
- [ ] Per-bar colors are explained by a legend; the category label and value are always text.
- [ ] Keyboard: one tab stop, ←/→ (↑/↓ horizontal) through categories, Escape hides the tooltip.
- [ ] Marks ≥ 3:1 against the surface with default tokens; app colors are the app's call.

## 9. Tests

Server render for every layout; band/linear scale and nice ticks; bar heights for known data;
per-row color function lands in `--sk-bar-color`; 7th series → `chart-other`; `null` vs `0` caps;
stacked totals with nulls; empty / too-few / loading states keep the frame size; legend auto vs
custom vs off; table view rows and "Not reported"; `interactive={false}` renders no island;
summary text; dev errors for negatives; ref; className; hydrate; axe both themes. Browser
(Playwright): hover a band shows the tooltip with every series; arrow keys move; Escape hides.

## 10. Stories

`Playground`, `PlacementDistribution` (per-bar colors + legend + value labels + `table="details"`),
`Grouped` (kills by weapon, two seasons), `Stacked` (MRR by plan), `Horizontal` (pick rate),
`MissingValues`, `Empty`, `Loading`, `Static` (`interactive={false}`). Both themes.

## 11. Decisions

- One component with `layout` instead of three (one API to learn; Q31 mockup).
- Bars are HTML so corners, gaps and labels stay crisp without client measuring (wave spec §5.2).
- Per-bar color function exists because the first consumer needs it (sukuna-gg-web placement
  buckets, Q32).
