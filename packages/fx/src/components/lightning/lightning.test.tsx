import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import { render } from '@testing-library/react'
import { type CSSProperties, createRef, StrictMode } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { type FxEnv, flushEffects, installFxEnv } from '../../../../../test/fx'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { Lightning } from './index'
import { FROZEN } from './lightning.storm'

let env: FxEnv | undefined
afterEach(() => {
  env?.restore()
  env = undefined
})

const rootOf = (c: HTMLElement) => c.querySelector('[data-sk-fx="lightning"]') as HTMLElement
const stageOf = (c: HTMLElement) => rootOf(c).firstElementChild as HTMLElement
const canvasOf = (c: HTMLElement) => c.querySelector('canvas') as HTMLCanvasElement
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * The uniforms of the last drawn frame. The renderer sets them in a fixed order every frame:
 * uniform2f R; uniform1f X, T, S, I, B, F; uniform3f Q, C0, C1, C2, BG.
 */
function lastFrame(e: FxEnv) {
  const f1 = e.callsTo('uniform1f').slice(-6)
  const f3 = e.callsTo('uniform3f').slice(-5)
  const one = (i: number) => f1[i]?.[1] as number
  const three = (i: number) => f3[i]?.slice(1) as number[]
  return {
    R: e.callsTo('uniform2f').at(-1)?.slice(1),
    X: one(0),
    T: one(1),
    S: one(2),
    I: one(3),
    B: one(4),
    F: one(5),
    Q: three(0),
    C0: three(1),
    C1: three(2),
    C2: three(3),
    BG: three(4),
  }
}

describe('Lightning — server', () => {
  it('renders the always-dark root, the SVG poster and the children; no loop state', () => {
    const html = renderServer(
      <Lightning>
        <h2>Grand Final</h2>
      </Lightning>,
    )
    expect(html).toContain('data-sk-fx="lightning"')
    expect(html).toContain('data-theme="dark"')
    expect(html).not.toContain('data-state')
    expect(html.match(/<svg/g)).toHaveLength(2)
    expect(html.match(/d="M44 -30 /g)).toHaveLength(2) // trunk in the glow and the hot core
    expect(html.match(/d="M28 400 /g)).toHaveLength(2) // branch
    expect(html).toContain('<canvas')
    expect(html).toContain('<h2>Grand Final</h2>')
  })

  it('hydrates without warnings', async () => {
    env = installFxEnv({ reducedMotion: true })
    await expectHydrates(
      <Lightning intensity="storm" position={0.4}>
        <p>Live</p>
      </Lightning>,
    )
    await flushEffects()
  })
})

describe('Lightning — props', () => {
  it('sets the clamped position on the stage, or leaves the responsive default', () => {
    const cases: [number | undefined, string][] = [
      [0.25, '0.25'],
      [2, '1'],
      [-1, '0'],
      [Number.NaN, ''],
      [undefined, ''],
    ]
    for (const [position, expected] of cases) {
      const { container, unmount } = render(<Lightning position={position} />)
      expect(stageOf(container).style.getPropertyValue('--sk-lightning-x')).toBe(expected)
      unmount()
    }
    const { container } = render(<Lightning />)
    expect(stageOf(container).className).toContain('[--sk-lightning-x:0.66]')
    expect(stageOf(container).className).toContain('@max-[720px]:[--sk-lightning-x:0.8]')
  })

  it('forwards the ref, merges className, passes native props and pins the dark theme', () => {
    const ref = createRef<HTMLDivElement>()
    const { container } = render(
      <Lightning
        ref={ref}
        id="hero"
        data-theme="light"
        aria-label="Grand Final"
        className="bg-well"
      >
        <p>copy</p>
      </Lightning>,
    )
    const root = rootOf(container)
    expect(ref.current).toBe(root as HTMLDivElement)
    expect(root.id).toBe('hero')
    expect(root.getAttribute('aria-label')).toBe('Grand Final')
    expect(root.dataset.theme).toBe('dark')
    expect(root.classList.contains('bg-well')).toBe(true)
    expect(root.classList.contains('bg-bg')).toBe(false)
    expect(root.classList.contains('@container')).toBe(true)
    for (const prop of ['intensity', 'position', 'paused'])
      expect(root.hasAttribute(prop)).toBe(false)
    expect(root.lastElementChild?.textContent).toBe('copy') // children after the effect
  })

  it('hides the effect from assistive tech and keeps the canvas fade on the loop state', () => {
    const { container } = render(<Lightning />)
    const stage = stageOf(container)
    expect(stage.getAttribute('aria-hidden')).toBe('true')
    expect(stage.className).toContain('-z-10')
    const canvas = canvasOf(container)
    expect(stage.contains(canvas)).toBe(true)
    expect(canvas.classList.contains('opacity-0')).toBe(true)
    expect(canvas.classList.contains('group-data-[state=running]/fx:opacity-100')).toBe(true)
    expect(canvas.classList.contains('motion-reduce:transition-none')).toBe(true)
  })

  it('passes axe in both page themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <Lightning>
            <h2>Grand Final</h2>
            <p>Crimson Vow vs Night Shift</p>
          </Lightning>
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})

describe('Lightning — loop', () => {
  it("reports `off` and keeps the poster when there's no WebGL (happy-dom)", async () => {
    const { container, unmount } = render(<Lightning />)
    expect(rootOf(container).dataset.state).toBe('off')
    expect(container.querySelectorAll('svg')).toHaveLength(2)
    unmount() // disposing a renderer that never set up is a no-op
    await tick()
  })

  it('draws the frozen bolt at once, then storms while on screen', () => {
    env = installFxEnv()
    const { container } = render(<Lightning />)
    const root = rootOf(container)
    expect(root.dataset.state).toBe('paused') // no IntersectionObserver report yet
    expect(env.callsTo('linkProgram')).toHaveLength(1)
    expect(env.callsTo('drawArrays')).toEqual([[expect.any(Number), 0, 3]])
    const first = lastFrame(env)
    expect(first.R).toEqual([300, 150])
    expect(first.I).toBeCloseTo(FROZEN.I)
    expect(first.S).toBeCloseTo(FROZEN.S)

    env.intersect(true)
    expect(root.dataset.state).toBe('running')
    env.frame(1000)
    env.frame(1016)
    const strike = lastFrame(env)
    expect(strike.I).toBeGreaterThan(1) // the first strike's flash
    expect(strike.T).toBeGreaterThan(FROZEN.T)
    for (let t = 1032; t < 2000; t += 16) env.frame(t)
    expect(lastFrame(env).I).toBeLessThan(strike.I)
    expect(env.pendingFrames()).toBe(1)
  })

  it('feeds the token colors and the bolt position to the shader', () => {
    env = installFxEnv()
    // happy-dom doesn't inherit custom properties into getComputedStyle (browsers do): emulate it.
    const computed = globalThis.getComputedStyle
    const inherit = spyOn(globalThis, 'getComputedStyle').mockImplementation((el, pseudo) => {
      const style = computed(el, pseudo)
      const own = style.getPropertyValue.bind(style)
      const read = (name: string) => {
        let value = own(name)
        for (let p = el.parentElement; !value && p; p = p.parentElement)
          value = p.style.getPropertyValue(name)
        return value
      }
      return new Proxy(style, {
        get: (target, key) => (key === 'getPropertyValue' ? read : Reflect.get(target, key)),
      })
    })
    try {
      const { container } = render(
        <Lightning
          position={0.25}
          style={{ '--sk-accent': '#00ff00', '--sk-bg': 'rgb(0, 0, 255)' } as CSSProperties}
        />,
      )
      expect(rootOf(container).dataset.state).toBe('paused')
      const f = lastFrame(env)
      expect(f.C1).toEqual([0, 1, 0])
      expect(f.BG).toEqual([0, 0, 1])
      expect(f.C0?.[0]).toBeCloseTo(244 / 255) // fallback: the dark --sk-text
      expect(f.X).toBeCloseTo((0.25 - 0.5) * 2) // a 300×150 canvas
    } finally {
      inherit.mockRestore()
    }
  })

  it('falls back to the default position when none can be read', () => {
    env = installFxEnv()
    render(<Lightning />) // happy-dom: no stylesheet, so the default class sets nothing
    expect(lastFrame(env).X).toBeCloseTo((0.66 - 0.5) * 2)
  })

  it('holds one still frame under reduced motion and schedules nothing', () => {
    env = installFxEnv({ reducedMotion: true, size: { width: 1100, height: 380 } })
    const { container } = render(<Lightning intensity="storm" />)
    env.intersect(true)
    expect(rootOf(container).dataset.state).toBe('still')
    expect(env.pendingFrames()).toBe(0)
    const f = lastFrame(env)
    expect(f.I).toBeCloseTo(FROZEN.I)
    expect(f.B).toBe(1)
    expect(f.F).toBe(0)
  })

  it("drops the frozen route's fork below 400 px, like the poster, but not a re-routed one", () => {
    env = installFxEnv({ size: { width: 360, height: 380 } })
    const { container } = render(<Lightning intensity="storm" />)
    expect(lastFrame(env).B).toBe(0) // the first frame: the poster's bolt, no fork
    expect(container.querySelectorAll('path[class*="@max-[400px]:hidden"]')).toHaveLength(2)
    env.intersect(true)
    env.frame(0)
    env.frame(16) // the first strike keeps the frozen route: still no fork
    expect(lastFrame(env).S).toBe(FROZEN.S)
    expect(lastFrame(env).B).toBe(0)
    env.resize(canvasOf(container), 400, 380) // 400 px and up: the fork is back
    expect(lastFrame(env).B).toBeGreaterThan(0)
    env.resize(canvasOf(container), 360, 380)
    // Run until a later strike re-routes (storm: within 1.7 s of the first).
    for (let t = 32; t < 3000 && lastFrame(env).S === FROZEN.S; t += 16) env.frame(t)
    expect(lastFrame(env).S).not.toBe(FROZEN.S)
    expect(lastFrame(env).B).toBe(1) // the seeded re-route forks: narrow cards keep those branches
  })

  it('switches to the still frame when reduced motion turns on while running', () => {
    env = installFxEnv()
    const { container } = render(<Lightning />)
    env.intersect(true)
    for (let t = 0; t < 600; t += 16) env.frame(t)
    env.reduceMotion(true)
    expect(rootOf(container).dataset.state).toBe('still')
    expect(lastFrame(env).S).toBeCloseTo(FROZEN.S)
    expect(env.pendingFrames()).toBe(0)
  })

  it('holds the frame while `paused`, and resumes live without remounting', () => {
    env = installFxEnv()
    const { container, rerender } = render(<Lightning paused />)
    env.intersect(true)
    expect(rootOf(container).dataset.state).toBe('paused')
    expect(env.pendingFrames()).toBe(0)
    const canvas = canvasOf(container)
    rerender(<Lightning />)
    expect(rootOf(container).dataset.state).toBe('running')
    expect(canvasOf(container)).toBe(canvas)
  })

  it('changes intensity live, and remounts the island for a new position', () => {
    env = installFxEnv()
    const { container, rerender } = render(<Lightning intensity="calm" />)
    const canvas = canvasOf(container)
    env.intersect(true)
    // Past the first strike's flash and echo (calm waits >= 2.6 s for the next one): resting I is
    // the preset's base ± 0.05 wobble (calm 0.72, storm 0.86).
    let t = 0
    for (; t < 1000; t += 16) env.frame(t)
    expect(lastFrame(env).I).toBeLessThan(0.78)
    rerender(<Lightning intensity="storm" />)
    env.frame(t)
    expect(lastFrame(env).I).toBeGreaterThan(0.8)
    expect(canvasOf(container)).toBe(canvas)
    expect(env.callsTo('linkProgram')).toHaveLength(1)
    rerender(<Lightning intensity="storm" position={0.3} />)
    expect(canvasOf(container)).not.toBe(canvas)
    expect(env.callsTo('linkProgram')).toHaveLength(2)
  })

  it('shows the poster on context loss and rebuilds on restore', () => {
    env = installFxEnv()
    const { container } = render(<Lightning />)
    env.intersect(true)
    const gl = env.contextOf(canvasOf(container)) as unknown as WebGLRenderingContext
    const ext = gl.getExtension('WEBGL_lose_context') as WEBGL_lose_context
    ext.loseContext()
    expect(rootOf(container).dataset.state).toBe('lost')
    expect(env.pendingFrames()).toBe(0)
    ext.restoreContext()
    expect(env.callsTo('linkProgram')).toHaveLength(2)
    expect(rootOf(container).dataset.state).toBe('running')
  })

  it('reports `off` when the shader program fails to link', () => {
    env = installFxEnv()
    const proto = HTMLCanvasElement.prototype
    const getContext = proto.getContext
    const failing = function (this: HTMLCanvasElement, ...args: unknown[]) {
      const ctx = Reflect.apply(getContext, this, args) as Record<string, unknown>
      ctx.getProgramParameter = () => false
      return ctx
    }
    proto.getContext = failing as unknown as typeof proto.getContext
    try {
      const { container } = render(<Lightning />)
      expect(rootOf(container).dataset.state).toBe('off')
      expect(env.callsTo('drawArrays')).toHaveLength(0)
    } finally {
      proto.getContext = getContext
    }
  })

  it('frees the GPU program on unmount and releases the context once detached', async () => {
    env = installFxEnv()
    const { unmount } = render(<Lightning />)
    env.intersect(true)
    unmount()
    expect(env.pendingFrames()).toBe(0)
    expect(env.callsTo('deleteProgram')).toHaveLength(1)
    expect(env.callsTo('deleteBuffer')).toHaveLength(1)
    await tick()
    expect(env.callsTo('getExtension')).toContainEqual(['WEBGL_lose_context'])
  })

  it('keeps its context through a StrictMode remount', async () => {
    env = installFxEnv()
    const { container } = render(
      <StrictMode>
        <Lightning />
      </StrictMode>,
    )
    await tick()
    expect(env.callsTo('getExtension')).not.toContainEqual(['WEBGL_lose_context'])
    expect(env.callsTo('linkProgram')).toHaveLength(2) // mounted, destroyed, mounted again
    expect(rootOf(container).dataset.state).toBe('paused')
  })
})
