import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { Timeline, type TimelineItem } from './index'

const glyph = <svg viewBox="0 0 24 24" />

const night: TimelineItem[] = [
  { id: 'ci', time: '17:30', title: 'Check-in', description: '5 de 5 jugadores', icon: glyph },
  { id: 'r1', time: '18:00', title: 'Octavos', badge: <span>Victoria</span>, icon: glyph },
  { id: 'sf', time: '20:30', title: 'Semifinal', status: 'current', icon: glyph },
  { id: 'f', time: '~21:45', title: 'Final', status: 'upcoming', icon: glyph },
]

describe('Timeline', () => {
  it('renders an ordered list on the server', () => {
    const html = renderServer(<Timeline items={night} aria-label="Tu noche" />)
    expect(html).toContain('<ol')
    expect(html).toContain('Semifinal')
    expect(html).toContain('aria-current="step"')
  })

  it('renders one list item per entry, in order', () => {
    render(<Timeline items={night} aria-label="Tu noche" />)
    const items = screen.getAllByRole('listitem')
    expect(
      items.map((li) => li.querySelector('.font-semibold span')?.firstChild?.textContent),
    ).toEqual(['Check-in', 'Octavos', 'Semifinal', 'Final'])
  })

  it('marks the current entry and speaks current and upcoming states', () => {
    render(
      <Timeline
        items={night}
        aria-label="Tu noche"
        currentLabel="en juego"
        upcomingLabel="pendiente"
      />,
    )
    const items = screen.getAllByRole('listitem')
    expect(items[2]).toHaveAttribute('aria-current', 'step')
    expect(items[0]).not.toHaveAttribute('aria-current')
    expect(items[2]?.textContent).toContain(', en juego')
    expect(items[3]?.textContent).toContain(', pendiente')
    expect(items[1]?.querySelector('.sr-only')).toBeNull()
  })

  it('uses the English state words by default', () => {
    render(<Timeline items={night} />)
    const items = screen.getAllByRole('listitem')
    expect(items[2]?.textContent).toContain(', current step')
    expect(items[3]?.textContent).toContain(', upcoming')
  })

  it('draws a halo only behind the current dot, and hides the rail from screen readers', () => {
    const { container } = render(<Timeline items={night} />)
    const rails = container.querySelectorAll('li > span[aria-hidden="true"]')
    expect(rails).toHaveLength(4)
    expect(container.querySelectorAll('.motion-safe\\:animate-pulse')).toHaveLength(1)
  })

  it('switches the dot between icon and plain, and dashes the line after the current entry', () => {
    const { container } = render(
      <Timeline
        items={[
          { id: 'a', title: 'Plain' },
          { id: 'b', title: 'With icon', icon: glyph },
          { id: 'c', title: 'Now', status: 'current' },
          { id: 'd', title: 'Later', status: 'upcoming' },
        ]}
      />,
    )
    const dots = [...container.querySelectorAll('li > span[aria-hidden] > span:last-child')]
    expect(dots[0]?.className).toContain('size-3')
    expect(dots[1]?.className).toContain('size-[22px]')
    expect(dots[2]?.className).toContain('bg-gradient-accent')
    expect(dots[3]?.className).toContain('border-dashed')
    const rails = [...container.querySelectorAll('li > span[aria-hidden]')]
    expect(rails[1]?.className).not.toContain('repeating-linear-gradient')
    expect(rails[2]?.className).toContain('repeating-linear-gradient')
  })

  it('passes caller colors through a custom property', () => {
    const { container } = render(
      <Timeline items={[{ id: 'a', title: 'First blood', color: 'var(--l-blue)', icon: glyph }]} />,
    )
    const dot = container.querySelector('li > span[aria-hidden] > span') as HTMLElement
    expect(dot.style.getPropertyValue('--sk-timeline-dot')).toBe('var(--l-blue)')
  })

  it('wraps the time in <time dateTime> when given', () => {
    const { container } = render(
      <Timeline
        items={[
          { id: 'a', time: 'Sep 29', dateTime: '2026-09-29', title: '0.10.0' },
          { id: 'b', time: '20:31', title: 'Baron Nashor' },
        ]}
      />,
    )
    const times = container.querySelectorAll('time')
    expect(times).toHaveLength(1)
    expect(times[0]).toHaveAttribute('dateTime', '2026-09-29')
  })

  it('renders description, badge and extra content only when given', () => {
    render(
      <Timeline
        items={[
          {
            id: 'v',
            title: '0.11.0',
            description: 'Unreleased',
            badge: <span>new</span>,
            children: (
              <ul aria-label="Changes">
                <li>StatTile</li>
              </ul>
            ),
          },
          { id: 'w', title: 'Bare' },
        ]}
      />,
    )
    expect(screen.getByText('Unreleased')).toBeTruthy()
    expect(screen.getByText('new')).toBeTruthy()
    expect(screen.getByRole('list', { name: 'Changes' })).toBeTruthy()
    const bare = screen.getAllByRole('listitem').find((li) => li.textContent === 'Bare')
    expect(bare).toBeTruthy()
  })

  it('applies density and timeWidth variants', () => {
    const { container, rerender } = render(<Timeline items={night} />)
    const first = () => container.querySelector('li') as HTMLElement
    expect(first().className).toContain('pb-4.5')
    expect(first().className).toContain('grid-cols-[52px_22px_minmax(0,1fr)]')
    rerender(<Timeline items={night} density="compact" timeWidth="lg" />)
    expect(first().className).toContain('pb-2.5')
    expect(first().className).toContain('grid-cols-[84px_22px_minmax(0,1fr)]')
    rerender(<Timeline items={night} timeWidth="md" />)
    expect(first().className).toContain('grid-cols-[64px_22px_minmax(0,1fr)]')
  })

  it('passes native props through, forwards ref and merges className', () => {
    const ref = createRef<HTMLOListElement>()
    render(<Timeline ref={ref} items={night} id="tl" aria-label="Objectives" className="mt-6" />)
    expect(ref.current).toBeInstanceOf(HTMLOListElement)
    expect(ref.current).toHaveAttribute('id', 'tl')
    expect(screen.getByRole('list', { name: 'Objectives' })).toBe(ref.current as HTMLOListElement)
    expect(ref.current?.className).toContain('mt-6')
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(<Timeline items={night} aria-label="Tu noche" />)
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <Timeline items={night} aria-label="Tu noche" />
          <Timeline
            density="compact"
            aria-label="Objectives"
            items={[
              {
                id: 'fb',
                time: '1:31',
                title: 'First blood',
                description: 'Blue side',
                color: 'var(--sk-chart-2)',
              },
            ]}
          />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
