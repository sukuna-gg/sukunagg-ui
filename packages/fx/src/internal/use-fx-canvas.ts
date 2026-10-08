'use client'

import { type RefObject, useEffect, useRef } from 'react'
import {
  type FxContext,
  type FxContextKind,
  type FxHandle,
  type FxOptions,
  type FxRenderer,
  type FxState,
  mountFx,
} from './loop'

/** Options for {@link useFxCanvas}: the {@link mountFx} options plus how to find the root. */
export interface UseFxCanvasOptions<K extends FxContextKind = '2d'> {
  /**
   * Which context to request. Changing it remounts the effect.
   * @default '2d'
   */
  context?: K
  /** Passed to `canvas.getContext`. Read at mount only. */
  attributes?: FxOptions<K>['attributes']
  /**
   * Upper bound for the backing store's device pixel ratio. Changing it remounts the effect.
   * @default 2
   */
  maxDpr?: number
  /**
   * Hold the current frame (a consumer `paused` prop). Toggling it never remounts.
   * @default false
   */
  paused?: boolean
  /**
   * The element that is observed for visibility and receives `data-state`. Read at mount only;
   * returning `null` skips mounting.
   * @default the closest `[data-sk-fx]` ancestor of the canvas, else its parent element
   */
  root?: (canvas: HTMLCanvasElement) => HTMLElement | null
  /** Called on every state change (the latest callback is used; it may change every render). */
  onState?: (state: FxState) => void
}

/**
 * Run an effect on a canvas through the shared fx loop: attach the returned ref to a `<canvas>`.
 *
 * @remarks
 * - SSR/RSC: client-only (`'use client'`). Nothing runs during render or on the server; the
 *   effect mounts in `useEffect`, so the server HTML (the CSS poster plus an empty canvas) is
 *   what no-JS users and the first paint see.
 * - Lifecycle: `create` runs once per mount, inside the effect, and must return a fresh renderer
 *   (its own particles, buffers…). Under React StrictMode the effect mounts, is destroyed and
 *   mounts again; each mount gets its own renderer and the first one is disposed. Read props
 *   that change over time through a ref inside the renderer instead of remounting.
 * - Remounts only when `context` or `maxDpr` changes. `paused` and `onState` apply live.
 * - All the loop rules apply (see `./loop`): `data-state` on the root, off-screen/hidden pause,
 *   reduced motion = one still frame, DPR cap, theme re-read, `off` when there is no context.
 *
 * @example
 * ```tsx
 * 'use client'
 * import { useRef } from 'react'
 * import { useFxCanvas } from '../../internal/use-fx-canvas'
 *
 * export function SparkCanvas({ speed = 1, paused }: { speed?: number; paused?: boolean }) {
 *   const live = useRef({ speed })
 *   live.current = { speed }
 *   const canvas = useFxCanvas(() => {
 *     let x = 0
 *     return {
 *       draw(ctx, { width, height, dt }) {
 *         x = (x + dt * 60 * live.current.speed) % width
 *         ctx.clearRect(0, 0, width, height)
 *         ctx.fillRect(x, height / 2, 3, 3)
 *       },
 *     }
 *   }, { paused })
 *   return <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 size-full" />
 * }
 * ```
 */
export function useFxCanvas<K extends FxContextKind = '2d'>(
  create: () => FxRenderer<FxContext<K>>,
  options: UseFxCanvasOptions<K> = {},
): RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const handle = useRef<FxHandle | null>(null)
  // The latest arguments, so the mount effect can depend on `context`/`maxDpr` alone.
  const latest = useRef({ create, options })
  latest.current = { create, options }
  const { context, maxDpr, paused = false } = options

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { create: make, options: opts } = latest.current
    const root = opts.root
      ? opts.root(canvas)
      : (canvas.closest<HTMLElement>('[data-sk-fx]') ?? canvas.parentElement)
    if (!root) return
    const fx = mountFx<K>(root, canvas, make(), {
      context,
      maxDpr,
      attributes: opts.attributes,
      paused: opts.paused,
      onState: (state) => latest.current.options.onState?.(state),
    })
    handle.current = fx
    return () => {
      fx.destroy()
      handle.current = null
    }
  }, [context, maxDpr])

  useEffect(() => {
    handle.current?.setPaused(paused)
  }, [paused])

  return canvasRef
}
