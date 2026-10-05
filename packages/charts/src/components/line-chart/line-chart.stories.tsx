import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { AreaChart, LineChart } from './index'

// Sample data, for the stories only (deterministic so screenshots are stable).
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}
const r1 = seeded(42)
const rating: { match: number; rating: number }[] = []
for (let i = 1, v = 1838; i <= 30; i++) {
  v += Math.round((r1() - 0.4) * 42)
  rating.push({ match: i, rating: v })
}
const weeks = [
  'Jul 13',
  'Jul 20',
  'Jul 27',
  'Aug 3',
  'Aug 10',
  'Aug 17',
  'Aug 24',
  'Aug 31',
  'Sep 7',
  'Sep 14',
  'Sep 21',
  'Sep 28',
]
const r2 = seeded(7)
const damage = weeks.map((week, i) => ({
  week,
  duelist: Math.round(148 + i * 1.6 + (r2() - 0.5) * 14),
  initiator: Math.round(129 + Math.sin(i / 2) * 6 + (r2() - 0.5) * 10),
  controller: Math.round(104 + i * 0.8 + (r2() - 0.5) * 10),
}))
const games = [3, 5, 1, 2, 7, 4, 4, 2, 6, 1, 3, 8, 2, 4, 5, 1, 3, 2, 6, 2].map((placement, i) => ({
  game: i + 1,
  placement,
}))
const placeColor = (p: number) =>
  p === 1 ? 'var(--sk-premium)' : p <= 4 ? 'var(--sk-chart-3)' : 'var(--sk-chart-other)'
const r3 = seeded(5)
const gold: { minute: number; gold: number | null }[] = []
for (let m = 0, v = 0; m <= 31; m++) {
  if (m > 0) v += Math.round((r3() - 0.47) * 900 + (m > 18 ? 260 : 0))
  gold.push({ minute: m, gold: v })
}

// A typed decorator: an inline one makes Storybook infer `never` args for a generic component.
const narrow: Decorator = (Story) => <div style={{ maxWidth: 640 }}>{Story()}</div>

const meta = {
  title: 'Charts/LineChart',
  component: LineChart<(typeof damage)[number]>,
  tags: ['autodocs'],
  args: {
    'aria-label': 'Damage per round by role, weekly average',
    data: damage,
    x: 'week',
    series: [
      { key: 'duelist', label: 'Duelist' },
      { key: 'initiator', label: 'Initiator' },
      { key: 'controller', label: 'Controller' },
    ],
  },
  decorators: [narrow],
} satisfies Meta<typeof LineChart<(typeof damage)[number]>>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

/** AreaChart, one series: the latest value is labelled at the end. */
export const Rating: Story = {
  render: () => (
    <AreaChart
      aria-label="Ranked rating, last 30 matches"
      data={rating}
      x="match"
      xFormat={(m) => `Match ${m}`}
      series={[{ key: 'rating', label: 'Rating' }]}
      curve="monotone"
    />
  ),
}

export const DamageByRole: Story = {}

/** 1st on top, a Top 4 band, an average line and per-point placement colors. */
export const PlacementOverTime: Story = {
  render: () => (
    <LineChart
      aria-label="Placement over the last 20 games"
      data={games}
      x="game"
      xFormat={(g) => `Game ${g}`}
      series={[{ key: 'placement', label: 'Placement', color: 'var(--sk-text-faint)' }]}
      reverse
      yDomain={[0.5, 8.5]}
      yTickValues={[1, 4, 8]}
      yTickFormat={(v) => (v === 1 ? '1st' : `${v}th`)}
      band={{ from: 0.5, to: 4.5, label: 'Top 4' }}
      references={[{ value: 3.55, label: 'avg 3.55' }]}
      pointColor={(g) => placeColor(g.placement)}
      endLabels={false}
    />
  ),
}

/** Diverging fill around 0: who is ahead, by how much. */
export const GoldDifference: Story = {
  render: () => (
    <AreaChart
      aria-label="Gold difference, blue minus red, by minute"
      data={gold}
      x="minute"
      xFormat={(m) => `${m}m`}
      series={[{ key: 'gold', label: 'Blue − red' }]}
      valueFormat={{ notation: 'compact', signDisplay: 'exceptZero' }}
      baseline={0}
      symmetric
      above="var(--sk-chart-2)"
      below="var(--sk-chart-1)"
      legend={[
        { label: 'Blue side ahead', color: 'var(--sk-chart-2)' },
        { label: 'Red side ahead', color: 'var(--sk-chart-1)' },
      ]}
      endLabels={false}
    />
  ),
}

/** Missing minutes break the line and are shaded "Not reported". */
export const WithGaps: Story = {
  render: () => (
    <AreaChart
      aria-label="Gold difference with missing minutes"
      data={gold.map((g) => (g.minute >= 9 && g.minute <= 11 ? { ...g, gold: null } : g))}
      x="minute"
      xFormat={(m) => `${m}m`}
      series={[{ key: 'gold', label: 'Blue − red' }]}
      valueFormat={{ notation: 'compact', signDisplay: 'exceptZero' }}
      baseline={0}
      symmetric
      above="var(--sk-chart-2)"
      below="var(--sk-chart-1)"
      endLabels={false}
    />
  ),
}

export const Empty: Story = {
  render: () => (
    <AreaChart
      aria-label="Gold difference"
      data={[{ minute: 0, gold: 0 }]}
      x="minute"
      series={[{ key: 'gold', label: 'Gold' }]}
      empty={{
        title: 'Not enough of the game recorded for a graph',
        description: 'Riot sent less than two minutes of the timeline.',
      }}
    />
  ),
}

export const Loading: Story = { args: { loading: true } }

export const Static: Story = { args: { interactive: false } }
