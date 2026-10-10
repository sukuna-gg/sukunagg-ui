/**
 * IANA time-zone math with the browser's (and Node's) own `Intl` data, no Temporal polyfill
 * (Q41, recommendation 3). Converts between an instant (an ISO string with `Z`) and the wall
 * date/time someone sees in a zone, including daylight-saving gaps and overlaps.
 *
 * Pure and server-safe. Internal: not exported from the package root.
 */
import { type CalendarDate, fromParts, toParts } from './calendar-date'

/** A wall clock reading in some zone: `'2026-11-14'` + `'18:00'`. */
export interface WallTime {
  date: CalendarDate
  /** 24-hour `'HH:mm'`. */
  time: string
}

const HOUR_MS = 3_600_000
const pad = (n: number) => String(n).padStart(2, '0')

const zoneFormatters = new Map<string, Intl.DateTimeFormat>()
const zoneFormatter = (timeZone: string) => {
  let f = zoneFormatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    zoneFormatters.set(timeZone, f)
  }
  return f
}

/** True for a zone `Intl` knows ('America/Hermosillo', 'UTC'). */
export const isValidTimeZone = (timeZone: string): boolean => {
  try {
    zoneFormatter(timeZone)
    return true
  } catch {
    return false
  }
}

/** The wall clock fields of an instant in a zone. */
const wallFields = (ms: number, timeZone: string) => {
  const parts: Record<string, number> = {}
  for (const p of zoneFormatter(timeZone).formatToParts(new Date(ms))) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value)
  }
  // Some engines print midnight as 24 even with h23.
  const hour = parts.hour === 24 ? 0 : (parts.hour as number)
  return {
    year: parts.year as number,
    month: parts.month as number,
    day: parts.day as number,
    hour,
    minute: parts.minute as number,
    second: parts.second as number,
  }
}

/** The zone's offset from UTC at an instant, in ms (Hermosillo: -7h). */
export const zoneOffset = (ms: number, timeZone: string): number => {
  const w = wallFields(ms, timeZone)
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second)
  return asUtc - Math.floor(ms / 1000) * 1000
}

/** The wall date and time of an instant in a zone. */
export const instantToWall = (instant: string | number | Date, timeZone: string): WallTime => {
  const ms = typeof instant === 'number' ? instant : new Date(instant).getTime()
  const w = wallFields(ms, timeZone)
  return { date: fromParts(w.year, w.month, w.day), time: `${pad(w.hour)}:${pad(w.minute)}` }
}

/**
 * The instant for a wall date/time in a zone, as an ISO string. `exists` is false for a time
 * skipped by a daylight-saving jump (02:30 on a spring-forward night); like Temporal's
 * `'compatible'` disambiguation, it then moves forward by the gap (→ 03:30). A repeated time
 * (fall back) resolves to the earlier instant.
 */
export const wallToInstant = (
  date: CalendarDate,
  time: string,
  timeZone: string,
): { instant: string; exists: boolean } => {
  const { year, month, day } = toParts(date)
  const [hour, minute] = time.split(':').map(Number) as [number, number]
  const wallMs = Date.UTC(year, month - 1, day, hour, minute)
  // The offsets on either side of any transition near this wall time (zones change at most once
  // within a day), then keep the candidates that read back as this wall time.
  const before = zoneOffset(wallMs - 12 * HOUR_MS, timeZone)
  const after = zoneOffset(wallMs + 12 * HOUR_MS, timeZone)
  const valid = [wallMs - before, wallMs - after].filter(
    (ms) => zoneOffset(ms, timeZone) === wallMs - ms,
  )
  if (valid.length > 0) return { instant: new Date(Math.min(...valid)).toISOString(), exists: true }
  return { instant: new Date(wallMs - before).toISOString(), exists: false }
}

/** Today in a zone (sukuna-gg-web passes the viewer's zone from its `gg_tz` cookie). */
export const todayIn = (timeZone: string, now: Date = new Date()): CalendarDate =>
  instantToWall(now, timeZone).date

/** "Hermosillo · GMT-7": a readable label for a zone on a given date. */
export const zoneLabel = (timeZone: string, locale: string, at: number = Date.now()): string => {
  const city = (timeZone.split('/').pop() ?? timeZone).replace(/_/g, ' ')
  const offset =
    new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'shortOffset' })
      .formatToParts(new Date(at))
      .find((p) => p.type === 'timeZoneName')?.value ?? ''
  return offset ? `${city} · ${offset}` : city
}

/** Minutes since midnight for 'HH:mm'. */
export const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number) as [number, number]
  return h * 60 + m
}

/** 'HH:mm' for minutes since midnight. */
export const minutesToTime = (minutes: number): string =>
  `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
