import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { Heatmap } from './index'

// Sample data, for the stories only (deterministic).
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}
const r = seeded(9)
const DAY = 86_400_000
const start = Date.UTC(2026, 4, 18)
const days = Array.from({ length: 140 }, (_d, i) => {
  const t = start + i * DAY
  const weekend = [0, 6].includes(new Date(t).getUTCDay())
  const games = Math.max(0, Math.floor(r() * (weekend ? 10 : 6) - (r() < 0.3 ? 4 : 0)))
  return { day: new Date(t).toISOString().slice(0, 10), games }
})

// A typed decorator: an inline one makes Storybook infer `never` args for a generic component.
const narrow: Decorator = (Story) => <div style={{ maxWidth: 420 }}>{Story()}</div>

const meta = {
  title: 'Charts/Heatmap',
  component: Heatmap<(typeof days)[number]>,
  tags: ['autodocs'],
  args: {
    'aria-label': 'Games played, last 20 weeks',
    data: days,
    date: 'day',
    value: 'games',
    unit: 'games',
  },
  decorators: [narrow],
} satisfies Meta<typeof Heatmap<(typeof days)[number]>>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const GamesPlayed: Story = {}

/** The player was added 6 weeks in: earlier days are outlined, not empty. */
export const PartlyTracked: Story = {
  args: { data: days.slice(42) },
}

export const CustomLevels: Story = {
  args: { levels: [1, 3, 6] },
}

export const Empty: Story = {
  args: {
    data: days.map((d) => ({ ...d, games: 0 })),
    empty: { title: 'No games in the last 20 weeks' },
  },
}

export const Loading: Story = { args: { loading: true } }
