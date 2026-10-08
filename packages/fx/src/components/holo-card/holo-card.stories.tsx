import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { HoloCard, type HoloCardProps } from './index'

/*
 * HoloCard stories (docs/component-holo-card.md §10). Ids: fx-holocard--playground, --player-card,
 * --intensities, --roster. The component is the foil card around `children`; everything else
 * here (the card art, the grid stage, the caption and the arrow-key caps) is story chrome that
 * shows how an app would use it. The art reads the card's --sk-holo-card-* properties.
 */

// --- Example card art (consumer content, ported from the approved mockup) -------------------

const ink = 'var(--sk-holo-card-ink)'
const base = 'var(--sk-holo-card-base)'
const hue = 'var(--sk-holo-card-hue)'
const deep = 'var(--sk-holo-card-deep)'
const mix = (a: string, pct: number, b: string) => `color-mix(in oklab, ${a} ${pct}%, ${b})`

const art: CSSProperties = {
  background: [
    `radial-gradient(45% 34% at 50% 42%, ${mix(hue, 75, ink)}, transparent)`,
    `radial-gradient(130% 95% at 50% 40%, ${hue}, ${deep} 30%, ${mix(deep, 40, base)} 56%, ${base} 86%)`,
  ].join(', '),
}
const dots: CSSProperties = {
  background: `radial-gradient(circle, ${mix(ink, 30, 'transparent')} .9px, transparent 1.4px) 0 0 / 6px 6px`,
  maskImage: 'radial-gradient(75% 55% at 100% 0%, black, transparent)',
}
const plate: CSSProperties = {
  background: `linear-gradient(to top, ${base} 30%, ${mix(base, 70, 'transparent')} 62%, transparent)`,
}

/** A tiny caps label (no mono token exists: font-sans + tabular-nums, brief §7). */
const caps = 'font-sans font-semibold tabular-nums uppercase leading-none tracking-eyebrow'

interface Player {
  rating: number
  name: string
  role: string
  team: string
  tier: string
}

const RYOMEN: Player = {
  rating: 94,
  name: 'ryomen',
  role: 'Duelist',
  team: 'Crimson Vow',
  tier: 'Legendary',
}
const ROSTER: Player[] = [
  RYOMEN,
  { rating: 89, name: 'kaori', role: 'Controller', team: 'Eclipse', tier: 'Epic' },
  { rating: 83, name: 'dusk', role: 'Sentinel', team: 'Low Tide', tier: 'Rare' },
]

const labelOf = (p: Player) =>
  `${p.name}, ${p.role}, ${p.team}, rating ${p.rating}, ${p.tier.toLowerCase()} holo card`

/** The example card art: slash lines and a crest with parallax, a rating, a tier and a plate. */
function PlayerArt({ rating, name, role, team, tier }: Player) {
  return (
    <>
      <div aria-hidden="true" className="absolute inset-0" style={art}>
        <span className="absolute inset-0" style={dots} />
        <svg
          aria-hidden="true"
          viewBox="0 0 220 300"
          preserveAspectRatio="none"
          className="absolute -top-2.5 -left-2.5 h-[300px] w-[220px] [translate:calc(var(--sk-holo-card-x)*-6px)_calc(var(--sk-holo-card-y)*-6px)]"
          fill="none"
          strokeLinecap="round"
        >
          <path
            stroke={mix(ink, 26, 'transparent')}
            strokeWidth={1.2}
            d="M8 272l46-94M28 300l22-45M44 200l30-61M2 130l24-49M160 296l40-82M178 206l32-65M138 106l36-74M196 132l18-37M66 76l20-41M106 290l14-29M92 40l12-25"
          />
          <path
            stroke={mix(ink, 70, hue)}
            strokeWidth={2.2}
            d="M20 246l26-53M168 262l20-41M150 80l14-29M30 104l10-20"
          />
        </svg>
        <svg
          aria-hidden="true"
          viewBox="0 0 120 150"
          className="absolute top-9 left-9 h-40 w-32 overflow-visible [translate:calc(var(--sk-holo-card-x)*8px)_calc(var(--sk-holo-card-y)*8px)]"
        >
          <path
            fill={mix(deep, 35, base)}
            stroke={ink}
            strokeWidth={1.6}
            strokeLinejoin="round"
            d="M60 4C66 30 80 40 82 60C90 50 98 40 104 20C110 54 110 86 100 108C92 128 76 142 60 146C44 142 28 128 20 108C10 86 10 54 16 20C22 40 30 50 38 60C40 36 50 22 60 4Z"
          />
          <path
            fill={hue}
            d="M60 20C65 40 77 51 77 68C77 83 69 93 60 98C51 93 43 83 43 68C43 51 55 40 60 20Z"
          />
          <path
            fill={ink}
            d="M41 54C47 58 53 60 58 60C58 86 55 108 48 132C47 106 45 80 41 54ZM79 54C73 58 67 60 62 60C62 86 65 108 72 132C73 106 75 80 79 54Z"
          />
          <path
            fill="none"
            stroke={mix(deep, 60, base)}
            strokeWidth={1.6}
            strokeLinecap="round"
            d="M53 66C53 88 52 104 49 120M67 66C67 88 68 104 71 120"
          />
        </svg>
      </div>
      <div className="absolute top-[13px] left-[15px] grid justify-items-center">
        <b className="font-display text-[34px] leading-[.86] font-black tracking-tight [font-stretch:112%]">
          {rating}
        </b>
        <span className={`${caps} mt-[5px] pl-[.22em] text-[8px] opacity-75`}>OVR</span>
      </div>
      <span
        className={`${caps} absolute top-4 right-[13px] text-[8px] opacity-70 [writing-mode:vertical-rl]`}
      >
        {tier}
      </span>
      <div
        className="absolute inset-x-0 bottom-0 grid gap-[7px] px-4 pt-11 pb-[15px]"
        style={plate}
      >
        <strong className="font-display text-[31px] leading-[.9] font-black tracking-[-.015em] [font-stretch:118%]">
          {name}
        </strong>
        <span
          className={`${caps} flex items-center gap-[7px] text-[7.5px] opacity-80 before:h-0.5 before:w-4 before:flex-none before:bg-(--sk-holo-card-hue) before:content-['']`}
        >
          {role} · {team}
        </span>
      </div>
      <span
        aria-hidden="true"
        className="absolute inset-[7px] rounded-[calc(var(--sk-radius-lg)-7px)] border border-[color-mix(in_oklab,var(--sk-holo-card-ink)_22%,transparent)]"
      />
    </>
  )
}

// --- Screen chrome ---------------------------------------------------------------------------

/** A lit stage with a faint grid, like the mockup's (room for the aura; clips it). */
function Stage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`group/stage @container relative isolate grid min-h-[340px] place-items-center overflow-hidden rounded-lg border border-line-soft bg-surface px-6 py-12 ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 [background:repeating-linear-gradient(90deg,var(--sk-line-soft)_0_1px,transparent_1px_28px),repeating-linear-gradient(0deg,var(--sk-line-soft)_0_1px,transparent_1px_28px)] [mask-image:radial-gradient(60%_75%_at_50%_50%,black,transparent)]"
      />
      {children}
    </div>
  )
}

// Arrow caps: one up-arrow path, turned per key (literal rotate classes), so every browser draws
// the same glyph whatever its symbol fonts.
const KEYS = [
  { key: 'ArrowUp', at: 'col-start-2', turn: '' },
  { key: 'ArrowLeft', at: 'col-start-1', turn: '-rotate-90' },
  { key: 'ArrowDown', at: '', turn: 'rotate-180' },
  { key: 'ArrowRight', at: '', turn: 'rotate-90' },
]

/** The mockup's screen: the card, an eyebrow, the hint and arrow-key caps that light up. */
function PlayerCardScreen(props: Omit<HoloCardProps, 'children'>) {
  const [lit, setLit] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    props.onKeyDown?.(event)
    if (!KEYS.some((k) => k.key === event.key)) return
    setLit(event.key)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setLit(null), 220)
  }
  return (
    <Stage className="mx-auto max-w-[560px]">
      <div className="flex items-center gap-11">
        <HoloCard {...props} onKeyDown={onKeyDown}>
          <PlayerArt {...RYOMEN} />
        </HoloCard>
        <div className="hidden w-50 flex-col gap-2.5 @min-[460px]:flex">
          <span className={`${caps} text-[10px] text-accent`}>Holo foil · Legendary</span>
          <p className="m-0 font-display text-[21px] leading-[1.1] font-extrabold text-text [font-stretch:104%]">
            <span className="motion-reduce:hidden">Hover or use arrow keys</span>
            <span className="hidden motion-reduce:inline">Static sheen for reduced motion</span>
          </p>
          <div
            aria-hidden="true"
            className="mt-1 grid grid-cols-[repeat(3,26px)] gap-1 motion-reduce:hidden"
          >
            {KEYS.map(({ key, at, turn }) => (
              <kbd
                key={key}
                data-on={lit === key || undefined}
                className={`${at} grid h-6 place-items-center rounded-sm border border-line bg-surface-2 font-sans text-xs leading-none font-semibold text-text-dim transition-[background-color,border-color,color,box-shadow] duration-base ease-sukuna motion-reduce:transition-none group-has-[[data-sk-fx]:focus-visible]/stage:border-[color-mix(in_oklab,var(--sk-accent)_50%,var(--sk-line))] group-has-[[data-sk-fx]:focus-visible]/stage:text-text data-on:border-accent data-on:bg-accent data-on:text-on-accent data-on:shadow-[0_0_14px_var(--sk-accent-glow)]`}
              >
                <svg aria-hidden="true" viewBox="0 0 12 12" className={`size-3 ${turn}`}>
                  <path
                    d="M6 10V2.5M2.75 5.5 6 2.25 9.25 5.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </kbd>
            ))}
          </div>
        </div>
      </div>
    </Stage>
  )
}

// --- Stories ---------------------------------------------------------------------------------

const meta = {
  title: 'FX/HoloCard',
  component: HoloCard,
  tags: ['autodocs'],
  args: { 'aria-label': labelOf(RYOMEN), intensity: 'normal' },
  argTypes: {
    intensity: { control: 'inline-radio', options: ['subtle', 'normal'] },
    children: { control: false },
  },
} satisfies Meta<typeof HoloCard>

export default meta
type Story = StoryObj<typeof meta>

/** The example player card. Hover it, or Tab to it and use the arrow keys (Escape resets). */
export const Playground: Story = {
  render: (args) => (
    <Stage className="mx-auto max-w-[560px]">
      <HoloCard {...args}>
        <PlayerArt {...RYOMEN} />
      </HoloCard>
    </Stage>
  ),
}

/** The approved mockup's screen: the card with its caption and arrow-key caps that light up. */
export const PlayerCard: Story = {
  render: (args) => <PlayerCardScreen {...args} />,
}

/** `subtle` halves the tilt and dims the foil; `normal` is the full effect. */
export const Intensities: Story = {
  parameters: { controls: { disable: true } },
  render: (args) => (
    <Stage className="mx-auto max-w-[720px]">
      <div className="flex flex-wrap justify-center gap-x-24 gap-y-16">
        {(['subtle', 'normal'] as const).map((intensity) => (
          <figure key={intensity} className="m-0 grid justify-items-center gap-10">
            <HoloCard {...args} intensity={intensity}>
              <PlayerArt {...RYOMEN} />
            </HoloCard>
            <figcaption className={`${caps} text-[10px] text-text-dim`}>{intensity}</figcaption>
          </figure>
        ))}
      </div>
    </Stage>
  ),
}

/** Three cards on one shared frame loop: Tab between them; each tilts on its own. */
export const Roster: Story = {
  parameters: { controls: { disable: true } },
  render: (args) => (
    <Stage className="mx-auto max-w-[860px]">
      <ul className="m-0 flex list-none flex-wrap justify-center gap-x-20 gap-y-16 p-0">
        {ROSTER.map((player) => (
          <li key={player.name}>
            <HoloCard intensity={args.intensity} aria-label={labelOf(player)}>
              <PlayerArt {...player} />
            </HoloCard>
          </li>
        ))}
      </ul>
    </Stage>
  ),
}
