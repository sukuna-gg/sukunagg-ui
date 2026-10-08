import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Button } from '../button'
import { GlitchText } from './index'

// The banner type from the approved mockup. GlitchText leaves typography to the consumer.
const banner =
  'font-display text-[length:clamp(26px,10.4cqi,62px)] font-black uppercase leading-none tracking-[-0.01em] whitespace-nowrap [font-stretch:110%] @max-[400px]:text-[length:11.4cqi]'

const meta = {
  title: 'Components/GlitchText',
  component: GlitchText,
  tags: ['autodocs'],
  args: {
    as: 'h2',
    children: 'Eliminated',
    className: 'font-display text-[length:56px] font-black uppercase leading-none',
  },
} satisfies Meta<typeof GlitchText>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
      <GlitchText {...args} />
    </div>
  ),
}

// --- Killfeed: the mockup's death screen. Everything except <GlitchText> is story chrome. ---

// Chrome entrances are `starting:` transitions (no keyframes), each with a reduced-motion opt-out,
// so the screen is complete under reduced motion and replays when remounted.
const rise =
  'transition-[opacity,translate] duration-[420ms] ease-sukuna starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none'

function Crosshair() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      role="img"
      aria-label="eliminated"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="block flex-none text-text-dim transition-[rotate,scale,opacity] delay-[520ms] duration-[620ms] ease-spring starting:-rotate-90 starting:scale-[1.9] starting:opacity-0 motion-reduce:transition-none"
    >
      <circle cx="8" cy="8" r="4.75" />
      <path d="M8 .75v3.5M8 11.75v3.5M.75 8h3.5M11.75 8h3.5" />
      <circle cx="8" cy="8" r=".9" fill="currentColor" stroke="none" />
    </svg>
  )
}

function DeathScreen() {
  return (
    <section
      aria-label="Death screen"
      className="relative h-80 w-full max-w-[540px] overflow-hidden rounded-lg bg-surface text-text shadow-card @container"
    >
      {/* crimson bloom + a faint grid, masked to the middle */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_58%_44%_at_50%_47%,color-mix(in_oklab,var(--sk-accent-glow)_42%,transparent),transparent_70%)] transition-opacity duration-[900ms] ease-sukuna starting:opacity-0 motion-reduce:transition-none"
      >
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,var(--sk-line-soft)_0_1px,transparent_1px_22px),repeating-linear-gradient(90deg,var(--sk-line-soft)_0_1px,transparent_1px_22px)] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_48%,black,transparent_75%)]" />
      </div>
      {/* corner brackets */}
      <div
        aria-hidden="true"
        className="absolute inset-3 border border-text-faint opacity-50 [mask:conic-gradient(at_12px_12px,transparent_75%,black_0)_0_0/calc(100%-12px)_calc(100%-12px)]"
      />
      <div
        className={`absolute inset-x-[26px] top-[22px] flex justify-between font-sans text-[10px] font-medium uppercase leading-none tracking-eyebrow text-text-faint tabular-nums delay-[760ms] ${rise}`}
      >
        <span>Round 14</span>
        <span>02:31</span>
      </div>

      <div className="absolute inset-x-0 top-0 bottom-3.5 grid place-content-center justify-items-center gap-[13px]">
        <GlitchText as="h2" className={banner}>
          Eliminated
        </GlitchText>
        <span
          aria-hidden="true"
          className="block h-0.5 w-[min(70cqi,330px)] bg-[linear-gradient(90deg,transparent,var(--sk-accent)_22%,var(--sk-accent)_78%,transparent)] shadow-[0_0_14px_var(--sk-accent-glow)] transition-[scale,opacity] delay-[240ms] duration-[520ms] ease-sukuna starting:scale-x-0 starting:opacity-0 motion-reduce:transition-none"
        />
        <p
          className={`m-0 inline-flex items-center gap-2 whitespace-nowrap rounded-sm border border-l-2 border-line-soft border-l-accent bg-[color-mix(in_oklab,var(--sk-surface-2)_82%,transparent)] px-3 py-1.5 font-display text-md font-bold leading-[1.2] delay-[380ms] @max-[400px]:gap-1.5 @max-[400px]:px-2.5 @max-[400px]:text-[13px] ${rise}`}
        >
          <b className="font-bold text-accent">ryomen</b>
          <Crosshair />
          <b className="font-extrabold tracking-[0.02em]">KAIRO</b>
          <span
            className={`font-sans text-[10.5px] font-semibold uppercase leading-none tracking-[0.12em] text-premium delay-[700ms] ${rise}`}
          >
            &middot; headshot
          </span>
        </p>
      </div>

      <div
        className={`absolute inset-x-0 bottom-6 flex items-center justify-center gap-2.5 delay-[760ms] ${rise}`}
      >
        <span className="relative inline-flex items-center gap-2 overflow-hidden rounded-[4px] border border-[color-mix(in_oklab,var(--sk-accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--sk-accent)_9%,var(--sk-surface-2))] py-1.5 pr-[11px] pl-[9px] font-sans text-[10px] font-semibold uppercase leading-none tracking-eyebrow before:absolute before:inset-0 before:bg-[repeating-linear-gradient(180deg,color-mix(in_oklab,var(--sk-text)_7%,transparent)_0_1px,transparent_1px_3px)] before:content-[''] after:absolute after:inset-x-0 after:top-0 after:h-[70%] after:translate-y-[40%] after:bg-[linear-gradient(transparent_30%,color-mix(in_oklab,var(--sk-accent)_30%,transparent)_48%,color-mix(in_oklab,var(--sk-text)_35%,transparent)_50%,transparent_62%)] after:content-['']">
          <span
            aria-hidden="true"
            className="relative size-1.5 rounded-pill bg-accent shadow-[0_0_8px_var(--sk-accent-glow)] after:absolute after:inset-0 after:rounded-pill after:border after:border-accent after:content-[''] motion-safe:after:animate-ping"
          />
          Spectating
        </span>
        <span className="font-display text-[13px] font-semibold leading-none text-text-dim">
          ryomen
        </span>
      </div>
    </section>
  )
}

function KillfeedDemo() {
  const [run, setRun] = useState(0)
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 16 }}>
      <DeathScreen key={run} />
      <Button variant="ghost" size="sm" onClick={() => setRun((n) => n + 1)}>
        Replay
      </Button>
    </div>
  )
}

/** The approved mockup: an elimination banner on a game HUD. Replay remounts it with a new `key`. */
export const Killfeed: Story = {
  render: () => <KillfeedDemo />,
}

/** Typography is yours: the effect scales with the font because every offset is in `em`. */
export const Headings: Story = {
  render: () => (
    <div
      style={{ display: 'grid', gap: 28, justifyItems: 'start' }}
      className="font-display font-black uppercase leading-none"
    >
      <GlitchText as="h1" className="text-[length:64px]">
        Victory
      </GlitchText>
      <GlitchText as="h2" className="text-3xl">
        Match found
      </GlitchText>
      <GlitchText as="h3" className="text-2xl">
        Round lost
      </GlitchText>
      <p className="m-0 font-sans text-lg font-semibold normal-case leading-normal text-text-dim">
        Your squad was <GlitchText className="font-bold text-text">wiped</GlitchText> in round 14.
      </p>
    </div>
  ),
}

/** `scanline` fills the glyphs with a static CRT line texture (kept under reduced motion). */
export const Scanline: Story = {
  render: () => (
    <div
      className="grid place-items-center gap-2 rounded-lg bg-surface bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,color-mix(in_oklab,var(--sk-accent-glow)_28%,transparent),transparent_70%)] px-6 py-14 shadow-card"
      style={{ maxWidth: 540 }}
    >
      <GlitchText
        as="h2"
        scanline
        className="font-display text-[length:56px] font-black uppercase leading-none"
      >
        Signal lost
      </GlitchText>
      <p className="m-0 font-sans text-sm uppercase tracking-eyebrow text-text-faint">
        Reconnecting to match server
      </p>
    </div>
  ),
}

const servers = [
  { region: 'EU West', ping: '18 ms', online: true },
  { region: 'NA East', ping: '—', online: false },
  { region: 'Asia', ping: '142 ms', online: true },
] as const

/** `intro={false}` for always-on labels: no wipe, the loop just runs. */
export const NoIntro: Story = {
  render: () => (
    <ul className="m-0 grid max-w-sm list-none gap-0 rounded-md border border-line bg-surface p-0">
      {servers.map((s) => (
        <li
          key={s.region}
          className="flex items-center justify-between border-b border-line-soft px-4 py-3 font-sans text-md last:border-b-0"
        >
          <span className="font-semibold">{s.region}</span>
          <span className="flex items-center gap-3 tabular-nums text-text-dim">
            {s.ping}
            {s.online ? (
              <span className="inline-block rounded-sm border border-success/40 bg-success/10 px-2 py-1 text-xs font-bold uppercase leading-none tracking-eyebrow text-success">
                Online
              </span>
            ) : (
              <GlitchText
                intro={false}
                className="rounded-sm border border-danger/40 bg-danger/10 px-2 py-1 text-xs font-bold uppercase leading-none tracking-eyebrow text-danger"
              >
                Offline
              </GlitchText>
            )}
          </span>
        </li>
      ))}
    </ul>
  ),
}
