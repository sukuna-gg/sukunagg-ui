import { afterEach, describe, expect, it } from 'bun:test'
import { render } from '@testing-library/react'
import { type CSSProperties, createRef, Profiler, StrictMode } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { type FxEnv, flushEffects, installFxEnv } from '../../../../../test/fx'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { particleCount, rebuildSteps } from './flow-field.sim'
import { FlowField } from './index'

let env: FxEnv | undefined
afterEach(() => {
  env?.restore()
  env = undefined
})

const rootOf = (container: HTMLElement) =>
  container.querySelector('[data-sk-fx="flow-field"]') as HTMLElement
const canvasesOf = (container: HTMLElement) =>
  [...container.querySelectorAll('canvas')] as [HTMLCanvasElement, HTMLCanvasElement]

// fillRect calls per rebuild of `frames` 60 Hz frames in `steps` steps: one opaque fill, one fade
// per step, and on a black stage a residue-clearing color-burn every 4 frames (see BURN in
// flow-field.canvas.tsx). The default 300 × 150 canvas holds 160 particles, under the approved
// stage's 600: one step per frame.
const fills = (frames: number, steps = frames) => 1 + steps + Math.floor(frames / 4)
const WARM_FILLS = fills(60)
const STILL_FILLS = fills(120)

/** `prefers-reduced-motion` flipped without its `change` event (a read the browser swallowed). */
const motionQuery = () =>
  matchMedia('(prefers-reduced-motion: reduce)') as unknown as { matches: boolean }

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Count calls to `method` made while `run` executes. */
function during(fx: FxEnv, method: string, run: () => void): number {
  const before = fx.callsTo(method).length
  run()
  return fx.callsTo(method).length - before
}

describe('FlowField — server', () => {
  it('renders the always-dark stage, the poster, the canvases and the children', () => {
    const html = renderServer(
      <FlowField>
        <p>Searching for match…</p>
      </FlowField>,
    )
    expect(html).toContain('data-sk-fx="flow-field"')
    expect(html).toContain('data-theme="dark"')
    expect(html).toContain('flow-field-poster')
    expect(html).toContain('flow-field-scrim')
    expect(html.match(/<canvas/g)).toHaveLength(2)
    expect(html).toContain('Searching for match…')
    expect(html).not.toContain('data-state') // the loop owns it, on the client only
  })

  it('hydrates without warnings', async () => {
    env = installFxEnv({ reducedMotion: true })
    await expectHydrates(
      <FlowField density="high" calm>
        <p>Ready to queue</p>
      </FlowField>,
    )
    await flushEffects() // the hydrated island settles as a still frame inside this test
    expect(env.pendingFrames()).toBe(0)
  })
})

describe('FlowField — no canvas support', () => {
  it("reports `off` on happy-dom's null context and keeps the poster", () => {
    const { container } = render(<FlowField />)
    const root = rootOf(container)
    expect(root.dataset.state).toBe('off')
    expect(root.querySelector('.flow-field-poster')).not.toBeNull()
  })
})

describe('FlowField — on the shared loop', () => {
  it('paints the warmed-up field before the first frame, then runs once on screen', () => {
    env = installFxEnv()
    const { container } = render(<FlowField />)
    const root = rootOf(container)
    expect(root.dataset.state).toBe('paused') // no IntersectionObserver report yet
    // The warm-up: an opaque fill, 60 steps of trails, one glow copy.
    expect(env.callsTo('fillRect').length).toBe(WARM_FILLS)
    expect(env.callsTo('stroke').length).toBeGreaterThan(60)
    expect(env.callsTo('drawImage')).toHaveLength(1)
    expect(env.callsTo('fillRect')[0]).toEqual([0, 0, 300, 150])
    expect(env.pendingFrames()).toBe(0)

    env.intersect(true)
    expect(root.dataset.state).toBe('running')
    expect(env.pendingFrames()).toBe(1)
    // The first frame after a start only holds (dt = 0); the next ones step and copy the glow.
    expect(during(env, 'fillRect', () => env?.frame(16))).toBe(0)
    expect(during(env, 'fillRect', () => env?.frame(32))).toBeGreaterThan(0)
    expect(during(env, 'drawImage', () => env?.frame(48))).toBe(1)
    expect(env.callsTo('lineTo').length).toBeGreaterThan(1000)
  })

  it('draws on two canvases: the trails, and a third-size glow copy', () => {
    env = installFxEnv({ size: { width: 540, height: 320 } })
    const { container } = render(<FlowField />)
    const [trails, glow] = canvasesOf(container)
    expect(trails.width).toBe(540)
    expect(glow.width).toBe(180)
    expect(glow.height).toBe(107)
    expect(env.contextOf(glow)).toBeDefined()
    // Only the glow copy calls drawImage: the whole trails canvas, scaled down to a third.
    const [source, x, y, w, h] = env.callsTo('drawImage')[0] ?? []
    expect(source).toBe(trails)
    expect([x, y, w, h]).toEqual([0, 0, 180, 107])
  })

  it('strokes in the token colors (fallbacks match the dark palette)', () => {
    env = installFxEnv()
    const { container } = render(<FlowField />)
    const ctx = env.contextOf(canvasesOf(container)[0])
    expect(ctx?.lineWidth).toBeGreaterThan(1)
    expect(String(ctx?.strokeStyle)).toMatch(/^rgba\(\d+,\d+,\d+,0\.\d+\)$/)
  })

  it('fades toward the --sk-well token, and only burns residue on a black stage', () => {
    env = installFxEnv()
    const { container } = render(<FlowField style={{ '--sk-well': '#0a0a0b' } as CSSProperties} />)
    const ctx = env.contextOf(canvasesOf(container)[0])
    expect(String(ctx?.fillStyle)).toMatch(/^rgba\(10,10,11,/)
    expect(env.callsTo('fillRect').length).toBe(WARM_FILLS - 15) // no color-burn passes
  })

  it('holds a still frame under reduced motion and redraws it when calm or density change', () => {
    env = installFxEnv({ reducedMotion: true })
    const { container, rerender } = render(<FlowField />)
    const root = rootOf(container)
    expect(root.dataset.state).toBe('still')
    expect(env.pendingFrames()).toBe(0)
    expect(env.callsTo('fillRect')).toHaveLength(STILL_FILLS) // pre-advanced 120 steps
    const fx = env
    expect(during(fx, 'fillRect', () => rerender(<FlowField calm />))).toBe(STILL_FILLS)
    expect(during(fx, 'fillRect', () => rerender(<FlowField calm />))).toBe(0)
    expect(during(fx, 'fillRect', () => rerender(<FlowField calm density="low" />))).toBe(
      STILL_FILLS,
    )
    expect(env.pendingFrames()).toBe(0)
  })

  it('draws the same still frame every time (seeded, never Math.random)', () => {
    env = installFxEnv({ reducedMotion: true })
    const first = render(<FlowField />)
    const a = env.callsTo('lineTo').map((args) => args.join())
    first.unmount()
    env.calls.length = 0
    render(<FlowField />)
    const b = env.callsTo('lineTo').map((args) => args.join())
    expect(b).toEqual(a)
  })

  it('switches to the still frame live when the motion setting changes, and back', () => {
    env = installFxEnv()
    const { container } = render(<FlowField />)
    const root = rootOf(container)
    env.intersect(true)
    const fx = env
    expect(during(fx, 'fillRect', () => fx.reduceMotion(true))).toBe(STILL_FILLS)
    expect(root.dataset.state).toBe('still')
    expect(env.pendingFrames()).toBe(0)
    // Back to motion: the loop resumes from the still frame (the first frame holds, then steps).
    fx.reduceMotion(false)
    expect(root.dataset.state).toBe('running')
    fx.frame(16)
    expect(during(fx, 'fillRect', () => fx.frame(32))).toBeGreaterThan(0)
  })

  it('scales the old trails onto the new size on resize, without re-simulating', () => {
    env = installFxEnv()
    const { container } = render(<FlowField />)
    const [trails, glow] = canvasesOf(container)
    const root = rootOf(container)
    env.intersect(true)
    const fx = env
    fx.frame(16)
    fx.frame(32)
    const images = fx.callsTo('drawImage').length
    expect(during(fx, 'fillRect', () => fx.resize(trails, 600, 360))).toBe(0)
    expect(trails.width).toBe(600)
    expect(glow.width).toBe(200)
    expect(glow.height).toBe(120)
    // A copy of the old store (taken before the loop blanked it), scaled up, then the glow.
    const [copy, scaled, glowCopy] = fx.callsTo('drawImage').slice(images)
    expect(copy?.[0]).toBe(trails)
    const snapshot = scaled?.[0] as HTMLCanvasElement
    expect(scaled?.slice(1)).toEqual([0, 0, 600, 360])
    expect(snapshot).not.toBe(trails)
    expect(snapshot.width).toBe(0) // released at once
    expect(glowCopy?.[0]).toBe(trails)
    // Streaming continues from the scaled trails, at the new size.
    expect(root.dataset.state).toBe('running')
    expect(during(fx, 'fillRect', () => fx.frame(48))).toBeGreaterThan(0)
    expect(fx.callsTo('fillRect').at(-1)).toEqual([0, 0, 600, 360])
  })

  it('copies nothing when the observer reports no size change', () => {
    env = installFxEnv()
    const { container } = render(<FlowField />)
    const [trails] = canvasesOf(container)
    const fx = env
    expect(during(fx, 'drawImage', () => fx.resize(trails, 300, 150))).toBe(0)
  })

  it('holds the still frame through a resize and rebuilds it once, after the resizing settles', async () => {
    env = installFxEnv({ reducedMotion: true })
    const { container } = render(<FlowField />)
    const [trails] = canvasesOf(container)
    const fx = env
    expect(during(fx, 'fillRect', () => fx.resize(trails, 600, 360))).toBe(0)
    expect(during(fx, 'fillRect', () => fx.resize(trails, 640, 380))).toBe(0)
    expect(during(fx, 'drawImage', () => fx.resize(trails, 660, 390))).toBe(3)
    const before = fx.callsTo('fillRect').length
    await wait(200)
    // 894 particles, over the approved stage's 600: the same 120 frames in 80 steps of 1.5.
    const steps = rebuildSteps(particleCount(660, 390, 'medium'), 120)
    expect(steps).toBe(80)
    expect(fx.callsTo('fillRect').length - before).toBe(fills(120, steps))
    expect(fx.pendingFrames()).toBe(0)
  })

  it('costs nothing per frame when the loop keeps asking for the same still frame', () => {
    env = installFxEnv()
    const { container } = render(<FlowField />)
    const root = rootOf(container)
    env.intersect(true)
    const fx = env
    fx.frame(16)
    // Reduced motion reported per frame without a `change` event: the loop stays `running`.
    motionQuery().matches = true
    expect(during(fx, 'fillRect', () => fx.frame(32))).toBe(STILL_FILLS)
    expect(during(fx, 'fillRect', () => fx.frame(48))).toBe(0)
    expect(during(fx, 'drawImage', () => fx.frame(64))).toBe(0)
    expect(root.dataset.state).toBe('running')
    // A theme flip repaints it once in the new colors; then it holds again.
    expect(during(fx, 'fillRect', () => fx.colorScheme('light'))).toBe(0)
    expect(during(fx, 'fillRect', () => fx.frame(80))).toBe(STILL_FILLS)
    expect(during(fx, 'fillRect', () => fx.frame(96))).toBe(0)
    motionQuery().matches = false
    expect(during(fx, 'fillRect', () => fx.frame(112))).toBeGreaterThan(0)
  })

  it('redraws a still frame in the new colors when the theme flips', () => {
    env = installFxEnv({ reducedMotion: true })
    render(<FlowField />)
    const fx = env
    expect(during(fx, 'fillRect', () => fx.colorScheme('light'))).toBe(STILL_FILLS)
  })

  it('fades at most once per 60 Hz frame and burns every 4, at any refresh rate', () => {
    /** Stage fills and residue burns during one second of frames `ms` apart. */
    const perSecond = (ms: number) => {
      env?.restore()
      env = installFxEnv()
      const { container } = render(<FlowField />)
      const fx = env
      const ctx = fx.contextOf(canvasesOf(container)[0]) as Record<string, unknown>
      const fillRect = ctx.fillRect as (...args: number[]) => void
      const fills = { fade: 0, burn: 0 }
      ctx.fillRect = (...args: number[]) => {
        if (ctx.globalCompositeOperation === 'color-burn') fills.burn++
        else fills.fade++
        fillRect(...args)
      }
      fx.intersect(true)
      fx.frame(0) // the first frame after a start holds
      for (let t = ms; t <= 1000; t += ms) fx.frame(t)
      return fills
    }
    for (const ms of [6, 16, 50]) {
      const { burn } = perSecond(ms)
      expect(burn).toBeGreaterThanOrEqual(14)
      expect(burn).toBeLessThanOrEqual(15)
    }
    // 166 refreshes at ~165 Hz: one fill per three, each fading 1.08 frames' worth.
    expect(perSecond(6).fade).toBe(55)
    expect(perSecond(16).fade).toBe(62) // every refresh at 60 Hz
    expect(perSecond(50).fade).toBe(20) // every refresh at 20 Hz, three frames' worth
  })

  it('keeps the trails store at 1x on a high-DPR display (the glow at a third)', () => {
    env = installFxEnv({ dpr: 3, size: { width: 540, height: 320 } })
    const { container } = render(<FlowField />)
    const [trails, glow] = canvasesOf(container)
    expect([trails.width, trails.height]).toEqual([540, 320])
    expect([glow.width, glow.height]).toEqual([180, 107])
  })

  it('applies density and calm changes live, without remounting', () => {
    env = installFxEnv({ size: { width: 540, height: 320 } })
    const { container, rerender } = render(<FlowField density="low" />)
    const root = rootOf(container)
    env.intersect(true)
    const fx = env
    fx.frame(16)
    const low = during(fx, 'moveTo', () => fx.frame(32))
    rerender(<FlowField density="high" calm />)
    const high = during(fx, 'moveTo', () => fx.frame(48))
    expect(high).toBeGreaterThan(low * 1.8)
    expect(root.dataset.state).toBe('running')
    expect(env.callsTo('drawImage').length).toBeGreaterThan(1)
  })

  it('holds the frame while `paused`, and resumes', () => {
    env = installFxEnv()
    const { container, rerender } = render(<FlowField paused />)
    const root = rootOf(container)
    env.intersect(true)
    expect(root.dataset.state).toBe('paused')
    expect(env.pendingFrames()).toBe(0)
    rerender(<FlowField />)
    expect(root.dataset.state).toBe('running')
    expect(env.pendingFrames()).toBe(1)
  })

  it('never re-renders React per frame', () => {
    env = installFxEnv()
    let commits = 0
    render(
      <Profiler id="ff" onRender={() => commits++}>
        <FlowField />
      </Profiler>,
    )
    env.intersect(true)
    const after = commits
    for (let t = 16; t < 200; t += 16) env.frame(t)
    expect(commits).toBe(after)
  })

  it('mounts once under StrictMode: one pending frame, none after unmount', () => {
    env = installFxEnv()
    const { container, unmount } = render(
      <StrictMode>
        <FlowField />
      </StrictMode>,
    )
    env.intersect(true)
    expect(rootOf(container).dataset.state).toBe('running')
    expect(env.pendingFrames()).toBe(1)
    unmount()
    expect(env.pendingFrames()).toBe(0)
  })

  it('redraws the still frame on a calm change under StrictMode', () => {
    env = installFxEnv({ reducedMotion: true })
    const fx = env
    const { rerender } = render(
      <StrictMode>
        <FlowField />
      </StrictMode>,
    )
    const redraw = during(fx, 'fillRect', () =>
      rerender(
        <StrictMode>
          <FlowField calm />
        </StrictMode>,
      ),
    )
    expect(redraw).toBe(STILL_FILLS)
    expect(fx.pendingFrames()).toBe(0)
  })

  it('leaves no pending frame after unmount', () => {
    env = installFxEnv()
    const { container, unmount } = render(<FlowField />)
    env.intersect(true)
    expect(env.pendingFrames()).toBe(1)
    const root = rootOf(container)
    unmount()
    expect(env.pendingFrames()).toBe(0)
    expect(root.hasAttribute('data-state')).toBe(false)
  })
})

describe('FlowField — props and a11y', () => {
  it('forwards the ref to the root <div>', () => {
    const ref = createRef<HTMLDivElement>()
    render(<FlowField ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(ref.current?.dataset.skFx).toBe('flow-field')
  })

  it('merges className last and passes native props through', () => {
    const { container } = render(
      <FlowField className="min-h-0 h-40" id="queue" data-testid="ff" aria-label="Matchmaking" />,
    )
    const root = rootOf(container)
    expect(root.classList.contains('h-40')).toBe(true)
    expect(root.classList.contains('min-h-0')).toBe(true)
    expect(root.classList.contains('min-h-80')).toBe(false)
    expect(root.id).toBe('queue')
    expect(root.dataset.testid).toBe('ff')
    expect(root.getAttribute('aria-label')).toBe('Matchmaking')
  })

  it('keeps its own props off the DOM', () => {
    const { container } = render(<FlowField density="high" calm paused />)
    const root = rootOf(container)
    for (const attr of ['density', 'calm', 'paused']) expect(root.hasAttribute(attr)).toBe(false)
  })

  it('hides the effect from assistive tech and keeps the children readable', () => {
    const { container, getByRole } = render(
      <FlowField>
        <button type="button">Cancel</button>
      </FlowField>,
    )
    const stage = rootOf(container).firstElementChild as HTMLElement
    expect(stage.getAttribute('aria-hidden')).toBe('true')
    expect(stage.querySelectorAll('canvas')).toHaveLength(2)
    expect(getByRole('button', { name: 'Cancel' })).toBeDefined()
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <FlowField>
        <p>Searching for match…</p>
        <button type="button">Cancel</button>
      </FlowField>,
    )
    await expectAccessible(container)
  })
})
