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
} from './flow-field.sim'
import { flowFieldStyles } from './flow-field.styles'

/** Steps that rebuild the trails after a resize (and before the first frame). */
const WARM_STEPS = 60
/** Steps the reduced-motion still frame is pre-advanced from the seeded opening. */
const STILL_STEPS = 120
/** The glow canvas renders at this fraction of the CSS size, then CSS blurs and scales it. */
const GLOW_SCALE = 3
/**
 * WebKit rounds each small-alpha fade to the nearest level, so on its canvas the trails stall about
 * ten levels above black and leave a grey haze. On a black stage, a color-burn with near-white
 * (a blend operand, not a palette color) every few steps lowers dark pixels by about one level and
 * leaves bright ones untouched, so every engine fades to true black.
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
      let width = 0
      let height = 0
      let stale = true
      let stage = '0,0,0'
      let black = true
      let steps = 0
      let styles: string[] = []
      // The props the current still frame was drawn with (null: the last frame was not still).
      let still: LiveProps | null = null

      const count = () => particleCount(width, height, live.current.density)

      const fill = (ctx: CanvasRenderingContext2D, alpha: number) => {
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = `rgba(${stage},${alpha})`
        ctx.fillRect(0, 0, width, height)
      }

      // One step: fade the old trails toward the stage, then stroke each bucket additively.
      const step = (ctx: CanvasRenderingContext2D, dt: number) => {
        fill(ctx, flow.step(dt, target()))
        if (black && ++steps % BURN_EVERY === 0) {
          ctx.globalCompositeOperation = 'color-burn'
          ctx.fillStyle = BURN
          ctx.fillRect(0, 0, width, height)
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

      // Repaint from an opaque stage, `depth` frames deep (butt caps: round ones bead the trails).
      const rebuild = (ctx: CanvasRenderingContext2D, depth: number) => {
        fill(ctx, 1)
        steps = 0 // the same burn cadence every time: the still frame stays reproducible
        for (let i = 0; i < depth; i++) step(ctx, 1)
        copyGlow(ctx)
        stale = false
      }

      const drawStill = (ctx: CanvasRenderingContext2D) => {
        flow = createFlow(FLOW_SEED)
        flow.resize(width, height, count())
        flow.energy = target()
        still = { ...live.current }
        rebuild(ctx, STILL_STEPS)
      }

      restill.current = (next) => {
        if (main && still && (still.calm !== next.calm || still.density !== next.density)) {
          drawStill(main)
        }
      }

      return {
        setup() {
          glowCanvas = glowRef.current
          glow = glowCanvas?.getContext('2d') ?? null
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
        },
        resize(frame) {
          width = frame.width
          height = frame.height
          flow.resize(width, height, count())
          if (glowCanvas) {
            glowCanvas.width = Math.ceil(width / GLOW_SCALE)
            glowCanvas.height = Math.ceil(height / GLOW_SCALE)
          }
          stale = true
        },
        draw(ctx, { dt, still: reduced }) {
          main = ctx
          if (reduced) return drawStill(ctx)
          still = null
          // dt = 0: hold the frame (a resume), unless a resize blanked it.
          if (dt === 0) {
            if (stale) rebuild(ctx, WARM_STEPS)
            return
          }
          flow.setCount(count())
          step(ctx, dt * 60)
          copyGlow(ctx)
        },
      }
    },
    { paused },
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
