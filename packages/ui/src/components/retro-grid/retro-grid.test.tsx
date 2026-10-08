import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { RetroGrid } from './index'

const speeds = {
  slow: 'animate-retro-grid-scroll-slow',
  normal: 'animate-retro-grid-scroll',
  fast: 'animate-retro-grid-scroll-fast',
} as const

const part = (root: HTMLElement, cls: string) => {
  const el = root.querySelector(`.${cls}`)
  if (!(el instanceof HTMLElement)) throw new Error(`missing .${cls}`)
  return el
}

const customAnimations = (el: Element) =>
  [...el.classList].filter((c) => /^animate-retro-grid-/.test(c))

describe('RetroGrid', () => {
  it('server-renders a root div with the hook attribute and the real children for every speed', () => {
    for (const speed of Object.keys(speeds) as (keyof typeof speeds)[]) {
      const html = renderServer(
        <RetroGrid speed={speed}>
          <h1>Arena</h1>
        </RetroGrid>,
      )
      expect(html).toStartWith('<div')
      expect(html).toContain('data-sk-retro-grid=""')
      expect(html).toContain('<h1>Arena</h1>')
      expect(html).toContain(speeds[speed])
    }
  })

  it('maps each speed to its literal scroll utility on both floor planes', () => {
    for (const [speed, cls] of Object.entries(speeds)) {
      const { container, unmount } = render(<RetroGrid speed={speed as keyof typeof speeds} />)
      const root = container.firstElementChild as HTMLElement
      for (const plane of ['retro-grid-plane', 'retro-grid-plane-near']) {
        expect(customAnimations(part(root, plane))).toEqual([cls])
      }
      unmount()
    }
  })

  it('defaults to the normal speed', () => {
    const { container } = render(<RetroGrid />)
    const root = container.firstElementChild as HTMLElement
    expect(part(root, 'retro-grid-plane').classList.contains('animate-retro-grid-scroll')).toBe(
      true,
    )
  })

  it('guards every loop for reduced motion and gives each slot one custom animation', () => {
    const { container } = render(<RetroGrid />)
    const root = container.firstElementChild as HTMLElement
    const animated = [...root.querySelectorAll('[class*="animate-retro-grid-"]')]
    // 2 beams, 2 planes, the wave and the horizon flare.
    expect(animated).toHaveLength(6)
    for (const el of animated) {
      expect(customAnimations(el)).toHaveLength(1)
      const guarded =
        el.classList.contains('motion-reduce:animate-none') ||
        el.classList.contains('motion-reduce:hidden')
      expect(guarded).toBe(true)
    }
    // The wave is removed outright; it rests invisible (opacity-0) between passes.
    const sweep = part(root, 'retro-grid-sweep')
    expect(sweep.classList.contains('motion-reduce:hidden')).toBe(true)
    expect(sweep.classList.contains('opacity-0')).toBe(true)
  })

  it('keeps all decoration in one aria-hidden, click-through scene and children outside it', () => {
    const { container } = render(
      <RetroGrid>
        <a href="#register">Register</a>
      </RetroGrid>,
    )
    const root = container.firstElementChild as HTMLElement
    const hidden = root.querySelectorAll('[aria-hidden="true"]')
    expect(hidden).toHaveLength(1)
    const scene = hidden[0] as HTMLElement
    expect(scene.classList.contains('pointer-events-none')).toBe(true)
    for (const cls of [
      'retro-grid-beam',
      'retro-grid-plane',
      'retro-grid-plane-near',
      'retro-grid-sweep',
      'retro-grid-glow',
      'retro-grid-line',
      'retro-grid-vignette',
    ]) {
      expect(scene.contains(part(root, cls))).toBe(true)
    }
    expect(scene.querySelectorAll('.retro-grid-beam')).toHaveLength(2)
    const link = screen.getByRole('link', { name: 'Register' })
    expect(scene.contains(link)).toBe(false)
    expect(link.parentElement?.classList.contains('z-10')).toBe(true)
  })

  it('sets the per-beam angles and the offset of the right spotlight as literal properties', () => {
    const { container } = render(<RetroGrid />)
    const root = container.firstElementChild as HTMLElement
    const [left, right] = [...root.querySelectorAll('.retro-grid-beam')]
    expect(left?.classList.contains('[--sk-retro-grid-from:-28deg]')).toBe(true)
    expect(left?.classList.contains('left-[28%]')).toBe(true)
    expect(right?.classList.contains('[--sk-retro-grid-to:-16deg]')).toBe(true)
    expect(right?.classList.contains('[--sk-retro-grid-delay:-4s]')).toBe(true)
  })

  it('does not leak `speed` and passes native props through', () => {
    render(
      <RetroGrid
        speed="fast"
        id="hero"
        data-testid="grid"
        role="img"
        aria-label="Arena backdrop"
        style={{ borderRadius: 4 }}
      />,
    )
    const el = screen.getByTestId('grid')
    expect(el.hasAttribute('speed')).toBe(false)
    expect(el.id).toBe('hero')
    expect(el.getAttribute('role')).toBe('img')
    expect(el.getAttribute('aria-label')).toBe('Arena backdrop')
    expect(el.style.borderRadius).toBe('4px')
  })

  it('lets a consumer className win over the default size', () => {
    render(<RetroGrid data-testid="grid" className="min-h-[480px] rounded-lg" />)
    const el = screen.getByTestId('grid')
    expect(el.classList.contains('min-h-[480px]')).toBe(true)
    expect(el.classList.contains('min-h-96')).toBe(false)
    expect(el.classList.contains('rounded-lg')).toBe(true)
    expect(el.classList.contains('retro-grid-stage')).toBe(true)
  })

  it('forwards ref to the root div', () => {
    const ref = createRef<HTMLDivElement>()
    render(<RetroGrid ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(ref.current?.hasAttribute('data-sk-retro-grid')).toBe(true)
  })

  it('renders as a plain backdrop with no children', () => {
    const { container } = render(<RetroGrid />)
    const root = container.firstElementChild as HTMLElement
    const content = root.lastElementChild as HTMLElement
    expect(content.getAttribute('aria-hidden')).toBeNull()
    expect(content.childNodes).toHaveLength(0)
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(
      <RetroGrid speed="slow">
        <p>Oct 24–27 · Seoul</p>
      </RetroGrid>,
    )
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <RetroGrid>
            <h1>Arena</h1>
            <p>Oct 24–27 · Seoul</p>
          </RetroGrid>
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
