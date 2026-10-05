import { EmptyState, Skeleton, Table } from '@sukunagg/ui'
import { forwardRef, type ReactNode } from 'react'
import { cn } from '../utils/cn'
import type { ChartEmpty } from './types'

/** A label on an axis: position in % (from the top for y, from the left for x). */
export interface AxisLabel {
  pct: number
  label: string
  /** x only: hidden in narrow charts (container query) so labels never overlap. */
  minor?: boolean
}

export interface LegendEntry {
  label: string
  color: string
}

export interface ChartFrameProps {
  id: string
  ariaLabel?: string
  ariaLabelledby?: string
  className?: string
  /** Plot height in px. */
  height: number
  status: 'data' | 'empty' | 'loading'
  /** Value or category labels in the left column (% from the top). */
  yLabels: readonly AxisLabel[]
  /** Gridlines (% from the top); `strong` marks the baseline. */
  grid: readonly { pct: number; strong?: boolean }[]
  /** Labels under the plot (% from the left). */
  xLabels: readonly AxisLabel[]
  /** Longest text that hangs off the plot's right edge (end labels): reserves its width. */
  gutter?: string
  /** Extra space above the plot for labels on the tallest marks, px. */
  topPad?: number
  legend: readonly LegendEntry[] | null
  legendShape: 'square' | 'line'
  empty: ChartEmpty
  summary: string
  table: {
    mode: 'sr-only' | 'details' | 'none'
    head: readonly string[]
    rows: readonly (readonly string[])[]
  }
  /** The interaction island (data state only). */
  overlay?: ReactNode
  /** The marks (data state only). */
  children?: ReactNode
}

const longest = (labels: readonly { label: string }[]): string =>
  labels.reduce((a, l) => (l.label.length > a.length ? l.label : a), '')

/**
 * Everything around a chart's marks: legend, axes, gridlines, the empty and loading states, the
 * screen-reader summary and the table view. Server component; sized entirely by CSS.
 * @internal
 */
export const ChartFrame = forwardRef<HTMLElement, ChartFrameProps>(function ChartFrame(
  {
    id,
    ariaLabel,
    ariaLabelledby,
    className,
    height,
    status,
    yLabels,
    grid,
    xLabels,
    gutter,
    topPad = 0,
    legend,
    legendShape,
    empty,
    summary,
    table,
    overlay,
    children,
  },
  ref,
) {
  const showY = status === 'data' ? yLabels : []
  return (
    <figure
      ref={ref}
      id={id}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={`${id}-summary`}
      aria-busy={status === 'loading' || undefined}
      className={cn('@container m-0 grid min-w-0 gap-3', className)}
    >
      {legend && legend.length > 0 && status === 'data' ? (
        <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-xs text-text-dim">
          {legend.map((l) => (
            <li key={l.label} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={
                  legendShape === 'line'
                    ? 'h-0.5 w-3.5 rounded-full bg-(--sk-legend-color)'
                    : 'size-2.5 rounded-[3px] bg-(--sk-legend-color)'
                }
                style={{ ['--sk-legend-color' as string]: l.color }}
              />
              {l.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div
        className={
          gutter
            ? 'grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2'
            : 'grid grid-cols-[auto_minmax(0,1fr)] gap-x-2'
        }
        style={{ paddingTop: topPad }}
      >
        <div
          aria-hidden="true"
          className="relative text-right text-xs text-text-faint tabular-nums"
          style={{ height }}
        >
          {/* Invisible copy of the widest label sizes the column; the real ones are positioned. */}
          <span className="invisible block h-0 overflow-hidden whitespace-nowrap">
            {longest(showY)}
          </span>
          {showY.map((l) => (
            <span
              key={`${l.pct}-${l.label}`}
              className="absolute right-0 -translate-y-1/2 whitespace-nowrap leading-none"
              style={{ top: `${l.pct}%` }}
            >
              {l.label}
            </span>
          ))}
        </div>

        <div className="relative" style={{ height }}>
          {grid.map((g) => (
            <span
              key={g.pct}
              aria-hidden="true"
              className={
                g.strong
                  ? 'absolute inset-x-0 h-px bg-line'
                  : 'absolute inset-x-0 h-px bg-line-soft'
              }
              style={{ top: `${g.pct}%` }}
            />
          ))}
          {status === 'data' ? children : null}
          {status === 'data' ? overlay : null}
          {status === 'empty' ? (
            <div className="absolute inset-0 grid place-items-center">
              <EmptyState
                size="sm"
                headingLevel="h4"
                title={empty.title}
                icon={empty.icon}
                actions={empty.action}
              >
                {empty.description}
              </EmptyState>
            </div>
          ) : null}
          {status === 'loading' ? (
            <Skeleton aria-hidden="true" className="absolute inset-0" />
          ) : null}
        </div>

        {gutter ? (
          <div aria-hidden="true" className="text-xs font-semibold">
            <span className="invisible block h-0 overflow-hidden whitespace-nowrap">{gutter}</span>
          </div>
        ) : null}

        {xLabels.length > 0 ? (
          <>
            <span />
            <div aria-hidden="true" className="relative mt-1.5 h-4 text-xs text-text-faint">
              {xLabels.map((l) => (
                <span
                  key={`${l.pct}-${l.label}`}
                  className={cn(
                    'absolute top-0 whitespace-nowrap leading-none',
                    l.pct <= 0
                      ? 'translate-x-0'
                      : l.pct >= 100
                        ? '-translate-x-full'
                        : '-translate-x-1/2',
                    l.minor && '@max-md:hidden',
                  )}
                  style={{ left: `${l.pct}%` }}
                >
                  {l.label}
                </span>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <ChartTail id={id} summary={summary} table={table} />
    </figure>
  )
})

/** The data as a table: sr-only, behind a native "Show as a table", or left out. */
export interface ChartTableData {
  mode: 'sr-only' | 'details' | 'none'
  head: readonly string[]
  rows: readonly (readonly string[])[]
}

/**
 * The parts every chart ends with: the screen-reader summary the figure points at
 * (`aria-describedby={`${id}-summary`}`) and the table view. Shared by the axis charts (via
 * ChartFrame) and DonutChart / Heatmap.
 * @internal
 */
export function ChartTail({
  id,
  summary,
  table,
}: {
  id: string
  summary: string
  table: ChartTableData
}) {
  return (
    <>
      <p id={`${id}-summary`} className="sr-only">
        {summary}
      </p>
      {table.mode === 'sr-only' ? (
        <table className="sr-only">
          <thead>
            <tr>
              {table.head.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r) => (
              <tr key={r.join('|')}>
                {r.map((c, i) =>
                  i === 0 ? (
                    <th key={`h${c}`} scope="row">
                      {c}
                    </th>
                  ) : (
                    // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional (one per series)
                    <td key={`${i}-${c}`}>{c}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {table.mode === 'details' ? (
        <details>
          <summary className="w-fit cursor-pointer text-xs font-semibold text-text-dim hover:text-text">
            Show as a table
          </summary>
          <div className="mt-2 overflow-x-auto">
            <Table density="compact">
              <Table.Header>
                <Table.Row>
                  {table.head.map((h) => (
                    <Table.HeaderCell key={h} scope="col">
                      {h}
                    </Table.HeaderCell>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {table.rows.map((r) => (
                  <Table.Row key={r.join('|')}>
                    {r.map((c, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional
                      <Table.Cell key={i}>{c}</Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        </details>
      ) : null}
    </>
  )
}
