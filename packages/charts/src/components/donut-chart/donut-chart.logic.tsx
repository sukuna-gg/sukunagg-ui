import { EmptyState, Skeleton } from '@sukunagg/ui'
import {
  type CSSProperties,
  type ForwardedRef,
  forwardRef,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { formatter, hashId, num, titleCase } from '../../internal/data'
import { ChartTail } from '../../internal/frame'
import type { ChartEmpty, ChartLabelProps } from '../../internal/types'
import { donutChartStyles } from './donut-chart.styles'

/** Props for {@link DonutChart}. */
export type DonutChartProps<Row> = ChartLabelProps & {
  /** Parts, in display order. */
  data: readonly Row[]
  /** Key of each part's name. */
  x: keyof Row & string
  /** Key of each part's amount. `null` / non-numbers are missing: left out and noted. */
  y: keyof Row & string
  /**
   * Colored parts before the rest fold into "Other".
   * @default 3
   */
  maxSegments?: number
  /** Per-part color (any CSS color). Default `--sk-chart-1…3`; Other is `--sk-chart-other`. */
  color?: (row: Row, index: number) => string
  /** Text in the middle. Default: the formatted total. */
  centerValue?: ReactNode
  /** Small text under the middle value, e.g. "hours". */
  centerCaption?: ReactNode
  /**
   * Diameter in px.
   * @default 160
   */
  size?: number
  /**
   * Ring width in px.
   * @default 22
   */
  thickness?: number
  valueFormat?: Intl.NumberFormatOptions | ((v: number) => string)
  /**
   * Locale for numbers, fixed so server and browser output match.
   * @default 'en-US'
   */
  locale?: string
  /**
   * Show the legend with each part's share.
   * @default true
   */
  legend?: boolean
  /** Shown beside an empty ring. Default title: "No data yet". */
  empty?: ChartEmpty
  loading?: boolean
  /** @default 'sr-only' */
  table?: 'sr-only' | 'details' | 'none'
  summary?: string
  id?: string
  className?: string
}

interface Part {
  label: string
  value: number
  color: string
}

const pct = (part: number, total: number) => `${Math.round((part / total) * 100)}%`

/** Ring segment from angle a0 to a1 (radians from the top, clockwise) in a 0–100 viewBox. */
function arc(r0: number, r1: number, a0: number, a1: number, gap: number): string {
  // Half the gap as an angle at each radius keeps the gap parallel (same width inside and out).
  const o0 = a0 + gap / 2 / r1
  const o1 = a1 - gap / 2 / r1
  const i0 = a0 + gap / 2 / r0
  const i1 = a1 - gap / 2 / r0
  const pt = (r: number, a: number) =>
    `${(50 + r * Math.sin(a)).toFixed(3)},${(50 - r * Math.cos(a)).toFixed(3)}`
  const big = (x: number, y: number) => (y - x > Math.PI ? 1 : 0)
  return `M${pt(r1, o0)}A${r1},${r1} 0 ${big(o0, o1)} 1 ${pt(r1, o1)}L${pt(r0, i1)}A${r0},${r0} 0 ${big(i0, i1)} 0 ${pt(r0, i0)}Z`
}

function DonutChartImpl<Row>(props: DonutChartProps<Row>, ref: ForwardedRef<HTMLElement>) {
  const {
    data,
    x,
    y,
    maxSegments = 3,
    color,
    centerValue,
    centerCaption,
    size = 160,
    thickness = 22,
    valueFormat,
    locale = 'en-US',
    legend = true,
    empty,
    loading = false,
    table = 'sr-only',
    summary,
    id,
    className,
  } = props
  const ariaLabel = props['aria-label']
  const ariaLabelledby = props['aria-labelledby']
  const s = donutChartStyles()
  const fmt = formatter(valueFormat, locale)

  const rows = data.map((row, i) => ({ row, i, label: String(row[x]), value: num(row[y]) }))
  const missing = rows.filter((r) => r.value === null).length
  const known = rows.filter((r) => r.value !== null && (r.value as number) > 0)
  const total = known.reduce((a, r) => a + (r.value as number), 0)

  // Keep `maxSegments` colored parts; fold the rest into "Other" when more than one remains.
  const fold = known.length > maxSegments + 1
  const parts: Part[] = (fold ? known.slice(0, maxSegments) : known).map((r, k) => ({
    label: r.label,
    value: r.value as number,
    color: color ? color(r.row, r.i) : k < 6 ? `var(--sk-chart-${k + 1})` : 'var(--sk-chart-other)',
  }))
  if (fold)
    parts.push({
      label: 'Other',
      value: known.slice(maxSegments).reduce((a, r) => a + (r.value as number), 0),
      color: 'var(--sk-chart-other)',
    })

  const status = loading ? 'loading' : total > 0 ? 'data' : 'empty'
  const r1 = 50
  const r0 = 50 - (thickness / size) * 100
  const gap = parts.length > 1 ? (2 / size) * 100 : 0
  let angle = 0
  const segments = parts.map((p) => {
    const a0 = angle
    angle += (p.value / total) * Math.PI * 2
    return { ...p, d: parts.length === 1 ? null : arc(r0, r1, a0, angle, gap) }
  })

  const frameId =
    id ??
    hashId(JSON.stringify([ariaLabel ?? ariaLabelledby, x, y, rows.map((r) => [r.label, r.value])]))
  const name = ariaLabel ?? ''
  const prefix = name ? `${name}: ` : ''
  const generated =
    status === 'loading'
      ? `${prefix}loading`
      : status === 'empty'
        ? `${prefix}${typeof empty?.title === 'string' ? empty.title : 'no data yet'}`
        : `${prefix}${parts.map((p) => `${p.label} ${fmt(p.value)} (${pct(p.value, total)})`).join(', ')}${missing ? `; ${missing} not reported` : ''}`

  const ringStyle: CSSProperties = { width: size, height: size }
  const mid = (r0 + r1) / 2

  return (
    <figure
      ref={ref}
      id={frameId}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={`${frameId}-summary`}
      aria-busy={status === 'loading' || undefined}
      className={s.root({ className })}
    >
      <div className={s.body()}>
        <div className={s.ring()} style={ringStyle}>
          {status === 'loading' ? (
            <Skeleton aria-hidden="true" variant="circular" className="size-full" />
          ) : (
            <svg aria-hidden="true" focusable="false" className={s.svg()} viewBox="0 0 100 100">
              {status === 'empty' ? (
                <circle cx="50" cy="50" r={mid} className={s.track()} strokeWidth={r1 - r0} />
              ) : (
                segments.map((seg) =>
                  seg.d === null ? (
                    <circle
                      key={seg.label}
                      cx="50"
                      cy="50"
                      r={mid}
                      fill="none"
                      strokeWidth={r1 - r0}
                      style={{ stroke: seg.color }}
                    >
                      <title>{`${seg.label}: ${fmt(seg.value)}, 100%`}</title>
                    </circle>
                  ) : (
                    <path
                      key={seg.label}
                      d={seg.d}
                      className={s.segment()}
                      style={{ ['--sk-segment-color' as string]: seg.color } as CSSProperties}
                    >
                      <title>{`${seg.label}: ${fmt(seg.value)}, ${pct(seg.value, total)}`}</title>
                    </path>
                  ),
                )
              )}
            </svg>
          )}
          {status === 'loading' ? null : (
            <div aria-hidden="true" className={s.center()}>
              {status === 'empty' ? (
                <span className={s.missingValue()}>—</span>
              ) : (
                <span className={s.value()}>{centerValue ?? fmt(total)}</span>
              )}
              {centerCaption ? <span className={s.caption()}>{centerCaption}</span> : null}
            </div>
          )}
        </div>

        {status === 'data' && legend ? (
          <div className="grid min-w-36 flex-1 gap-2">
            <ul className={s.legend()}>
              {parts.map((p) => (
                <li key={p.label} className={s.item()}>
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={s.swatch()}
                      style={{ ['--sk-segment-color' as string]: p.color } as CSSProperties}
                    />
                    {p.label}
                  </span>
                  <span className={s.share()}>{pct(p.value, total)}</span>
                </li>
              ))}
            </ul>
            {missing ? <span className={s.note()}>{`${missing} not reported`}</span> : null}
          </div>
        ) : null}
        {status === 'empty' ? (
          <EmptyState
            size="sm"
            headingLevel="h4"
            className="min-w-36 flex-1 items-start text-left"
            title={empty?.title ?? 'No data yet'}
            icon={empty?.icon}
            actions={empty?.action}
          >
            {empty?.description}
          </EmptyState>
        ) : null}
      </div>
      <ChartTail
        id={frameId}
        summary={summary ?? generated}
        table={{
          mode: table,
          head: [titleCase(x), titleCase(y), 'Share'],
          rows: rows.map((r) => [
            r.label,
            r.value === null ? 'Not reported' : fmt(r.value),
            r.value === null || total === 0 ? '–' : pct(Math.max(0, r.value), total),
          ]),
        }}
      />
    </figure>
  )
}

/**
 * A part-to-whole split with few parts (time by role, games by queue), server-rendered with no
 * client JS: the total in the middle and a legend with each part's share.
 *
 * @remarks
 * - SSR/RSC: a server component. Segments are SVG paths in a square viewBox (the circle never
 *   stretches) with a native `<title>` tooltip each.
 * - Parts: the first `maxSegments` (default 3) get colors; the rest fold into "Other" — crimson
 *   beside amber fails deuteranopia and a ring makes the last part touch the first. For many
 *   parts, use a horizontal `BarChart`.
 * - Missing data: `null` amounts are left out and counted in a "N not reported" note; no
 *   positive amounts shows a grey ring, "—" and `empty`.
 * - Accessibility: a named `<figure>` with a summary ("Duelist 97 (46%), …") and the data as a
 *   table; shares are text, never color alone.
 *
 * @example
 * ```tsx
 * import { DonutChart } from '@sukunagg/charts'
 *
 * <DonutChart
 *   aria-label="Time played by role, this act"
 *   data={[{ role: 'Duelist', hours: 97 }, { role: 'Initiator', hours: 61 }, { role: 'Controller', hours: 33 }, { role: 'Sentinel', hours: 21 }]}
 *   x="role"
 *   y="hours"
 *   centerCaption="hours"
 * />
 * ```
 */
export const DonutChart = forwardRef(DonutChartImpl) as unknown as <Row>(
  props: DonutChartProps<Row> & { ref?: Ref<HTMLElement> },
) => ReactElement | null
