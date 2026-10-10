import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Calendar, type CalendarMark, type DateRange } from './index'

// Fixed "today" so the stories never drift.
const TODAY = '2026-10-09'

// Pitaya-style schedule: days that already have a tournament (game colors stand in as chart tokens).
const tournaments: Record<string, CalendarMark[]> = {
  '2026-10-10': [
    { label: 'Relámpago TFT', color: 'var(--sk-chart-3)' },
    { label: 'Liga Pitaya · LoL J5', color: 'var(--sk-chart-2)' },
    { label: 'Torneo EA FC 26', color: 'var(--sk-chart-4)' },
  ],
  '2026-10-14': [{ label: 'Scrims abiertos · Valorant', color: 'var(--sk-chart-1)' }],
  '2026-10-17': [
    { label: 'Relámpago TFT', color: 'var(--sk-chart-3)' },
    { label: 'Copa Otoño · Valorant 5v5', color: 'var(--sk-chart-1)' },
  ],
  '2026-10-21': [{ label: 'Liga Pitaya · LoL J6', color: 'var(--sk-chart-2)' }],
  '2026-10-24': [{ label: 'Copa Smash 1v1', color: 'var(--sk-chart-5)' }],
  '2026-10-31': [{ label: 'Halloween Cup · EA FC 26', color: 'var(--sk-chart-4)' }],
}

const meta = {
  title: 'Components/Calendar',
  component: Calendar,
  tags: ['autodocs'],
  args: { 'aria-label': 'Tournament day', defaultValue: '2026-10-17', today: TODAY },
} satisfies Meta<typeof Calendar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Pitaya: past days off, dots on days that already have tournaments. */
export const WithMarks: Story = {
  args: { min: TODAY, marks: (d: string) => tournaments[d] ?? null },
}

export const Range: Story = {
  render: () => {
    const [range, setRange] = useState<DateRange | null>({ start: '2026-10-05', end: '2026-10-16' })
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <Calendar
          aria-label="Registration window"
          mode="range"
          value={range}
          onValueChange={setRange}
          today={TODAY}
        />
        <code style={{ fontSize: 12 }}>{JSON.stringify(range)}</code>
      </div>
    )
  },
}

/** sukuna-gg-web match history: two months, nothing after today. */
export const TwoMonths: Story = {
  args: {
    'aria-label': 'Games played between',
    mode: 'range',
    months: 2,
    max: TODAY,
    defaultMonth: '2026-09-01',
    defaultValue: { start: '2026-09-10', end: TODAY },
  },
}

export const MinMax: Story = {
  args: { min: TODAY, max: '2026-12-31', defaultValue: undefined, defaultMonth: TODAY },
}

export const DisabledWithReasons: Story = {
  args: {
    defaultValue: undefined,
    defaultMonth: '2026-10-01',
    isDateDisabled: (d: string) => (d < TODAY ? 'In the past' : d === '2026-10-17' ? 'Full' : null),
  },
}

/** A birth date: opens on the year grid, nothing after 18 years ago. */
export const YearView: Story = {
  args: {
    'aria-label': 'Birth date',
    defaultValue: undefined,
    defaultView: 'year',
    max: '2008-10-09',
    min: '1920-01-01',
  },
}

export const Locales: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'start' }}>
      <Calendar aria-label="en-US" locale="en-US" defaultValue="2026-11-14" today={TODAY} />
      <Calendar
        aria-label="es-MX"
        locale="es-MX"
        defaultValue="2026-11-14"
        today={TODAY}
        labels={{
          previousMonth: 'Mes anterior',
          nextMonth: 'Mes siguiente',
          chooseYear: 'Elegir año',
        }}
      />
      <Calendar aria-label="en-GB" locale="en-GB" defaultValue="2026-11-14" today={TODAY} />
    </div>
  ),
}

/** No value, month or today: an empty frame on the server, filled after mount. */
export const NoAnchor: Story = {
  args: { defaultValue: undefined, today: undefined },
}
