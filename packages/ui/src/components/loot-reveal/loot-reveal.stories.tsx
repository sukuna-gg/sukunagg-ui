import type { Meta, StoryObj } from '@storybook/react-vite'
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react'
import { Button } from '../button'
import { LootReveal, type LootRevealItem, type LootRevealProps } from './index'

/**
 * The approved prototype's type: Archivo with its width axis, so the card names render condensed
 * (`font-stretch-condensed`). The library bundles no fonts — an app loads its own, as this story
 * screen does (once, after mount); without it the names fall back to `--sk-font-sans`.
 */
const ARCHIVO =
  'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap'

function WithArchivo({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (document.querySelector(`link[href="${ARCHIVO}"]`)) return
    document.head.append(
      Object.assign(document.createElement('link'), { rel: 'stylesheet', href: ARCHIVO }),
    )
  }, [])
  return children
}

const meta = {
  title: 'Components/LootReveal',
  component: LootReveal,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <WithArchivo>
        <Story />
      </WithArchivo>
    ),
  ],
} satisfies Meta<typeof LootReveal>

export default meta
type Story = StoryObj<typeof meta>

// ── Item art (story-only): line glyphs on the 24px grid, tinted by the card (currentColor). ──

const Glyph = ({ children }: { children: ReactNode }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
)
const tint = { fill: 'currentColor', fillOpacity: 0.18 } as const
const solid = { fill: 'currentColor' } as const

const SprayIcon = () => (
  <Glyph>
    <rect {...tint} x="6" y="8.5" width="8" height="13" rx="1.6" />
    <path d="M8 8.5V6h4v2.5M12 6.6h2.2M6 15c1.4-1.1 2.6-1.1 4 0s2.6 1.1 4 0" />
    <path d="M17 5.2h.01M19.5 3.6h.01M19.8 7h.01M17.6 8.6h.01M21.6 5.4h.01" strokeWidth={2} />
  </Glyph>
)
const MaskIcon = () => (
  <Glyph>
    <path
      {...tint}
      d="M3.4 2.4 8.6 8h6.8l5.2-5.6.5 7.8c0 3.6-2 6.4-4.8 8.1L12 21.8l-4.3-3.5C4.9 16.6 2.9 13.8 2.9 10.2z"
    />
    <path d="M10.2 13.2 6.6 11.6M13.8 13.2l3.6-1.6M5.8 15.6l2.4.4M18.2 15.6l-2.4.4M5.4 5.6l1.7 3.6M18.6 5.6l-1.7 3.6" />
    <path {...solid} d="M12 9.2l1.1 1.6-1.1 1.6-1.1-1.6z" />
  </Glyph>
)
const BannerIcon = () => (
  <Glyph>
    <path d="M3 4h18" />
    <circle {...solid} cx="3" cy="4" r=".9" />
    <circle {...solid} cx="21" cy="4" r=".9" />
    <path {...tint} d="M6 4v16l6-3.6 6 3.6V4" />
    <path
      d="M12 7.2l2.6 3.6L12 14.4l-2.6-3.6z"
      style={{ fill: 'var(--sk-accent)', stroke: 'var(--sk-accent)' }}
    />
  </Glyph>
)
const EmoteIcon = () => (
  <Glyph>
    <circle {...tint} cx="12" cy="12" r="8.5" />
    <path d="M9 10h.01M15 10h.01" strokeWidth={2.4} />
    <path d="M8.6 14.2c1.8 1.9 5 1.9 6.8 0" />
  </Glyph>
)

const PACK: LootRevealItem[] = [
  { name: 'Ember Tide Spray', kind: 'Spray', rarity: 'rare', icon: <SprayIcon /> },
  { name: 'Kitsune Mask', kind: 'Mask', rarity: 'epic', icon: <MaskIcon /> },
  { name: 'Crimson Vow Gold Banner', kind: 'Banner', rarity: 'legendary', icon: <BannerIcon /> },
]

const DROP: LootRevealItem[] = [
  { name: 'Ashen Grin', kind: 'Emote', rarity: 'common', icon: <EmoteIcon /> },
  ...PACK,
]

// ── Screen chrome (story-only): the pack header, an app-owned live counter and rarity pips. ──

/** When card i turns over — the timing formula documented on LootReveal (+ ~half the flip). */
function useRevealed(items: readonly LootRevealItem[], stagger: string | undefined, play: boolean) {
  const [count, setCount] = useState(play ? 0 : items.length)
  useEffect(() => {
    if (!play || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(items.length)
      return
    }
    setCount(0)
    const step = stagger === 'slow' ? 700 : 350
    let charges = 0
    const timers = items.map((item, i) => {
      if (item.rarity === 'legendary') charges += 1
      return window.setTimeout(() => setCount(i + 1), 200 + i * step + charges * 450 + 110)
    })
    return () => {
      for (const t of timers) window.clearTimeout(t)
    }
  }, [items, stagger, play])
  return count
}

const PIP: Record<LootRevealItem['rarity'], string> = {
  common: 'var(--sk-text-faint)',
  rare: 'var(--sk-chart-2)',
  epic: 'var(--sk-chart-5)',
  legendary: 'var(--sk-premium)',
}

const eyebrow: CSSProperties = {
  font: '600 10px/1 var(--sk-font-sans)',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: 'var(--sk-tracking-eyebrow)',
  textTransform: 'uppercase',
}

function PackHeader({
  title,
  items,
  stagger,
  play,
}: {
  title: string
  items: readonly LootRevealItem[]
  stagger?: string
  play: boolean
}) {
  const count = useRevealed(items, stagger, play)
  return (
    <header
      style={{
        ...eyebrow,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'var(--sk-text-dim)',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <i
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            rotate: '45deg',
            background: 'var(--sk-accent)',
            boxShadow: '0 0 8px var(--sk-accent-glow)',
          }}
        />
        {title}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span aria-hidden="true" style={{ display: 'flex', gap: 3 }}>
          {items.map((item, i) => (
            <i
              // biome-ignore lint/suspicious/noArrayIndexKey: one pip per card, positional.
              key={i}
              style={{
                width: 10,
                height: 3,
                borderRadius: 2,
                background: i < count ? PIP[item.rarity] : 'var(--sk-line)',
                transition: 'background-color .3s',
              }}
            />
          ))}
        </span>
        <span aria-live="polite">
          <b style={{ color: 'var(--sk-text)', fontWeight: 600 }}>{count}</b>/{items.length}{' '}
          revealed
        </span>
      </span>
    </header>
  )
}

/** A pack-opening screen: a 540 × 320 stage (like the approved prototype) around the reveal. */
function PackScreen({
  title = 'Crimson Vow Pack',
  width = 540,
  height = 320,
  ...props
}: LootRevealProps & { title?: string; width?: number; height?: number }) {
  return (
    <div
      style={{
        width,
        maxWidth: '100%',
        height,
        overflow: 'hidden',
        borderRadius: 'var(--sk-radius-lg)',
        background: 'var(--sk-surface)',
        boxShadow: 'var(--sk-shadow-card)',
      }}
    >
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '14px 14px 12px',
          background:
            'radial-gradient(62% 58% at 50% 56%, color-mix(in oklab, var(--sk-accent) 8%, transparent), transparent 72%)',
        }}
      >
        <PackHeader
          title={title}
          items={props.items}
          stagger={props.stagger}
          play={props.play ?? true}
        />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingBottom: 4 }}>
          <LootReveal aria-label={`${title} rewards`} {...props} />
        </div>
      </div>
    </div>
  )
}

/** The pack screen: three cards; the legendary charges up, then bursts. */
export const Playground: Story = {
  args: { items: PACK, stagger: 'normal', play: true },
  render: (args) => <PackScreen {...args} />,
}

/** Every rarity, common → legendary (colors are a DECISION(open) default, Q38(c)). */
export const Rarities: Story = {
  args: { items: DROP },
  render: (args) => <PackScreen {...args} title="Season drop" width={640} />,
}

/** `stagger="slow"`: 700ms between flips, for a one-at-a-time ceremony. */
export const SlowStagger: Story = {
  args: { items: PACK, stagger: 'slow' },
  render: (args) => <PackScreen {...args} />,
}

/** Replay = change `key`: React remounts the row and the CSS plays again from the backs. */
export const Replay: Story = {
  args: { items: PACK },
  render: function ReplayStory(args) {
    const [run, setRun] = useState(0)
    return (
      <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
        <PackScreen key={run} {...args} />
        <Button variant="secondary" size="sm" onClick={() => setRun((r) => r + 1)}>
          Replay
        </Button>
      </div>
    )
  },
}

/**
 * `play={false}`: the revealed row with no motion — an opened pack. This is also exactly what
 * `prefers-reduced-motion: reduce` shows.
 */
export const Settled: Story = {
  args: { items: PACK, play: false },
  render: (args) => <PackScreen {...args} />,
}

/** Phone width: the cards scale with the container (container query units). */
export const Narrow: Story = {
  args: { items: PACK },
  render: (args) => <PackScreen {...args} width={340} />,
}
