import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'
import { Avatar } from '../avatar'
import { AvatarFrame } from './index'

// Story chrome only: gradient avatar discs, captions and the lit stage come from the approved
// mockup. The component is just the frame around the <Avatar>.
const disc = {
  crimson: 'bg-[linear-gradient(150deg,var(--sk-chart-2),var(--sk-chart-5))] text-on-accent',
  bone: 'bg-[linear-gradient(150deg,var(--sk-chart-3),color-mix(in_oklab,var(--sk-chart-3)_40%,var(--sk-well)))] text-on-accent',
  live: 'bg-[linear-gradient(150deg,color-mix(in_oklab,var(--sk-surface-2)_82%,var(--sk-accent)),var(--sk-well)_75%)] text-text',
  ember:
    'bg-[linear-gradient(150deg,var(--sk-chart-4),color-mix(in_oklab,var(--sk-chart-4)_45%,var(--sk-accent-deep)))] text-on-accent',
  moss: 'bg-[linear-gradient(150deg,var(--sk-chart-6),color-mix(in_oklab,var(--sk-chart-6)_40%,var(--sk-well)))] text-on-accent',
} as const

// Literal size classes (rule 7). The hero disc follows the mockup's narrow rule: inside the
// Showcase stage's container it drops to 72px at ≤ 420px (the mockup's phone size, ~65% of a
// column), then 64px / 56px so the three columns of a 320–360px phone keep that ratio. Every effect
// scales with the disc.
const discSize = {
  sm: '',
  md: '',
  lg: '',
  hero: [
    'size-[88px] text-[26px]',
    '@max-[420px]:size-[72px] @max-[420px]:text-[22px]',
    '@max-[340px]:size-[64px] @max-[340px]:text-[20px]',
    '@max-[290px]:size-[56px] @max-[290px]:text-[17px]',
  ].join(' '),
  xl: 'size-[200px] text-[58px]',
} as const

/** A mockup-style avatar disc: gradient fill, inner hairline, a soft top-left highlight. */
function Disc({
  initials,
  look,
  size = 'hero',
}: {
  initials: string
  look: keyof typeof disc
  size?: keyof typeof discSize
}) {
  return (
    <Avatar
      size={size === 'hero' || size === 'xl' ? 'lg' : size}
      fallback={
        <span className="relative font-display font-extrabold tracking-[-.01em] font-stretch-[118%]">
          {initials}
        </span>
      }
      className={[
        disc[look],
        discSize[size],
        'shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--sk-on-accent)_16%,transparent)]',
        'before:absolute before:inset-0 before:rounded-full',
        'before:bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--sk-on-accent)_30%,transparent),transparent_55%)]',
      ].join(' ')}
    />
  )
}

/**
 * The mockup's lit stage: a surface card with a faint crimson wash. Its inner wrapper is an
 * inline-size container, so the roster follows the mockup's `@container (max-width: 420px)` rules.
 */
function Stage({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid min-h-80 w-full max-w-[600px] place-items-center overflow-hidden rounded-lg bg-surface shadow-card">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(70%_80%_at_50%_40%,color-mix(in_oklab,var(--sk-accent)_6%,transparent),transparent_70%)]"
      />
      <div className="@container relative w-full py-8">{children}</div>
    </div>
  )
}

interface CaptionProps {
  name: ReactNode
  meta: ReactNode
  tone?: 'premium'
}

function Caption({ name, meta, tone }: CaptionProps) {
  return (
    <p className="m-0 flex flex-col items-center gap-1.5 text-center">
      <b
        className={`inline-flex items-center gap-1.5 font-display text-[15px] font-extrabold uppercase leading-none tracking-[.04em] font-stretch-[120%] @max-[420px]:text-[13px] ${tone === 'premium' ? 'text-premium' : 'text-text'}`}
      >
        {name}
      </b>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-sans text-[10px] font-medium uppercase leading-none tracking-[.08em] tabular-nums text-text-faint @max-[420px]:text-[9px] @max-[420px]:tracking-[.04em]">
        {meta}
      </span>
    </p>
  )
}

const Gem = () => (
  <svg viewBox="0 0 10 10" aria-hidden="true" className="size-2.5 fill-current">
    <path d="M5 0 6.2 3.8 10 5 6.2 6.2 5 10 3.8 6.2 0 5 3.8 3.8Z" />
  </svg>
)

/** Story chrome: a surface card with an eyebrow title, the way frames sit in an app. */
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="w-full max-w-[600px] rounded-lg border border-line-soft bg-surface p-6 shadow-card">
      <h3 className="m-0 mb-7 font-display text-xs font-extrabold uppercase tracking-eyebrow text-text-dim">
        {title}
      </h3>
      {children}
    </section>
  )
}

/** One framed profile with its caption (the mockup's roster item). */
function Profile({ children, ...caption }: { children: ReactNode } & CaptionProps) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-[22px]">
      {children}
      <Caption {...caption} />
    </div>
  )
}

const row = 'flex flex-wrap items-start justify-center gap-x-14 gap-y-10'

const meta = {
  title: 'Components/AvatarFrame',
  component: AvatarFrame,
  tags: ['autodocs'],
  args: { children: <Disc initials="RY" look="crimson" /> },
  argTypes: { children: { control: false } },
} satisfies Meta<typeof AvatarFrame>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: { tone: 'accent', status: 'online' },
  render: (args) => (
    <Panel title="Playground">
      <div className="grid min-h-40 place-items-center">
        <AvatarFrame {...args} />
      </div>
    </Panel>
  ),
}

const rosterItem = 'flex min-w-0 flex-col items-center gap-[22px] @max-[420px]:gap-5'
/**
 * A roster meta line, one flex item: the player prefix ('RY · ') is visually hidden on a narrow
 * stage (the mockup's rule) and still read by screen readers.
 */
const Who = ({ id, children }: { id: string; children: ReactNode }) => (
  <span>
    <span className="@max-[420px]:sr-only">{id} · </span>
    {children}
  </span>
)

/** The approved mockup's roster: three player profiles on a lit stage. */
function Roster() {
  return (
    <Stage>
      <ul className="m-0 grid list-none grid-cols-3 items-start px-3 py-0 @max-[420px]:px-3.5">
        <li className={rosterItem}>
          <AvatarFrame status="online" statusLabel="">
            <Disc initials="RY" look="crimson" />
          </AvatarFrame>
          <Caption
            name="Crimson"
            meta={
              <>
                <i
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-success @max-[420px]:hidden"
                />
                <Who id="RY">Online</Who>
              </>
            }
          />
        </li>
        <li className={rosterItem}>
          <AvatarFrame tone="premium" sparks>
            <Disc initials="KA" look="bone" />
          </AvatarFrame>
          <Caption
            tone="premium"
            name={
              <>
                <Gem />
                Bone
              </>
            }
            meta={<Who id="KA">Premium</Who>}
          />
        </li>
        <li className={rosterItem}>
          <AvatarFrame live>
            <Disc initials="M1" look="live" />
          </AvatarFrame>
          <Caption name="Live" meta={<Who id="M1">2.4K watching</Who>} />
        </li>
      </ul>
    </Stage>
  )
}

/** The approved mockup: three player profiles on a lit stage. */
export const Showcase: Story = { render: () => <Roster /> }

export const Tones: Story = {
  render: () => (
    <Panel title="Profile frames">
      <div className={row}>
        <Profile name="Crimson" meta="tone · accent">
          <AvatarFrame>
            <Disc initials="RY" look="crimson" />
          </AvatarFrame>
        </Profile>
        <Profile
          tone="premium"
          name={
            <>
              <Gem />
              Bone
            </>
          }
          meta="tone · premium"
        >
          <AvatarFrame tone="premium">
            <Disc initials="KA" look="bone" />
          </AvatarFrame>
        </Profile>
      </div>
    </Panel>
  ),
}

/** A "Live now" rail: the halo, ripple and pill carry the motion; premium keeps its metal ring. */
export const Live: Story = {
  render: () => (
    <Panel title="Live now · 2">
      <div className={row}>
        <Profile name="mika_one" meta="2.4K watching">
          <AvatarFrame live>
            <Disc initials="M1" look="live" />
          </AvatarFrame>
        </Profile>
        <Profile tone="premium" name="kaiser" meta="812 watching">
          <AvatarFrame live tone="premium" sparks>
            <Disc initials="KA" look="bone" />
          </AvatarFrame>
        </Profile>
      </div>
    </Panel>
  ),
}

export const Sparks: Story = {
  render: () => (
    <Panel title="Supporters">
      <div className={row}>
        <Profile tone="premium" name="kaiser" meta="Premium · 2 yrs">
          <AvatarFrame tone="premium" sparks>
            <Disc initials="KA" look="bone" />
          </AvatarFrame>
        </Profile>
        <Profile name="ryomen" meta="Founder">
          <AvatarFrame sparks>
            <Disc initials="RY" look="crimson" />
          </AvatarFrame>
        </Profile>
      </div>
    </Panel>
  ),
}

/**
 * A party panel. The dot says the status; its default visually hidden label ('Online' /
 * 'Offline') says it in words, since the captions don't.
 */
export const Status: Story = {
  render: () => (
    <Panel title="Party · 3">
      <div className={row}>
        <Profile name="ryomen" meta="Captain">
          <AvatarFrame status="online">
            <Disc initials="RY" look="crimson" />
          </AvatarFrame>
        </Profile>
        <Profile name="sora" meta="Flex">
          <AvatarFrame status="offline">
            <Disc initials="SO" look="ember" />
          </AvatarFrame>
        </Profile>
        <Profile tone="premium" name="kaiser" meta="Support">
          <AvatarFrame tone="premium" status="online">
            <Disc initials="KA" look="bone" />
          </AvatarFrame>
        </Profile>
      </div>
    </Panel>
  ),
}

/** The frame takes the child's size: Avatar sm / md / lg and an 88px hero disc. */
export const Sizes: Story = {
  render: () => (
    <Panel title="Sizes · the child sets them">
      <div className="flex flex-col gap-10">
        {(['accent', 'premium'] as const).map((tone) => (
          <div key={tone} className="flex flex-wrap items-end justify-center gap-x-9 gap-y-8">
            {(['sm', 'md', 'lg', 'hero'] as const).map((size) => (
              <div
                key={size}
                className={`flex flex-col items-center ${size === 'hero' ? 'gap-5' : 'gap-3'}`}
              >
                <AvatarFrame tone={tone} sparks={tone === 'premium'} status="online">
                  <Disc initials="RY" look={tone === 'premium' ? 'bone' : 'crimson'} size={size} />
                </AvatarFrame>
                <span className="font-sans text-[10px] font-medium uppercase leading-none tracking-[.08em] tabular-nums text-text-faint">
                  {size === 'hero' ? '88px' : `${size} · ${{ sm: 32, md: 40, lg: 48 }[size]}px`}
                </span>
              </div>
            ))}
            <div className="flex flex-col items-center gap-3">
              <AvatarFrame live tone={tone}>
                <Disc initials="M1" look="live" size="lg" />
              </AvatarFrame>
              <span className="mt-2 font-sans text-[10px] font-medium uppercase leading-none tracking-[.08em] text-text-faint">
                live · lg
              </span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  ),
}

/**
 * Profile-header scale: 200px avatars with a status dot. The glow, halo, comet head and the status
 * cut-out all scale with the child (the cut-out's mask box bleeds 30% of the frame).
 */
export const Large: Story = {
  render: () => (
    <Panel title="Profile header · 200px">
      <div className="flex flex-wrap items-start justify-center gap-x-24 gap-y-20 py-10">
        <AvatarFrame status="online">
          <Disc initials="RY" look="crimson" size="xl" />
        </AvatarFrame>
        <AvatarFrame live status="online">
          <Disc initials="M1" look="live" size="xl" />
        </AvatarFrame>
      </div>
    </Panel>
  ),
}

const friends = [
  { name: 'ryomen', initials: 'RY', look: 'crimson', note: 'In queue · Ranked', frame: {} },
  {
    name: 'kaiser',
    initials: 'KA',
    look: 'bone',
    note: 'Premium · Diamond II',
    frame: { tone: 'premium', sparks: true, className: '[--sk-avatar-frame-delay:-2.3s]' },
  },
  {
    name: 'mika_one',
    initials: 'M1',
    look: 'live',
    note: 'Streaming · 2.4K',
    frame: { live: true, className: '[--sk-avatar-frame-delay:-1.6s]' },
  },
  {
    name: 'sora',
    initials: 'SO',
    look: 'ember',
    note: 'Last seen 2h ago',
    frame: { status: 'offline', className: '[--sk-avatar-frame-delay:-1.1s]' },
  },
  {
    name: 'moss',
    initials: 'MO',
    look: 'moss',
    note: 'Online',
    frame: { status: 'online', statusLabel: '', className: '[--sk-avatar-frame-delay:-2.2s]' },
  },
] as const

/**
 * Small sizes in real chrome: a sidebar friends roster. Each frame sets its own
 * `--sk-avatar-frame-delay`, so the comets don't turn in lockstep.
 */
export const FriendsList: Story = {
  render: () => (
    <aside className="w-72 rounded-lg border border-line bg-surface p-2 shadow-card">
      <h3 className="m-0 px-3 pt-2 pb-3 font-display text-xs font-extrabold uppercase tracking-eyebrow text-text-dim">
        Friends · 5
      </h3>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {friends.map((f) => (
          <li key={f.name}>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-3.5 rounded-md bg-transparent px-3 py-2.5 text-left hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-focus-ring"
            >
              <AvatarFrame {...f.frame}>
                <Disc initials={f.initials} look={f.look} size="md" />
              </AvatarFrame>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-sm font-semibold text-text">{f.name}</span>
                <span className="truncate text-xs text-text-dim">{f.note}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  ),
}

/**
 * Every look with its animations removed: exactly what `prefers-reduced-motion` shows (each loop
 * rests on its designed still frame). For review and screenshots.
 */
export const Still: Story = {
  render: () => (
    <div className="[&_*]:animate-none!">
      <Roster />
    </div>
  ),
}
