import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import { Button } from '../button'
import { GradientText } from '../gradient-text'
import { ScrambleText } from './index'

// Story chrome only. The library doesn't bundle Archivo; load it with its `wdth` axis like a
// consumer would, so the condensed black display titles match the approved mockup.
const ARCHIVO =
  'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap'
const withArchivo: Decorator = (Story) => (
  <>
    <link rel="stylesheet" href={ARCHIVO} precedence="default" />
    <Story />
  </>
)

const meta = {
  title: 'Components/ScrambleText',
  component: ScrambleText,
  tags: ['autodocs'],
  decorators: [withArchivo],
  args: { text: 'MATCH FOUND', as: 'h2', delay: 0, duration: 800 },
} satisfies Meta<typeof ScrambleText>

export default meta
type Story = StoryObj<typeof meta>

// `leading-*` goes after the size in every className: tailwind-merge drops a line-height that comes
// before a font-size utility (Tailwind v4 font sizes set their own line-height).
const display = 'm-0 font-display font-black [font-stretch:62%]'

/**
 * Story chrome: replays its children by bumping their `key` — the documented way to replay a
 * ScrambleText (it plays on mount).
 */
function Replayable({ children }: { children: (round: number) => ReactNode }) {
  const [round, setRound] = useState(0)
  return (
    <div className="flex flex-col items-start gap-6">
      <div key={round}>{children(round)}</div>
      <Button variant="secondary" size="sm" onClick={() => setRound((r) => r + 1)}>
        Replay
      </Button>
    </div>
  )
}

export const Playground: Story = {
  render: (args) => (
    <Replayable>
      {() => <ScrambleText {...args} className={`${display} text-[56px] leading-[.9] text-text`} />}
    </Replayable>
  ),
}

/** `as` picks the element: real headings and paragraphs, named by the real text. */
export const Elements: Story = {
  render: () => (
    <Replayable>
      {() => (
        <div className="flex flex-col gap-4">
          <ScrambleText
            as="h1"
            text="VICTORY ROYALE"
            className={`${display} text-[64px] leading-[.9]`}
          />
          <ScrambleText
            as="h2"
            text="MATCH FOUND"
            delay={150}
            className={`${display} text-3xl leading-[.9] text-accent`}
          />
          <ScrambleText
            as="p"
            text="Searching for players in EU-West…"
            delay={300}
            className="m-0 text-lg text-text-dim"
          />
          <ScrambleText
            text="#TEAM-KAIRO"
            delay={450}
            duration={600}
            className="text-xs font-semibold tracking-eyebrow text-premium"
          />
        </div>
      )}
    </Replayable>
  ),
}

const recap = [
  ['ROUND 12', 'WON 13 — 11'],
  ['ACE', 'vex.inferno'],
  ['MVP', 'KAIRO · 31 / 9 / 6'],
  ['XP', '+2,450'],
] as const

/** Stagger lines by rendering one instance per line with an increasing `delay`. */
export const Staggered: Story = {
  render: () => (
    <Replayable>
      {() => (
        <dl className="m-0 grid w-80 grid-cols-[6rem_1fr] gap-x-4 gap-y-3 text-md tabular-nums">
          {recap.map(([term, value], i) => (
            <div key={term} className="contents">
              <dt className="text-xs font-semibold tracking-eyebrow text-text-faint">
                <ScrambleText text={term} delay={i * 220} duration={500} />
              </dt>
              <dd className="m-0 font-semibold text-text">
                <ScrambleText text={value} delay={i * 220 + 80} duration={700} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Replayable>
  ),
}

/**
 * Inherited text styling composes: under a gradient fill (GradientText) the decode draws in the
 * inherited `color` and the gradient returns when it ends; a glow `text-shadow` or a text-stroke
 * styles the noise too. The real text is hidden with `visibility` while it decodes, so none of
 * them shows the answer early.
 */
export const Composed: Story = {
  render: () => (
    <Replayable>
      {() => (
        <div className="flex flex-col gap-5">
          <h2 className={`${display} text-[64px] leading-[.9]`}>
            <GradientText>
              <ScrambleText text="VICTORY ROYALE" delay={300} duration={900} />
            </GradientText>
          </h2>
          <ScrambleText
            as="h2"
            text="MATCH FOUND"
            delay={450}
            duration={900}
            className={`${display} text-[48px] leading-[.9] text-text [text-shadow:0_0_.35em_var(--sk-accent-glow)]`}
          />
          <ScrambleText
            as="h2"
            text="ROUND 12"
            delay={600}
            duration={900}
            className={`${display} text-[48px] leading-[.9] text-transparent [-webkit-text-stroke:1px_var(--sk-text)]`}
          />
        </div>
      )}
    </Replayable>
  ),
}

// ── MatchLobby: the approved mockup screen. Everything but the ScrambleText instances is story
// chrome (card, glow, scanlines, watermark, rules, hover bar, Replay), not the component.

const roster = [
  ['01', 'ryomen', 'Duelist'],
  ['02', 'KAIRO', 'Controller'],
  ['03', 'vex.inferno', 'Initiator'],
  ['04', 'm1ra', 'Sentinel'],
  ['05', 'Tetsu', 'Flex'],
] as const

const glow: CSSProperties = {
  background: [
    'radial-gradient(80% 75% at 100% 0%, color-mix(in oklab, var(--sk-accent-glow) 30%, transparent), transparent 70%)',
    'radial-gradient(60% 60% at 0% 100%, color-mix(in oklab, var(--sk-premium) 6%, transparent), transparent 70%)',
  ].join(', '),
}
const scanlines: CSSProperties = {
  background:
    'repeating-linear-gradient(to bottom, var(--sk-line-soft) 0 1px, transparent 1px 4px)',
  maskImage: 'linear-gradient(to bottom, black, transparent 80%)',
  WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 80%)',
}
const watermark: CSSProperties = {
  maskImage: 'linear-gradient(90deg, transparent, black 45%)',
  WebkitMaskImage: 'linear-gradient(90deg, transparent, black 45%)',
  WebkitTextStroke: '1px var(--sk-line)',
}

/** Flips to `true` one frame after mount, so the chrome's rules can transition in. */
function useLive(still: boolean) {
  const [live, setLive] = useState(still)
  useEffect(() => {
    const id = requestAnimationFrame(() => setLive(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return live
}

function RosterRow({
  row: [index, name, role],
  i,
  still,
}: {
  row: (typeof roster)[number]
  i: number
  still: boolean
}) {
  const live = useLive(still)
  // The mockup decodes each row as one line, left to right; here each cell is its own instance,
  // so the cells start in a slight cascade to keep that sweep.
  const total = Math.min(900, 360 + (index.length + name.length + role.length + 2) * 19)
  const base = 780 + i * 150
  // Hover re-scrambles the row: a new `key` replays it (short, no delay). Ignored while the row is
  // still decoding — WebKit re-fires pointerenter when the nodes under the pointer are replaced.
  const [hover, setHover] = useState(0)
  const busyUntil = useRef(Number.POSITIVE_INFINITY)
  useEffect(() => {
    busyUntil.current = performance.now() + base + total
  }, [base, total])
  const replay = () => {
    const now = performance.now()
    if (still || now < busyUntil.current) return
    busyUntil.current = now + 560
    setHover((h) => h + 1)
  }
  const cell = (offset: number, share: number) =>
    still
      ? { duration: 0 }
      : hover
        ? { delay: offset * 230, duration: 460, seed: 977 * hover + i }
        : { delay: base + offset * total, duration: share * total }
  return (
    <li
      onPointerEnter={replay}
      className={[
        'relative cursor-default rounded-sm transition-colors duration-base ease-sukuna',
        'hover:bg-accent/7',
        'before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-line-soft before:origin-left',
        'before:transition-[scale] before:delay-(--lobby-row-delay) before:duration-700',
        'before:ease-sukuna last:before:hidden motion-reduce:before:transition-none',
        live ? 'before:scale-x-100' : 'before:scale-x-0',
        'after:absolute after:left-0 after:top-[26%] after:bottom-[26%] after:w-0.5 after:rounded-pill',
        'after:bg-accent after:shadow-[0_0_10px_var(--sk-accent-glow)] after:scale-y-0',
        'after:transition-[scale] after:duration-slow after:ease-spring hover:after:scale-y-100',
        'motion-reduce:after:transition-none',
      ].join(' ')}
      style={{ '--lobby-row-delay': `${base}ms` } as CSSProperties}
    >
      <div className="grid h-full grid-cols-[2.4em_minmax(0,1fr)_auto] items-center gap-x-2.5 pr-2 pl-3 text-[13px] tabular-nums @max-[420px]:gap-x-2 @max-[420px]:pr-1.5 @max-[420px]:pl-2.5">
        <ScrambleText
          key={`i${hover}`}
          text={index}
          className="text-xs font-semibold text-accent"
          {...cell(0, 0.45)}
        />
        <ScrambleText
          key={`n${hover}`}
          text={name}
          className="overflow-hidden text-md font-semibold whitespace-pre text-text @max-[420px]:text-[13px]"
          {...cell(0.08, 0.6)}
        />
        <span className="min-w-[13.4em] text-xs tracking-[.1em] whitespace-pre uppercase @max-[420px]:min-w-[12.4em] @max-[420px]:tracking-[.06em]">
          <span aria-hidden="true" className="text-text-faint">
            <ScrambleText key={`d${hover}`} text="—" {...cell(0.22, 0.4)} />
          </span>{' '}
          <ScrambleText key={`r${hover}`} text={role} {...cell(0.25, 0.75)} />
        </span>
      </div>
    </li>
  )
}

function Lobby({ width, still = false }: { width: number; still?: boolean }) {
  const live = useLive(still)
  const at = (delay: number, duration: number) => (still ? { duration: 0 } : { delay, duration })
  return (
    <div
      className="@container relative overflow-hidden rounded-lg bg-surface text-text shadow-card"
      style={{ width, height: 320 }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={glow}>
        <div className="absolute inset-0" style={scanlines} />
        <span
          className="absolute -top-[.18em] -right-[.03em] font-display text-[120px] leading-none font-black tracking-[-.02em] text-transparent opacity-90 [font-stretch:62%] @max-[420px]:text-[96px]"
          style={watermark}
        >
          4471
        </span>
      </div>
      <div className="relative flex h-full flex-col px-5 pt-[18px] pb-2.5 @max-[420px]:px-3.5 @max-[420px]:pt-4 @max-[420px]:pb-2">
        <ScrambleText
          as="h2"
          text="MATCH FOUND"
          className={`${display} text-[length:clamp(32px,12cqi,58px)] leading-[.9] tracking-[.06em] whitespace-nowrap`}
          {...at(60, 780)}
        />
        <p
          className={[
            'relative m-0 mt-2.5 flex items-center gap-[9px] pb-3 text-xs font-semibold whitespace-pre',
            'tracking-eyebrow text-premium tabular-nums',
            'after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left',
            'after:bg-[linear-gradient(90deg,var(--sk-accent)_0_44px,var(--sk-line)_44px)]',
            'after:transition-[scale] after:delay-[440ms] after:duration-[900ms] after:ease-sukuna',
            'motion-reduce:after:transition-none',
            live ? 'after:scale-x-100' : 'after:scale-x-0',
          ].join(' ')}
        >
          <span
            aria-hidden="true"
            className={[
              'relative inline-flex size-1.5 flex-none transition-opacity duration-300 delay-[440ms]',
              'ease-sukuna motion-reduce:transition-none',
              live ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          >
            <span className="absolute inset-0 rounded-pill bg-accent opacity-60 motion-safe:animate-ping" />
            <span className="relative size-1.5 rounded-pill bg-accent shadow-[0_0_0_3px_color-mix(in_oklab,var(--sk-accent-glow)_45%,transparent)] motion-safe:shadow-none" />
          </span>
          <ScrambleText text="LOBBY 4471 · CUSTOM" {...at(440, 660)} />
        </p>
        <ul
          aria-label="Lobby roster"
          className="m-0 mt-0.5 grid min-h-0 flex-1 list-none auto-rows-fr p-0"
        >
          {roster.map((row, i) => (
            <RosterRow key={row[0]} row={row} i={i} still={still} />
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * The approved mockup: a lobby card whose title, eyebrow and roster decode in sequence (title →
 * eyebrow → one row every 150 ms). Hover a row to re-scramble it; Replay remounts everything.
 */
export const MatchLobby: Story = {
  render: () => <Replayable>{() => <Lobby width={540} />}</Replayable>,
}

/** The same screen at phone width (container-query layout). */
export const MatchLobbyNarrow: Story = {
  render: () => <Replayable>{() => <Lobby width={340} />}</Replayable>,
}

/**
 * `duration={0}` on every instance: the final frame — exactly what the server, no-JS and
 * reduced-motion users get (the decode never runs; nothing is ever hidden).
 */
export const FinalFrame: Story = {
  render: () => <Lobby width={540} still />,
}
