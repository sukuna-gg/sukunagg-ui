import { describe, expect, it, mock } from 'bun:test'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { DatePicker } from './index'

const field = () => screen.getByRole('textbox')
const trigger = () => screen.getByRole('button', { name: 'Choose date' })

describe('DatePicker', () => {
  it('renders the field and the formatted date on the server, no popup', () => {
    const html = renderServer(<DatePicker aria-label="Birth date" defaultValue="1998-04-12" />)
    expect(html).toContain('value="04/12/1998"')
    expect(html).not.toContain('role="dialog"')
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(
      <DatePicker aria-label="Birth date" defaultValue="1998-04-12" name="birthDate" />,
    )
    await expectHydrates(<DatePicker aria-label="Fecha" locale="es-MX" />)
  })

  it('shows the placeholder in the locale order, translatable', () => {
    const { rerender } = render(<DatePicker aria-label="Birth date" />)
    expect(field()).toHaveAttribute('placeholder', 'MM/DD/YYYY')
    rerender(
      <DatePicker
        aria-label="Fecha"
        locale="es-MX"
        labels={{ placeholderParts: { day: 'DD', month: 'MM', year: 'AAAA' } }}
      />,
    )
    expect(field()).toHaveAttribute('placeholder', 'DD/MM/AAAA')
    rerender(<DatePicker aria-label="Fecha" placeholder="Pick a day" />)
    expect(field()).toHaveAttribute('placeholder', 'Pick a day')
  })

  it('commits typed dates on blur and on Enter, in the locale order', async () => {
    const onValueChange = mock()
    const { rerender } = render(<DatePicker aria-label="d" onValueChange={onValueChange} />)
    await userEvent.type(field(), '4/12/1998')
    await userEvent.tab()
    expect(onValueChange).toHaveBeenLastCalledWith('1998-04-12')
    expect(field()).toHaveValue('04/12/1998')
    rerender(<DatePicker aria-label="d" locale="es-MX" onValueChange={onValueChange} />)
    await userEvent.clear(field())
    await userEvent.type(field(), '12041998{Enter}')
    expect(onValueChange).toHaveBeenCalledTimes(1) // same date, no second change
    await userEvent.clear(field())
    await userEvent.type(field(), '2026-11-14{Enter}')
    expect(onValueChange).toHaveBeenLastCalledWith('2026-11-14')
    expect(field()).toHaveValue('14/11/2026')
  })

  it('keeps invalid text, flags it and says what to type', async () => {
    const onValueChange = mock()
    render(<DatePicker aria-label="d" onValueChange={onValueChange} />)
    await userEvent.type(field(), '4/12/98{Enter}')
    expect(onValueChange).not.toHaveBeenCalled()
    expect(field()).toHaveValue('4/12/98')
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Enter a date like 04/12/2026.')
    expect(field()).toHaveAccessibleDescription('Enter a date like 04/12/2026.')
  })

  it('uses min / max / disabled messages, custom or default', async () => {
    const { rerender } = render(<DatePicker aria-label="d" max="2008-10-09" />)
    await userEvent.type(field(), '1/1/2020{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Pick a date on or before Oct 9, 2008.')
    rerender(<DatePicker aria-label="d" min="2026-01-01" />)
    await userEvent.clear(field())
    await userEvent.type(field(), '1/1/1990{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Pick a date on or after Jan 1, 2026.')
    rerender(
      <DatePicker
        aria-label="d"
        max="2008-10-09"
        isDateDisabled={(d) => (d === '2000-01-01' ? 'Closed' : d === '2000-01-02')}
        messages={{ max: 'Pitaya es solo para mayores de 18 años.', invalid: (ex) => `Usa ${ex}` }}
      />,
    )
    await userEvent.clear(field())
    await userEvent.type(field(), '1/1/2020{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Pitaya es solo para mayores de 18 años.')
    await userEvent.clear(field())
    await userEvent.type(field(), '1/1/2000{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Closed')
    await userEvent.clear(field())
    await userEvent.type(field(), '1/2/2000{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent("That date isn't available.")
    await userEvent.clear(field())
    await userEvent.type(field(), 'nope{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Usa 10/09/2008')
    rerender(
      <DatePicker
        aria-label="d"
        isDateDisabled={() => true}
        messages={{ disabled: 'Nope', invalid: 'Bad' }}
      />,
    )
    await userEvent.clear(field())
    await userEvent.type(field(), '1/2/2000{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Nope')
    await userEvent.clear(field())
    await userEvent.type(field(), 'x{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('Bad')
  })

  it('clears the value when the text is emptied, and the error with it', async () => {
    const onValueChange = mock()
    render(<DatePicker aria-label="d" defaultValue="1998-04-12" onValueChange={onValueChange} />)
    await userEvent.clear(field())
    await userEvent.tab()
    expect(onValueChange).toHaveBeenCalledWith(null)
    await userEvent.type(field(), 'x{Enter}')
    expect(screen.getByRole('alert')).toBeTruthy()
    await userEvent.clear(field())
    await userEvent.tab()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('submits ISO through a hidden input', async () => {
    const { container } = render(
      <DatePicker aria-label="d" name="birthDate" defaultValue="1998-04-12" />,
    )
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement
    expect(hidden.name).toBe('birthDate')
    expect(hidden.value).toBe('1998-04-12')
    expect(field()).not.toHaveAttribute('name')
  })

  it('opens on the year grid when empty, and on the value month otherwise', async () => {
    const { unmount } = render(<DatePicker aria-label="d" openTo="year" max="2008-10-09" />)
    await userEvent.click(trigger())
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName('Choose date')
    expect(screen.getByRole('button', { name: /1989 – 2008/ })).toBeTruthy()
    unmount()
    render(<DatePicker aria-label="d" defaultValue="1998-04-12" openTo="year" />)
    await userEvent.click(trigger())
    await screen.findByRole('dialog')
    await waitFor(() =>
      expect(document.activeElement).toHaveAccessibleName(/April 12, 1998, selected/),
    )
  })

  it('picks a day, closes and puts focus back in the field', async () => {
    const onValueChange = mock()
    render(
      <DatePicker
        aria-label="d"
        defaultValue="2026-10-01"
        onValueChange={onValueChange}
        today="2026-10-09"
      />,
    )
    await userEvent.click(trigger())
    await screen.findByRole('dialog')
    await userEvent.click(screen.getByRole('button', { name: /October 17, 2026/ }))
    expect(onValueChange).toHaveBeenCalledWith('2026-10-17')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(field()).toHaveValue('10/17/2026')
    await waitFor(() => expect(document.activeElement).toBe(field()))
  })

  it('opens from the field with Alt+ArrowDown and closes on Escape', async () => {
    const onOpenChange = mock()
    render(<DatePicker aria-label="d" defaultValue="2026-10-01" onOpenChange={onOpenChange} />)
    field().focus()
    await userEvent.keyboard('{Alt>}[ArrowDown]{/Alt}')
    await screen.findByRole('dialog')
    expect(onOpenChange).toHaveBeenCalledWith(true)
    await userEvent.keyboard('[Escape]')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('clears from the popup footer unless required', async () => {
    const onValueChange = mock()
    const { unmount } = render(
      <DatePicker aria-label="d" defaultValue="2026-10-01" onValueChange={onValueChange} />,
    )
    await userEvent.click(trigger())
    await userEvent.click(await screen.findByRole('button', { name: 'Clear' }))
    expect(onValueChange).toHaveBeenCalledWith(null)
    expect(field()).toHaveValue('')
    unmount()
    render(<DatePicker aria-label="d" defaultValue="2026-10-01" required defaultOpen />)
    await screen.findByRole('dialog')
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()
  })

  it('follows a controlled value and re-formats it', () => {
    const { rerender } = render(<DatePicker aria-label="d" value="2026-10-01" />)
    expect(field()).toHaveValue('10/01/2026')
    rerender(<DatePicker aria-label="d" value="2026-11-14" />)
    expect(field()).toHaveValue('11/14/2026')
    rerender(<DatePicker aria-label="d" value={null} />)
    expect(field()).toHaveValue('')
  })

  it('disables the trigger when the field is disabled or read-only', () => {
    const { rerender } = render(<DatePicker aria-label="d" disabled />)
    expect(field()).toBeDisabled()
    expect(trigger()).toBeDisabled()
    rerender(<DatePicker aria-label="d" readOnly />)
    expect(trigger()).toBeDisabled()
  })

  it('keeps the caller key handler and lets it cancel ours', async () => {
    // Cancels Enter only, so typing and Tab still work.
    const onKeyDown = mock((e: { key: string; preventDefault: () => void }) => {
      if (e.key === 'Enter') e.preventDefault()
    })
    const onBlur = mock()
    const onValueChange = mock()
    render(
      <DatePicker
        aria-label="d"
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        onValueChange={onValueChange}
      />,
    )
    await userEvent.type(field(), '1/1/2000{Enter}')
    expect(onKeyDown).toHaveBeenCalled()
    expect(onValueChange).not.toHaveBeenCalled()
    await userEvent.tab()
    expect(onBlur).toHaveBeenCalled()
    expect(onValueChange).toHaveBeenCalledWith('2000-01-01')
  })

  it('applies variants, invalid, and links the caller description', () => {
    const { container, rerender } = render(<DatePicker aria-label="d" aria-describedby="hint" />)
    const box = () => container.querySelector('input')?.parentElement as HTMLElement
    expect(box().className).toContain('bg-surface-2')
    expect(box().className).toContain('h-10')
    expect(field()).toHaveAttribute('aria-describedby', 'hint')
    rerender(<DatePicker aria-label="d" variant="outline" size="sm" invalid />)
    expect(box().className).toContain('bg-transparent')
    expect(box().className).toContain('h-8')
    expect(box().className).toContain('border-accent')
    expect(field()).toHaveAttribute('aria-invalid', 'true')
    rerender(<DatePicker aria-label="d" variant="ghost" size="lg" />)
    expect(box().className).toContain('h-12')
  })

  it('forwards the ref to the input and className to the wrapper', () => {
    const ref = createRef<HTMLInputElement>()
    const fnRef = mock()
    const { container, rerender } = render(
      <DatePicker ref={ref} aria-label="d" className="max-w-xs" id="bd" />,
    )
    expect(ref.current).toBe(field() as HTMLInputElement)
    expect(ref.current?.id).toBe('bd')
    expect((container.firstElementChild as HTMLElement).className).toContain('max-w-xs')
    rerender(<DatePicker ref={fnRef} aria-label="d" />)
    expect(fnRef).toHaveBeenCalled()
  })

  it('is accessible in both themes, closed and open', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <label htmlFor={`bd-${theme}`}>Birth date</label>
          <DatePicker id={`bd-${theme}`} defaultValue="1998-04-12" />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
    render(<DatePicker aria-label="Birth date" defaultValue="1998-04-12" defaultOpen />)
    await expectAccessible(await screen.findByRole('dialog'))
  })
})
