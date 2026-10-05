# Component: Heatmap

> Follows the `docs/component-button.md` template. **Server component** in `@sukunagg/charts`, no
> client JS (Q33, "later" trio).

## 1. Purpose

A calendar of activity: one square per day, weeks as columns, darker or brighter by how much
happened — games played per day, commits, sessions. It shows rhythm (weekends, streaks, breaks)
at a glance, and tells "nothing happened" apart from "we weren't tracking yet".

## 2. Files

```
packages/charts/src/components/heatmap/
├── heatmap.styles.tsx   # tv() slots: root, grid, day label, month label, cell + level, legend.
├── heatmap.logic.tsx    # forwardRef <figure>; date math (UTC), levels, summary, table. No hooks.
├── heatmap.test.tsx
├── heatmap.stories.tsx
└── index.tsx            # export { Heatmap } ; export type { HeatmapProps }
```

## 3. API

```ts
export type HeatmapProps<Row> = {
  data: readonly Row[]
  /** Key of the day, as 'YYYY-MM-DD' (read as a calendar date, no time zone). */
  date: keyof Row & string
  /** Key of the amount. A day with no row, or a null amount, is "not tracked" — never 0. */
  value: keyof Row & string
  /** Last day shown, 'YYYY-MM-DD'. Default: the latest date in `data`. */
  end?: string
  weeks?: number           // default 20
  /** Upper bounds of levels 1–3 (level 4 is above). Default: quarters of the max. */
  levels?: readonly [number, number, number]
  /** Unit in tooltips/summary, e.g. 'games'. Default 'events'. */
  unit?: string
  valueFormat?: Intl.NumberFormatOptions | ((v: number) => string)
  locale?: string          // default 'en-US' (month/day names)
  empty?: ChartEmpty; loading?: boolean; table?: 'sr-only' | 'details' | 'none'
  summary?: string; id?: string; className?: string
} & ChartLabelProps
```

## 4. Variants → tokens

Level 0 (a tracked day with 0) `--sk-surface-2`; levels 1–4 `--sk-heat-1…4`; not tracked =
transparent with a 1px `--sk-line` outline. Cells are squares that shrink with the container
(CSS grid, max 14px, 3px gaps). Month labels over the first week of each month, Mon/Wed/Fri
labels, a Less → More legend (+ "Not tracked" when any day is untracked).

## 5. States

| State | Behavior |
|---|---|
| data | colored cells, labels, legend |
| untracked days | outlined, legend says "Not tracked"; summary counts tracked days only |
| every tracked day 0 | the grid stays (level 0 / outlined), plus `EmptyState size="sm"` over it |
| no rows and no `end` | nothing to place on a calendar: just the `EmptyState` (pass `end` to keep the grid) |
| loading | skeleton cells, `aria-busy` |

Each cell has a native `title` ("Tue, Aug 12: 4 games" / "Tue, Aug 12: not tracked").

## 6. Logic (`heatmap.logic.tsx`)

- No `'use client'`. Dates are parsed and formatted in UTC (`Intl.DateTimeFormat(locale,
  { timeZone: 'UTC' })`), so server and browser render the same day.
- The grid ends on `end`'s week (weeks start Monday); days after `end` in the last column are
  blank.
- Levels: `value <= 0` → 0; then the first bound it fits under; above the third → 4.

## 7. Styles (`heatmap.styles.tsx`)

`tv()` slots with a `level` variant (`0 | 1 | 2 | 3 | 4 | untracked`) — literal classes per level.

## 8. Accessibility checklist

- [ ] `<figure>` named (type-enforced) with a summary ("142 games over 20 weeks, 61 active days").
- [ ] Cells are `aria-hidden`; the table view lists week × day values ("Not tracked" for gaps).
- [ ] Levels are explained by the legend; untracked is a shape (outline), not only a color.

## 9. Tests

Server render; UTC date grid (week start, end alignment, 20 × 7 cells, blanks after `end`);
levels default and custom; untracked vs 0; month and day labels; legend; empty and loading;
summary; table rows; titles; ref; axe.

## 10. Stories

`Playground`, `GamesPlayed`, `PartlyTracked`, `CustomLevels`, `Empty`, `Loading`.

## 11. Decisions

- "No row" means not tracked, not 0 (rule: missing is not zero). Send explicit zeros for days you
  know were empty.
- Native `title` tooltips instead of the island: 140 cells don't need keyboard stops; the table
  view covers keyboard and screen-reader users.
