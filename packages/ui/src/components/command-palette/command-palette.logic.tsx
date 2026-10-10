'use client'

import { Autocomplete } from '@base-ui/react/autocomplete'
import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import {
  type ComponentPropsWithoutRef,
  type Context,
  createContext,
  forwardRef,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { useControllableState } from '../../hooks/use-controllable-state'
import { InfoIcon, SearchIcon } from '../icon'
import { Kbd } from '../kbd'
import { fuzzyMatch, matchItem, normalizeQuery } from './command-palette.filter'
import { isTyping, matchesShortcut, parseShortcut } from './command-palette.shortcut'
import { commandPaletteStyles } from './command-palette.styles'

const styles = commandPaletteStyles()

// ─── Public types ────────────────────────────────────────────────────────────────────────────────

/** A remote result returned by `onSearch`. Shown first, under `labels.results`. */
export interface CommandPaletteResult {
  /** Stable id, unique among the results of one search (used as the React key). */
  id: string
  /** The text shown (and spoken) for the result. Letters matching the query are highlighted. */
  label: string
  /** A second, smaller line under the label (region, rank, last seen…). */
  description?: string
  /** A decorative icon or avatar drawn in a 30px tile at the start of the row. */
  icon?: ReactNode
  /** Makes the row a real link: Enter or a click follows it, middle-click opens a new tab. */
  href?: string
  /** Runs when the row is picked (Enter or click); the palette closes afterwards. */
  onSelect?: () => void
}

/** Every string the palette renders, for translation. Pass any subset as `labels`. */
export interface CommandPaletteLabels {
  /**
   * Input placeholder and accessible name; also the Trigger's text.
   * @default 'Search…'
   */
  placeholder: string
  /**
   * The dialog's accessible name.
   * @default 'Command palette'
   */
  dialog: string
  /**
   * Heading of the remote results group (`onSearch`).
   * @default 'Results'
   */
  results: string
  /**
   * Row shown while `onSearch` is pending.
   * @default 'Searching…'
   */
  searching: string
  /**
   * Row shown when `onSearch` rejects.
   * @default "Couldn't search. Try again."
   */
  searchFailed: string
  /**
   * Message when nothing matches the query, called with the trimmed query.
   * @default (q) => `No results for “${q}”`
   */
  empty: (query: string) => string
  /**
   * Footer hint after the ↑ ↓ keys.
   * @default 'to move'
   */
  move: string
  /**
   * Footer hint after the ↵ key.
   * @default 'to open'
   */
  open: string
  /**
   * Footer hint after the Esc key.
   * @default 'to close'
   */
  close: string
}

/** Props for the `CommandPalette` root. The parts go in `children`. */
export interface CommandPaletteProps {
  /** The parts: a `CommandPalette.Trigger`, `Group`s of `Item`s, and optionally an `Empty`. */
  children: ReactNode
  /** Controlled open state; pair with `onOpenChange`. Omit to let the palette manage itself. */
  open?: boolean
  /**
   * Whether the palette starts open in uncontrolled mode.
   * @default false
   */
  defaultOpen?: boolean
  /** Fires with the requested state when the palette opens or closes (any reason). */
  onOpenChange?: (open: boolean) => void
  /**
   * Global shortcut that toggles the palette from anywhere on the page, as a Kbd chord. `mod` is
   * ⌘ on Apple platforms and Ctrl elsewhere. `null` turns it off (the Trigger hides its key caps).
   * A bare key (e.g. `'/'`) is ignored while the user types in a field.
   * @default 'mod+K'
   */
  shortcut?: string | null
  /**
   * Remote results for the query (a player lookup…), shown first under `labels.results`. Called
   * with the trimmed query after 150 ms without typing (never for an empty query); `signal` aborts
   * when the query changes or the palette closes. A rejection shows `labels.searchFailed`.
   */
  onSearch?: (query: string, signal: AbortSignal) => Promise<readonly CommandPaletteResult[]>
  /**
   * A line above the results for an almost-valid query ("Add the tag after a #"). Called with the
   * raw input on every change; return `null` to show nothing. Announced politely.
   */
  hint?: (query: string) => ReactNode | null
  /**
   * Max items shown per group while searching (the best-scoring ones). An empty query shows every
   * item. Remote results are shown as returned. `Infinity` turns the cap off.
   * @default 5
   */
  maxPerGroup?: number
  /** Translations; merged over the English defaults. */
  labels?: Partial<CommandPaletteLabels>
}

/** Props for `CommandPalette.Group`: a heading over related items. */
export interface CommandPaletteGroupProps {
  /** Visible group heading; also the group's accessible name. */
  heading: string
  /** The group's `CommandPalette.Item`s (directly or inside your own components). */
  children: ReactNode
}

/** Props for `CommandPalette.Item`: one searchable row. Renders nothing where you write it. */
export interface CommandPaletteItemProps {
  /** Text that is searched and shown (matched letters highlighted). */
  value: string
  /** Extra words that match but aren't shown ('settings' for "Preferences"). */
  keywords?: readonly string[]
  /** A second, smaller line under the label. */
  description?: string
  /** A decorative icon or avatar drawn in a 30px tile at the start of the row. */
  icon?: ReactNode
  /** Kbd keys shown at the end, e.g. 'mod+shift+L'. The palette doesn't bind them. */
  shortcut?: string
  /** Makes the row a real link: Enter or a click follows it, middle-click opens a new tab. */
  href?: string
  /** Runs when the row is picked (Enter or click); the palette closes afterwards. */
  onSelect?: () => void
  /**
   * Shows the row but makes it unpickable (and drops its link).
   * @default false
   */
  disabled?: boolean
}

/** Props for `CommandPalette.Trigger`: a native button, or your own element through `render`. */
export interface CommandPaletteTriggerProps extends ComponentPropsWithoutRef<'button'> {
  /**
   * Your own element instead of the search-field button, e.g.
   * `<Button iconOnly aria-label="Search"><SearchIcon /></Button>`. The trigger props (click,
   * `aria-expanded`, ref) are merged onto it; the default styles and content are not applied.
   */
  render?: ReactElement
}

/** Props for `CommandPalette.Empty`: replaces the "No results" message. */
export interface CommandPaletteEmptyProps {
  /** What to show when nothing matches; a function receives the trimmed query. */
  children: ReactNode | ((query: string) => ReactNode)
}

// ─── Registry: Items register here; the open list reads it ──────────────────────────────────────

interface Row {
  key: string
  value: string
  keywords?: readonly string[]
  description?: string
  icon?: ReactNode
  shortcut?: string
  href?: string
  onSelect?: () => void
  disabled?: boolean
}

interface GroupInfo {
  id: string
  heading: string
}

interface Registered extends Row {
  group: GroupInfo | null
  /** An empty `<template>` the Item renders in place; its document position is the item's order. */
  node: Element
}

type EmptyContent = CommandPaletteEmptyProps['children']

interface Snapshot {
  rows: readonly Registered[]
  empty: EmptyContent | undefined
}

function createRegistry() {
  const rows = new Map<string, Registered>()
  const listeners = new Set<() => void>()
  let empty: EmptyContent | undefined
  let snapshot: Snapshot | null = null
  const changed = () => {
    snapshot = null
    for (const listener of listeners) listener()
  }
  return {
    setRow(key: string, row: Registered | null) {
      if (row) rows.set(key, row)
      else rows.delete(key)
      changed()
    },
    setEmpty(content: EmptyContent | undefined) {
      empty = content
      changed()
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    get(): Snapshot {
      snapshot ??= { rows: [...rows.values()], empty }
      return snapshot
    },
  }
}

type Registry = ReturnType<typeof createRegistry>

const RegistryContext = createContext<Registry | null>(null)
const TriggerContext = createContext<{
  labels: CommandPaletteLabels
  shortcut: string | null
} | null>(null)
const GroupContext = createContext<GroupInfo | null>(null)

function useRequired<T>(context: Context<T | null>, part: string): T {
  const value = useContext(context)
  if (value === null) throw new Error(`<CommandPalette.${part}> must be inside <CommandPalette>.`)
  return value
}

const DEFAULT_LABELS: CommandPaletteLabels = {
  placeholder: 'Search…',
  dialog: 'Command palette',
  results: 'Results',
  searching: 'Searching…',
  searchFailed: "Couldn't search. Try again.",
  empty: (query) => `No results for “${query}”`,
  move: 'to move',
  open: 'to open',
  close: 'to close',
}

// ─── Remote search ──────────────────────────────────────────────────────────────────────────────

interface RemoteState {
  /** idle: no `onSearch` or no query · waiting: debouncing · pending · done · error. */
  status: 'idle' | 'waiting' | 'pending' | 'done' | 'error'
  results: readonly CommandPaletteResult[]
}

const IDLE: RemoteState = { status: 'idle', results: [] }
const WAITING: RemoteState = { status: 'waiting', results: [] }

function useRemoteSearch(onSearch: CommandPaletteProps['onSearch'], query: string): RemoteState {
  const q = query.trim()
  const enabled = onSearch !== undefined && q !== ''
  const [state, setState] = useState<RemoteState & { q: string }>({ ...IDLE, q: '' })
  // Latest callback without restarting the debounce when the parent passes a new function.
  const latest = useRef(onSearch)
  useEffect(() => {
    latest.current = onSearch
  })
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const settle = (next: RemoteState) => {
      if (!controller.signal.aborted) setState({ ...next, q })
    }
    const timer = setTimeout(() => {
      setState({ status: 'pending', results: [], q })
      const search = latest.current as NonNullable<CommandPaletteProps['onSearch']>
      // A sync throw becomes a rejection too.
      Promise.resolve()
        .then(() => search(q, controller.signal))
        .then(
          (results) => settle({ status: 'done', results }),
          () => settle({ status: 'error', results: [] }),
        )
    }, 150)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [enabled, q])
  if (!enabled) return IDLE
  return state.q === q ? state : WAITING
}

// ─── The open palette ───────────────────────────────────────────────────────────────────────────

/** A row placed in the list for the current query; Base UI's item value. */
interface Option {
  row: Row
  indices: readonly number[]
}

/** One group in the list. A type alias (not an interface) so it fits Base UI's `Group` shape. */
type Section = {
  id: string
  heading?: string
  items: Option[]
}

// 4 = Node.DOCUMENT_POSITION_FOLLOWING: `b` comes after `a`, so `a` sorts first.
const byDocumentOrder = (a: Registered, b: Registered) =>
  a.node.compareDocumentPosition(b.node) & 4 ? -1 : 1

const shown = (node: ReactNode) => node != null && node !== false && node !== ''

/**
 * The label with the matched letters wrapped. Screen readers get the whole label from a
 * visually-hidden copy; the split, highlighted copy is `aria-hidden` (some readers would
 * otherwise say "Ab… yss").
 */
function highlight(text: string, indices: readonly number[]): ReactNode {
  if (indices.length === 0) return text
  const hits = new Set(indices)
  const parts: ReactNode[] = []
  let run = ''
  let on = false
  let index = 0
  const flush = () => {
    if (run)
      parts.push(
        on ? (
          <span key={parts.length} className={styles.match()}>
            {run}
          </span>
        ) : (
          run
        ),
      )
    run = ''
  }
  for (const ch of text) {
    const hit = hits.has(index++)
    if (hit !== on) {
      flush()
      on = hit
    }
    run += ch
  }
  flush()
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{parts}</span>
    </>
  )
}

function PaletteOption({ option, close }: { option: Option; close: () => void }) {
  const { row, indices } = option
  const link = row.href !== undefined && !row.disabled
  const onClick = (event: MouseEvent) => {
    if (link) {
      // A plain click (or Enter) navigates and closes; ⌘/Ctrl/Shift-click opens elsewhere and
      // keeps the palette open.
      if (!(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) close()
      return
    }
    row.onSelect?.()
    close()
  }
  return (
    <Autocomplete.Item
      value={option}
      disabled={row.disabled}
      // Options are reached with the arrows (aria-activedescendant), never with Tab. Base UI
      // clones this element and gives it the row as its content.
      // biome-ignore lint/a11y/useAnchorContent: the content arrives through the clone.
      render={link ? <a href={row.href} tabIndex={-1} /> : undefined}
      onClick={onClick}
      className={styles.item()}
    >
      {row.icon ? (
        <span aria-hidden="true" className={styles.itemIcon()}>
          {row.icon}
        </span>
      ) : null}
      <span className={styles.itemText()}>
        <span className={styles.itemLabel()}>{highlight(row.value, indices)}</span>
        {row.description ? (
          <span className={styles.itemDescription()}>{row.description}</span>
        ) : null}
      </span>
      <span className={styles.itemEnd()}>
        {row.shortcut ? (
          <Kbd keys={row.shortcut} size="sm" />
        ) : (
          <span aria-hidden="true" className={styles.enter()}>
            ↵
          </span>
        )}
      </span>
    </Autocomplete.Item>
  )
}

interface PaletteBodyProps {
  registry: Registry
  labels: CommandPaletteLabels
  inputRef: RefObject<HTMLInputElement | null>
  close: () => void
  onSearch: CommandPaletteProps['onSearch']
  hint: CommandPaletteProps['hint']
  maxPerGroup: number
}

function PaletteBody({
  registry,
  labels,
  inputRef,
  close,
  onSearch,
  hint,
  maxPerGroup,
}: PaletteBodyProps) {
  const { rows, empty } = useSyncExternalStore(registry.subscribe, registry.get, registry.get)
  const [query, setQuery] = useState('')
  const remote = useRemoteSearch(onSearch, query)
  const trimmed = query.trim()

  const sections = useMemo(() => {
    const q = normalizeQuery(query)
    const out: Section[] = []
    if (remote.results.length > 0)
      out.push({
        id: 'remote',
        heading: labels.results,
        items: remote.results.map((r) => ({
          row: {
            key: `remote:${r.id}`,
            value: r.label,
            description: r.description,
            icon: r.icon,
            href: r.href,
            onSelect: r.onSelect,
          },
          indices: fuzzyMatch(r.label, q)?.indices ?? [],
        })),
      })
    // Groups in the order their first item appears; items scored within each group.
    const groups = new Map<
      string,
      { heading?: string; hits: { option: Option; score: number }[] }
    >()
    for (const row of [...rows].sort(byDocumentOrder)) {
      const id = row.group?.id ?? ''
      let group = groups.get(id)
      if (!group) {
        group = { heading: row.group?.heading, hits: [] }
        groups.set(id, group)
      }
      const hit = matchItem(row.value, row.keywords, q)
      if (hit) group.hits.push({ option: { row, indices: hit.indices }, score: hit.score })
    }
    for (const [id, group] of groups) {
      if (group.hits.length === 0) continue
      // Array#sort is stable, so equal scores keep the given order.
      const hits = q
        ? group.hits.sort((a, b) => b.score - a.score).slice(0, maxPerGroup)
        : group.hits
      out.push({ id, heading: group.heading, items: hits.map((h) => h.option) })
    }
    return out
  }, [rows, query, remote.results, labels.results, maxPerGroup])

  const hintNode = hint?.(query)
  const busy = remote.status === 'waiting' || remote.status === 'pending'
  const emptyContent =
    typeof empty === 'function' ? empty(trimmed) : (empty ?? labels.empty(trimmed))

  return (
    <Autocomplete.Root
      items={sections}
      filteredItems={sections}
      inline
      open
      autoHighlight="always"
      value={query}
      // Never let a picked item's value land in the input; the palette closes instead.
      onValueChange={(next, details) => {
        if (details.reason !== 'item-press') setQuery(next)
      }}
    >
      <div className={styles.inputRow()}>
        <SearchIcon className={styles.inputIcon()} />
        <Autocomplete.Input
          ref={inputRef}
          aria-label={labels.placeholder}
          placeholder={labels.placeholder}
          className={styles.input()}
        />
        <Kbd keys="esc" size="sm" aria-hidden="true" />
      </div>
      <Autocomplete.Status>
        {shown(hintNode) ? (
          <div className={styles.hint()}>
            <InfoIcon size={15} className={styles.hintIcon()} />
            <span>{hintNode}</span>
          </div>
        ) : null}
      </Autocomplete.Status>
      <div className={styles.scroller()}>
        <Autocomplete.Status>
          {remote.status === 'pending' || remote.status === 'error' ? (
            <>
              <div aria-hidden="true" className={styles.groupHeading()}>
                {labels.results}
              </div>
              <div className={styles.statusRow()}>
                {remote.status === 'pending' ? labels.searching : labels.searchFailed}
              </div>
            </>
          ) : null}
        </Autocomplete.Status>
        <Autocomplete.List className={styles.list()}>
          {(section: Section) => (
            <Autocomplete.Group key={section.id} items={section.items} className={styles.group()}>
              {section.heading ? (
                <Autocomplete.GroupLabel className={styles.groupHeading()}>
                  {section.heading}
                </Autocomplete.GroupLabel>
              ) : null}
              <Autocomplete.Collection>
                {(option: Option) => (
                  <PaletteOption key={option.row.key} option={option} close={close} />
                )}
              </Autocomplete.Collection>
            </Autocomplete.Group>
          )}
        </Autocomplete.List>
        <Autocomplete.Empty>
          {trimmed && !busy && remote.status !== 'error' ? (
            <div className={styles.emptyMessage()}>{emptyContent}</div>
          ) : null}
        </Autocomplete.Empty>
      </div>
      <div className={styles.footer()}>
        <span className={styles.footerHint()}>
          <Kbd keys="up" size="sm" />
          <Kbd keys="down" size="sm" />
          {labels.move}
        </span>
        <span className={styles.footerHint()}>
          <Kbd keys="enter" size="sm" />
          {labels.open}
        </span>
        <span className={styles.footerHint()}>
          <Kbd keys="esc" size="sm" />
          {labels.close}
        </span>
      </div>
    </Autocomplete.Root>
  )
}

// ─── Parts ──────────────────────────────────────────────────────────────────────────────────────

type NavigatorUAData = Navigator & { userAgentData?: { platform?: string } }

/** The state-holding root. Exported as `CommandPalette`; see that doc block. */
function CommandPaletteRoot({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  shortcut = 'mod+K',
  onSearch,
  hint,
  maxPerGroup = 5,
  labels,
}: CommandPaletteProps) {
  const [isOpen, setOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  })
  const [registry] = useState(createRegistry)
  const inputRef = useRef<HTMLInputElement>(null)
  const merged = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const trigger = useMemo(() => ({ labels: merged, shortcut }), [merged, shortcut])

  // One document listener for the shortcut; it reads the latest state through a ref.
  const live = useRef({ isOpen, setOpen })
  useEffect(() => {
    live.current = { isOpen, setOpen }
  })
  useEffect(() => {
    if (!shortcut) return
    const chord = parseShortcut(shortcut)
    const nav = navigator as NavigatorUAData
    const apple = /mac|iphone|ipad|ipod/i.test(
      nav.userAgentData?.platform || nav.platform || nav.userAgent,
    )
    const bare = !(chord.mod || chord.ctrl || chord.meta || chord.alt)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || !matchesShortcut(event, chord, apple)) return
      if (bare && isTyping(event.target)) return
      // Keep the browser's own Ctrl+K (search bar) from firing.
      event.preventDefault()
      live.current.setOpen(!live.current.isOpen)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [shortcut])

  return (
    <RegistryContext.Provider value={registry}>
      <TriggerContext.Provider value={trigger}>
        <BaseDialog.Root open={isOpen} onOpenChange={(next) => setOpen(next)}>
          {children}
          <BaseDialog.Portal>
            <BaseDialog.Backdrop className={styles.backdrop()} />
            <BaseDialog.Popup
              aria-label={merged.dialog}
              initialFocus={inputRef}
              className={styles.popup()}
            >
              <PaletteBody
                registry={registry}
                labels={merged}
                inputRef={inputRef}
                close={() => setOpen(false)}
                onSearch={onSearch}
                hint={hint}
                maxPerGroup={maxPerGroup}
              />
            </BaseDialog.Popup>
          </BaseDialog.Portal>
        </BaseDialog.Root>
      </TriggerContext.Provider>
    </RegistryContext.Provider>
  )
}

/**
 * Opens the palette. By default a button that looks like a search field: a search icon,
 * `labels.placeholder` and the shortcut as `Kbd`. Pass `render` to use your own element; the
 * trigger props are merged onto it. Focus returns here when the palette closes.
 */
const CommandPaletteTrigger = forwardRef<HTMLButtonElement, CommandPaletteTriggerProps>(
  function CommandPaletteTrigger({ render, className, children, ...rest }, ref) {
    const { labels, shortcut } = useRequired(TriggerContext, 'Trigger')
    if (render)
      return (
        <BaseDialog.Trigger ref={ref} render={render} className={className} {...rest}>
          {children}
        </BaseDialog.Trigger>
      )
    return (
      <BaseDialog.Trigger ref={ref} className={styles.trigger({ className })} {...rest}>
        {children ?? (
          <>
            <SearchIcon size={16} className={styles.triggerIcon()} />
            <span className={styles.triggerLabel()}>{labels.placeholder}</span>
            {shortcut ? <Kbd keys={shortcut} size="sm" /> : null}
          </>
        )}
      </BaseDialog.Trigger>
    )
  },
)

/** A heading over related items. Groups with no match while searching are hidden. */
function CommandPaletteGroup({ heading, children }: CommandPaletteGroupProps) {
  const id = useId()
  const group = useMemo(() => ({ id, heading }), [id, heading])
  return <GroupContext.Provider value={group}>{children}</GroupContext.Provider>
}

/**
 * One searchable row. It registers itself with the palette (in document order) and renders only
 * an empty, inert `<template>` where you write it; the row itself is drawn inside the open palette.
 */
function CommandPaletteItem(props: CommandPaletteItemProps) {
  const registry = useRequired(RegistryContext, 'Item')
  const group = useContext(GroupContext)
  const key = useId()
  const marker = useRef<HTMLTemplateElement>(null)
  // No deps: re-registered after every render, so the palette always has the latest props.
  useEffect(() => {
    registry.setRow(key, { ...props, key, group, node: marker.current as Element })
    return () => registry.setRow(key, null)
  })
  return <template ref={marker} />
}

/** Replaces the "No results" message (`labels.empty`). Renders nothing where you write it. */
function CommandPaletteEmpty({ children }: CommandPaletteEmptyProps) {
  const registry = useRequired(RegistryContext, 'Empty')
  useEffect(() => {
    registry.setEmpty(children)
    return () => registry.setEmpty(undefined)
  })
  return null
}

/**
 * One search box, opened from anywhere with ⌘K / Ctrl+K, that finds players, pages and actions.
 * It filters the items you give it as you type (fuzzy, accent-insensitive, matched letters
 * highlighted), can ask your server for more (`onSearch`) and can show a `hint` for an
 * almost-valid query. Enter opens the highlighted result; Escape closes and puts focus back.
 *
 * @remarks
 * - SSR/RSC: a client component (`'use client'`, Base UI Dialog + inline Autocomplete). The
 *   server renders only the Trigger (plus one empty `<template>` per Item, which is how items
 *   keep their order); the dialog and list exist only while open, on the client.
 * - Accessibility: the popup is a modal `role="dialog"` named by `labels.dialog`; focus moves to
 *   the input on open and back to the element that opened it on close. The input is a
 *   `role="combobox"` driving a `role="listbox"` through `aria-activedescendant`; groups are
 *   `role="group"` named by their heading; items are options named by their full text (the
 *   highlight spans are presentational). The hint, "Searching…" and empty message are polite
 *   live regions. `href` items are real links. The shortcut is shown on the Trigger with `Kbd`
 *   and is never the only way to open the palette.
 * - Keyboard: `shortcut` (default `mod+K`) toggles it from anywhere; ↑/↓ move, Enter picks, Esc
 *   closes. The first match is always highlighted.
 * - Filtering: subsequence match over `value` + `keywords`, case- and accent-insensitive; +1 per
 *   letter, +3 for consecutive letters, +2 at a word start; ties keep your order; empty groups
 *   hide; `maxPerGroup` (default 5) caps each group while searching.
 * - Parts: `CommandPalette` (state; `CommandPaletteProps`) · `CommandPalette.Trigger` (button or
 *   `render`) · `CommandPalette.Group` (`heading`) · `CommandPalette.Item` (`value`, `keywords`,
 *   `description`, `icon`, `shortcut`, `href` | `onSelect`, `disabled`) · `CommandPalette.Empty`.
 * - No visual variants. Not in v1: nested pages, recent-history storage, binding item shortcuts.
 *
 * @example
 * ```tsx
 * import { CommandPalette, UserIcon } from '@sukunagg/ui'
 *
 * const searchPlayers = (q: string, signal: AbortSignal) =>
 *   fetch(`/api/players?q=${encodeURIComponent(q)}`, { signal }).then((r) => r.json())
 *
 * <CommandPalette
 *   onSearch={searchPlayers}
 *   hint={(q) => (q && !q.includes('#') ? 'Add the tag after a #, like Name#NA1.' : null)}
 *   labels={{ placeholder: 'Search players, pages, actions…' }}
 * >
 *   <CommandPalette.Trigger />
 *   <CommandPalette.Group heading="Recent players">
 *     {recent.map((p) => (
 *       <CommandPalette.Item
 *         key={p.id}
 *         value={p.riotId}
 *         description={p.meta}
 *         icon={<UserIcon />}
 *         href={p.href}
 *       />
 *     ))}
 *   </CommandPalette.Group>
 *   <CommandPalette.Group heading="Actions">
 *     <CommandPalette.Item
 *       value="Switch theme"
 *       keywords={['dark', 'light']}
 *       shortcut="mod+shift+L"
 *       onSelect={toggleTheme}
 *     />
 *   </CommandPalette.Group>
 * </CommandPalette>
 * ```
 *
 * @example
 * ```tsx
 * // Controlled, your own trigger, Spanish labels, `/` as the shortcut.
 * import { useState } from 'react'
 * import { Button, CommandPalette, SearchIcon } from '@sukunagg/ui'
 *
 * function DocsSearch() {
 *   const [open, setOpen] = useState(false)
 *   return (
 *     <CommandPalette
 *       open={open}
 *       onOpenChange={setOpen}
 *       shortcut="/"
 *       labels={{ placeholder: 'Buscar…', empty: (q) => `Nada para “${q}”` }}
 *     >
 *       <CommandPalette.Trigger
 *         render={<Button iconOnly variant="ghost" aria-label="Buscar"><SearchIcon /></Button>}
 *       />
 *       <CommandPalette.Item value="Primeros pasos" href="/docs/start" />
 *       <CommandPalette.Empty>{(q) => `Prueba otra palabra que “${q}”`}</CommandPalette.Empty>
 *     </CommandPalette>
 *   )
 * }
 * ```
 */
export const CommandPalette = Object.assign(CommandPaletteRoot, {
  Trigger: CommandPaletteTrigger,
  Group: CommandPaletteGroup,
  Item: CommandPaletteItem,
  Empty: CommandPaletteEmpty,
})
