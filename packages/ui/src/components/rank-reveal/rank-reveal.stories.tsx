import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import { Button } from '../button'
import { Progress } from '../progress'
import { RankReveal, type RankRevealProps } from './index'

// Story chrome only: the stage card, the Replay button and the post-match screen are NOT part of
// the component (it is the effect layer + copy). The library doesn't bundle Archivo; load it with
// its `wdth` axis like a consumer would, so the expanded black title matches the approved mockup.
const ARCHIVO =
  'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap'
const withArchivo: Decorator = (Story) => (
  <>
    <link rel="stylesheet" href={ARCHIVO} precedence="default" />
    <Story />
  </>
)

const change = (
  <>
    Diamond III <span aria-hidden="true">→</span>
    <span className="sr-only">to</span> <strong>Master I</strong> · <em>+32 RR</em>
  </>
)

const meta = {
  title: 'Components/RankReveal',
  component: RankReveal,
  tags: ['autodocs'],
  decorators: [withArchivo],
  args: { title: 'Master', division: 'I', description: change },
  argTypes: {
    tone: { control: 'inline-radio', options: ['accent', 'premium'] },
    headingLevel: { control: 'inline-radio', options: ['h2', 'h3', 'h4', 'p'] },
    title: { control: 'text' },
    division: { control: 'text' },
    eyebrow: { control: 'text' },
    description: { control: false },
    emblem: { control: false },
  },
} satisfies Meta<typeof RankReveal>

export default meta
type Story = StoryObj<typeof meta>

// The gallery card: a surface with a soft `--sk-well` vignette (stage chrome, not the component —
// the component only paints its own tone glow, so it also sits seamlessly inside a bigger card).
const stage = (width: number, height = 320): CSSProperties => ({
  display: 'flex',
  width,
  maxWidth: '100%',
  height,
  borderRadius: 'var(--sk-radius-lg)',
  background:
    'radial-gradient(130% 110% at 50% 40%, transparent 50%, color-mix(in oklab, var(--sk-well) 50%, transparent)), var(--sk-surface)',
  boxShadow: 'var(--sk-shadow-card)',
  overflow: 'hidden',
})

/** The gallery stage: a surface card with a Replay control under it (remounts via `key`). */
function Stage({
  width = 540,
  height,
  label,
  ...props
}: RankRevealProps & { width?: number; height?: number; label?: ReactNode }) {
  const [take, setTake] = useState(0)
  return (
    // minmax(0, …): the column may shrink below the card's width, so `maxWidth: 100%` can apply.
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, max-content)',
        gap: 12,
        justifyItems: 'start',
      }}
    >
      <div style={stage(width, height)}>
        <RankReveal key={take} {...props} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button variant="secondary" size="sm" onClick={() => setTake((n) => n + 1)}>
          Replay
        </Button>
        {label ? (
          <span style={{ color: 'var(--sk-text-dim)', fontSize: 'var(--sk-text-sm)' }}>
            {label}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export const Playground: Story = {
  render: (args) => <Stage {...args} />,
}

/** Realistic screen chrome: a post-match panel with the reveal, the RR bar and the next actions. */
export const PostMatch: Story = {
  render: function PostMatchStory(args) {
    const [take, setTake] = useState(0)
    return (
      <section
        aria-label="Match result"
        style={{
          width: 560,
          maxWidth: '100%',
          borderRadius: 'var(--sk-radius-lg)',
          background: 'var(--sk-surface)',
          boxShadow: 'var(--sk-shadow-card)',
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 12,
            padding: '14px 20px',
            borderBottom: '1px solid var(--sk-line-soft)',
            fontSize: 'var(--sk-text-sm)',
            color: 'var(--sk-text-dim)',
          }}
        >
          <span>
            <strong style={{ color: 'var(--sk-success)', fontWeight: 600 }}>Victory</strong>{' '}
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>13 – 9</span> · Ascent
          </span>
          <span>Competitive · Act 3</span>
        </header>
        <div style={{ display: 'flex', height: 300 }}>
          <RankReveal key={take} {...args} />
        </div>
        <div style={{ display: 'grid', gap: 16, padding: '4px 24px 20px' }}>
          <Progress value={32} label="Master I · 32 / 100 RR" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" onClick={() => setTake((n) => n + 1)}>
              Replay
            </Button>
            <Button variant="secondary">View match</Button>
            <Button>Continue</Button>
          </div>
        </div>
      </section>
    )
  },
}

export const Tones: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      <Stage {...args} width={460} tone="accent" label="tone=accent" />
      <Stage
        {...args}
        width={460}
        tone="premium"
        title="Radiant"
        division={undefined}
        description={
          <>
            Immortal III <span aria-hidden="true">→</span>
            <span className="sr-only">to</span> <strong>Radiant</strong> · <em>Top 500</em>
          </>
        }
        label="tone=premium"
      />
    </div>
  ),
}

const Medal = () => (
  <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden="true">
    <circle cx="52" cy="52" r="46" style={{ fill: 'var(--sk-surface-2)' }} />
    <circle
      cx="52"
      cy="52"
      r="46"
      style={{ fill: 'none', stroke: 'var(--sk-premium)', strokeWidth: 3 }}
    />
    <circle
      cx="52"
      cy="52"
      r="36"
      style={{ fill: 'none', stroke: 'var(--sk-line)', strokeWidth: 1.5 }}
    />
    <path
      d="M52 24l8.2 16.6 18.3 2.7-13.2 12.9 3.1 18.2L52 65.8l-16.4 8.6 3.1-18.2-13.2-12.9 18.3-2.7z"
      style={{ fill: 'var(--sk-premium)' }}
    />
  </svg>
)

export const CustomEmblem: Story = {
  args: {
    title: 'Gold',
    division: 'II',
    eyebrow: 'Promoted',
    emblem: <Medal />,
    description: (
      <>
        Silver I <span aria-hidden="true">→</span>
        <span className="sr-only">to</span> <strong>Gold II</strong> · <em>+18 LP</em>
      </>
    ),
  },
  render: (args) => <Stage {...args} />,
}

/** 340px stages: the title scales with the stage, so an 11-letter rank still fits on one line. */
export const Phone: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      <Stage {...args} width={340} label="Master I" />
      <Stage
        {...args}
        width={340}
        title="Grandmaster"
        division={undefined}
        description={
          <>
            Master I <span aria-hidden="true">→</span>
            <span className="sr-only">to</span> <strong>Grandmaster</strong> · <em>Top 200</em>
          </>
        }
        label="Long rank name"
      />
    </div>
  ),
}

/** Story-only: a stage that jumps every CSS animation inside it to its end (loops are dropped). */
function SettledStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    for (const a of ref.current?.getAnimations({ subtree: true }) ?? []) {
      if (a.effect?.getComputedTiming().endTime === Number.POSITIVE_INFINITY) a.cancel()
      else a.finish()
    }
  }, [])
  return (
    <div ref={ref} style={stage(540)}>
      {children}
    </div>
  )
}

/**
 * The final frame with motion stopped: exactly what reduced-motion users see, and a stable frame
 * for review screenshots.
 */
export const Settled: Story = {
  render: (args) => (
    <SettledStage>
      <RankReveal {...args} />
    </SettledStage>
  ),
}

export const BothThemes: Story = {
  parameters: { sideBySide: true },
  render: (args) => <Stage {...args} width={460} />,
}
