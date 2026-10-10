import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import type { DateRange } from '../calendar'
import { DateRangePicker } from './index'

const TODAY = '2026-10-09'

// sukuna-gg-web style: games per day since tracking started (sample data, deterministic).
const gamesByDay = new Map<string, number>()
{
  let seed = 12
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  for (
    let d = new Date(Date.UTC(2026, 8, 8));
    d <= new Date(Date.UTC(2026, 9, 9));
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const n = rand() < 0.22 ? 0 : 1 + Math.floor(rand() * 6)
    if (n) gamesByDay.set(d.toISOString().slice(0, 10), n)
  }
}
const countGames = (r: DateRange) => {
  let n = 0
  for (const [d, g] of gamesByDay) if (d >= r.start && d <= r.end) n += g
  return n
}
const days = (r: DateRange) => (Date.parse(r.end) - Date.parse(r.start)) / 86_400_000 + 1

const meta = {
  title: 'Components/DateRangePicker',
  component: DateRangePicker,
  tags: ['autodocs'],
  args: { 'aria-label': 'Dates', today: TODAY },
  argTypes: {
    variant: { control: 'inline-radio', options: ['filled', 'outline', 'ghost'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  decorators: [(Story) => <div style={{ minHeight: 480 }}>{Story()}</div>],
} satisfies Meta<typeof DateRangePicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithPresets: Story = {
  args: {
    presets: ['today', 'last7', 'last30', 'thisMonth', 'lastMonth', 'last90'],
    defaultValue: { start: '2026-09-10', end: TODAY },
  },
}

/** sukuna-gg-web match history: dots on days with games, a summary with the game count, no future. */
export const MatchHistory: Story = {
  render: () => {
    const [range, setRange] = useState<DateRange | null>({ start: '2026-09-10', end: TODAY })
    return (
      <div style={{ display: 'grid', gap: 12, justifyItems: 'start' }}>
        <DateRangePicker
          aria-label="Games played between"
          today={TODAY}
          max={TODAY}
          value={range}
          onValueChange={setRange}
          presets={['last7', 'last30', 'thisMonth', 'lastMonth', 'last90']}
          marks={(d) => (gamesByDay.has(d) ? [{ label: `${gamesByDay.get(d)} games` }] : null)}
          summary={(r) => `${days(r)} days · ${countGames(r)} games`}
        />
        <code style={{ fontSize: 12 }}>
          ?from={range?.start}&amp;to={range?.end}
        </code>
      </div>
    )
  },
}

export const OneMonth: Story = { args: { months: 1 } }

/** No Apply step: the second click commits and closes. */
export const SelectToCommit: Story = { args: { commit: 'select', presets: ['last7', 'last30'] } }

export const MinMaxDays: Story = {
  args: { minDays: 3, maxDays: 14, min: '2026-09-01', max: '2026-12-31' },
}

/** Narrow screens: one month, presets in a scrolling row. */
export const Narrow: Story = {
  args: { presets: ['today', 'last7', 'last30', 'thisMonth', 'lastMonth'], months: 1 },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
}
