import { afterEach, describe, expect, it } from 'bun:test'
import { render } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { type FxEnv, flushEffects, installFxEnv } from '../../../../../test/fx'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { ParticleField } from './index'

let env: FxEnv | undefined
afterEach(() => {
  env?.restore()
  env = undefined
})

const ROOT = '[data-sk-fx="particle-field"]'
const rootOf = (container: HTMLElement) => container.querySelector(ROOT) as HTMLElement
const canvasOf = (container: HTMLElement) => container.querySelector('canvas') as HTMLCanvasElement
const layers = (container: HTMLElement) =>
  [...rootOf(container).children].filter((el) => el.getAttribute('aria-hidden') === 'true')

/** Translations of every ember drawn so far (the per-ember setTransform calls). */
const emberMoves = (e: FxEnv) =>
  e
    .callsTo('setTransform')
    .filter(([, , , , x, y]) => x !== 0 || y !== 0)
    .map(([, , , , x, y]) => [x as number, y as number])

const hero = (
  <div>
    <h2>Crimson Ascent</h2>
    <button type="button">Play now</button>
  </div>
)

describe('ParticleField — server render', () => {
  it('renders the always-dark stage, the CSS poster, an empty canvas and the children', () => {
    const html = renderServer(<ParticleField>{hero}</ParticleField>)
    expect(html).toContain('data-sk-fx="particle-field"')
    expect(html).toContain('data-theme="dark"')
    expect(html).toContain('particle-field-haze')
    expect(html).toContain('particle-field-embers')
    expect(html).toContain('particle-field-scrim')
    expect(html).toContain('<canvas')
    expect(html).toContain('<h2>Crimson Ascent</h2>')
    expect(html).not.toContain('data-state') // the loop owns it, on the client only
  })

  it('renders both tones without leaking its own props', () => {
    for (const tone of ['accent', 'premium'] as const) {
      const html = renderServer(<ParticleField tone={tone} density="high" paused />)
      expect(html).toContain('data-sk-fx="particle-field"')
      expect(html).not.toMatch(/\s(tone|density|paused)=/)
    }
  })

  it('hydrates without warnings', async () => {
    env = installFxEnv({ reducedMotion: true })
    await expectHydrates(<ParticleField>{hero}</ParticleField>)
    await flushEffects() // the hydrated island settles as a still frame inside this test
    expect(env.pendingFrames()).toBe(0)
  })
})

describe('ParticleField — markup', () => {
  it('pins the dark theme and hides every effect layer from assistive tech', () => {
    const { container } = render(<ParticleField>{hero}</ParticleField>)
    const root = rootOf(container)
    expect(root.dataset.theme).toBe('dark')
    expect(layers(container)).toHaveLength(4) // haze, embers, canvas layer, scrim
    expect(canvasOf(container).closest('[aria-hidden="true"]')).not.toBeNull()
    expect(canvasOf(container).hasAttribute('aria-hidden')).toBe(false)
  })

  it('keeps the data hooks even when a consumer passes its own', () => {
    const { container } = render(<ParticleField data-theme="light" data-sk-fx="mine" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.dataset.skFx).toBe('particle-field')
    expect(root.dataset.theme).toBe('dark')
  })

  it('maps each tone to its literal token classes', () => {
    const accent = rootOf(render(<ParticleField />).container)
    expect(accent.classList.contains('[--sk-particle-field-hot:var(--sk-accent)]')).toBe(true)
    expect(accent.classList.contains('[--sk-particle-field-deep:var(--sk-accent-deep)]')).toBe(true)
    const premium = rootOf(render(<ParticleField tone="premium" />).container)
    expect(
      premium.classList.contains(
        '[--sk-particle-field-hot:color-mix(in_oklab,var(--sk-premium)_55%,var(--sk-chart-4))]',
      ),
    ).toBe(true)
    expect(premium.classList.contains('[--sk-particle-field-hot:var(--sk-accent)]')).toBe(false)
  })

  it('animates the haze (paused with the loop) and crossfades poster and canvas', () => {
    const { container } = render(<ParticleField />)
    const [haze, embers] = layers(container)
    expect(haze?.classList.contains('animate-particle-field-haze')).toBe(true)
    expect(
      haze?.classList.contains('group-data-[state=paused]/fx:[animation-play-state:paused]'),
    ).toBe(true)
    expect(embers?.classList.contains('particle-field-fade')).toBe(true)
    expect(embers?.classList.contains('group-data-[state=running]/fx:opacity-0')).toBe(true)
    const canvas = canvasOf(container)
    expect(canvas.classList.contains('opacity-0')).toBe(true)
    expect(canvas.classList.contains('group-data-[state=still]/fx:opacity-100')).toBe(true)
  })

  it('wraps children above the effect, and renders no wrapper without them', () => {
    const { container } = render(<ParticleField>{hero}</ParticleField>)
    const content = rootOf(container).lastElementChild as HTMLElement
    expect(content.classList.contains('relative')).toBe(true)
    expect(content.querySelector('h2')?.textContent).toBe('Crimson Ascent')
    const bare = rootOf(render(<ParticleField />).container)
    expect(bare.lastElementChild?.getAttribute('aria-hidden')).toBe('true')
  })

  it('forwards the ref, merges className last and passes native props through', () => {
    const ref = createRef<HTMLDivElement>()
    const { container } = render(
      <ParticleField ref={ref} id="hero" aria-label="Season 07" className="bg-bg h-96" />,
    )
    const root = rootOf(container)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(ref.current === root).toBe(true)
    expect(root.id).toBe('hero')
    expect(root.getAttribute('aria-label')).toBe('Season 07')
    expect(root.classList.contains('bg-bg')).toBe(true)
    expect(root.classList.contains('bg-well')).toBe(false)
    expect(root.classList.contains('h-96')).toBe(true)
  })

  it('passes axe in both page themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <ParticleField className="h-96">{hero}</ParticleField>
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})

describe('ParticleField — the island', () => {
  it("reports `off` on happy-dom's null 2D context and keeps the poster", () => {
    const { container } = render(<ParticleField />)
    expect(rootOf(container).dataset.state).toBe('off')
  })

  it('draws ember sprites, pauses off-screen and runs once in view', () => {
    env = installFxEnv()
    const { container } = render(<ParticleField>{hero}</ParticleField>)
    const root = rootOf(container)
    expect(root.dataset.state).toBe('paused') // no IntersectionObserver report yet
    expect(env.callsTo('drawImage').length).toBeGreaterThan(0) // the first frame
    expect(env.callsTo('createRadialGradient')).toHaveLength(7) // one per sprite
    env.intersect(true)
    expect(root.dataset.state).toBe('running')
    const drawn = env.callsTo('drawImage').length
    env.frame(16)
    env.frame(32)
    expect(env.callsTo('drawImage').length).toBeGreaterThan(drawn)
    expect(env.pendingFrames()).toBe(1)
    const ctx = env.contextOf(canvasOf(container))
    expect(ctx?.globalCompositeOperation).toBe('lighter')
    expect(ctx?.globalAlpha).toBe(1) // restored after every frame
  })

  it('moves the embers from frame to frame', () => {
    env = installFxEnv()
    render(<ParticleField />)
    env.intersect(true)
    env.frame(0)
    const a = emberMoves(env).length
    env.frame(50)
    const moves = emberMoves(env)
    expect(moves.slice(a, a + 5)).not.toEqual(moves.slice(0, 5))
  })

  it('draws one still frame under reduced motion and requests no frames', () => {
    env = installFxEnv({ reducedMotion: true })
    const { container } = render(<ParticleField />)
    env.intersect(true)
    expect(rootOf(container).dataset.state).toBe('still')
    expect(env.pendingFrames()).toBe(0)
    expect(env.callsTo('drawImage').length).toBeGreaterThan(0)
  })

  it('holds the frame while `paused`, and resumes when it clears', () => {
    env = installFxEnv()
    const { container, rerender } = render(<ParticleField paused />)
    const canvas = canvasOf(container)
    env.intersect(true)
    expect(rootOf(container).dataset.state).toBe('paused')
    expect(env.pendingFrames()).toBe(0)
    rerender(<ParticleField paused={false} />)
    expect(rootOf(container).dataset.state).toBe('running')
    expect(canvasOf(container)).toBe(canvas) // `paused` applies live, no remount
  })

  it('pauses in a hidden tab', () => {
    env = installFxEnv()
    const { container } = render(<ParticleField />)
    env.intersect(true)
    env.hide(true)
    expect(rootOf(container).dataset.state).toBe('paused')
    expect(env.pendingFrames()).toBe(0)
    env.hide(false)
    expect(rootOf(container).dataset.state).toBe('running')
  })

  it('restarts the scene when the tone or density changes', () => {
    env = installFxEnv()
    const { container, rerender } = render(<ParticleField />)
    const first = canvasOf(container)
    rerender(<ParticleField tone="premium" />)
    const second = canvasOf(container)
    expect(second).not.toBe(first)
    rerender(<ParticleField tone="premium" density="low" />)
    expect(canvasOf(container)).not.toBe(second)
    expect(rootOf(container).dataset.state).toBe('paused')
  })

  it('draws fewer embers at a lower density', () => {
    const count = (density: 'low' | 'high') => {
      const e = installFxEnv({ reducedMotion: true, size: { width: 1100, height: 380 } })
      render(<ParticleField density={density} />)
      const n = e.callsTo('drawImage').length
      e.restore()
      return n
    }
    expect(count('low')).toBeLessThan(count('high') / 2)
  })

  it('leans near embers away from a mouse pointer, ignores touch and recentres on leave', () => {
    const run = (move?: { x: number; type: string }) => {
      const e = installFxEnv()
      const { container } = render(<ParticleField />)
      const root = rootOf(container)
      root.getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: 300, height: 150, right: 300, bottom: 150 }) as DOMRect
      e.intersect(true)
      if (move) {
        root.dispatchEvent(
          new PointerEvent('pointermove', { clientX: move.x, clientY: 75, pointerType: move.type }),
        )
      }
      for (const t of [0, 100, 200, 300]) e.frame(t)
      const moves = emberMoves(e)
      root.dispatchEvent(new PointerEvent('pointerleave'))
      e.frame(400)
      e.restore()
      return moves
    }
    const centred = run()
    expect(run({ x: 300, type: 'mouse' })).not.toEqual(centred)
    expect(run({ x: 300, type: 'touch' })).toEqual(centred)
  })

  it('mirrors the plume under dir="rtl"', () => {
    const meanX = (dir: 'ltr' | 'rtl') => {
      const e = installFxEnv({ reducedMotion: true, size: { width: 1000, height: 400 } })
      render(
        <div dir={dir}>
          <ParticleField />
        </div>,
      )
      const xs = emberMoves(e).map(([x]) => x as number)
      e.restore()
      return xs.reduce((sum, x) => sum + x, 0) / xs.length
    }
    expect(meanX('ltr')).toBeGreaterThan(500)
    expect(meanX('rtl')).toBeLessThan(500)
  })

  it('reads its colors from the tokens and rebuilds them on a color-scheme flip', () => {
    env = installFxEnv({ reducedMotion: true })
    render(<ParticleField tone="premium" />)
    expect(env.callsTo('createRadialGradient')).toHaveLength(7)
    env.colorScheme('light')
    expect(env.callsTo('createRadialGradient')).toHaveLength(14)
  })

  it('stops for good on unmount', () => {
    env = installFxEnv()
    const { container, unmount } = render(<ParticleField />)
    const root = rootOf(container)
    env.intersect(true)
    expect(env.pendingFrames()).toBe(1)
    unmount()
    expect(env.pendingFrames()).toBe(0)
    expect(root.hasAttribute('data-state')).toBe(false)
  })
})
