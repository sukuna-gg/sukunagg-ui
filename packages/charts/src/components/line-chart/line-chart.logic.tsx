import {
  type CSSProperties,
  type ForwardedRef,
  forwardRef,
  type ReactElement,
  type Ref,
} from 'react'
import {
  defaultColor,
  devWarn,
  formatter,
  hashId,
  legendColor,
  num,
  titleCase,
} from '../../internal/data'
import { type AxisLabel, ChartFrame, type LegendEntry } from '../../internal/frame'
import { ChartInteraction, type ChartTip } from '../../internal/interaction'
import { areaPath, linePath, type Pt, runs } from '../../internal/path'
import { niceDomain, percent, pointX, ticks } from '../../internal/scale'
import type { ChartBaseProps, ChartLabelProps } from '../../internal/types'
import { lineChartStyles } from './line-chart.styles'

/** LineChart's own props (AreaChart has these too). */
export interface LineChartOwnProps<Row> {
  /**
   * `linear` joins points with straight lines (honest); `monotone` smooths without overshooting.
   * @default 'linear'
   */
  curve?: 'linear' | 'monotone'
  /** Value axis range. Default: a round range around the data — a line need not start at 0. */
  yDomain?: readonly [number, number]
  /** Exact tick values instead of round ones, e.g. `[1, 4, 8]` for placements. */
  yTickValues?: readonly number[]
  /** Label for a tick value. Default: `valueFormat`. */
  yTickFormat?: (v: number) => string
  /**
   * Smaller values at the top, e.g. placements (1st on top).
   * @default false
   */
  reverse?: boolean
  /** A shaded value range, e.g. `{ from: 1, to: 4, label: 'Top 4' }`. Color default `--sk-chart-3`. */
  band?: { from: number; to: number; label?: string; color?: string }
  /** Horizontal reference lines, e.g. `[{ value: 3.84, label: 'avg 3.84' }]`. */
  references?: readonly { value: number; label: string }[]
  /**
   * Dots: `none`, the latest point of each series (`last`), or every point (`all`).
   * @default 'last' ('all' when `pointColor` is set)
   */
  points?: 'none' | 'last' | 'all'
  /** Per-point dot color (e.g. placement buckets); the line keeps the series color. */
  pointColor?: (row: Row, index: number, seriesKey: string) => string
  /**
   * Labels after the last point: `auto` = the value for one series, the series name for several.
   * @default 'auto'
   */
  endLabels?: 'auto' | 'value' | 'series' | false
  /**
   * How a run of missing values (in every series) is drawn: `shade` tints it and says
   * "Not reported"; `none` only breaks the line.
   * @default 'shade'
   */
  gaps?: 'shade' | 'none'
  /** Fewer known points than this → "Not enough data for a chart". Default 1 (AreaChart 2). */
  minPoints?: number
}

/** Props for {@link LineChart}. */
export type LineChartProps<Row> = ChartBaseProps<Row> & ChartLabelProps & LineChartOwnProps<Row>

/** Props for {@link AreaChart}: LineChart's plus the fill. */
export type AreaChartProps<Row> = LineChartProps<Row> & {
  /** Value the fill reaches. Default: the bottom of the value axis. */
  baseline?: number
  /** Diverging fill (one series): color above `baseline`… */
  above?: string
  /** …and below it. */
  below?: string
  /**
   * Make the value axis symmetric around `baseline` (who is ahead, by how much).
   * @default false
   */
  symmetric?: boolean
}

type AnyProps<Row> = AreaChartProps<Row> & { area: boolean }

/** Rounds a derived position (a difference of two positions) to 3 decimals, like `percent`. */
const round3 = (n: number): number => Math.round(n * 1000) / 1000

const vars = (style: CSSProperties, v: Record<string, string>): CSSProperties =>
  ({ ...style, ...Object.fromEntries(Object.entries(v)) }) as CSSProperties

function render<Row>(props: AnyProps<Row>, ref: ForwardedRef<HTMLElement>) {
  const {
    area,
    data,
    x,
    series,
    height = 220,
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
    curve = 'linear',
    yDomain,
    yTickValues,
    yTickFormat,
    reverse = false,
    band,
    references = [],
    pointColor,
    endLabels = 'auto',
    gaps = 'shade',
    baseline,
    above,
    below,
    symmetric = false,
  } = props
  const points = props.points ?? (pointColor ? 'all' : 'last')
  const minPoints = props.minPoints ?? (area ? 2 : 1)
  const ariaLabel = props['aria-label']
  const ariaLabelledby = props['aria-labelledby']
  const s = lineChartStyles()
  const fmt = formatter(valueFormat, locale)
  const n = data.length
  const xs = data.map((_r, i) => pointX(i, n))
  const cats = data.map((row, i) => (xFormat ? xFormat(row[x], i) : String(row[x])))
  const vals = series.map((se) => data.map((row) => num(row[se.key])))
  const known = vals.flat().filter((v): v is number => v !== null)
  const most = Math.max(0, ...vals.map((v) => v.filter((x) => x !== null).length))
  const diverging = area && (above !== undefined || below !== undefined)
  // A diverging fill carries the color; its line, dots and swatches stay neutral unless set.
  const colors = series.map((se, j) =>
    diverging && !se.color ? 'var(--sk-text-dim)' : (legendColor(se, j) ?? defaultColor(j)),
  )
  if (diverging && series.length > 1)
    devWarn('AreaChart above/below fills are for a single series.')

  const status = loading ? 'loading' : known.length === 0 || most < minPoints ? 'empty' : 'data'
  const emptyCfg = empty ?? {
    title: known.length > 0 ? 'Not enough data for a chart' : 'No data yet',
  }

  // --- value axis ---------------------------------------------------------------------------
  let lo: number
  let hi: number
  if (yDomain) [lo, hi] = yDomain
  else if (area && symmetric) {
    const b = baseline ?? 0
    const reach = Math.max(0, ...known.map((v) => Math.abs(v - b)))
    const top = niceDomain(0, reach || 1, yTicks)[1]
    lo = b - top
    hi = b + top
  } else {
    const extra = [...references.map((r) => r.value), ...(baseline === undefined ? [] : [baseline])]
    const all = [...known, ...extra]
    ;[lo, hi] = niceDomain(Math.min(...all), Math.max(...all), yTicks)
  }
  const toPct = percent(lo, hi)
  const yPct = (v: number) => (reverse ? toPct(v) : 100 - toPct(v))
  const bottomValue = reverse ? hi : lo
  const base = baseline ?? bottomValue
  const tickVals = yTickValues ? [...yTickValues] : ticks(lo, hi, yTicks)
  const tickLabel = yTickFormat ?? fmt
  const strong = area && baseline !== undefined ? baseline : bottomValue
  const grid = [
    ...tickVals.map((t) => ({ pct: yPct(t), strong: t === strong })),
    // The baseline always gets its line, even when it isn't a tick (e.g. a padded domain).
    ...(tickVals.includes(strong) ? [] : [{ pct: yPct(strong), strong: true }]),
  ]
  const yLabels: AxisLabel[] = tickVals.map((t) => ({ pct: yPct(t), label: tickLabel(t) }))
  const step = Math.ceil(n / 8)
  const shown = cats.map((c, i) => ({ c, i })).filter(({ i }) => i % step === 0)
  const xLabels: AxisLabel[] = shown.map(({ c, i }, k) => ({
    pct: xs[i] as number,
    label: c,
    minor: shown.length > 4 && k % 2 === 1,
  }))

  // --- geometry -----------------------------------------------------------------------------
  const pts = vals.map((v) =>
    v.map((value, i): Pt | null =>
      value === null ? null : { x: xs[i] as number, y: yPct(value) },
    ),
  )
  const frameId =
    id ??
    hashId(
      JSON.stringify([
        ariaLabel ?? ariaLabelledby,
        x,
        series.map((se) => se.key),
        area,
        cats,
        vals,
      ]),
    )
  const baseY = yPct(base)

  // Runs where every series is missing: shaded and labelled so the gap is never read as data.
  const allMissing = data.map((_r, i) => vals.every((v) => v[i] === null))
  const gapRuns =
    gaps === 'shade'
      ? runs(allMissing.map((m, i) => (m ? { x: i, y: 0 } : null))).map((r) => {
          const first = r.start
          const last = r.start + r.pts.length - 1
          const left = first === 0 ? 0 : (xs[first - 1] as number)
          const right = last === n - 1 ? 100 : (xs[last + 1] as number)
          return { key: first, left, width: round3(right - left) }
        })
      : []

  const lastKnown = vals.map((v) => {
    for (let i = v.length - 1; i >= 0; i--) if (v[i] !== null) return i
    return -1
  })
  const endMode = endLabels === 'auto' ? (series.length > 1 ? 'series' : 'value') : endLabels
  const endText = series.map((se, j) => {
    const i = lastKnown[j] as number
    return endMode === 'series' ? se.label : i < 0 ? '' : fmt(vals[j]?.[i] as number)
  })
  const gutter = [...(endMode ? endText : []), ...references.map((r) => r.label)].reduce(
    (a, t) => (t.length > a.length ? t : a),
    '',
  )

  const marks = (
    <>
      {band ? (
        <>
          <div
            className={s.band()}
            style={vars(
              {
                top: `${Math.min(yPct(band.from), yPct(band.to))}%`,
                height: `${round3(Math.abs(yPct(band.to) - yPct(band.from)))}%`,
              },
              { '--sk-band-color': band.color ?? 'var(--sk-chart-3)' },
            )}
          />
          {band.label ? (
            <span
              className={s.bandLabel()}
              style={{ top: `${Math.min(yPct(band.from), yPct(band.to))}%` }}
            >
              {band.label}
            </span>
          ) : null}
        </>
      ) : null}
      {gapRuns.map((g) => (
        <div key={g.key} className={s.gap()} style={{ left: `${g.left}%`, width: `${g.width}%` }}>
          <span className={s.gapLabel()}>Not reported</span>
        </div>
      ))}
      {references.map((r) => (
        <div key={r.label} className={s.reference()} style={{ top: `${yPct(r.value)}%` }}>
          <span className="absolute left-[calc(100%+8px)] -translate-y-1/2 text-xs whitespace-nowrap text-text-dim">
            {r.label}
          </span>
        </div>
      ))}
      <svg
        aria-hidden="true"
        focusable="false"
        className={s.svg()}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {diverging ? (
          <defs>
            <clipPath id={`${frameId}-above`}>
              <rect x="-1" y="-1" width="102" height={baseY + 1} />
            </clipPath>
            <clipPath id={`${frameId}-below`}>
              <rect x="-1" y={baseY} width="102" height={101 - baseY} />
            </clipPath>
          </defs>
        ) : null}
        {area
          ? pts.map((p, j) =>
              diverging ? (
                <g key={series[j]?.key}>
                  <path
                    className={s.split()}
                    d={areaPath(p, baseY, curve)}
                    clipPath={`url(#${frameId}-above)`}
                    style={{ fill: above ?? 'var(--sk-chart-2)' }}
                  />
                  <path
                    className={s.split()}
                    d={areaPath(p, baseY, curve)}
                    clipPath={`url(#${frameId}-below)`}
                    style={{ fill: below ?? 'var(--sk-chart-1)' }}
                  />
                </g>
              ) : (
                <path
                  key={series[j]?.key}
                  className={s.area()}
                  d={areaPath(p, baseY, curve)}
                  style={vars({}, { '--sk-series-color': colors[j] as string })}
                />
              ),
            )
          : null}
        {pts.map((p, j) => (
          <path
            key={series[j]?.key}
            className={s.line()}
            d={linePath(p, curve)}
            strokeWidth={2}
            style={vars({}, { '--sk-series-color': colors[j] as string })}
          />
        ))}
      </svg>
      {pts.map((p, j) => {
        const se = series[j] as (typeof series)[number]
        const lone = new Set(
          runs(p)
            .filter((r) => r.pts.length === 1)
            .map((r) => r.start),
        )
        return p.map((pt, i) => {
          if (!pt) return null
          const isLast = i === lastKnown[j]
          const showDot = points === 'all' || (points === 'last' && isLast)
          if (!showDot && !lone.has(i)) return null
          const color = pointColor ? pointColor(data[i] as Row, i, se.key) : (colors[j] as string)
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: a dot's identity is its series + position
              key={`${se.key}-${i}`}
              className={showDot ? s.dot() : s.lone()}
              style={vars({ left: `${pt.x}%`, top: `${pt.y}%` }, { '--sk-dot-color': color })}
            />
          )
        })
      })}
      {endMode
        ? series.map((se, j) => {
            const i = lastKnown[j] as number
            const pt = pts[j]?.[i]
            return pt ? (
              <span
                key={se.key}
                className={s.endLabel({ endTone: endMode })}
                style={{ top: `${pt.y}%` }}
              >
                {endText[j]}
              </span>
            ) : null
          })
        : null}
    </>
  )

  // --- legend, tooltips, table, summary -----------------------------------------------------
  let legendItems: LegendEntry[] | null = null
  if (Array.isArray(legend)) legendItems = [...legend]
  else if (legend === 'auto' && series.length > 1)
    legendItems = series.map((se, j) => ({ label: se.label, color: colors[j] as string }))

  const tips: ChartTip[] = data.map((_row, i) => ({
    title: cats[i] as string,
    rows: series.map((se, j) => {
      const v = vals[j]?.[i] ?? null
      return { label: se.label, value: v === null ? 'Not reported' : fmt(v), color: colors[j] }
    }),
  }))
  const anchors = data.map((_r, i) => {
    const ys = pts.map((p) => p[i]?.y).filter((y): y is number => y !== undefined)
    return ys.length ? Math.min(...ys) : null
  })

  const head = [xLabel ?? titleCase(x), ...series.map((se) => se.label)]
  const rows = data.map((_r, i) => [
    cats[i] as string,
    ...vals.map((v) => (v[i] === null ? 'Not reported' : fmt(v[i] as number))),
  ])

  const name = ariaLabel ?? ''
  const prefix = name ? `${name}: ` : ''
  const describe = (j: number) => {
    const v = (vals[j] as (number | null)[]).filter((x): x is number => x !== null)
    const se = series[j] as (typeof series)[number]
    if (v.length === 1) return `${se.label} ${fmt(v[0] as number)}`
    return `${se.label} from ${fmt(v[0] as number)} to ${fmt(v[v.length - 1] as number)} over ${n} points`
  }
  const generated =
    status === 'loading'
      ? `${prefix}loading`
      : status === 'empty'
        ? `${prefix}${typeof emptyCfg.title === 'string' ? emptyCfg.title : 'no data yet'}`
        : `${prefix}${series.map((_se, j) => describe(j)).join('; ')}`

  return (
    <ChartFrame
      ref={ref}
      id={frameId}
      ariaLabel={ariaLabel}
      ariaLabelledby={ariaLabelledby}
      className={className}
      height={height}
      status={status}
      yLabels={yLabels}
      grid={grid}
      xLabels={xLabels}
      gutter={gutter || undefined}
      legend={legendItems}
      legendShape="line"
      empty={emptyCfg}
      summary={summary ?? generated}
      table={{ mode: table, head, rows }}
      overlay={
        interactive ? (
          <ChartInteraction
            label={name || (area ? 'Area chart' : 'Line chart')}
            axis="x"
            positions={xs}
            marks={pts.map((p, j) => ({
              color: colors[j] as string,
              at: p.map((pt) => (pt ? pt.y : null)),
            }))}
            anchors={anchors}
            tips={tips}
          />
        ) : null
      }
    >
      {marks}
    </ChartFrame>
  )
}

function LineChartImpl<Row>(props: LineChartProps<Row>, ref: ForwardedRef<HTMLElement>) {
  return render({ ...props, area: false }, ref)
}

function AreaChartImpl<Row>(props: AreaChartProps<Row>, ref: ForwardedRef<HTMLElement>) {
  return render({ ...props, area: true }, ref)
}

/**
 * Change across an ordered axis, server-rendered: rating over the last matches, damage per round
 * by role per week, placement per game.
 *
 * @remarks
 * - SSR/RSC: a server component. Lines are one stretched SVG with non-scaling 2px strokes; dots,
 *   labels and gridlines are HTML, so text stays crisp and nothing is measured on the client.
 *   Hover and arrow-key tooltips come from a small client island (`interactive={false}` ships none).
 * - Missing data: `null` breaks the line (never drawn as 0); a run missing in every series is
 *   shaded "Not reported" (`gaps`). A lone point between gaps is a dot.
 * - Accessibility: a `<figure>` named by `aria-label`/`aria-labelledby` (required), described by a
 *   generated summary ("Rating from 1,838 to 2,012 over 30 points"), with the data as a table.
 *   Two or more series get a legend and end labels, so identity never rests on color alone.
 * - Options: `reverse` (1st on top), `band` (a shaded range), `references` (an average line),
 *   `pointColor` (per-point dots), `curve`.
 *
 * @example
 * ```tsx
 * import { LineChart } from '@sukunagg/charts'
 *
 * <LineChart
 *   aria-label="Placement over the last 20 games"
 *   data={games}
 *   x="game"
 *   series={[{ key: 'placement', label: 'Placement' }]}
 *   reverse
 *   yDomain={[1, 8]}
 *   band={{ from: 1, to: 4, label: 'Top 4' }}
 *   pointColor={(g) => (g.placement === 1 ? 'var(--t-first)' : g.placement <= 4 ? 'var(--t-top4)' : 'var(--t-bot)')}
 * />
 * ```
 */
export const LineChart = forwardRef(LineChartImpl) as unknown as <Row>(
  props: LineChartProps<Row> & { ref?: Ref<HTMLElement> },
) => ReactElement | null

/**
 * A LineChart with a fill: down to a baseline, or split above/below it to show who is ahead.
 *
 * @remarks
 * - Everything in {@link LineChart} applies (server-rendered, gaps, table, keyboard).
 * - `baseline` (default: the bottom of the axis); `above` / `below` color a diverging fill for one
 *   series; `symmetric` centres the axis on the baseline. Needs two known points (`minPoints`).
 * - Explain a diverging fill with `legend` items ("Blue side ahead" / "Red side ahead").
 *
 * @example
 * ```tsx
 * import { AreaChart } from '@sukunagg/charts'
 *
 * <AreaChart
 *   aria-label="Gold difference, blue minus red, by minute"
 *   data={timeline.gold_diff.map((gold, minute) => ({ minute, gold }))}
 *   x="minute"
 *   xFormat={(m) => `${m}m`}
 *   series={[{ key: 'gold', label: 'Blue − red' }]}
 *   baseline={0}
 *   symmetric
 *   above="var(--l-blue)"
 *   below="var(--l-red)"
 *   legend={[{ label: 'Blue side ahead', color: 'var(--l-blue)' }, { label: 'Red side ahead', color: 'var(--l-red)' }]}
 * />
 * ```
 */
export const AreaChart = forwardRef(AreaChartImpl) as unknown as <Row>(
  props: AreaChartProps<Row> & { ref?: Ref<HTMLElement> },
) => ReactElement | null
