import type { Meta, StoryObj } from '@storybook/react-vite'
import { StatTile } from './index'

const meta = {
  title: 'Components/StatTile',
  component: StatTile,
  tags: ['autodocs'],
  args: { label: 'Win rate', value: '58.3%', caption: '35W 25L', tone: 'positive' },
} satisfies Meta<typeof StatTile>

export default meta
type Story = StoryObj<typeof meta>

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 12,
} as const

export const Playground: Story = {}

export const TftSummary: Story = {
  render: () => (
    <div style={grid}>
      <StatTile label="Avg. place" value="3.84" tone="positive" caption="Last 20 games" />
      <StatTile label="Top 4" value="60%" caption="12 of 20" />
      <StatTile label="Wins" value="15%" caption="3 firsts" />
      <StatTile label="Damage / game" value={null} caption="Not reported by Riot for Set 18" />
    </div>
  ),
}

/** `valueColor` takes an app color (here a token stands in for the app's KDA gold). */
export const LeagueSummary: Story = {
  render: () => (
    <div style={grid}>
      <StatTile
        label="Win rate"
        value={0.583}
        format={{ style: 'percent', maximumFractionDigits: 1 }}
        tone="positive"
        caption="35W 25L"
      />
      <StatTile label="KDA" value="3.42" valueColor="var(--sk-premium)" caption="7.1 / 4.2 / 7.3" />
      <StatTile label="CS / min" value={7.4} caption="412 gold / min" />
      <StatTile
        label="LP"
        value={64}
        caption="Diamond II"
        delta={{ value: 18, period: 'since yesterday' }}
        trend={[22, 31, 18, 40, 46, 38, 52, 64]}
      />
    </div>
  ),
}

export const Hero: Story = {
  render: () => (
    <div style={{ maxWidth: 480 }}>
      <StatTile
        size="lg"
        label="Win rate"
        value="54.2%"
        delta={{ value: 2.1, unit: ' pts', period: 'vs last act' }}
        trend={[49, 51, 50, 52, 51, 53, 52, 54, 53, 55, 54, 54.2]}
      />
    </div>
  ),
}

/** Missing is never 0: "—" plus the reason in the caption. A real 0 still shows 0. */
export const Missing: Story = {
  render: () => (
    <div style={grid}>
      <StatTile label="Damage / game" value={null} caption="Not reported by Riot for Set 18" />
      <StatTile label="Vision / min" value={null} caption="Not reported in Arena games" />
      <StatTile label="Deaths" value={0} caption="Last game" />
    </div>
  ),
}

/** Up/down × invert: color says better/worse, the arrow says direction, words go to screen readers. */
export const Deltas: Story = {
  render: () => (
    <div style={grid}>
      <StatTile label="K/D" value="1.84" delta={{ value: 0.12, period: 'vs last 20' }} />
      <StatTile
        label="Avg deaths"
        value="14.3"
        delta={{ value: -1.6, period: 'vs last 20', invert: true }}
      />
      <StatTile
        label="Churn"
        value="3.1%"
        delta={{ value: 0.4, unit: ' pts', period: 'vs Aug', invert: true }}
      />
      <StatTile label="Ranked matches" value={1284} delta={{ value: 0, period: 'vs last week' }} />
    </div>
  ),
}

export const Loading: Story = {
  render: () => (
    <div style={grid}>
      <StatTile label="Win rate" value={null} loading />
      <StatTile label="KDA" value={null} loading />
      <StatTile label="CS / min" value={null} loading />
    </div>
  ),
}

export const SansValues: Story = {
  render: () => (
    <div style={grid}>
      <StatTile
        valueFont="sans"
        label="MRR"
        value="$56.0K"
        delta={{ value: 12.4, unit: '%', period: 'vs Aug' }}
      />
      <StatTile valueFont="sans" label="Active users" value={8412} caption="Last 30 days" />
    </div>
  ),
}
