import { afterEach, describe, expect, it, mock } from 'bun:test'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { DateRangePicker } from './index'

const TODAY = '2026-10-09' // a Friday
const trigger = () => screen.getByRole('button', { name: 'Games played between' })
const openPicker = async () => {
  await userEvent.click(trigger())
  return screen.findByRole('dialog')
}
const preset = (name: string) => screen.getByRole('button', { name })
const day = (name: RegExp) => screen.getByRole('button', { name })

const realMatchMedia = window.matchMedia
afterEach(() => {
  window.matchMedia = realMatchMedia
})

describe('DateRangePicker', () => {
  it('renders only the trigger on the server, with the placeholder or the range', () => {
    expect(renderServer(<DateRangePicker aria-label="x" />)).toContain('Pick dates')
    const html = renderServer(
      <DateRangePicker aria-label="x" defaultValue={{ start: '2026-09-10', end: '2026-10-09' }} />,
    )
    expect(html).toContain('Sep 10')
    expect(html).not.toContain('role="dialog"')
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(
      <DateRangePicker
        aria-label="x"
        defaultValue={{ start: '2026-09-10', end: '2026-10-09' }}
        startName="from"
        endName="to"
      />,
    )
  })

  it('formats the trigger with formatRange, one date when start = end', () => {
    const { rerender } = render(
      <DateRangePicker
        aria-label="Games played between"
        value={{ start: '2026-09-10', end: '2026-10-09' }}
      />,
    )
    expect(trigger()).toHaveTextContent(/Sep 10\s*–\s*Oct 9, 2026/)
    expect(trigger()).toHaveAccessibleDescription(/Sep 10\s*–\s*Oct 9, 2026/)
    rerender(
      <DateRangePicker
        aria-label="Games played between"
        value={{ start: '2026-10-09', end: '2026-10-09' }}
      />,
    )
    expect(trigger()).toHaveTextContent('Oct 9, 2026')
  })

  it('resolves presets against today, clamps them, and applies one', async () => {
    const onValueChange = mock()
    render(
      <DateRangePicker
        aria-label="Games played between"
        today={TODAY}
        max={TODAY}
        min="2026-09-08"
        presets={[
          'today',
          'yesterday',
          'last7',
          'last90',
          'thisWeek',
          'lastWeek',
          'thisYear',
          { label: 'Next week', range: { start: '2026-10-12', end: '2026-10-18' } },
        ]}
        onValueChange={onValueChange}
      />,
    )
    const dialog = await openPicker()
    expect(dialog).toHaveAccessibleName('Choose dates')
    expect(screen.getByRole('group', { name: 'Presets' })).toBeTruthy()
    expect(preset('Next week')).toBeDisabled() // entirely after max
    expect(preset('Custom')).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(preset('Last 90 days'))
    expect(preset('Last 90 days')).toHaveAttribute('aria-pressed', 'true')
    // Clamped to min.
    expect(screen.getByText(/Sep 8\s*–\s*Oct 9, 2026/)).toBeTruthy()
    expect(screen.getByText(/32 days/)).toBeTruthy()
    await userEvent.click(preset('This week'))
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onValueChange).toHaveBeenCalledWith({ start: '2026-10-04', end: '2026-10-09' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(trigger()).toHaveTextContent(/Oct 4\s*–\s*9, 2026/)
  })

  it('starts weeks on the locale’s first day and handles a year boundary', async () => {
    const onValueChange = mock()
    render(
      <DateRangePicker
        aria-label="Games played between"
        locale="en-GB"
        today="2026-01-15"
        presets={[
          'thisWeek',
          'lastMonth',
          'last30',
          'thisMonth',
          { label: 'Mine', range: (t) => ({ start: t, end: t }) },
        ]}
        commit="select"
        onValueChange={onValueChange}
      />,
    )
    await openPicker()
    await userEvent.click(preset('This week'))
    expect(onValueChange).toHaveBeenLastCalledWith({ start: '2026-01-12', end: '2026-01-15' })
    await openPicker()
    await userEvent.click(preset('Last month'))
    expect(onValueChange).toHaveBeenLastCalledWith({ start: '2025-12-01', end: '2025-12-31' })
    await openPicker()
    await userEvent.click(preset('Mine'))
    expect(onValueChange).toHaveBeenLastCalledWith({ start: '2026-01-15', end: '2026-01-15' })
  })

  it('picks a custom range with two clicks, Apply disabled while half picked', async () => {
    const onValueChange = mock()
    render(
      <DateRangePicker
        aria-label="Games played between"
        today={TODAY}
        onValueChange={onValueChange}
      />,
    )
    await openPicker()
    expect(screen.getAllByRole('grid')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled()
    await userEvent.click(day(/October 2, 2026/))
    expect(screen.getByText(/Pick the last day/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled()
    await userEvent.click(day(/October 6, 2026/))
    expect(screen.getByText(/5 days/)).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onValueChange).toHaveBeenCalledWith({ start: '2026-10-02', end: '2026-10-06' })
  })

  it('drops the draft on Cancel and on Escape', async () => {
    const onValueChange = mock()
    render(
      <DateRangePicker
        aria-label="Games played between"
        today={TODAY}
        defaultValue={{ start: '2026-10-01', end: '2026-10-05' }}
        presets={['last7']}
        onValueChange={onValueChange}
      />,
    )
    await openPicker()
    await userEvent.click(preset('Last 7 days'))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onValueChange).not.toHaveBeenCalled()
    await openPicker()
    expect(preset('Last 7 days')).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(preset('Last 7 days'))
    await userEvent.keyboard('[Escape]')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onValueChange).not.toHaveBeenCalled()
    expect(trigger()).toHaveTextContent(/Oct 1\s*–\s*5, 2026/)
  })

  it('commits on the second click with commit="select"', async () => {
    const onValueChange = mock()
    render(
      <DateRangePicker
        aria-label="Games played between"
        today={TODAY}
        commit="select"
        onValueChange={onValueChange}
      />,
    )
    await openPicker()
    expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull()
    await userEvent.click(day(/October 2, 2026/))
    await userEvent.click(day(/October 3, 2026/))
    expect(onValueChange).toHaveBeenCalledWith({ start: '2026-10-02', end: '2026-10-03' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('renders a custom summary and translated labels', async () => {
    render(
      <DateRangePicker
        aria-label="Games played between"
        today={TODAY}
        defaultValue={{ start: '2026-10-01', end: '2026-10-09' }}
        summary={(r) => `${r.start} → ${r.end} · 12 games`}
        labels={{ apply: 'Aplicar', cancel: 'Cancelar', days: (n) => `${n} días` }}
      />,
    )
    await openPicker()
    expect(screen.getByText('2026-10-01 → 2026-10-09 · 12 games')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeTruthy()
  })

  it('submits the committed range through hidden inputs', () => {
    const { container } = render(
      <DateRangePicker
        aria-label="x"
        startName="from"
        endName="to"
        defaultValue={{ start: '2026-10-01', end: '2026-10-09' }}
      />,
    )
    expect((container.querySelector('input[name="from"]') as HTMLInputElement).value).toBe(
      '2026-10-01',
    )
    expect((container.querySelector('input[name="to"]') as HTMLInputElement).value).toBe(
      '2026-10-09',
    )
  })

  it('shows one month on narrow screens or when asked', async () => {
    window.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia
    const { unmount } = render(<DateRangePicker aria-label="Games played between" today={TODAY} />)
    await openPicker()
    expect(screen.getAllByRole('grid')).toHaveLength(1)
    unmount()
    window.matchMedia = realMatchMedia
    render(<DateRangePicker aria-label="Games played between" today={TODAY} months={1} />)
    await openPicker()
    expect(screen.getAllByRole('grid')).toHaveLength(1)
  })

  it('navigates months inside the popup', async () => {
    render(<DateRangePicker aria-label="Games played between" today={TODAY} months={1} />)
    await openPicker()
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByRole('button', { name: /September 2026/ })).toBeTruthy()
  })

  it('opens at max when today is past it', async () => {
    render(
      <DateRangePicker
        aria-label="Games played between"
        today={TODAY}
        max="2026-05-20"
        months={1}
      />,
    )
    await openPicker()
    expect(screen.getByRole('button', { name: /May 2026/ })).toBeTruthy()
  })

  it('applies variants, invalid, disabled; forwards ref and className to the trigger', () => {
    const ref = createRef<HTMLButtonElement>()
    const { rerender } = render(
      <DateRangePicker ref={ref} aria-label="Games played between" className="w-64" id="r" />,
    )
    expect(ref.current).toBe(trigger() as HTMLButtonElement)
    expect(trigger()).toHaveAttribute('id', 'r')
    expect(trigger().className).toContain('w-64')
    expect(trigger().className).toContain('bg-surface-2')
    rerender(
      <DateRangePicker
        aria-label="Games played between"
        variant="outline"
        size="lg"
        invalid
        disabled
      />,
    )
    expect(trigger().className).toContain('h-12')
    expect(trigger().className).toContain('border-accent')
    expect(trigger()).toHaveAttribute('aria-invalid', 'true')
    expect(trigger()).toBeDisabled()
    rerender(<DateRangePicker aria-label="Games played between" variant="ghost" size="sm" />)
    expect(trigger().className).toContain('h-8')
  })

  it('follows controlled open and value', async () => {
    const onOpenChange = mock()
    render(
      <DateRangePicker
        aria-label="Games played between"
        today={TODAY}
        open
        onOpenChange={onOpenChange}
        value={{ start: '2026-10-01', end: '2026-10-02' }}
      />,
    )
    expect(await screen.findByRole('dialog')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('is accessible in both themes, closed and open', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <DateRangePicker
            aria-label="Games played between"
            defaultValue={{ start: '2026-09-10', end: '2026-10-09' }}
          />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
    render(
      <DateRangePicker
        aria-label="Games played between"
        today={TODAY}
        presets={['last7', 'last30']}
        defaultValue={{ start: '2026-09-10', end: '2026-10-09' }}
        defaultOpen
      />,
    )
    await expectAccessible(await screen.findByRole('dialog'))
  })
})
