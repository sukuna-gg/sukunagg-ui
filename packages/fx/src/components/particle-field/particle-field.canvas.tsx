'use client'

import { useEffect, useRef } from 'react'
import { cssColor } from '../../internal/color'
import { mulberry32 } from '../../internal/random'
import { useFxCanvas } from '../../internal/use-fx-canvas'
import {
  createPose,
  type Ember,
  emberCount,
  emberPalette,
  type Field,
  layoutEmbers,
  type ParticleFieldDensity,
  type ParticleFieldTone,
  type SpriteSpec,
  spriteStops,
  stepEmber,
} from './particle-field.sim'
import { particleFieldStyles } from './particle-field.styles'

// DECISION(open): one fixed seed (the mockup's), so every instance renders the same scene; no
// `seed` prop in v1 (docs/component-particle-field.md §11).
const SEED = 0x5ea5007
const SPRITE = 64

/** Props of {@link ParticleFieldCanvas}; serializable, they cross the server/client boundary. */
export interface ParticleFieldCanvasProps {
  /** Ember count multiplier. Read at mount: `ParticleField` keys the island on it. */
  density: ParticleFieldDensity
  /** Ember palette. Read at mount: `ParticleField` keys the island on it. */
  tone: ParticleFieldTone
  /** Hold the current frame. Applies live. */
  paused: boolean
}

/** Pre-render one glow sprite (a 64×64 radial gradient) so a frame is just `drawImage` calls. */
function sprite(spec: SpriteSpec): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = SPRITE
  canvas.height = SPRITE
  // A canvas that gives the stage a 2D context gives this one too; if it ever didn't, the throw
  // turns the effect `off` and the poster stays (see internal/loop.ts).
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  const glow = ctx.createRadialGradient(
    SPRITE / 2,
    SPRITE / 2,
    0,
    SPRITE / 2,
    SPRITE / 2,
    SPRITE / 2,
  )
  for (const [offset, color, alpha] of spriteStops(spec))
    glow.addColorStop(offset, `rgba(${color},${alpha})`)
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, SPRITE, SPRITE)
  return canvas
}

/**
 * The client half of `ParticleField`: a `<canvas>` on the shared fx loop (`useFxCanvas`) that
 * lifts seeded embers through the stage, plus pointer parallax on the stage root. The server
 * renders it as an empty, transparent canvas inside an `aria-hidden` layer; the loop reports
 * `data-state` on the closest `[data-sk-fx]` root and the canvas fades in once it has drawn.
 * Rendered only by `ParticleField`.
 * @internal
 */
export function ParticleFieldCanvas({ density, tone, paused }: ParticleFieldCanvasProps) {
  const pointer = useRef({ x: 0, y: 0 })
  const canvas = useFxCanvas(
    () => {
      const field: Field = {
        width: 0,
        height: 0,
        // Read once at mount: create() runs in the mount effect, after the ref is attached. A
        // runtime `dir` flip needs a remount (documented on ParticleField and in its doc §3).
        rtl: (canvas.current as HTMLCanvasElement).closest('[dir]')?.getAttribute('dir') === 'rtl',
        rand: mulberry32(SEED),
      }
      const embers: Ember[] = []
      const pose = createPose()
      let sprites: HTMLCanvasElement[] = []
      let px = 0
      let py = 0
      return {
        theme(style) {
          const tokens = {
            accent: cssColor(style, '--sk-accent', [255, 59, 78]),
            deep: cssColor(style, '--sk-accent-deep', [176, 18, 33]),
            premium: cssColor(style, '--sk-premium', [232, 220, 196]),
            gold: cssColor(style, '--sk-chart-4', [201, 128, 0]),
          }
          sprites = emberPalette(tokens, tone).map(sprite)
        },
        resize({ width, height }) {
          layoutEmbers(embers, field, width, height, emberCount(width, height, density))
        },
        draw(ctx, { width, height, dt, time, dpr }) {
          // Eased parallax: near embers lean away from the pointer (no movement when dt = 0).
          const ease = 1 - Math.exp(-dt * 2.4)
          px += (pointer.current.x - px) * ease
          py += (pointer.current.y - py) * ease
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          ctx.clearRect(0, 0, width, height)
          ctx.globalCompositeOperation = 'lighter'
          for (const ember of embers) {
            if (!stepEmber(ember, field, time, dt, px, py, pose)) continue
            const { cos, sin, width: w, height: h } = pose
            ctx.setTransform(
              cos * dpr,
              sin * dpr,
              -sin * dpr,
              cos * dpr,
              pose.x * dpr,
              pose.y * dpr,
            )
            ctx.globalAlpha = pose.alpha
            ctx.drawImage(sprites[pose.sprite] as HTMLCanvasElement, -w / 2, -h / 2, w, h)
            if (pose.next) {
              ctx.globalAlpha = pose.next
              ctx.drawImage(sprites[pose.sprite + 1] as HTMLCanvasElement, -w / 2, -h / 2, w, h)
            }
          }
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          ctx.globalAlpha = 1
        },
      }
    },
    { paused },
  )

  // Parallax target from the pointer over the whole stage (mouse and pen: a touch drag scrolls).
  useEffect(() => {
    // ParticleField always renders this island inside its `[data-sk-fx]` root.
    const root = (canvas.current as HTMLCanvasElement).closest('[data-sk-fx]') as HTMLElement
    const move = (event: PointerEvent): void => {
      if (event.pointerType === 'touch') return
      const box = root.getBoundingClientRect()
      pointer.current = {
        x: ((event.clientX - box.left) / box.width) * 2 - 1,
        y: ((event.clientY - box.top) / box.height) * 2 - 1,
      }
    }
    const leave = (): void => {
      pointer.current = { x: 0, y: 0 }
    }
    root.addEventListener('pointermove', move)
    root.addEventListener('pointerleave', leave)
    return () => {
      root.removeEventListener('pointermove', move)
      root.removeEventListener('pointerleave', leave)
    }
  }, [canvas])

  const s = particleFieldStyles()
  return (
    <div aria-hidden="true" className={s.layer()}>
      <canvas ref={canvas} className={s.canvas()} />
    </div>
  )
}
