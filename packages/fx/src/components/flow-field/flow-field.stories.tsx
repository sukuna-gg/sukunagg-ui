import type { Meta, StoryObj } from '@storybook/react-vite'
import { type ReactNode, useEffect, useState } from 'react'
import { cn } from '../../utils/cn'
import { FlowField, type FlowFieldProps } from './index'

/*
 * Story chrome (build brief §1): the queue UI, timer, HUD and corner brackets below are the app's,
 * not FlowField's. They reproduce the approved mockup (fx-mockups/parts/flow-field.html) so the
 * effect is reviewed in the screen it was designed for.
 */

/** The mockup's stage: 540 × 320 at most, full width below that. */
const stage = { maxWidth: 540, marginInline: 'auto' } as const

/** Corner brackets inset 12px, like a game client's HUD frame. */
function Brackets() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-3">
      <span className="absolute top-0 left-0 size-3 border-t border-l border-text/30" />
      <span className="absolute top-0 right-0 size-3 border-t border-r border-text/30" />
      <span className="absolute bottom-0 left-0 size-3 border-b border-l border-text/30" />
      <span className="absolute right-0 bottom-0 size-3 border-r border-b border-text/30" />
    </div>
  )
}

/** Whole seconds since the queue started, counted from the clock (throttled timers can't drift). */
function useQueueSeconds(searching: boolean, from: number): number {
  const [seconds, setSeconds] = useState(from)
  useEffect(() => {
    if (!searching) return
    const start = performance.now() - from * 1000
    let timer = 0
    const tick = () => {
      const ms = performance.now() - start
      setSeconds(Math.floor(ms / 1000))
      timer = window.setTimeout(tick, 1005 - (ms % 1000))
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [searching, from])
  return seconds
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * The approved mockup's queue screen. Cancel calms the field ("Ready to queue"); Find match
 * restarts the search. The timer is information, so it keeps ticking under reduced motion.
 */
function QueueScreen(props: Pick<FlowFieldProps, 'density' | 'paused'>) {
  const [searching, setSearching] = useState(true)
  const [from, setFrom] = useState(37)
  const seconds = useQueueSeconds(searching, from)
  const toggle = () => {
    setFrom(0)
    setSearching((s) => !s)
  }
  return (
    <div style={stage}>
      <FlowField {...props} calm={!searching} className="@container h-80 px-4 text-center">
        <Brackets />
        <p className="m-0 mb-3 inline-flex items-center gap-2.5 font-sans text-[10.5px] font-semibold uppercase leading-none tracking-eyebrow text-text-dim">
          {searching ? (
            <span
              aria-hidden="true"
              className="relative size-1.5 rounded-pill bg-accent shadow-[0_0_10px_var(--sk-accent-glow)] after:absolute after:inset-0 after:hidden after:rounded-pill after:border after:border-accent motion-safe:after:block motion-safe:after:animate-ping"
            />
          ) : (
            <span aria-hidden="true" className="size-1.5 rounded-pill bg-text-dim" />
          )}
          Queue · Ranked
        </p>
        <p className="m-0 font-display text-[27px] font-extrabold leading-tight tracking-tight [text-shadow:0_2px_20px_var(--sk-well)] @max-[420px]:text-xl">
          <span aria-live="polite">{searching ? 'Searching for match…' : 'Ready to queue'}</span>
          {searching && (
            <span
              role="timer"
              className="ml-[.4em] inline-block font-sans text-[.78em] font-semibold tabular-nums text-[color-mix(in_oklab,var(--sk-accent)_52%,var(--sk-text))]"
            >
              {clock(seconds)}
            </span>
          )}
        </p>
        <div
          aria-hidden="true"
          className={cn(
            'relative mt-4 mb-4.5 h-0.5 w-44 overflow-hidden rounded-pill bg-[linear-gradient(90deg,color-mix(in_oklab,var(--sk-text)_8%,transparent),color-mix(in_oklab,var(--sk-accent)_30%,transparent),color-mix(in_oklab,var(--sk-text)_8%,transparent))] drop-shadow-[0_0_4px_var(--sk-accent-glow)] transition-opacity duration-slow ease-sukuna motion-reduce:transition-none @max-[420px]:mt-3 @max-[420px]:mb-4 @max-[420px]:w-36',
            !searching && 'invisible opacity-0',
          )}
        >
          <span className="absolute inset-y-0 left-0 w-1/2 animate-indeterminate bg-[linear-gradient(90deg,transparent,var(--sk-accent)_62%,color-mix(in_oklab,var(--sk-accent)_35%,var(--sk-text))_92%,transparent)] motion-reduce:w-full motion-reduce:animate-none motion-reduce:bg-[linear-gradient(90deg,transparent,var(--sk-accent),transparent)] motion-reduce:opacity-75" />
        </div>
        <button
          type="button"
          onClick={toggle}
          className={
            searching
              ? 'cursor-pointer rounded-sm border border-text/20 bg-well/60 px-4 py-2.5 font-sans text-[10.5px] font-semibold uppercase leading-none tracking-[.16em] text-text backdrop-blur-sm transition-[border-color,box-shadow] duration-base ease-sukuna hover:border-accent/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'
              : 'cursor-pointer rounded-sm border border-transparent bg-gradient-accent px-4 py-2.5 font-sans text-[10.5px] font-semibold uppercase leading-none tracking-[.16em] text-on-accent shadow-[0_0_24px_var(--sk-accent-glow)] transition-[border-color,box-shadow] duration-base ease-sukuna focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'
          }
        >
          {searching ? 'Cancel' : 'Find match'}
        </button>
        <p className="absolute inset-x-6.5 bottom-5.5 m-0 flex justify-between gap-3 font-sans text-[10px] font-medium uppercase leading-none tracking-[.14em] text-text-dim [text-shadow:0_0_6px_var(--sk-well),0_0_2px_var(--sk-well)] @max-[420px]:tracking-[.08em]">
          <span>EU West · 18 ms</span>
          <span>Avg. wait 1:12</span>
        </p>
      </FlowField>
    </div>
  )
}

function Label({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 font-sans text-[10.5px] font-semibold uppercase tracking-eyebrow text-text-dim">
      {children}
    </p>
  )
}

const meta = {
  title: 'FX/FlowField',
  component: FlowField,
  tags: ['autodocs'],
  args: { density: 'medium', calm: false, paused: false },
  argTypes: {
    density: { control: 'inline-radio', options: ['low', 'medium', 'high'] },
  },
} satisfies Meta<typeof FlowField>

export default meta
type Story = StoryObj<typeof meta>

/** Try the controls, the reduced-motion setting and the theme toolbar (the stage stays dark). */
export const Playground: Story = {
  render: (args) => (
    <div style={stage}>
      <FlowField {...args} className="h-80 gap-2 px-4 text-center">
        <Label>Ranked · EU West</Label>
        <p className="m-0 font-display text-2xl font-extrabold tracking-tight">
          Finding your next match
        </p>
      </FlowField>
    </div>
  ),
}

/**
 * The approved mockup: a matchmaking queue over the field. Cancel calms it, Find match restarts
 * the search; the timer keeps ticking under reduced motion.
 */
export const MatchmakingQueue: Story = {
  render: (args) => <QueueScreen density={args.density} paused={args.paused} />,
  argTypes: { calm: { table: { disable: true } } },
}

/** The three densities on equal stages: the count scales with the area. */
export const Densities: Story = {
  render: (args) => (
    <div className="grid gap-4 sm:grid-cols-3">
      {(['low', 'medium', 'high'] as const).map((density) => (
        <FlowField key={density} {...args} density={density} className="h-56 rounded-lg">
          <Label>{density}</Label>
        </FlowField>
      ))}
    </div>
  ),
  argTypes: { density: { table: { disable: true } } },
}
