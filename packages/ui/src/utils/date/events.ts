/**
 * Calendar events for MonthView and Agenda (docs/component-month-view.md §3, Q41): the shared
 * `CalendarEvent` type and the pure helpers that place events on wall dates in a time zone, sort
 * them and describe their range.
 *
 * Pure and server-safe. Internal, except the `CalendarEvent` type, which both components
 * re-export.
 */
import type { ReactNode } from 'react'
import { addDays, type CalendarDate, toUtcDate } from './calendar-date'
import { utcFormatter } from './locale'
import { instantToWall } from './zone'

/**
 * One event on a `MonthView` or an `Agenda`: a tournament, a release, a check-in window.
 *
 * @example
 * ```tsx
 * import type { CalendarEvent } from '@sukunagg/ui'
 *
 * const copa: CalendarEvent = {
 *   id: 'copa-pitaya',
 *   title: 'Copa Pitaya · Valorant 5v5',
 *   start: '2026-10-10T01:00:00Z',
 *   color: 'var(--sk-chart-1)',
 *   href: '/torneos/copa-pitaya',
 *   meta: 'Valorant · Presencial',
 * }
 * ```
 */
export interface CalendarEvent {
  /** Stable key for the event. */
  id: string
  /** What it is: "Copa Pitaya · Valorant 5v5". Always text, so color is never the only signal. */
  title: string
  /**
   * `'YYYY-MM-DD'` for an all-day event, or an ISO instant (`'2026-10-10T01:00:00Z'`) for a
   * timed one, which is placed on its wall date in the component's `timeZone`.
   */
  start: string
  /**
   * Same forms as `start`. An all-day `end` is inclusive (`'2026-10-12'` includes the 12th); a
   * timed `end` at exactly midnight closes the day before. Omit it for a one-day or zero-length
   * event. An end on a later day than the start makes the event multi-day.
   */
  end?: string
  /**
   * CSS color for the dot or bar, e.g. a game color (`'var(--game-valorant)'`). Decoration only.
   * @default 'var(--sk-chart-1)'
   */
  color?: string
  /** Makes the event a link. Its name includes the time and the title. */
  href?: string
  /** Second line in the list layout: "Valorant · In person". */
  meta?: string
  /** Trailing node in the list layout, e.g. `<Badge>Full</Badge>`. Say the state in text. */
  status?: ReactNode
}

/** An event placed on the wall dates it covers in a time zone. */
export interface PlacedEvent {
  event: CalendarEvent
  /** First wall date. */
  start: CalendarDate
  /** Last wall date, inclusive (never before `start`). */
  end: CalendarDate
  /** Wall start time `'HH:mm'` of a timed event; undefined for an all-day one. */
  time?: string
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** True for `'YYYY-MM-DD'` (an all-day value), false for an instant. */
export const isDateOnly = (value: string): boolean => DATE_ONLY.test(value)

/**
 * Places an event on wall dates: all-day dates as they are, timed instants on their wall date in
 * `timeZone`. A timed end at midnight belongs to the day before (18:00–00:00 is one day).
 */
export const placeEvent = (event: CalendarEvent, timeZone: string): PlacedEvent => {
  const wall = isDateOnly(event.start) ? undefined : instantToWall(event.start, timeZone)
  const start = wall?.date ?? event.start
  let end = start
  if (event.end !== undefined) {
    if (isDateOnly(event.end)) end = event.end
    else {
      const w = instantToWall(event.end, timeZone)
      end = w.time === '00:00' && w.date > start ? addDays(w.date, -1) : w.date
    }
  }
  return { event, start, end: end > start ? end : start, time: wall?.time }
}

/** True when the event covers more than one wall date. */
export const isMultiDay = (p: PlacedEvent): boolean => p.end > p.start

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/**
 * Display order: all-day and multi-day events first (earlier start, then longer), then timed
 * events by start date and time. Ties keep their input order (`Array#sort` is stable).
 */
export const compareEvents = (a: PlacedEvent, b: PlacedEvent): number => {
  const group = (p: PlacedEvent) => (p.time === undefined || isMultiDay(p) ? 0 : 1)
  return (
    group(a) - group(b) ||
    cmp(a.start, b.start) ||
    cmp(b.end, a.end) ||
    cmp(a.time ?? '', b.time ?? '')
  )
}

/** Places and sorts events (see {@link placeEvent} and {@link compareEvents}). */
export const placeEvents = (events: readonly CalendarEvent[], timeZone: string): PlacedEvent[] =>
  events.map((e) => placeEvent(e, timeZone)).sort(compareEvents)

/** The events that cover `date`, in display order when `placed` is sorted. */
export const eventsOn = (placed: readonly PlacedEvent[], date: CalendarDate): PlacedEvent[] =>
  placed.filter((p) => p.start <= date && date <= p.end)

const zoneRangeFormatters = new Map<string, Intl.DateTimeFormat>()

/**
 * The span of an event as text: "Oct 9 – 12" for all-day dates, "Oct 9, 6:00 PM – Oct 10,
 * 2:00 AM" (wall times in `timeZone`) for a timed event.
 */
export const eventRange = (p: PlacedEvent, locale: string, timeZone: string): string => {
  if (p.time === undefined) {
    return utcFormatter(locale, { month: 'short', day: 'numeric' }).formatRange(
      toUtcDate(p.start),
      toUtcDate(p.end),
    )
  }
  const key = `${locale}|${timeZone}`
  let f = zoneRangeFormatters.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, {
      timeZone,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
    zoneRangeFormatters.set(key, f)
  }
  const start = new Date(p.event.start)
  // Never before the start: some engines throw on a reversed range.
  const end = new Date(Math.max(start.getTime(), new Date(p.event.end ?? p.event.start).getTime()))
  return f.formatRange(start, end)
}
