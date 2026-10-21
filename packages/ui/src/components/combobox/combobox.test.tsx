import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderServer } from '../../../../../test/ssr'
import { Combobox } from './index'

const items = ['Apple', 'Banana', 'Cherry', 'Grape']

describe('Combobox', () => {
  it('renders a combobox input', () => {
    render(<Combobox items={items} aria-label="Fruit" />)
    expect(screen.getByRole('combobox', { name: 'Fruit' })).toBeInTheDocument()
  })

  it('maps variant and size onto the input; filled/md is the unchanged default', () => {
    render(
      <>
        <Combobox items={items} aria-label="filled" />
        <Combobox items={items} aria-label="ghost" variant="ghost" size="lg" />
      </>,
    )
    const filled = screen.getByRole('combobox', { name: 'filled' }).classList
    expect(filled.contains('bg-surface-2')).toBe(true)
    expect(filled.contains('h-10')).toBe(true)
    const ghost = screen.getByRole('combobox', { name: 'ghost' }).classList
    expect(ghost.contains('border-transparent')).toBe(true)
    expect(ghost.contains('h-12')).toBe(true)
    expect(ghost.contains('bg-surface-2')).toBe(false)
  })

  it('does not render options until typing', () => {
    render(<Combobox items={items} aria-label="Fruit" />)
    expect(screen.queryByRole('option', { name: 'Banana' })).toBeNull()
  })

  it('filters options as the user types', async () => {
    render(<Combobox items={items} aria-label="Fruit" />)
    await userEvent.type(screen.getByRole('combobox', { name: 'Fruit' }), 'ap')
    // "Apple" and "Grape" contain "ap"; "Banana" does not.
    expect(await screen.findByRole('option', { name: 'Apple' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Banana' })).toBeNull()
  })

  it('caps the number of rendered suggestions with maxRenderedItems', async () => {
    const many = ['Apple', 'Apricot', 'Avocado', 'Almond', 'Acai']
    render(<Combobox items={many} maxRenderedItems={2} aria-label="Fruit" />)
    // Every item contains "a"; the cap limits the displayed list to 2 even though all 5 match.
    await userEvent.type(screen.getByRole('combobox', { name: 'Fruit' }), 'a')
    expect(await screen.findAllByRole('option')).toHaveLength(2)
  })

  it('draws itemIcon before each suggestion, and the text stays its name', async () => {
    render(
      <Combobox
        items={items}
        aria-label="Fruit"
        itemIcon={(item) => <img src={`/${item}.png`} alt="" data-testid={`icon-${item}`} />}
      />,
    )
    await userEvent.type(screen.getByRole('combobox', { name: 'Fruit' }), 'ap')
    const apple = await screen.findByRole('option', { name: 'Apple' })
    const icon = screen.getByTestId('icon-Apple')
    expect(apple.contains(icon)).toBe(true)
    // Decorative: hidden from assistive tech, so the option is named by its text alone.
    expect(icon.parentElement?.getAttribute('aria-hidden')).toBe('true')
    expect(apple.firstElementChild).toBe(icon.parentElement)
  })

  it('without itemIcon an option holds only its text', async () => {
    render(<Combobox items={items} aria-label="Fruit" />)
    await userEvent.type(screen.getByRole('combobox', { name: 'Fruit' }), 'ap')
    const apple = await screen.findByRole('option', { name: 'Apple' })
    expect(apple.querySelector('[aria-hidden]')).toBeNull()
  })

  it('hangs the popup from the input start edge, at least as wide as the input', async () => {
    render(<Combobox items={items} aria-label="Fruit" />)
    await userEvent.type(screen.getByRole('combobox', { name: 'Fruit' }), 'ap')
    const list = (await screen.findByRole('option', { name: 'Apple' })).closest(
      '[class*="anchor-width"]',
    )
    expect(list?.className).toContain('min-w-[var(--anchor-width,12rem)]')
  })

  it('renders the input on the server', () => {
    expect(
      renderServer(<Combobox items={items} placeholder="Find fruit" aria-label="Fruit" />),
    ).toContain('Find fruit')
  })
})
