import { afterEach, describe, expect, it, mock } from 'bun:test'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { DateTimePicker } from './index'

const HMO = 'America/Hermosillo'
const trigger = () => screen.getByRole('button', { name: /^Start/ })
const openPicker = async () => {
  await userEvent.click(trigger())
  return screen.findByRole('dialog')
}
const option = (name: string | RegExp) => screen.getByRole('option', { name })

const realResolved = Intl.DateTimeFormat.prototype.resolvedOptions
afterEach(() => {
  Intl.DateTimeFormat.prototype.resolvedOptions = realResolved
})
const browserZone = (zone: string) => {
  Intl.DateTimeFormat.prototype.resolvedOptions = function (this: Intl.DateTimeFormat) {
    return { ...realResolved.call(this), timeZone: zone }
  }
}

describe('DateTimePicker', () => {
  it('renders the trigger and the zone on the server, no popup', () => {
    const html = renderServer(
      <DateTimePicker aria-label="Start" timeZone={HMO} defaultValue="2026-11-15T01:00:00.000Z" />,
    )
    expect(html).toContain('Sat, Nov 14 · 6:00 PM')
    expect(html).toContain('Hermosillo · GMT-7')
    expect(html).not.toContain('role="dialog"')
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(
      <DateTimePicker
        aria-label="Start"
        timeZone={HMO}
        defaultValue="2026-11-15T01:00:00.000Z"
        name="startsAt"
      />,
    )
    await expectHydrates(<DateTimePicker aria-label="Start" timeZone={HMO} />)
  })

  it('shows the placeholder, a custom zone label, or no zone', () => {
    const { rerender } = render(<DateTimePicker aria-label="Start" timeZone={HMO} />)
    expect(trigger()).toHaveTextContent('Pick a date and time')
    expect(trigger()).toHaveAccessibleDescription(/Hermosillo · GMT-7/)
    rerender(<DateTimePicker aria-label="Start" timeZone={HMO} zoneLabel="Hora de Hermosillo" />)
    expect(screen.getByText('Hora de Hermosillo')).toBeTruthy()
    rerender(
      <DateTimePicker aria-label="Start" timeZone={HMO} showZone={false} aria-describedby="x" />,
    )
    expect(screen.queryByText(/Hermosillo/)).toBeNull()
    expect(trigger()).toHaveAttribute('aria-describedby', 'x')
  })

  it('picks a day, then a time, and hands back the instant and wall parts', async () => {
    const onValueChange = mock()
    const { container } = render(
      <DateTimePicker
        aria-label="Start"
        timeZone={HMO}
        name="startsAt"
        today="2026-10-09"
        onValueChange={onValueChange}
      />,
    )
    await openPicker()
    expect(screen.getByRole('listbox', { name: 'Start time' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    await userEvent.click(screen.getByRole('button', { name: /November 14, 2026/ }))
    expect(onValueChange).not.toHaveBeenCalled()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('listbox')))
    await userEvent.click(option('6:00 PM'))
    expect(onValueChange).toHaveBeenCalledWith('2026-11-15T01:00:00.000Z', {
      date: '2026-11-14',
      time: '18:00',
    })
    expect(option('6:00 PM')).toHaveAttribute('aria-selected', 'true')
    expect((container.querySelector('input[name="startsAt"]') as HTMLInputElement).value).toBe(
      '2026-11-15T01:00:00.000Z',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(trigger()).toHaveTextContent('Sat, Nov 14 · 6:00 PM')
  })

  it('keeps the time when the day changes', async () => {
    const onValueChange = mock()
    render(
      <DateTimePicker
        aria-label="Start"
        timeZone={HMO}
        defaultValue="2026-11-15T01:00:00.000Z"
        onValueChange={onValueChange}
      />,
    )
    await openPicker()
    await userEvent.click(screen.getByRole('button', { name: /November 21, 2026/ }))
    expect(onValueChange).toHaveBeenCalledWith('2026-11-22T01:00:00.000Z', {
      date: '2026-11-21',
      time: '18:00',
    })
  })

  it('builds options from minTime, maxTime and step, in the locale clock', async () => {
    const { unmount } = render(
      <DateTimePicker
        aria-label="Start"
        timeZone={HMO}
        minTime="10:00"
        maxTime="23:30"
        step={15}
        defaultValue="2026-11-15T01:00:00.000Z"
      />,
    )
    await openPicker()
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(55)
    expect(options[0]).toHaveTextContent('10:00 AM')
    expect(options.at(-1)).toHaveTextContent('11:30 PM')
    unmount()
    render(
      <DateTimePicker
        aria-label="Start"
        timeZone={HMO}
        locale="en-GB"
        step={60}
        defaultValue="2026-11-15T01:00:00.000Z"
      />,
    )
    await openPicker()
    expect(screen.getAllByRole('option')).toHaveLength(24)
    expect(option('18:00')).toHaveAttribute('aria-selected', 'true')
  })

  it('turns off times with a reason, and skipped DST times', async () => {
    const onValueChange = mock()
    const { unmount } = render(
      <DateTimePicker
        aria-label="Start"
        timeZone={HMO}
        defaultValue="2026-11-15T01:00:00.000Z"
        isTimeDisabled={(_d, t) => (t === '19:00' ? 'Venue closed' : t === '20:00')}
        onValueChange={onValueChange}
      />,
    )
    await openPicker()
    expect(option('7:00 PM, Venue closed')).toHaveAttribute('aria-disabled', 'true')
    expect(option(/8:00 PM, unavailable|^8:00 PM$/)).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(option('7:00 PM, Venue closed'))
    expect(onValueChange).not.toHaveBeenCalled()
    unmount()
    // 2026-03-08 in New York: 02:00 and 02:30 don't exist.
    render(
      <DateTimePicker
        aria-label="Start"
        timeZone="America/New_York"
        defaultValue="2026-03-08T06:00:00.000Z"
      />,
    )
    await openPicker()
    expect(option('2:30 AM, Skipped by daylight saving')).toHaveAttribute('aria-disabled', 'true')
    expect(option('3:00 AM')).not.toHaveAttribute('aria-disabled')
  })

  it('moves through times with the keyboard, skipping off ones, with hour type-ahead', async () => {
    const onValueChange = mock()
    render(
      <DateTimePicker
        aria-label="Start"
        timeZone={HMO}
        minTime="16:00"
        maxTime="20:00"
        defaultValue="2026-11-15T01:00:00.000Z"
        isTimeDisabled={(_d, t) => t === '18:30'}
        onValueChange={onValueChange}
      />,
    )
    await openPicker()
    screen.getByRole('listbox').focus()
    await userEvent.keyboard('[ArrowDown]')
    expect(onValueChange).toHaveBeenLastCalledWith('2026-11-15T02:00:00.000Z', {
      date: '2026-11-14',
      time: '19:00',
    })
    await userEvent.keyboard('[ArrowUp][ArrowUp]')
    expect(onValueChange).toHaveBeenLastCalledWith('2026-11-15T00:30:00.000Z', {
      date: '2026-11-14',
      time: '17:30',
    })
    await userEvent.keyboard('[Home]')
    expect(onValueChange).toHaveBeenLastCalledWith('2026-11-14T23:00:00.000Z', {
      date: '2026-11-14',
      time: '16:00',
    })
    await userEvent.keyboard('[End]')
    expect(onValueChange).toHaveBeenLastCalledWith('2026-11-15T03:00:00.000Z', {
      date: '2026-11-14',
      time: '20:00',
    })
    await userEvent.keyboard('1')
    await userEvent.keyboard('7')
    expect(onValueChange).toHaveBeenLastCalledWith('2026-11-15T00:00:00.000Z', {
      date: '2026-11-14',
      time: '17:00',
    })
    const calls = onValueChange.mock.calls.length
    await userEvent.keyboard('[KeyX]')
    expect(onValueChange.mock.calls.length).toBe(calls)
    expect(screen.getByRole('listbox')).toHaveAttribute(
      'aria-activedescendant',
      expect.stringContaining('17:00'),
    )
  })

  it('ignores list keys before a day is picked, and when every time is off', async () => {
    const onValueChange = mock()
    const { unmount } = render(
      <DateTimePicker aria-label="Start" timeZone={HMO} onValueChange={onValueChange} />,
    )
    await openPicker()
    screen.getByRole('listbox').focus()
    await userEvent.keyboard('[ArrowDown]')
    await userEvent.click(option('6:00 PM'))
    expect(onValueChange).not.toHaveBeenCalled()
    unmount()
    render(
      <DateTimePicker
        aria-label="Start"
        timeZone={HMO}
        defaultValue="2026-11-15T01:00:00.000Z"
        isTimeDisabled={() => true}
        onValueChange={onValueChange}
      />,
    )
    await openPicker()
    screen.getByRole('listbox').focus()
    await userEvent.keyboard('[ArrowDown]')
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('shows "your time" only when the browser zone differs', async () => {
    browserZone('Europe/Madrid')
    const { unmount } = render(
      <DateTimePicker aria-label="Start" timeZone={HMO} defaultValue="2026-11-15T01:00:00.000Z" />,
    )
    await openPicker()
    expect(screen.getByText(/Your time \(Europe\/Madrid\): Sun, Nov 15, 2:00 AM/)).toBeTruthy()
    unmount()
    browserZone(HMO)
    render(
      <DateTimePicker
        aria-label="Start"
        timeZone={HMO}
        defaultValue="2026-11-15T01:00:00.000Z"
        labels={{ yourTime: (z) => `Tu hora (${z})` }}
      />,
    )
    await openPicker()
    expect(screen.queryByText(/Tu hora/)).toBeNull()
  })

  it('follows a controlled value and open state', async () => {
    const onOpenChange = mock()
    const { rerender } = render(
      <DateTimePicker
        aria-label="Start"
        timeZone={HMO}
        value="2026-11-15T01:00:00.000Z"
        open
        onOpenChange={onOpenChange}
      />,
    )
    expect(await screen.findByRole('dialog')).toBeTruthy()
    rerender(
      <DateTimePicker
        aria-label="Start"
        timeZone={HMO}
        value={null}
        open
        onOpenChange={onOpenChange}
      />,
    )
    expect(trigger()).toHaveTextContent('Pick a date and time')
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('applies variants and forwards ref and className to the trigger', () => {
    const ref = createRef<HTMLButtonElement>()
    const { rerender } = render(
      <DateTimePicker ref={ref} aria-label="Start" timeZone={HMO} className="w-72" id="t" />,
    )
    expect(ref.current).toBe(trigger() as HTMLButtonElement)
    expect(trigger()).toHaveAttribute('id', 't')
    expect(trigger().className).toContain('w-72')
    rerender(
      <DateTimePicker
        aria-label="Start"
        timeZone={HMO}
        variant="outline"
        size="sm"
        invalid
        disabled
      />,
    )
    expect(trigger().className).toContain('h-8')
    expect(trigger().className).toContain('border-accent')
    expect(trigger()).toBeDisabled()
    rerender(<DateTimePicker aria-label="Start" timeZone={HMO} variant="ghost" size="lg" />)
    expect(trigger().className).toContain('h-12')
  })

  it('is accessible in both themes, closed and open', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <DateTimePicker
            aria-label="Start"
            timeZone={HMO}
            defaultValue="2026-11-15T01:00:00.000Z"
          />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
    render(
      <DateTimePicker
        aria-label="Start"
        timeZone={HMO}
        defaultValue="2026-11-15T01:00:00.000Z"
        defaultOpen
      />,
    )
    await expectAccessible(await screen.findByRole('dialog'))
  })
})
