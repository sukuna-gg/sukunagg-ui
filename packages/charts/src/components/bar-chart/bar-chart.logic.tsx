import {
  type CSSProperties,
  type ForwardedRef,
  forwardRef,
  type ReactElement,
  type Ref,
} from 'react'
import {
  colorOf,
  devWarn,
  formatter,
  hashId,
  legendColor,
  num,
  titleCase,
} from '../../internal/data'
import { type AxisLabel, ChartFrame, type LegendEntry } from '../../internal/frame'
import { ChartInteraction, type ChartTip } from '../../internal/interaction'
import { bandCenter, bandStart, niceDomain, percent, ticks } from '../../internal/scale'
import type { ChartBaseProps, ChartLabelProps } from '../../internal/types'
import { cn } from '../../utils/cn'
import { barChartStyles } from './bar-chart.styles'

/** Props for {@link BarChart}: the shared chart props plus layout, value labels and the value axis. */
export type BarChartProps<Row> = ChartBaseProps<Row> &
  ChartLabelProps & {
    /**
     * `grouped` (side by side), `stacked` (parts of a total) or `horizontal` (ranked lists, long
     * category names).
     * @default 'grouped'
     */
    layout?: 'grouped' | 'stacked' | 'horizontal'
    /**
     * Print each bar's value at its end (stacked: the total on top). `horizontal` always does.
     * `0` prints "0"; a missing value prints "–".
     * @default false
     */
    valueLabels?: boolean
    /** Value axis range. Default: 0 to a round number above the largest value. Must include 0. */
    yDomain?: readonly [number, number]
  }

/** Row pitch of the horizontal layout, px. */
const ROW_PX = 32

const bar = (color: string, style: CSSProperties): CSSProperties =>
  ({ ...style, ['--sk-bar-color' as string]: color }) as CSSProperties

function BarChartImpl<Row>(props: BarChartProps<Row>, ref: ForwardedRef<HTMLElement>) {
  const {
    data,
    x,
    series,
    height,
    valueFormat,
    xFormat,
    xLabel,
    locale = 'en-US',
    yTicks = 4,
    legend = 'auto',
    empty,
    loading = false,
    interactive = true,
    table = 'sr-only',
    summary,
    id,
    className,
    layout = 'grouped',
    valueLabels = false,
    yDomain,
  } = props
  const ariaLabel = props['aria-label']
  const ariaLabelledby = props['aria-labelledby']
  const s = barChartStyles({ layout })
  const fmt = formatter(valueFormat, locale)
  const horizontal = layout === 'horizontal'
  const n = data.length

  const cats = data.map((row, i) => (xFormat ? xFormat(row[x], i) : String(row[x])))
  // values[row][series]; negatives are drawn as 0 (dev warning) — bars grow from a 0 baseline.
  const values = data.map((row) => series.map((se) => num(row[se.key])))
  const known = values.flat().filter((v): v is number => v !== null)
  if (known.some((v) => v < 0)) devWarn('BarChart draws negative values as 0.')
  const drawn = (v: number | null) => (v === null ? null : Math.max(0, v))
  const totals = values.map((r) =>
    r.reduce<number | null>((a, v) => (v === null ? a : (a ?? 0) + Math.max(0, v)), null),
  )
  const status = loading ? 'loading' : known.length > 0 ? 'data' : 'empty'

  const max = Math.max(0, ...(layout === 'stacked' ? totals.map((t) => t ?? 0) : known))
  const [lo, hi] = yDomain ?? (horizontal ? [0, max || 1] : niceDomain(0, max || 1, yTicks))
  if (lo > 0) devWarn('BarChart yDomain must include 0; using 0 as the baseline.')
  const d0 = Math.min(0, lo)
  const toPct = percent(d0, hi)
  const pctOf = (v: number) => Math.min(100, Math.max(0, toPct(v)))

  const bandW = 100 / Math.max(1, n)
  const showCaps = valueLabels || horizontal
  const label = (v: number | null) => (v === null ? '–' : fmt(v))

  // --- axes ---------------------------------------------------------------------------------
  let yLabels: AxisLabel[] = []
  let grid: { pct: number; strong?: boolean }[] = []
  let xLabels: AxisLabel[] = []
  if (horizontal) {
    yLabels = cats.map((c, i) => ({ pct: bandCenter(i, n), label: c }))
  } else {
    const tickVals = ticks(d0, hi, yTicks)
    grid = tickVals.map((t) => ({ pct: 100 - pctOf(t), strong: t === d0 }))
    yLabels = tickVals.map((t) => ({ pct: 100 - pctOf(t), label: fmt(t) }))
    const step = Math.ceil(n / 12)
    const shown = cats.map((c, i) => ({ c, i })).filter(({ i }) => i % step === 0)
    xLabels = shown.map(({ c, i }, k) => ({
      pct: bandCenter(i, n),
      label: c,
      minor: shown.length > 6 && k % 2 === 1,
    }))
  }

  // --- marks --------------------------------------------------------------------------------
  const marks = data.map((row, i) => {
    const r = values[i] as (number | null)[]
    const place: CSSProperties = horizontal
      ? { top: `${bandStart(i, n)}%`, height: `${bandW}%` }
      : { left: `${bandStart(i, n)}%`, width: `${bandW}%`, paddingInline: `${bandW * 0.14}%` }

    if (layout === 'stacked') {
      let acc = 0
      const lastDrawn = r.reduce<number>((a, v, j) => ((drawn(v) ?? 0) > 0 ? j : a), -1)
      const total = totals[i] ?? null
      return (
        <div key={cats[i]} className={s.band()} style={place}>
          <div className={s.slot()}>
            {series.map((se, j) => {
              const v = drawn(r[j] ?? null)
              if (!v) return null
              const bottom = pctOf(acc)
              acc += v
              return (
                <div
                  key={se.key}
                  className={cn(
                    s.segment(),
                    j === lastDrawn && 'rounded-t-[4px]',
                    bottom > 0 && 'border-b-2 border-surface',
                  )}
                  style={bar(colorOf(se, j, row, i), {
                    bottom: `${bottom}%`,
                    height: `${pctOf(acc) - bottom}%`,
                  })}
                />
              )
            })}
            {showCaps ? (
              <span
                className={s.cap({ class: total === null ? s.capMissing() : undefined })}
                style={{ bottom: `calc(${total === null ? 0 : pctOf(total)}% + 4px)` }}
              >
                {label(total)}
              </span>
            ) : null}
          </div>
        </div>
      )
    }

    return (
      <div key={cats[i]} className={s.band()} style={place}>
        {series.map((se, j) => {
          const raw = r[j] ?? null
          const v = drawn(raw)
          const size = v === null ? 0 : pctOf(v)
          return (
            <div key={se.key} className={s.slot()}>
              {size > 0 ? (
                <div
                  className={s.bar()}
                  style={bar(
                    colorOf(se, j, row, i),
                    horizontal ? { width: `${size}%` } : { height: `${size}%` },
                  )}
                />
              ) : null}
              {showCaps ? (
                <span
                  className={s.cap({ class: raw === null ? s.capMissing() : undefined })}
                  style={
                    horizontal
                      ? { left: `calc(${size}% + 6px)` }
                      : { bottom: `calc(${size}% + 4px)` }
                  }
                >
                  {label(raw)}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    )
  })

  // --- legend, tooltips, table, summary -----------------------------------------------------
  let legendItems: LegendEntry[] | null = null
  if (Array.isArray(legend)) legendItems = [...legend]
  else if (legend === 'auto' && series.length > 1)
    legendItems = series.flatMap((se, j) => {
      const color = legendColor(se, j)
      return color ? [{ label: se.label, color }] : []
    })

  const tips: ChartTip[] = data.map((row, i) => {
    const r = values[i] as (number | null)[]
    const rows: ChartTip['rows'] = series.map((se, j) => ({
      label: se.label,
      value: r[j] === null ? 'Not reported' : fmt(r[j] as number),
      color: colorOf(se, j, row, i),
    }))
    if (layout === 'stacked') {
      const t = totals[i] ?? null
      rows.push({ label: 'Total', value: t === null ? 'Not reported' : fmt(t) })
    }
    return { title: cats[i] as string, rows }
  })
  const reach = values.map((r, i) =>
    layout === 'stacked' ? (totals[i] ?? 0) : Math.max(0, ...r.map((v) => drawn(v) ?? 0)),
  )

  const head = [
    xLabel ?? titleCase(x),
    ...series.map((se) => se.label),
    ...(layout === 'stacked' ? ['Total'] : []),
  ]
  const rows = values.map((r, i) => [
    cats[i] as string,
    ...r.map((v) => (v === null ? 'Not reported' : fmt(v))),
    ...(layout === 'stacked'
      ? [totals[i] === null ? 'Not reported' : fmt(totals[i] as number)]
      : []),
  ])

  const name = ariaLabel ?? ''
  const prefix = name ? `${name}: ` : ''
  const generated =
    status === 'loading'
      ? `${prefix}loading`
      : status === 'empty'
        ? `${prefix}${typeof empty?.title === 'string' ? empty.title : 'no data yet'}`
        : series.length === 1
          ? `${prefix}${cats.map((c, i) => `${c} ${label(values[i]?.[0] ?? null)}`).join(', ')}`
          : `${prefix}${cats
              .map(
                (c, i) =>
                  `${c}: ${series.map((se, j) => `${se.label} ${label(values[i]?.[j] ?? null)}`).join(', ')}`,
              )
              .join('; ')}`

  // Horizontal value labels hang past the bar ends: reserve the widest one's width on the right.
  const capsText = horizontal ? values.flat().map((v) => label(v)) : []

  const frameId =
    id ??
    hashId(
      JSON.stringify([
        ariaLabel ?? ariaLabelledby,
        x,
        series.map((se) => se.key),
        layout,
        cats,
        values,
      ]),
    )

  return (
    <ChartFrame
      ref={ref}
      id={frameId}
      ariaLabel={ariaLabel}
      ariaLabelledby={ariaLabelledby}
      className={className}
      height={height ?? (horizontal ? Math.max(1, n) * ROW_PX : 220)}
      status={status}
      yLabels={yLabels}
      grid={grid}
      xLabels={xLabels}
      gutter={horizontal ? capsText.reduce((a, t) => (t.length > a.length ? t : a), '') : undefined}
      topPad={showCaps && !horizontal ? 18 : 0}
      legend={legendItems}
      legendShape="square"
      empty={empty ?? { title: 'No data yet' }}
      summary={summary ?? generated}
      table={{ mode: table, head, rows }}
      overlay={
        interactive ? (
          <ChartInteraction
            label={name || 'Bar chart'}
            axis={horizontal ? 'y' : 'x'}
            positions={cats.map((_c, i) => bandCenter(i, n))}
            band={bandW}
            anchors={reach.map((v) => (horizontal ? pctOf(v) : 100 - pctOf(v)))}
            tips={tips}
          />
        ) : null
      }
    >
      {marks}
    </ChartFrame>
  )
}

/**
 * Compares amounts across categories, server-rendered: games per placement, kills per weapon by
 * season, revenue per plan, pick rate per agent.
 *
 * @remarks
 * - SSR/RSC: a server component. Bars, labels and gridlines are HTML sized by CSS, so the first
 *   paint is the final layout at any width; hover and arrow-key tooltips come from a small client
 *   island (`interactive={false}` ships none).
 * - Missing data: `null` draws no bar and labels "–" / "Not reported"; a real `0` labels "0".
 *   With no numbers at all the plot shows `empty` (default "No data yet") at full size.
 * - Accessibility: a `<figure>` named by `aria-label`/`aria-labelledby` (required), described by
 *   a generated summary, with the data as a table (`table`: sr-only by default, or `'details'`).
 *   Keyboard: one tab stop; arrow keys move between categories, Escape hides the tooltip.
 * - Variants: `layout` 'grouped' (default) | 'stacked' | 'horizontal'; `valueLabels`.
 * - Colors: `--sk-chart-1…6` by series; `series[].color` takes any CSS color or a per-row
 *   function for one color per bar — explain those with `legend` items.
 *
 * @example
 * ```tsx
 * import { BarChart } from '@sukunagg/charts'
 *
 * const bucket = (i: number) => (i === 0 ? 'var(--t-first)' : i < 4 ? 'var(--t-top4)' : 'var(--t-bot)')
 *
 * <BarChart
 *   aria-label="Placement distribution, last 20 ranked games"
 *   data={counts.map((games, i) => ({ place: ordinal(i + 1), games }))}
 *   x="place"
 *   series={[{ key: 'games', label: 'Games', color: (_row, i) => bucket(i) }]}
 *   legend={[{ label: '1st', color: 'var(--t-first)' }, { label: 'Top 4', color: 'var(--t-top4)' }, { label: 'Bottom 4', color: 'var(--t-bot)' }]}
 *   valueLabels
 *   table="details"
 * />
 * ```
 */
// forwardRef erases the `Row` generic; the cast restores it so `x` and `series[].key` are checked
// against the rows you pass.
export const BarChart = forwardRef(BarChartImpl) as unknown as <Row>(
  props: BarChartProps<Row> & { ref?: Ref<HTMLElement> },
) => ReactElement | null
