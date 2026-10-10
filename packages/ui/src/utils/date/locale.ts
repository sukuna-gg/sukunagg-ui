/**
 * Locale data for the calendar components: the first day of the week, month and weekday names,
 * and the day/month/year order people type dates in. Names come from `Intl` with
 * `timeZone: 'UTC'` on a UTC-midnight `Date`, so formatting can never shift the day.
 *
 * Pure and server-safe. Internal: not exported from the package root.
 */
import { type CalendarDate, daysInMonth, fromParts, toUtcDate } from './calendar-date'

/*
 * First day of the week by region, from CLDR weekData (supplementalData.xml). Everything not
 * listed starts on Monday (CLDR's "001" default). A fixed table instead of
 * `Intl.Locale#getWeekInfo`, which isn't in every engine: the server and every browser agree.
 */
const SUNDAY = new Set(
  'AG AS BD BR BS BT BW BZ CA CO DM DO ET GT GU HK HN ID IL IN JM JP KE KH KR LA MH MM MO MT MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW UM US VE VI WS YE ZA ZW'.split(
    ' ',
  ),
)
const SATURDAY = new Set('AE AF BH DJ DZ EG IQ IR JO KW LY OM QA SD SY'.split(' '))
const FRIDAY = new Set(['MV'])

/** The region a locale implies (`'es'` → `'ES'`, `'en'` → `'US'`), or undefined. */
export const regionOf = (locale: string): string | undefined => {
  try {
    return new Intl.Locale(locale).maximize().region
  } catch {
    return undefined
  }
}

/** 0 = Sunday … 6 = Saturday, from the locale's region (CLDR). Unknown → Monday. */
export const weekStartFor = (locale: string): number => {
  const region = regionOf(locale)
  if (region === undefined) return 1
  if (SUNDAY.has(region)) return 0
  if (SATURDAY.has(region)) return 6
  if (FRIDAY.has(region)) return 5
  return 1
}

const formatters = new Map<string, Intl.DateTimeFormat>()

/** A cached UTC formatter (formatters are expensive to build). */
export const utcFormatter = (locale: string, options: Intl.DateTimeFormatOptions) => {
  const key = `${locale}|${JSON.stringify(options)}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' })
    formatters.set(key, f)
  }
  return f
}

/** Formats a calendar date. */
export const formatDate = (
  date: CalendarDate,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string => utcFormatter(locale, options).format(toUtcDate(date))

/** "Saturday, November 14, 2026": the name every day button carries. */
export const fullDateLabel = (date: CalendarDate, locale: string): string =>
  formatDate(date, locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

/** "November 2026" / "noviembre de 2026". */
export const monthYearLabel = (month: CalendarDate, locale: string): string =>
  formatDate(month, locale, { month: 'long', year: 'numeric' })

/** Seven weekday names starting on `weekStartsOn`, short (trailing "." removed) and long. */
export const weekdayNames = (
  locale: string,
  weekStartsOn: number,
): { short: string; narrow: string; long: string }[] =>
  Array.from({ length: 7 }, (_, i) => {
    // 2026-10-04 is a Sunday, so weekday d is October 4 + d.
    const date = fromParts(2026, 10, 4 + ((weekStartsOn + i) % 7))
    return {
      short: formatDate(date, locale, { weekday: 'short' }).replace(/\.$/, ''),
      narrow: formatDate(date, locale, { weekday: 'narrow' }),
      long: formatDate(date, locale, { weekday: 'long' }),
    }
  })

/** Short month names, January first ("Jan" / "ene"), trailing "." removed. */
export const monthNames = (locale: string): string[] =>
  Array.from({ length: 12 }, (_, i) =>
    formatDate(fromParts(2026, i + 1, 1), locale, { month: 'short' }).replace(/\.$/, ''),
  )

export type DatePart = 'day' | 'month' | 'year'

/** The order and separator people type dates in: en-US month/day/year, es-MX day/month/year. */
export const typedDateFormat = (locale: string): { order: DatePart[]; separator: string } => {
  const parts = utcFormatter(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(toUtcDate('2026-11-14'))
  const order = parts
    .map((p) => p.type)
    .filter((t): t is DatePart => t === 'day' || t === 'month' || t === 'year')
  const separator = parts.find((p) => p.type === 'literal')?.value.trim() || '/'
  return { order, separator }
}

/** "04/12/1998" (en-US) or "12/04/1998" (es-MX): what a date field shows. */
export const formatTypedDate = (date: CalendarDate, locale: string): string => {
  const { order, separator } = typedDateFormat(locale)
  const [year, month, day] = date.split('-') as [string, string, string]
  const value: Record<DatePart, string> = { year, month, day }
  return order.map((p) => value[p]).join(separator)
}

/** "MM/DD/YYYY" from per-part placeholders (translatable: `{ year: 'AAAA' }`). */
export const typedDatePlaceholder = (
  locale: string,
  placeholders: Record<DatePart, string> = { day: 'DD', month: 'MM', year: 'YYYY' },
): string => {
  const { order, separator } = typedDateFormat(locale)
  return order.map((p) => placeholders[p]).join(separator)
}

/**
 * Reads what someone typed: the locale's order with any separators ("4/12/1998", "4-12-1998"),
 * eight digits in that order ("04121998", for numeric keypads without "/"), or ISO
 * ("1998-04-12"). Returns null for anything else, including two-digit years and impossible dates.
 */
export const parseTypedDate = (text: string, locale: string): CalendarDate | null => {
  const trimmed = text.trim()
  let groups = trimmed.match(/\d+/g) ?? []
  const { order } = typedDateFormat(locale)
  if (groups.length === 1 && groups[0]?.length === 8) {
    // Compact: split by the locale's order, the year taking four digits.
    const digits = groups[0]
    const out: string[] = []
    let i = 0
    for (const part of order) {
      const len = part === 'year' ? 4 : 2
      out.push(digits.slice(i, i + len))
      i += len
    }
    groups = out
  }
  if (groups.length !== 3) return null
  const value: Partial<Record<DatePart, string>> = {}
  if ((groups[0] as string).length === 4) {
    // ISO order, whatever the locale.
    ;[value.year, value.month, value.day] = groups
  } else {
    order.forEach((part, i) => {
      value[part] = groups[i]
    })
  }
  if (value.year?.length !== 4) return null
  const year = Number(value.year)
  const month = Number(value.month)
  const day = Number(value.day)
  if (!(month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month))) return null
  return fromParts(year, month, day)
}
