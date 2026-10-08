import type { Meta, StoryObj } from '@storybook/react-vite'
import { useRef, useState } from 'react'
import { cssColor, type Rgb } from './color'
import type { FxState } from './loop'
import { mulberry32 } from './random'
import { useFxCanvas } from './use-fx-canvas'
import { useFxLoop } from './use-fx-loop'

/*
 * Internal, not a component: the shared loop (Q39) driving a tiny reference renderer, so the loop
 * can be checked in real browsers (test/browser/fx-loop.test.ts) and copied by the effect builders
 * (packages/fx/BUILDERS.md). Story ids: fx-internals-loop--playground (a canvas on useFxCanvas)
 * and fx-internals-loop--settling (a DOM effect on useFxLoop that sleeps once settled).
 */

interface OrbitsProps {
  /** How many dots orbit (read live through a ref: changing it never remounts). */
  count: number
  /** Hold the current frame. */
  paused?: boolean
  onState?: (state: FxState) => void
}

function Orbits({ count, paused, onState }: OrbitsProps) {
  const live = useRef({ count })
  live.current = { count }
  const canvas = useFxCanvas(
    () => {
      const rand = mulberry32(7)
      const dots = Array.from({ length: 96 }, () => ({
        r: 0.15 + rand() * 0.85,
        a: rand() * Math.PI * 2,
        v: (0.15 + rand() * 0.6) * (rand() < 0.5 ? -1 : 1),
      }))
      let accent: Rgb = [255, 59, 78]
      return {
        theme(style) {
          accent = cssColor(style, '--sk-accent', accent)
        },
        draw(ctx, { width, height, dt }) {
          ctx.clearRect(0, 0, width, height)
          ctx.fillStyle = `rgb(${accent})`
          const reach = Math.min(width, height) * 0.45
          for (const dot of dots.slice(0, live.current.count)) {
            dot.a += dot.v * dt
            ctx.globalAlpha = 0.35 + 0.65 * dot.r
            ctx.beginPath()
            ctx.arc(
              width / 2 + Math.cos(dot.a) * dot.r * reach * 1.6,
              height / 2 + Math.sin(dot.a) * dot.r * reach,
              1 + dot.r * 2,
              0,
              Math.PI * 2,
            )
            ctx.fill()
          }
          ctx.globalAlpha = 1
        },
      }
    },
    { paused, onState },
  )
  return <canvas ref={canvas} className="absolute inset-0 size-full" />
}

function LoopDemo(props: Omit<OrbitsProps, 'onState'>) {
  const [state, setState] = useState<FxState | 'server'>('server')
  return (
    <div data-sk-fx="loop" className="relative h-64 overflow-hidden rounded-lg bg-well">
      {/* The decorative layer is hidden from assistive tech (not the canvas: Biome's a11y rule
          counts <canvas> as focusable). */}
      <div aria-hidden="true" className="absolute inset-0">
        <Orbits {...props} onState={setState} />
      </div>
      <p className="absolute bottom-3 left-3 m-0 font-sans text-sm tabular-nums text-text-dim">
        data-state: {state}
      </p>
    </div>
  )
}

/**
 * A DOM effect on `useFxLoop`: a dot springs toward the pointer by writing `--sk-loop-x`, then
 * settles, and the loop requests no frames until the next pointer move wakes it.
 */
function SettlingDemo() {
  const [state, setState] = useState<FxState | 'server'>('server')
  const target = useRef(0.5)
  const { ref, wake } = useFxLoop<HTMLDivElement>(
    (root) => {
      let x = target.current
      let v = 0
      return {
        tick({ dt, still }) {
          if (still) {
            x = target.current
            v = 0
          } else {
            const w = 14 // a critically damped spring, ~0.3 s to settle
            v += (w * w * (target.current - x) - 2 * w * v) * dt
            x += v * dt
          }
          root.style.setProperty('--sk-loop-x', x.toFixed(4))
          return Math.abs(target.current - x) > 1e-3 || Math.abs(v) > 1e-3
        },
      }
    },
    { onState: setState },
  )
  return (
    <div
      ref={ref}
      data-sk-fx="loop-dom"
      onPointerMove={(event) => {
        const box = event.currentTarget.getBoundingClientRect()
        target.current = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width))
        wake()
      }}
      className="relative h-32 overflow-hidden rounded-lg bg-well [--sk-loop-x:0.5]"
    >
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-[calc(var(--sk-loop-x)*100%)] size-6 -translate-1/2 rounded-full bg-accent"
      />
      <p className="absolute bottom-3 left-3 m-0 font-sans text-sm tabular-nums text-text-dim">
        data-state: {state} · move the pointer across
      </p>
    </div>
  )
}

const meta = {
  title: 'FX/Internals/Loop',
  component: LoopDemo,
  args: { count: 64, paused: false },
  argTypes: { count: { control: { type: 'range', min: 0, max: 96, step: 1 } } },
} satisfies Meta<typeof LoopDemo>

export default meta
type Story = StoryObj<typeof meta>

/** The reference renderer on the shared loop. Try the reduced-motion and theme toggles. */
export const Playground: Story = {}

/** A DOM effect on `useFxLoop` that sleeps once settled; the next pointer move wakes it. */
export const Settling: Story = {
  render: () => <SettlingDemo />,
  parameters: { controls: { disable: true } },
}
