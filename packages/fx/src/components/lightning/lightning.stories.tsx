import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Lightning, type LightningProps } from './index'

/*
 * Story chrome (not part of the component, build brief §1): the approved mockup's Grand Final
 * banner — Live pill, title, teams and map, plus the scrim that keeps the copy legible next to the
 * bolt. It reads the effect's own width through the root's `@container`, so the same markup is the
 * wide banner and the phone card (copy drops to the bottom, the bolt moves to 0.8).
 * Mono labels use `font-sans tabular-nums` (no mono token, build brief §7).
 */
function GrandFinalCopy() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--sk-bg)_82%,transparent),color-mix(in_srgb,var(--sk-bg)_45%,transparent)_36%,transparent_58%)] @max-[720px]:bg-[radial-gradient(120%_78%_at_0_100%,color-mix(in_srgb,var(--sk-bg)_86%,transparent),color-mix(in_srgb,var(--sk-bg)_50%,transparent)_48%,transparent_74%)]"
      />
      <div className="relative flex min-h-[380px] max-w-[56%] flex-col items-start justify-center px-12 @max-[720px]:max-w-[68%] @max-[720px]:justify-end @max-[720px]:px-5 @max-[720px]:pb-[22px]">
        <span className="inline-flex items-center gap-2 rounded-pill bg-[color-mix(in_srgb,var(--sk-accent)_16%,transparent)] py-[5px] pr-[11px] pl-[9px] font-sans text-xs leading-none font-semibold tracking-eyebrow uppercase tabular-nums shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--sk-accent)_50%,transparent)]">
          <i
            aria-hidden="true"
            className="relative size-[7px] rounded-full bg-accent shadow-[0_0_8px_var(--sk-accent)] after:absolute after:inset-0 after:rounded-full after:bg-accent after:opacity-70 motion-safe:after:animate-ping motion-reduce:after:opacity-0"
          />
          Live
        </span>
        <h2 className="mt-[18px] mb-4 font-display text-[clamp(50px,10.5cqi,80px)] leading-[.84] font-black tracking-[-.01em] uppercase [font-stretch:125%] @max-[720px]:mt-3.5 @max-[720px]:mb-3">
          <span className={word}>Grand</span> <span className={word}>Final</span>
        </h2>
        <p className="m-0 flex flex-wrap items-center gap-x-[7px] gap-y-1 text-lg leading-[1.3] text-text-dim @max-[720px]:text-md">
          <b className="font-semibold text-text">Crimson Vow</b> <span>vs</span>{' '}
          <b className="font-semibold text-text">Night Shift</b> <span aria-hidden="true">·</span>{' '}
          <span className="rounded-sm px-[7px] py-[3px] font-sans text-xs leading-none font-semibold tracking-[.12em] text-text uppercase tabular-nums shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--sk-text)_22%,transparent)]">
            Map 4
          </span>
        </p>
      </div>
    </>
  )
}

// The title's gradient fill, one block per word.
const word =
  'block bg-[linear-gradient(var(--sk-text)_48%,color-mix(in_srgb,var(--sk-text)_62%,var(--sk-accent)))] bg-clip-text [-webkit-text-fill-color:transparent]'

// The shadow sits on the wrapper, in the page theme: utilities on the root resolve in the pinned
// dark palette, which would put the heavy dark-theme shadow on a light page.
const banner = (args: LightningProps, width: number | string) => (
  <div style={{ width, maxWidth: '100%' }} className="rounded-lg shadow-card">
    <Lightning {...args} className="rounded-lg">
      <GrandFinalCopy />
    </Lightning>
  </div>
)

/*
 * Story chrome: a WCAG 2.2.2 pause control. The bolt loops for as long as the banner is on screen,
 * so a banner that sits beside content people read needs a way to stop it. The component exposes
 * `paused`; the app owns the button. The label says what a press will do (no `aria-pressed`, which
 * would contradict a changing label).
 */
function PausableBanner(args: LightningProps) {
  const [paused, setPaused] = useState(false)
  return (
    <div style={{ width: 1100, maxWidth: '100%' }} className="rounded-lg shadow-card">
      <Lightning {...args} paused={paused} className="rounded-lg">
        <GrandFinalCopy />
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="absolute top-4 right-4 inline-flex cursor-pointer items-center gap-2 rounded-pill bg-[color-mix(in_srgb,var(--sk-bg)_70%,transparent)] py-[7px] pr-3 pl-2.5 font-sans text-xs leading-none font-semibold tracking-eyebrow text-text uppercase shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--sk-text)_22%,transparent)] transition-shadow duration-base ease-sukuna hover:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--sk-accent)_70%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring motion-reduce:transition-none @max-[720px]:top-3 @max-[720px]:right-3"
        >
          <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 fill-current">
            <path d={paused ? 'M3 1.5v9l7.5-4.5z' : 'M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z'} />
          </svg>
          {paused ? 'Play' : 'Pause'}
          <span className="sr-only"> the lightning</span>
        </button>
      </Lightning>
    </div>
  )
}

const meta = {
  title: 'FX/Lightning',
  component: Lightning,
  tags: ['autodocs'],
  args: { intensity: 'normal', paused: false },
  argTypes: {
    intensity: { control: 'inline-radio', options: ['calm', 'normal', 'storm'] },
    // A number field, not a range: every new position restarts the effect (a layout setting).
    position: { control: { type: 'number', min: 0, max: 1, step: 0.05 } },
    paused: { control: 'boolean' },
    children: { control: false },
  },
  render: (args) => banner(args, 1100),
} satisfies Meta<typeof Lightning>

export default meta
type Story = StoryObj<typeof meta>

/** Every prop on controls, inside the Grand Final banner chrome. */
export const Playground: Story = {}

/** The approved mockup: a live Grand Final banner, copy on the left, the bolt clear of it. */
export const GrandFinal: Story = {
  name: 'Grand Final',
}

/** The three cadences side by side. Each stays at or under three flashes a second. */
export const Intensities: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 16, maxWidth: 1100 }}>
      {(['calm', 'normal', 'storm'] as const).map((intensity) => (
        <Lightning key={intensity} {...args} intensity={intensity} className="rounded-lg">
          <div className="flex min-h-[200px] flex-col justify-center gap-2 px-12">
            <span className="font-sans text-xs font-semibold tracking-eyebrow text-text-dim uppercase">
              intensity
            </span>
            <span className="font-display text-3xl font-black uppercase">{intensity}</span>
          </div>
        </Lightning>
      ))}
    </div>
  ),
}

/**
 * A 360 px card: under 720 px the bolt moves to 0.8 and the copy drops to the bottom; under 400 px
 * the frozen bolt drops its fork, which would reach into the title.
 */
export const Narrow: Story = {
  render: (args) => banner(args, 360),
}

/**
 * WCAG 2.2.2 reference: the banner loops beside readable copy, so the app offers a Pause/Play
 * toggle bound to `paused`. Copy the button from this story.
 */
export const WithPauseControl: Story = {
  name: 'With pause control',
  argTypes: { paused: { control: false } },
  render: (args) => <PausableBanner {...args} />,
}
