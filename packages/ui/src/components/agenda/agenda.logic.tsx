import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  forwardRef,
  type ReactNode,
} from 'react'
import { addDays, type CalendarDate } from '../../utils/date/calendar-date'
import {
  type CalendarEvent,
  eventRange,
  isMultiDay,
  type PlacedEvent,
  placeEvents,
} from '../../utils/date/events'
import { formatDate, formatTime, relativeDayName } from '../../utils/date/locale'
import { todayIn } from '../../utils/date/zone'
import { EmptyState, type EmptyStateProps } from '../empty-state'
import { Skeleton } from '../skeleton'
import { agendaStyles } from './agenda.styles'

/** Words the Agenda shows, for translation. */
export interface AgendaLabels {
  /**
   * Time column of a one-day, all-day event.
   * @default 'All day'
   */
  allDay: string
  /**
   * Shown with a multi-day event that started before `from` and is still on.
   * @default 'Continues'
   */
  ongoing: string
}

/** Props for {@link Agenda}: the native `<section>` attributes (no children) plus the schedule. */
export interface AgendaProps extends Omit<ComponentPropsWithoutRef<'section'>, 'children'> {
  /** The events to list. Order doesn't matter: they're grouped by day and sorted. */
  events: readonly CalendarEvent[]
  /**
   * First day listed, `'YYYY-MM-DD'`.
   * @default today
   */
  from?: CalendarDate
  /**
   * How many days from `from` to list (only days with events get a heading).
   * @default 14
   */
  days?: number
  /**
   * IANA zone that timed events and today are read in. The same on every server.
   * @default 'UTC'
   */
  timeZone?: string
  /**
   * Today, `'YYYY-MM-DD'`: drives the "Today" / "Tomorrow" headings and `aria-current`. Pass it
   * when the page is cached or the Agenda renders inside a client component.
   * @default today in `timeZone` at render
   */
  today?: CalendarDate
  /**
   * Locale for dates, times and the "Today" / "Tomorrow" words (`Intl.RelativeTimeFormat`).
   * @default 'en-US'
   */
  locale?: string
  /**
   * Level of the day headings, to fit the page outline.
   * @default 3
   */
  headingLevel?: 2 | 3 | 4 | 5
  /**
   * Day headings pin to the top while the list scrolls (give the Agenda a height and
   * `overflow-y-auto`). They sit on `--sk-surface`; set a matching `className` background if the
   * container differs.
   * @default true
   */
  stickyHeadings?: boolean
  /**
   * Shown when no event falls in the window. Omit it (or pass `false`) to render nothing.
   */
  empty?: Pick<EmptyStateProps, 'title' | 'children' | 'actions' | 'icon'> | false
  /**
   * Five skeleton rows and `aria-busy="true"` while the events load.
   * @default false
   */
  loading?: boolean
  /** Overrides for the English words (`allDay`, `ongoing`). */
  labels?: Partial<AgendaLabels>
}

const LABELS: AgendaLabels = { allDay: 'All day', ongoing: 'Continues' }

interface Row {
  placed: PlacedEvent
  ongoing: boolean
}

/**
 * Upcoming events as a list grouped by day ("Today · Friday, October 9"), each with its time,
 * color, title, details and status. The quickest way to read a schedule on a phone, and the list
 * `MonthView` switches to when it gets narrow.
 *
 * @remarks
 * - SSR/RSC: a server component (no `'use client'`, no hooks). Today is the `today` prop, else
 *   today in `timeZone` at render; pass `today` when the page is cached.
 * - Grouping: timed events land on their wall date in `timeZone`; all-day dates are used as
 *   given. Only days with events get a heading. A multi-day event is listed once, on its first
 *   day in the window, with "—" for a time and its range in the details; one that started before
 *   `from` comes first under `from` with `labels.ongoing`.
 * - Headings: "Today ·", "Tomorrow ·" and "Yesterday ·" (from `Intl.RelativeTimeFormat`) only for
 *   those three days; every other day is an absolute date, so a cached page never says a stale
 *   "in 3 days".
 * - Accessibility: each day is a real heading (`headingLevel`) followed by an `<ol>`; today's
 *   heading has `aria-current="date"`. Rows with `href` are links named "6:00 PM, Copa Pitaya,
 *   Valorant · In person, Open". Colors are decoration; say states in `status` text. Loading sets
 *   `aria-busy`; the empty state is a `status`.
 * - Layout: rows are time · dot · text · status; below 420px of container width the status drops
 *   under the title. `stickyHeadings` (default true) pins headings inside a scrolling container.
 *
 * @example
 * ```tsx
 * import { Agenda, Badge } from '@sukunagg/ui'
 *
 * <Agenda
 *   aria-label="Próximos torneos"
 *   events={[
 *     {
 *       id: 'copa',
 *       title: 'Copa Pitaya · Valorant 5v5',
 *       start: '2026-10-10T01:00:00Z',
 *       href: '/torneos/copa-pitaya',
 *       meta: 'Valorant · Presencial',
 *       status: <Badge size="sm">Abierto</Badge>,
 *     },
 *   ]}
 *   today="2026-10-09"
 *   days={21}
 *   timeZone="America/Hermosillo"
 *   locale="es-MX"
 *   labels={{ allDay: 'Todo el día', ongoing: 'Continúa' }}
 *   className="max-h-[420px] overflow-y-auto"
 *   empty={{ title: 'No hay torneos en las próximas 3 semanas' }}
 * />
 * ```
 */
export const Agenda = forwardRef<HTMLElement, AgendaProps>(function Agenda(
  {
    events,
    from: fromProp,
    days = 14,
    timeZone = 'UTC',
    today: todayProp,
    locale = 'en-US',
    headingLevel = 3,
    stickyHeadings = true,
    empty,
    loading = false,
    labels: labelsProp,
    className,
    ...rest
  },
  ref,
) {
  const today = todayProp ?? todayIn(timeZone)
  const from = fromProp ?? today
  const last = addDays(from, Math.max(1, days) - 1)
  const labels = { ...LABELS, ...labelsProp }
  const s = agendaStyles({ sticky: stickyHeadings })
  const Heading = `h${headingLevel}` as 'h3'

  // Placed events arrive sorted (all-day and multi-day first, then by start), so each day's rows
  // are already in order and ongoing events, which started earliest, lead under `from`.
  const groups = new Map<CalendarDate, Row[]>()
  for (const placed of placeEvents(events, timeZone)) {
    if (placed.end < from || placed.start > last) continue
    const ongoing = placed.start < from
    const day = ongoing ? from : placed.start
    const list = groups.get(day) ?? []
    list.push({ placed, ongoing })
    groups.set(day, list)
  }
  const dates = [...groups.keys()].sort()

  const row = ({ placed, ongoing }: Row) => {
    const { event } = placed
    const multi = isMultiDay(placed)
    const meta = [
      ongoing && labels.ongoing,
      multi && eventRange(placed, locale, timeZone),
      event.meta,
    ]
      .filter(Boolean)
      .join(' · ')
    const content = (
      <>
        <span className={s.time()}>
          {multi ? (
            <span aria-hidden="true">—</span>
          ) : (
            <>
              {placed.time === undefined ? labels.allDay : formatTime(placed.time, locale)}
              <span className="sr-only">, </span>
            </>
          )}
        </span>
        <span aria-hidden="true" className={s.dot()} />
        <span className={s.text()}>
          <span className={s.title()}>{event.title}</span>
          {meta ? (
            <span className={s.meta()}>
              <span className="sr-only">, </span>
              {meta}
            </span>
          ) : null}
        </span>
        {event.status == null ? null : (
          <span className={s.status()}>
            <span className="sr-only">, </span>
            {event.status}
          </span>
        )}
      </>
    )
    const style = event.color ? ({ '--sk-event': event.color } as CSSProperties) : undefined
    return event.href ? (
      <a href={event.href} className={s.row({ link: true })} style={style}>
        {content}
      </a>
    ) : (
      <div className={s.row()} style={style}>
        {content}
      </div>
    )
  }

  let body: ReactNode = null
  if (loading) {
    body = (
      <div className={s.day()}>
        <Skeleton variant="text" className="mx-2 my-2 w-36" />
        {[72, 58, 80, 64, 52].map((width) => (
          <div key={width} className={s.row()}>
            <Skeleton variant="text" className="w-12" />
            <Skeleton variant="circular" className="size-2.5" />
            <span className={s.text()}>
              <Skeleton variant="text" style={{ width: `${width}%` }} />
            </span>
          </div>
        ))}
      </div>
    )
  } else if (dates.length > 0) {
    body = dates.map((date) => {
      const relative = relativeDayName(date, today, locale)
      const label = formatDate(date, locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: date.slice(0, 4) === today.slice(0, 4) ? undefined : 'numeric',
      })
      return (
        <div key={date} className={s.day()}>
          <Heading
            className={s.heading({ today: date === today })}
            aria-current={date === today ? 'date' : undefined}
          >
            {relative ? `${relative} · ${label}` : label}
          </Heading>
          <ol className={s.list()}>
            {(groups.get(date) as Row[]).map((r) => (
              <li key={r.placed.event.id}>{row(r)}</li>
            ))}
          </ol>
        </div>
      )
    })
  } else if (empty) {
    body = <EmptyState size="sm" role="status" {...empty} />
  }

  return (
    <section ref={ref} aria-busy={loading || undefined} className={s.root({ className })} {...rest}>
      {body}
    </section>
  )
})
