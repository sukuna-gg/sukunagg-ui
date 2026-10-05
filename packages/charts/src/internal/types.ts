import type { ReactNode } from 'react'

/** One data series: which key to read from each row, its name, and an optional color. */
export interface ChartSeries<Row> {
  /** Key of the numeric value in each row. `null`/`undefined`/non-numbers count as missing. */
  key: keyof Row & string
  /** Name shown in the legend, tooltip and table. */
  label: string
  /**
   * Any CSS color, e.g. `'var(--l-blue)'`. BarChart also accepts `(row, index) => color` for one
   * color per bar. Unset: `--sk-chart-1…6` in series order, `--sk-chart-other` from the 7th.
   */
  color?: string | ((row: Row, index: number) => string)
}

/** A legend entry you pass yourself, e.g. to explain per-bar colors. */
export interface ChartLegendItem {
  label: string
  color: string
}

/** What a chart shows when it has no numbers to draw. */
export interface ChartEmpty {
  title: ReactNode
  description?: ReactNode
  /** One action that fixes it, e.g. a Button to widen a filter. */
  action?: ReactNode
  /** Decorative glyph for the `EmptyState` icon square. */
  icon?: ReactNode
}

/** Props every chart shares. */
export interface ChartBaseProps<Row> {
  /** Rows, in display order. */
  data: readonly Row[]
  /** Key of the category / x value in each row. */
  x: keyof Row & string
  /** One entry per series. */
  series: readonly ChartSeries<Row>[]
  /**
   * Plot height in px (axes and legend are extra).
   * @default 220
   */
  height?: number
  /** Number format for values: `Intl` options, or a function for anything else. */
  valueFormat?: Intl.NumberFormatOptions | ((v: number) => string)
  /** Label for an x value (tick, tooltip title, table). Default: `String(value)`. */
  xFormat?: (x: Row[keyof Row], index: number) => string
  /** Header of the x column in the table view. Default: the `x` key, capitalised. */
  xLabel?: string
  /**
   * Locale for numbers. Fixed so the server and the browser print the same string.
   * @default 'en-US'
   */
  locale?: string
  /**
   * About how many value-axis ticks to draw.
   * @default 4
   */
  yTicks?: number
  /**
   * `'auto'` shows a legend for two or more series; pass items to explain custom colors.
   * @default 'auto'
   */
  legend?: 'auto' | false | readonly ChartLegendItem[]
  /** Shown in the plot when there are no numbers. Default title: "No data yet". */
  empty?: ChartEmpty
  /**
   * Draw a skeleton of the same size and set `aria-busy`.
   * @default false
   */
  loading?: boolean
  /**
   * Hover and keyboard tooltips (a small client island). `false` ships no chart JavaScript.
   * @default true
   */
  interactive?: boolean
  /**
   * The data as a table: `'sr-only'` for screen readers, `'details'` behind a native
   * "Show as a table" toggle, `'none'` to leave it out (only if the data is on the page already).
   * @default 'sr-only'
   */
  table?: 'sr-only' | 'details' | 'none'
  /** Replaces the generated screen-reader summary. */
  summary?: string
  /** Stable id for the figure (also seeds internal ids). Default: derived from the data. */
  id?: string
  className?: string
}

/** Charts need an accessible name: exactly one of these. */
export type ChartLabelProps =
  | { 'aria-label': string; 'aria-labelledby'?: never }
  | { 'aria-labelledby': string; 'aria-label'?: never }
