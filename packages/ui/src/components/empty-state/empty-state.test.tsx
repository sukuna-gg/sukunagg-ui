import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { EmptyState } from './index'

const glyph = <svg viewBox="0 0 24 24" />

describe('EmptyState', () => {
  it('renders on the server', () => {
    const html = renderServer(<EmptyState title="No games yet">Play one first.</EmptyState>)
    expect(html).toContain('No games yet')
    expect(html).toContain('<h3')
  })

  it('renders the title at the chosen heading level', () => {
    const { rerender } = render(<EmptyState title="Nothing here" />)
    expect(screen.getByRole('heading', { level: 3, name: 'Nothing here' })).toBeTruthy()
    rerender(<EmptyState title="Nothing here" headingLevel="h2" />)
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy()
    rerender(<EmptyState title="Nothing here" headingLevel="h4" />)
    expect(screen.getByRole('heading', { level: 4 })).toBeTruthy()
  })

  it('hides the icon from assistive tech', () => {
    const { container } = render(<EmptyState title="x" icon={glyph} />)
    expect(container.querySelector('[aria-hidden="true"] svg')).toBeTruthy()
  })

  it('renders nothing for parts that are not passed', () => {
    const { container } = render(<EmptyState title="Only a title" />)
    expect(container.firstElementChild?.children).toHaveLength(1)
  })

  it('renders description and actions', () => {
    render(
      <EmptyState title="Player not found" actions={<button type="button">Try EUW</button>}>
        Check the spelling, or try another region.
      </EmptyState>,
    )
    expect(screen.getByText('Check the spelling, or try another region.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try EUW' })).toBeTruthy()
  })

  it('applies size and surface variants', () => {
    const { container, rerender } = render(<EmptyState title="x" icon={glyph} />)
    const root = () => container.firstElementChild as HTMLElement
    expect(root().className).toContain('py-10')
    expect(root().className).not.toContain('border')
    rerender(<EmptyState title="x" icon={glyph} size="sm" surface="panel" />)
    expect(root().className).toContain('py-3')
    expect(root().className).toContain('border-line')
    expect(root().querySelector('h3')?.className).toContain('font-sans')
  })

  it('passes native props through (role, id)', () => {
    render(<EmptyState title="Riot isn't answering" role="status" id="es" />)
    const el = screen.getByRole('status')
    expect(el).toHaveAttribute('id', 'es')
  })

  it('forwards ref and merges className', () => {
    const ref = createRef<HTMLDivElement>()
    render(<EmptyState ref={ref} title="x" className="mt-4" />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(ref.current?.className).toContain('mt-4')
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(
      <EmptyState title="No games" icon={glyph} actions={<button type="button">Retry</button>}>
        Body
      </EmptyState>,
    )
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <EmptyState
            title="No games in Set 18 yet"
            icon={glyph}
            actions={<button type="button">Show Set 17</button>}
          >
            kairo hasn&apos;t played this set yet.
          </EmptyState>
          <EmptyState title="Riot isn't answering" size="sm" surface="panel" role="status" />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
