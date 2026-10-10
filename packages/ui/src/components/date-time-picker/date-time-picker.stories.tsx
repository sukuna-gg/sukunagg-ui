import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import type { CalendarMark } from '../calendar'
import { Field } from '../field'
import { DateTimePicker } from './index'

const TODAY = '2026-10-09'

const tournamentDays: Record<string, CalendarMark[]> = {
  '2026-10-17': [{ label: 'Copa Otoño · Valorant 5v5', color: 'var(--sk-chart-1)' }],
  '2026-10-24': [{ label: 'Copa Smash 1v1', color: 'var(--sk-chart-5)' }],
  '2026-11-14': [{ label: 'Copa Pitaya · Valorant 5v5', color: 'var(--sk-chart-1)' }],
}

const esLabels = {
  placeholder: 'Elige fecha y hora',
  time: 'Hora de inicio',
  done: 'Listo',
  dialog: 'Elegir fecha y hora',
  yourTime: (zone: string) => `Tu hora (${zone})`,
  skipped: 'No existe por el horario de verano',
  previousMonth: 'Mes anterior',
  nextMonth: 'Mes siguiente',
  chooseYear: 'Elegir año',
  selected: 'seleccionado',
  unavailable: 'no disponible',
}

const meta = {
  title: 'Components/DateTimePicker',
  component: DateTimePicker,
  tags: ['autodocs'],
  args: { 'aria-label': 'Start', timeZone: 'America/Hermosillo', today: TODAY },
  argTypes: {
    variant: { control: 'inline-radio', options: ['filled', 'outline', 'ghost'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    step: { control: 'inline-radio', options: [5, 10, 15, 20, 30, 60] },
  },
  decorators: [(Story) => <div style={{ minHeight: 460 }}>{Story()}</div>],
} satisfies Meta<typeof DateTimePicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Pitaya's tournament form: Spanish, venue time, dots on days that already have a tournament. */
export const TournamentForm: Story = {
  render: () => {
    const [startsAt, setStartsAt] = useState<string | null>('2026-11-15T01:00:00.000Z')
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        <Field>
          <Field.Label htmlFor="starts">Inicio</Field.Label>
          <DateTimePicker
            id="starts"
            name="startsAt"
            timeZone="America/Hermosillo"
            zoneLabel="Hora de Hermosillo · UTC−7"
            locale="es-MX"
            labels={esLabels}
            min={TODAY}
            today={TODAY}
            step={30}
            minTime="10:00"
            maxTime="23:30"
            marks={(d) => tournamentDays[d] ?? null}
            value={startsAt}
            onValueChange={setStartsAt}
          />
        </Field>
        <code style={{ fontSize: 12 }}>name="startsAt" = "{startsAt ?? ''}"</code>
      </div>
    )
  },
}

/** New York, March 8 2026: 2:00 and 2:30 AM don't exist, so they're off. */
export const DstGap: Story = {
  args: {
    timeZone: 'America/New_York',
    defaultValue: '2026-03-08T06:00:00.000Z',
    minTime: '00:00',
    maxTime: '05:00',
  },
}

export const Window: Story = { args: { minTime: '10:00', maxTime: '23:30' } }

export const Step15: Story = { args: { step: 15, defaultValue: '2026-11-15T01:00:00.000Z' } }

export const Disabled: Story = {
  args: { disabled: true, defaultValue: '2026-11-15T01:00:00.000Z' },
}
