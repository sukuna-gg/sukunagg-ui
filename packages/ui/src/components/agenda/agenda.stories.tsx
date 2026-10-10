import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from '../badge'
import { Button } from '../button'
import { Agenda, type CalendarEvent } from './index'

// Pitaya-style game colors live in the app; the stories stand them in with chart tokens.
const VALORANT = 'var(--sk-chart-1)'
const LOL = 'var(--sk-chart-2)'
const SMASH = 'var(--sk-chart-4)'
const TFT = 'var(--sk-chart-5)'
const FC = 'var(--sk-chart-6)'

// Fixed so the stories never change: Friday, October 9, 2026, in Hermosillo (UTC-7).
const TODAY = '2026-10-09'
const HMO = 'America/Hermosillo'
const es = { allDay: 'Todo el día', ongoing: 'Continúa' }

const upcoming: CalendarEvent[] = [
  {
    id: 'copa-otono',
    title: 'Copa Otoño · Valorant 5v5',
    start: '2026-10-10T01:00:00Z', // viernes 18:00
    color: VALORANT,
    href: '#copa-otono',
    meta: 'Valorant · Presencial · Plaza Pitaya',
    status: (
      <Badge tone="success" size="sm">
        Abierto
      </Badge>
    ),
  },
  {
    id: 'relampago-tft',
    title: 'Relámpago TFT',
    start: '2026-10-10T23:00:00Z', // sábado 16:00
    color: TFT,
    href: '#relampago-tft',
    meta: 'TFT · En línea',
    status: <Badge size="sm">Lleno</Badge>,
  },
  {
    id: 'smash-viernes',
    title: 'Smash Viernes',
    start: '2026-10-17T02:00:00Z', // viernes 16, 19:00
    color: SMASH,
    href: '#smash-viernes',
    meta: 'Smash Ultimate · Presencial',
  },
  {
    id: 'copa-fc',
    title: 'Copa EA FC 26',
    start: '2026-10-18T20:00:00Z', // domingo 18, 13:00
    color: FC,
    href: '#copa-fc',
    meta: 'EA FC · Presencial',
    status: (
      <Badge tone="accent" variant="soft" size="sm">
        Últimos lugares
      </Badge>
    ),
  },
  {
    id: 'final-regional',
    title: 'Final Regional · Valorant',
    start: '2026-10-21T01:30:00Z', // martes 20, 18:30
    color: VALORANT,
    href: '#final-regional',
    meta: 'Valorant · Presencial · Auditorio',
  },
]

const multiDay: CalendarEvent[] = [
  {
    id: 'temporada',
    title: 'Temporada Ranked Otoño',
    start: '2026-09-28',
    end: '2026-10-25',
    color: LOL,
    meta: 'League of Legends · En línea',
  },
  ...upcoming.slice(0, 2),
  {
    id: 'liga-semana-3',
    title: 'Liga Pitaya LoL · Semana 3',
    start: '2026-10-12',
    end: '2026-10-16',
    color: LOL,
    href: '#liga',
    meta: 'League of Legends · En línea',
  },
  {
    id: 'lan',
    title: 'LAN de Noche',
    start: '2026-10-17T03:00:00Z', // viernes 16, 20:00
    end: '2026-10-17T13:00:00Z', // sábado 17, 06:00
    color: SMASH,
    href: '#lan',
    meta: 'Varios juegos · Presencial',
  },
]

const meta = {
  title: 'Components/Agenda',
  component: Agenda,
  tags: ['autodocs'],
  args: {
    events: upcoming,
    today: TODAY,
    timeZone: HMO,
    locale: 'es-MX',
    labels: es,
    days: 21,
    'aria-label': 'Próximos torneos',
  },
  argTypes: {
    headingLevel: { control: 'inline-radio', options: [2, 3, 4, 5] },
    events: { control: false },
    labels: { control: false },
  },
  decorators: [(Story) => <div style={{ maxWidth: 560 }}>{Story()}</div>],
} satisfies Meta<typeof Agenda>

export default meta
type Story = StoryObj<typeof meta>

/** Pitaya's "próximos torneos": today and tomorrow named, empty days skipped, status badges. */
export const Upcoming: Story = {}

/**
 * A season that started before today is listed first under today ("Continúa"); a week-long
 * league and an overnight LAN are listed once, on their first day, with their range.
 */
export const WithMultiDay: Story = {
  args: { events: multiDay },
}

/** In a fixed height the day headings pin while the list scrolls. */
export const Scrolling: Story = {
  args: {
    events: [...multiDay, ...upcoming.slice(2)],
    className: 'max-h-[320px] overflow-y-auto rounded-md border border-line bg-surface',
  },
}

export const Empty: Story = {
  args: {
    events: [],
    empty: {
      title: 'No hay torneos en las próximas 3 semanas',
      children: 'Anunciamos fechas primero en nuestras redes.',
      actions: (
        <Button as="a" href="#avisos" variant="secondary" size="sm">
          Activar avisos
        </Button>
      ),
    },
  },
}

export const Loading: Story = {
  args: { loading: true },
}

/** English defaults, side by side in both themes. */
export const BothThemes: Story = {
  args: { locale: 'en-US', labels: undefined, 'aria-label': 'Upcoming tournaments' },
  parameters: { sideBySide: true },
}
