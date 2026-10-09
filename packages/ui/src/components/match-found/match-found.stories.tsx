import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { type ReactNode, useEffect, useState } from 'react'
import { Button } from '../button'
import { CheckIcon } from '../icon'
import { MatchFound, type MatchFoundState } from './index'

// Storybook doesn't load the display face; the mockup (and `examples/showcase`) use Archivo with its
// width axis. A plain stylesheet link (no `precedence`) never blocks the render.
const withArchivo: Decorator = (Story) => (
  <>
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap"
    />
    <Story />
  </>
)

const meta = {
  title: 'Components/MatchFound',
  component: MatchFound,
  tags: ['autodocs'],
  decorators: [withArchivo],
  args: {
    eyebrow: 'Ranked · 5v5',
    seconds: 12,
    players: 5,
    accepted: 2,
    state: 'pending',
  },
  argTypes: {
    state: { control: 'inline-radio', options: ['pending', 'accepted', 'declined', 'expired'] },
  },
} satisfies Meta<typeof MatchFound>

export default meta
type Story = StoryObj<typeof meta>

// ── Story chrome (not part of the component) ───────────────────────────────────────────────────

/** The mockup's stage: a surface card the prompt sits in. */
function Stage({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div
      className={
        narrow
          ? 'h-[340px] w-[340px] overflow-hidden rounded-lg bg-surface shadow-card'
          : 'h-[320px] w-full max-w-[540px] overflow-hidden rounded-lg bg-surface shadow-card'
      }
    >
      {children}
    </div>
  )
}

const MatchMeta = () => (
  <>
    <span className="font-semibold text-premium">Bind</span> · EU West · avg{' '}
    <span className="tabular-nums text-text">1,840</span> MMR
  </>
)

const cta = 'rounded-sm text-[12.5px] font-extrabold uppercase tracking-[.14em] font-stretch-[112%]'

/** The app's own Accept / Decline buttons, styled like the mockup. */
function Actions({
  state,
  onAccept,
  onDecline,
  accept = 'Accept',
  accepted = 'Accepted',
  decline = 'Decline',
}: {
  state: MatchFoundState
  onAccept?: () => void
  onDecline?: () => void
  accept?: string
  accepted?: string
  decline?: string
}) {
  const answered = state !== 'pending'
  return (
    <>
      {state === 'accepted' ? (
        <Button
          aria-disabled="true"
          leadingIcon={<CheckIcon aria-hidden="true" />}
          className={`${cta} bg-success/14 text-success shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--sk-success)_60%,transparent)] aria-disabled:cursor-default aria-disabled:opacity-100`}
        >
          {accepted}
        </Button>
      ) : (
        <Button
          disabled={answered}
          onClick={onAccept}
          className={`${cta} shadow-[0_10px_26px_-10px_var(--sk-accent-glow)] disabled:grayscale`}
        >
          {accept}
        </Button>
      )}
      <Button
        variant="outline"
        disabled={answered}
        onClick={onDecline}
        className={`${cta} text-text-dim hover:border-text-faint hover:text-text`}
      >
        {decline}
      </Button>
    </>
  )
}

// ── Stories ────────────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: { meta: <MatchMeta /> },
  render: (args) => (
    <Stage>
      <MatchFound {...args} className="h-full">
        <Actions state={args.state ?? 'pending'} />
      </MatchFound>
    </Stage>
  ),
}

const party = [
  { name: 'kuro', rank: 'Ascendant 2', ready: true },
  { name: 'Mire', rank: 'Immortal 1', ready: true },
  { name: 'tsubasa', rank: 'Ascendant 3', ready: false },
  { name: 'Volt', rank: 'Ascendant 1', ready: false },
  { name: 'you', rank: 'Ascendant 2', ready: false },
]

/**
 * A game-client lobby with the prompt as a dialog over it (non-modal: a story has no focus trap).
 * The story is the app: it owns the 12-second timer, two teammates accepting at 2.2 s and 5.1 s,
 * Accept / Decline, and the `aria-live` announcements. Replay remounts the prompt with a new `key`.
 */
function Lobby() {
  const [run, setRun] = useState(0)
  const [answer, setAnswer] = useState<MatchFoundState>('pending')
  const [teammates, setTeammates] = useState(2)
  const [said, setSaid] = useState('Match found. Accept within 12 seconds.')

  // A new queue pop: reset the app state in the same render as the new `key`.
  const replay = () => {
    setAnswer('pending')
    setTeammates(2)
    setSaid('Match found. Accept within 12 seconds.')
    setRun((n) => n + 1)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: `run` is the replay trigger.
  useEffect(() => {
    const timers = [
      setTimeout(() => setTeammates(3), 2200),
      setTimeout(() => setTeammates(4), 5100),
      setTimeout(() => {
        setAnswer((a) => (a === 'pending' ? 'expired' : a))
      }, 12_000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [run])

  const ready = teammates + (answer === 'accepted' ? 1 : 0)
  useEffect(() => {
    if (answer === 'expired') setSaid('Time ran out. You were removed from the queue.')
    else if (answer === 'declined') setSaid('You declined the match.')
    else if (answer === 'accepted')
      setSaid(ready === 5 ? 'All players ready.' : `${ready} of 5 ready.`)
  }, [answer, ready])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-text-dim">
          Story chrome: a lobby screen. The prompt is the component.
        </span>
        <Button size="sm" variant="secondary" onClick={replay}>
          Replay queue pop
        </Button>
      </div>
      <div className="relative h-[560px] overflow-hidden rounded-lg border border-line bg-bg">
        {/* Lobby */}
        <header className="flex h-12 items-center gap-6 border-b border-line bg-surface px-5">
          <span className="font-display text-sm font-black uppercase tracking-[.2em] font-stretch-expanded">
            Sukuna
          </span>
          <nav
            aria-label="Client"
            className="flex gap-4 text-xs font-semibold uppercase tracking-[.14em]"
          >
            <span className="text-text">Play</span>
            <span className="text-text-dim">Career</span>
            <span className="text-text-dim">Store</span>
          </nav>
          <span className="ml-auto rounded-pill border border-line px-3 py-1 text-xs text-text-dim">
            Party · 5
          </span>
        </header>
        <div className="grid h-[calc(100%-3rem)] grid-cols-[220px_1fr]">
          <aside className="border-r border-line bg-surface/60 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-eyebrow text-text-dim">
              Party
            </p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {party.map((p) => (
                <li
                  key={p.name}
                  className="flex items-center gap-2.5 rounded-md bg-surface-2 px-2.5 py-2"
                >
                  <span className="grid size-7 place-items-center rounded-full bg-well text-xs font-bold uppercase text-text-dim">
                    {p.name[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text">{p.name}</span>
                    <span className="block text-xs text-text-dim">{p.rank}</span>
                  </span>
                </li>
              ))}
            </ul>
          </aside>
          <main className="relative grid place-items-center p-8">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">
                Ranked · 5v5
              </p>
              <p className="mt-2 font-display text-[44px] font-black uppercase leading-none font-stretch-expanded">
                Finding match
              </p>
              <p className="mt-3 text-sm tabular-nums text-text-dim">In queue 01:42 · est. 02:00</p>
            </div>
          </main>
        </div>

        {/* The prompt, as a dialog over the lobby */}
        <div className="absolute inset-0 grid place-items-center bg-bg/60 p-4 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-labelledby="lobby-pop-title"
            className="w-full max-w-[540px] overflow-hidden rounded-lg border border-line bg-surface shadow-card"
          >
            <MatchFound
              key={run}
              id="lobby-pop"
              eyebrow="Ranked · 5v5"
              meta={<MatchMeta />}
              seconds={12}
              players={5}
              accepted={ready}
              state={answer}
              className="min-h-[320px]"
            >
              <Actions
                state={answer}
                onAccept={() => setAnswer((a) => (a === 'pending' ? 'accepted' : a))}
                onDecline={() => setAnswer((a) => (a === 'pending' ? 'declined' : a))}
              />
            </MatchFound>
          </div>
        </div>
        <p aria-live="polite" className="sr-only">
          {said}
        </p>
      </div>
    </div>
  )
}

export const InLobby: Story = {
  render: () => <Lobby />,
}

const states: { label: string; state: MatchFoundState; accepted: number }[] = [
  { label: 'pending', state: 'pending', accepted: 2 },
  { label: 'accepted', state: 'accepted', accepted: 3 },
  { label: 'all ready', state: 'accepted', accepted: 5 },
  { label: 'declined', state: 'declined', accepted: 4 },
  { label: 'expired', state: 'expired', accepted: 4 },
]

/** Every state at once — also the reduced-motion review set (the countdown still steps). */
export const States: Story = {
  render: (args) => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,540px),1fr))] gap-6">
      {states.map((s) => (
        <figure key={s.label} className="m-0 flex flex-col gap-2">
          <figcaption className="text-xs font-semibold uppercase tracking-eyebrow text-text-dim">
            {s.label}
          </figcaption>
          <Stage>
            <MatchFound
              {...args}
              meta={<MatchMeta />}
              state={s.state}
              accepted={s.accepted}
              className="h-full"
            >
              <Actions state={s.state} />
            </MatchFound>
          </Stage>
        </figure>
      ))}
    </div>
  ),
}

/** Phone width: the stacked layout under 460px. */
export const Narrow: Story = {
  args: { meta: <MatchMeta /> },
  render: (args) => (
    <Stage narrow>
      <MatchFound {...args} className="h-full">
        <Actions state={args.state ?? 'pending'} />
      </MatchFound>
    </Stage>
  ),
}

/** Every visible string is a prop (here Spanish); the status line follows the app's count. */
export const CustomLabels: Story = {
  args: {
    eyebrow: 'Clasificatoria · 5c5',
    title: 'Partida encontrada',
    meta: 'Bind · UE Oeste · media 1.840 MMR',
    status: '2/5 listos',
    timerLabel: 'Acepta en 12 segundos',
    unitLabel: 'seg',
    youLabel: 'Tú',
  },
  render: (args) => (
    <Stage>
      <MatchFound {...args} className="h-full">
        <Actions state={args.state ?? 'pending'} accept="Aceptar" decline="Rechazar" />
      </MatchFound>
    </Stage>
  ),
}
