'use client'

import { type PointerEvent, type ReactNode, useEffect, useRef } from 'react'
import { useFxLoop } from '../../internal/use-fx-loop'

interface HoloCardTiltProps {
  /** The scene's classes (from `holoCardStyles().scene()`). */
  className: string
  /** Hold the current frame (`HoloCard`'s `paused`): no tilt, and the CSS drift pauses too. */
  paused: boolean
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
const REST: Readonly<Vec> = { x: 0, y: 0, a: 0 }
/** Spring stiffness (rad/s): snappy while held, softer on the way back. */
const W_HELD = 14
const W_FREE = 7.5
/**
 * The largest integration step, in seconds: a longer frame is split into equal sub-steps, so the
 * spring keeps real time (and stays stable) on a slow device.
 */
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
  /** Where the pointer aims while it is over the card (`null`: not over it). */
  pointer: Vec | null
  /** Where the arrow keys aim while the card has focus (`null`: no key tilt). */
  key: Vec | null
  /** The input used last: it wins while both hold the card; letting go falls back to the other. */
  last: 'pointer' | 'key'
}

const clamp = (v: number): number => Math.max(-1, Math.min(1, v))
const zero = (v: Vec): void => {
  v.x = 0
  v.y = 0
  v.a = 0
}
/** Only a live card takes input: not under reduced motion (`still`), `paused`, or `off`. */
const live = (scene: HTMLElement): boolean => scene.dataset.state === 'running'
/** The tilt the input holds the card at, or `null` when nothing holds it (spring back to flat). */
const goal = ({ pointer, key, last }: Input): Vec | null =>
  last === 'key' ? (key ?? pointer) : (pointer ?? key)

/**
 * The client half of `HoloCard`: the scene element, on the shared fx loop (`useFxLoop`). It
 * springs `--sk-holo-card-x/-y/-a` toward the pointer or the arrow-key target and writes them on
 * its own element (never React state, so no re-render per frame), then sleeps once settled.
 * Reduced motion paints the flat state once and ignores input; `paused` holds the current tilt
 * and ignores input until resumed (letting go still counts, so a resumed card springs back).
 * Keyboard listeners go on the focusable root (`parentElement`), which the server half renders.
 * Rendered only by `HoloCard`.
 * @internal
 */
export function HoloCardTilt({ className, paused, children }: HoloCardTiltProps) {
  // Shared by the handlers and the ticker.
  const input = useRef<Input>({ pointer: null, key: null, last: 'pointer' })

  const { ref, wake } = useFxLoop<HTMLDivElement>(
    (scene) => {
      const cur: Vec = { x: 0, y: 0, a: 0 }
      const vel: Vec = { x: 0, y: 0, a: 0 }
      return {
        tick({ dt, still }) {
          const now = input.current
          if (still) {
            // Reduced motion: a flat card. Forget any input so nothing springs once it's off.
            now.pointer = null
            now.key = null
            zero(cur)
            zero(vel)
          }
          const held = goal(now)
          const target = held ?? REST
          const w = held ? W_HELD : W_FREE
          const steps = Math.ceil(dt / MAX_STEP)
          const h = steps ? dt / steps : 0
          let busy = false
          for (const k of AXES) {
            // A critically damped spring (semi-implicit Euler): it settles without wobbling.
            for (let i = 0; i < steps; i++) {
              vel[k] += (w * w * (target[k] - cur[k]) - 2 * w * vel[k]) * h
              cur[k] += vel[k] * h
            }
            if (Math.abs(target[k] - cur[k]) > 6e-4 || Math.abs(vel[k]) > 4e-3) busy = true
            else {
              cur[k] = target[k]
              vel[k] = 0
            }
            scene.style.setProperty(PROPS[k], cur[k].toFixed(4))
          }
          return busy
        },
      }
    },
    { paused },
  )

  const aim = (event: PointerEvent<HTMLDivElement>): void => {
    const scene = event.currentTarget
    if (!live(scene)) return
    const box = scene.getBoundingClientRect()
    if (!box.width || !box.height) return
    const now = input.current
    now.pointer = {
      x: clamp(((event.clientX - box.left) / box.width) * 2 - 1),
      y: clamp(((event.clientY - box.top) / box.height) * 2 - 1),
      a: 1,
    }
    now.last = 'pointer'
    wake()
  }

  // Let go of the pointer: fall back to the key tilt, if any, else spring back to flat.
  const leave = (): void => {
    input.current.pointer = null
    wake()
  }

  // The focusable element is the server-rendered root around this scene: listen there.
  useEffect(() => {
    const scene = ref.current as HTMLDivElement
    const host = scene.parentElement as HTMLElement
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.target !== host) return // keys typed inside interactive art aren't ours
      // Modified keys belong to the browser and assistive tech (Alt+← is Back, Shift+← selects).
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const now = input.current
      if (event.key === 'Escape' || event.key === 'Home') {
        if (!now.key) return // nothing to undo: Home keeps scrolling to the top
        // Home would also scroll the page: claim it only to undo a tilt. Escape bubbles on (a
        // surrounding dialog may close).
        if (event.key === 'Home') event.preventDefault()
        now.key = null
        wake()
        return
      }
      const step = DIRECTIONS[event.key]
      if (!step || !live(scene)) return
      event.preventDefault()
      // Each press nudges from where the card aims now (the last input: keys or pointer; or flat).
      const from = goal(now) ?? REST
      now.key = {
        x: clamp(from.x + step[0] * KEY_STEP),
        y: clamp(from.y + step[1] * KEY_STEP),
        a: 1,
      }
      now.last = 'key'
      wake()
    }
    const onBlur = (): void => {
      input.current.key = null
      wake()
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
