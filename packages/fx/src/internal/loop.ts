/**
 * The shared frame loop behind every `@sukunagg/fx` island (Q39), ported from the approved
 * mockup's `mountFx` (fx-mockups/parts/particle-field.html) and hardened for production.
 *
 * Two entry points share one engine:
 * - `mountFx(root, canvas, renderer)` for canvas effects (Canvas 2D, WebGL): sizing, DPR cap,
 *   theme colors, WebGL context loss, on top of everything below.
 * - `mountLoop(root, ticker)` for DOM/SVG effects that animate without a canvas (a spring-driven
 *   tilt, travelling SVG beams).
 *
 * The engine owns everything an effect would otherwise re-implement:
 * - **One `requestAnimationFrame` for the whole page**, shared by every running effect and
 *   cancelled as soon as none needs a frame, so an idle page schedules nothing. A DOM effect that
 *   has settled returns `false` from `tick` and sleeps until `wake()`.
 * - **Pausing** while the root is off-screen (`IntersectionObserver`), while the tab is hidden
 *   (`visibilitychange`), and on demand (`setPaused`).
 * - **Reduced motion**: one still frame (`still: true`) instead of a loop, switching live when the
 *   OS setting changes (`matchMedia(...)` `change`).
 * - **State on the DOM**: `data-state` on the root, see {@link FxState}.
 *
 * `mountFx` adds:
 * - **Sizing**: the backing store follows the canvas's CSS box (`ResizeObserver`) at the device
 *   pixel ratio, capped at 2 by default (a 3x phone fills 2.25x fewer pixels for no visible loss).
 * - **Theme**: the renderer re-reads its colors when the nearest `[data-theme]` changes, and when
 *   the OS color scheme flips (`data-theme="system"` themes by media query).
 * - **WebGL context loss**: stop, report `lost`, run `setup` again on restore.
 *
 * Framework-free and SSR-safe: nothing here touches `window` or `document` until a mount runs
 * (from an effect). React islands use `useFxCanvas` / `useFxLoop`. A missing context (no WebGL,
 * happy-dom) or an effect hook that throws never throws out of here: the effect reports `off` and
 * the server-rendered CSS poster stays.
 */

/**
 * What an effect's loop is doing. Mirrored on its root element as `data-state`, which the loop
 * owns (components must not render a `data-state` of their own on that element).
 *
 * - `running`: live. Frames are requested every display refresh while the effect moves; a DOM
 *   effect that has settled (`tick` returned `false`) requests none until `wake()`.
 * - `paused`: holding the last frame (off-screen, hidden tab, or `setPaused(true)`).
 * - `still`: `prefers-reduced-motion: reduce`; one still frame, repainted only on resize/theme.
 * - `lost`: the WebGL context was lost; resumes on `webglcontextrestored`.
 * - `off`: no usable context, or an effect hook threw; nothing is drawn, the CSS poster stays.
 *
 * `running`, `paused` and `still` all mean the effect has painted a frame.
 */
export type FxState = 'running' | 'paused' | 'still' | 'lost' | 'off'

/**
 * Timing for one frame, passed to {@link FxTicker.tick} (and, extended, to
 * {@link FxRenderer.draw}). The loop reuses one object per effect: read it, don't keep it.
 */
export interface FxClock {
  /**
   * Seconds since the previous frame, clamped to 0.05 so a stalled tab can't make the scene jump.
   * `0` means "repaint the current state without advancing it" (first frame, resize, theme change,
   * reduced motion, first frame after a resume), so an effect only moves things when `dt > 0`.
   */
  dt: number
  /** Animated seconds so far: the sum of every `dt`. */
  time: number
  /**
   * `true` for the reduced-motion still frame (state `still`): paint the effect's final or most
   * representative state (a lit winner path, a settled card), never a mid-animation one.
   */
  still: boolean
}

/** The canvas context kinds `mountFx` can drive. */
export type FxContextKind = '2d' | 'webgl' | 'webgl2'

/** The rendering context type for a {@link FxContextKind}. */
export type FxContext<K extends FxContextKind> = K extends 'webgl2'
  ? WebGL2RenderingContext
  : K extends 'webgl'
    ? WebGLRenderingContext
    : CanvasRenderingContext2D

/**
 * One canvas frame's geometry and timing, passed to {@link FxRenderer.draw} and
 * {@link FxRenderer.resize}. The loop reuses one object per effect: read it, don't keep it.
 */
export interface FxFrame extends FxClock {
  /** Canvas width in CSS pixels. */
  width: number
  /** Canvas height in CSS pixels. */
  height: number
  /** Backing-store pixels per CSS pixel: `devicePixelRatio`, capped by `maxDpr`. */
  dpr: number
}

/**
 * A canvas effect: what `mountFx` calls, and when. Only `draw` is required. For a 2D context the
 * loop has already applied `setTransform(dpr, …)`, so `draw` works in CSS pixels; for WebGL it has
 * set `viewport` to the full backing store.
 */
export interface FxRenderer<C> {
  /**
   * Create GPU/canvas resources. Called once at mount, and again after a WebGL context restore.
   * Return `false` when the effect can't run (a missing extension, a shader that won't compile):
   * the loop reports `off` and the poster stays.
   */
  setup?(ctx: C): unknown
  /**
   * Read colors from the root's computed style (`style.getPropertyValue('--sk-accent')`; see
   * `cssColor` in `./color`). Called at mount, whenever the nearest `[data-theme]` changes and
   * when the OS color scheme flips; a still or paused effect is redrawn right after.
   */
  theme?(style: CSSStyleDeclaration): void
  /** The canvas changed size. Re-layout here; a `draw` with `dt = 0` follows immediately. */
  resize?(frame: Readonly<FxFrame>): void
  /**
   * Draw one frame. Advance the simulation by `frame.dt` seconds (none when it is 0); with
   * `frame.still`, draw the reduced-motion still frame. Canvas effects animate continuously while
   * `running` (a settling DOM effect uses `mountLoop`).
   */
  draw(ctx: C, frame: Readonly<FxFrame>): void
  /** Release resources (WebGL buffers, programs). Called once, on `destroy()`. */
  dispose?(): void
}

/**
 * A DOM/SVG effect: what `mountLoop` calls. It paints by writing to elements it owns (CSS custom
 * properties, SVG attributes), never to React-rendered text or attributes.
 */
export interface FxTicker {
  /**
   * Paint one frame. Called once at mount (`dt = 0`), on every frame while running, and once with
   * `still: true` under reduced motion. Return `false` once settled: no frames are requested
   * until `wake()` (a pointer move, a key press).
   */
  tick(clock: Readonly<FxClock>): boolean | undefined
  /** Release resources. Called once, on `destroy()`. */
  dispose?(): void
}

/** Options shared by {@link mountLoop} and {@link mountFx}. */
export interface FxLoopOptions {
  /**
   * Start paused (as if `setPaused(true)` were called right away).
   * @default false
   */
  paused?: boolean
  /** Called on every state change, after `data-state` is updated. */
  onState?: (state: FxState) => void
}

/** Options for {@link mountFx}. */
export interface FxOptions<K extends FxContextKind = '2d'> extends FxLoopOptions {
  /**
   * Which context to request from the canvas.
   * @default '2d'
   */
  context?: K
  /** Passed to `canvas.getContext` (e.g. `{ alpha: true }`, `{ premultipliedAlpha: false }`). */
  attributes?: CanvasRenderingContext2DSettings | WebGLContextAttributes
  /**
   * Upper bound for the device pixel ratio of the backing store.
   * @default 2
   */
  maxDpr?: number
}

/** What {@link mountFx} and {@link mountLoop} return. */
export interface FxHandle {
  /** The current state (also on the root as `data-state`). */
  readonly state: FxState
  /** Pause or resume on demand, on top of the automatic off-screen/hidden/reduced-motion rules. */
  setPaused(paused: boolean): void
  /**
   * Request frames again after a `mountLoop` ticker settled (`tick` returned `false`). Call it
   * from the input handler that gives the effect something new to do. A no-op unless `running`
   * and settled (and always for `mountFx`, whose canvas never settles).
   */
  wake(): void
  /**
   * Stop for good: leave the shared frame, disconnect observers, remove listeners and
   * `data-state`, then call `dispose`. Safe to call more than once, and a later mount on the same
   * element starts clean (React StrictMode mounts, unmounts and remounts).
   */
  destroy(): void
}

const MAX_DT = 0.05
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
const COLOR_SCHEME = '(prefers-color-scheme: dark)'

// --- The page-wide ticker ------------------------------------------------------------------
// One rAF drives every running effect; it is requested lazily (never at import, so server and
// prerender builds can load this module) and cancelled when the last effect stops.

const ticking = new Set<FrameRequestCallback>()
let frameId = 0

function pump(now: number): void {
  frameId = 0
  // Snapshot: a callback may stop itself or start another effect during this frame.
  for (const step of [...ticking]) if (ticking.has(step)) step(now)
  if (ticking.size && !frameId) frameId = requestAnimationFrame(pump)
}

function startTicking(step: FrameRequestCallback): void {
  ticking.add(step)
  if (!frameId) frameId = requestAnimationFrame(pump)
}

function stopTicking(step: FrameRequestCallback): void {
  ticking.delete(step)
  if (!ticking.size && frameId) {
    cancelAnimationFrame(frameId)
    frameId = 0
  }
}

// --- The engine shared by mountFx and mountLoop ----------------------------------------------

interface Engine {
  readonly handle: FxHandle
  /** The current state; undefined until the first `sync()`. */
  state(): FxState | undefined
  /** Re-evaluate the state after an input changed (visibility, motion, pause, context loss). */
  sync(): void
  /** Stop for good (until destroy): `off`. */
  off(): void
  /** Call an effect hook; one that throws turns the effect `off` and returns `false`. */
  run(hook: () => unknown): unknown
  /** Paint the current state once (`dt = 0`), unless the effect is `off` or `lost`. */
  paint(): void
  /** Mark the WebGL context lost or restored (then `sync()`). */
  setLost(lost: boolean): void
  /** Add an event listener that `destroy()` removes. */
  listen(target: EventTarget, type: string, fn: (event: Event) => void): void
  /** Run `fn` on `destroy()`. */
  onDestroy(fn: () => void): void
  /** Observe visibility, the tab and the motion setting, then settle the first state. */
  start(): void
}

/**
 * Build the engine around `clock` (mutated in place: `dt`, `time`, `still`) and `frame`, the
 * effect's paint for the current clock. Nothing is observed until `start()`.
 */
function engine(
  root: HTMLElement,
  clock: FxClock,
  frame: () => unknown,
  options: FxLoopOptions,
  dispose: () => void,
): Engine {
  let state: FxState | undefined
  let dead = false
  let paused = options.paused ?? false
  let onScreen = typeof IntersectionObserver !== 'function' // no observer → assume visible
  let lost = false
  let idle = false // running, but settled: no frames until wake()
  let last: number | undefined // previous frame's timestamp; undefined = first frame after a start
  const cleanups: (() => void)[] = []
  const motion = typeof matchMedia === 'function' ? matchMedia(REDUCED_MOTION) : undefined

  function set(next: FxState): void {
    if (next === state) return
    state = next
    root.setAttribute('data-state', next)
    options.onState?.(next)
  }

  function off(): void {
    stopTicking(step)
    set('off')
  }

  function run(hook: () => unknown): unknown {
    try {
      return hook()
    } catch (error) {
      console.error('[@sukunagg/fx] the effect threw and was stopped:', error)
      off()
      return false
    }
  }

  function advance(dt: number): unknown {
    if (lost || state === 'off') return undefined
    clock.dt = dt
    clock.time += dt
    clock.still = motion?.matches ?? false
    return run(frame)
  }

  function step(now: number): void {
    const dt = last === undefined ? 0 : Math.min(Math.max((now - last) / 1000, 0), MAX_DT)
    last = now
    if (advance(dt) === false && state === 'running') {
      stopTicking(step)
      idle = true
    }
  }

  function tick(): void {
    idle = false
    last = undefined
    startTicking(step)
  }

  function sync(): void {
    if (dead || state === 'off') return
    const next: FxState = lost
      ? 'lost'
      : motion?.matches
        ? 'still'
        : paused || !onScreen || document.hidden
          ? 'paused'
          : 'running'
    const prev = state
    if (next !== 'running') stopTicking(step)
    else if (prev !== 'running') tick()
    set(next)
    // Entering reduced motion from a painted, moving state: repaint as the still frame.
    if (next === 'still' && (prev === 'running' || prev === 'paused')) advance(0)
  }

  const handle: FxHandle = {
    get state() {
      return state ?? 'off'
    },
    setPaused(next) {
      paused = next
      sync()
    },
    wake() {
      if (state === 'running' && idle) tick()
    },
    destroy() {
      if (dead) return
      dead = true
      stopTicking(step)
      for (const cleanup of cleanups) cleanup()
      dispose()
      root.removeAttribute('data-state')
    },
  }

  const listen = (target: EventTarget, type: string, fn: (event: Event) => void): void => {
    target.addEventListener(type, fn)
    cleanups.push(() => target.removeEventListener(type, fn))
  }

  return {
    handle,
    state: () => state,
    sync,
    off,
    run,
    paint: () => void advance(0),
    setLost(next) {
      lost = next
      sync()
    },
    listen,
    onDestroy: (fn) => void cleanups.push(fn),
    start() {
      if (typeof IntersectionObserver === 'function') {
        const io = new IntersectionObserver((entries) => {
          onScreen = entries.at(-1)?.isIntersecting ?? onScreen
          sync()
        })
        io.observe(root)
        cleanups.push(() => io.disconnect())
      }
      listen(document, 'visibilitychange', sync)
      if (motion?.addEventListener) listen(motion, 'change', sync)
      sync()
    },
  }
}

// --- DOM/SVG effects -------------------------------------------------------------------------

/**
 * Run a DOM/SVG effect on the shared loop, and keep it running, paused or still as the page
 * changes. Call it from an effect (never during render) and call `destroy()` in the cleanup.
 *
 * @remarks
 * - SSR: never call on the server. The module itself is safe to import there.
 * - `root` is observed for visibility and receives `data-state`.
 * - The ticker paints once at mount (`dt = 0`, `still` under reduced motion), then on every frame
 *   while running. Return `false` from `tick` once settled and call `wake()` on new input, so a
 *   resting effect schedules no frames.
 * - Reduced motion wins over pause: an off-screen effect under reduced motion reports `still`.
 *
 * @example
 * ```ts
 * let tilt = 0
 * let target = 0
 * const fx = mountLoop(card, {
 *   tick({ dt, still }) {
 *     tilt = still ? 0 : tilt + (target - tilt) * Math.min(1, dt * 12)
 *     card.style.setProperty('--sk-holo-card-x', tilt.toFixed(4))
 *     return Math.abs(target - tilt) > 1e-3 // false = settled: sleep until wake()
 *   },
 * })
 * card.addEventListener('pointermove', (e) => {
 *   target = e.offsetX / card.clientWidth - 0.5
 *   fx.wake()
 * })
 * // later
 * fx.destroy()
 * ```
 */
export function mountLoop(
  root: HTMLElement,
  ticker: FxTicker,
  options: FxLoopOptions = {},
): FxHandle {
  const clock: FxClock = { dt: 0, time: 0, still: false }
  const fx = engine(
    root,
    clock,
    () => ticker.tick(clock),
    options,
    () => ticker.dispose?.(),
  )
  fx.paint()
  fx.start()
  return fx.handle
}

// --- Canvas effects --------------------------------------------------------------------------

/**
 * Mount an effect on a canvas inside `root`, and keep it running, paused or still as the page
 * changes. Call it from an effect (never during render) and call `destroy()` in the cleanup.
 *
 * @remarks
 * - SSR: never call on the server. The module itself is safe to import there.
 * - `root` is observed for visibility and receives `data-state`; `canvas` is observed for size.
 * - Reduced motion wins over pause: an off-screen effect under reduced motion reports `still`.
 * - No context (no WebGL, happy-dom), a `setup` returning `false`, or any renderer hook throwing
 *   reports `off`: nothing is drawn and the server-rendered poster stays.
 *
 * @example
 * ```ts
 * const fx = mountFx(root, canvas, {
 *   theme(style) { color = cssColor(style, '--sk-accent', [255, 59, 78]) },
 *   draw(ctx, { width, height, dt }) {
 *     x = (x + dt * 40) % width
 *     ctx.clearRect(0, 0, width, height)
 *     ctx.fillStyle = `rgb(${color})`
 *     ctx.fillRect(x, height / 2, 4, 4)
 *   },
 * })
 * // later
 * fx.destroy()
 * ```
 */
export function mountFx<K extends FxContextKind = '2d'>(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  renderer: FxRenderer<FxContext<K>>,
  options: FxOptions<K> = {},
): FxHandle {
  const kind: FxContextKind = options.context ?? '2d'
  const getContext = canvas.getContext as (id: string, attrs?: unknown) => RenderingContext | null
  const ctx = getContext.call(canvas, kind, options.attributes) as FxContext<K> | null
  const maxDpr = options.maxDpr ?? 2
  const frame: FxFrame = { width: 0, height: 0, dpr: 1, dt: 0, time: 0, still: false }

  const fx = engine(
    root,
    frame,
    // An empty canvas has nothing to draw; ctx is non-null whenever the engine is started.
    () => {
      if (frame.width && frame.height) renderer.draw(ctx as FxContext<K>, frame)
    },
    options,
    () => renderer.dispose?.(),
  )

  if (!ctx || fx.run(() => renderer.setup?.(ctx)) === false) {
    fx.off()
    return fx.handle
  }

  // Colors come from the root's computed style; a still or paused canvas is redrawn with them at
  // once, a running one picks them up on its next frame.
  const theme = (): void => {
    if (fx.state() === 'off') return
    fx.run(() => renderer.theme?.(getComputedStyle(root)))
    if (fx.state() !== 'running') fx.paint()
  }

  // A new backing store is blank, so every real size change redraws at once (ResizeObserver runs
  // after rAF and before paint, so the blank canvas is never shown).
  const resize = (): void => {
    if (fx.state() === 'off') return
    const box = canvas.getBoundingClientRect()
    const dpr = Math.min(globalThis.devicePixelRatio || 1, maxDpr)
    const bw = Math.round(box.width * dpr)
    const bh = Math.round(box.height * dpr)
    if (!bw || !bh) return
    const sameStore = bw === canvas.width && bh === canvas.height
    if (sameStore && box.width === frame.width && box.height === frame.height && dpr === frame.dpr)
      return
    if (!sameStore) {
      canvas.width = bw
      canvas.height = bh
    }
    frame.width = box.width
    frame.height = box.height
    frame.dpr = dpr
    if (kind === '2d') (ctx as CanvasRenderingContext2D).setTransform(dpr, 0, 0, dpr, 0, 0)
    else (ctx as WebGLRenderingContext).viewport(0, 0, bw, bh)
    fx.run(() => renderer.resize?.(frame))
    fx.paint()
  }

  fx.run(() => renderer.theme?.(getComputedStyle(root)))
  resize()

  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    fx.onDestroy(() => ro.disconnect())
  }
  if (typeof MutationObserver === 'function') {
    const mo = new MutationObserver(theme)
    mo.observe(root.closest('[data-theme]') ?? document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    fx.onDestroy(() => mo.disconnect())
  }
  if (typeof matchMedia === 'function') {
    // `data-theme="system"` (and any app theming by media query) changes the tokens with no
    // attribute change: re-read them when the OS color scheme flips.
    const scheme = matchMedia(COLOR_SCHEME)
    if (typeof scheme.addEventListener === 'function') fx.listen(scheme, 'change', theme)
  }
  if (kind !== '2d') {
    fx.listen(canvas, 'webglcontextlost', (event) => {
      event.preventDefault() // tells the browser we will rebuild, so it may restore the context
      fx.setLost(true)
    })
    fx.listen(canvas, 'webglcontextrestored', () => {
      if (fx.state() === 'off') return
      if (fx.run(() => renderer.setup?.(ctx)) === false) return fx.off()
      frame.width = 0 // force the resize below to re-apply the viewport and redraw
      fx.setLost(false)
      theme()
      resize()
    })
  }

  fx.start()
  return fx.handle
}
