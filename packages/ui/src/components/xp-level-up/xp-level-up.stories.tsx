import type { Meta, StoryObj } from '@storybook/react-vite'
import { type ComponentProps, type ReactNode, useState } from 'react'
import { Button } from '../button'
import { XpLevelUp } from './index'

const meta = {
  title: 'Components/XpLevelUp',
  component: XpLevelUp,
  tags: ['autodocs'],
  args: {
    title: 'Season 07 pass',
    level: 42,
    from: 62,
    progress: 8,
    gain: (
      <>
        <b>+2,450 XP</b> · Match win
      </>
    ),
    xp: (
      <>
        <b>820</b> / 10,000 XP
      </>
    ),
  },
} satisfies Meta<typeof XpLevelUp>

export default meta
type Story = StoryObj<typeof meta>

// ---- Story chrome (not part of the component): the post-match card and the pass reward tiers.

/** The surface the effect sits on: overflow-hidden clips the glow and the sparks. */
function Stage({ size = 'md', children }: { size?: 'md' | 'sm' | 'fit'; children: ReactNode }) {
  const sizes = {
    md: 'h-80 w-135 px-6 py-5.5',
    sm: 'h-80 w-85 px-4 py-4.5',
    fit: 'w-135 px-6 py-5.5',
  }
  return (
    <div
      className={`relative max-w-full overflow-hidden rounded-lg bg-surface shadow-card ${sizes[size]}`}
    >
      {children}
    </div>
  )
}

const tile =
  'relative overflow-hidden rounded-sm bg-surface-2/70 ring-1 ring-line-soft ring-inset @max-md:last:hidden'
const pad = 'relative grid gap-1.5 px-2.75 py-2.5 @max-md:p-2.25'
// Type only: each use adds its own color, so `text-premium` never fights `text-text-faint`.
const label = 'text-[9.5px] font-medium uppercase leading-none tracking-[.14em]'
const dot =
  'before:mr-1.75 before:mb-px before:inline-block before:size-1.25 before:rounded-pill before:ring-1 before:ring-inset'
const title = 'truncate text-[12.5px] font-semibold leading-[1.1]'
// The component's public timeline utilities. Layers share one grid cell: `tint` fades a premium
// copy in place over the dim one (1.36s); `swapOut`/`swapIn` crossfade the status (1.2s / 1.36s).
const cell = '[grid-area:1/1]'
const tint = '[--sk-xp-level-up-shift:0_0] animate-xp-level-up-swap-in motion-reduce:animate-none'
const swapOut = 'opacity-0 animate-xp-level-up-swap-out motion-reduce:animate-none'
const swapIn = 'animate-xp-level-up-swap-in motion-reduce:animate-none'

interface Tier {
  n: number
  name: string
  status: 'Claimed' | 'Locked' | 'Unlocks'
}

const TIERS: Tier[] = [
  { n: 41, name: 'Fang Mark', status: 'Claimed' },
  { n: 42, name: 'Crimson Veil', status: 'Unlocks' },
  { n: 43, name: 'Bone Idol', status: 'Locked' },
  { n: 44, name: 'Ember Trail', status: 'Locked' },
]

/** The tier this level-up unlocks: it turns premium and flips "Locked" → "Unlocked" with the burst. */
function UnlockTier({ n, name }: Tier) {
  return (
    <li className={tile}>
      <span
        aria-hidden="true"
        className={`absolute inset-0 rounded-sm bg-premium/10 ring-1 ring-premium/70 ring-inset ${tint}`}
      />
      <span className={pad}>
        <span className="grid">
          <span
            aria-hidden="true"
            className={`${cell} ${label} ${dot} text-text-faint before:ring-text-faint`}
          >
            Tier {n}
          </span>
          <span
            className={`${cell} ${label} ${dot} ${tint} text-premium before:bg-premium before:ring-premium`}
          >
            Tier {n}
          </span>
        </span>
        <span className="grid">
          <span aria-hidden="true" className={`${cell} ${title} text-text-dim`}>
            {name}
          </span>
          <span className={`${cell} ${title} ${tint} text-premium`}>{name}</span>
        </span>
        <span className="grid">
          <span aria-hidden="true" className={`${cell} ${label} ${swapOut} text-text-faint`}>
            Locked
          </span>
          <span className={`${cell} ${label} ${swapIn} font-bold text-premium`}>Unlocked</span>
        </span>
      </span>
    </li>
  )
}

/**
 * Reward tiers under the card (story chrome). Tier 42 follows the burst with the component's
 * public timeline utilities (`animate-xp-level-up-swap-out` / `-swap-in`).
 */
function Tiers() {
  return (
    <ol
      aria-label="Pass rewards"
      className="m-0 grid list-none grid-cols-4 gap-2 p-0 @max-md:grid-cols-3"
    >
      {TIERS.map((t) =>
        t.status === 'Unlocks' ? (
          <UnlockTier key={t.n} {...t} />
        ) : (
          <li key={t.n} className={tile}>
            <span className={pad}>
              <span
                className={`${label} ${dot} text-text-faint before:ring-text-faint ${t.status === 'Claimed' ? 'before:bg-text-faint' : ''}`}
              >
                Tier {t.n}
              </span>
              <span className={`${title} text-text-dim`}>{t.name}</span>
              <span className={`${label} text-text-faint`}>{t.status}</span>
            </span>
          </li>
        ),
      )}
    </ol>
  )
}

type Args = ComponentProps<typeof XpLevelUp>

/** The mockup's post-match card: the component fills the stage, tiers ride along as children. */
const Card = ({ narrow, ...args }: Args & { narrow?: boolean }) => (
  <Stage size={narrow ? 'sm' : 'md'}>
    <XpLevelUp {...args} className="h-full justify-between">
      <Tiers />
    </XpLevelUp>
  </Stage>
)

// ---- Stories

export const Playground: Story = {
  render: (args) => <Card {...args} />,
}

/** A gain that doesn't cross a level: the bar fills `from` → `progress`, no burst. */
export const XpGain: Story = {
  args: {
    levelUp: false,
    from: 8,
    progress: 31,
    prelude: 'Match complete',
    gain: (
      <>
        <b>+2,300 XP</b> · Top 4
      </>
    ),
    xp: (
      <>
        <b>3,120</b> / 10,000 XP
      </>
    ),
  },
  render: (args) => (
    <Stage size="fit">
      <XpLevelUp {...args} />
    </Stage>
  ),
}

/** A 340px card: under 28rem the container query shrinks the badge and headline. */
export const Narrow: Story = {
  render: (args) => <Card {...args} narrow />,
}

function ReplayDemo(args: Args) {
  const [run, setRun] = useState(0)
  return (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
      <Card key={run} {...args} />
      <Button variant="secondary" size="sm" onClick={() => setRun((r) => r + 1)}>
        Replay
      </Button>
    </div>
  )
}

/** Replays by changing `key`: the remount restarts every keyframe. */
export const Replay: Story = {
  render: (args) => <ReplayDemo {...args} />,
}

/** Dark and light side by side, for review. */
export const Themes: Story = {
  parameters: { sideBySide: true },
  render: (args) => <Card {...args} />,
}
