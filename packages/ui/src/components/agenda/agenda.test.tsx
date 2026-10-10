import { describe, expect, it } from 'bun:test'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { Agenda, type CalendarEvent } from './index'

const HMO = 'America/Hermosillo' // UTC-7, no daylight saving
const TODAY = '2026-10-09' // a Friday

const events: CalendarEvent[] = [
  {
    id: 'rel',
    title: 'Relámpago TFT',
    start: '2026-10-10T23:00:00Z', // Sat Oct 10, 16:00 in Hermosillo
    meta: 'TFT · En línea',
  },
  {
    id: 'copa',
    title: 'Copa Pitaya',
    start: '2026-10-10T01:00:00Z', // Fri Oct 9, 18:00 in Hermosillo
    href: '/torneos/copa-pitaya',
    meta: 'Valorant · Presencial',
    status: <span>Abierto</span>,
    color: 'var(--game-valorant)',
  },
  {
    id: 'late',
    title: 'Late night scrim',
    start: '2026-10-10T06:30:00Z', // Fri Oct 9, 23:30 in Hermosillo; Sat Oct 10 in UTC
  },
  { id: 'liga', title: 'Liga Otoño', start: '2026-10-12', end: '2026-10-16' },
  { id: 'far', title: 'Final regional', start: '2026-10-20T02:00:00Z' }, // Mon Oct 19, 19:00
  { id: 'later', title: 'Next month', start: '2026-11-30T20:00:00Z' },
]

const headings = () => screen.getAllByRole('heading').map((h) => h.textContent)
const rowTexts = (heading: string) => {
  const h = screen.getByRole('heading', { name: heading })
  const list = h.nextElementSibling as HTMLElement
  return within(list)
    .getAllByRole('listitem')
    .map((li) => li.querySelector('.truncate')?.textContent)
}

describe('Agenda', () => {
  it('renders a section of day headings and lists on the server', () => {
    const html = renderServer(<Agenda events={events} today={TODAY} timeZone={HMO} />)
    expect(html).toContain('<section')
    expect(html).toContain('<h3')
    expect(html).toContain('<ol')
    expect(html).toContain('Copa Pitaya')
  })

  it('groups by wall date in the time zone and skips empty days', () => {
    render(<Agenda events={events} today={TODAY} timeZone={HMO} days={14} />)
    expect(headings()).toEqual([
      'Today · Friday, October 9',
      'Tomorrow · Saturday, October 10',
      'Monday, October 12',
      'Monday, October 19',
    ])
    expect(rowTexts('Today · Friday, October 9')).toEqual(['Copa Pitaya', 'Late night scrim'])
  })

  it('moves an event across the date line with the zone', () => {
    render(<Agenda events={events} today={TODAY} timeZone="UTC" days={2} />)
    expect(headings()).toEqual(['Tomorrow · Saturday, October 10'])
    expect(rowTexts('Tomorrow · Saturday, October 10')).toEqual([
      'Copa Pitaya',
      'Late night scrim',
      'Relámpago TFT',
    ])
  })

  it('uses relative words for yesterday, today and tomorrow only', () => {
    render(
      <Agenda
        events={[
          { id: 'y', title: 'Yesterday', start: '2026-10-08' },
          { id: 't', title: 'Today', start: '2026-10-09' },
          { id: 'm', title: 'Tomorrow', start: '2026-10-10' },
          { id: 'n', title: 'Later', start: '2026-10-11' },
        ]}
        today={TODAY}
        from="2026-10-08"
      />,
    )
    expect(headings()).toEqual([
      'Yesterday · Thursday, October 8',
      'Today · Friday, October 9',
      'Tomorrow · Saturday, October 10',
      'Sunday, October 11',
    ])
    const today = screen.getByRole('heading', { name: /^Today/ })
    expect(today).toHaveAttribute('aria-current', 'date')
    expect(today.className).toContain('text-accent')
    expect(screen.getByRole('heading', { name: /^Tomorrow/ })).not.toHaveAttribute('aria-current')
  })

  it('translates headings and adds the year outside the current one', () => {
    render(
      <Agenda
        events={[
          { id: 'a', title: 'Hoy', start: '2026-10-09' },
          { id: 'b', title: 'Año nuevo', start: '2027-01-02' },
        ]}
        today={TODAY}
        days={120}
        locale="es-MX"
      />,
    )
    expect(headings()[0]).toBe('Hoy · viernes, 9 de octubre')
    expect(headings()[1]).toContain('2027')
  })

  it('lists only the from/days window, from today by default', () => {
    const { rerender } = render(
      <Agenda
        events={[...events, { id: 'past', title: 'Past', start: '2026-10-01' }]}
        today={TODAY}
        timeZone={HMO}
        days={3}
      />,
    )
    expect(headings()).toHaveLength(2)
    expect(screen.queryByText('Past')).toBeNull()
    expect(screen.queryByText('Liga Otoño')).toBeNull()
    rerender(<Agenda events={events} today={TODAY} timeZone={HMO} from="2026-10-12" days={1} />)
    expect(headings()).toEqual(['Monday, October 12'])
  })

  it('lists a multi-day event once with its range, and an ongoing one first under from', () => {
    render(
      <Agenda
        events={[
          { id: 'timed', title: 'Scrim', start: '2026-10-11T18:00:00Z' },
          { id: 'old', title: 'Season', start: '2026-10-01', end: '2026-10-20', meta: 'Ranked' },
          { id: 'liga', title: 'Liga Otoño', start: '2026-10-11', end: '2026-10-13' },
        ]}
        today={TODAY}
        from="2026-10-11"
        days={7}
        labels={{ ongoing: 'Continúa' }}
      />,
    )
    expect(headings()).toEqual(['Sunday, October 11'])
    expect(rowTexts('Sunday, October 11')).toEqual(['Season', 'Liga Otoño', 'Scrim'])
    const [season, liga, scrim] = screen.getAllByRole('listitem') as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ]
    expect(season.textContent).toMatch(/Continúa · Oct 1\s–\s20 · Ranked/)
    expect(liga.textContent).toMatch(/Oct 11\s–\s13/)
    expect(liga.querySelector('[aria-hidden="true"]')?.textContent).toBe('—')
    expect(scrim.textContent).toMatch(/^6:00\sPM/)
  })

  it('shows "All day" for one-day all-day events, translatable', () => {
    render(
      <Agenda
        events={[{ id: 'a', title: 'Día de juegos', start: TODAY }]}
        today={TODAY}
        labels={{ allDay: 'Todo el día' }}
      />,
    )
    expect(screen.getByRole('listitem').textContent).toStartWith('Todo el día, Día de juegos')
  })

  it('renders links named by time, title, details and status; other rows are text', () => {
    render(<Agenda events={events} today={TODAY} timeZone={HMO} />)
    const link = screen.getByRole('link', {
      // happy-dom treats the grid cells as blocks, so it adds a space before each comma.
      name: /^6:00\sPM\s?, Copa Pitaya\s?, Valorant · Presencial\s?, Abierto$/,
    })
    expect(link).toHaveAttribute('href', '/torneos/copa-pitaya')
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(link.className).toContain('hover:bg-surface-2')
    expect((link as HTMLElement).style.getPropertyValue('--sk-event')).toBe('var(--game-valorant)')
    const text = screen.getByText('Relámpago TFT').closest('div') as HTMLElement
    expect(text.tagName).toBe('DIV')
    expect(text.className).not.toContain('hover:bg-surface-2')
  })

  it('sets the heading level', () => {
    const { rerender } = render(<Agenda events={events} today={TODAY} timeZone={HMO} />)
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4)
    rerender(<Agenda events={events} today={TODAY} timeZone={HMO} headingLevel={5} />)
    expect(screen.getAllByRole('heading', { level: 5 })).toHaveLength(4)
  })

  it('pins headings by default and can turn that off', () => {
    const { rerender } = render(<Agenda events={events} today={TODAY} timeZone={HMO} />)
    expect(screen.getAllByRole('heading')[0]?.className).toContain('sticky')
    expect(screen.getByRole('link').className).toContain('scroll-mt-9')
    rerender(<Agenda events={events} today={TODAY} timeZone={HMO} stickyHeadings={false} />)
    expect(screen.getAllByRole('heading')[0]?.className).not.toContain('sticky')
  })

  it('shows the empty state as a status, or nothing without one', () => {
    const { container, rerender } = render(
      <Agenda
        events={[]}
        today={TODAY}
        empty={{ title: 'No hay torneos en las próximas 3 semanas', children: 'Síguenos.' }}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('No hay torneos')
    rerender(<Agenda events={[]} today={TODAY} />)
    expect(container.querySelector('section')?.childElementCount).toBe(0)
    rerender(<Agenda events={[]} today={TODAY} empty={false} />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows five skeleton rows and aria-busy while loading', () => {
    const { container } = render(
      <Agenda events={events} today={TODAY} loading empty={{ title: 'Nada' }} />,
    )
    const section = container.querySelector('section') as HTMLElement
    expect(section).toHaveAttribute('aria-busy', 'true')
    expect(
      section.querySelectorAll('.grid-cols-\\[64px_10px_minmax\\(0\\,1fr\\)_auto\\]'),
    ).toHaveLength(5)
    expect(screen.queryByRole('listitem')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('defaults today to the time zone at render', () => {
    const now = new Date()
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(now)
    render(<Agenda events={[{ id: 'a', title: 'Now', start: today }]} />)
    expect(screen.getByRole('heading')).toHaveAttribute('aria-current', 'date')
  })

  it('passes native props through, forwards ref and lets className win', () => {
    const ref = createRef<HTMLElement>()
    render(
      <Agenda
        ref={ref}
        events={events}
        today={TODAY}
        id="agenda"
        data-testid="agenda"
        aria-label="Próximos torneos"
        className="gap-4"
      />,
    )
    expect(ref.current).toBeInstanceOf(HTMLElement)
    expect(ref.current?.tagName).toBe('SECTION')
    expect(screen.getByTestId('agenda')).toBe(ref.current as HTMLElement)
    expect(screen.getByRole('region', { name: 'Próximos torneos' })).toHaveAttribute('id', 'agenda')
    expect(ref.current?.classList.contains('gap-4')).toBe(true)
    expect(ref.current?.classList.contains('gap-1')).toBe(false)
  })

  it('is keyboard reachable through its links', async () => {
    render(<Agenda events={events} today={TODAY} timeZone={HMO} />)
    await userEvent.tab()
    expect(screen.getByRole('link')).toHaveFocus()
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(<Agenda events={events} today={TODAY} timeZone={HMO} locale="es-MX" />)
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <Agenda aria-label="Próximos" events={events} today={TODAY} timeZone={HMO} />
          <Agenda aria-label="Vacío" events={[]} today={TODAY} empty={{ title: 'Nada' }} />
          <Agenda aria-label="Cargando" events={[]} today={TODAY} loading />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
