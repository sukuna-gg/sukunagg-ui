import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../button'
import { Card } from '../card'
import { EmptyState } from './index'

const icon = (d: string) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
)
const clock = icon('M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 7.5V12l3 2')
const search = icon('M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.2-4.2')
const alert = icon('M12 4.5l8.5 15h-17zM12 10v4M12 17h.01')

const meta = {
  title: 'Components/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  args: {
    title: 'No games in Set 18 yet',
    icon: clock,
    children: "kairo hasn't played this set yet. Their latest games are from Set 17.",
  },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const NoGamesYet: Story = {
  args: {
    actions: (
      <Button variant="secondary" size="sm">
        Show Set 17
      </Button>
    ),
  },
}

export const NotFound: Story = {
  args: {
    icon: search,
    title: 'No player called missing#404 on NA',
    children: 'Check the spelling, or try another region.',
    actions: (
      <>
        <Button variant="secondary" size="sm">
          Try EUW
        </Button>
        <Button variant="secondary" size="sm">
          Try LAN
        </Button>
      </>
    ),
  },
}

/** Shown after a failed refresh, so it's announced: `role="status"`. */
export const ServiceDown: Story = {
  args: {
    icon: alert,
    role: 'status',
    title: "Riot isn't answering",
    children: "Your stored games are below. We'll try again in a minute.",
    actions: (
      <Button variant="secondary" size="sm">
        Retry now
      </Button>
    ),
  },
}

export const InsideCard: Story = {
  render: (args) => (
    <Card style={{ maxWidth: 420 }}>
      <EmptyState {...args} />
    </Card>
  ),
}

export const Panel: Story = {
  args: { surface: 'panel' },
}

/** The size charts use inside an empty plot area. */
export const Small: Story = {
  args: {
    size: 'sm',
    title: 'No ranked games in the last 20',
    children: 'Switch to all queues, or play a ranked game.',
    actions: (
      <Button variant="secondary" size="sm">
        Show all queues
      </Button>
    ),
  },
}
