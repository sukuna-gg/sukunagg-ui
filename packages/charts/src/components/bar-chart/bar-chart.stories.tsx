import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { BarChart } from './index'

// Sample data, for the stories only.
const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
const placements = [4, 3, 3, 2, 3, 2, 2, 1].map((games, i) => ({ place: ORD[i] as string, games }))
const bucket = (i: number) =>
  i === 0 ? 'var(--sk-premium)' : i < 4 ? 'var(--sk-chart-3)' : 'var(--sk-chart-other)'
const kills = [
  { weapon: 'Rifles', s3: 812, s4: 944 },
  { weapon: 'SMGs', s3: 402, s4: 361 },
  { weapon: 'Snipers', s3: 188, s4: 241 },
  { weapon: 'Pistols', s3: 233, s4: 259 },
  { weapon: 'Shotguns', s3: 96, s4: 74 },
]
const mrr = [
  { month: 'Apr', starter: 14.2, pro: 18.9, team: 6.1 },
  { month: 'May', starter: 14.8, pro: 20.4, team: 7.3 },
  { month: 'Jun', starter: 15.1, pro: 21.8, team: 8.8 },
  { month: 'Jul', starter: 15.6, pro: 23.9, team: 9.4 },
  { month: 'Aug', starter: 15.9, pro: 25.7, team: 11.2 },
  { month: 'Sep', starter: 16.3, pro: 27.1, team: 12.6 },
]
const picks = [
  { agent: 'Jett', rate: 31.4 },
  { agent: 'Omen', rate: 24.9 },
  { agent: 'Sova', rate: 22.1 },
  { agent: 'Killjoy', rate: 17.6 },
  { agent: 'Raze', rate: 14.8 },
  { agent: 'Skye', rate: 9.3 },
]

// A typed decorator: an inline one makes Storybook infer `never` args for a generic component.
const narrow: Decorator = (Story) => <div style={{ maxWidth: 560 }}>{Story()}</div>

const meta = {
  title: 'Charts/BarChart',
  component: BarChart<(typeof kills)[number]>,
  tags: ['autodocs'],
  args: {
    'aria-label': 'Kills by weapon, Season 3 vs Season 4',
    data: kills,
    x: 'weapon',
    series: [
      { key: 's3', label: 'Season 3' },
      { key: 's4', label: 'Season 4' },
    ],
  },
  decorators: [narrow],
} satisfies Meta<typeof BarChart<(typeof kills)[number]>>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

/** One color per bar from the app's palette, explained by legend items; values on the bars. */
export const PlacementDistribution: Story = {
  render: () => (
    <BarChart
      aria-label="Placement distribution, last 20 ranked games"
      data={placements}
      x="place"
      series={[{ key: 'games', label: 'Games', color: (_row, i) => bucket(i) }]}
      legend={[
        { label: '1st', color: 'var(--sk-premium)' },
        { label: 'Top 4', color: 'var(--sk-chart-3)' },
        { label: 'Bottom 4', color: 'var(--sk-chart-other)' },
      ]}
      valueLabels
      table="details"
    />
  ),
}

export const Grouped: Story = {}

export const Stacked: Story = {
  render: () => (
    <BarChart
      aria-label="MRR by plan, thousands of USD"
      layout="stacked"
      data={mrr}
      x="month"
      series={[
        { key: 'starter', label: 'Starter' },
        { key: 'pro', label: 'Pro' },
        { key: 'team', label: 'Team' },
      ]}
      valueFormat={(v) => `$${Number.isInteger(v) ? v : v.toFixed(1)}K`}
      valueLabels
    />
  ),
}

export const Horizontal: Story = {
  render: () => (
    <BarChart
      aria-label="Pick rate, top agents"
      layout="horizontal"
      data={picks}
      x="agent"
      series={[{ key: 'rate', label: 'Pick rate' }]}
      valueFormat={(v) => `${v.toFixed(1)}%`}
    />
  ),
}

/** `null` draws no bar and labels "–"; a real 0 labels "0". */
export const MissingValues: Story = {
  render: () => (
    <BarChart
      aria-label="Placement distribution, 3 ranked games"
      data={[1, 0, 1, 0, null, 1, 0, 0].map((games, i) => ({ place: ORD[i] as string, games }))}
      x="place"
      series={[{ key: 'games', label: 'Games', color: (_row, i) => bucket(i) }]}
      valueLabels
    />
  ),
}

export const Empty: Story = {
  render: () => (
    <BarChart
      aria-label="Placement distribution, last 20 ranked games"
      data={ORD.map((place) => ({ place, games: null }))}
      x="place"
      series={[{ key: 'games', label: 'Games' }]}
      empty={{
        title: 'No ranked games in the last 20',
        description: 'Switch to all queues, or play a ranked game.',
      }}
    />
  ),
}

export const Loading: Story = { args: { loading: true } }

/** No client island: zero chart JavaScript on the page. */
export const Static: Story = { args: { interactive: false } }
