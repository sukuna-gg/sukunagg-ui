/**
 * Calendar-date math on `'YYYY-MM-DD'` strings: the value every calendar component takes and
 * returns (docs/component-calendar.md, Q41). A calendar date has no time and no zone, so it can't
 * shift a day when it crosses a server, a browser or a time zone. All arithmetic runs on UTC day
 * numbers; nothing here reads the clock except {@link todayLocal}.
 *
 * Pure and server-safe. Internal: not exported from the package root.
 */

/** A calendar date, `'YYYY-MM-DD'`. */
export type CalendarDate = string

/** An inclusive range of calendar dates, `start <= end`. */
export interface DateRange {
  start: CalendarDate
  end: CalendarDate
}

const DAY_MS = 86_400_000
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

const pad = (n: number, width = 2) => String(n).padStart(width, '0')

/** Days in a month (`month` is 1–12). */
export const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate()

/** Builds a date from its parts; does not validate (use {@link isCalendarDate} for input). */
export const fromParts = (year: number, month: number, day: number): CalendarDate =>
  `${pad(year, 4)}-${pad(month)}-${pad(day)}`

/** Splits a date into numbers. Expects a valid date. */
export const toParts = (date: CalendarDate): { year: number; month: number; day: number } => {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number]
  return { year, month, day }
}

/** True for a real `'YYYY-MM-DD'` date (no Feb 30, no month 13). */
export const isCalendarDate = (value: unknown): value is CalendarDate => {
  if (typeof value !== 'string') return false
  const m = ISO_DATE.exec(value)
  if (!m) return false
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month)
}

/** Days since 1970-01-01 (UTC). */
export const toDayNumber = (date: CalendarDate): number => {
  const { year, month, day } = toParts(date)
  return Date.UTC(year, month - 1, day) / DAY_MS
}

/** The date for a day number. */
export const fromDayNumber = (n: number): CalendarDate => {
  const d = new Date(n * DAY_MS)
  return fromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

/** A `Date` at UTC midnight, for `Intl.DateTimeFormat(…, { timeZone: 'UTC' })` only. */
export const toUtcDate = (date: CalendarDate): Date => new Date(toDayNumber(date) * DAY_MS)

export const addDays = (date: CalendarDate, days: number): CalendarDate =>
  fromDayNumber(toDayNumber(date) + days)

/** Adds months, clamping the day to the target month (Jan 31 + 1 month = Feb 28/29). */
export const addMonths = (date: CalendarDate, months: number): CalendarDate => {
  const { year, month, day } = toParts(date)
  const index = year * 12 + (month - 1) + months
  const y = Math.floor(index / 12)
  const m = index - y * 12 + 1
  return fromParts(y, m, Math.min(day, daysInMonth(y, m)))
}

export const addYears = (date: CalendarDate, years: number): CalendarDate =>
  addMonths(date, years * 12)

/** `b - a` in days. */
export const daysBetween = (a: CalendarDate, b: CalendarDate): number =>
  toDayNumber(b) - toDayNumber(a)

/** -1, 0 or 1. ISO dates compare correctly as strings. */
export const compareDates = (a: CalendarDate, b: CalendarDate): -1 | 0 | 1 =>
  a < b ? -1 : a > b ? 1 : 0

export const startOfMonth = (date: CalendarDate): CalendarDate => `${date.slice(0, 8)}01`

export const endOfMonth = (date: CalendarDate): CalendarDate => {
  const { year, month } = toParts(date)
  return fromParts(year, month, daysInMonth(year, month))
}

export const sameMonth = (a: CalendarDate, b: CalendarDate): boolean =>
  a.slice(0, 7) === b.slice(0, 7)

/** 0 = Sunday … 6 = Saturday. */
export const dayOfWeek = (date: CalendarDate): number => toUtcDate(date).getUTCDay()

/** The first day of the week holding `date`. */
export const startOfWeek = (date: CalendarDate, weekStartsOn: number): CalendarDate =>
  addDays(date, -((dayOfWeek(date) - weekStartsOn + 7) % 7))

/** `date` pulled into `[min, max]` (either bound optional). */
export const clampDate = (
  date: CalendarDate,
  min?: CalendarDate,
  max?: CalendarDate,
): CalendarDate =>
  min !== undefined && date < min ? min : max !== undefined && date > max ? max : date

export const isWithin = (date: CalendarDate, min?: CalendarDate, max?: CalendarDate): boolean =>
  (min === undefined || date >= min) && (max === undefined || date <= max)

/**
 * The weeks shown for `month` (any day in it): rows of seven dates starting on `weekStartsOn`,
 * including the outside days that complete the first and last rows. With `fixedWeeks` there are
 * always six rows, so a calendar never changes height between months.
 */
export const monthMatrix = (
  month: CalendarDate,
  weekStartsOn: number,
  fixedWeeks = true,
): CalendarDate[][] => {
  const first = startOfMonth(month)
  const start = startOfWeek(first, weekStartsOn)
  const last = endOfMonth(month)
  const rows = fixedWeeks ? 6 : Math.ceil((daysBetween(start, last) + 1) / 7)
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: 7 }, (_, c) => addDays(start, r * 7 + c)),
  )
}

/** Today in the browser's own time zone. Client-only: call it in an effect or a handler. */
export const todayLocal = (now: Date = new Date()): CalendarDate =>
  fromParts(now.getFullYear(), now.getMonth() + 1, now.getDate())

/** Today in UTC: the same answer on every server and browser at the same instant. */
export const todayUtc = (now: Date = new Date()): CalendarDate =>
  fromParts(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate())
