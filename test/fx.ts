/**
 * Deterministic stand-ins for the browser APIs behind the `@sukunagg/fx` frame loop
 * (packages/fx/src/internal/loop.ts), for unit tests of the loop and of every fx island.
 *
 * happy-dom alone gives `getContext()` → null, observers that never fire, a `setImmediate` rAF and
 * no reduced-motion switch. `installFxEnv()` swaps in fakes you drive by hand:
 *
 * ```tsx
 * import { installFxEnv, type FxEnv } from '../../../../../test/fx'
 *
 * let env: FxEnv
 * beforeEach(() => { env = installFxEnv() })
 * afterEach(() => env.restore()) // unmounts Testing Library trees first, then undoes the fakes
 *
 * it('animates while on screen', () => {
 *   const { container } = render(<ParticleField />)
 *   const root = container.querySelector('[data-sk-fx]') as HTMLElement
 *   expect(root.dataset.state).toBe('paused') // no IntersectionObserver report yet
 *   env.intersect(true)
 *   expect(root.dataset.state).toBe('running')
 *   env.frame(16)
 *   env.frame(32)
 *   expect(env.callsTo('drawImage').length).toBeGreaterThan(0)
 * })
 * ```
 *
 * Every canvas has a 300×150 CSS box by default (happy-dom has no layout) and returns a fake
 * context that records every call into `env.calls`. Unknown 2D/WebGL methods are recorded no-ops;
 * WebGL enum names (`gl.ARRAY_BUFFER`) are numbers; shaders compile and programs link.
 */
import { cleanup } from '@testing-library/react'

/** One recorded context call: `['fillRect', [0, 0, 4, 4]]`. */
export type FxCall = [method: string, args: unknown[]]

/** Options for {@link installFxEnv}. */
export interface FxEnvOptions {
  /** Start with `prefers-reduced-motion: reduce` matching. Default `false`. */
  reducedMotion?: boolean
  /** `false` makes every `getContext()` return null (no canvas support). Default `true`. */
  contexts?: boolean
  /** Default CSS box of every canvas. Default 300×150. */
  size?: { width: number; height: number }
  /** `window.devicePixelRatio`. Default 1. */
  dpr?: number
}

/** The handle {@link installFxEnv} returns. */
export interface FxEnv {
  /** Every call made on any fake context, in order. */
  calls: FxCall[]
  /** The argument lists of every call to `method`. */
  callsTo(method: string): unknown[][]
  /** The fake context `canvas.getContext()` returned, if any. */
  contextOf(canvas: HTMLCanvasElement): Record<string, unknown> | undefined
  /** How many animation frames are requested and not yet run or cancelled. */
  pendingFrames(): number
  /** Run every pending animation frame with timestamp `now` (ms). */
  frame(now: number): void
  /** Report every observed element as on (`true`) or off screen to all live IntersectionObservers. */
  intersect(visible: boolean): void
  /** Give `el` a CSS box (`getBoundingClientRect`), then notify the ResizeObservers watching it. */
  resize(el: Element, width: number, height: number): void
  /** Flip `prefers-reduced-motion: reduce` and fire its `change` event. */
  reduceMotion(on: boolean): void
  /** Switch the OS color scheme and fire `change` on every `prefers-color-scheme` query. */
  colorScheme(scheme: 'dark' | 'light'): void
  /** Set `document.hidden`/`visibilityState` and fire `visibilitychange`. */
  hide(hidden: boolean): void
  /** Set `window.devicePixelRatio`. */
  setDpr(dpr: number): void
  /** Unmount Testing Library trees (so islands tear down against the fakes), then undo it all. */
  restore(): void
}

/**
 * Wait for React's passive effects to run. `expectHydrates` (test/ssr.ts) never unmounts its
 * `hydrateRoot`, and its effects run after it resolves, so an island hydrated without this would
 * mount during the NEXT test, against that test's fakes, and keep ticking. Hydrate fx islands
 * like this, so the leaked island settles as a still frame that never schedules a frame:
 *
 * ```tsx
 * it('hydrates without warnings', async () => {
 *   env = installFxEnv({ reducedMotion: true })
 *   await expectHydrates(<ParticleField />)
 *   await flushEffects()
 * })
 * ```
 */
export async function flushEffects(): Promise<void> {
  // Hydration is time-sliced by React's scheduler: the commit and its passive effects land one or
  // two macrotasks later (two on a cold module cache), so wait out a few.
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0))
}

type Global = typeof globalThis & Record<string, unknown>
const g = globalThis as Global

const rect = (width: number, height: number): DOMRect =>
  ({ x: 0, y: 0, left: 0, top: 0, width, height, right: width, bottom: height }) as DOMRect

/** Install the fakes. Call `restore()` in `afterEach`. */
export function installFxEnv(options: FxEnvOptions = {}): FxEnv {
  const calls: FxCall[] = []
  const contexts = new WeakMap<HTMLCanvasElement, { kind: string; ctx: Record<string, unknown> }>()
  const frames = new Map<number, FrameRequestCallback>()
  let nextFrame = 1
  let dpr = options.dpr ?? 1
  const size = options.size ?? { width: 300, height: 150 }

  // --- observers -----------------------------------------------------------------------------
  class FakeObserver<E> {
    static live = new Set<FakeObserver<unknown>>()
    readonly targets = new Set<Element>()
    readonly root = null
    readonly rootMargin = '0px'
    readonly thresholds = [0]
    constructor(readonly callback: (entries: E[], observer: unknown) => void) {
      FakeObserver.live.add(this as FakeObserver<unknown>)
    }
    observe(el: Element) {
      this.targets.add(el)
    }
    unobserve(el: Element) {
      this.targets.delete(el)
    }
    disconnect() {
      this.targets.clear()
      FakeObserver.live.delete(this as FakeObserver<unknown>)
    }
    takeRecords() {
      return []
    }
  }
  class FakeIO extends FakeObserver<IntersectionObserverEntry> {}
  class FakeRO extends FakeObserver<ResizeObserverEntry> {}
  const live = <T>(kind: new (...a: never[]) => T) =>
    [...FakeObserver.live].filter((o): o is FakeObserver<unknown> & T => o instanceof kind)

  // --- reduced motion ------------------------------------------------------------------------
  const motion = Object.assign(new EventTarget(), {
    matches: options.reducedMotion ?? false,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener() {},
    removeListener() {},
  })

  // --- color scheme (dark by default) --------------------------------------------------------
  let scheme: 'dark' | 'light' = 'dark'
  const schemeQueries = new Map<string, MediaQueryList>()
  const schemeQuery = (query: string): MediaQueryList => {
    let mql = schemeQueries.get(query)
    if (!mql) {
      const target = Object.assign(new EventTarget(), {
        media: query,
        onchange: null,
        addListener() {},
        removeListener() {},
      })
      // A live getter (Object.assign would copy a getter's current value instead).
      Object.defineProperty(target, 'matches', { get: () => query.includes(scheme) })
      mql = target as unknown as MediaQueryList
      schemeQueries.set(query, mql)
    }
    return mql
  }

  // --- fake contexts -------------------------------------------------------------------------
  const fakeContext = (kind: string, canvas: HTMLCanvasElement): Record<string, unknown> => {
    let lost = false
    let matrix = [1, 0, 0, 1, 0, 0]
    const gradient = () => ({ addColorStop() {} })
    const special: Record<string, (...args: never[]) => unknown> = {
      setTransform: (...m: number[]) => {
        matrix = m
      },
      getTransform: () => {
        const [a = 1, b = 0, c = 0, d = 1, e = 0, f = 0] = matrix
        return { a, b, c, d, e, f }
      },
      getImageData: (_x: number, _y: number, w: number, h: number) => ({
        width: w,
        height: h,
        data: new Uint8ClampedArray(w * h * 4),
      }),
      createLinearGradient: gradient,
      createRadialGradient: gradient,
      createConicGradient: gradient,
      createPattern: () => ({}),
      measureText: (text: string) => ({ width: text.length * 6 }),
      createShader: () => ({}),
      createProgram: () => ({}),
      createBuffer: () => ({}),
      createTexture: () => ({}),
      createFramebuffer: () => ({}),
      getShaderParameter: () => true,
      getProgramParameter: () => true,
      getUniformLocation: () => ({}),
      getAttribLocation: () => 0,
      getContextAttributes: () => ({}),
      isContextLost: () => lost,
      getExtension: (name: string) =>
        name === 'WEBGL_lose_context'
          ? {
              loseContext() {
                lost = true
                canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
              },
              restoreContext() {
                lost = false
                canvas.dispatchEvent(new Event('webglcontextrestored'))
              },
            }
          : null,
    }
    const target: Record<string, unknown> = {
      canvas,
      fillStyle: '#000000',
      strokeStyle: '#000000',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      lineWidth: 1,
      lineCap: 'butt',
      font: '10px sans-serif',
      shadowBlur: 0,
      shadowColor: 'rgba(0, 0, 0, 0)',
      filter: 'none',
      imageSmoothingEnabled: true,
    }
    if (kind !== '2d') {
      Object.defineProperty(target, 'drawingBufferWidth', { get: () => canvas.width })
      Object.defineProperty(target, 'drawingBufferHeight', { get: () => canvas.height })
    }
    let enums = 0x1000
    return new Proxy(target, {
      get(t, key) {
        if (typeof key !== 'string' || key in t) return t[key as string]
        if (/^[A-Z][A-Z0-9_]*$/.test(key)) {
          t[key] = enums++ // a WebGL enum
          return t[key]
        }
        const impl = special[key]
        const fn = (...args: unknown[]) => {
          calls.push([key, args])
          return impl?.(...(args as never[]))
        }
        t[key] = fn
        return fn
      },
    })
  }

  // --- install -------------------------------------------------------------------------------
  const proto = HTMLCanvasElement.prototype
  const saved = {
    getContext: proto.getContext,
    ownRect: Object.hasOwn(proto, 'getBoundingClientRect'),
    canvasRect: proto.getBoundingClientRect,
    raf: g.requestAnimationFrame,
    caf: g.cancelAnimationFrame,
    io: g.IntersectionObserver,
    ro: g.ResizeObserver,
    matchMedia: g.matchMedia,
    dpr: Object.getOwnPropertyDescriptor(g, 'devicePixelRatio'),
  }

  proto.getContext = function getContext(this: HTMLCanvasElement, kind: string) {
    if (options.contexts === false) return null
    const existing = contexts.get(this)
    if (existing) return existing.kind === kind ? existing.ctx : null
    const ctx = fakeContext(kind, this)
    contexts.set(this, { kind, ctx })
    return ctx
  } as unknown as typeof proto.getContext
  proto.getBoundingClientRect = () => rect(size.width, size.height)
  g.requestAnimationFrame = (cb: FrameRequestCallback) => {
    const id = nextFrame++
    frames.set(id, cb)
    return id
  }
  g.cancelAnimationFrame = (id: number) => {
    frames.delete(id)
  }
  g.IntersectionObserver = FakeIO as unknown as typeof IntersectionObserver
  g.ResizeObserver = FakeRO as unknown as typeof ResizeObserver
  g.matchMedia = (query: string) =>
    query.includes('prefers-reduced-motion')
      ? motion
      : query.includes('prefers-color-scheme')
        ? schemeQuery(query)
        : saved.matchMedia.call(g, query)
  Object.defineProperty(g, 'devicePixelRatio', { configurable: true, get: () => dpr })

  return {
    calls,
    callsTo: (method) => calls.filter(([m]) => m === method).map(([, args]) => args),
    contextOf: (canvas) => contexts.get(canvas)?.ctx,
    pendingFrames: () => frames.size,
    frame(now) {
      const batch = [...frames.values()]
      frames.clear()
      for (const cb of batch) cb(now)
    },
    intersect(visible) {
      for (const io of live(FakeIO)) {
        if (!io.targets.size) continue
        const entries = [...io.targets].map(
          (target) =>
            ({
              target,
              isIntersecting: visible,
              intersectionRatio: visible ? 1 : 0,
            }) as IntersectionObserverEntry,
        )
        io.callback(entries, io)
      }
    },
    resize(el, width, height) {
      el.getBoundingClientRect = () => rect(width, height)
      for (const ro of live(FakeRO)) {
        if (ro.targets.has(el)) ro.callback([{ target: el } as ResizeObserverEntry], ro)
      }
    },
    reduceMotion(on) {
      motion.matches = on
      motion.dispatchEvent(new Event('change'))
    },
    colorScheme(next) {
      scheme = next
      for (const mql of schemeQueries.values()) mql.dispatchEvent(new Event('change'))
    },
    hide(hidden) {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => (hidden ? 'hidden' : 'visible'),
      })
      document.dispatchEvent(new Event('visibilitychange'))
    },
    setDpr(next) {
      dpr = next
    },
    restore() {
      cleanup()
      proto.getContext = saved.getContext
      if (saved.ownRect) proto.getBoundingClientRect = saved.canvasRect
      else Reflect.deleteProperty(proto, 'getBoundingClientRect')
      g.requestAnimationFrame = saved.raf
      g.cancelAnimationFrame = saved.caf
      g.IntersectionObserver = saved.io
      g.ResizeObserver = saved.ro
      g.matchMedia = saved.matchMedia
      if (saved.dpr) Object.defineProperty(g, 'devicePixelRatio', saved.dpr)
      Reflect.deleteProperty(document, 'hidden')
      Reflect.deleteProperty(document, 'visibilityState')
      FakeObserver.live.clear()
      frames.clear()
    },
  }
}
