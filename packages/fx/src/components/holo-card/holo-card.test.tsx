import { afterEach, describe, expect, it } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import { createRef, Profiler, StrictMode } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { type FxEnv, flushEffects, installFxEnv } from '../../../../../test/fx'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { HoloCard, type HoloCardProps } from './index'

let env: FxEnv | undefined
afterEach(() => {
  env?.restore()
  env = undefined
})

const LABEL = 'ryomen, Duelist, rating 94, legendary holo card'

function Card(props: Partial<HoloCardProps>) {
  return (
    <HoloCard aria-label={LABEL} {...props}>
      <strong>ryomen</strong>
      <b>94</b>
    </HoloCard>
  )
}

/** The root (focusable), the scene (the island: `data-state` + tilt vars) and the card. */
function parts(container: HTMLElement) {
  const root = container.querySelector('[data-sk-fx="holo-card"]') as HTMLElement
  const scene = root.firstElementChild as HTMLElement
  const card = scene.querySelector('.holo-card-edge') as HTMLElement
  return { root, scene, card }
}

const tilt = (scene: HTMLElement) => ({
  x: Number(scene.style.getPropertyValue('--sk-holo-card-x')),
  y: Number(scene.style.getPropertyValue('--sk-holo-card-y')),
  a: Number(scene.style.getPropertyValue('--sk-holo-card-a')),
})

/** Run frames 16 ms apart until the loop stops asking (the spring settled), or 5 s pass. */
function runUntilSettled(fx: FxEnv, from = 0): number {
  let t = from
  while (fx.pendingFrames() && t < from + 5000) {
    t += 16
    fx.frame(t)
  }
  return t
}

/** A live card on screen, with a 200×280 box for pointer math. */
function mountLive(props: Partial<HoloCardProps> = {}) {
  env = installFxEnv()
  const view = render(<Card {...props} />)
  const p = parts(view.container)
  env.resize(p.scene, 200, 280)
  env.intersect(true)
  return { ...view, ...p, fx: env }
}

describe('HoloCard', () => {
  describe('server render', () => {
    it('renders a focusable, named player-card group around the art', () => {
      const html = renderServer(<Card />)
      expect(html).toContain('data-sk-fx="holo-card"')
      expect(html).toContain('role="group"')
      expect(html).toContain('aria-roledescription="player card"')
      expect(html).toContain('tabindex="0"')
      expect(html).toContain(`aria-label="${LABEL}"`)
      expect(html).toContain('<strong>ryomen</strong>')
      expect(html).not.toContain('data-state') // the loop owns it, client-only
    })

    it('hides every decorative layer and pins the card dark', () => {
      const { container } = render(<Card />)
      const { root, scene, card } = parts(container)
      // aura, floor, foil, glare — and nothing that holds the art
      expect(scene.querySelectorAll('[aria-hidden="true"]')).toHaveLength(4)
      expect(card.dataset.theme).toBe('dark')
      expect(card.hasAttribute('aria-hidden')).toBe(false) // the art stays readable
      expect(root.querySelector('.holo-card-foil')?.getAttribute('aria-hidden')).toBe('true')
      expect(root.querySelector('.holo-card-glare')?.getAttribute('aria-hidden')).toBe('true')
      expect(screen.getByText('ryomen').closest('.holo-card-edge')).toBe(card)
    })

    it('maps each intensity to its literal scale factors', () => {
      for (const [intensity, tiltScale, shine] of [
        ['normal', '1', '1'],
        ['subtle', '0.5', '0.6'],
      ] as const) {
        const { container, unmount } = render(<Card intensity={intensity} />)
        const { root } = parts(container)
        expect(root.classList.contains(`[--sk-holo-card-tilt:${tiltScale}]`)).toBe(true)
        expect(root.classList.contains(`[--sk-holo-card-shine:${shine}]`)).toBe(true)
        unmount()
      }
      const { container } = render(<Card />)
      expect(parts(container).root.classList.contains('[--sk-holo-card-tilt:1]')).toBe(true)
    })

    it('guards the idle drift for reduced motion and pauses it with the loop', () => {
      const { container } = render(<Card />)
      const { scene } = parts(container)
      expect(scene.classList.contains('animate-holo-card-drift')).toBe(true)
      expect(scene.classList.contains('motion-reduce:animate-none')).toBe(true)
      expect(scene.classList.contains('data-[state=paused]:[animation-play-state:paused]')).toBe(
        true,
      )
    })

    it('passes native props through, merges className and forwards the ref', () => {
      const ref = createRef<HTMLDivElement>()
      const { container } = render(
        <HoloCard
          ref={ref}
          aria-label={LABEL}
          id="mvp"
          data-testid="holo"
          className="w-64"
          aria-roledescription="reward card"
          tabIndex={-1}
          intensity="subtle"
        >
          art
        </HoloCard>,
      )
      const { root } = parts(container)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
      expect(ref.current === root).toBe(true)
      expect(root.id).toBe('mvp')
      expect(root.dataset.testid).toBe('holo')
      expect(root.classList.contains('w-64')).toBe(true)
      expect(root.classList.contains('w-50')).toBe(false)
      expect(root.getAttribute('aria-roledescription')).toBe('reward card')
      expect(root.tabIndex).toBe(-1)
      expect(root.hasAttribute('intensity')).toBe(false)
    })

    it('hydrates without warnings', async () => {
      env = installFxEnv({ reducedMotion: true })
      await expectHydrates(<Card />)
      await flushEffects() // the hydrated island settles as a still frame inside this test
      expect(env.pendingFrames()).toBe(0)
    })
  })

  describe('loop', () => {
    it('is paused until on screen, then running and settled at rest', () => {
      env = installFxEnv()
      const { container } = render(<Card />)
      const { scene } = parts(container)
      expect(scene.dataset.state).toBe('paused')
      env.intersect(true)
      expect(scene.dataset.state).toBe('running')
      runUntilSettled(env)
      expect(env.pendingFrames()).toBe(0)
      expect(tilt(scene)).toEqual({ x: 0, y: 0, a: 0 })
    })

    it('never re-renders React while it animates', () => {
      env = installFxEnv()
      let commits = 0
      const { container } = render(
        <Profiler id="holo" onRender={() => commits++}>
          <Card />
        </Profiler>,
      )
      const { scene } = parts(container)
      env.resize(scene, 200, 280)
      env.intersect(true)
      const before = commits
      fireEvent.pointerMove(scene, { clientX: 190, clientY: 10 })
      runUntilSettled(env)
      expect(tilt(scene).x).toBeGreaterThan(0.8)
      expect(commits).toBe(before)
    })

    it('tears down on unmount: no frames left, key listeners removed', () => {
      const { root, unmount, fx } = mountLive()
      fireEvent.keyDown(root, { key: 'ArrowRight' })
      expect(fx.pendingFrames()).toBeGreaterThan(0)
      unmount()
      expect(fx.pendingFrames()).toBe(0)
      expect(fireEvent.keyDown(root, { key: 'ArrowRight' })).toBe(true) // not handled any more
    })

    it('survives StrictMode without doubling its key listeners', () => {
      env = installFxEnv()
      const { container } = render(
        <StrictMode>
          <Card />
        </StrictMode>,
      )
      const { root, scene } = parts(container)
      env.intersect(true)
      fireEvent.keyDown(root, { key: 'ArrowRight' })
      runUntilSettled(env)
      expect(tilt(scene).x).toBeCloseTo(0.34, 3)
    })
  })

  describe('pointer', () => {
    it('springs toward the pointer and lights up, then settles there', () => {
      const { scene, card, fx } = mountLive()
      fireEvent.pointerEnter(scene, { clientX: 150, clientY: 70 })
      expect(fx.pendingFrames()).toBe(1)
      fx.frame(16) // dt = 0: the first frame only measures time
      fx.frame(32)
      const early = tilt(scene)
      expect(early.x).toBeGreaterThan(0)
      expect(early.x).toBeLessThan(0.5)
      runUntilSettled(fx, 32)
      expect(tilt(scene)).toEqual({ x: 0.5, y: -0.5, a: 1 })
      expect(fx.pendingFrames()).toBe(0)
      expect(card.className).toContain('holo-card-edge') // the transform reads the vars in CSS
    })

    it('follows moves and presses, clamps to the edges, and springs back on leave', () => {
      const { scene, fx } = mountLive()
      fireEvent.pointerDown(scene, { clientX: 400, clientY: -100 })
      let t = runUntilSettled(fx)
      expect(tilt(scene)).toEqual({ x: 1, y: -1, a: 1 })
      fireEvent.pointerMove(scene, { clientX: 0, clientY: 280 })
      t = runUntilSettled(fx, t)
      expect(tilt(scene)).toEqual({ x: -1, y: 1, a: 1 })
      fireEvent.pointerLeave(scene)
      t = runUntilSettled(fx, t)
      expect(tilt(scene)).toEqual({ x: 0, y: 0, a: 0 })
      fireEvent.pointerMove(scene, { clientX: 100, clientY: 140 })
      fireEvent.pointerCancel(scene)
      runUntilSettled(fx, t)
      expect(tilt(scene)).toEqual({ x: 0, y: 0, a: 0 })
    })

    it('ignores the pointer while the scene has no box (not laid out)', () => {
      env = installFxEnv()
      const { container } = render(<Card />)
      const { scene } = parts(container)
      env.intersect(true)
      runUntilSettled(env)
      fireEvent.pointerMove(scene, { clientX: 150, clientY: 70 }) // happy-dom: a 0×0 box
      expect(env.pendingFrames()).toBe(0)
      expect(tilt(scene).a).toBe(0)
    })
  })

  describe('keyboard', () => {
    it('tilts with the arrow keys, clamped, and claims the key', () => {
      const { root, scene, fx } = mountLive()
      expect(fireEvent.keyDown(root, { key: 'ArrowRight' })).toBe(false) // prevented
      expect(fireEvent.keyDown(root, { key: 'ArrowUp' })).toBe(false)
      let t = runUntilSettled(fx)
      expect(tilt(scene)).toEqual({ x: 0.34, y: -0.34, a: 1 })
      for (let i = 0; i < 4; i++) fireEvent.keyDown(root, { key: 'ArrowLeft' })
      fireEvent.keyDown(root, { key: 'ArrowDown' })
      t = runUntilSettled(fx, t)
      expect(tilt(scene)).toEqual({ x: -1, y: 0, a: 1 })
    })

    it('resets with Escape (left to bubble) and Home (prevented: no page jump)', () => {
      const { root, scene, fx } = mountLive()
      fireEvent.keyDown(root, { key: 'ArrowRight' })
      let t = runUntilSettled(fx)
      expect(fireEvent.keyDown(root, { key: 'Escape' })).toBe(true)
      t = runUntilSettled(fx, t)
      expect(tilt(scene)).toEqual({ x: 0, y: 0, a: 0 })
      fireEvent.keyDown(root, { key: 'ArrowLeft' })
      t = runUntilSettled(fx, t)
      expect(tilt(scene).x).toBeCloseTo(-0.34, 3)
      expect(fireEvent.keyDown(root, { key: 'Home' })).toBe(false)
      runUntilSettled(fx, t)
      expect(tilt(scene)).toEqual({ x: 0, y: 0, a: 0 })
    })

    it('resets on blur, but keeps the pointer tilt while hovered', () => {
      const { root, scene, fx } = mountLive()
      fireEvent.keyDown(root, { key: 'ArrowDown' })
      let t = runUntilSettled(fx)
      fireEvent.blur(root)
      t = runUntilSettled(fx, t)
      expect(tilt(scene)).toEqual({ x: 0, y: 0, a: 0 })
      fireEvent.pointerMove(scene, { clientX: 50, clientY: 140 })
      fireEvent.keyDown(root, { key: 'ArrowRight' })
      fireEvent.blur(root)
      runUntilSettled(fx, t)
      expect(tilt(scene).a).toBe(1) // still hovered: the pointer holds it
    })

    it('ignores other keys, and keys pressed inside interactive art', () => {
      env = installFxEnv()
      render(
        <HoloCard aria-label={LABEL}>
          <button type="button">Trade</button>
        </HoloCard>,
      )
      const root = screen.getByRole('group', { name: LABEL })
      const scene = root.firstElementChild as HTMLElement
      env.intersect(true)
      runUntilSettled(env)
      expect(fireEvent.keyDown(root, { key: 'a' })).toBe(true)
      expect(fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowRight' })).toBe(true)
      expect(env.pendingFrames()).toBe(0)
      expect(tilt(scene).x).toBe(0)
    })
  })

  describe('reduced motion', () => {
    it('holds a flat still frame and ignores the pointer and arrow keys', () => {
      env = installFxEnv({ reducedMotion: true })
      const { container } = render(<Card />)
      const { root, scene } = parts(container)
      env.resize(scene, 200, 280)
      env.intersect(true)
      expect(scene.dataset.state).toBe('still')
      expect(tilt(scene)).toEqual({ x: 0, y: 0, a: 0 })
      fireEvent.pointerMove(scene, { clientX: 190, clientY: 10 })
      expect(fireEvent.keyDown(root, { key: 'ArrowRight' })).toBe(true) // default scrolling
      expect(env.pendingFrames()).toBe(0)
      expect(tilt(scene)).toEqual({ x: 0, y: 0, a: 0 })
    })

    it('flattens a tilted card when reduced motion switches on', () => {
      const { root, scene, fx } = mountLive()
      fireEvent.keyDown(root, { key: 'ArrowRight' })
      const t = runUntilSettled(fx)
      expect(tilt(scene).x).toBeGreaterThan(0.3)
      fx.reduceMotion(true)
      expect(scene.dataset.state).toBe('still')
      expect(tilt(scene)).toEqual({ x: 0, y: 0, a: 0 })
      fx.reduceMotion(false)
      runUntilSettled(fx, t)
      expect(tilt(scene)).toEqual({ x: 0, y: 0, a: 0 }) // the old input was forgotten
    })
  })

  it('has no axe violations in either theme', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <Card />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
