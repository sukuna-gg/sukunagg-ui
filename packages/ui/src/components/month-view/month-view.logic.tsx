import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  forwardRef,
  type ReactNode,
  version,
} from 'react'
import {
  addMonths,
  type CalendarDate,
  daysBetween,
  endOfMonth,
  monthMatrix,
  sameMonth,
  startOfMonth,
} from '../../utils/date/calendar-date'
import {
  type CalendarEvent,
  eventRange,
  isMultiDay,
  type PlacedEvent,
  placeEvents,
} from '../../utils/date/events'
import {
  formatTime,
  fullDateLabel,
  monthYearLabel,
  weekdayNames,
  weekStartFor,
} from '../../utils/date/locale'
import { todayIn } from '../../utils/date/zone'
import { Agenda } from '../agenda'
import { Button } from '../button'
import { EmptyState, type EmptyStateProps } from '../empty-state'
import { ChevronLeftIcon, ChevronRightIcon } from '../icon'
import { Skeleton } from '../skeleton'
import { monthViewStyles } from './month-view.styles'

/** What {@link MonthViewProps.renderDay} gets to know about a day. */
export interface MonthViewDayInfo {
  /** The day is in the shown month (false for the outside days that complete a week). */
  inMonth: boolean
  /** The day is today. */
  isToday: boolean
  /** Events covering the day, in display order (all-day and multi-day first, then by time). */
  events: readonly CalendarEvent[]
}

/** Words the MonthView shows or announces, for translation. */
export interface MonthViewLabels {
  /**
   * Name of the previous-month link.
   * @default 'Previous month'
   */
  previousMonth: string
  /**
   * Name of the next-month link.
   * @default 'Next month'
   */
  nextMonth: string
  /**
   * The link back to the current month.
   * @default 'Today'
   */
  today: string
  /**
   * The overflow row of a busy day. Its accessible name adds the full date.
   * @default (count) => `+${count} more`
   */
  more: (count: number) => string
  /**
   * Added to the name of a day `isDateUntracked` returns true for.
   * @default 'Not tracked'
   */
  untracked: string
  /**
   * Said for one-day all-day events, and shown for them in the "+N more" list and narrow list.
   * @default 'All day'
   */
  allDay: string
  /**
   * Narrow list: shown with a multi-day event that started before the month.
   * @default 'Continues'
   */
  ongoing: string
}

/** Props for {@link MonthView}: the native `<section>` attributes (no children) plus the month. */
export interface MonthViewProps extends Omit<ComponentPropsWithoutRef<'section'>, 'children'> {
  /** Any day in the month to show, `'YYYY-MM-DD'`. */
  month: CalendarDate
  /** The events to draw. Order doesn't matter. */
  events?: readonly CalendarEvent[]
  /**
   * IANA zone that timed events and today are read in. The same on every server.
   * @default 'UTC'
   */
  timeZone?: string
  /**
   * Today, `'YYYY-MM-DD'`: the highlighted day, the "Today" link and the future tiles. Pass it
   * when the page is cached or the MonthView renders inside a client component.
   * @default today in `timeZone` at render
   */
  today?: CalendarDate
  /**
   * Locale for the caption, weekday names, dates and times.
   * @default 'en-US'
   */
  locale?: string
  /**
   * First column, 0 = Sunday … 6 = Saturday.
   * @default from `locale` (CLDR: Sunday in en-US and es-MX, Monday in en-GB)
   */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /**
   * Builds the previous / next / today links from the first day of the target month
   * (`'2026-11-01'`). Omit it to show the caption without navigation.
   */
  monthHref?: (month: CalendarDate) => string
  /** Makes day numbers links, and "+N more" links to the day instead of opening a popover. */
  dayHref?: (date: CalendarDate) => string | undefined
  /**
   * Custom content under the day number (e.g. games played and average placement). Not called
   * for untracked days.
   */
  renderDay?: (date: CalendarDate, info: MonthViewDayInfo) => ReactNode
  /**
   * Days with no data source yet: hatched and named "Not tracked", never shown as empty or zero.
   */
  isDateUntracked?: (date: CalendarDate) => boolean
  /**
   * `grid` draws events in lanes; `tiles` draws rounded day tiles for `renderDay` content (events
   * reach it through `info.events`).
   * @default 'grid'
   */
  variant?: 'grid' | 'tiles'
  /**
   * Event rows per day before a busy day folds into "+N more" (which takes the last row).
   * @default 3
   */
  maxLanes?: number
  /**
   * `auto` renders the grid and an agenda list and shows the list below 600px of container width
   * (a container query, no script); `always` shows only the list, `never` only the grid.
   * @default 'auto'
   */
  list?: 'auto' | 'always' | 'never'
  /**
   * Shown over the kept grid when the month has no events. Omit it (or pass `false`) for none.
   */
  empty?: Pick<EmptyStateProps, 'title' | 'children' | 'actions' | 'icon'> | false
  /**
   * Skeleton bars in some cells and `aria-busy="true"` while the events load.
   * @default false
   */
  loading?: boolean
  /** Overrides for the English words. */
  labels?: Partial<MonthViewLabels>
  /**
   * The section's id, and the prefix for the caption and "+N more" popover ids. Set it when the
   * same month appears twice on a page.
   * @default `sk-month-YYYY-MM` as the prefix (no id on the section)
   */
  id?: string
}

/** One piece of a multi-day bar within a week row: a run of days where its lane is visible. */
export interface WeekBar {
  placed: PlacedEvent
  lane: number
  /** First column, 0–6. */
  col: number
  /** Columns covered. */
  span: number
  /** The event goes on before this piece (an earlier week, or a day where it's folded away). */
  continuesStart: boolean
  /** The event goes on after this piece. */
  continuesEnd: boolean
  /** The week's first piece: the one screen readers hear, with the event's range. */
  primary: boolean
}

/** One day of a {@link WeekLayout}. */
export interface WeekDay {
  /** One-day events with a visible lane. */
  items: { placed: PlacedEvent; lane: number }[]
  /** Events folded into "+N more" (which sits in lane `maxLanes − 1`); empty when all fit. */
  hidden: PlacedEvent[]
  /** Every event covering the day, in display order. */
  all: PlacedEvent[]
}

/** Where everything goes in one week row. */
export interface WeekLayout {
  bars: WeekBar[]
  days: WeekDay[]
}

/**
 * Lays out one week row (pure). Multi-day events first (earlier start, then longer), each in the
 * lowest lane free across its span; then each day's one-day events (all-day, then by time) fill
 * that day's free lanes. A day that needs more than `maxLanes` lanes shows `maxLanes − 1` and
 * folds the rest into "+N more" in the last lane; a bar is drawn on the days where its lane is
 * visible, split into pieces around the folded days.
 *
 * @param week seven consecutive dates
 * @param placed events sorted with `compareEvents` (as `placeEvents` returns them)
 */
export const layoutWeek = (
  week: readonly CalendarDate[],
  placed: readonly PlacedEvent[],
  maxLanes: number,
): WeekLayout => {
  const first = week[0] as CalendarDate
  const last = week[6] as CalendarDate
  const max = Math.max(1, Math.floor(maxLanes))
  const used = week.map(() => new Set<number>())
  const col = (d: CalendarDate) => (d < first ? 0 : d > last ? 6 : daysBetween(first, d))
  const take = (from: number, to: number) => {
    let lane = 0
    while (used.slice(from, to + 1).some((u) => u.has(lane))) lane++
    for (let c = from; c <= to; c++) used[c]?.add(lane)
    return lane
  }

  const touching = placed.filter((p) => p.start <= last && p.end >= first)
  const spans = touching
    .filter(isMultiDay)
    .map((p) => ({ p, from: col(p.start), to: col(p.end), lane: 0 }))
  for (const b of spans) b.lane = take(b.from, b.to)
  const singles = week.map((date, c) =>
    touching
      .filter((p) => p.start === date && p.end === date)
      .map((p) => ({ placed: p, lane: take(c, c) })),
  )
  // Lanes below `limit[c]` are visible on day c.
  const limit = used.map((u) => (Math.max(-1, ...u) >= max ? max - 1 : max))

  const bars: WeekBar[] = []
  for (const { p, from, to, lane } of spans) {
    let primary = true
    for (let c = from; c <= to; c++) {
      if (lane >= (limit[c] as number)) continue
      const start = c
      while (c < to && lane < (limit[c + 1] as number)) c++
      bars.push({
        placed: p,
        lane,
        col: start,
        span: c - start + 1,
        continuesStart: start > from || p.start < first,
        continuesEnd: c < to || p.end > last,
        primary,
      })
      primary = false
    }
  }

  const days = week.map((date, c) => {
    const lim = limit[c] as number
    const items = (singles[c] as WeekDay['items']).filter((i) => i.lane < lim)
    const shown = new Set(items.map((i) => i.placed))
    for (const b of spans) if (b.from <= c && c <= b.to && b.lane < lim) shown.add(b.p)
    const all = touching.filter((p) => p.start <= date && date <= p.end)
    return { items, hidden: all.filter((p) => !shown.has(p)), all }
  })
  return { bars, days }
}

const LABELS: MonthViewLabels = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  today: 'Today',
  more: (count) => `+${count} more`,
  untracked: 'Not tracked',
  allDay: 'All day',
  ongoing: 'Continues',
}

/*
 * React 19 knows `popoverTarget` and warns about the lowercase spelling in development; React 18
 * doesn't know the attribute and passes it through only in lowercase (`bun run test:react18`).
 */
const popoverTarget = (id: string): Record<string, string> =>
  version.startsWith('18') ? { popovertarget: id } : { popoverTarget: id }

// Loading: skeleton bars per day, a fixed pattern so the server and the client agree.
const SKELETON_BARS = [0, 1, 0, 2, 0, 0, 1]

const hasContent = (node: ReactNode) => node != null && node !== false && node !== ''

const eventColor = (p: PlacedEvent) =>
  p.event.color ? ({ '--sk-event': p.event.color } as CSSProperties) : undefined

/**
 * A month of events or custom day cells: a tournament schedule, a release calendar, days played
 * with a result in each cell. Multi-day events draw as bars across the week and a busy day folds
 * into "+2 more". It renders on the server and moves between months with links, so the URL
 * (`?month=2026-11`) is the whole navigation and the page works with JavaScript off.
 *
 * @remarks
 * - SSR/RSC: a server component (no `'use client'`, no hooks, no client JS). Today is the
 *   `today` prop, else today in `timeZone` at render; pass `today` when the page is cached or the
 *   MonthView sits inside a client component.
 * - Events: timed events land on their wall date in `timeZone` (default `'UTC'`); all-day
 *   `'YYYY-MM-DD'` dates are used as given. An event ending on a later day is multi-day and draws
 *   as a bar; lanes are laid out per week (see {@link layoutWeek}). "+N more" links to `dayHref`
 *   when given, else opens a native `popover` listing the whole day (zero JS).
 * - Layout: `list="auto"` renders the grid and an {@link Agenda} of the month and shows the list
 *   below 600px of container width (a container query, both rendered).
 * - Accessibility: a `<section>` named by its caption. Each day is a visually hidden full-date
 *   heading (`aria-current="date"` on today, "Not tracked" on untracked days) followed by an
 *   `<ol>` of its events in reading order; the grid is CSS on top. A multi-day bar is announced
 *   once per week row, with its range. Event links are named "6 PM, Copa Pitaya"; "+N more" adds
 *   the day ("+2 more, Saturday, October 10, 2026"). Colors are decoration: titles are text.
 *   Loading sets `aria-busy`; the empty state is a `status`.
 * - Variants: `variant` 'grid' (default) | 'tiles'; `list` 'auto' (default) | 'always' | 'never'.
 *
 * @example
 * ```tsx
 * import { MonthView } from '@sukunagg/ui'
 *
 * <MonthView
 *   month="2026-10-01"
 *   today="2026-10-09"
 *   locale="es-MX"
 *   timeZone="America/Hermosillo"
 *   labels={{ previousMonth: 'Mes anterior', nextMonth: 'Mes siguiente', today: 'Hoy',
 *     more: (n) => `+${n} más`, untracked: 'Sin registro', allDay: 'Todo el día',
 *     ongoing: 'Continúa' }}
 *   events={[
 *     { id: 'copa', title: 'Copa Pitaya · Valorant 5v5', start: '2026-10-10T01:00:00Z',
 *       color: 'var(--sk-chart-1)', href: '/torneos/copa-pitaya', meta: 'Valorant · Presencial' },
 *     { id: 'liga', title: 'Liga Otoño · Semana 3', start: '2026-10-12', end: '2026-10-16' },
 *   ]}
 *   monthHref={(m) => `?month=${m.slice(0, 7)}`}
 *   empty={{ title: 'No hay torneos este mes' }}
 * />
 * ```
 *
 * @example
 * ```tsx
 * import { MonthView } from '@sukunagg/ui'
 *
 * // Days played: tiles with a result per day; days before tracking started are hatched.
 * <MonthView
 *   month="2026-10-01"
 *   today="2026-10-20"
 *   variant="tiles"
 *   list="never"
 *   isDateUntracked={(d) => d < '2026-10-04'}
 *   renderDay={(d) => (games[d] ? `${games[d].count} games · avg ${games[d].avg}` : null)}
 * />
 * ```
 */
export const MonthView = forwardRef<HTMLElement, MonthViewProps>(function MonthView(
  {
    month,
    events = [],
    timeZone = 'UTC',
    today: todayProp,
    locale = 'en-US',
    weekStartsOn,
    monthHref,
    dayHref,
    renderDay,
    isDateUntracked,
    variant = 'grid',
    maxLanes = 3,
    list = 'auto',
    empty,
    loading = false,
    labels: labelsProp,
    id,
    className,
    ...rest
  },
  ref,
) {
  const today = todayProp ?? todayIn(timeZone)
  const labels = { ...LABELS, ...labelsProp }
  const first = startOfMonth(month)
  const last = endOfMonth(month)
  const prefix = id ?? `sk-month-${first.slice(0, 7)}`
  const captionId = `${prefix}-caption`
  const lanes = Math.max(1, Math.floor(maxLanes))
  const tiles = variant === 'tiles'
  const s = monthViewStyles({ variant, list })
  const placed = placeEvents(events, timeZone)
  const emptyState =
    !loading && empty && !placed.some((p) => p.start <= last && p.end >= first) ? empty : null

  // "6 PM" for a one-day timed event, "All day" or the range for the rest.
  const when = (p: PlacedEvent) =>
    isMultiDay(p)
      ? eventRange(p, locale, timeZone)
      : p.time === undefined
        ? labels.allDay
        : formatTime(p.time, locale, true)

  const line = (p: PlacedEvent, className: string) => {
    const content = (
      <>
        <span aria-hidden="true" className={s.eventDot()} />
        <span className={s.eventTime()}>{when(p)}</span>
        <span className="sr-only">, </span>
        <span className={s.eventTitle()}>{p.event.title}</span>
      </>
    )
    return p.event.href ? (
      <a href={p.event.href} className={className} style={eventColor(p)}>
        {content}
      </a>
    ) : (
      <span className={className} style={eventColor(p)}>
        {content}
      </span>
    )
  }

  const bar = (b: WeekBar) => {
    const { placed: p, primary } = b
    const variants = { continuesStart: b.continuesStart, continuesEnd: b.continuesEnd }
    const content = (
      <>
        <span className="truncate">{p.event.title}</span>
        {primary ? <span className="sr-only">, {when(p)}</span> : null}
      </>
    )
    return (
      <li
        key={`${p.event.id}@${b.col}`}
        aria-hidden={primary ? undefined : true}
        className={s.barItem(variants)}
        style={{ gridRow: b.lane + 1, '--sk-span': b.span, ...eventColor(p) } as CSSProperties}
      >
        {p.event.href ? (
          <a href={p.event.href} tabIndex={primary ? undefined : -1} className={s.bar(variants)}>
            {content}
          </a>
        ) : (
          <span className={s.bar(variants)}>{content}</span>
        )}
      </li>
    )
  }

  const more = (date: CalendarDate, day: WeekDay) => {
    const href = dayHref?.(date)
    const dateLabel = fullDateLabel(date, locale)
    const name = (
      <>
        {labels.more(day.hidden.length)}
        <span className="sr-only">, {dateLabel}</span>
      </>
    )
    const popId = `${prefix}-more-${date}`
    return (
      <li key="more" className="min-w-0" style={{ gridRow: lanes }}>
        {href ? (
          <a href={href} className={s.more()}>
            {name}
          </a>
        ) : (
          <>
            <button type="button" className={s.more()} {...popoverTarget(popId)}>
              {name}
            </button>
            <div
              id={popId}
              popover="auto"
              role="dialog"
              aria-labelledby={`${popId}-title`}
              className={s.morePopover()}
            >
              <p id={`${popId}-title`} className={s.moreTitle()}>
                {dateLabel}
              </p>
              <ul className={s.moreList()}>
                {day.all.map((p) => (
                  <li key={p.event.id}>{line(p, s.moreRow())}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </li>
    )
  }

  // One day of a week row: its background cell (grid only) and its column or tile.
  const dayView = (date: CalendarDate, c: number, w: number, layout: WeekLayout) => {
    const inMonth = sameMonth(date, first)
    const isToday = date === today
    const untracked = isDateUntracked?.(date) ?? false
    const day = layout.days[c] as WeekDay
    const custom = loading
      ? tiles && <Skeleton variant="text" className="w-3/4" />
      : !untracked && renderDay?.(date, { inMonth, isToday, events: day.all.map((p) => p.event) })
    const tone = isToday ? 'today' : inMonth ? 'in' : 'out'
    const href = dayHref?.(date)
    const number = (
      <>
        <span aria-hidden="true" className={s.dayNumber({ tone })}>
          {Number(date.slice(8))}
        </span>
        <span className="sr-only">
          {fullDateLabel(date, locale)}
          {untracked ? `, ${labels.untracked}` : null}
        </span>
      </>
    )
    const heading = (
      <h3 className={s.heading()} aria-current={isToday ? 'date' : undefined}>
        {href ? (
          <a href={href} className={s.dayLink()}>
            {number}
          </a>
        ) : (
          number
        )}
      </h3>
    )
    const customBox = hasContent(custom) ? <div className={s.custom()}>{custom}</div> : null

    if (tiles) {
      if (!inMonth) return { bg: null, view: <div key={date} /> }
      const fill = untracked
        ? 'content'
        : date > today
          ? 'future'
          : hasContent(custom)
            ? 'content'
            : 'none'
      return {
        bg: null,
        view: (
          <div key={date} className={s.tile({ untracked, fill })}>
            {heading}
            {customBox}
          </div>
        ),
      }
    }

    const entries: { lane: number; node: ReactNode }[] = layout.bars
      .filter((b) => b.col === c)
      .map((b) => ({ lane: b.lane, node: bar(b) }))
    for (const { placed: p, lane } of day.items) {
      entries.push({
        lane,
        node:
          p.time === undefined ? (
            bar({
              placed: p,
              lane,
              col: c,
              span: 1,
              continuesStart: false,
              continuesEnd: false,
              primary: true,
            })
          ) : (
            <li key={p.event.id} className="min-w-0" style={{ gridRow: lane + 1 }}>
              {line(p, s.event())}
            </li>
          ),
      })
    }
    if (day.hidden.length > 0) entries.push({ lane: lanes - 1, node: more(date, day) })
    entries.sort((a, b) => a.lane - b.lane)
    const bars = SKELETON_BARS[(w + c * 3) % 7] as number

    return {
      bg: (
        <div
          key={date}
          className={s.dayBg({ tone: isToday ? 'today' : 'in', outside: !inMonth, untracked })}
        />
      ),
      view: (
        <div key={date} className={s.day()}>
          <div className={s.dayHead()}>
            {heading}
            {customBox}
          </div>
          {loading ? (
            <div className={s.lanes()}>
              {bars > 0 ? <Skeleton className={s.skeleton()} /> : null}
              {bars > 1 ? <Skeleton className={s.skeleton()} /> : null}
            </div>
          ) : entries.length > 0 ? (
            <ol className={s.lanes()}>{entries.map((e) => e.node)}</ol>
          ) : null}
        </div>
      ),
    }
  }

  const weekStart = weekStartsOn ?? weekStartFor(locale)
  const weeks = (list === 'always' ? [] : monthMatrix(first, weekStart, false)).map((week, w) => {
    const layout = layoutWeek(week, placed, lanes)
    const days = week.map((date, c) => dayView(date, c, w, layout))
    return (
      <div key={week[0]} className={s.week()}>
        {tiles ? null : (
          <div aria-hidden="true" className={s.background()}>
            {days.map((d) => d.bg)}
          </div>
        )}
        {days.map((d) => d.view)}
      </div>
    )
  })

  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={captionId}
      aria-busy={loading || undefined}
      className={s.root({ className })}
      {...rest}
    >
      <div className={s.header()}>
        <h2 id={captionId} className={s.caption()}>
          {monthYearLabel(first, locale)}
        </h2>
        {monthHref ? (
          <div className={s.nav()}>
            <Button
              as="a"
              href={monthHref(startOfMonth(today))}
              variant="secondary"
              size="sm"
              disabled={sameMonth(first, today)}
            >
              {labels.today}
            </Button>
            <a
              href={monthHref(addMonths(first, -1))}
              aria-label={labels.previousMonth}
              className={s.navLink()}
            >
              <ChevronLeftIcon />
            </a>
            <a
              href={monthHref(addMonths(first, 1))}
              aria-label={labels.nextMonth}
              className={s.navLink()}
            >
              <ChevronRightIcon />
            </a>
          </div>
        ) : null}
      </div>
      {list === 'always' ? null : (
        <div className={s.frame()}>
          <div aria-hidden="true" className={s.weekdays()}>
            {weekdayNames(locale, weekStart).map((n) => (
              <div key={n.long} className={s.weekday()}>
                {n.short}
              </div>
            ))}
          </div>
          {weeks}
          {emptyState ? (
            <div className={s.empty()}>
              <EmptyState
                size="sm"
                surface="panel"
                role="status"
                className={s.emptyCard()}
                {...emptyState}
              />
            </div>
          ) : null}
        </div>
      )}
      {list === 'never' ? null : (
        <Agenda
          className={s.list()}
          events={events}
          from={first}
          days={daysBetween(first, last) + 1}
          timeZone={timeZone}
          today={today}
          locale={locale}
          stickyHeadings={false}
          labels={{ allDay: labels.allDay, ongoing: labels.ongoing }}
          empty={empty}
          loading={loading}
        />
      )}
    </section>
  )
})
