import type { Meta, StoryObj } from '@storybook/react-vite'
import { type MouseEvent, type ReactNode, useState } from 'react'
import { Button } from '../button'
import {
  ChartIcon,
  ClockIcon,
  LockIcon,
  MoonIcon,
  RefreshIcon,
  SearchIcon,
  UserIcon,
} from '../icon'
import { CommandPalette, type CommandPaletteResult } from './index'

const meta = {
  title: 'Components/CommandPalette',
  component: CommandPalette,
  tags: ['autodocs'],
  args: { children: null },
} satisfies Meta<typeof CommandPalette>

export default meta
type Story = StoryObj<typeof meta>

const stack = { display: 'grid', gap: 12, justifyItems: 'start' } as const
const note = { color: 'var(--sk-text-dim)', fontSize: 13, margin: 0, minHeight: 20 } as const

/** A player's initial on a colored tile (the app passes its own avatar). */
const Avatar = ({ letter, color }: { letter: string; color: string }) => (
  <span
    style={{
      display: 'grid',
      placeItems: 'center',
      width: '100%',
      height: '100%',
      borderRadius: 'inherit',
      background: `var(${color})`,
      color: 'var(--sk-on-accent)',
      fontWeight: 800,
      fontSize: 11,
    }}
  >
    {letter}
  </span>
)

/**
 * Shows where a link item would go instead of leaving the page. React events bubble through the
 * palette's portal, so one capture handler sees every link click.
 */
function Demo({ children }: { children: (say: (text: string) => void) => ReactNode }) {
  const [said, say] = useState('')
  const onClickCapture = (event: MouseEvent) => {
    const link = (event.target as Element).closest('a[href]')
    if (!link) return
    event.preventDefault()
    say(`Opens ${link.getAttribute('href')}`)
  }
  return (
    <div style={stack} onClickCapture={onClickCapture}>
      {children(say)}
      <p style={note} aria-live="polite">
        {said}
      </p>
    </div>
  )
}

const RECENT = [
  { id: 'p1', riotId: 'Yuji#LAN', meta: 'LAN · TFT · searched 2 hours ago', color: '--sk-chart-3' },
  {
    id: 'p2',
    riotId: 'Megumi#NA1',
    meta: 'NA · League · searched yesterday',
    color: '--sk-chart-2',
  },
  {
    id: 'p3',
    riotId: 'Nobara#EUW',
    meta: 'EUW · TFT · searched 3 days ago',
    color: '--sk-chart-5',
  },
  { id: 'p4', riotId: 'Todo#1984', meta: 'Overwatch · searched last week', color: '--sk-chart-4' },
]

const PLAYERS = [
  { riotId: 'Bahía#LAN', meta: 'LAN · League · Gold II' },
  { riotId: 'Faker#KR1', meta: 'KR · League · Challenger' },
  { riotId: 'Fakeshot#EUW', meta: 'EUW · TFT · Master' },
  { riotId: 'Gojo#JP1', meta: 'JP · League · Diamond I' },
  { riotId: 'Sukuna#666', meta: 'NA · TFT · Grandmaster' },
]

const fold = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, '')

/** A fake player lookup: 400 ms of "network", cancelled when the query changes. */
const searchPlayers = (query: string, signal: AbortSignal) =>
  new Promise<readonly CommandPaletteResult[]>((resolve, reject) => {
    const timer = setTimeout(() => {
      const q = fold(query)
      resolve(
        PLAYERS.filter((p) => fold(p.riotId).includes(q))
          .slice(0, 3)
          .map((p) => ({
            id: p.riotId,
            label: p.riotId,
            description: p.meta,
            icon: <UserIcon />,
            href: `/players/${encodeURIComponent(p.riotId.replace('#', '-'))}`,
          })),
      )
    }, 400)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })

// sukuna-gg-web's Riot ID rules (PlayerSearchForm), shown while the ID is almost valid.
const RIOT_ID = /^(.{3,16})#([A-Za-z0-9]{2,5})$/
const riotIdHint = (value: string) => {
  const v = value.trim()
  if (!v.includes('#') || RIOT_ID.test(v)) return null
  const name = v.slice(0, v.lastIndexOf('#')).trim()
  return name.length < 3 || name.length > 16
    ? 'The name before the # is 3 to 16 characters.'
    : 'The tag after the # is 2 to 5 letters or numbers, like NA1.'
}

/**
 * sukuna-gg-web's top bar: recent players, pages and actions are filtered as you type; a fake
 * `onSearch` adds players from the "server" (try `fake`), and an incomplete Riot ID gets a hint
 * (try `Faker#K`). Press ⌘K / Ctrl+K anywhere.
 */
export const PlayerSearch: Story = {
  render: () => (
    <Demo>
      {(say) => (
        <CommandPalette
          onSearch={searchPlayers}
          hint={riotIdHint}
          labels={{ placeholder: 'Search players, pages, actions…' }}
        >
          <CommandPalette.Trigger />
          <CommandPalette.Group heading="Recent players">
            {RECENT.map((p) => (
              <CommandPalette.Item
                key={p.id}
                value={p.riotId}
                description={p.meta}
                icon={<Avatar letter={p.riotId.charAt(0)} color={p.color} />}
                href={`/players/${p.riotId.replace('#', '-')}`}
              />
            ))}
          </CommandPalette.Group>
          <CommandPalette.Group heading="Pages">
            <CommandPalette.Item
              value="TFT · Match history"
              description="Your last 20 games"
              icon={<ClockIcon />}
              href="/tft/matches"
            />
            <CommandPalette.Item
              value="League · Live game"
              description="Who you're playing right now"
              keywords={['current', 'spectate']}
              icon={<ChartIcon />}
              href="/lol/live"
            />
            <CommandPalette.Item
              value="Premium"
              description="Plans and billing"
              keywords={['subscription', 'pay']}
              icon={<LockIcon />}
              href="/premium"
            />
          </CommandPalette.Group>
          <CommandPalette.Group heading="Actions">
            <CommandPalette.Item
              value="Switch theme"
              description="Dark ⇄ light"
              keywords={['dark', 'light', 'mode']}
              icon={<MoonIcon />}
              shortcut="mod+shift+L"
              onSelect={() => say('Ran “Switch theme”')}
            />
            <CommandPalette.Item
              value="Refresh stats"
              icon={<RefreshIcon />}
              onSelect={() => say('Ran “Refresh stats”')}
            />
          </CommandPalette.Group>
        </CommandPalette>
      )}
    </Demo>
  ),
}

/**
 * Actions with their own shortcuts (shown, not bound), hidden keywords and a disabled row.
 * Opens with ⌘J / Ctrl+J.
 */
export const Actions: Story = {
  render: () => (
    <Demo>
      {(say) => (
        <CommandPalette shortcut="mod+J" labels={{ placeholder: 'Run an action…' }}>
          <CommandPalette.Trigger />
          <CommandPalette.Group heading="Actions">
            <CommandPalette.Item
              value="Switch theme"
              keywords={['dark', 'light']}
              shortcut="mod+shift+L"
              onSelect={() => say('Ran “Switch theme”')}
            />
            <CommandPalette.Item
              value="Copy profile link"
              keywords={['share', 'url']}
              shortcut="mod+shift+C"
              onSelect={() => say('Ran “Copy profile link”')}
            />
            <CommandPalette.Item
              value="Open shortcuts help"
              keywords={['keyboard', 'hotkeys']}
              shortcut="shift+?"
              onSelect={() => say('Ran “Open shortcuts help”')}
            />
            <CommandPalette.Item
              value="Delete account"
              description="Ask support to do this"
              disabled
            />
          </CommandPalette.Group>
        </CommandPalette>
      )}
    </Demo>
  ),
}

const never = () => new Promise<readonly CommandPaletteResult[]>(() => {})

/** `onSearch` that never answers: type anything to see the "Searching…" row. No shortcut. */
export const Loading: Story = {
  render: () => (
    <CommandPalette shortcut={null} onSearch={never} labels={{ placeholder: 'Search players…' }}>
      <CommandPalette.Trigger />
      <CommandPalette.Group heading="Recent players">
        <CommandPalette.Item value="Yuji#LAN" description="LAN · TFT" icon={<UserIcon />} />
      </CommandPalette.Group>
    </CommandPalette>
  ),
}

/** `CommandPalette.Empty` replaces the message; type something that matches nothing. */
export const Empty: Story = {
  render: () => (
    <CommandPalette shortcut={null}>
      <CommandPalette.Trigger />
      <CommandPalette.Group heading="Pages">
        <CommandPalette.Item value="Leaderboards" icon={<ChartIcon />} />
        <CommandPalette.Item value="Match history" icon={<ClockIcon />} />
      </CommandPalette.Group>
      <CommandPalette.Empty>
        {(query) => (
          <span style={{ display: 'grid', gap: 6 }}>
            <span>No players, pages or actions match “{query}”</span>
            <span style={{ color: 'var(--sk-text-dim)', fontWeight: 400 }}>
              To look up a player, type the Riot ID with its tag, like Name#NA1.
            </span>
          </span>
        )}
      </CommandPalette.Empty>
    </CommandPalette>
  ),
}

/** Your own trigger through `render` (here an icon button), with `/` as the shortcut. */
export const CustomTrigger: Story = {
  render: () => (
    <CommandPalette shortcut="/" labels={{ placeholder: 'Search the docs…' }}>
      <CommandPalette.Trigger
        render={
          <Button variant="secondary" iconOnly aria-label="Search the docs (/)">
            <SearchIcon />
          </Button>
        }
      />
      <CommandPalette.Group heading="Guides">
        <CommandPalette.Item value="Getting started" />
        <CommandPalette.Item value="Theming" keywords={['dark', 'light', 'tokens']} />
        <CommandPalette.Item value="Server rendering" keywords={['ssr', 'rsc', 'next']} />
      </CommandPalette.Group>
    </CommandPalette>
  ),
}
