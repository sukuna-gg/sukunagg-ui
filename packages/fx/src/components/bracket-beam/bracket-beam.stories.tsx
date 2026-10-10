import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'
import {
  BracketBeam,
  type BracketGrandFinal,
  type BracketRound,
  type BracketTeamInfo,
} from './index'

/*
 * The screen chrome (event header, the stage card with its faint grid, the phone frame) lives here,
 * not in the component (build brief §1). The stage matches the approved mockup's: a surface card
 * with a 32px grid fading in toward the trophy.
 */

const EIGHT: BracketRound[] = [
  {
    name: 'Quarter-finals',
    meta: 'Bo3',
    matches: [
      {
        teams: [
          { name: 'Crimson Vow', seed: 1 },
          { name: 'Paper Tigers', seed: 8 },
        ],
        scores: [2, 0],
        winner: 0,
      },
      {
        teams: [
          { name: 'Night Shift', seed: 4 },
          { name: 'Iron Lotus', seed: 5 },
        ],
        scores: [2, 1],
        winner: 0,
      },
      {
        teams: [
          { name: 'Kitsune Five', seed: 3 },
          { name: 'Hollow Crown', seed: 6 },
        ],
        scores: [1, 2],
        winner: 1,
      },
      {
        teams: [
          { name: 'Ember Tide', seed: 2 },
          { name: 'Static Saints', seed: 7 },
        ],
        scores: [2, 0],
        winner: 0,
      },
    ],
  },
  {
    name: 'Semi-finals',
    meta: 'Bo3',
    matches: [
      {
        teams: [
          { name: 'Crimson Vow', seed: 1 },
          { name: 'Night Shift', seed: 4 },
        ],
        scores: [2, 1],
        winner: 0,
      },
      {
        teams: [
          { name: 'Hollow Crown', seed: 6 },
          { name: 'Ember Tide', seed: 2 },
        ],
        scores: [2, 1],
        winner: 0,
      },
    ],
  },
  {
    name: 'Grand final',
    meta: 'Bo5',
    matches: [
      {
        teams: [
          { name: 'Crimson Vow', seed: 1 },
          { name: 'Hollow Crown', seed: 6 },
        ],
        scores: [3, 1],
        winner: 0,
      },
    ],
  },
]

const TEAMS = [
  'Crimson Vow',
  'Wraith Theory',
  'Night Shift',
  'Iron Lotus',
  'Kitsune Five',
  'Low Orbit',
  'Hollow Crown',
  'Paper Tigers',
  'Ember Tide',
  'Glass Cannons',
  'Static Saints',
  'Blue Shell',
  'Grey Market',
  'Velvet Riot',
  'Ninth Gate',
  'Salt & Static',
]
const SEEDS = [1, 16, 8, 9, 5, 12, 4, 13, 3, 14, 6, 11, 7, 10, 2, 15]
// Per round, which row won each match (Crimson Vow, seed 1, wins it all).
const WINS: (0 | 1)[][] = [[0, 1, 0, 0, 0, 1, 0, 0], [0, 1, 0, 1], [0, 1], [0]]
/** A 16-team bracket built from the tables above, so the winners always line up. */
function sixteen(): BracketRound[] {
  const names = ['Round of 16', 'Quarter-finals', 'Semi-finals', 'Grand final']
  let field: BracketTeamInfo[] = TEAMS.map((name, i) => ({ name, seed: SEEDS[i] ?? i + 1 }))
  return names.map((name, r) => {
    const final = r === names.length - 1
    const matches = (WINS[r] ?? []).map((winner, i) => {
      const teams = [field[2 * i] ?? { name: 'TBD' }, field[2 * i + 1] ?? { name: 'TBD' }] as const
      const won = final ? 3 : 2
      const lost = final ? 2 : (r + i) % 2
      const scores: [number, number] = winner === 0 ? [won, lost] : [lost, won]
      return { teams, scores, winner }
    })
    field = matches.map((m) => m.teams[m.winner])
    return { name, meta: final ? 'Bo5' : 'Bo3', matches }
  })
}

const IN_PROGRESS: BracketRound[] = [
  EIGHT[0] as BracketRound,
  {
    name: 'Semi-finals',
    meta: 'Bo3',
    matches: [
      {
        teams: [
          { name: 'Crimson Vow', seed: 1 },
          { name: 'Night Shift', seed: 4 },
        ],
        scores: [2, 1],
        winner: 0,
      },
      {
        teams: [
          { name: 'Hollow Crown', seed: 6 },
          { name: 'Ember Tide', seed: 2 },
        ],
        scores: [1, 1],
      },
    ],
  },
  {
    name: 'Grand final',
    meta: 'Bo5',
    matches: [{ teams: [{ name: 'Crimson Vow', seed: 1 }, { name: 'TBD' }] }],
  },
]

/*
 * Double elimination (the Q42 mockup's Copa Otoño): eight teams, explicit `id` / `next` links.
 * Sahuaros (seed 4) lose the upper semi-final to Cobras Sonora, drop to the lower bracket, win it,
 * beat Cobras in the grand final and again in the reset.
 */
const team = (name: string, seed: number): BracketTeamInfo => ({ name, seed })
const COB = team('Cobras Sonora', 1)
const PIT = team('Los Pitayos', 2)
const DES = team('Desierto GG', 3)
const SAH = team('Sahuaros', 4)
const BAH = team('Bahía Kino', 5)
const COY = team('Coyotes HMO', 6)
const MEZ = team('Mezquite', 7)
const CER = team('Cerro Gaming', 8)

const UPPER: BracketRound[] = [
  {
    name: 'Quarter-final',
    meta: 'Bo3',
    matches: [
      {
        id: 'ub-qf1',
        teams: [COB, CER],
        scores: [2, 0],
        winner: 0,
        next: { winner: 'ub-sf1', loser: 'lb-r1-1' },
      },
      {
        id: 'ub-qf2',
        teams: [SAH, BAH],
        scores: [2, 1],
        winner: 0,
        next: { winner: 'ub-sf1', loser: 'lb-r1-1' },
      },
      {
        id: 'ub-qf3',
        teams: [PIT, MEZ],
        scores: [2, 0],
        winner: 0,
        next: { winner: 'ub-sf2', loser: 'lb-r1-2' },
      },
      {
        id: 'ub-qf4',
        teams: [DES, COY],
        scores: [1, 2],
        winner: 1,
        next: { winner: 'ub-sf2', loser: 'lb-r1-2' },
      },
    ],
  },
  {
    name: 'Semi-final',
    meta: 'Bo3',
    matches: [
      {
        id: 'ub-sf1',
        teams: [COB, SAH],
        scores: [2, 1],
        winner: 0,
        next: { winner: 'ub-final', loser: 'lb-r2-2' },
      },
      {
        id: 'ub-sf2',
        teams: [PIT, COY],
        scores: [2, 0],
        winner: 0,
        next: { winner: 'ub-final', loser: 'lb-r2-1' },
      },
    ],
  },
  {
    name: 'Upper final',
    meta: 'Bo3',
    matches: [
      {
        id: 'ub-final',
        teams: [COB, PIT],
        scores: [2, 1],
        winner: 0,
        next: { winner: 'gf', loser: 'lb-final' },
      },
    ],
  },
]

const LOWER: BracketRound[] = [
  {
    name: 'Lower round 1',
    meta: 'Bo3',
    matches: [
      { id: 'lb-r1-1', teams: [CER, BAH], scores: [0, 2], winner: 1, next: { winner: 'lb-r2-1' } },
      { id: 'lb-r1-2', teams: [MEZ, DES], scores: [1, 2], winner: 1, next: { winner: 'lb-r2-2' } },
    ],
  },
  {
    name: 'Lower round 2',
    meta: 'Bo3',
    matches: [
      { id: 'lb-r2-1', teams: [BAH, COY], scores: [1, 2], winner: 1, next: { winner: 'lb-semi' } },
      { id: 'lb-r2-2', teams: [DES, SAH], scores: [0, 2], winner: 1, next: { winner: 'lb-semi' } },
    ],
  },
  {
    name: 'Lower semi',
    meta: 'Bo3',
    matches: [
      { id: 'lb-semi', teams: [COY, SAH], scores: [0, 2], winner: 1, next: { winner: 'lb-final' } },
    ],
  },
  {
    name: 'Lower final',
    meta: 'Bo3',
    matches: [
      { id: 'lb-final', teams: [SAH, PIT], scores: [2, 1], winner: 0, next: { winner: 'gf' } },
    ],
  },
]

const GRAND: BracketGrandFinal = {
  meta: 'Bo5',
  match: { id: 'gf', teams: [COB, SAH], scores: [1, 3], winner: 1 },
  reset: { teams: [COB, SAH], scores: [2, 3], winner: 1 },
}

/** The same bracket where Cobras Sonora, unbeaten, take the grand final: no reset is played. */
const GRAND_NO_RESET: BracketGrandFinal = {
  meta: 'Bo5',
  match: { id: 'gf', teams: [COB, SAH], scores: [3, 1], winner: 0 },
}

/** Mid-event: the lower semi is live, so the lower final and the grand final wait. */
const LOWER_LIVE: BracketRound[] = [
  LOWER[0] as BracketRound,
  LOWER[1] as BracketRound,
  {
    name: 'Lower semi',
    meta: 'Bo3',
    matches: [{ id: 'lb-semi', teams: [COY, SAH], scores: [0, 1], next: { winner: 'lb-final' } }],
  },
  {
    name: 'Lower final',
    meta: 'Bo3',
    matches: [{ id: 'lb-final', teams: [{ name: 'TBD' }, PIT], next: { winner: 'gf' } }],
  },
]
const GRAND_LIVE: BracketGrandFinal = {
  meta: 'Bo5',
  match: { id: 'gf', teams: [COB, { name: 'TBD' }] },
}

/** The mockup's stage: a surface card with a faint 32px grid fading in toward the trophy. */
function Stage({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-surface p-1 shadow-card">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background:linear-gradient(var(--sk-line-soft)_1px,transparent_1px)_0_0/32px_32px,linear-gradient(90deg,var(--sk-line-soft)_1px,transparent_1px)_0_0/32px_32px] [mask-image:radial-gradient(90%_110%_at_78%_50%,black,transparent_80%)]"
      />
      {children}
    </div>
  )
}

/** An event page's header above the stage. */
function EventPage({
  title,
  status,
  wide = false,
  children,
}: {
  title: string
  status: string
  /** A double-elimination bracket has seven columns: give it room before it scrolls. */
  wide?: boolean
  children: ReactNode
}) {
  return (
    <section
      className={`mx-auto flex flex-col gap-4 ${wide ? 'max-w-[1760px]' : 'max-w-[1148px]'}`}
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="m-0 font-sans text-xs font-semibold tracking-eyebrow text-text-faint uppercase">
            Sukuna Invitational · Season 04
          </p>
          <h2 className="m-0 mt-1 font-display text-2xl font-extrabold tracking-tight text-text">
            {title}
          </h2>
        </div>
        <p className="m-0 flex items-center gap-2 font-sans text-sm text-text-dim">
          <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
          {status}
        </p>
      </header>
      <Stage>{children}</Stage>
    </section>
  )
}

// Annotated (not `satisfies`): the props are a single | double union, and a story may switch `format`.
const meta: Meta<typeof BracketBeam> = {
  title: 'FX/BracketBeam',
  component: BracketBeam,
  tags: ['autodocs'],
  args: {
    rounds: EIGHT,
    champion: 'Crimson Vow',
    championMeta: (
      <>
        <b>3–1</b> grand final · seed 1
      </>
    ),
    trophyMeta: 'S04',
    paused: false,
  },
  argTypes: {
    rounds: { control: false },
    upper: { control: false },
    lower: { control: false },
    grandFinal: { control: false },
    championMeta: { control: false },
    dropLabel: { control: false },
    dropSpokenLabel: { control: false },
  },
  render: (args) => (
    <EventPage title="Playoffs" status="Final · 8 teams · single elimination">
      <BracketBeam {...args} />
    </EventPage>
  ),
}

export default meta
type Story = StoryObj<typeof BracketBeam>

/** The approved mockup: eight teams, the champion's path lit by a beam, round by round. */
export const Playground: Story = {}

/**
 * A phone-width screen: the bracket is wider than its container, so it scrolls sideways, becomes a
 * keyboard tab stop, and follows the beam until you scroll it yourself.
 */
export const Phone: Story = {
  render: (args) => (
    <div className="mx-auto flex w-[360px] flex-col gap-3">
      <header className="flex items-center justify-between px-1">
        <div>
          <p className="m-0 font-sans text-xs font-semibold tracking-eyebrow text-text-faint uppercase">
            Season 04
          </p>
          <h2 className="m-0 mt-0.5 font-display text-xl font-extrabold tracking-tight text-text">
            Playoffs
          </h2>
        </div>
        <span className="font-sans text-xs text-text-dim">Final</span>
      </header>
      <Stage>
        <BracketBeam {...args} />
      </Stage>
    </div>
  ),
}

/** Four rounds: the beam takes one more hop and the loop stretches to fit. */
export const SixteenTeams: Story = {
  args: {
    rounds: sixteen(),
    championMeta: (
      <>
        <b>3–2</b> grand final · seed 1
      </>
    ),
  },
  render: (args) => (
    <EventPage title="Main event" status="Final · 16 teams · single elimination">
      <BracketBeam {...args} />
    </EventPage>
  ),
}

/** Before the final: no champion yet, so the bracket is static (no beams, no trophy card). */
export const InProgress: Story = {
  args: { rounds: IN_PROGRESS, champion: undefined, championMeta: undefined },
  render: (args) => (
    <EventPage title="Playoffs" status="Live · semi-final 2, map 3">
      <BracketBeam {...args} />
    </EventPage>
  ),
}

const DOUBLE_ARGS = {
  format: 'double',
  rounds: undefined,
  upper: UPPER,
  lower: LOWER,
  trophyMeta: 'Otoño',
} as const

/**
 * Double elimination: the champion comes back from the lower bracket. Sahuaros lose the upper
 * semi-final (lit, with its "▼ SF1" drop chip in the lower bracket), win the lower bracket, the
 * grand final and the reset. The beam follows them through the drop.
 */
export const DoubleElimination: Story = {
  args: {
    ...DOUBLE_ARGS,
    grandFinal: GRAND,
    champion: 'Sahuaros',
    championMeta: (
      <>
        <b>3–2</b> reset · from the lower bracket
      </>
    ),
  },
  render: (args) => (
    <EventPage wide title="Copa Otoño" status="Final · 8 teams · double elimination">
      <BracketBeam {...args} />
    </EventPage>
  ),
}

/** The upper bracket's unbeaten team wins the grand final, so the reset never happens. */
export const DoubleNoReset: Story = {
  args: {
    ...DOUBLE_ARGS,
    grandFinal: GRAND_NO_RESET,
    champion: 'Cobras Sonora',
    championMeta: (
      <>
        <b>3–1</b> grand final · unbeaten
      </>
    ),
  },
  render: DoubleElimination.render,
}

/** Mid-event, no champion yet: static, with drop chips naming where each lower team came from. */
export const DoubleStatic: Story = {
  args: {
    ...DOUBLE_ARGS,
    lower: LOWER_LIVE,
    grandFinal: GRAND_LIVE,
    champion: undefined,
    championMeta: undefined,
  },
  render: (args) => (
    <EventPage wide title="Copa Otoño" status="Live · lower semi, map 2">
      <BracketBeam {...args} />
    </EventPage>
  ),
}
