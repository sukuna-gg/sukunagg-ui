import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { Prose } from './index'

const Rules = () => (
  <>
    <h2>1. Inscripción</h2>
    <p>
      La inscripción cierra <strong>24 horas antes</strong> del torneo.
    </p>
    <ul>
      <li>El capitán confirma el check-in.</li>
      <li>Un jugador solo puede estar en un equipo.</li>
    </ul>
    <h3>Premios</h3>
    <table>
      <thead>
        <tr>
          <th>Lugar</th>
          <th>Premio</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1.º</td>
          <td>$3,000 MXN</td>
        </tr>
      </tbody>
    </table>
    <blockquote>Si un equipo no se presenta, pierde por walkover.</blockquote>
    <p>
      Lobby <code>PITAYA-7Q4K</code>, dudas en <a href="#discord">Discord</a>.
    </p>
  </>
)

describe('Prose', () => {
  it('renders on the server with its children untouched', () => {
    const html = renderServer(
      <Prose>
        <Rules />
      </Prose>,
    )
    expect(html).toContain('<h2>1. Inscripción</h2>')
    expect(html).toContain('<table>')
  })

  it('renders a div by default, or article / section', () => {
    const { container, rerender } = render(<Prose>x</Prose>)
    expect(container.firstElementChild?.tagName).toBe('DIV')
    rerender(<Prose as="article">x</Prose>)
    expect(container.firstElementChild?.tagName).toBe('ARTICLE')
    rerender(<Prose as="section">x</Prose>)
    expect(container.firstElementChild?.tagName).toBe('SECTION')
  })

  it('styles elements through zero-specificity descendant rules', () => {
    const { container } = render(<Prose>x</Prose>)
    const cls = (container.firstElementChild as HTMLElement).className
    expect(cls).toContain('[:where(&)_h2]:border-t')
    expect(cls).toContain('[:where(&)_li::marker]:text-accent')
    // Our own Table and Kbd components carry classes, so they are skipped.
    expect(cls).toContain('[:where(&)_table:not([class])]:block')
    expect(cls).toContain('[:where(&)_kbd:not([class])]:border')
  })

  it('applies size and measure variants', () => {
    const { container, rerender } = render(<Prose>x</Prose>)
    const root = () => container.firstElementChild as HTMLElement
    expect(root().className).toContain('text-lg')
    expect(root().className).toContain('max-w-[70ch]')
    rerender(<Prose size="sm">x</Prose>)
    expect(root().className).toContain('text-md')
    rerender(
      <Prose size="lg" measure={false}>
        x
      </Prose>,
    )
    expect(root().className).toContain('text-xl')
    expect(root().className).not.toContain('max-w-[70ch]')
  })

  it('passes native props through, forwards ref and merges className', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <Prose ref={ref} id="rules" lang="es" className="mx-auto" aria-label="Reglamento">
        <Rules />
      </Prose>,
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(ref.current).toHaveAttribute('id', 'rules')
    expect(ref.current).toHaveAttribute('lang', 'es')
    expect(ref.current?.className).toContain('mx-auto')
    expect(screen.getByRole('heading', { level: 2, name: '1. Inscripción' })).toBeTruthy()
  })

  it('lets a consumer class win over the default measure', () => {
    const { container } = render(<Prose className="max-w-none">x</Prose>)
    const cls = (container.firstElementChild as HTMLElement).className
    expect(cls).toContain('max-w-none')
    expect(cls).not.toContain('max-w-[70ch]')
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(
      <Prose as="article">
        <Rules />
      </Prose>,
    )
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <Prose as="article" lang="es">
            <Rules />
          </Prose>
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
