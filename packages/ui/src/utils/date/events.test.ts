import { describe, expect, it } from 'bun:test'
import {
  type CalendarEvent,
  compareEvents,
  eventRange,
  eventsOn,
  isDateOnly,
  isMultiDay,
  placeEvent,
  placeEvents,
} from './events'

const HMO = 'America/Hermosillo' // UTC-7 all year, no daylight saving
const ev = (start: string, end?: string, id = start): CalendarEvent => ({
  id,
  title: id,
  start,
  end,
})
const spaces = (s: string) => s.replace(/[  ]/g, ' ')

describe('events', () => {
  it('tells all-day dates from instants', () => {
    expect(isDateOnly('2026-10-10')).toBe(true)
    expect(isDateOnly('2026-10-10T18:00:00Z')).toBe(false)
  })

  it('keeps all-day dates as given, inclusive end', () => {
    expect(placeEvent(ev('2026-10-10'), HMO)).toMatchObject({
      start: '2026-10-10',
      end: '2026-10-10',
      time: undefined,
    })
    expect(placeEvent(ev('2026-10-09', '2026-10-12'), HMO)).toMatchObject({
      start: '2026-10-09',
      end: '2026-10-12',
    })
  })

  it('places timed events on their wall date in the zone', () => {
    // 06:30 UTC on the 10th is 23:30 on the 9th in Hermosillo.
    const late = ev('2026-10-10T06:30:00Z')
    expect(placeEvent(late, HMO)).toMatchObject({ start: '2026-10-09', time: '23:30' })
    expect(placeEvent(late, 'UTC')).toMatchObject({ start: '2026-10-10', time: '06:30' })
  })

  it('ends a timed event at midnight on the day before, and multi-day otherwise', () => {
    const toMidnight = placeEvent(ev('2026-10-10T01:00:00Z', '2026-10-10T07:00:00Z'), HMO)
    expect(toMidnight).toMatchObject({ start: '2026-10-09', end: '2026-10-09' })
    expect(isMultiDay(toMidnight)).toBe(false)
    const overnight = placeEvent(ev('2026-10-10T01:00:00Z', '2026-10-10T09:00:00Z'), HMO)
    expect(overnight).toMatchObject({ start: '2026-10-09', end: '2026-10-10', time: '18:00' })
    expect(isMultiDay(overnight)).toBe(true)
  })

  it('accepts a date-only end on a timed event and never ends before the start', () => {
    expect(placeEvent(ev('2026-10-10T18:00:00Z', '2026-10-12'), 'UTC').end).toBe('2026-10-12')
    expect(placeEvent(ev('2026-10-12', '2026-10-10'), 'UTC').end).toBe('2026-10-12')
  })

  it('sorts all-day and multi-day first (earlier, then longer), then timed by time', () => {
    const order = placeEvents(
      [
        ev('2026-10-10T20:00:00Z', undefined, 'late'),
        ev('2026-10-10T15:00:00Z', undefined, 'early'),
        ev('2026-10-10', undefined, 'allday'),
        ev('2026-10-09', '2026-10-11', 'short'),
        ev('2026-10-09', '2026-10-14', 'long'),
        ev('2026-10-09T15:00:00Z', undefined, 'yesterday'),
      ],
      'UTC',
    ).map((p) => p.event.id)
    expect(order).toEqual(['long', 'short', 'allday', 'yesterday', 'early', 'late'])
    const a = placeEvent(ev('2026-10-10T15:00:00Z', undefined, 'a'), 'UTC')
    expect(compareEvents(a, { ...a })).toBe(0)
  })

  it('finds the events covering a day', () => {
    const placed = placeEvents(
      [ev('2026-10-09', '2026-10-11', 'bar'), ev('2026-10-12', undefined, 'next')],
      'UTC',
    )
    expect(eventsOn(placed, '2026-10-10').map((p) => p.event.id)).toEqual(['bar'])
    expect(eventsOn(placed, '2026-10-12').map((p) => p.event.id)).toEqual(['next'])
    expect(eventsOn(placed, '2026-10-13')).toEqual([])
  })

  it('describes a range with dates, or with wall times for timed events', () => {
    const allDay = placeEvent(ev('2026-10-09', '2026-10-12'), 'UTC')
    expect(spaces(eventRange(allDay, 'en-US', 'UTC'))).toBe('Oct 9 – 12')
    expect(spaces(eventRange(allDay, 'es-MX', 'UTC'))).toContain('oct')
    const overnight = placeEvent(ev('2026-10-10T01:00:00Z', '2026-10-10T09:00:00Z'), HMO)
    expect(spaces(eventRange(overnight, 'en-US', HMO))).toBe('Oct 9, 6:00 PM – Oct 10, 2:00 AM')
    const point = placeEvent(ev('2026-10-10T01:00:00Z'), HMO)
    expect(spaces(eventRange(point, 'en-US', HMO))).toBe('Oct 9, 6:00 PM')
    // A timed end before the start doesn't throw.
    const reversed = placeEvent(ev('2026-10-10T01:00:00Z', '2026-10-09T01:00:00Z'), HMO)
    expect(spaces(eventRange(reversed, 'en-US', HMO))).toBe('Oct 9, 6:00 PM')
  })
})
