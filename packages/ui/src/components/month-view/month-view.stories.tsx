import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../button'
import { type CalendarEvent, MonthView, type MonthViewLabels } from './index'

// Pitaya-style game colors live in the app; the stories stand them in with chart tokens.
const VALORANT = 'var(--sk-chart-1)'
const LOL = 'var(--sk-chart-2)'
const FREE_FIRE = 'var(--sk-chart-3)'
const SMASH = 'var(--sk-chart-4)'
const TFT = 'var(--sk-chart-5)'
const FC = 'var(--sk-chart-6)'

// Fixed so the stories never change: Friday, October 9, 2026, in Hermosillo (UTC-7).
const TODAY = '2026-10-09'
const HMO = 'America/Hermosillo'
const monthHref = (m: string) => `#month=${m.slice(0, 7)}`

const es: Partial<MonthViewLabels> = {
  previousMonth: 'Mes anterior',
  nextMonth: 'Mes siguiente',
  today: 'Hoy',
  more: (n) => `+${n} más`,
  untracked: 'Sin registro',
  allDay: 'Todo el día',
  ongoing: 'Continúa',
}

// A Pitaya `/torneos` month. Timed events are UTC instants placed in Hermosillo time.
const torneos: CalendarEvent[] = [
  {
    id: 'liga-semana-1',
    title: 'Liga Pitaya LoL · Semana 1',
    start: '2026-09-28',
    end: '2026-10-02',
    color: LOL,
    href: '#liga',
    meta: 'League of Legends · En línea',
  },
  {
    id: 'clasificatoria-ff',
    title: 'Clasificatoria Free Fire',
    start: '2026-10-04T00:00:00Z', // sábado 3, 17:00
    color: FREE_FIRE,
    href: '#free-fire',
    meta: 'Free Fire · En línea',
  },
  {
    id: 'copa-otono',
    title: 'Copa Otoño · Valorant 5v5',
    start: '2026-10-10T01:00:00Z', // viernes 9, 18:00
    color: VALORANT,
    href: '#copa-otono',
    meta: 'Valorant · Presencial · Plaza Pitaya',
  },
  {
    id: 'relampago-tft',
    title: 'Relámpago TFT',
    start: '2026-10-10T23:00:00Z', // sábado 10, 16:00
    color: TFT,
    href: '#relampago-tft',
    meta: 'TFT · En línea',
  },
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
  },
  {
    id: 'lan',
    title: 'LAN de Noche',
    start: '2026-10-24T03:00:00Z', // viernes 23, 20:00
    end: '2026-10-24T13:00:00Z', // sábado 24, 06:00
    color: SMASH,
    href: '#lan',
    meta: 'Varios juegos · Presencial',
  },
  {
    id: 'final-regional',
    title: 'Final Regional · Valorant',
    start: '2026-10-31T22:00:00Z', // sábado 31, 15:00
    color: VALORANT,
    href: '#final-regional',
    meta: 'Valorant · Presencial · Auditorio',
  },
]

const meta = {
  title: 'Components/MonthView',
  component: MonthView,
  tags: ['autodocs'],
  args: {
    month: '2026-10-01',
    today: TODAY,
    timeZone: HMO,
    locale: 'es-MX',
    labels: es,
    events: torneos,
    monthHref,
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['grid', 'tiles'] },
    list: { control: 'inline-radio', options: ['auto', 'always', 'never'] },
    events: { control: false },
    labels: { control: false },
  },
  decorators: [(Story) => <div style={{ maxWidth: 1040 }}>{Story()}</div>],
} satisfies Meta<typeof MonthView>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Pitaya's `/torneos`: tournaments as links in their game colors, a week-long league as a bar,
 * an overnight LAN across two days. Below 600px wide it turns into the agenda list.
 */
export const TournamentSchedule: Story = {
  args: {
    empty: {
      title: 'No hay torneos este mes',
      children: 'Anunciamos fechas primero en nuestras redes.',
    },
  },
}

// sukuna-gg-web "days played": games and average placement per day, from October 4 on.
const played: Record<string, { games: number; avg: number }> = {
  '2026-10-04': { games: 3, avg: 4.3 },
  '2026-10-05': { games: 6, avg: 3.5 },
  '2026-10-07': { games: 2, avg: 6.0 },
  '2026-10-08': { games: 5, avg: 2.8 },
  '2026-10-10': { games: 8, avg: 3.9 },
  '2026-10-11': { games: 4, avg: 4.8 },
  '2026-10-13': { games: 1, avg: 1.0 },
  '2026-10-14': { games: 3, avg: 5.3 },
  '2026-10-17': { games: 7, avg: 3.1 },
  '2026-10-18': { games: 2, avg: 4.5 },
  '2026-10-19': { games: 4, avg: 2.5 },
}

/**
 * `tiles` + `renderDay`: each played day shows its games and average placement. Days before
 * tracking started are hatched ("Not tracked"), never shown as zero; days without games are
 * lighter; days after today are outlined.
 */
export const DaysPlayed: Story = {
  args: {
    events: [],
    locale: 'en-US',
    labels: undefined,
    timeZone: 'UTC',
    today: '2026-10-20',
    variant: 'tiles',
    list: 'never',
    monthHref: undefined,
    isDateUntracked: (d) => d < '2026-10-04',
    renderDay: (d) => {
      const day = played[d]
      if (!day) return null
      return (
        <span style={{ display: 'grid', gap: 2 }}>
          <span style={{ color: 'var(--sk-text)', fontWeight: 600 }}>
            {day.games} {day.games === 1 ? 'game' : 'games'}
          </span>
          <span style={{ color: day.avg <= 4 ? 'var(--sk-success)' : 'var(--sk-text-dim)' }}>
            avg {day.avg.toFixed(1)}
          </span>
        </span>
      )
    },
  },
  decorators: [(Story) => <div style={{ maxWidth: 640 }}>{Story()}</div>],
}

const scrims = (date: string, hours: number[], color: string): CalendarEvent[] =>
  hours.map((h, i) => ({
    id: `${date}-${h}`,
    title: ['Scrim vs Mezquite', 'Scrim vs Coyotes', 'Práctica de mapas', 'Revisión de VODs'][
      i % 4
    ] as string,
    start: `${date}T${String(h).padStart(2, '0')}:00:00Z`,
    color,
    href: `#${date}-${h}`,
  }))

/** A day with more than `maxLanes` events: "+N más" opens a native popover with the whole day. */
export const BusyDay: Story = {
  args: {
    events: [
      ...torneos,
      ...scrims('2026-10-14', [16, 18, 20, 22, 23], VALORANT),
      ...scrims('2026-10-21', [17, 19], TFT),
    ],
  },
}

/** Multi-day events draw as bars, cut at the week edge with square ends and continued below. */
export const MultiWeekBar: Story = {
  args: {
    locale: 'en-US',
    labels: undefined,
    events: [
      {
        id: 'season',
        title: 'Autumn Ranked Season',
        start: '2026-10-07',
        end: '2026-10-21',
        color: LOL,
        href: '#season',
      },
      {
        id: 'bootcamp',
        title: 'Bootcamp',
        start: '2026-10-09',
        end: '2026-10-12',
        color: VALORANT,
      },
      { id: 'patch', title: 'Patch 26.21', start: '2026-10-14', color: TFT },
      ...scrims('2026-10-13', [18], FC),
    ],
  },
}

export const Empty: Story = {
  args: {
    month: '2026-11-01',
    events: [],
    empty: {
      title: 'No hay torneos este mes',
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

/** Below 600px of container width the grid hides and the month's agenda list shows. */
export const Narrow: Story = {
  decorators: [(Story) => <div style={{ maxWidth: 380 }}>{Story()}</div>],
  parameters: { sideBySide: true },
}
