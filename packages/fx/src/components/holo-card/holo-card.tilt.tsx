'use client'

import { type PointerEvent, type ReactNode, useEffect, useRef } from 'react'
import { useFxLoop } from '../../internal/use-fx-loop'

interface HoloCardTiltProps {
  /** The scene's classes (from `holoCardStyles().scene()`). */
  className: string
  /** The aura, floor and card, rendered by the server half. */
  children: ReactNode
}

type Axis = 'x' | 'y' | 'a'
type Vec = Record<Axis, number>

const AXES: readonly Axis[] = ['x', 'y', 'a']
/** The custom property each axis is written to (read by `holo-card.css` and by the art). */
const PROPS: Record<Axis, string> = {
  x: '--sk-holo-card-x',
  y: '--sk-holo-card-y',
  a: '--sk-holo-card-a',
}
/** Spring stiffness (rad/s): snappy while held, softer on the way back. */
const W_HELD = 14
const W_FREE = 7.5
/** The largest integration step, in seconds (the loop already clamps `dt` to 0.05). */
const MAX_STEP = 0.034
/** How far one arrow-key press moves the target, in tilt units (−1…1). */
const KEY_STEP = 0.34
const DIRECTIONS: Record<string, readonly [number, number]> = {
  ArrowUp: [0, -1],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowRight: [1, 0],
}

/** What the input asks for; the ticker chases it. */
interface Input {
  target: Vec
  /** The pointer is over the card. */
  hover: boolean
  /** The arrow keys tilted the card and it still has focus. */
  keyed: boolean
}

const clamp = (v: number): number => Math.max(-1, Math.min(1, v))
const zero = (v: Vec): void => {
  v.x = 0
  v.y = 0
  v.a = 0
}

/** Let go: spring back to flat unless the pointer or the keys still hold the card. */
function settle(now: Input, wake: () => void): void {
  if (!now.hover && !now.keyed) zero(now.target)
  wake()
}

/**
 * The client half of `HoloCard`: the scene element, on the shared fx loop (`useFxLoop`). It
 * springs `--sk-holo-card-x/-y/-a` toward the pointer or the arrow-key target and writes them on
 * its own element (never React state, so no re-render per frame), then sleeps once settled.
 * Reduced motion paints the flat state once and ignores input. Keyboard listeners go on the
 * focusable root (`parentElement`), which the server half renders. Rendered only by `HoloCard`.
 * @internal
 */
export function HoloCardTilt({ className, children }: HoloCardTiltProps) {
  // Shared by the handlers and the ticker.
  const input = useRef<Input>({ target: { x: 0, y: 0, a: 0 }, hover: false, keyed: false })

  const { ref, wake } = useFxLoop<HTMLDivElement>((scene) => {
    const cur: Vec = { x: 0, y: 0, a: 0 }
    const vel: Vec = { x: 0, y: 0, a: 0 }
    return {
      tick({ dt, still }) {
        const now = input.current
        if (still) {
          // Reduced motion: a flat card. Forget any input so nothing springs once it's off.
          now.hover = false
          now.keyed = false
          zero(now.target)
          zero(cur)
          zero(vel)
        }
        const h = Math.min(dt, MAX_STEP)
        const w = now.hover || now.keyed ? W_HELD : W_FREE
        let busy = false
        for (const k of AXES) {
          const d = now.target[k] - cur[k]
          // A critically damped spring (semi-implicit Euler): it settles without wobbling.
          vel[k] += (w * w * d - 2 * w * vel[k]) * h
          cur[k] += vel[k] * h
          if (Math.abs(d) > 6e-4 || Math.abs(vel[k]) > 4e-3) busy = true
          else {
            cur[k] = now.target[k]
            vel[k] = 0
          }
          scene.style.setProperty(PROPS[k], cur[k].toFixed(4))
        }
        return busy
      },
    }
  })

  const aim = (event: PointerEvent<HTMLDivElement>): void => {
    const scene = event.currentTarget
    if (scene.dataset.state === 'still') return
    const box = scene.getBoundingClientRect()
    if (!box.width || !box.height) return
    const now = input.current
    now.target.x = clamp(((event.clientX - box.left) / box.width) * 2 - 1)
    now.target.y = clamp(((event.clientY - box.top) / box.height) * 2 - 1)
    now.target.a = 1
    now.hover = true
    wake()
  }

  const leave = (): void => {
    input.current.hover = false
    settle(input.current, wake)
  }

  // The focusable element is the server-rendered root around this scene: listen there.
  useEffect(() => {
    const scene = ref.current as HTMLDivElement
    const host = scene.parentElement as HTMLElement
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.target !== host) return // keys typed inside interactive art aren't ours
      const now = input.current
      if (event.key === 'Escape' || event.key === 'Home') {
        if (event.key === 'Home') event.preventDefault() // it would scroll the page to the top
        now.keyed = false
        settle(now, wake)
        return
      }
      const step = DIRECTIONS[event.key]
      if (!step || scene.dataset.state === 'still') return
      event.preventDefault()
      now.keyed = true
      now.target.x = clamp(now.target.x + step[0] * KEY_STEP)
      now.target.y = clamp(now.target.y + step[1] * KEY_STEP)
      now.target.a = 1
      wake()
    }
    const onBlur = (): void => {
      input.current.keyed = false
      settle(input.current, wake)
    }
    host.addEventListener('keydown', onKeyDown)
    host.addEventListener('blur', onBlur)
    return () => {
      host.removeEventListener('keydown', onKeyDown)
      host.removeEventListener('blur', onBlur)
    }
  }, [ref, wake])

  return (
    <div
      ref={ref}
      className={className}
      onPointerEnter={aim}
      onPointerMove={aim}
      onPointerDown={aim}
      onPointerLeave={leave}
      onPointerCancel={leave}
    >
      {children}
    </div>
  )
}
