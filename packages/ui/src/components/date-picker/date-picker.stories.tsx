import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Field } from '../field'
import { DatePicker } from './index'

const TODAY = '2026-10-09'
const MAX_BIRTH = '2008-10-09' // 18 years before TODAY

const esLabels = {
  chooseDate: 'Elegir fecha',
  clear: 'Borrar',
  placeholderParts: { day: 'DD', month: 'MM', year: 'AAAA' },
  previousMonth: 'Mes anterior',
  nextMonth: 'Mes siguiente',
  previousYear: 'Año anterior',
  nextYear: 'Año siguiente',
  previousYears: 'Años anteriores',
  nextYears: 'Años siguientes',
  chooseYear: 'Elegir año',
  selected: 'seleccionado',
  unavailable: 'no disponible',
}

const meta = {
  title: 'Components/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  args: { 'aria-label': 'Deadline', today: TODAY },
  argTypes: {
    variant: { control: 'inline-radio', options: ['filled', 'outline', 'ghost'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  decorators: [(Story) => <div style={{ maxWidth: 320, minHeight: 420 }}>{Story()}</div>],
} satisfies Meta<typeof DatePicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Pitaya's identity form: Spanish, 18+ only, opens on the year grid. */
export const BirthDate: Story = {
  render: () => {
    const [value, setValue] = useState<string | null>(null)
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        <Field>
          <Field.Label htmlFor="birth">Fecha de nacimiento</Field.Label>
          <DatePicker
            id="birth"
            name="birthDate"
            locale="es-MX"
            labels={esLabels}
            max={MAX_BIRTH}
            min="1920-01-01"
            openTo="year"
            autoComplete="bday"
            today={TODAY}
            messages={{
              max: 'Pitaya es solo para mayores de 18 años.',
              invalid: (ex) => `Escribe una fecha como ${ex}.`,
            }}
            value={value}
            onValueChange={setValue}
          />
          <Field.Description>DD/MM/AAAA · Debes tener 18 años o más.</Field.Description>
        </Field>
        <code style={{ fontSize: 12 }}>name="birthDate" = "{value ?? ''}"</code>
      </div>
    )
  },
}

/** A server error shown with `invalid` and the field's own error line. */
export const WithField: Story = {
  render: () => (
    <Field invalid>
      <Field.Label htmlFor="deadline">Registration deadline</Field.Label>
      <DatePicker id="deadline" defaultValue="2026-10-16" invalid today={TODAY} />
      <Field.Error>The deadline must be before the tournament starts.</Field.Error>
    </Field>
  ),
}

export const MinMax: Story = {
  args: { min: TODAY, max: '2026-12-31', defaultValue: '2026-10-20' },
}

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      <DatePicker aria-label="Filled" variant="filled" defaultValue="2026-10-20" today={TODAY} />
      <DatePicker aria-label="Outline" variant="outline" defaultValue="2026-10-20" today={TODAY} />
      <DatePicker aria-label="Ghost" variant="ghost" defaultValue="2026-10-20" today={TODAY} />
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      <DatePicker aria-label="Small" size="sm" defaultValue="2026-10-20" today={TODAY} />
      <DatePicker aria-label="Medium" size="md" defaultValue="2026-10-20" today={TODAY} />
      <DatePicker aria-label="Large" size="lg" defaultValue="2026-10-20" today={TODAY} />
    </div>
  ),
}

export const Disabled: Story = { args: { disabled: true, defaultValue: '2026-10-20' } }

export const ReadOnly: Story = { args: { readOnly: true, defaultValue: '2026-10-20' } }
