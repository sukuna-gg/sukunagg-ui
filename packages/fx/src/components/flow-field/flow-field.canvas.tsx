'use client'

import { useEffect, useRef } from 'react'
import { cssColor } from '../../internal/color'
import { useFxCanvas } from '../../internal/use-fx-canvas'
import {
  CALM_ENERGY,
  createFlow,
  FLOW_SEED,
  type Flow,
  type FlowFieldDensity,
  GROUP_WIDTH,
  LEVEL_ALPHA,
  particleCount,
  rebuildSteps,
} from './flow-field.sim'
import { flowFieldStyles } from './flow-field.styles'

/** 60 Hz frames the first paint is warmed up by (in fewer, longer steps on a large field). */
const WARM_FRAMES = 60
/** 60 Hz frames the reduced-motion still frame is pre-advanced from the seeded opening. */
const STILL_FRAMES = 120
/** After the last resize, wait this long (ms) before rebuilding the still frame at the new size. */
const STILL_SETTLE = 150
/** The glow canvas renders at this fraction of the CSS size, then CSS blurs and scales it. */
const GLOW_SCALE = 3
/**
 * Backing-store pixels per CSS pixel. Every frame fades the whole store and strokes it additively,
 * so the cost follows the store's pixels, not the particles: a full-screen field on a 2x display
 * runs at about half the frame rate of a 1x store. The trails are soft and the glow is already a
 * third of the size, so a 1x store looks the same.
 */
const MAX_DPR = 1
/**
 * Canvas colors are 8-bit: a fade too faint to move a dark pixel by half a level rounds to nothing,
 * so trail tails stall above black, and the fainter the fade, the higher they stall. A 165 Hz
 * display would fade by a third of a 60 Hz frame on every refresh and leave a grey haze. Instead
 * the fades accumulate, and the stage fill is drawn once at least this many 60 Hz frames are due:
 * every refresh rate fades, and stalls, like 60 Hz (and fills the store less often).
 */
const FADE_EVERY = 0.75
/**
 * Even at 60 Hz, WebKit's trails stall about ten levels above black. On a black stage, a
 * color-burn with near-white (a blend operand, not a palette color) every 4 60 Hz frames lowers
 * dark pixels by about one level and leaves bright ones untouched, so every engine fades to true
 * black. The cadence counts time, not steps, so the trails are as long at 165 Hz as at 60 Hz.
 */
const BURN = 'rgb(254,254,254)'
const BURN_EVERY = 4

interface LiveProps {
  density: FlowFieldDensity
  calm: boolean
}

interface FlowFieldCanvasProps extends LiveProps {
  paused: boolean
}

/**
 * The client half of `FlowField`: two canvases on the shared fx loop. The first holds the trails
 * (each frame fades it toward the stage color, then strokes the new segments additively); the
 * second is a 1/3-resolution copy that CSS blurs and screens on top as the glow. Colors come from
 * the tokens on the (always-dark) root. Under reduced motion it draws one still frame,
 * pre-advanced from the seeded opening, and redraws it when `calm` or `density` change.
 * Rendered only by `FlowField`.
 * @internal
 */
export function FlowFieldCanvas({ density, calm, paused }: FlowFieldCanvasProps) {
  const live = useRef({ density, calm })
  live.current = { density, calm }
  const glowRef = useRef<HTMLCanvasElement>(null)
  // Redraws the still frame after a prop change; set by the mounted renderer.
  const restill = useRef<((next: LiveProps) => void) | null>(null)

  const canvas = useFxCanvas(
    () => {
      const target = () => (live.current.calm ? CALM_ENERGY : 1)
      let flow: Flow = createFlow(FLOW_SEED)
      flow.energy = target()
      let glowCanvas: HTMLCanvasElement | null = null
      let glow: CanvasRenderingContext2D | null = null
      let main: CanvasRenderingContext2D | null = null
      // The old trails, copied just before the loop resizes (and so blanks) the backing store.
      let snapshot: HTMLCanvasElement | null = null
      let observer: ResizeObserver | null = null
      let width = 0
      let height = 0
      let stale = true // the trails canvas holds no painted frame
      let stage = '0,0,0'
      let black = true
      let keep = 1 // the share of the trails the fades due since the last stage fill keep
      let due = 0 // 60 Hz frames since the last stage fill
      let burn = 0 // 60 Hz frames since the last residue burn
      let styles: string[] = []
      let palette = '' // the stage and stroke colors, as read from the tokens
      let reduced = false // the canvas holds the reduced-motion still frame
      // What that still frame was drawn with ('' = redraw it): its size, props and colors.
      let stillKey = ''
      let settle: ReturnType<typeof setTimeout> | undefined // the pending still rebuild

      const count = () => particleCount(width, height, live.current.density)
      const keyOf = ({ density, calm }: LiveProps = live.current) =>
        `${width}x${height} ${density} ${calm} ${palette}`

      const fill = (ctx: CanvasRenderingContext2D, alpha: number) => {
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = `rgba(${stage},${alpha})`
        ctx.fillRect(0, 0, width, height)
      }

      // One step of `dt` 60 Hz frames: fade the old trails toward the stage (see FADE_EVERY),
      // then stroke each bucket additively.
      const step = (ctx: CanvasRenderingContext2D, dt: number) => {
        keep *= 1 - flow.step(dt, target())
        due += dt
        if (due >= FADE_EVERY) {
          fill(ctx, 1 - keep)
          keep = 1
          due = 0
        }
        burn += dt
        if (burn >= BURN_EVERY) {
          // At most one burn per step: a rebuild's longer steps leave no backlog for the loop.
          burn %= BURN_EVERY
          if (black) {
            ctx.globalCompositeOperation = 'color-burn'
            ctx.fillStyle = BURN
            ctx.fillRect(0, 0, width, height)
          }
        }
        ctx.globalCompositeOperation = 'lighter'
        flow.buckets.forEach((segments, k) => {
          if (!segments.length) return
          ctx.beginPath()
          for (let i = 0; i < segments.length; i += 4) {
            ctx.moveTo(segments[i] ?? 0, segments[i + 1] ?? 0)
            ctx.lineTo(segments[i + 2] ?? 0, segments[i + 3] ?? 0)
          }
          ctx.strokeStyle = styles[k] ?? ''
          ctx.lineWidth = GROUP_WIDTH[k >> 2] ?? 1
          ctx.stroke()
        })
      }

      const copyGlow = (ctx: CanvasRenderingContext2D) => {
        if (!glow || !glowCanvas) return
        glow.clearRect(0, 0, glowCanvas.width, glowCanvas.height)
        glow.drawImage(ctx.canvas, 0, 0, glowCanvas.width, glowCanvas.height)
      }

      // Repaint from an opaque stage, `frames` 60 Hz frames deep (butt caps: round ones bead the
      // trails). A large field covers the same time in fewer, longer steps (`rebuildSteps`), so
      // the trails look the same and the work stays within the approved stage's budget.
      const rebuild = (ctx: CanvasRenderingContext2D, frames: number) => {
        fill(ctx, 1)
        // The same fade and burn cadence every time: the still frame stays reproducible.
        keep = 1
        due = 0
        burn = 0
        const steps = rebuildSteps(count(), frames)
        for (let i = 0; i < steps; i++) step(ctx, frames / steps)
        copyGlow(ctx)
        stale = false
      }

      const drawStill = (ctx: CanvasRenderingContext2D) => {
        flow = createFlow(FLOW_SEED)
        flow.resize(width, height, count())
        flow.energy = target()
        reduced = true
        stillKey = keyOf()
        rebuild(ctx, STILL_FRAMES)
      }

      // Copy the trails before the loop's own observer resizes the canvas (see `setup`).
      const copyTrails = (trails: HTMLCanvasElement) => {
        const box = trails.getBoundingClientRect()
        if (stale || (box.width === width && box.height === height)) return
        snapshot ??= trails.ownerDocument.createElement('canvas')
        snapshot.width = trails.width
        snapshot.height = trails.height
        snapshot.getContext('2d')?.drawImage(trails, 0, 0)
      }

      const release = () => {
        if (snapshot?.width) {
          snapshot.width = 0
          snapshot.height = 0
        }
      }

      const redraw = (next?: LiveProps) => {
        if (main && reduced && !settle && stillKey !== keyOf(next)) drawStill(main)
      }
      restill.current = redraw

      return {
        setup(ctx) {
          main = ctx
          glowCanvas = glowRef.current
          glow = glowCanvas?.getContext('2d') ?? null
          // `setup` runs before the loop creates its ResizeObserver, and observers are notified in
          // creation order, so this one copies the old trails before the loop blanks the store.
          if (typeof ResizeObserver === 'function') {
            const trails = ctx.canvas
            observer = new ResizeObserver(() => copyTrails(trails))
            observer.observe(trails)
          }
        },
        theme(style) {
          const accent = cssColor(style, '--sk-accent', [255, 59, 78])
          const deep = cssColor(style, '--sk-accent-deep', [176, 18, 33])
          const premium = cssColor(style, '--sk-premium', [232, 220, 196])
          const mid = accent.map((c, i) => (c + (deep[i] ?? 0)) >> 1)
          // DECISION(open): FlowField stage color — trails fade toward --sk-well (see the styles).
          const well = cssColor(style, '--sk-well', [0, 0, 0])
          stage = well.join(',')
          black = well.every((c) => c === 0)
          styles = [deep, mid, accent, premium].flatMap((rgb) =>
            LEVEL_ALPHA.map((alpha) => `rgba(${rgb.join(',')},${alpha})`),
          )
          // Part of the still frame's key: new colors redraw it, but an OS light/dark flip, which
          // leaves this always-dark stage's tokens alone, costs nothing.
          palette = `${stage} ${styles.join(' ')}`
        },
        resize(frame) {
          width = frame.width
          height = frame.height
          flow.resize(width, height, count())
          if (glowCanvas) {
            glowCanvas.width = Math.ceil(width / GLOW_SCALE)
            glowCanvas.height = Math.ceil(height / GLOW_SCALE)
          }
          if (!main || !snapshot?.width) {
            stale = true // first paint: the next draw warms the field up
            return
          }
          // Scale the old trails onto the new store: no re-simulation, no jump forward in time.
          main.globalCompositeOperation = 'source-over'
          main.drawImage(snapshot, 0, 0, width, height)
          release()
          copyGlow(main)
          if (!reduced) return
          // A still frame is rebuilt at the new size once the resizing settles.
          clearTimeout(settle)
          settle = setTimeout(() => {
            settle = undefined
            redraw()
          }, STILL_SETTLE)
        },
        draw(ctx, { dt, still }) {
          release()
          if (still) {
            // Idempotent: a held still frame costs nothing, however often the loop asks for it.
            if (!settle && stillKey !== keyOf()) drawStill(ctx)
            return
          }
          reduced = false
          stillKey = ''
          // dt = 0: hold the frame (a resume, a resize), unless nothing is painted yet.
          if (dt === 0) {
            if (stale) rebuild(ctx, WARM_FRAMES)
            return
          }
          flow.setCount(count())
          step(ctx, dt * 60)
          copyGlow(ctx)
        },
        dispose() {
          observer?.disconnect()
          clearTimeout(settle)
          release()
          if (restill.current === redraw) restill.current = null
        },
      }
    },
    { paused, maxDpr: MAX_DPR },
  )

  useEffect(() => {
    restill.current?.({ calm, density })
  }, [calm, density])

  const s = flowFieldStyles()
  return (
    <>
      <canvas ref={canvas} className={s.canvas()} />
      <canvas ref={glowRef} className={s.glow()} />
    </>
  )
}
