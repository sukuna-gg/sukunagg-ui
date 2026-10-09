'use client'

import { type RefObject, useCallback, useEffect, useRef } from 'react'
import { type FxHandle, type FxState, type FxTicker, mountLoop } from './loop'

/** Options for {@link useFxLoop}. */
export interface UseFxLoopOptions {
  /**
   * Hold the current frame (a consumer `paused` prop). Toggling it never remounts.
   * @default false
   */
  paused?: boolean
  /** Called on every state change (the latest callback is used; it may change every render). */
  onState?: (state: FxState) => void
}

/** What {@link useFxLoop} returns. */
export interface FxLoopControls<E extends HTMLElement> {
  /** Attach to the effect's root element: it is observed for visibility and receives `data-state`. */
  ref: RefObject<E | null>
  /**
   * Request frames again after the ticker settled (`tick` returned `false`). Stable across
   * renders; a no-op before mount, after unmount, and unless the effect is `running`.
   */
  wake: () => void
}

/**
 * Run a DOM/SVG effect (no canvas) on the shared fx loop: attach `ref` to the effect's root and
 * call `wake()` from the input handlers that give it something new to do.
 *
 * @remarks
 * - SSR/RSC: client-only (`'use client'`). Nothing runs during render or on the server; the
 *   effect mounts in `useEffect`, so the server HTML (the CSS rest/poster state) is what no-JS
 *   users and the first paint see.
 * - Lifecycle: `create(root)` runs once per mount, inside the effect, and must return a fresh
 *   ticker. Under React StrictMode the effect mounts, is destroyed and mounts again; each mount
 *   gets its own ticker and the first one is disposed. Read props that change over time through
 *   a ref inside the ticker instead of remounting.
 * - The ticker paints by writing CSS custom properties or SVG attributes on elements it owns,
 *   never React-rendered text or attributes. `tick` gets `still: true` under reduced motion.
 * - All the loop rules apply (see `./loop`): `data-state` on the root, off-screen/hidden pause,
 *   reduced motion = one still frame, no frames while settled.
 *
 * @example
 * ```tsx
 * 'use client'
 * import { type ReactNode, useRef } from 'react'
 * import { useFxLoop } from '../../internal/use-fx-loop'
 *
 * export function Tilt({ children }: { children: ReactNode }) {
 *   const target = useRef(0)
 *   const { ref, wake } = useFxLoop<HTMLDivElement>((root) => {
 *     let x = 0
 *     return {
 *       tick({ dt, still }) {
 *         x = still ? 0 : x + (target.current - x) * Math.min(1, dt * 12)
 *         root.style.setProperty('--sk-tilt-x', x.toFixed(4))
 *         return Math.abs(target.current - x) > 1e-3 // false = settled
 *       },
 *     }
 *   })
 *   return (
 *     <div
 *       ref={ref}
 *       onPointerMove={(e) => {
 *         target.current = e.nativeEvent.offsetX / e.currentTarget.clientWidth - 0.5
 *         wake()
 *       }}
 *     >
 *       {children}
 *     </div>
 *   )
 * }
 * ```
 */
export function useFxLoop<E extends HTMLElement = HTMLDivElement>(
  create: (root: E) => FxTicker,
  options: UseFxLoopOptions = {},
): FxLoopControls<E> {
  const ref = useRef<E>(null)
  const handle = useRef<FxHandle | null>(null)
  // The latest arguments, so the mount effect runs once per mount.
  const latest = useRef({ create, options })
  latest.current = { create, options }
  const { paused = false } = options

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const { create: make, options: opts } = latest.current
    const fx = mountLoop(root, make(root), {
      paused: opts.paused,
      onState: (state) => latest.current.options.onState?.(state),
    })
    handle.current = fx
    return () => {
      fx.destroy()
      handle.current = null
    }
  }, [])

  useEffect(() => {
    handle.current?.setPaused(paused)
  }, [paused])

  const wake = useCallback(() => handle.current?.wake(), [])
  return { ref, wake }
}
