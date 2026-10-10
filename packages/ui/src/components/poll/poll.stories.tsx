import type { Meta, StoryObj } from '@storybook/react-vite'
import { Poll, type PollLabels, type PollOption } from './index'

const games: PollOption[] = [
  { value: 'Street Fighter 6', label: 'Street Fighter 6', votes: 34 },
  { value: 'Tekken 8', label: 'Tekken 8', votes: 21 },
  { value: 'Mario Kart 8 Deluxe', label: 'Mario Kart 8 Deluxe', votes: 18 },
  { value: 'Rocket League', label: 'Rocket League', votes: 9 },
]

// A no-op server action stand-in, so submitting in Storybook doesn't navigate away.
const vote = async (_data: FormData) => {}

// Pitaya's /juegos copy (es-MX).
const esLabels: Partial<PollLabels> = {
  vote: 'Votar',
  other: 'Otro',
  otherPlaceholder: 'Ej. Brawlhalla',
  votes: (n) => (n === 1 ? '1 voto' : `${n} votos`),
  closes: (date) => `Cierra el ${date}`,
  closed: (date) => `Cerró el ${date}`,
  yourVote: 'Tu voto',
  changeVote: 'Cambiar voto',
  signIn: 'Entra',
  signInToVote: 'para votar.',
  winner: (label, percent) => `Ganó ${label} con ${percent}% de los votos`,
  tie: (labels) => `Empate entre ${labels.join(' y ')}`,
}

const meta = {
  title: 'Components/Poll',
  component: Poll,
  tags: ['autodocs'],
  args: {
    title: 'Which game should we add next?',
    description: 'The winner joins the weekly cups.',
    options: games,
    action: vote,
    closesAt: '2026-10-15',
  },
  argTypes: {
    showResults: { control: 'inline-radio', options: ['after-vote', 'always', 'closed'] },
    headingLevel: { control: 'inline-radio', options: [2, 3, 4] },
  },
  decorators: [(Story) => <div style={{ maxWidth: 520 }}>{Story()}</div>],
} satisfies Meta<typeof Poll>

export default meta
type Story = StoryObj<typeof meta>

/** Can vote, hasn't yet: the form. Results stay hidden until the vote is in. */
export const Open: Story = {}

/** After voting: the results with the choice marked, and a link back to the form. */
export const Voted: Story = {
  args: { votedFor: 'Tekken 8', changeVoteHref: '?vote=change' },
}

/** Signed out (`canVote={false}`): what's on the ballot and a sign-in sentence. */
export const SignedOut: Story = {
  args: { canVote: false, signInHref: '/login?next=/games', showResults: 'always' },
}

/** Closed: results for everyone, the winner named in a sentence. */
export const Closed: Story = {
  args: { closed: true, votedFor: 'Tekken 8' },
}

/** A closed poll whose lead is shared: the tie is named, every leader's bar is crimson. */
export const Tie: Story = {
  args: {
    closed: true,
    options: [
      { value: 'Street Fighter 6', label: 'Street Fighter 6', votes: 27 },
      { value: 'Tekken 8', label: 'Tekken 8', votes: 27 },
      { value: 'Rocket League', label: 'Rocket League', votes: 12 },
    ],
  },
}

/** Pitaya's /juegos vote (es-MX): the top games plus a write-in for the one that's missing. */
export const WithWriteIn: Story = {
  args: {
    lang: 'es',
    title: '¿Falta tu juego?',
    description: 'Vota por el juego que quieres ver en Pitaya.',
    name: 'game',
    allowWriteIn: true,
    signInHref: '/entrar?next=/juegos',
    changeVoteHref: '?votar=1',
    locale: 'es-MX',
    labels: esLabels,
  },
}
