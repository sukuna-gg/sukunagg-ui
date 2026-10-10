import { afterEach, describe, expect, it, mock } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, type ReactNode, useState } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { UserIcon } from '../icon'
import { CommandPalette, type CommandPaletteProps, type CommandPaletteResult } from './index'

/** Pretend to be an Apple device (or not) for the shortcut listener. */
const setPlatform = (platform: string) =>
  Object.defineProperty(navigator, 'platform', { value: platform, configurable: true })

afterEach(() => {
  Reflect.deleteProperty(navigator, 'platform')
  window.location.hash = ''
})

const onTheme = mock(() => {})

function Example({ children, ...props }: Partial<CommandPaletteProps> & { children?: ReactNode }) {
  return (
    <CommandPalette {...props}>
      <CommandPalette.Trigger />
      <CommandPalette.Group heading="Recent players">
        <CommandPalette.Item
          value="Faker#KR1"
          description="KR · Challenger"
          icon={<UserIcon />}
          href="#players/faker"
        />
        <CommandPalette.Item value="Bahía#LAN" description="LAN · Gold" href="#players/bahia" />
      </CommandPalette.Group>
      <CommandPalette.Group heading="Actions">
        <CommandPalette.Item
          value="Switch theme"
          keywords={['dark', 'light']}
          shortcut="mod+shift+L"
          onSelect={onTheme}
        />
        <CommandPalette.Item value="Sign out" disabled onSelect={onTheme} />
      </CommandPalette.Group>
      {children}
    </CommandPalette>
  )
}

const trigger = () => screen.getByRole('button', { name: /Search…/ })
const input = () => screen.getByRole('combobox')
const options = () => screen.queryAllByRole('option').map((o) => o.textContent)
/** Each option's label (the screen-reader copy when the label is highlighted). */
const optionNames = () =>
  screen.queryAllByRole('option').map((o) => {
    const label = o.querySelector('.font-semibold') as HTMLElement
    return (label.querySelector('.sr-only') ?? label).textContent
  })
const highlighted = () => document.querySelector('[role="option"][data-highlighted]')

/** Opens the palette from the trigger and waits for the list. */
async function open(user = userEvent.setup()) {
  await user.click(trigger())
  await screen.findByRole('dialog')
  await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0))
  return user
}

/** Renders the default example and opens it. */
async function renderOpen() {
  render(<Example />)
  return open()
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('CommandPalette', () => {
  // ── SSR & hydration ────────────────────────────────────────────────────────────────────────

  it('renders only the Trigger on the server, even when open', () => {
    for (const html of [renderServer(<Example />), renderServer(<Example defaultOpen />)]) {
      expect(html).toContain('<button')
      expect(html).toContain('Search…')
      // The Kbd draws the non-Apple keys on the server.
      expect(html).toContain('Ctrl')
      expect(html).not.toContain('role="dialog"')
      expect(html).not.toContain('Faker')
      expect(html).not.toContain('Recent players')
    }
  })

  it('hydrates without warnings', async () => {
    // The shared helper never unmounts its root, so hydrate without the document listener (the
    // shortcut would otherwise keep answering Ctrl+K in later tests)…
    await expectHydrates(<Example shortcut={null} />)
    // …and check the default Trigger (with its Kbd island) here, unmounting afterwards.
    for (const platform of ['Win32', 'MacIntel']) {
      setPlatform(platform)
      const element = <Example />
      const host = document.createElement('div')
      host.innerHTML = renderServer(element)
      document.body.appendChild(host)
      const errors: string[] = []
      const original = console.error
      console.error = (...args: unknown[]) => {
        errors.push(args.join(' '))
      }
      let root: Root | undefined
      try {
        await act(async () => {
          root = hydrateRoot(host, element)
        })
      } finally {
        console.error = original
      }
      act(() => root?.unmount())
      host.remove()
      expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([])
    }
  })

  it('is accessible in both themes, closed and open', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { unmount } = render(
        <div data-theme={theme}>
          <Example hint={(q) => (q ? null : 'Type a Riot ID, like Name#NA1.')} />
        </div>,
      )
      // The trigger while closed (an open modal hides the rest of the page from the a11y tree).
      await expectAccessible(trigger())
      await open()
      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(4))
      expect(screen.getByText(/Type a Riot ID/)).toBeInTheDocument()
      // The popup itself (Base UI's focus guards around it are aria-hidden by design).
      await expectAccessible(screen.getByRole('dialog'))
      unmount()
    }
  })

  // ── Trigger ────────────────────────────────────────────────────────────────────────────────

  it('passes native props to the Trigger, forwards its ref and merges className', async () => {
    const onClick = mock(() => {})
    const ref = createRef<HTMLButtonElement>()
    render(
      <CommandPalette>
        <CommandPalette.Trigger
          ref={ref}
          id="search"
          data-testid="search-trigger"
          aria-label="Search everything"
          className="h-12"
          onClick={onClick}
        />
      </CommandPalette>,
    )
    const button = screen.getByTestId('search-trigger')
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    expect(button).toBe(ref.current as HTMLButtonElement)
    expect(button).toHaveAttribute('id', 'search')
    expect(button).toHaveAccessibleName('Search everything')
    expect(button).toHaveAttribute('aria-haspopup', 'dialog')
    expect(button.classList.contains('h-12')).toBe(true)
    expect(button.classList.contains('h-10')).toBe(false)
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('shows the shortcut on the Trigger, or nothing with shortcut={null}', () => {
    const { unmount } = render(<Example />)
    expect(trigger().querySelector('kbd')).not.toBeNull()
    unmount()
    render(<Example shortcut={null} />)
    expect(trigger().querySelector('kbd')).toBeNull()
  })

  it('takes custom Trigger content or your own element through render', async () => {
    const { unmount } = render(
      <CommandPalette>
        <CommandPalette.Trigger>Find</CommandPalette.Trigger>
      </CommandPalette>,
    )
    expect(screen.getByRole('button', { name: 'Find' })).toBeInTheDocument()
    unmount()
    render(
      <CommandPalette>
        <CommandPalette.Trigger
          render={
            <button type="button" aria-label="Open search">
              ⌕
            </button>
          }
        />
      </CommandPalette>,
    )
    const own = screen.getByRole('button', { name: 'Open search' })
    expect(own).toHaveTextContent('⌕')
    await userEvent.click(own)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('is reachable with Tab and opens with Enter', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.tab()
    expect(trigger()).toHaveFocus()
    await user.keyboard('[Enter]')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  // ── Opening, closing, focus ────────────────────────────────────────────────────────────────

  it('opens a named dialog with the input focused and the first item highlighted', async () => {
    const onOpenChange = mock(() => {})
    render(<Example onOpenChange={onOpenChange} />)
    await open()
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Command palette')
    expect(onOpenChange).toHaveBeenCalledWith(true)
    await waitFor(() => expect(input()).toHaveFocus())
    expect(input()).toHaveAccessibleName('Search…')
    expect(input()).toHaveAttribute('aria-controls', screen.getByRole('listbox').id)
    expect(optionNames()).toEqual(['Faker#KR1', 'Bahía#LAN', 'Switch theme', 'Sign out'])
    await waitFor(() => expect(highlighted()?.textContent).toContain('Faker#KR1'))
    expect(input()).toHaveAttribute('aria-activedescendant', highlighted()?.id)
  })

  it('names each group by its heading', async () => {
    render(<Example defaultOpen />)
    const group = await screen.findByRole('group', { name: 'Recent players' })
    expect(within(group).getAllByRole('option')).toHaveLength(2)
    expect(screen.getByRole('group', { name: 'Actions' })).toBeInTheDocument()
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const onOpenChange = mock(() => {})
    render(<Example onOpenChange={onOpenChange} />)
    const user = await open()
    await waitFor(() => expect(input()).toHaveFocus())
    await user.keyboard('[Escape]')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    await waitFor(() => expect(trigger()).toHaveFocus())
  })

  it('stays controlled by `open`', async () => {
    const onOpenChange = mock(() => {})
    const { rerender } = render(<Example open={false} onOpenChange={onOpenChange} />)
    await userEvent.click(trigger())
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(screen.queryByRole('dialog')).toBeNull()
    rerender(<Example open onOpenChange={onOpenChange} />)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  // ── Global shortcut ────────────────────────────────────────────────────────────────────────

  it('opens with Ctrl+K off Apple platforms and blocks the browser default', async () => {
    setPlatform('Win32')
    render(<Example />)
    expect(fireEvent.keyDown(document.body, { key: 'k', code: 'KeyK', metaKey: true })).toBe(true)
    expect(screen.queryByRole('dialog')).toBeNull()
    const notPrevented = fireEvent.keyDown(document.body, { key: 'k', code: 'KeyK', ctrlKey: true })
    expect(notPrevented).toBe(false)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('opens with ⌘K on Apple platforms, not Ctrl+K', async () => {
    setPlatform('MacIntel')
    render(<Example />)
    fireEvent.keyDown(document.body, { key: 'k', code: 'KeyK', ctrlKey: true })
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.keyDown(document.body, { key: 'k', code: 'KeyK', metaKey: true })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('toggles closed with the shortcut and ignores key repeat', async () => {
    setPlatform('Win32')
    const user = userEvent.setup()
    render(<Example />)
    await user.keyboard('{Control>}k{/Control}')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true, repeat: true })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Control>}k{/Control}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('does nothing with shortcut={null}, or for a prevented event', async () => {
    setPlatform('Win32')
    const { unmount } = render(<Example shortcut={null} />)
    expect(fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true })).toBe(true)
    await sleep(20)
    expect(screen.queryByRole('dialog')).toBeNull()
    unmount()
    render(<Example />)
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true })
    event.preventDefault()
    document.body.dispatchEvent(event)
    await sleep(20)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('ignores a bare-key shortcut while the user types in a field', async () => {
    const user = userEvent.setup()
    render(
      <>
        <input aria-label="Name" />
        <Example shortcut="/" />
      </>,
    )
    await user.click(screen.getByRole('textbox', { name: 'Name' }))
    await user.keyboard('/')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('/')
    fireEvent.keyDown(document.body, { key: '/' })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('returns focus to the element that had it when the shortcut opened the palette', async () => {
    setPlatform('Win32')
    const user = userEvent.setup()
    render(
      <>
        <button type="button">Elsewhere</button>
        <Example />
      </>,
    )
    const elsewhere = screen.getByRole('button', { name: 'Elsewhere' })
    elsewhere.focus()
    await user.keyboard('{Control>}k{/Control}')
    await screen.findByRole('dialog')
    await waitFor(() => expect(input()).toHaveFocus())
    await user.keyboard('[Escape]')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(elsewhere).toHaveFocus())
  })

  // ── Filtering ──────────────────────────────────────────────────────────────────────────────

  it('filters accent-insensitively and highlights the matched letters', async () => {
    const user = await renderOpen()
    await user.type(input(), 'bahia')
    expect(optionNames()).toEqual(['Bahía#LAN'])
    const option = screen.getByRole('option')
    // The highlight is presentational: the option still reads as its whole label.
    expect(option.textContent).toContain('Bahía#LAN')
    const marks = [...option.querySelectorAll('.font-extrabold')].map((m) => m.textContent)
    expect(marks).toEqual(['Bahía'])
  })

  it('hides groups with no match', async () => {
    const user = await renderOpen()
    await user.type(input(), 'theme')
    expect(screen.queryByRole('group', { name: 'Recent players' })).toBeNull()
    expect(screen.getByRole('group', { name: 'Actions' })).toBeInTheDocument()
    expect(optionNames()).toEqual(['Switch theme'])
  })

  it('matches hidden keywords without highlighting the label', async () => {
    const user = await renderOpen()
    await user.type(input(), 'dark')
    expect(optionNames()).toEqual(['Switch theme'])
    expect(screen.getByRole('option').querySelector('.font-extrabold')).toBeNull()
  })

  it('sorts by score within a group, keeping the given order on ties', async () => {
    render(
      <CommandPalette defaultOpen>
        <CommandPalette.Group heading="Words">
          <CommandPalette.Item value="Toast" />
          <CommandPalette.Item value="Lost" />
          <CommandPalette.Item value="Stats" />
          <CommandPalette.Item value="Last" />
        </CommandPalette.Group>
      </CommandPalette>,
    )
    await screen.findByRole('dialog')
    const user = userEvent.setup()
    await user.type(input(), 'st')
    // Stats (word start + run) beats the mid-word runs, which tie and keep their order.
    expect(optionNames()).toEqual(['Stats', 'Toast', 'Lost', 'Last'])
  })

  it('caps each group at maxPerGroup while searching, not before', async () => {
    const champions = ['Ahri', 'Akali', 'Alistar', 'Amumu', 'Anivia', 'Annie', 'Aphelios']
    const Champs = ({ max }: { max?: number }) => (
      <CommandPalette defaultOpen maxPerGroup={max}>
        <CommandPalette.Group heading="Champions">
          {champions.map((c) => (
            <CommandPalette.Item key={c} value={c} />
          ))}
        </CommandPalette.Group>
      </CommandPalette>
    )
    for (const [max, shown] of [
      [undefined, 5],
      [2, 2],
      [Number.POSITIVE_INFINITY, 7],
    ] as const) {
      const { unmount } = render(<Champs max={max} />)
      await screen.findByRole('dialog')
      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(7))
      await userEvent.type(input(), 'a')
      expect(screen.getAllByRole('option')).toHaveLength(shown)
      unmount()
    }
  })

  it('shows the default empty message for a query with no match', async () => {
    const user = await renderOpen()
    await user.type(input(), 'zzz')
    expect(options()).toEqual([])
    expect(await screen.findByText('No results for “zzz”')).toBeInTheDocument()
    expect(screen.getByText('No results for “zzz”').closest('[role="status"]')).not.toBeNull()
  })

  it('lets CommandPalette.Empty replace the message, with or without the query', async () => {
    const { unmount } = render(
      <Example defaultOpen>
        <CommandPalette.Empty>{(q) => `Nothing named ${q}`}</CommandPalette.Empty>
      </Example>,
    )
    await screen.findByRole('dialog')
    await userEvent.type(input(), 'zzz')
    expect(await screen.findByText('Nothing named zzz')).toBeInTheDocument()
    unmount()
    render(
      <Example defaultOpen>
        <CommandPalette.Empty>
          <p>Try a Riot ID</p>
        </CommandPalette.Empty>
      </Example>,
    )
    await screen.findByRole('dialog')
    await userEvent.type(input(), 'zzz')
    expect(await screen.findByText('Try a Riot ID')).toBeInTheDocument()
  })

  it('shows the hint above the results in a live region', async () => {
    const hint = (q: string) =>
      q && !q.includes('#') ? 'Add the tag after a #, like Name#NA1.' : null
    render(<Example defaultOpen hint={hint} />)
    await screen.findByRole('dialog')
    expect(screen.queryByText(/Add the tag/)).toBeNull()
    await userEvent.type(input(), 'fak')
    const line = screen.getByText(/Add the tag/)
    expect(line.closest('[role="status"]')).toHaveAttribute('aria-live', 'polite')
    await userEvent.type(input(), '#')
    expect(screen.queryByText(/Add the tag/)).toBeNull()
  })

  // ── Picking ────────────────────────────────────────────────────────────────────────────────

  it('renders href items as real links that Enter follows, then closes', async () => {
    const user = await renderOpen()
    const links = screen.getAllByRole('option').filter((o) => o.tagName === 'A')
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['#players/faker', '#players/bahia'])
    // Options are reached with the arrows, not Tab.
    expect(links[0]).toHaveAttribute('tabindex', '-1')
    await waitFor(() => expect(highlighted()?.textContent).toContain('Faker'))
    await user.keyboard('[ArrowDown]')
    expect(highlighted()?.textContent).toContain('Bahía')
    await user.keyboard('[Enter]')
    expect(window.location.hash).toBe('#players/bahia')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(trigger()).toHaveFocus())
  })

  it('keeps the palette open on a modified link click (new tab / window)', async () => {
    const user = await renderOpen()
    const link = screen.getAllByRole('option')[0] as HTMLElement
    // Stop happy-dom from navigating; the palette only looks at the modifier keys.
    link.addEventListener('click', (e) => e.preventDefault())
    await user.keyboard('{Control>}')
    await user.click(link)
    await user.keyboard('{/Control}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('runs onSelect items, closes and returns focus', async () => {
    onTheme.mockClear()
    const user = await renderOpen()
    await user.type(input(), 'swi')
    await user.keyboard('[Enter]')
    expect(onTheme).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(trigger()).toHaveFocus())
  })

  it('runs an item on click', async () => {
    onTheme.mockClear()
    const user = await renderOpen()
    await user.click(screen.getByRole('option', { name: /Switch theme/ }))
    expect(onTheme).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('shows disabled items but never runs them', async () => {
    onTheme.mockClear()
    const user = await renderOpen()
    const signOut = screen.getByRole('option', { name: /Sign out/ })
    expect(signOut).toHaveAttribute('aria-disabled', 'true')
    await user.click(signOut)
    expect(onTheme).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  // ── Remote search ──────────────────────────────────────────────────────────────────────────

  type Deferred = {
    query: string
    signal: AbortSignal
    resolve: (r: readonly CommandPaletteResult[]) => void
    reject: (e: unknown) => void
  }

  function remote() {
    const calls: Deferred[] = []
    const onSearch = mock(
      (query: string, signal: AbortSignal) =>
        new Promise<readonly CommandPaletteResult[]>((resolve, reject) => {
          calls.push({ query, signal, resolve, reject })
        }),
    )
    return { calls, onSearch }
  }

  it('debounces onSearch by 150ms and never searches an empty query', async () => {
    const { calls, onSearch } = remote()
    render(<Example defaultOpen onSearch={onSearch} />)
    await screen.findByRole('dialog')
    await sleep(200)
    expect(onSearch).not.toHaveBeenCalled()
    await userEvent.type(input(), ' fak ')
    expect(onSearch).not.toHaveBeenCalled()
    await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(1))
    expect(calls[0]?.query).toBe('fak')
    expect(calls[0]?.signal).toBeInstanceOf(AbortSignal)
  })

  it('shows Searching…, then the results first under the results heading', async () => {
    const { calls, onSearch } = remote()
    const pick = mock(() => {})
    render(<Example defaultOpen onSearch={onSearch} />)
    await screen.findByRole('dialog')
    await userEvent.type(input(), 'fa')
    const searching = await screen.findByText('Searching…')
    expect(searching.closest('[role="status"]')).toHaveAttribute('aria-live', 'polite')
    // While the search runs, an empty local list doesn't claim "No results".
    expect(screen.queryByText(/No results/)).toBeNull()
    await act(async () =>
      calls[0]?.resolve([
        { id: '1', label: 'Fakerino#EUW', description: 'EUW', icon: <UserIcon />, onSelect: pick },
        { id: '2', label: 'Fatal#NA1', href: '#players/fatal' },
      ]),
    )
    const results = await screen.findByRole('group', { name: 'Results' })
    expect(within(results).getAllByRole('option')).toHaveLength(2)
    expect(screen.queryByText('Searching…')).toBeNull()
    // Remote results come first, matched letters highlighted.
    expect(optionNames()[0]).toBe('Fakerino#EUW')
    const marks = screen.getAllByRole('option')[0]?.querySelectorAll('.font-extrabold')
    expect([...(marks ?? [])].map((m) => m.textContent)).toEqual(['Fa'])
    await waitFor(() => expect(highlighted()?.textContent).toContain('Fakerino'))
    await userEvent.keyboard('[Enter]')
    expect(pick).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('aborts stale searches and ignores their late answers', async () => {
    const { calls, onSearch } = remote()
    render(<Example defaultOpen onSearch={onSearch} />)
    await screen.findByRole('dialog')
    await userEvent.type(input(), 'a')
    await waitFor(() => expect(calls).toHaveLength(1))
    await userEvent.type(input(), 'b')
    expect(calls[0]?.signal.aborted).toBe(true)
    await waitFor(() => expect(calls).toHaveLength(2))
    expect(calls[1]?.query).toBe('ab')
    await act(async () => calls[0]?.resolve([{ id: 'old', label: 'Stale result' }]))
    await act(async () => calls[1]?.resolve([{ id: 'new', label: 'Abyss' }]))
    expect(await screen.findByRole('option', { name: 'Abyss' })).toBeInTheDocument()
    expect(screen.queryByText('Stale result')).toBeNull()
  })

  it('shows the error row when onSearch fails (rejects or throws)', async () => {
    const failing = mock(() => {
      throw new Error('offline')
    })
    render(<Example defaultOpen onSearch={failing} />)
    await screen.findByRole('dialog')
    await userEvent.type(input(), 'zzz')
    expect(await screen.findByText("Couldn't search. Try again.")).toBeInTheDocument()
    expect(screen.queryByText(/No results/)).toBeNull()
  })

  it('shows "No results" once a search comes back empty', async () => {
    const { calls, onSearch } = remote()
    render(<Example defaultOpen onSearch={onSearch} />)
    await screen.findByRole('dialog')
    await userEvent.type(input(), 'zzz')
    await waitFor(() => expect(calls).toHaveLength(1))
    await act(async () => calls[0]?.resolve([]))
    expect(await screen.findByText('No results for “zzz”')).toBeInTheDocument()
  })

  it('aborts the pending search when the palette closes', async () => {
    const { calls, onSearch } = remote()
    const user = userEvent.setup()
    render(<Example onSearch={onSearch} />)
    await open(user)
    await user.type(input(), 'fa')
    await waitFor(() => expect(calls).toHaveLength(1))
    await user.keyboard('[Escape]')
    await waitFor(() => expect(calls[0]?.signal.aborted).toBe(true))
  })

  // ── Labels & registration ──────────────────────────────────────────────────────────────────

  it('translates every label', async () => {
    render(
      <Example
        labels={{
          placeholder: 'Buscar…',
          dialog: 'Paleta de comandos',
          move: 'para moverte',
          open: 'para abrir',
          close: 'para cerrar',
          empty: (q) => `Nada para “${q}”`,
        }}
      />,
    )
    const button = screen.getByRole('button', { name: /Buscar…/ })
    await userEvent.click(button)
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Paleta de comandos')
    expect(input()).toHaveAccessibleName('Buscar…')
    expect(input()).toHaveAttribute('placeholder', 'Buscar…')
    for (const text of ['para moverte', 'para abrir', 'para cerrar'])
      expect(screen.getByText(text)).toBeInTheDocument()
    await userEvent.type(input(), 'zzz')
    expect(await screen.findByText('Nada para “zzz”')).toBeInTheDocument()
  })

  it('collects items from your own components and ungrouped items, in document order', async () => {
    function Recent({ names }: { names: string[] }) {
      return (
        <CommandPalette.Group heading="Recent">
          {names.map((n) => (
            <CommandPalette.Item key={n} value={n} />
          ))}
        </CommandPalette.Group>
      )
    }
    function App() {
      const [names, setNames] = useState(['Bravo', 'Charlie'])
      return (
        <>
          <button type="button" onClick={() => setNames(['Alpha', 'Bravo', 'Charlie'])}>
            Add
          </button>
          <CommandPalette defaultOpen>
            <CommandPalette.Item value="Home" />
            <Recent names={names} />
          </CommandPalette>
        </>
      )
    }
    render(<App />)
    await screen.findByRole('dialog')
    await waitFor(() => expect(optionNames()).toEqual(['Home', 'Bravo', 'Charlie']))
    // An ungrouped item sits in a group with no heading.
    expect(screen.getAllByRole('group')).toHaveLength(2)
    // A newly mounted item lands where it is in the tree, not at the end.
    fireEvent.click(screen.getByRole('button', { name: 'Add', hidden: true }))
    await waitFor(() => expect(optionNames()).toEqual(['Home', 'Alpha', 'Bravo', 'Charlie']))
  })

  it('throws a clear error when a part is used outside CommandPalette', () => {
    const quiet = console.error
    console.error = () => {}
    try {
      expect(() => render(<CommandPalette.Item value="Lost" />)).toThrow(
        '<CommandPalette.Item> must be inside <CommandPalette>.',
      )
      expect(() => render(<CommandPalette.Trigger />)).toThrow(
        '<CommandPalette.Trigger> must be inside <CommandPalette>.',
      )
    } finally {
      console.error = quiet
    }
  })
})
