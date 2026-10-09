import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { type FxEnv, type FxEnvOptions, installFxEnv } from '../../../../test/fx'
import {
  type FxClock,
  type FxContextKind,
  type FxFrame,
  type FxState,
  mountFx,
  mountLoop,
} from './loop'

let env: FxEnv | undefined
const setup = (options?: FxEnvOptions): FxEnv => {
  env = installFxEnv(options)
  return env
}
afterEach(() => {
  env?.restore()
  env = undefined
  document.body.replaceChildren()
  document.documentElement.removeAttribute('data-theme')
})

/** A root with a canvas in it, attached to the document (optionally inside a themed wrapper). */
function stage(wrapper?: HTMLElement) {
  const root = document.createElement('div')
  const canvas = document.createElement('canvas')
  root.append(canvas)
  if (wrapper) {
    wrapper.append(root)
    document.body.append(wrapper)
  } else document.body.append(root)
  return { root, canvas }
}

/** A renderer that records every call; `draws` holds a copy of each frame it was given. */
function recorder<C = CanvasRenderingContext2D>(draw?: (frame: FxFrame) => void) {
  const draws: FxFrame[] = []
  return {
    draws,
    setup: mock((_ctx: C): unknown => undefined),
    theme: mock((_style: CSSStyleDeclaration) => {}),
    resize: mock((_frame: Readonly<FxFrame>) => {}),
    draw: mock((_ctx: C, frame: Readonly<FxFrame>) => {
      draws.push({ ...frame })
      draw?.(frame)
    }),
    dispose: mock(() => {}),
  }
}

describe('mountFx: no context', () => {
  it("reports `off` on happy-dom's null context and never throws or ticks", () => {
    const { root, canvas } = stage()
    const fx = mountFx(root, canvas, recorder())
    expect(fx.state).toBe('off')
    expect(root.dataset.state).toBe('off')
    fx.setPaused(false)
    fx.destroy()
    expect(root.hasAttribute('data-state')).toBe(false)
  })

  it('never calls the renderer, and disposes once', () => {
    const e = setup({ contexts: false })
    const { root, canvas } = stage()
    const r = recorder()
    const fx = mountFx(root, canvas, r)
    expect(fx.state).toBe('off')
    expect(r.setup).not.toHaveBeenCalled()
    expect(r.draw).not.toHaveBeenCalled()
    expect(e.pendingFrames()).toBe(0)
    fx.destroy()
    fx.destroy()
    expect(r.dispose).toHaveBeenCalledTimes(1)
  })

  it('reports `off` when setup returns false', () => {
    setup()
    const { root, canvas } = stage()
    const r = recorder()
    r.setup.mockImplementation(() => false)
    const fx = mountFx(root, canvas, r)
    expect(fx.state).toBe('off')
    expect(r.draw).not.toHaveBeenCalled()
    fx.destroy()
    expect(r.dispose).toHaveBeenCalledTimes(1)
  })
})

describe('mountFx: 2D', () => {
  it('sizes the backing store, draws a still first frame and waits for visibility', () => {
    const e = setup()
    const { root, canvas } = stage()
    const r = recorder()
    const fx = mountFx(root, canvas, r)
    const ctx = e.contextOf(canvas)
    expect(r.setup).toHaveBeenCalledWith(ctx)
    expect(r.theme).toHaveBeenCalledTimes(1)
    expect(r.theme.mock.calls[0]?.[0]).toHaveProperty('getPropertyValue')
    expect([canvas.width, canvas.height]).toEqual([300, 150])
    expect(e.callsTo('setTransform')).toEqual([[1, 0, 0, 1, 0, 0]])
    expect(r.resize.mock.calls[0]?.[0]).toMatchObject({ width: 300, height: 150, dpr: 1 })
    expect(r.draws).toEqual([{ width: 300, height: 150, dpr: 1, dt: 0, time: 0, still: false }])
    expect(fx.state).toBe('paused')
    expect(root.dataset.state).toBe('paused')
    expect(e.pendingFrames()).toBe(0)
    fx.destroy()
  })

  it('animates on screen with a clamped dt, starting from dt = 0', () => {
    const e = setup()
    const { root, canvas } = stage()
    const r = recorder()
    const fx = mountFx(root, canvas, r)
    e.intersect(true)
    expect(fx.state).toBe('running')
    expect(e.pendingFrames()).toBe(1)
    e.frame(1000)
    e.frame(1016)
    e.frame(2000) // a 1 s stall is clamped to 0.05 s
    e.frame(1990) // a clock going backwards never yields a negative dt
    expect(r.draws.slice(1).map((f) => f.dt)).toEqual([0, 0.016, 0.05, 0])
    expect(r.draws.at(-1)?.time).toBeCloseTo(0.066)
    expect(e.pendingFrames()).toBe(1)
    fx.destroy()
    expect(e.pendingFrames()).toBe(0)
  })

  it('pauses off screen and in a hidden tab, cancelling the frame, and resumes at dt = 0', () => {
    const e = setup()
    const { root, canvas } = stage()
    const r = recorder()
    const fx = mountFx(root, canvas, r)
    e.intersect(true)
    e.frame(10)
    e.frame(26)
    e.hide(true)
    expect(fx.state).toBe('paused')
    expect(e.pendingFrames()).toBe(0)
    e.hide(false)
    expect(fx.state).toBe('running')
    e.frame(5000)
    expect(r.draws.at(-1)?.dt).toBe(0)
    e.intersect(false)
    expect(fx.state).toBe('paused')
    expect(e.pendingFrames()).toBe(0)
    e.intersect(true)
    expect(fx.state).toBe('running')
    fx.destroy()
  })

  it('pauses on demand (`paused` option and setPaused)', () => {
    const e = setup()
    const { root, canvas } = stage()
    const states: FxState[] = []
    const fx = mountFx(root, canvas, recorder(), { paused: true, onState: (s) => states.push(s) })
    e.intersect(true)
    expect(fx.state).toBe('paused')
    fx.setPaused(false)
    expect(fx.state).toBe('running')
    fx.setPaused(true)
    expect(fx.state).toBe('paused')
    expect(e.pendingFrames()).toBe(0)
    expect(states).toEqual(['paused', 'running', 'paused'])
    fx.destroy()
  })

  it('draws one still frame under reduced motion and follows the setting live', () => {
    const e = setup({ reducedMotion: true })
    const { root, canvas } = stage()
    const r = recorder()
    const fx = mountFx(root, canvas, r)
    e.intersect(true)
    expect(fx.state).toBe('still')
    expect(e.pendingFrames()).toBe(0)
    expect(r.draws.map((f) => [f.dt, f.still])).toEqual([[0, true]])
    e.reduceMotion(false)
    expect(fx.state).toBe('running')
    expect(e.pendingFrames()).toBe(1)
    e.frame(16)
    expect(r.draws.at(-1)?.still).toBe(false)
    e.reduceMotion(true) // a moving canvas is repainted as the still frame
    expect(fx.state).toBe('still')
    expect(e.pendingFrames()).toBe(0)
    expect(r.draws.map((f) => [f.dt, f.still])).toEqual([
      [0, true],
      [0, false],
      [0, true],
    ])
    e.intersect(false) // reduced motion wins over off-screen
    expect(fx.state).toBe('still')
    expect(r.draws).toHaveLength(3)
    fx.destroy()
  })

  it('repaints a paused canvas as the still frame when reduced motion turns on', () => {
    const e = setup()
    const { root, canvas } = stage()
    const r = recorder()
    const fx = mountFx(root, canvas, r)
    expect(fx.state).toBe('paused')
    e.reduceMotion(true)
    expect(fx.state).toBe('still')
    expect(r.draws.map((f) => f.still)).toEqual([false, true])
    fx.wake() // a canvas never settles: nothing to wake
    expect(e.pendingFrames()).toBe(0)
    fx.destroy()
  })

  it('never reads the motion setting inside a frame (Chromium would swallow its change event)', () => {
    const e = setup()
    const { root, canvas } = stage()
    const fx = mountFx(root, canvas, recorder())
    e.intersect(true)
    expect(fx.state).toBe('running')
    // Count reads of the live query; in Blink a per-frame read refreshes its cached value before
    // the change check, so `change` never fires and the effect would stay `running`.
    const mql = matchMedia('(prefers-reduced-motion: reduce)')
    let value = mql.matches
    let reads = 0
    Object.defineProperty(mql, 'matches', {
      configurable: true,
      get() {
        reads++
        return value
      },
      set(next: boolean) {
        value = next
      },
    })
    e.frame(16)
    e.frame(16)
    e.frame(16)
    expect(reads).toBe(0)
    e.reduceMotion(true)
    expect(fx.state).toBe('still')
    expect(e.pendingFrames()).toBe(0)
    fx.destroy()
  })

  it('caps the device pixel ratio at 2, or at maxDpr', () => {
    const e = setup({ dpr: 3 })
    const a = stage()
    const fa = mountFx(a.root, a.canvas, recorder())
    expect([a.canvas.width, a.canvas.height]).toEqual([600, 300])
    expect(e.callsTo('setTransform')).toEqual([[2, 0, 0, 2, 0, 0]])
    const b = stage()
    const rb = recorder()
    const fb = mountFx(b.root, b.canvas, rb, { maxDpr: 1 })
    expect([b.canvas.width, b.canvas.height]).toEqual([300, 150])
    expect(rb.draws[0]?.dpr).toBe(1)
    fa.destroy()
    fb.destroy()
  })

  it('follows the canvas size, skipping no-op and empty boxes', () => {
    const e = setup()
    const { root, canvas } = stage()
    const r = recorder()
    const fx = mountFx(root, canvas, r)
    e.resize(canvas, 400, 200)
    expect([canvas.width, canvas.height]).toEqual([400, 200])
    expect(r.resize).toHaveBeenCalledTimes(2)
    expect(r.draws.at(-1)).toMatchObject({ width: 400, height: 200, dt: 0 })
    e.resize(canvas, 400, 200)
    e.resize(canvas, 0, 0)
    expect(r.resize).toHaveBeenCalledTimes(2)
    e.setDpr(2) // same CSS box, new density: a new backing store
    e.resize(canvas, 400, 200)
    expect([canvas.width, canvas.height]).toEqual([800, 400])
    fx.destroy()
  })

  it('never draws an empty canvas; draws once it gets a size', () => {
    const e = setup({ size: { width: 0, height: 0 } })
    const { root, canvas } = stage()
    const r = recorder()
    const fx = mountFx(root, canvas, r)
    expect(r.draw).not.toHaveBeenCalled()
    e.resize(canvas, 120, 60)
    expect(r.draws).toHaveLength(1)
    fx.destroy()
  })

  it('re-reads the theme when the nearest [data-theme] changes, redrawing unless running', async () => {
    const e = setup()
    const themed = document.createElement('div')
    themed.setAttribute('data-theme', 'dark')
    const { root, canvas } = stage(themed)
    const r = recorder()
    const fx = mountFx(root, canvas, r)
    themed.setAttribute('data-theme', 'light')
    await Promise.resolve() // MutationObserver delivers on a microtask
    expect(r.theme).toHaveBeenCalledTimes(2)
    expect(r.draws).toHaveLength(2) // paused: redrawn at once with the new colors
    e.intersect(true)
    themed.setAttribute('data-theme', 'dark')
    await Promise.resolve()
    expect(r.theme).toHaveBeenCalledTimes(3)
    expect(r.draws).toHaveLength(2) // running: the next frame picks the colors up
    fx.destroy()
  })

  it('watches <html> when no ancestor has data-theme', async () => {
    setup()
    const { root, canvas } = stage()
    const r = recorder()
    const fx = mountFx(root, canvas, r)
    document.documentElement.setAttribute('data-theme', 'light')
    await Promise.resolve()
    expect(r.theme).toHaveBeenCalledTimes(2)
    fx.destroy()
    document.documentElement.setAttribute('data-theme', 'dark')
    await Promise.resolve()
    expect(r.theme).toHaveBeenCalledTimes(2) // disconnected on destroy
  })

  it('re-reads the theme when the OS color scheme flips (data-theme="system")', () => {
    const e = setup()
    const { root, canvas } = stage()
    const r = recorder()
    const fx = mountFx(root, canvas, r)
    expect(matchMedia('(prefers-color-scheme: dark)').matches).toBe(true)
    e.colorScheme('light')
    expect(matchMedia('(prefers-color-scheme: dark)').matches).toBe(false)
    expect(matchMedia('(prefers-color-scheme: light)').matches).toBe(true)
    expect(r.theme).toHaveBeenCalledTimes(2)
    expect(r.draws).toHaveLength(2) // paused: redrawn at once
    fx.destroy()
    e.colorScheme('dark')
    expect(r.theme).toHaveBeenCalledTimes(2) // listener removed on destroy
  })

  it('shares one animation frame between effects and cancels it with the last one', () => {
    const e = setup()
    const a = stage()
    const b = stage()
    const ra = recorder()
    const rb = recorder()
    const fa = mountFx(a.root, a.canvas, ra)
    const fb = mountFx(b.root, b.canvas, rb)
    e.intersect(true)
    expect(e.pendingFrames()).toBe(1)
    e.frame(16)
    expect([ra.draws.length, rb.draws.length]).toEqual([2, 2])
    fa.destroy()
    e.frame(32)
    expect([ra.draws.length, rb.draws.length]).toEqual([2, 3])
    expect(e.pendingFrames()).toBe(1)
    fb.destroy()
    expect(e.pendingFrames()).toBe(0)
  })

  it('survives a StrictMode-style mount, destroy, remount on the same canvas', () => {
    const e = setup()
    const { root, canvas } = stage()
    const first = recorder()
    mountFx(root, canvas, first).destroy()
    expect(root.hasAttribute('data-state')).toBe(false)
    expect(first.dispose).toHaveBeenCalledTimes(1)
    const second = recorder()
    const fx = mountFx(root, canvas, second)
    expect(second.draws).toHaveLength(1) // the same backing store, still redrawn
    e.intersect(true)
    e.frame(16)
    expect(first.draws).toHaveLength(1)
    expect(second.draws).toHaveLength(2)
    expect(root.dataset.state).toBe('running')
    fx.destroy()
    fx.destroy()
    expect(second.dispose).toHaveBeenCalledTimes(1)
    expect(e.pendingFrames()).toBe(0)
  })

  it('stops an effect whose draw throws, and keeps the others running', () => {
    const e = setup()
    const error = spyOn(console, 'error').mockImplementation(() => {})
    const a = stage()
    const b = stage()
    const ra = recorder((f) => {
      if (f.dt > 0) throw new Error('boom')
    })
    const rb = recorder()
    const fa = mountFx(a.root, a.canvas, ra)
    const fb = mountFx(b.root, b.canvas, rb)
    e.intersect(true)
    e.frame(0)
    e.frame(16)
    expect(fa.state).toBe('off')
    expect(error).toHaveBeenCalledTimes(1)
    e.frame(32)
    e.hide(true) // an `off` effect ignores later changes
    e.hide(false)
    expect(fa.state).toBe('off')
    expect(ra.draws).toHaveLength(3)
    expect(rb.draws).toHaveLength(4)
    fa.destroy()
    fb.destroy()
    error.mockRestore()
  })

  it('turns a throwing setup, theme or resize into `off` instead of throwing', async () => {
    const e = setup()
    const error = spyOn(console, 'error').mockImplementation(() => {})
    const boom = () => {
      throw new Error('boom')
    }

    const a = stage()
    const ra = recorder()
    ra.setup.mockImplementation(boom)
    const fa = mountFx(a.root, a.canvas, ra)
    expect(fa.state).toBe('off')
    expect(ra.draw).not.toHaveBeenCalled()

    const b = stage()
    const rb = recorder()
    rb.theme.mockImplementation(boom)
    const fb = mountFx(b.root, b.canvas, rb)
    expect(fb.state).toBe('off')
    expect(rb.draw).not.toHaveBeenCalled()
    e.resize(b.canvas, 50, 50) // an `off` effect ignores resizes and theme changes
    document.documentElement.setAttribute('data-theme', 'light')
    await Promise.resolve()
    expect(rb.resize).not.toHaveBeenCalled()
    expect(rb.theme).toHaveBeenCalledTimes(1)

    const c = stage()
    const rc = recorder()
    const fc = mountFx(c.root, c.canvas, rc)
    e.intersect(true)
    rc.resize.mockImplementation(boom)
    e.resize(c.canvas, 80, 40)
    expect(fc.state).toBe('off')
    expect(rc.draws).toHaveLength(1)
    expect(e.pendingFrames()).toBe(0)

    expect(error).toHaveBeenCalledTimes(3)
    for (const fx of [fa, fb, fc]) fx.destroy()
    expect([ra, rb, rc].map((r) => r.dispose.mock.calls.length)).toEqual([1, 1, 1])
    error.mockRestore()
  })

  it('stops when a theme change makes the renderer throw', async () => {
    setup()
    const error = spyOn(console, 'error').mockImplementation(() => {})
    const { root, canvas } = stage()
    const r = recorder()
    const fx = mountFx(root, canvas, r)
    r.theme.mockImplementation(() => {
      throw new Error('boom')
    })
    document.documentElement.setAttribute('data-theme', 'light')
    await Promise.resolve()
    expect(fx.state).toBe('off')
    expect(r.draws).toHaveLength(1) // no redraw after the failure
    fx.destroy()
    error.mockRestore()
  })

  it('runs without observers or matchMedia (assumes on screen, never reduced)', () => {
    const e = setup()
    const g = globalThis as Record<string, unknown>
    const saved = {
      IntersectionObserver: g.IntersectionObserver,
      ResizeObserver: g.ResizeObserver,
      MutationObserver: g.MutationObserver,
      matchMedia: g.matchMedia,
    }
    for (const key of Object.keys(saved)) g[key] = undefined
    try {
      const { root, canvas } = stage()
      const r = recorder()
      const fx = mountFx(root, canvas, r)
      expect(fx.state).toBe('running')
      expect(r.draws).toHaveLength(1)
      fx.destroy()
      expect(e.pendingFrames()).toBe(0)
    } finally {
      Object.assign(g, saved)
    }
  })

  it('ignores a matchMedia without addEventListener (old Safari)', () => {
    const e = setup()
    const g = globalThis as Record<string, unknown>
    const saved = g.matchMedia
    g.matchMedia = () => ({ matches: false })
    try {
      const { root, canvas } = stage()
      const fx = mountFx(root, canvas, recorder())
      e.intersect(true)
      expect(fx.state).toBe('running')
      fx.destroy()
    } finally {
      g.matchMedia = saved
    }
  })
})

describe('mountFx: WebGL', () => {
  type Gl = WebGLRenderingContext
  const loseContext = (e: FxEnv, canvas: HTMLCanvasElement) => {
    const gl = e.contextOf(canvas) as unknown as Gl
    return gl.getExtension('WEBGL_lose_context') as WEBGL_lose_context
  }

  it.each(['webgl', 'webgl2'] as const)(
    'sets the %s viewport instead of a 2D transform',
    (kind) => {
      const e = setup({ dpr: 2 })
      const { root, canvas } = stage()
      const r = recorder<Gl>()
      const fx = mountFx<FxContextKind>(root, canvas, r, { context: kind })
      expect(r.setup).toHaveBeenCalledWith(e.contextOf(canvas))
      expect(e.callsTo('viewport')).toEqual([[0, 0, 600, 300]])
      expect(e.callsTo('setTransform')).toEqual([])
      fx.destroy()
    },
  )

  it('stops on context loss and rebuilds on restore', () => {
    const e = setup()
    const { root, canvas } = stage()
    const r = recorder<Gl>()
    const fx = mountFx(root, canvas, r, { context: 'webgl' })
    e.intersect(true)
    let prevented = false
    canvas.addEventListener('webglcontextlost', (event) => {
      prevented = event.defaultPrevented
    })
    const ext = loseContext(e, canvas)
    ext.loseContext()
    expect(prevented).toBe(true)
    expect(fx.state).toBe('lost')
    expect(root.dataset.state).toBe('lost')
    expect(e.pendingFrames()).toBe(0)
    e.resize(canvas, 200, 100) // resized while lost: nothing is drawn
    expect(r.draws).toHaveLength(1)
    ext.restoreContext()
    expect(r.setup).toHaveBeenCalledTimes(2)
    expect(r.theme).toHaveBeenCalledTimes(2)
    expect(e.callsTo('viewport').at(-1)).toEqual([0, 0, 200, 100])
    expect(r.draws).toHaveLength(2)
    expect(fx.state).toBe('running')
    fx.destroy()
  })

  it('stays `off` across a restore once the renderer has failed', () => {
    const e = setup()
    const error = spyOn(console, 'error').mockImplementation(() => {})
    const { root, canvas } = stage()
    const r = recorder<Gl>((f) => {
      if (f.dt > 0) throw new Error('boom')
    })
    const fx = mountFx(root, canvas, r, { context: 'webgl' })
    e.intersect(true)
    e.frame(0)
    e.frame(16)
    expect(fx.state).toBe('off')
    const ext = loseContext(e, canvas)
    ext.loseContext()
    ext.restoreContext()
    expect(fx.state).toBe('off')
    expect(r.setup).toHaveBeenCalledTimes(1)
    fx.destroy()
    error.mockRestore()
  })

  it('reports `off` when setup fails after a restore', () => {
    const e = setup()
    const { root, canvas } = stage()
    const r = recorder<Gl>()
    const fx = mountFx(root, canvas, r, { context: 'webgl' })
    e.intersect(true)
    const ext = loseContext(e, canvas)
    ext.loseContext()
    r.setup.mockImplementation(() => false)
    ext.restoreContext()
    expect(fx.state).toBe('off')
    expect(e.pendingFrames()).toBe(0)
    fx.destroy()
    expect(r.dispose).toHaveBeenCalledTimes(1)
  })
})

describe('mountLoop (DOM/SVG effects)', () => {
  /** A ticker that records every clock it is given; `settle` decides what tick returns. */
  function ticker(settle: (clock: FxClock) => boolean | undefined = () => undefined) {
    const ticks: FxClock[] = []
    return {
      ticks,
      tick: mock((clock: Readonly<FxClock>) => {
        ticks.push({ ...clock })
        return settle(clock)
      }),
      dispose: mock(() => {}),
    }
  }
  const el = () => {
    const root = document.createElement('div')
    document.body.append(root)
    return root
  }

  it('paints once at mount, then ticks while on screen', () => {
    const e = setup()
    const root = el()
    const t = ticker()
    const fx = mountLoop(root, t)
    expect(t.ticks).toEqual([{ dt: 0, time: 0, still: false }])
    expect(fx.state).toBe('paused')
    expect(e.pendingFrames()).toBe(0)
    e.intersect(true)
    expect(root.dataset.state).toBe('running')
    e.frame(100)
    e.frame(116)
    expect(t.ticks.map((c) => c.dt)).toEqual([0, 0, 0.016])
    fx.destroy()
    expect(t.dispose).toHaveBeenCalledTimes(1)
    expect(e.pendingFrames()).toBe(0)
    expect(root.hasAttribute('data-state')).toBe(false)
  })

  it('sleeps once settled (no frames, still running) and wakes on demand', () => {
    const e = setup()
    const root = el()
    let moving = true
    const t = ticker(() => moving)
    const fx = mountLoop(root, t)
    e.intersect(true)
    e.frame(0)
    moving = false
    e.frame(16)
    expect(fx.state).toBe('running')
    expect(e.pendingFrames()).toBe(0)
    e.frame(32) // nothing pending: nothing runs
    expect(t.ticks).toHaveLength(3)
    moving = true
    fx.wake()
    expect(e.pendingFrames()).toBe(1)
    e.frame(500)
    expect(t.ticks.at(-1)?.dt).toBe(0) // a wake never jumps
    fx.wake() // already awake: no second frame request
    expect(e.pendingFrames()).toBe(1)
    fx.destroy()
  })

  it('ignores wake() while paused, and restarts a settled effect on resume', () => {
    const e = setup()
    const root = el()
    const t = ticker(() => false)
    const fx = mountLoop(root, t)
    fx.wake()
    expect(e.pendingFrames()).toBe(0)
    e.intersect(true)
    e.frame(0) // settles at once
    expect(e.pendingFrames()).toBe(0)
    e.hide(true)
    e.hide(false) // a resume always gives the effect a frame
    expect(e.pendingFrames()).toBe(1)
    fx.destroy()
  })

  it('paints the still frame under reduced motion and never ticks', () => {
    const e = setup({ reducedMotion: true })
    const root = el()
    const t = ticker()
    const fx = mountLoop(root, t)
    e.intersect(true)
    expect(fx.state).toBe('still')
    expect(t.ticks).toEqual([{ dt: 0, time: 0, still: true }])
    expect(e.pendingFrames()).toBe(0)
    fx.wake()
    expect(e.pendingFrames()).toBe(0)
    fx.destroy()
  })

  it('turns a throwing tick into `off`', () => {
    const e = setup()
    const error = spyOn(console, 'error').mockImplementation(() => {})
    const root = el()
    const t = ticker((c) => {
      if (c.dt > 0) throw new Error('boom')
      return true
    })
    const fx = mountLoop(root, t)
    e.intersect(true)
    e.frame(0)
    e.frame(16)
    expect(fx.state).toBe('off')
    expect(e.pendingFrames()).toBe(0)
    fx.setPaused(true) // an `off` effect ignores later changes
    expect(fx.state).toBe('off')
    fx.destroy()
    error.mockRestore()
  })

  it('survives a StrictMode-style mount, destroy, remount', () => {
    const e = setup()
    const root = el()
    const first = ticker()
    mountLoop(root, first, { paused: true }).destroy()
    const second = ticker()
    const states: FxState[] = []
    const fx = mountLoop(root, second, { onState: (s) => states.push(s) })
    e.intersect(true)
    e.frame(16)
    expect(first.ticks).toHaveLength(1)
    expect(second.ticks).toHaveLength(2)
    expect(states).toEqual(['paused', 'running'])
    fx.destroy()
    expect(e.pendingFrames()).toBe(0)
  })
})
