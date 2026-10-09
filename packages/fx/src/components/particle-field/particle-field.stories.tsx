import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@sukunagg/ui'
import type { ReactNode } from 'react'
import { ParticleField, type ParticleFieldProps } from './index'

/*
 * Story chrome (hero copy, eyebrow, CTA, labels) lives here, not in the component: ParticleField
 * is the always-dark stage plus a children slot (build brief §1). The hero mirrors the approved
 * mockup (fx-mockups/parts/particle-field.html); the CTA is @sukunagg/ui's Button.
 */

function PlayIcon() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path d="M2.5 1.2v9.6L10.6 6z" fill="currentColor" />
    </svg>
  )
}

interface HeroProps {
  eyebrow: string
  title: string
  sub: ReactNode
  cta: string
  tone?: ParticleFieldProps['tone']
}

// Literal class strings per tone (never interpolated).
const heroTone = {
  accent: {
    eyebrow:
      'text-[color-mix(in_oklab,var(--sk-accent)_45%,var(--sk-text))] before:bg-accent before:shadow-[0_0_10px_1px_var(--sk-accent-glow)]',
    title:
      'to-[color-mix(in_oklab,var(--sk-accent)_42%,var(--sk-text))] drop-shadow-[0_4px_22px_color-mix(in_srgb,var(--sk-accent)_30%,transparent)]',
  },
  premium: {
    eyebrow:
      'text-[color-mix(in_oklab,var(--sk-premium)_70%,var(--sk-text))] before:bg-premium before:shadow-[0_0_10px_1px_color-mix(in_srgb,var(--sk-premium)_45%,transparent)]',
    title:
      'to-[color-mix(in_oklab,var(--sk-chart-4)_55%,var(--sk-text))] drop-shadow-[0_4px_22px_color-mix(in_srgb,var(--sk-chart-4)_30%,transparent)]',
  },
} as const

/** The season-launch hero from the mockup: eyebrow, display title, schedule line, one CTA. */
function Hero({ eyebrow, title, sub, cta, tone = 'accent' }: HeroProps) {
  const t = heroTone[tone]
  return (
    <div className="@container h-full">
      <div className="flex h-full max-w-[600px] flex-col items-start justify-center px-[clamp(20px,6.4cqi,72px)]">
        <p
          className={`m-0 mb-4 flex items-center gap-3 font-sans text-xs leading-none font-semibold tracking-eyebrow uppercase rtl:text-sm rtl:tracking-normal before:h-0.5 before:w-6 ${t.eyebrow}`}
        >
          {eyebrow}
        </p>
        <h2
          className={`m-0 bg-linear-to-b from-text from-34% bg-clip-text font-display text-[clamp(40px,6.6cqi,72px)] leading-[0.88] font-black tracking-[-0.012em] text-transparent rtl:tracking-normal uppercase font-stretch-[125%] ${t.title}`}
        >
          {title}
        </h2>
        <p className="mt-[18px] mb-7 text-[15px] leading-[1.4] text-text-dim @max-[499px]:mt-3.5 @max-[499px]:mb-6 @max-[499px]:text-md">
          {sub}
        </p>
        <Button
          size="lg"
          leadingIcon={<PlayIcon />}
          className="rounded-md font-stretch-[112%] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--sk-on-accent)_22%,transparent),0_12px_32px_-12px_var(--sk-accent-glow)]"
        >
          {cta}
        </Button>
      </div>
    </div>
  )
}

const schedule = (
  <>
    Ranked resets{' '}
    <time
      dateTime="2026-10-14T00:00Z"
      className="font-sans tracking-[0.02em] whitespace-nowrap text-text tabular-nums"
    >
      Oct 14 · 00:00 UTC
    </time>
  </>
)

const crimson = <Hero eyebrow="Season 07" title="Crimson Ascent" sub={schedule} cta="Play now" />

const meta = {
  title: 'FX/ParticleField',
  component: ParticleField,
  tags: ['autodocs'],
  args: { density: 'medium', tone: 'accent', paused: false },
  argTypes: {
    density: { control: 'inline-radio', options: ['low', 'medium', 'high'] },
    tone: { control: 'inline-radio', options: ['accent', 'premium'] },
  },
  render: (args) => (
    <ParticleField {...args} className="h-[380px] rounded-lg">
      {crimson}
    </ParticleField>
  ),
} satisfies Meta<typeof ParticleField>

export default meta
type Story = StoryObj<typeof meta>

/** The season-launch hero. Try the controls, the theme toolbar and reduced motion. */
export const Playground: Story = {}

/** `accent` (crimson embers) and `premium` (amber embers with bone cores). */
export const Tones: Story = {
  render: (args) => (
    <div className="grid gap-6">
      <ParticleField {...args} tone="accent" className="h-[380px] rounded-lg">
        {crimson}
      </ParticleField>
      <ParticleField {...args} tone="premium" className="h-[380px] rounded-lg">
        <Hero
          tone="premium"
          eyebrow="Battle pass"
          title="Gilded Tier"
          sub={
            <>
              Unlocks at level 50 ·{' '}
              <span className="whitespace-nowrap text-text tabular-nums">1,200 XP</span> to go
            </>
          }
          cta="Claim rewards"
        />
      </ParticleField>
    </div>
  ),
  parameters: { controls: { exclude: ['tone'] } },
}

/** `low`, `medium` and `high` as bare backdrops (no overlay content). */
export const Densities: Story = {
  render: (args) => (
    <div className="grid gap-4">
      {(['low', 'medium', 'high'] as const).map((density) => (
        <figure key={density} className="m-0 grid gap-2">
          <ParticleField {...args} density={density} className="h-44 rounded-lg" />
          <figcaption className="font-sans text-sm text-text-dim">
            density=&quot;{density}&quot;
          </figcaption>
        </figure>
      ))}
    </div>
  ),
  parameters: { controls: { exclude: ['density'] } },
}

/** A phone-width card: fewer embers, the plume nearer the centre, a wider shade under the copy. */
export const Narrow: Story = {
  render: (args) => (
    <ParticleField {...args} className="h-[380px] w-[360px] max-w-full rounded-lg">
      {crimson}
    </ParticleField>
  ),
}

/** Under `dir="rtl"` the plume, poster and shade mirror: the copy sits on the right. */
export const RightToLeft: Story = {
  render: (args) => (
    <div dir="rtl" lang="ar">
      <ParticleField {...args} className="h-[380px] rounded-lg">
        <Hero
          eyebrow="الموسم 07"
          title="الصعود القرمزي"
          sub={
            <>
              إعادة تعيين التصنيف{' '}
              <time dateTime="2026-10-14T00:00Z" className="whitespace-nowrap text-text">
                14 أكتوبر · 00:00 UTC
              </time>
            </>
          }
          cta="العب الآن"
        />
      </ParticleField>
    </div>
  ),
}
