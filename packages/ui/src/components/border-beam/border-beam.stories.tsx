import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'
import { Card } from '../card'
import { BorderBeam } from './index'

const meta = {
  title: 'Components/BorderBeam',
  component: BorderBeam,
  tags: ['autodocs'],
  args: { tone: 'accent', speed: 'normal', phase: 0 },
  argTypes: {
    phase: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
  },
} satisfies Meta<typeof BorderBeam>

export default meta
type Story = StoryObj<typeof meta>

// ---------------------------------------------------------------------------------------------
// Story chrome. Everything below the component (card surfaces, copy, the live pill, the stage)
// is screen dressing for the review; BorderBeam itself only draws the beam.
// ---------------------------------------------------------------------------------------------

const surface = 'flex min-w-0 flex-col border border-line bg-surface p-[18px]'
const eyebrow =
  'font-sans text-[10px] font-semibold uppercase leading-none tracking-eyebrow text-text-faint'

function Tile({ title, meta: line }: { title: string; meta: string }) {
  return (
    <>
      <span className={eyebrow}>{line}</span>
      <p className="mt-6 font-display text-xl font-extrabold leading-tight text-text">{title}</p>
    </>
  )
}

/** The approved mockup's stage: page background with a low crimson haze; stacks on a phone. */
function Stage({ children }: { children: ReactNode }) {
  return (
    <div className="@container mx-auto w-full max-w-[600px] overflow-hidden rounded-lg bg-bg bg-[radial-gradient(120%_90%_at_50%_115%,color-mix(in_oklab,var(--sk-accent)_9%,transparent),transparent_60%)] shadow-card">
      <div className="grid min-h-80 grid-cols-2 gap-5 px-7 py-[42px] @max-[420px]:grid-cols-1 @max-[420px]:gap-[18px] @max-[420px]:p-5">
        {children}
      </div>
    </div>
  )
}

function LivePill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-[color-mix(in_oklab,var(--sk-accent)_13%,transparent)] py-1 pr-2 pl-[7px] font-sans text-[10px] font-bold uppercase leading-none tracking-[.16em] text-accent shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--sk-accent)_32%,transparent)] in-data-[theme=light]:text-accent-deep">
      <span
        aria-hidden="true"
        className="relative size-1.5 rounded-full bg-accent after:absolute after:inset-0 after:rounded-full after:bg-accent motion-safe:after:animate-ping"
      />
      Live
    </span>
  )
}

function MatchCard() {
  return (
    <BorderBeam
      as="article"
      aria-label="Featured match: Crimson Vow versus Night Shift"
      className={`${surface} @max-[420px]:grid @max-[420px]:grid-cols-[1fr_auto] @max-[420px]:content-between @max-[420px]:gap-x-2.5 @max-[420px]:px-4 @max-[420px]:py-3.5`}
    >
      <div className="flex min-h-5 items-center justify-between gap-2 @max-[420px]:col-span-full">
        <span className={eyebrow}>Featured match</span>
        <LivePill />
      </div>
      <p className="mt-auto font-display text-[17px] font-extrabold leading-[1.15] tracking-[-.005em] [font-stretch:112%] @max-[420px]:col-span-full @max-[420px]:mt-2 @max-[420px]:text-md">
        <span className="block @max-[420px]:inline">Crimson Vow</span>{' '}
        <span className="block @max-[420px]:inline">
          <span className="mr-0.5 align-[2px] font-sans text-[11px] font-medium tracking-[.08em] text-text-faint">
            vs
          </span>{' '}
          Night Shift
        </span>
      </p>
      <p className="mt-2 whitespace-nowrap font-display text-[42px] font-extrabold leading-none tracking-tight tabular-nums [font-stretch:125%] @max-[420px]:col-start-2 @max-[420px]:row-start-3 @max-[420px]:mt-0 @max-[420px]:self-end @max-[420px]:text-[30px]">
        <span>2</span>
        <span className="mx-[.3em] align-[.36em] text-[.5em] font-medium text-text-faint">
          {' – '}
        </span>
        <span className="text-text-dim">1</span>
      </p>
      <p className="mt-3 flex justify-between gap-2 border-t border-line-soft pt-2.5 font-sans text-[10px] font-semibold uppercase leading-none tracking-[.14em] text-text-dim tabular-nums @max-[420px]:col-start-1 @max-[420px]:row-start-3 @max-[420px]:mt-0 @max-[420px]:self-end @max-[420px]:border-0 @max-[420px]:p-0 @max-[420px]:pb-1">
        <span>Grand Final · Bo5</span>
        <span className="text-accent @max-[420px]:hidden">Map 4</span>
      </p>
    </BorderBeam>
  )
}

function Coin() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-4 fill-none stroke-current stroke-[1.3] [stroke-linejoin:round]"
    >
      <path d="M8 1.2 13.9 4.6v6.8L8 14.8 2.1 11.4V4.6Z" />
      <path
        d="M8 4.6 11 6.3v3.4L8 11.4 5 9.7V6.3Z"
        className="fill-[color-mix(in_oklab,currentColor_30%,transparent)] stroke-none"
      />
    </svg>
  )
}

function PassCard() {
  return (
    <BorderBeam
      as="article"
      aria-label="Season 07 Pass"
      tone="premium"
      speed="slow"
      phase={0.45}
      className={`${surface} @max-[420px]:grid @max-[420px]:grid-cols-[1fr_auto] @max-[420px]:content-between @max-[420px]:gap-x-2.5 @max-[420px]:px-4 @max-[420px]:py-3.5`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-6 right-2 -z-10 select-none font-display text-[92px] font-black leading-none tracking-[-.04em] text-transparent [-webkit-text-stroke:1px_color-mix(in_oklab,var(--sk-premium)_22%,transparent)] [font-stretch:125%] @max-[420px]:-top-1 @max-[420px]:right-3 @max-[420px]:text-[72px]"
      >
        07
      </span>
      <div className="flex min-h-5 items-center @max-[420px]:col-span-full">
        <span className={eyebrow}>Premium track</span>
      </div>
      <p className="mt-auto font-display text-[21px] font-extrabold leading-[1.05] text-text [font-stretch:112%] @max-[420px]:col-span-full @max-[420px]:mt-2 @max-[420px]:text-xl">
        Season 07 Pass
      </p>
      <p className="mt-1.5 text-[13px] text-text-dim @max-[420px]:col-start-1 @max-[420px]:row-start-3 @max-[420px]:mt-0 @max-[420px]:self-end @max-[420px]:pb-0.5">
        Unlocks 120 tiers
      </p>
      <span
        aria-hidden="true"
        className="mt-3.5 block h-2 bg-[repeating-linear-gradient(90deg,var(--sk-premium)_0_2px,transparent_2px_6px)] opacity-[.42] [mask-image:linear-gradient(90deg,black,transparent_135%)] @max-[420px]:hidden"
      />
      <p className="mt-3 flex items-center gap-[7px] border-t border-line-soft pt-2.5 font-sans text-xl font-bold leading-none text-premium tabular-nums @max-[420px]:col-start-2 @max-[420px]:row-start-3 @max-[420px]:mt-0 @max-[420px]:self-end @max-[420px]:border-0 @max-[420px]:p-0">
        <Coin />
        1,200
        <span className="self-end pb-px text-[11px] tracking-[.14em] text-premium-dim">SC</span>
      </p>
    </BorderBeam>
  )
}

function FeaturedScreen() {
  return (
    <Stage>
      <MatchCard />
      <PassCard />
    </Stage>
  )
}

// ---------------------------------------------------------------------------------------------

export const Playground: Story = {
  render: (args) => (
    <BorderBeam {...args} className="w-72 border border-line bg-surface p-5">
      <Tile title="Crimson Vow vs Night Shift" meta="Featured match" />
    </BorderBeam>
  ),
}

export const Tones: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-6">
      <BorderBeam {...args} tone="accent" className="w-60 border border-line bg-surface p-5">
        <Tile title="Grand final, map 4" meta="accent" />
      </BorderBeam>
      <BorderBeam
        {...args}
        tone="premium"
        phase={0.45}
        className="w-60 border border-line bg-surface p-5"
      >
        <Tile title="Season 07 Pass" meta="premium" />
      </BorderBeam>
    </div>
  ),
}

export const Speeds: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-6">
      {(['slow', 'normal', 'fast'] as const).map((speed) => (
        <BorderBeam
          key={speed}
          {...args}
          speed={speed}
          className="w-52 border border-line bg-surface p-5"
        >
          <Tile
            title={{ slow: '6.5s a lap', normal: '4s a lap', fast: '2.5s a lap' }[speed]}
            meta={speed}
          />
        </BorderBeam>
      ))}
    </div>
  ),
}

/** Four beams on one screen, a quarter lap apart, so they never move in lockstep. */
export const Phase: Story = {
  render: (args) => (
    <div className="grid w-fit grid-cols-2 gap-5">
      {[0, 0.25, 0.5, 0.75].map((phase) => (
        <BorderBeam
          key={phase}
          {...args}
          phase={phase}
          className="w-48 border border-line bg-surface p-5"
        >
          <Tile title={`phase ${phase}`} meta="Ranked queue" />
        </BorderBeam>
      ))}
    </div>
  ),
}

/** The approved mockup screen: a live featured match and a premium season pass. */
export const FeaturedCards: Story = {
  render: () => <FeaturedScreen />,
}

/**
 * Wrapping an existing Card: the ring covers the card's border; match `rounded-*` to the card, and
 * let the card fill the wrapper (`h-full`) when a row stretches it.
 */
export const WrapsACard: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      <BorderBeam className="w-64">
        <Card elevation="raised" className="h-full">
          <Tile title="Ranked season ends in 3 days" meta="Card · radius lg" />
        </Card>
      </BorderBeam>
      <BorderBeam tone="premium" speed="slow" phase={0.5} className="w-64 rounded-md">
        <Card tone="premium" radius="md" className="h-full">
          <Tile title="Pro plan" meta="Card · radius md" />
        </Card>
      </BorderBeam>
    </div>
  ),
}

/** The mockup screen in both themes at once, for review. */
export const SideBySide: Story = {
  parameters: { sideBySide: true },
  render: () => <FeaturedScreen />,
}
