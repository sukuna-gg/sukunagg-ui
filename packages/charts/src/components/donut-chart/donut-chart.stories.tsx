import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { DonutChart } from './index'

// Sample data, for the stories only.
const roles = [
  { role: 'Duelist', hours: 97 },
  { role: 'Initiator', hours: 61 },
  { role: 'Controller', hours: 33 },
  { role: 'Sentinel', hours: 21 },
]
const queues = [
  { queue: 'Ranked', games: 142 },
  { queue: 'Normal', games: 58 },
  { queue: 'Hyper Roll', games: 31 },
  { queue: 'Double Up', games: 17 },
  { queue: 'ARAM', games: 9 },
  { queue: 'Custom', games: 4 },
]

// A typed decorator: an inline one makes Storybook infer `never` args for a generic component.
const narrow: Decorator = (Story) => <div style={{ maxWidth: 420 }}>{Story()}</div>

const meta = {
  title: 'Charts/DonutChart',
  component: DonutChart<(typeof roles)[number]>,
  tags: ['autodocs'],
  args: {
    'aria-label': 'Time played by role, this act',
    data: roles,
    x: 'role',
    y: 'hours',
    centerCaption: 'hours',
  },
  decorators: [narrow],
} satisfies Meta<typeof DonutChart<(typeof roles)[number]>>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const TimeByRole: Story = {}

/** Six parts: three colored, the rest fold into "Other". */
export const WithOther: Story = {
  render: () => (
    <DonutChart
      aria-label="Games by queue"
      data={queues}
      x="queue"
      y="games"
      centerCaption="games"
    />
  ),
}

export const Empty: Story = {
  render: () => (
    <DonutChart
      aria-label="Time played by role"
      data={roles.map((r) => ({ ...r, hours: null }))}
      x="role"
      y="hours"
      empty={{ title: 'No games this act', description: 'Roles show up after the first game.' }}
    />
  ),
}

export const Loading: Story = { args: { loading: true } }
