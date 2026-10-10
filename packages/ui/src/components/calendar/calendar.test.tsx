import { describe, expect, it, mock } from 'bun:test'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { todayLocal } from '../../utils/date/calendar-date'
import { CalendarWithInternals } from './calendar.logic'
import { Calendar } from './index'

const day = (name: RegExp | string) => screen.getByRole('button', { name })
const caption = () => screen.getByRole('button', { expanded: false })

describe('Calendar', () => {
  it('renders the value month on the server', () => {
    const html = renderServer(<Calendar defaultValue="2026-11-14" today="2026-10-09" />)
    expect(html).toContain('November 2026')
    expect(html).toContain('aria-selected="true"')
    expect(html).not.toContain('aria-busy')
  })

  it('renders an empty frame on the server when nothing anchors the month', () => {
    const html = renderServer(<Calendar />)
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('data-date')
  })

  it('fills the empty frame with the current month after mount', () => {
    const { container } = render(<Calendar />)
    expect(container.firstElementChild).not.toHaveAttribute('aria-busy')
    const today = todayLocal()
    expect(container.querySelector(`[data-date="${today}"]`)).toHaveAttribute(
      'aria-current',
      'date',
    )
  })

  it('hydrates without warnings with a value, a month, or nothing', async () => {
    await expectHydrates(<Calendar defaultValue="2026-11-14" today="2026-10-09" />)
    await expectHydrates(<Calendar defaultMonth="2026-02-01" />)
    await expectHydrates(<Calendar />)
    await expectHydrates(
      <Calendar
        mode="range"
        defaultValue={{ start: '2026-09-10', end: '2026-10-09' }}
        months={2}
      />,
    )
  })

  it('always shows six rows unless fixedWeeks is off', () => {
    const { rerender } = render(<Calendar defaultMonth="2026-02-01" weekStartsOn={0} />)
    expect(screen.getAllByRole('row')).toHaveLength(7) // header + 6
    rerender(<Calendar defaultMonth="2026-02-01" weekStartsOn={0} fixedWeeks={false} />)
    expect(screen.getAllByRole('row')).toHaveLength(5) // Feb 2026 fits in 4 weeks
  })

  it('takes the week start from the locale, or weekStartsOn', () => {
    const header = () => screen.getAllByRole('columnheader').map((th) => th.getAttribute('abbr'))
    const { rerender } = render(<Calendar defaultMonth="2026-11-01" locale="en-US" />)
    expect(header()[0]).toBe('Sunday')
    rerender(<Calendar defaultMonth="2026-11-01" locale="en-GB" />)
    expect(header()[0]).toBe('Monday')
    rerender(<Calendar defaultMonth="2026-11-01" locale="es-MX" />)
    expect(header()[0]).toBe('domingo')
    expect(screen.getAllByRole('columnheader')[0]?.textContent).toBe('dom')
    rerender(<Calendar defaultMonth="2026-11-01" locale="en-US" weekStartsOn={6} />)
    expect(header()[0]).toBe('Saturday')
  })

  it('shows two months without outside days', () => {
    render(<Calendar defaultMonth="2026-09-01" months={2} />)
    expect(screen.getAllByRole('grid')).toHaveLength(2)
    expect(screen.getByText('September 2026')).toBeTruthy()
    expect(screen.getByText('October 2026')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /August 31/ })).toBeNull()
  })

  it('hides outside days when asked', () => {
    // December 2026 starts on a Tuesday, so the first row holds November 29 and 30.
    const { rerender } = render(<Calendar defaultMonth="2026-12-01" weekStartsOn={0} />)
    expect(screen.getByRole('button', { name: /November 30, 2026/ })).toBeTruthy()
    rerender(<Calendar defaultMonth="2026-12-01" weekStartsOn={0} showOutsideDays={false} />)
    expect(screen.queryByRole('button', { name: /November 30, 2026/ })).toBeNull()
  })

  it('picks a day and reports it', async () => {
    const onValueChange = mock()
    render(<Calendar defaultMonth="2026-11-01" onValueChange={onValueChange} />)
    await userEvent.click(day(/November 14, 2026/))
    expect(onValueChange).toHaveBeenCalledWith('2026-11-14')
    expect(day(/November 14, 2026, selected/)).toBeTruthy()
    expect(day(/November 14, 2026/).closest('td')).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps a controlled value until the parent changes it', async () => {
    const onValueChange = mock()
    render(<Calendar value="2026-11-02" onValueChange={onValueChange} />)
    await userEvent.click(day(/November 14, 2026/))
    expect(onValueChange).toHaveBeenCalledWith('2026-11-14')
    expect(day(/November 2, 2026, selected/)).toBeTruthy()
  })

  it('moves to the month of an outside day it picks', async () => {
    render(<Calendar defaultMonth="2026-12-01" weekStartsOn={0} />)
    await userEvent.click(day(/November 30, 2026/))
    expect(caption()).toHaveAccessibleName(/November 2026/)
  })

  it('reports month and view changes', async () => {
    const onMonthChange = mock()
    const onViewChange = mock()
    render(
      <Calendar
        defaultMonth="2026-11-14"
        onMonthChange={onMonthChange}
        onViewChange={onViewChange}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(onMonthChange).toHaveBeenCalledWith('2026-12-01')
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(onMonthChange).toHaveBeenLastCalledWith('2026-11-01')
    await userEvent.click(caption())
    expect(onViewChange).toHaveBeenCalledWith('year')
  })

  it('follows a controlled month', () => {
    const { rerender } = render(<Calendar month="2026-03-15" />)
    expect(caption()).toHaveAccessibleName(/March 2026/)
    rerender(<Calendar month="2026-04-01" />)
    expect(caption()).toHaveAccessibleName(/April 2026/)
  })

  describe('range', () => {
    it('holds the first click and reports the range on the second, ends swapped', async () => {
      const onValueChange = mock()
      const onPendingChange = mock()
      render(
        <CalendarWithInternals
          mode="range"
          defaultMonth="2026-10-01"
          onValueChange={onValueChange}
          onPendingChange={onPendingChange}
        />,
      )
      await userEvent.click(day(/October 20, 2026/))
      expect(onValueChange).not.toHaveBeenCalled()
      expect(onPendingChange).toHaveBeenCalledWith('2026-10-20')
      await userEvent.hover(day(/October 15, 2026/))
      expect(day(/October 17, 2026/).closest('td')?.className).toContain('before:bg-accent/9')
      await userEvent.click(day(/October 10, 2026/))
      expect(onValueChange).toHaveBeenCalledWith({ start: '2026-10-10', end: '2026-10-20' })
      expect(onPendingChange).toHaveBeenLastCalledWith(null)
      expect(day(/October 10, 2026, range start/)).toBeTruthy()
      expect(day(/October 20, 2026, range end/)).toBeTruthy()
      expect(day(/October 15, 2026/).closest('td')).toHaveAttribute('aria-selected', 'true')
      expect(day(/October 15, 2026/).closest('td')?.className).toContain('before:bg-accent/18')
    })

    it('draws the band ends and rounds it at row edges', () => {
      render(
        <Calendar
          mode="range"
          weekStartsOn={0}
          defaultValue={{ start: '2026-10-07', end: '2026-10-13' }}
        />,
      )
      const cell = (d: number) => day(new RegExp(`October ${d}, 2026`)).closest('td') as HTMLElement
      expect(cell(7).className).toContain('before:left-1/2')
      expect(cell(13).className).toContain('before:right-1/2')
      expect(cell(10).className).toContain('before:rounded-r-sm') // Saturday
      expect(cell(11).className).toContain('before:rounded-l-sm') // Sunday
    })

    it('treats a one-day range as single', async () => {
      const onValueChange = mock()
      render(<Calendar mode="range" defaultMonth="2026-10-01" onValueChange={onValueChange} />)
      await userEvent.click(day(/October 5, 2026/))
      await userEvent.click(day(/October 5, 2026/))
      expect(onValueChange).toHaveBeenCalledWith({ start: '2026-10-05', end: '2026-10-05' })
    })

    it('turns off days that break minDays / maxDays while half picked', async () => {
      render(<Calendar mode="range" defaultMonth="2026-10-01" minDays={3} maxDays={7} />)
      await userEvent.click(day(/October 10, 2026/))
      expect(day(/October 11, 2026/)).toHaveAttribute('aria-disabled', 'true')
      expect(day(/October 12, 2026/)).not.toHaveAttribute('aria-disabled')
      expect(day(/October 17, 2026/)).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('limits', () => {
    it('disables days and nav outside min / max, and clamps focus', async () => {
      render(<Calendar defaultValue="2026-10-09" min="2026-10-09" max="2026-11-20" />)
      expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled()
      expect(day(/October 8, 2026/)).toHaveAttribute('aria-disabled', 'true')
      expect(day(/October 8, 2026/)).toHaveAccessibleName(/unavailable/)
      await userEvent.click(day(/October 9, 2026/))
      await userEvent.keyboard('[ArrowLeft]')
      expect(document.activeElement).toBe(day(/October 9, 2026/))
      await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
      expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
    })

    it('reads the isDateDisabled reason and ignores clicks on off days', async () => {
      const onValueChange = mock()
      render(
        <Calendar
          defaultMonth="2026-10-01"
          isDateDisabled={(d) => (d === '2026-10-17' ? 'Full' : d === '2026-10-18')}
          onValueChange={onValueChange}
        />,
      )
      expect(day(/October 17, 2026, Full/)).toHaveAttribute('title', 'Full')
      expect(day(/October 18, 2026, unavailable/)).toBeTruthy()
      await userEvent.click(day(/October 17, 2026/))
      expect(onValueChange).not.toHaveBeenCalled()
    })
  })

  describe('keyboard', () => {
    it('moves by day, week, week edge, month and year, crossing months', async () => {
      render(<Calendar defaultValue="2026-10-30" weekStartsOn={0} />)
      await userEvent.click(day(/October 30, 2026/))
      const focusedName = () => (document.activeElement as HTMLElement).getAttribute('aria-label')
      await userEvent.keyboard('[ArrowRight]')
      expect(focusedName()).toMatch(/October 31, 2026/)
      await userEvent.keyboard('[ArrowRight]')
      expect(focusedName()).toMatch(/November 1, 2026/)
      expect(caption()).toHaveAccessibleName(/November 2026/)
      await userEvent.keyboard('[ArrowLeft]')
      expect(focusedName()).toMatch(/October 31, 2026/)
      await userEvent.keyboard('[ArrowUp]')
      expect(focusedName()).toMatch(/October 24, 2026/)
      await userEvent.keyboard('[ArrowDown]')
      expect(focusedName()).toMatch(/October 31, 2026/)
      await userEvent.keyboard('[Home]')
      expect(focusedName()).toMatch(/Sunday, October 25, 2026/)
      await userEvent.keyboard('[End]')
      expect(focusedName()).toMatch(/Saturday, October 31, 2026/)
      await userEvent.keyboard('[PageDown]')
      expect(focusedName()).toMatch(/November 30, 2026/)
      await userEvent.keyboard('[PageUp]')
      expect(focusedName()).toMatch(/October 30, 2026/)
      await userEvent.keyboard('{Shift>}[PageDown]{/Shift}')
      expect(focusedName()).toMatch(/October 30, 2027/)
      await userEvent.keyboard('{Shift>}[PageUp]{/Shift}')
      expect(focusedName()).toMatch(/October 30, 2026/)
      await userEvent.keyboard('[Enter]')
      expect(day(/October 30, 2026, selected/)).toBeTruthy()
      await userEvent.keyboard('[KeyA]') // ignored
      expect(focusedName()).toMatch(/October 30, 2026/)
    })

    it('keeps exactly one day in the tab order', () => {
      render(<Calendar defaultValue="2026-10-14" />)
      const tabbable = screen
        .getAllByRole('gridcell')
        .map((td) => td.querySelector('button'))
        .filter((b) => b?.tabIndex === 0)
      expect(tabbable).toHaveLength(1)
      expect(tabbable[0]).toHaveAccessibleName(/October 14, 2026/)
    })

    it('previews the range with the keyboard', async () => {
      render(<Calendar mode="range" defaultMonth="2026-10-01" />)
      await userEvent.click(day(/October 10, 2026/))
      await userEvent.keyboard('[ArrowRight][ArrowRight]')
      expect(day(/October 11, 2026/).closest('td')?.className).toContain('before:bg-accent/9')
    })
  })

  describe('year and month grids', () => {
    it('jumps through years and months from the caption', async () => {
      const onValueChange = mock()
      render(<Calendar defaultValue="2026-10-09" onValueChange={onValueChange} />)
      await userEvent.click(caption())
      expect(screen.getByRole('button', { name: /2020 – 2039/ })).toHaveAttribute(
        'aria-expanded',
        'true',
      )
      expect(screen.getByRole('button', { name: '2026' })).toHaveAttribute('aria-pressed', 'true')
      await userEvent.click(screen.getByRole('button', { name: 'Earlier years' }))
      await userEvent.click(screen.getByRole('button', { name: '2008' }))
      expect(screen.getByRole('button', { name: '2008, Choose year' })).toBeTruthy()
      await userEvent.click(screen.getByRole('button', { name: 'Next year' }))
      await userEvent.click(screen.getByRole('button', { name: 'Previous year' }))
      await userEvent.click(screen.getByRole('button', { name: 'April 2008' }))
      expect(caption()).toHaveAccessibleName(/April 2008/)
      expect(document.activeElement).toBe(day(/April 1, 2008/))
    })

    it('opens on the year grid ending at max, with later years off', () => {
      render(<Calendar defaultView="year" max="2008-10-09" today="2026-10-09" />)
      expect(screen.getByRole('button', { name: /1989 – 2008/ })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Later years' })).toBeDisabled()
      expect(screen.getByRole('button', { name: '2008' })).toHaveAttribute('tabindex', '0')
    })

    it('moves through years with the keyboard and returns with Escape', async () => {
      render(<Calendar defaultValue="2026-10-09" min="2000-01-01" />)
      await userEvent.click(caption())
      screen.getByRole('button', { name: '2026' }).focus()
      await userEvent.keyboard('[ArrowLeft]')
      expect(document.activeElement).toHaveTextContent('2025')
      await userEvent.keyboard('[ArrowDown]')
      expect(document.activeElement).toHaveTextContent('2029')
      await userEvent.keyboard('[PageUp]')
      expect(document.activeElement).toHaveTextContent('2009')
      await userEvent.keyboard('[PageUp]')
      expect(document.activeElement).toHaveTextContent('2000') // clamped to min
      await userEvent.keyboard('[ArrowRight][KeyA]')
      expect(document.activeElement).toHaveTextContent('2001')
      // Unbounded pages align to multiples of 20; min stops the paging.
      expect(screen.getByRole('button', { name: /2000 – 2019/ })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Earlier years' })).toBeDisabled()
      await userEvent.keyboard('[Escape]')
      expect(caption()).toHaveAccessibleName(/October 2026/)
    })

    it('pages years with the nav buttons and moves through months by keyboard', async () => {
      render(<Calendar defaultValue="2026-10-09" min="2026-03-01" max="2026-11-30" />)
      await userEvent.click(caption())
      expect(screen.getByRole('button', { name: 'Earlier years' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Later years' })).toBeDisabled()
      await userEvent.click(screen.getByRole('button', { name: '2026' }))
      expect(screen.getByRole('button', { name: 'Previous year' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Next year' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'February 2026' })).toHaveAttribute(
        'aria-disabled',
        'true',
      )
      await userEvent.click(screen.getByRole('button', { name: 'February 2026' }))
      // An off month is focusable (like an off day) but picking it does nothing.
      expect(screen.getByRole('group', { name: /2026/ })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'October 2026' })).toHaveAttribute('tabindex', '0')
      screen.getByRole('button', { name: 'October 2026' }).focus()
      await userEvent.keyboard('[ArrowUp]')
      expect(document.activeElement).toHaveAccessibleName('July 2026')
      await userEvent.keyboard('[ArrowRight][ArrowDown][ArrowLeft][KeyA]')
      expect(document.activeElement).toHaveAccessibleName('October 2026')
      await userEvent.click(screen.getByRole('button', { name: '2026, Choose year' }))
      // With max in 2026, year pages end on 2026.
      expect(screen.getByRole('button', { name: /2007 – 2026/ })).toBeTruthy()
      await userEvent.click(screen.getByRole('button', { name: /2007 – 2026/ }))
      expect(caption()).toHaveAccessibleName(/October 2026/)
    })

    it('pages unbounded years both ways', async () => {
      render(<Calendar defaultValue="2026-10-09" />)
      await userEvent.click(caption())
      await userEvent.click(screen.getByRole('button', { name: 'Later years' }))
      expect(screen.getByRole('button', { name: /2040 – 2059/ })).toBeTruthy()
      await userEvent.click(screen.getByRole('button', { name: 'Earlier years' }))
      expect(screen.getByRole('button', { name: /2020 – 2039/ })).toBeTruthy()
    })
  })

  it('marks today from the prop', () => {
    render(<Calendar defaultMonth="2026-10-01" today="2026-10-09" />)
    expect(day(/October 9, 2026/)).toHaveAttribute('aria-current', 'date')
    expect(day(/October 9, 2026/).className).toContain('font-bold')
  })

  it('draws up to three marks and reads their labels', () => {
    render(
      <Calendar
        defaultValue="2026-10-10"
        marks={(d) =>
          d === '2026-10-10'
            ? [
                { label: 'Relámpago TFT', color: 'var(--sk-chart-3)' },
                { label: 'Liga Pitaya' },
                { label: 'Torneo EA FC' },
                { label: 'Hidden fourth' },
              ]
            : null
        }
      />,
    )
    const button = day(/October 10, 2026/)
    expect(button).toHaveAccessibleName(
      'Saturday, October 10, 2026, Relámpago TFT, Liga Pitaya, Torneo EA FC, selected',
    )
    const dots = button.querySelectorAll('span > span')
    expect(dots).toHaveLength(3)
    expect((dots[0] as HTMLElement).style.getPropertyValue('--sk-mark')).toBe('var(--sk-chart-3)')
    expect(dots[0]?.className).toContain('bg-on-accent')
  })

  it('translates its words', () => {
    render(
      <Calendar
        defaultMonth="2026-11-01"
        locale="es-MX"
        labels={{
          previousMonth: 'Mes anterior',
          nextMonth: 'Mes siguiente',
          chooseYear: 'Elegir año',
        }}
      />,
    )
    expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeTruthy()
    expect(caption()).toHaveAccessibleName('noviembre de 2026, Elegir año')
    expect(day(/sábado, 14 de noviembre de 2026/)).toBeTruthy()
  })

  it('focuses the focused day on mount with autoFocus', () => {
    render(<Calendar defaultValue="2026-10-14" autoFocus />)
    expect(document.activeElement).toBe(day(/October 14, 2026/))
  })

  it('announces a month change once, not on mount', async () => {
    const { container } = render(<Calendar defaultMonth="2026-10-01" />)
    const live = container.querySelector('[aria-live="polite"]') as HTMLElement
    expect(live.textContent).toBe('')
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(live.textContent).toBe('November 2026')
    act(() => {})
  })

  it('announces both months when two are shown', async () => {
    const { container } = render(<Calendar defaultMonth="2026-09-01" months={2} />)
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe(
      'October 2026 – November 2026',
    )
  })

  it('passes native props through, forwards ref and merges className', () => {
    const ref = createRef<HTMLDivElement>()
    const fnRef = mock()
    const { rerender } = render(
      <Calendar
        ref={ref}
        id="cal"
        aria-label="Tournament day"
        className="mt-4"
        defaultMonth="2026-10-01"
      />,
    )
    expect(ref.current).toHaveAttribute('id', 'cal')
    expect(screen.getByRole('group', { name: 'Tournament day' })).toBe(
      ref.current as HTMLDivElement,
    )
    expect(ref.current?.className).toContain('mt-4')
    rerender(<Calendar ref={fnRef} defaultMonth="2026-10-01" />)
    expect(fnRef).toHaveBeenCalled()
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <Calendar
            aria-label="Tournament day"
            defaultValue="2026-10-17"
            min="2026-10-09"
            today="2026-10-09"
          />
          <Calendar
            aria-label="Match history"
            mode="range"
            months={2}
            defaultValue={{ start: '2026-09-10', end: '2026-10-09' }}
          />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
