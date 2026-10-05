import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { Badge } from './index'

const tones = ['neutral', 'accent', 'success', 'premium'] as const
const sizes = ['sm', 'md'] as const

describe('Badge', () => {
  it('renders every tone and size on the server', () => {
    for (const tone of tones)
      for (const size of sizes)
        expect(
          renderServer(
            <Badge tone={tone} size={size}>
              LIVE
            </Badge>,
          ),
        ).toContain('LIVE')
  })

  it('renders one decorative dot only when dot is set', () => {
    const { rerender, container } = render(<Badge>on</Badge>)
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
    rerender(<Badge dot>on</Badge>)
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1)
  })

  it('pulse animates the dot (motion-safe only); without dot it renders nothing', () => {
    const { rerender, container } = render(<Badge dot>on</Badge>)
    const dot = () => container.querySelector('[aria-hidden="true"]')
    expect(dot()?.className).not.toContain('animate')
    rerender(
      <Badge dot pulse>
        In game
      </Badge>,
    )
    expect(dot()?.className).toContain('motion-safe:animate-pulse')
    expect(dot()?.className).toContain('motion-safe:after:animate-ping')
    expect(dot()?.className).not.toMatch(/(^|\s)animate-/)
    rerender(<Badge pulse>In game</Badge>)
    expect(dot()).toBeNull()
    expect(container.firstElementChild?.hasAttribute('pulse')).toBe(false)
  })

  it('does not leak variant props to the DOM', () => {
    render(
      <Badge tone="accent" variant="outline" size="sm" dot data-testid="b">
        x
      </Badge>,
    )
    const el = screen.getByTestId('b')
    for (const attr of ['tone', 'variant', 'size', 'dot']) expect(el.hasAttribute(attr)).toBe(false)
  })

  it('unset variant keeps the original per-tone look; soft/solid/outline force one', () => {
    render(
      <>
        <Badge tone="accent" data-testid="accent-auto">
          x
        </Badge>
        <Badge tone="success" data-testid="success-auto">
          x
        </Badge>
        <Badge tone="accent" variant="soft" data-testid="accent-soft">
          x
        </Badge>
        <Badge tone="neutral" variant="solid" data-testid="neutral-solid">
          x
        </Badge>
        <Badge tone="success" variant="outline" data-testid="success-outline">
          x
        </Badge>
      </>,
    )
    const cls = (id: string) => screen.getByTestId(id).classList
    // original looks: accent solid gradient, success soft
    expect(cls('accent-auto').contains('bg-gradient-accent')).toBe(true)
    expect(cls('success-auto').contains('bg-surface-2')).toBe(true)
    expect(cls('success-auto').contains('text-success')).toBe(true)
    // forced
    expect(cls('accent-soft').contains('bg-surface-2')).toBe(true)
    expect(cls('accent-soft').contains('text-accent')).toBe(true)
    expect(cls('accent-soft').contains('bg-gradient-accent')).toBe(false)
    expect(cls('neutral-solid').contains('bg-text-dim')).toBe(true)
    expect(cls('neutral-solid').contains('text-bg')).toBe(true)
    expect(cls('success-outline').contains('bg-transparent')).toBe(true)
    expect(cls('success-outline').contains('border-success')).toBe(true)
  })

  it('forwards ref to the span', () => {
    const ref = createRef<HTMLSpanElement>()
    render(<Badge ref={ref}>x</Badge>)
    expect(ref.current).toBeInstanceOf(HTMLSpanElement)
  })

  it('passes native props through', () => {
    render(
      <Badge id="tag" data-testid="n" aria-label="live now">
        LIVE
      </Badge>,
    )
    const el = screen.getByTestId('n')
    expect(el).toHaveAttribute('id', 'tag')
    expect(el).toHaveAttribute('aria-label', 'live now')
  })

  it('lets a consumer className override a conflicting utility', () => {
    render(
      <Badge size="md" className="h-10" data-testid="c">
        x
      </Badge>,
    )
    const cls = screen.getByTestId('c').classList
    expect(cls.contains('h-10')).toBe(true)
    expect(cls.contains('h-6')).toBe(false)
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(<Badge dot>LIVE</Badge>)
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          {tones.map((tone) => (
            <Badge key={tone} tone={tone} dot>
              {tone}
            </Badge>
          ))}
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
