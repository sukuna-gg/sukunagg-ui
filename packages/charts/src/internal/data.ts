import type { ChartBaseProps, ChartSeries } from './types'

/** A row value as a number, or `null` when missing (null, undefined, NaN, non-numbers). */
export function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Formats chart values with the caller's `Intl` options or function and a fixed locale. */
export function formatter(
  format: ChartBaseProps<unknown>['valueFormat'],
  locale = 'en-US',
): (v: number) => string {
  if (typeof format === 'function') return format
  const nf = new Intl.NumberFormat(locale, format)
  return (v) => nf.format(v)
}

/** Default series color: `--sk-chart-1…6` in order, `--sk-chart-other` from the 7th. */
export const defaultColor = (i: number): string =>
  i < 6 ? `var(--sk-chart-${i + 1})` : 'var(--sk-chart-other)'

/** A series' color for one row (per-bar functions resolve here). */
export function colorOf<Row>(s: ChartSeries<Row>, i: number, row: Row, rowIndex: number): string {
  if (typeof s.color === 'function') return s.color(row, rowIndex)
  return s.color ?? defaultColor(i)
}

/** The series' single color for the legend, or `null` when it varies per row. */
export function legendColor<Row>(s: ChartSeries<Row>, i: number): string | null {
  if (typeof s.color === 'function') return null
  return s.color ?? defaultColor(i)
}

/** "placement" → "Placement" for the table header. */
export const titleCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * A short deterministic id from a string (djb2), so server and client markup agree without
 * `useId` (charts are server components and call no hooks).
 */
export function hashId(seed: string): string {
  let h = 5381
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0
  return `skc-${(h >>> 0).toString(36)}`
}

/** Dev-only console warning; silent in production builds. */
export function devWarn(message: string): void {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return
  console.warn(`[@sukunagg/charts] ${message}`)
}
