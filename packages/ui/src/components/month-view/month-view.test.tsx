import { describe, expect, it, mock } from 'bun:test'
import { readFileSync } from 'node:fs'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import type { CalendarDate } from '../../utils/date/calendar-date'
import { placeEvents } from '../../utils/date/events'
import { type CalendarEvent, MonthView } from './index'
import { layoutWeek } from './month-view.logic'

const HMO = 'America/Hermosillo' // UTC-7, no daylight saving
const TODAY = '2026-10-09' // a Friday
const MONTH = '2026-10-01'

const week = (start: number): CalendarDate[] =>
  Array.from({ length: 7 }, (_, i) => `2026-10-${String(start + i).padStart(2, '0')}`)
const at = (date: string, hour: number, id = `${date}@${hour}`): CalendarEvent => ({
  id,
  title: id,
  start: `${date}T${String(hour).padStart(2, '0')}:00:00Z`,
})
const span = (id: string, start: string, end: string): CalendarEvent => ({
  id,
  title: id,
  start,
  end,
})
const ids = (list: { event: CalendarEvent }[]) => list.map((p) => p.event.id)

describe('layoutWeek', () => {
  it('cuts a multi-day bar at the week edge and continues it in the next week', () => {
    const placed = placeEvents([span('liga', '2026-10-08', '2026-10-13')], 'UTC')
    const [first] = layoutWeek(week(4), placed, 3).bars
    expect(first).toMatchObject({
      lane: 0,
      col: 4,
      span: 3,
      continuesStart: false,
      continuesEnd: true,
      primary: true,
    })
    const [second] = layoutWeek(week(11), placed, 3).bars
    expect(second).toMatchObject({ col: 0, span: 3, continuesStart: true, continuesEnd: false })
  })

  it('puts bars first, earlier then longer, in the lowest free lane', () => {
    const placed = placeEvents(
      [
        span('short', '2026-10-05', '2026-10-06'),
        span('long', '2026-10-05', '2026-10-09'),
        span('later', '2026-10-07', '2026-10-08'),
        at('2026-10-07', 18, 'timed'),
      ],
      'UTC',
    )
    const { bars, days } = layoutWeek(week(4), placed, 4)
    expect(bars.map((b) => [b.placed.event.id, b.lane])).toEqual([
      ['long', 0],
      ['short', 1],
      ['later', 1],
    ])
    expect(days[3]?.items.map((i) => i.lane)).toEqual([2])
  })

  it('folds a busy day into "+N more" in the last lane', () => {
    const placed = placeEvents(
      [
        span('bar', '2026-10-08', '2026-10-09'),
        at('2026-10-08', 15, 'a'),
        at('2026-10-08', 16, 'b'),
        at('2026-10-08', 17, 'c'),
      ],
      'UTC',
    )
    const { bars, days } = layoutWeek(week(4), placed, 3)
    const thursday = days[4]
    expect(thursday?.items.map((i) => [i.placed.event.id, i.lane])).toEqual([['a', 1]])
    expect(ids(thursday?.hidden ?? [])).toEqual(['b', 'c'])
    expect(ids(thursday?.all ?? [])).toEqual(['bar', 'a', 'b', 'c'])
    expect(bars).toHaveLength(1)
    expect(days[5]?.hidden).toEqual([])
  })

  it('honours maxLanes', () => {
    const placed = placeEvents(
      [span('bar', '2026-10-08', '2026-10-09'), at('2026-10-08', 15), at('2026-10-08', 16)],
      'UTC',
    )
    expect(layoutWeek(week(4), placed, 5).days[4]?.hidden).toEqual([])
    const one = layoutWeek(week(4), placed, 1)
    expect(one.days[4]?.hidden).toHaveLength(3)
    expect(one.days[4]?.items).toEqual([])
    // The bar fits on Friday (one event, one lane) but not Thursday: it's drawn on Friday only.
    expect(one.bars).toMatchObject([{ col: 5, span: 1, continuesStart: true, primary: true }])
    expect(layoutWeek(week(4), placed, 0).days[4]?.hidden).toHaveLength(3)
  })

  it('splits a bar around a day where its lane is folded away', () => {
    const placed = placeEvents(
      [
        span('a', '2026-10-05', '2026-10-07'),
        span('b', '2026-10-05', '2026-10-07'),
        span('c', '2026-10-05', '2026-10-07'),
        at('2026-10-06', 18, 'extra'),
      ],
      'UTC',
    )
    const { bars, days } = layoutWeek(week(4), placed, 3)
    const c = bars.filter((b) => b.placed.event.id === 'c')
    expect(c).toMatchObject([
      { col: 1, span: 1, continuesStart: false, continuesEnd: true, primary: true },
      { col: 3, span: 1, continuesStart: true, continuesEnd: false, primary: false },
    ])
    expect(ids(days[2]?.hidden ?? [])).toEqual(['c', 'extra'])
  })

  it('ignores events outside the week', () => {
    const placed = placeEvents([at('2026-10-20', 18), span('x', '2026-09-01', '2026-09-30')], 'UTC')
    const { bars, days } = layoutWeek(week(4), placed, 3)
    expect(bars).toEqual([])
    expect(days.every((d) => d.all.length === 0)).toBe(true)
  })
})

const schedule: CalendarEvent[] = [
  {
    id: 'copa',
    title: 'Copa Pitaya',
    start: '2026-10-10T01:00:00Z', // Fri Oct 9, 18:00 in Hermosillo
    href: '/torneos/copa-pitaya',
    color: 'var(--game-valorant)',
    meta: 'Valorant · Presencial',
  },
  {
    id: 'late',
    title: 'Late scrim',
    start: '2026-10-10T06:30:00Z', // Fri Oct 9, 23:30 in Hermosillo; Sat Oct 10 in UTC
  },
  { id: 'liga', title: 'Liga Otoño', start: '2026-10-08', end: '2026-10-13', href: '/liga' },
  { id: 'free', title: 'Día libre', start: '2026-10-21' },
]

const busy: CalendarEvent[] = [
  span('bar', '2026-10-14', '2026-10-15'),
  at('2026-10-14', 15, 'Scrim A'),
  at('2026-10-14', 16, 'Scrim B'),
  at('2026-10-14', 17, 'Scrim C'),
]

/** The `<ol>` of a day in the grid, found through its full-date heading. */
const dayList = (name: string) =>
  screen.getByRole('heading', { name }).parentElement?.parentElement?.querySelector('ol') ?? null
const dayTitles = (name: string) =>
  [...(dayList(name)?.querySelectorAll(':scope > li:not([aria-hidden])') ?? [])].map(
    (li) => li.querySelector('.truncate')?.textContent,
  )

describe('MonthView', () => {
  it('renders a section named by its caption on the server', () => {
    const html = renderServer(
      <MonthView month={MONTH} today={TODAY} events={schedule} timeZone={HMO} />,
    )
    expect(html).toContain('<section')
    expect(html).toContain('aria-labelledby="sk-month-2026-10-caption"')
    expect(html).toContain('<h2 id="sk-month-2026-10-caption"')
    expect(html).toContain('October 2026')
  })

  it('lists each day under a full-date heading and marks today', () => {
    render(<MonthView month={MONTH} today={TODAY} events={schedule} timeZone={HMO} list="never" />)
    expect(screen.getByRole('region', { name: 'October 2026' })).toBeTruthy()
    // Five weeks from Sunday, September 27 to Saturday, October 31.
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(35)
    const today = screen.getByRole('heading', { name: 'Friday, October 9, 2026' })
    expect(today).toHaveAttribute('aria-current', 'date')
    expect(today.querySelector('[aria-hidden]')?.className).toContain('bg-gradient-accent')
    const outside = screen.getByRole('heading', { name: 'Sunday, September 27, 2026' })
    expect(outside.querySelector('[aria-hidden]')?.className).toContain('text-text-faint')
    expect(dayTitles('Friday, October 9, 2026')).toEqual(['Copa Pitaya', 'Late scrim'])
  })

  it('buckets timed events by wall date in the time zone', () => {
    const { rerender } = render(
      <MonthView month={MONTH} today={TODAY} events={schedule} timeZone={HMO} list="never" />,
    )
    expect(dayTitles('Friday, October 9, 2026')).toContain('Late scrim')
    rerender(<MonthView month={MONTH} today={TODAY} events={schedule} list="never" />)
    expect(dayTitles('Friday, October 9, 2026')).not.toContain('Late scrim')
    expect(dayTitles('Saturday, October 10, 2026')).toContain('Late scrim')
  })

  it('names event links by time and title, and colors them through --sk-event', () => {
    render(<MonthView month={MONTH} today={TODAY} events={schedule} timeZone={HMO} list="never" />)
    const copa = screen.getByRole('link', { name: /^6\sPM\s?, Copa Pitaya$/ })
    expect(copa).toHaveAttribute('href', '/torneos/copa-pitaya')
    expect(copa.style.getPropertyValue('--sk-event')).toBe('var(--game-valorant)')
    expect(screen.getByText('Late scrim').closest('a')).toBeNull()
  })

  it('announces a multi-day bar once per week row, with its range', () => {
    render(<MonthView month={MONTH} today={TODAY} events={schedule} timeZone={HMO} list="never" />)
    const bars = screen.getAllByRole('link', { name: /^Liga Otoño/ })
    // One per week row: Thursday–Saturday, then Sunday–Tuesday.
    expect(bars).toHaveLength(2)
    expect(bars[0]?.textContent).toMatch(/Liga Otoño, Oct 8\s–\s13/)
    const firstItem = bars[0]?.parentElement as HTMLElement
    expect(firstItem.style.getPropertyValue('--sk-span')).toBe('3')
    expect(bars[0]?.className).toContain('rounded-r-none')
    expect(bars[1]?.className).toContain('rounded-l-none')
    expect(dayTitles('Thursday, October 8, 2026')).toEqual(['Liga Otoño'])
    expect(dayTitles('Friday, October 9, 2026')).not.toContain('Liga Otoño')
    // A one-day all-day event draws as a one-column bar that says "All day".
    expect(dayList('Wednesday, October 21, 2026')?.textContent).toBe('Día libre, All day')
  })

  it('hides the second piece of a split bar from screen readers and the tab order', () => {
    const events = [
      span('a', '2026-10-05', '2026-10-07'),
      span('b', '2026-10-05', '2026-10-07'),
      { ...span('c', '2026-10-05', '2026-10-07'), href: '/c' },
      at('2026-10-06', 18, 'extra'),
    ]
    const { container } = render(
      <MonthView month={MONTH} today={TODAY} events={events} list="never" dayHref={() => '/d'} />,
    )
    const pieces = [...container.querySelectorAll('a[href="/c"]')]
    expect(pieces).toHaveLength(2)
    expect(pieces[0]?.closest('li')).not.toHaveAttribute('aria-hidden')
    expect(pieces[1]?.closest('li')).toHaveAttribute('aria-hidden', 'true')
    expect(pieces[1]).toHaveAttribute('tabindex', '-1')
  })

  it('starts the week from the locale or weekStartsOn', () => {
    const first = () => screen.getAllByRole('heading', { level: 3 })[0]?.textContent
    const { container, rerender } = render(<MonthView month={MONTH} today={TODAY} list="never" />)
    const header = () => container.querySelector('[aria-hidden="true"]')?.textContent
    expect(header()).toStartWith('SunMon')
    expect(first()).toContain('Sunday, September 27')
    rerender(<MonthView month={MONTH} today={TODAY} list="never" locale="en-GB" />)
    expect(header()).toStartWith('MonTue')
    expect(first()).toContain('Monday, 28 September')
    rerender(<MonthView month={MONTH} today={TODAY} list="never" locale="es-MX" />)
    expect(header()).toStartWith('dom')
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('octubre de 2026')
    rerender(<MonthView month={MONTH} today={TODAY} list="never" weekStartsOn={6} />)
    expect(header()).toStartWith('Sat')
  })

  it('links to the previous, next and current month', () => {
    const monthHref = (m: CalendarDate) => `?month=${m.slice(0, 7)}`
    const { rerender } = render(
      <MonthView month={MONTH} today={TODAY} list="never" monthHref={monthHref} />,
    )
    expect(screen.getByRole('link', { name: 'Previous month' })).toHaveAttribute(
      'href',
      '?month=2026-09',
    )
    expect(screen.getByRole('link', { name: 'Next month' })).toHaveAttribute(
      'href',
      '?month=2026-11',
    )
    const today = screen.getByRole('link', { name: 'Today' })
    expect(today).toHaveAttribute('aria-disabled', 'true')
    expect(today).toHaveAttribute('href', '?month=2026-10')
    rerender(<MonthView month="2027-01-15" today={TODAY} list="never" monthHref={monthHref} />)
    expect(screen.getByRole('link', { name: 'Today' })).not.toHaveAttribute('aria-disabled')
    expect(screen.getByRole('link', { name: 'Previous month' })).toHaveAttribute(
      'href',
      '?month=2026-12',
    )
  })

  it('shows the caption without navigation when monthHref is omitted', () => {
    render(<MonthView month={MONTH} today={TODAY} list="never" />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('turns day numbers into links with dayHref, and "+N more" into a day link', () => {
    render(
      <MonthView
        month={MONTH}
        today={TODAY}
        events={busy}
        list="never"
        dayHref={(d) => (d === '2026-10-20' ? undefined : `/dia/${d}`)}
      />,
    )
    expect(screen.getByRole('link', { name: 'Saturday, October 10, 2026' })).toHaveAttribute(
      'href',
      '/dia/2026-10-10',
    )
    expect(screen.queryByRole('link', { name: 'Tuesday, October 20, 2026' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Tuesday, October 20, 2026' })).toBeTruthy()
    const more = screen.getByRole('link', { name: /^\+2 more\s?, Wednesday, October 14, 2026$/ })
    expect(more).toHaveAttribute('href', '/dia/2026-10-14')
    expect(document.querySelector('[popover]')).toBeNull()
  })

  it('opens a native popover listing the whole day when there is no dayHref', () => {
    render(<MonthView month={MONTH} today={TODAY} events={busy} list="never" id="torneos" />)
    const lanes = dayList('Wednesday, October 14, 2026')?.querySelectorAll(':scope > li') ?? []
    expect([...lanes].map((li) => li.querySelector('a, span, button')?.tagName)).toEqual([
      'SPAN',
      'SPAN',
      'BUTTON',
    ])
    const button = screen.getByRole('button', { name: /^\+2 more\s?, Wednesday, October 14/ })
    expect(button).toHaveAttribute('type', 'button')
    const popover = document.getElementById(button.getAttribute('popovertarget') as string)
    expect(popover?.id).toBe('torneos-more-2026-10-14')
    expect(popover).toHaveAttribute('popover', 'auto')
    expect(popover).toHaveAttribute('role', 'dialog')
    expect(popover).toHaveAccessibleName('Wednesday, October 14, 2026')
    const rows = within(popover as HTMLElement).getAllByRole('listitem')
    expect(rows.map((r) => r.textContent?.replace(/\s/g, ' '))).toEqual([
      'Oct 14 – 15, bar',
      '3 PM, Scrim A',
      '4 PM, Scrim B',
      '5 PM, Scrim C',
    ])
  })

  it('translates labels', () => {
    render(
      <MonthView
        month={MONTH}
        today={TODAY}
        events={busy}
        list="never"
        isDateUntracked={(d) => d === '2026-10-01'}
        monthHref={(m) => m}
        labels={{
          more: (n) => `+${n} más`,
          untracked: 'Sin registro',
          previousMonth: 'Mes anterior',
          nextMonth: 'Mes siguiente',
          today: 'Hoy',
        }}
      />,
    )
    expect(screen.getByRole('button', { name: /^\+2 más/ })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Sin registro$/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Mes anterior' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Hoy' })).toBeTruthy()
  })

  it('calls renderDay with the day info, never for untracked days', () => {
    const renderDay = mock((date: CalendarDate) => (date === '2026-10-09' ? '4 games' : null))
    render(
      <MonthView
        month={MONTH}
        today={TODAY}
        events={schedule}
        timeZone={HMO}
        list="never"
        renderDay={renderDay}
        isDateUntracked={(d) => d < '2026-10-04'}
      />,
    )
    const dates = renderDay.mock.calls.map((c) => c[0])
    expect(dates).toHaveLength(35 - 7)
    expect(dates).not.toContain('2026-10-03')
    const call = renderDay.mock.calls.find((c) => c[0] === '2026-10-09') as unknown[]
    expect(call[1]).toMatchObject({ inMonth: true, isToday: true })
    expect((call[1] as { events: CalendarEvent[] }).events.map((e: CalendarEvent) => e.id)).toEqual(
      ['liga', 'copa', 'late'],
    )
    expect(screen.getByText('4 games')).toBeTruthy()
    const untracked = screen.getByRole('heading', {
      name: 'Saturday, October 3, 2026, Not tracked',
    })
    expect(untracked).toBeTruthy()
    const hatched = document.querySelectorAll('[class*="repeating-linear-gradient"]')
    expect(hatched).toHaveLength(7)
  })

  it('draws tiles for renderDay content', () => {
    const { container } = render(
      <MonthView
        month={MONTH}
        today={TODAY}
        variant="tiles"
        list="never"
        isDateUntracked={(d) => d < '2026-10-04'}
        renderDay={(d) => (d === '2026-10-05' ? '3 games · avg 4.3' : null)}
      />,
    )
    // In-month days only: the outside days are blank cells.
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(31)
    const tile = (name: string) =>
      screen.getByRole('heading', { name }).parentElement as HTMLElement
    expect(tile('Monday, October 5, 2026').className).toContain('bg-surface-2')
    expect(tile('Monday, October 5, 2026').textContent).toContain('3 games · avg 4.3')
    expect(tile('Tuesday, October 6, 2026').className).toContain('bg-surface-2/45')
    expect(tile('Saturday, October 10, 2026').className).toContain('bg-transparent')
    expect(tile('Saturday, October 10, 2026').className).toContain('shadow-[inset')
    expect(tile('Friday, October 2, 2026, Not tracked').className).toContain(
      'repeating-linear-gradient',
    )
    expect(container.querySelector('ol')).toBeNull()
    expect(container.querySelector('[class*="grid-rows-subgrid"]')).toBeNull()
  })

  it('keeps the grid and shows the empty state over it when the month has no events', () => {
    const empty = { title: 'No hay torneos este mes', children: 'Anunciamos fechas primero.' }
    const { rerender } = render(
      <MonthView
        month={MONTH}
        today={TODAY}
        events={[at('2026-11-02', 18)]}
        list="never"
        empty={empty}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('No hay torneos este mes')
    // The 35 days of the kept grid, plus the empty state's own title.
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(36)
    rerender(<MonthView month={MONTH} today={TODAY} events={schedule} list="never" empty={empty} />)
    expect(screen.queryByRole('status')).toBeNull()
    rerender(<MonthView month={MONTH} today={TODAY} list="never" />)
    expect(screen.queryByRole('status')).toBeNull()
    rerender(<MonthView month={MONTH} today={TODAY} list="never" empty={empty} loading />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows skeleton bars and aria-busy while loading', () => {
    const { container, rerender } = render(
      <MonthView month={MONTH} today={TODAY} events={schedule} list="never" loading />,
    )
    const section = container.querySelector('section') as HTMLElement
    expect(section).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('ol')).toBeNull()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(5)
    rerender(<MonthView month={MONTH} today={TODAY} variant="tiles" list="never" loading />)
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(31)
  })

  it('renders both layouts in auto mode and lets a container query pick one', () => {
    const { container, rerender } = render(
      <MonthView month={MONTH} today={TODAY} events={schedule} timeZone={HMO} />,
    )
    const sections = container.querySelectorAll('section')
    expect(sections).toHaveLength(2)
    const frame = container.querySelector('.border-line.rounded-md') as HTMLElement
    expect(frame.className).toContain('@max-[600px]:hidden')
    expect(sections[1]?.className).toContain('hidden')
    expect(sections[1]?.className).toContain('@max-[600px]:grid')
    expect(screen.getByRole('heading', { name: 'Today · Friday, October 9' })).toBeTruthy()
    rerender(<MonthView month={MONTH} today={TODAY} events={schedule} list="always" />)
    expect(container.querySelectorAll('section')).toHaveLength(2)
    expect(screen.queryByRole('heading', { name: 'Friday, October 9, 2026' })).toBeNull()
    expect(container.querySelectorAll('section')[1]?.className).not.toContain('hidden')
    rerender(<MonthView month={MONTH} today={TODAY} events={schedule} list="never" />)
    expect(container.querySelectorAll('section')).toHaveLength(1)
  })

  it('defaults today to the time zone at render', () => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(new Date())
    render(<MonthView month={today} list="never" />)
    const current = document.querySelector('[aria-current="date"]') as HTMLElement
    expect(current.textContent).toContain(String(Number(today.slice(8))))
  })

  it('is a server component', () => {
    const src = readFileSync(new URL('./month-view.logic.tsx', import.meta.url), 'utf8')
    expect(src.startsWith("'use client'")).toBe(false)
  })

  it('passes native props through, forwards ref and lets className win', () => {
    const ref = createRef<HTMLElement>()
    render(
      <MonthView
        ref={ref}
        month={MONTH}
        today={TODAY}
        list="never"
        id="cal"
        data-testid="cal"
        title="Torneos"
        className="gap-6"
      />,
    )
    expect(ref.current?.tagName).toBe('SECTION')
    expect(screen.getByTestId('cal')).toBe(ref.current as HTMLElement)
    expect(ref.current).toHaveAttribute('id', 'cal')
    expect(ref.current).toHaveAttribute('title', 'Torneos')
    expect(ref.current).toHaveAttribute('aria-labelledby', 'cal-caption')
    expect(ref.current?.classList.contains('gap-6')).toBe(true)
    expect(ref.current?.classList.contains('gap-3')).toBe(false)
  })

  it('skips the disabled Today link when tabbing', async () => {
    render(
      <MonthView month={MONTH} today={TODAY} events={schedule} list="never" monthHref={(m) => m} />,
    )
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Previous month' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Next month' })).toHaveFocus()
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(
      <MonthView
        month={MONTH}
        today={TODAY}
        events={[...schedule, ...busy]}
        timeZone={HMO}
        locale="es-MX"
        monthHref={(m) => `?month=${m.slice(0, 7)}`}
        empty={{ title: 'Nada' }}
      />,
    )
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <MonthView
            month={MONTH}
            today={TODAY}
            events={[...schedule, ...busy]}
            timeZone={HMO}
            monthHref={(m) => m}
            isDateUntracked={(d) => d < '2026-10-02'}
            renderDay={(d) => (d === '2026-10-05' ? '3 games' : null)}
          />
          <MonthView
            month="2026-09-01"
            today={TODAY}
            variant="tiles"
            list="never"
            renderDay={(d) => (d < '2026-09-20' ? '1 game' : null)}
          />
          <MonthView month="2026-11-01" today={TODAY} empty={{ title: 'Nada' }} />
          <MonthView month="2026-12-01" today={TODAY} loading />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
