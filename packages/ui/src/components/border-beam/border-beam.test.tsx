import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { BorderBeam } from './index'

const layers = (root: HTMLElement) => ({
  glow: root.querySelector('[data-sk-border-beam="glow"]') as HTMLElement,
  sheen: root.querySelector('[data-sk-border-beam="sheen"]') as HTMLElement,
  ring: root.querySelector('[data-sk-border-beam="ring"]') as HTMLElement,
})

describe('BorderBeam', () => {
  it('server-renders every tone × speed with its three layers and the children', () => {
    for (const tone of ['accent', 'premium'] as const) {
      for (const speed of ['slow', 'normal', 'fast'] as const) {
        const html = renderServer(
          <BorderBeam tone={tone} speed={speed}>
            Featured match
          </BorderBeam>,
        )
        expect(html.startsWith('<div')).toBe(true)
        expect(html).toContain('Featured match')
        for (const layer of ['glow', 'sheen', 'ring']) {
          expect(html).toContain(`data-sk-border-beam="${layer}"`)
        }
      }
    }
  })

  it('renders as the requested element', () => {
    for (const as of ['article', 'section', 'li'] as const) {
      const { unmount } = render(
        as === 'li' ? (
          <ul>
            <BorderBeam as="li" data-testid="b">
              x
            </BorderBeam>
          </ul>
        ) : (
          <BorderBeam as={as} data-testid="b">
            x
          </BorderBeam>
        ),
      )
      expect(screen.getByTestId('b').tagName).toBe(as.toUpperCase())
      unmount()
    }
  })

  it('maps each tone to its beam color variables (tokens only)', () => {
    const cases = {
      accent: '[--sk-border-beam-color:var(--sk-accent)]',
      premium: 'var(--sk-premium)',
    }
    for (const [tone, needle] of Object.entries(cases)) {
      const { unmount } = render(
        <BorderBeam tone={tone as keyof typeof cases} data-testid="b">
          x
        </BorderBeam>,
      )
      const cls = [...screen.getByTestId('b').classList]
      const color = cls.find((c) => c.startsWith('[--sk-border-beam-color:'))
      expect(color).toContain(needle)
      for (const v of ['head', 'glow', 'bloom']) {
        expect(cls.some((c) => c.startsWith(`[--sk-border-beam-${v}:`))).toBe(true)
      }
      // Colors come from --sk-* tokens, never raw hex.
      expect(cls.join(' ')).not.toMatch(/#[0-9a-f]{3,8}\b/i)
      unmount()
    }
  })

  it('defaults to the accent tone at normal speed', () => {
    render(<BorderBeam data-testid="b">x</BorderBeam>)
    const el = screen.getByTestId('b')
    expect(el.classList.contains('[--sk-border-beam-color:var(--sk-accent)]')).toBe(true)
    expect(el.classList.contains('[--sk-border-beam-duration:4s]')).toBe(true)
  })

  it('maps each speed to its lap duration', () => {
    const cases = {
      slow: '[--sk-border-beam-duration:6.5s]',
      normal: '[--sk-border-beam-duration:4s]',
      fast: '[--sk-border-beam-duration:2.5s]',
    }
    for (const [speed, cls] of Object.entries(cases)) {
      const { unmount } = render(
        <BorderBeam speed={speed as keyof typeof cases} data-testid="b">
          x
        </BorderBeam>,
      )
      expect(screen.getByTestId('b').classList.contains(cls)).toBe(true)
      unmount()
    }
  })

  it('orbits every layer and always guards reduced motion', () => {
    render(<BorderBeam data-testid="b">x</BorderBeam>)
    const { glow, sheen, ring } = layers(screen.getByTestId('b'))
    for (const el of [glow, sheen, ring]) {
      expect(el.classList.contains('animate-border-beam-orbit')).toBe(true)
      expect(el.classList.contains('motion-reduce:animate-none')).toBe(true)
      expect(el.classList.contains('pointer-events-none')).toBe(true)
      expect(el.classList.contains('rounded-[inherit]')).toBe(true)
    }
    // Glow and sheen disappear under reduced motion; the ring stays as a still tint.
    expect(glow.classList.contains('motion-reduce:hidden')).toBe(true)
    expect(sheen.classList.contains('motion-reduce:hidden')).toBe(true)
    expect(ring.classList.contains('motion-reduce:hidden')).toBe(false)
    expect(glow.classList.contains('motion-reduce:transition-none')).toBe(true)
  })

  it('resolves each layer’s light-dark() colors from the nearest data-theme', () => {
    render(<BorderBeam data-testid="b">x</BorderBeam>)
    for (const el of Object.values(layers(screen.getByTestId('b')))) {
      expect(el.classList.contains('scheme-dark')).toBe(true)
      expect(el.classList.contains('in-data-[theme=light]:scheme-light')).toBe(true)
      expect(el.classList.contains('[[data-theme=light]_[data-theme=dark]_&]:scheme-dark')).toBe(
        true,
      )
    }
  })

  it('keeps each paint utility on its own layer (tailwind-merge must not drop it)', () => {
    render(<BorderBeam data-testid="b">x</BorderBeam>)
    const { glow, sheen, ring } = layers(screen.getByTestId('b'))
    expect(glow.classList.contains('border-beam-glow')).toBe(true)
    expect(sheen.classList.contains('border-beam-sheen')).toBe(true)
    expect(ring.classList.contains('border-beam-ring')).toBe(true)
  })

  it('stacks glow and sheen under the children and the ring over them, all aria-hidden', () => {
    render(
      <BorderBeam data-testid="b">
        <p>Crimson Vow</p>
      </BorderBeam>,
    )
    const kids = [...screen.getByTestId('b').children] as HTMLElement[]
    expect(kids.map((k) => k.dataset.skBorderBeam ?? k.tagName)).toEqual([
      'glow',
      'sheen',
      'P',
      'ring',
    ])
    for (const k of [kids[0], kids[1], kids[3]]) {
      expect(k?.getAttribute('aria-hidden')).toBe('true')
    }
    const { glow, sheen } = layers(screen.getByTestId('b'))
    expect(glow.classList.contains('-z-10')).toBe(true)
    expect(sheen.classList.contains('-z-10')).toBe(true)
  })

  it('writes a finite phase to --sk-border-beam-phase and ignores the rest', () => {
    const { rerender } = render(
      <BorderBeam phase={0.45} data-testid="b">
        x
      </BorderBeam>,
    )
    const el = screen.getByTestId('b')
    expect(el.style.getPropertyValue('--sk-border-beam-phase')).toBe('0.45')
    for (const phase of [Number.NaN, Number.POSITIVE_INFINITY]) {
      rerender(
        <BorderBeam phase={phase} data-testid="b">
          x
        </BorderBeam>,
      )
      expect(el.style.getPropertyValue('--sk-border-beam-phase')).toBe('')
    }
    rerender(<BorderBeam data-testid="b">x</BorderBeam>)
    expect(el.getAttribute('style')).toBeNull()
  })

  it('merges the consumer style after the phase variable', () => {
    render(
      <BorderBeam
        phase={0.25}
        style={{ width: 200, ['--sk-border-beam-phase' as string]: 0.75 }}
        data-testid="b"
      >
        x
      </BorderBeam>,
    )
    const el = screen.getByTestId('b')
    expect(el.style.width).toBe('200px')
    expect(el.style.getPropertyValue('--sk-border-beam-phase')).toBe('0.75')
  })

  it('does not leak its own props and passes native ones through', () => {
    render(
      <BorderBeam
        as="article"
        tone="premium"
        speed="fast"
        phase={0.5}
        id="pass"
        aria-label="Season 07 Pass"
        data-testid="b"
      >
        x
      </BorderBeam>,
    )
    const el = screen.getByTestId('b')
    for (const attr of ['as', 'tone', 'speed', 'phase']) {
      expect(el.hasAttribute(attr)).toBe(false)
    }
    expect(el.id).toBe('pass')
    expect(el.getAttribute('aria-label')).toBe('Season 07 Pass')
  })

  it('merges className last (a consumer radius replaces the default)', () => {
    render(
      <BorderBeam className="rounded-md border border-line bg-surface" data-testid="b">
        x
      </BorderBeam>,
    )
    const el = screen.getByTestId('b')
    expect(el.classList.contains('rounded-md')).toBe(true)
    expect(el.classList.contains('rounded-lg')).toBe(false)
    expect(el.classList.contains('border-line')).toBe(true)
    expect(el.classList.contains('relative')).toBe(true)
    expect(el.classList.contains('isolate')).toBe(true)
  })

  it('forwards ref to the rendered element', () => {
    const ref = createRef<HTMLElement>()
    const { rerender } = render(<BorderBeam ref={ref}>x</BorderBeam>)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    rerender(
      <BorderBeam ref={ref} as="section">
        x
      </BorderBeam>,
    )
    expect(ref.current?.tagName).toBe('SECTION')
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(
      <BorderBeam as="article" tone="premium" speed="slow" phase={0.45} aria-label="Season pass">
        <p>Season 07 Pass</p>
      </BorderBeam>,
    )
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <BorderBeam
            as="article"
            aria-label="Featured match"
            className="border border-line bg-surface p-5"
          >
            <h3>Crimson Vow vs Night Shift</h3>
            <p>Grand final · Map 4</p>
          </BorderBeam>
          <BorderBeam tone="premium" phase={0.5}>
            <p>Season 07 Pass</p>
          </BorderBeam>
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
