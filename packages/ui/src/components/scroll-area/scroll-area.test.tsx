import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { ScrollArea } from './index'

const bars = (root: HTMLElement) => root.querySelectorAll('[data-id$="-scrollbar"]')
const barOrientations = (root: HTMLElement) =>
  Array.from(bars(root)).map((b) => b.getAttribute('data-orientation'))

describe('ScrollArea', () => {
  it('renders its children as real DOM (also on the server)', () => {
    render(
      <ScrollArea className="h-40">
        <p>scrollable content</p>
      </ScrollArea>,
    )
    expect(screen.getByText('scrollable content')).toBeInTheDocument()
    expect(renderServer(<ScrollArea className="h-40">server content</ScrollArea>)).toContain(
      'server content',
    )
  })

  it('renders only the vertical scrollbar by default', () => {
    const { container } = render(<ScrollArea className="h-40">x</ScrollArea>)
    expect(barOrientations(container)).toEqual(['vertical'])
  })

  it('renders only the horizontal scrollbar for orientation="horizontal"', () => {
    const { container } = render(
      <ScrollArea orientation="horizontal" className="w-40">
        x
      </ScrollArea>,
    )
    expect(barOrientations(container)).toEqual(['horizontal'])
  })

  it('renders both scrollbars for orientation="both"', () => {
    // The corner element's presence in the DOM depends on Base UI effect timing (differs across
    // React versions), so assert the meaningful part: both scrollbars render.
    const { container } = render(
      <ScrollArea orientation="both" className="h-40 w-40">
        x
      </ScrollArea>,
    )
    expect(barOrientations(container)).toEqual(['vertical', 'horizontal'])
  })

  it('colors every thumb neutral by default and crimson for tone="accent"', () => {
    const thumbs = (root: HTMLElement) =>
      Array.from(bars(root)).map((b) => b.firstElementChild as HTMLElement)
    const neutral = render(
      <ScrollArea orientation="both" className="h-40 w-40">
        x
      </ScrollArea>,
    )
    expect(thumbs(neutral.container)).toHaveLength(2)
    for (const t of thumbs(neutral.container)) expect(t.classList.contains('bg-line')).toBe(true)
    neutral.unmount()

    const accent = render(
      <ScrollArea tone="accent" orientation="both" className="h-40 w-40">
        x
      </ScrollArea>,
    )
    expect(thumbs(accent.container)).toHaveLength(2)
    for (const t of thumbs(accent.container)) {
      expect(t.classList.contains('bg-accent/80')).toBe(true)
      expect(t.classList.contains('bg-line')).toBe(false)
    }
  })

  it('applies a consumer className to the root', () => {
    render(
      <ScrollArea className="rounded-none h-40" data-testid="sa">
        x
      </ScrollArea>,
    )
    expect(screen.getByTestId('sa').classList.contains('rounded-none')).toBe(true)
  })

  it('forwards ref to the root element', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <ScrollArea ref={ref} className="h-40">
        x
      </ScrollArea>,
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(<ScrollArea className="h-40">content</ScrollArea>)
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <ScrollArea orientation="both" className="h-40 w-40">
            <div className="w-96">
              <p>Some long content that scrolls in both directions.</p>
            </div>
          </ScrollArea>
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
