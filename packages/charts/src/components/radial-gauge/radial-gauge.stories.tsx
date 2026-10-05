import type { Meta, StoryObj } from '@storybook/react-vite'
import { RadialGauge } from './index'

const meta = {
  title: 'Charts/RadialGauge',
  component: RadialGauge,
  tags: ['autodocs'],
  args: {
    value: 64,
    label: 'LP to next division',
    caption: 'of 100 LP',
    description: 'Diamond II → I',
  },
} satisfies Meta<typeof RadialGauge>

export default meta
type Story = StoryObj<typeof meta>

const row = { display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'start' } as const

export const Playground: Story = {}

export const RankProgress: Story = {}

export const PlanUsage: Story = {
  args: {
    value: 8400,
    max: 10000,
    label: 'API calls',
    valueLabel: '84%',
    caption: '8.4K of 10K',
    description: 'Pro plan, resets Oct 31',
    color: 'var(--sk-chart-2)',
  },
}

/** Missing is never 0: track only, "—", announced as not reported. */
export const NotReported: Story = {
  args: { value: null, caption: 'Unranked', description: 'No ranked games this season' },
}

export const Sizes: Story = {
  render: (args) => (
    <div style={row}>
      <RadialGauge {...args} size={110} thickness={10} />
      <RadialGauge {...args} />
      <RadialGauge {...args} size={200} thickness={16} />
    </div>
  ),
}
