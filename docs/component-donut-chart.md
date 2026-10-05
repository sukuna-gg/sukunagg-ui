# Component: DonutChart

> Follows the `docs/component-button.md` template. **Server component** in `@sukunagg/charts`, no
> client JS (Q33, "later" trio). Shared rules: `docs/charts-and-stats.md` §2 and §5.

## 1. Purpose

Shows a part-to-whole split with few parts: time played by role, games by queue, plans by share.
The total sits in the middle and a legend lists each part with its share. More than three parts
fold into "Other" — a donut is for "mostly this, some that", not for comparing many values
(use a horizontal `BarChart`).

## 2. Files

```
packages/charts/src/components/donut-chart/
├── donut-chart.styles.tsx   # tv() slots: root, ring, center, legend, swatch.
├── donut-chart.logic.tsx    # forwardRef <figure>; arcs, folding, summary, table. No hooks.
├── donut-chart.test.tsx
├── donut-chart.stories.tsx
└── index.tsx                # export { DonutChart } ; export type { DonutChartProps }
```

## 3. API

```ts
export type DonutChartProps<Row> = {
  data: readonly Row[]
  /** Key of each part's name. */
  x: keyof Row & string
  /** Key of each part's amount (null / non-numbers = missing, left out and noted). */
  y: keyof Row & string
  /** Colored parts before the rest fold into "Other". Default 3 (palette rule, tokens.md). */
  maxSegments?: number
  /** Per-part color (any CSS color). Default --sk-chart-1…3, Other = --sk-chart-other. */
  color?: (row: Row, index: number) => string
  /** Middle text. Default: the formatted total. */
  centerValue?: ReactNode
  /** Small text under it, e.g. "hours". */
  centerCaption?: ReactNode
  size?: number            // px, default 160
  thickness?: number       // ring width px, default 22
  valueFormat?: Intl.NumberFormatOptions | ((v: number) => string)
  locale?: string          // default 'en-US'
  legend?: boolean         // default true: name + share per part
  empty?: ChartEmpty; loading?: boolean; table?: 'sr-only' | 'details' | 'none'
  summary?: string; id?: string; className?: string
} & ChartLabelProps         // aria-label or aria-labelledby, required
```

## 4. Variants → tokens

Ring segments in `--sk-chart-1…3` (or `color`), Other in `--sk-chart-other`, separated by a 2px
gap (the gap is parallel: computed per radius). Empty ring `--sk-surface-2`. Center value
`text-2xl font-semibold text-text tabular-nums`, caption `text-xs text-text-faint`. Legend rows:
swatch + name (`text-text-dim`) + share (`font-semibold text-text tabular-nums`).

## 5. States

| State | Behavior |
|---|---|
| data | ring + center total + legend |
| some parts missing | they are left out; a note says "N parts not reported" |
| one part | full ring, no gap |
| empty (no positive amounts) | grey ring, "—" in the middle, `EmptyState size="sm"` beside it |
| loading | skeleton ring, `aria-busy` |

Hover: each segment carries an SVG `<title>` ("Duelist: 97 h, 46%") — native tooltip, no JS.

## 6. Logic (`donut-chart.logic.tsx`)

- No `'use client'`. Sort is the caller's order; the largest-first order is not imposed.
- Folding: parts after `maxSegments` sum into one "Other" (only when there is more than one left).
- Arcs: angles from the top, clockwise, in a 0–100 viewBox (square, so the circle never
  stretches); a parallel 2px gap = half-gap angle `1px/r` at each radius.

## 7. Styles (`donut-chart.styles.tsx`)

`tv()` slots; colors via `--sk-segment-color` read by `fill-(--sk-segment-color)`.

## 8. Accessibility checklist

- [ ] `<figure>` named (type-enforced) and described by a summary ("Duelist 97, Initiator 61 …").
- [ ] Ring is `role="img"`-free decoration (`aria-hidden`); the legend and table carry the data.
- [ ] Shares are text, never color alone; Other is labelled.

## 9. Tests

Server render; arc count and folding into Other; `maxSegments`; custom colors; one-part full
ring; missing parts note; empty and loading; legend shares; summary; table; ref; axe.

## 10. Stories

`Playground`, `TimeByRole`, `WithOther` (6 parts → 3 + Other), `Empty`, `Loading`.

## 11. Decisions

- Three colored parts + Other by default: crimson beside amber fails deuteranopia, and a ring
  makes the last part touch the first (tokens.md, Q31).
- No client island: a native `<title>` per segment is enough for a handful of parts.
