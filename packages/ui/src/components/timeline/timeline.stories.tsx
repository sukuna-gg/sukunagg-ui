import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from '../badge'
import { CheckIcon, ClockIcon, LockIcon, RefreshIcon, UserIcon } from '../icon'
import { Timeline, type TimelineItem } from './index'

// sukuna-gg-web's side colors live in the app (gg.css); a story stands them in with chart tokens.
const BLUE = 'var(--sk-chart-2)'
const RED = 'var(--sk-chart-1)'

const objectives: TimelineItem[] = [
  {
    id: 'fb',
    time: '1:31',
    title: 'First blood',
    description: 'Blue side · Ahri took down Lee Sin',
    color: BLUE,
  },
  {
    id: 'd1',
    time: '6:02',
    title: 'Infernal drake',
    description: 'Red side takes the first dragon',
    color: RED,
  },
  { id: 'vg', time: '9:44', title: 'Voidgrubs ×3', description: 'Blue side', color: BLUE },
  {
    id: 't1',
    time: '14:10',
    title: 'First tower',
    description: 'Blue side destroys the mid outer tower',
    color: BLUE,
  },
  {
    id: 'bn',
    time: '20:31',
    title: 'Baron Nashor',
    description: 'Blue side, after a 3-for-0 fight',
    color: BLUE,
  },
  {
    id: 'in',
    time: '24:05',
    title: 'Inhibitor',
    description: 'Blue side destroys the mid inhibitor',
    color: BLUE,
  },
  { id: 'w', time: '27:48', title: 'Victory', description: 'Blue side wins', color: BLUE },
]

const night: TimelineItem[] = [
  {
    id: 'ci',
    time: '17:30',
    title: 'Check-in',
    description: '5 de 5 jugadores confirmados',
    icon: <UserIcon />,
  },
  {
    id: 'r1',
    time: '18:00',
    title: 'Octavos',
    description: 'Ganamos 13–7 contra Mezquite',
    icon: <CheckIcon />,
    badge: (
      <Badge tone="success" size="sm">
        Victoria
      </Badge>
    ),
  },
  {
    id: 'r2',
    time: '19:10',
    title: 'Cuartos',
    description: 'Ganamos 13–11 contra Coyotes HMO',
    icon: <CheckIcon />,
    badge: (
      <Badge tone="success" size="sm">
        Victoria
      </Badge>
    ),
  },
  {
    id: 'sf',
    time: '20:30',
    title: 'Semifinal',
    description: 'Contra Los Pitayos · Mapa 2 de 3',
    icon: <ClockIcon />,
    status: 'current',
    badge: (
      <Badge tone="accent" size="sm" dot pulse>
        En juego
      </Badge>
    ),
  },
  {
    id: 'f',
    time: '~21:45',
    title: 'Final',
    description: 'Rival por definir',
    icon: <LockIcon />,
    status: 'upcoming',
  },
]

const meta = {
  title: 'Components/Timeline',
  component: Timeline,
  tags: ['autodocs'],
  args: { items: night, 'aria-label': 'Tu noche en Copa Otoño' },
  argTypes: {
    density: { control: 'inline-radio', options: ['default', 'compact'] },
    timeWidth: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  decorators: [(Story) => <div style={{ maxWidth: 480 }}>{Story()}</div>],
} satisfies Meta<typeof Timeline>

export default meta
type Story = StoryObj<typeof meta>

/** Pitaya-style: a team's night, the current match pulsing, the final still dashed. */
export const TournamentNight: Story = {
  args: { lang: 'es', currentLabel: 'en juego', upcomingLabel: 'pendiente' },
}

/** sukuna-gg-web-style: a League match's objectives, plain dots in the side colors. */
export const MatchObjectives: Story = {
  args: { items: objectives, density: 'compact', 'aria-label': 'Objectives' },
}

export const Changelog: Story = {
  args: {
    timeWidth: 'lg',
    'aria-label': 'Releases',
    items: [
      {
        id: '0.11.0',
        time: <Badge size="sm">0.11.0</Badge>,
        title: 'Unreleased',
        status: 'upcoming',
        children: (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>StatTile, Sparkline and EmptyState</li>
            <li>Input reveal and Badge pulse</li>
          </ul>
        ),
      },
      {
        id: '0.10.0',
        time: <Badge size="sm">0.10.0</Badge>,
        dateTime: '2026-09-29',
        title: 'September 29, 2026',
        description: 'First publish under @sukunagg.',
      },
      {
        id: '0.1.0',
        time: <Badge size="sm">0.1.0</Badge>,
        title: 'September 16, 2026',
        description: 'First publish as sukuna-ui: the ten v1 components.',
      },
    ],
  },
}

export const AuditLog: Story = {
  args: {
    timeWidth: 'md',
    'aria-label': 'Activity',
    items: [
      {
        id: 'a1',
        time: '2h ago',
        title: 'Identity approved',
        description: 'by ariel@pitaya.gg',
        icon: <CheckIcon />,
        color: 'var(--sk-success)',
      },
      {
        id: 'a2',
        time: '5h ago',
        title: 'Photos re-uploaded',
        description: 'by the player',
        icon: <RefreshIcon />,
      },
      {
        id: 'a3',
        time: 'Yesterday',
        title: 'Identity sent',
        description: 'by the player',
        icon: <UserIcon />,
      },
    ],
  },
}
