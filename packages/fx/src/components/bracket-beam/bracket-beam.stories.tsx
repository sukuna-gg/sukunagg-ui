import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'
import { BracketBeam, type BracketRound, type BracketTeamInfo } from './index'

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
  children,
}: {
  title: string
  status: string
  children: ReactNode
}) {
  return (
    <section className="mx-auto flex max-w-[1148px] flex-col gap-4">
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

const meta = {
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
    championMeta: { control: false },
  },
  render: (args) => (
    <EventPage title="Playoffs" status="Final · 8 teams · single elimination">
      <BracketBeam {...args} />
    </EventPage>
  ),
} satisfies Meta<typeof BracketBeam>

export default meta
type Story = StoryObj<typeof meta>

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
