import { describe, expect, it } from 'bun:test'
import {
  addDays,
  addMonths,
  addYears,
  clampDate,
  compareDates,
  dayOfWeek,
  daysBetween,
  daysInMonth,
  endOfMonth,
  fromDayNumber,
  isCalendarDate,
  isWithin,
  monthMatrix,
  sameMonth,
  startOfMonth,
  startOfWeek,
  toDayNumber,
  todayLocal,
  todayUtc,
  toParts,
} from './calendar-date'
import {
  formatDate,
  formatTypedDate,
  fullDateLabel,
  monthNames,
  monthYearLabel,
  parseTypedDate,
  regionOf,
  typedDateFormat,
  typedDatePlaceholder,
  weekdayNames,
  weekStartFor,
} from './locale'
import {
  instantToWall,
  isValidTimeZone,
  minutesToTime,
  timeToMinutes,
  todayIn,
  wallToInstant,
  zoneLabel,
  zoneOffset,
} from './zone'

describe('calendar-date', () => {
  it('validates real dates only', () => {
    expect(isCalendarDate('2026-11-14')).toBe(true)
    expect(isCalendarDate('2028-02-29')).toBe(true)
    expect(isCalendarDate('2026-02-29')).toBe(false)
    expect(isCalendarDate('2026-13-01')).toBe(false)
    expect(isCalendarDate('2026-00-10')).toBe(false)
    expect(isCalendarDate('2026-1-1')).toBe(false)
    expect(isCalendarDate(20261114)).toBe(false)
  })

  it('splits and rebuilds dates through day numbers', () => {
    expect(toParts('2026-11-14')).toEqual({ year: 2026, month: 11, day: 14 })
    expect(fromDayNumber(toDayNumber('2026-11-14'))).toBe('2026-11-14')
    expect(toDayNumber('1970-01-02')).toBe(1)
  })

  it('adds days across month and year edges', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29')
    expect(daysBetween('2026-10-09', '2026-11-14')).toBe(36)
  })

  it('clamps the day when adding months and years', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2026-01-15', -1)).toBe('2025-12-15')
    expect(addMonths('2026-12-15', 13)).toBe('2028-01-15')
    expect(addYears('2028-02-29', 1)).toBe('2029-02-28')
  })

  it('compares, bounds and groups months', () => {
    expect(compareDates('2026-01-01', '2026-01-02')).toBe(-1)
    expect(compareDates('2026-01-02', '2026-01-01')).toBe(1)
    expect(compareDates('2026-01-02', '2026-01-02')).toBe(0)
    expect(startOfMonth('2026-11-14')).toBe('2026-11-01')
    expect(endOfMonth('2026-02-14')).toBe('2026-02-28')
    expect(daysInMonth(2028, 2)).toBe(29)
    expect(sameMonth('2026-11-01', '2026-11-30')).toBe(true)
    expect(sameMonth('2026-11-30', '2026-12-01')).toBe(false)
    expect(clampDate('2026-01-01', '2026-02-01')).toBe('2026-02-01')
    expect(clampDate('2026-03-01', undefined, '2026-02-01')).toBe('2026-02-01')
    expect(clampDate('2026-02-10', '2026-02-01', '2026-02-28')).toBe('2026-02-10')
    expect(isWithin('2026-02-10', '2026-02-01', '2026-02-28')).toBe(true)
    expect(isWithin('2026-03-10', '2026-02-01')).toBe(true)
    expect(isWithin('2026-01-10', '2026-02-01')).toBe(false)
    expect(isWithin('2026-03-10', undefined, '2026-02-28')).toBe(false)
  })

  it('knows weekdays and week starts', () => {
    expect(dayOfWeek('2026-10-09')).toBe(5) // Friday
    expect(startOfWeek('2026-10-09', 0)).toBe('2026-10-04')
    expect(startOfWeek('2026-10-09', 1)).toBe('2026-10-05')
    expect(startOfWeek('2026-10-04', 1)).toBe('2026-09-28')
  })

  it('builds six-row month matrices, or just the weeks needed', () => {
    const fixed = monthMatrix('2026-02-14', 0)
    expect(fixed).toHaveLength(6)
    expect(fixed[0]?.[0]).toBe('2026-02-01') // Feb 2026 starts on a Sunday
    expect(fixed.every((row) => row.length === 7)).toBe(true)
    expect(monthMatrix('2026-02-14', 0, false)).toHaveLength(4)
    const monday = monthMatrix('2026-11-01', 1, false)
    expect(monday[0]?.[0]).toBe('2026-10-26')
    expect(monday.at(-1)?.at(-1)).toBe('2026-12-06')
  })

  it('reads today locally or in UTC', () => {
    const now = new Date(Date.UTC(2026, 9, 10, 3, 0))
    expect(todayUtc(now)).toBe('2026-10-10')
    expect(todayLocal(new Date(2026, 9, 9, 12))).toBe('2026-10-09')
    expect(isCalendarDate(todayLocal())).toBe(true)
    expect(isCalendarDate(todayUtc())).toBe(true)
  })
})

describe('locale', () => {
  it('starts weeks from the CLDR region', () => {
    expect(weekStartFor('en-US')).toBe(0)
    expect(weekStartFor('es-MX')).toBe(0)
    expect(weekStartFor('en-GB')).toBe(1)
    expect(weekStartFor('es')).toBe(1) // es → ES
    expect(weekStartFor('ar-EG')).toBe(6)
    expect(weekStartFor('dv-MV')).toBe(5)
    expect(weekStartFor('not a locale!!')).toBe(1)
    expect(regionOf('en')).toBe('US')
    expect(regionOf('not a locale!!')).toBeUndefined()
  })

  it('names days and months without shifting the date', () => {
    expect(fullDateLabel('2026-11-14', 'en-US')).toBe('Saturday, November 14, 2026')
    expect(fullDateLabel('2026-11-14', 'es-MX')).toBe('sábado, 14 de noviembre de 2026')
    expect(monthYearLabel('2026-11-01', 'en-US')).toBe('November 2026')
    expect(formatDate('2026-01-01', 'en-US', { month: 'short' })).toBe('Jan')
    expect(monthNames('en-US')[11]).toBe('Dec')
    const us = weekdayNames('en-US', 0)
    expect(us[0]).toEqual({ short: 'Sun', narrow: 'S', long: 'Sunday' })
    expect(weekdayNames('en-GB', 1)[0]?.long).toBe('Monday')
    expect(weekdayNames('es-MX', 0)[0]?.short).toBe('dom')
  })

  it('knows the typed order of each locale', () => {
    expect(typedDateFormat('en-US')).toEqual({ order: ['month', 'day', 'year'], separator: '/' })
    expect(typedDateFormat('es-MX').order).toEqual(['day', 'month', 'year'])
    expect(typedDateFormat('de-DE')).toEqual({ order: ['day', 'month', 'year'], separator: '.' })
    expect(formatTypedDate('1998-04-12', 'en-US')).toBe('04/12/1998')
    expect(formatTypedDate('1998-04-12', 'es-MX')).toBe('12/04/1998')
    expect(typedDatePlaceholder('en-US')).toBe('MM/DD/YYYY')
    expect(typedDatePlaceholder('es-MX', { day: 'DD', month: 'MM', year: 'AAAA' })).toBe(
      'DD/MM/AAAA',
    )
  })

  it('parses typed dates in the locale order, ISO and compact', () => {
    expect(parseTypedDate('4/12/1998', 'en-US')).toBe('1998-04-12')
    expect(parseTypedDate('12-04-1998', 'es-MX')).toBe('1998-04-12')
    expect(parseTypedDate(' 1998-04-12 ', 'es-MX')).toBe('1998-04-12')
    expect(parseTypedDate('04121998', 'en-US')).toBe('1998-04-12')
    expect(parseTypedDate('12041998', 'es-MX')).toBe('1998-04-12')
  })

  it('rejects two-digit years, impossible dates and noise', () => {
    expect(parseTypedDate('4/12/98', 'en-US')).toBeNull()
    expect(parseTypedDate('2/30/2026', 'en-US')).toBeNull()
    expect(parseTypedDate('13/01/2026', 'en-US')).toBeNull()
    expect(parseTypedDate('hello', 'en-US')).toBeNull()
    expect(parseTypedDate('1/2', 'en-US')).toBeNull()
    expect(parseTypedDate('', 'en-US')).toBeNull()
  })
})

describe('zone', () => {
  it('validates zones', () => {
    expect(isValidTimeZone('America/Hermosillo')).toBe(true)
    expect(isValidTimeZone('Mars/Olympus_Mons')).toBe(false)
  })

  it('reads wall time and offsets', () => {
    const ms = Date.UTC(2026, 10, 15, 1, 0)
    expect(zoneOffset(ms, 'America/Hermosillo')).toBe(-7 * 3_600_000)
    expect(zoneOffset(ms, 'Asia/Kathmandu')).toBe((5 * 60 + 45) * 60_000)
    expect(instantToWall('2026-11-15T01:00:00.000Z', 'America/Hermosillo')).toEqual({
      date: '2026-11-14',
      time: '18:00',
    })
    expect(instantToWall(ms, 'UTC')).toEqual({ date: '2026-11-15', time: '01:00' })
    expect(instantToWall(new Date(ms), 'Asia/Kathmandu').time).toBe('06:45')
  })

  it('turns wall time into instants in fixed and daylight-saving zones', () => {
    expect(wallToInstant('2026-11-14', '18:00', 'America/Hermosillo')).toEqual({
      instant: '2026-11-15T01:00:00.000Z',
      exists: true,
    })
    // Mexico City has no DST since 2022.
    expect(wallToInstant('2026-07-01', '12:00', 'America/Mexico_City').instant).toBe(
      '2026-07-01T18:00:00.000Z',
    )
    // New York: EDT in summer.
    expect(wallToInstant('2026-07-01', '12:00', 'America/New_York').instant).toBe(
      '2026-07-01T16:00:00.000Z',
    )
  })

  it('moves skipped spring-forward times forward and picks the earlier repeated time', () => {
    // 2026-03-08 02:30 doesn't exist in New York; 'compatible' lands on 03:30 EDT.
    const gap = wallToInstant('2026-03-08', '02:30', 'America/New_York')
    expect(gap.exists).toBe(false)
    expect(gap.instant).toBe('2026-03-08T07:30:00.000Z')
    expect(instantToWall(gap.instant, 'America/New_York').time).toBe('03:30')
    // 2026-11-01 01:30 happens twice; the earlier one is EDT (-4).
    const overlap = wallToInstant('2026-11-01', '01:30', 'America/New_York')
    expect(overlap).toEqual({ instant: '2026-11-01T05:30:00.000Z', exists: true })
    // Lord Howe moves by 30 minutes.
    expect(wallToInstant('2026-01-15', '12:00', 'Australia/Lord_Howe').instant).toBe(
      '2026-01-15T01:00:00.000Z',
    )
  })

  it('knows today in a zone and labels zones', () => {
    const now = new Date('2026-10-10T05:00:00.000Z')
    expect(todayIn('America/Hermosillo', now)).toBe('2026-10-09')
    expect(todayIn('UTC', now)).toBe('2026-10-10')
    expect(isCalendarDate(todayIn('UTC'))).toBe(true)
    expect(zoneLabel('America/Hermosillo', 'en-US', now.getTime())).toBe('Hermosillo · GMT-7')
    expect(zoneLabel('America/Argentina/Buenos_Aires', 'en-US', now.getTime())).toBe(
      'Buenos Aires · GMT-3',
    )
    expect(zoneLabel('UTC', 'en-US')).toContain('UTC')
  })

  it('converts between HH:mm and minutes', () => {
    expect(timeToMinutes('18:30')).toBe(1110)
    expect(minutesToTime(1110)).toBe('18:30')
    expect(minutesToTime(0)).toBe('00:00')
  })
})
