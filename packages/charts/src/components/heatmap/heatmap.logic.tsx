import { EmptyState } from '@sukunagg/ui'
import { type ForwardedRef, forwardRef, type ReactElement, type Ref } from 'react'
import { formatter, hashId, num } from '../../internal/data'
import { ChartTail } from '../../internal/frame'
import type { ChartEmpty, ChartLabelProps } from '../../internal/types'
import { heatmapStyles } from './heatmap.styles'

/** Props for {@link Heatmap}. */
export type HeatmapProps<Row> = ChartLabelProps & {
  data: readonly Row[]
  /** Key of the day, as `'YYYY-MM-DD'` (a calendar date, read in UTC — no time zone shifts). */
  date: keyof Row & string
  /** Key of the amount. A day with no row, or a `null` amount, is "not tracked" — never 0. */
  value: keyof Row & string
  /** Last day shown, `'YYYY-MM-DD'`. Default: the latest date in `data`. */
  end?: string
  /**
   * Columns (weeks, Monday first).
   * @default 20
   */
  weeks?: number
  /** Upper bounds of levels 1–3 (level 4 is above). Default: quarters of the largest amount. */
  levels?: readonly [number, number, number]
  /**
   * What the amount counts, for tooltips and the summary.
   * @default 'events'
   */
  unit?: string
  valueFormat?: Intl.NumberFormatOptions | ((v: number) => string)
  /**
   * Locale for numbers and month/day names, fixed so server and browser output match.
   * @default 'en-US'
   */
  locale?: string
  /** Shown over the grid when nothing happened. Default title: "No activity yet". */
  empty?: ChartEmpty
  loading?: boolean
  /** @default 'sr-only' */
  table?: 'sr-only' | 'details' | 'none'
  summary?: string
  id?: string
  className?: string
}

const DAY = 86_400_000

/** 'YYYY-MM-DD' → UTC midnight (ms), or null if it isn't one. */
function parseDay(v: unknown): number | null {
  if (typeof v !== 'string') return null
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

const iso = (t: number) => new Date(t).toISOString().slice(0, 10)
/** Monday = 0 … Sunday = 6. */
const weekday = (t: number) => (new Date(t).getUTCDay() + 6) % 7

type Level = 0 | 1 | 2 | 3 | 4

function HeatmapImpl<Row>(props: HeatmapProps<Row>, ref: ForwardedRef<HTMLElement>) {
  const {
    data,
    date,
    value,
    end,
    weeks = 20,
    levels,
    unit = 'events',
    valueFormat,
    locale = 'en-US',
    empty,
    loading = false,
    table = 'sr-only',
    summary,
    id,
    className,
  } = props
  const ariaLabel = props['aria-label']
  const ariaLabelledby = props['aria-labelledby']
  const s = heatmapStyles()
  const fmt = formatter(valueFormat, locale)
  const dayName = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  const monthName = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' })
  const shortDay = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
  const weekOf = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })

  // Known days: date → amount (null = not tracked).
  const byDay = new Map<string, number | null>()
  for (const row of data) {
    const t = parseDay(row[date])
    if (t !== null) byDay.set(iso(t), num(row[value]))
  }
  const dates = [...byDay.keys()].map((d) => parseDay(d) as number)
  const endT = parseDay(end) ?? (dates.length ? Math.max(...dates) : null)

  const frameId =
    id ?? hashId(JSON.stringify([ariaLabel ?? ariaLabelledby, date, value, end, weeks, [...byDay]]))
  const name = ariaLabel ?? ''
  const prefix = name ? `${name}: ` : ''
  const emptyTitle = empty?.title ?? 'No activity yet'

  // Nothing to place on a calendar: no rows and no `end`.
  if (endT === null) {
    return (
      <figure
        ref={ref}
        id={frameId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-describedby={`${frameId}-summary`}
        aria-busy={loading || undefined}
        className={s.root({ className })}
      >
        <EmptyState
          size="sm"
          headingLevel="h4"
          title={emptyTitle}
          icon={empty?.icon}
          actions={empty?.action}
        >
          {empty?.description}
        </EmptyState>
        <ChartTail
          id={frameId}
          summary={
            summary ??
            `${prefix}${loading ? 'loading' : typeof emptyTitle === 'string' ? emptyTitle : 'no activity yet'}`
          }
          table={{ mode: 'none', head: [], rows: [] }}
        />
      </figure>
    )
  }

  const lastMonday = endT - weekday(endT) * DAY
  const first = lastMonday - (weeks - 1) * 7 * DAY
  const cols = Array.from({ length: weeks }, (_c, c) => first + c * 7 * DAY)

  const tracked = [...byDay.entries()].filter(([d, v]) => {
    const t = parseDay(d) as number
    return v !== null && t >= first && t <= endT
  })
  const amounts = tracked.map(([, v]) => v as number)
  const max = Math.max(0, ...amounts)
  const bounds = levels ?? ([max / 4, max / 2, (max * 3) / 4] as const)
  const levelOf = (v: number): Level =>
    v <= 0 ? 0 : v <= bounds[0] ? 1 : v <= bounds[1] ? 2 : v <= bounds[2] ? 3 : 4

  const cell = (t: number) => {
    if (t > endT) return { t, level: 'blank' as const, title: '' }
    const amount = byDay.get(iso(t))
    if (amount === undefined || amount === null)
      return { t, level: 'untracked' as const, title: `${dayName.format(t)}: not tracked` }
    return { t, level: levelOf(amount), title: `${dayName.format(t)}: ${fmt(amount)} ${unit}` }
  }
  // rows[r][c]: weekday r (Monday = 0) of week c.
  const rowsOfCells = Array.from({ length: 7 }, (_r, r) => cols.map((c) => cell(c + r * DAY)))
  const anyUntracked = rowsOfCells.some((row) => row.some((x) => x.level === 'untracked'))
  // A month label over the first week of each month — not on the last column (no room), and not
  // when the next label is under 3 columns away (a partial first month would crowd it).
  const starts = cols
    .map((c, k) =>
      k === 0 || new Date(c).getUTCMonth() !== new Date(cols[k - 1] as number).getUTCMonth()
        ? k
        : -1,
    )
    .filter((k) => k >= 0 && k < weeks - 1)
  const kept = new Set(
    starts.filter((k, i) => (starts[i + 1] ?? Number.POSITIVE_INFINITY) - k >= 3),
  )
  const monthLabels = cols.map((c, k) => (kept.has(k) ? monthName.format(c) : ''))

  const total = amounts.reduce((a, v) => a + v, 0)
  const active = amounts.filter((v) => v > 0).length
  const status = loading ? 'loading' : total > 0 ? 'data' : 'empty'

  const generated =
    status === 'loading'
      ? `${prefix}loading`
      : status === 'empty'
        ? `${prefix}${typeof emptyTitle === 'string' ? emptyTitle : 'no activity yet'}`
        : `${prefix}${fmt(total)} ${unit} over ${weeks} weeks, ${active} active days of ${amounts.length} tracked`

  const gridStyle = { gridTemplateColumns: `auto repeat(${weeks}, minmax(0, 14px))` }

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
      <div className={s.wrap()}>
        <div aria-hidden="true" className={s.grid()} style={gridStyle}>
          <span />
          {cols.map((c, k) => (
            <span key={c} className={s.month()}>
              {status === 'loading' ? '' : monthLabels[k]}
            </span>
          ))}
          {rowsOfCells.map((row, r) => (
            <div key={(row[0] as { t: number }).t} className="contents">
              <span className={s.day()}>
                {r % 2 === 0 && r < 6 ? shortDay.format(first + r * DAY) : ''}
              </span>
              {row.map((info) => {
                const level =
                  status === 'loading' && info.level !== 'blank' ? 'loading' : info.level
                return (
                  <span
                    key={info.t}
                    className={heatmapStyles({ level }).cell()}
                    title={status === 'loading' ? undefined : info.title || undefined}
                  />
                )
              })}
            </div>
          ))}
        </div>
        {status === 'empty' ? (
          <div className={s.overlay()}>
            <EmptyState
              size="sm"
              headingLevel="h4"
              title={emptyTitle}
              icon={empty?.icon}
              actions={empty?.action}
            >
              {empty?.description}
            </EmptyState>
          </div>
        ) : null}
      </div>

      {status === 'data' ? (
        <div aria-hidden="true" className={s.legend()}>
          {anyUntracked ? (
            <span className="mr-3 inline-flex items-center gap-1.5">
              <span className={heatmapStyles({ level: 'untracked' }).swatch()} />
              Not tracked
            </span>
          ) : null}
          <span className="mr-1">Less</span>
          {([0, 1, 2, 3, 4] as const).map((l) => (
            <span key={l} className={heatmapStyles({ level: l }).swatch()} />
          ))}
          <span className="ml-1">More</span>
        </div>
      ) : null}

      <ChartTail
        id={frameId}
        summary={summary ?? generated}
        table={{
          mode: table,
          head: [
            'Week of',
            ...Array.from({ length: 7 }, (_d, d) => shortDay.format(first + d * DAY)),
          ],
          rows: cols.map((c) => [
            weekOf.format(c),
            ...Array.from({ length: 7 }, (_d, d) => {
              const t = c + d * DAY
              if (t > endT) return ''
              const amount = byDay.get(iso(t))
              return amount === undefined || amount === null ? 'Not tracked' : fmt(amount)
            }),
          ]),
        }}
      />
    </figure>
  )
}

/**
 * A calendar of activity — one square per day, weeks as columns — that tells "nothing
 * happened" (a tracked 0) apart from "not tracked yet" (no row). Server-rendered, no client JS.
 *
 * @remarks
 * - SSR/RSC: a server component; dates are read and formatted in UTC, so server and browser
 *   draw the same day. Cells shrink with the container (CSS grid, max 14px).
 * - Missing data: a day without a row, or with `null`, is outlined "Not tracked" — never 0.
 *   Send explicit zeros for days you know were empty. No activity at all shows `empty` over the grid.
 * - Levels: 0 (`surface-2`) then `--sk-heat-1…4`; bounds default to quarters of the max, or pass `levels`.
 * - Accessibility: a named `<figure>` with a summary ("142 games over 20 weeks, 61 active days of
 *   98 tracked") and the week × day table; each cell has a native `title` tooltip.
 *
 * @example
 * ```tsx
 * import { Heatmap } from '@sukunagg/charts'
 *
 * <Heatmap aria-label="Games played, last 20 weeks" data={days} date="day" value="games" unit="games" />
 * ```
 */
export const Heatmap = forwardRef(HeatmapImpl) as unknown as <Row>(
  props: HeatmapProps<Row> & { ref?: Ref<HTMLElement> },
) => ReactElement | null
