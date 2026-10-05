import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, useState } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { Input } from './index'

const sizes = ['sm', 'md', 'lg'] as const

describe('Input', () => {
  it('renders every size on the server', () => {
    for (const size of sizes)
      expect(renderServer(<Input size={size} aria-label="field" />)).toContain('<input')
  })

  it('sets aria-invalid only when invalid', () => {
    const { rerender } = render(<Input aria-label="f" data-testid="i" />)
    expect(screen.getByTestId('i')).not.toHaveAttribute('aria-invalid')
    rerender(<Input aria-label="f" data-testid="i" invalid />)
    expect(screen.getByTestId('i')).toHaveAttribute('aria-invalid', 'true')
  })

  it('supports controlled value + onChange', async () => {
    function Controlled() {
      const [v, setV] = useState('')
      return <Input aria-label="name" value={v} onChange={(e) => setV(e.target.value)} />
    }
    render(<Controlled />)
    const el = screen.getByLabelText<HTMLInputElement>('name')
    await userEvent.type(el, 'Sukuna')
    expect(el.value).toBe('Sukuna')
  })

  it('disabled blocks typing', async () => {
    render(<Input aria-label="d" disabled />)
    const el = screen.getByLabelText<HTMLInputElement>('d')
    await userEvent.type(el, 'x')
    expect(el.value).toBe('')
  })

  it('forwards ref and passes native props through', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Input ref={ref} aria-label="e" type="email" name="email" placeholder="you@x.com" />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
    const el = screen.getByLabelText('e')
    expect(el).toHaveAttribute('type', 'email')
    expect(el).toHaveAttribute('name', 'email')
    expect(el).toHaveAttribute('placeholder', 'you@x.com')
  })

  it('does not leak variant props to the DOM', () => {
    render(<Input aria-label="n" variant="ghost" size="lg" invalid data-testid="i" />)
    const el = screen.getByTestId('i')
    for (const attr of ['variant', 'size', 'invalid']) expect(el.hasAttribute(attr)).toBe(false)
  })

  it('maps variant to its surface; filled is the unchanged default; invalid wins on ghost', () => {
    render(
      <>
        <Input aria-label="f" data-testid="filled" />
        <Input aria-label="o" variant="outline" data-testid="outline" />
        <Input aria-label="g" variant="ghost" data-testid="ghost" />
        <Input aria-label="gi" variant="ghost" invalid data-testid="ghost-invalid" />
      </>,
    )
    const cls = (id: string) => screen.getByTestId(id).classList
    expect(cls('filled').contains('bg-surface-2')).toBe(true)
    expect(cls('filled').contains('border-line')).toBe(true)
    expect(cls('outline').contains('bg-transparent')).toBe(true)
    expect(cls('outline').contains('border-line')).toBe(true)
    expect(cls('outline').contains('bg-surface-2')).toBe(false)
    expect(cls('ghost').contains('border-transparent')).toBe(true)
    expect(cls('ghost').contains('border-line')).toBe(false)
    expect(cls('ghost-invalid').contains('border-accent')).toBe(true)
    expect(cls('ghost-invalid').contains('border-transparent')).toBe(false)
  })

  it('lets a consumer className override a conflicting utility', () => {
    render(<Input aria-label="c" size="md" className="h-20" data-testid="i" />)
    const cls = screen.getByTestId('i').classList
    expect(cls.contains('h-20')).toBe(true)
    expect(cls.contains('h-10')).toBe(false)
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(<Input aria-label="h" defaultValue="x" />)
    await expectHydrates(<Input aria-label="pw" type="password" reveal defaultValue="secret" />)
  })

  describe('reveal', () => {
    it('toggles the password between hidden and shown', async () => {
      render(
        <>
          <label htmlFor="pw">Password</label>
          <Input id="pw" type="password" reveal defaultValue="hunter2" />
        </>,
      )
      const field = screen.getByLabelText('Password')
      const toggle = screen.getByRole('button', { name: 'Show password' })
      expect(field).toHaveAttribute('type', 'password')
      expect(toggle).toHaveAttribute('aria-pressed', 'false')
      expect(toggle).toHaveAttribute('aria-controls', 'pw')
      expect(toggle).toHaveAttribute('type', 'button')
      await userEvent.click(toggle)
      expect(field).toHaveAttribute('type', 'text')
      expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      expect(field).toHaveValue('hunter2')
      await userEvent.click(toggle)
      expect(field).toHaveAttribute('type', 'password')
    })

    it('is ignored for non-password types', () => {
      render(<Input aria-label="email" type="email" reveal />)
      expect(screen.queryByRole('button')).toBeNull()
    })

    it('takes translated labels and generates an id when none is given', () => {
      render(
        <Input
          aria-label="Contraseña"
          type="password"
          reveal
          revealLabels={{ show: 'Mostrar', hide: 'Ocultar' }}
        />,
      )
      const toggle = screen.getByRole('button', { name: 'Mostrar password' })
      const field = screen.getByLabelText('Contraseña')
      expect(field.id).not.toBe('')
      expect(toggle).toHaveAttribute('aria-controls', field.id)
    })

    it('keeps styles, invalid and ref on the input; className wins; never submits', async () => {
      const ref = createRef<HTMLInputElement>()
      let submitted = false
      render(
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submitted = true
          }}
        >
          <Input
            ref={ref}
            aria-label="pw"
            type="password"
            reveal
            invalid
            size="lg"
            className="pr-24"
          />
        </form>,
      )
      expect(ref.current).toBeInstanceOf(HTMLInputElement)
      expect(ref.current).toHaveAttribute('aria-invalid', 'true')
      expect(ref.current?.className).toContain('h-12')
      expect(ref.current?.className).toContain('pr-24')
      expect(ref.current?.className).not.toContain('pr-20')
      await userEvent.click(screen.getByRole('button'))
      expect(submitted).toBe(false)
    })

    it('disables the toggle with the field', () => {
      render(<Input aria-label="pw" type="password" reveal disabled />)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('is accessible in both themes', async () => {
      for (const theme of ['dark', 'light'] as const) {
        const { container, unmount } = render(
          <div data-theme={theme}>
            <label htmlFor="pw2">Password</label>
            <Input id="pw2" type="password" reveal />
          </div>,
        )
        await expectAccessible(container)
        unmount()
      }
    })
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <label htmlFor="email">Email</label>
          <Input id="email" type="email" />
          <Input aria-label="invalid field" invalid />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
