# Component: CommandPalette

> Follows the `docs/component-button.md` template. `'use client'`: Base UI `dialog` + Base UI
> `autocomplete` with an inline list (`<Autocomplete.Root inline open>`). Compound (Q42).

## 1. Purpose

One search box, opened from anywhere with ⌘K / Ctrl+K, that finds players, pages and actions. It
filters the items you give it as you type, can ask your server for more (a player lookup), and can
show a hint when the text is almost valid ("Add the tag after a #"). Enter opens the highlighted
result; Escape closes and puts focus back where it was.

## 2. Files

```
packages/ui/src/components/command-palette/
├── command-palette.styles.tsx   # tv() slots: trigger, backdrop, popup, inputRow, input, list, group,
│                                #   groupHeading, item, itemIcon, itemText, itemEnd, hint, empty, footer.
├── command-palette.logic.tsx    # 'use client'; compound; fuzzy filter, remote search, shortcut.
├── command-palette.test.tsx
├── command-palette.stories.tsx
└── index.tsx                    # export { CommandPalette }; export type { CommandPaletteProps,
                                 #   CommandPaletteItemProps, CommandPaletteGroupProps, CommandPaletteResult,
                                 #   CommandPaletteLabels }
test/browser/command-palette.test.ts  # Playwright: shortcut opens, type filters, arrows + Enter, Escape
```

Uses `Kbd` (footer hints, trigger hint, item shortcuts) and `SearchIcon`.

## 3. API

```ts
import type { ReactNode } from 'react'

export interface CommandPaletteResult {
  id: string
  label: string
  description?: string
  icon?: ReactNode
  href?: string
  onSelect?: () => void
}

export interface CommandPaletteLabels {
  placeholder: string        // 'Search…'
  dialog: string             // 'Command palette' (dialog name)
  results: string            // 'Results' (remote group heading)
  searching: string          // 'Searching…'
  searchFailed: string       // "Couldn't search. Try again."
  empty: (query: string) => string   // q => `No results for “${q}”`
  move: string; open: string; close: string   // footer: 'to move', 'to open', 'to close'
}

export interface CommandPaletteProps {
  children: ReactNode                       // Trigger, Group, Item, Empty
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Global shortcut that opens it. Default 'mod+K'; `null` turns it off. */
  shortcut?: string | null
  /** Remote results for the query, shown first under `labels.results`. Debounced 150ms; the signal
   *  aborts stale requests. */
  onSearch?: (query: string, signal: AbortSignal) => Promise<readonly CommandPaletteResult[]>
  /** A line under the input for an almost-valid query, e.g. sukuna-gg-web's Riot ID rules. */
  hint?: (query: string) => ReactNode | null
  /** Max items shown per group while searching. Default 5. */
  maxPerGroup?: number
  labels?: Partial<CommandPaletteLabels>
}

export interface CommandPaletteGroupProps { heading: string; children: ReactNode }

export interface CommandPaletteItemProps {
  /** Text that is searched and shown (matched letters highlighted). */
  value: string
  /** Extra words that match but aren't shown ('settings' for "Preferences"). */
  keywords?: readonly string[]
  description?: string
  icon?: ReactNode
  /** Kbd keys shown at the end, e.g. 'mod+shift+L'. The palette doesn't bind them. */
  shortcut?: string
  href?: string                 // renders a link; Enter follows it
  onSelect?: () => void         // for actions; the palette closes after
  disabled?: boolean
}
```

```tsx
<CommandPalette onSearch={searchPlayers} hint={(q) => (q.includes('#') ? riotIdProblem(q) : null)}>
  <CommandPalette.Trigger />
  <CommandPalette.Group heading="Recent players">
    {recent.map((p) => <CommandPalette.Item key={p.id} value={p.riotId} description={p.meta} href={p.href} />)}
  </CommandPalette.Group>
  <CommandPalette.Group heading="Actions">
    <CommandPalette.Item value="Switch theme" shortcut="mod+shift+L" onSelect={toggleTheme} />
  </CommandPalette.Group>
</CommandPalette>
```

`CommandPalette.Trigger` renders a search-field-looking button ("Search…" + the shortcut as
`Kbd`); pass `render` to use your own element. `CommandPalette.Empty` overrides the empty message.

Deliberately **not** in v1: nested pages ("> theme > dark"), recent-history storage (the app owns
it), binding item `shortcut`s globally, multi-select.

## 4. Variants → tokens

No variants. Backdrop and popup as `Dialog` (`--sk-z-dialog`), popup `min(580px, 100vw - 2rem)`,
`rounded-lg`, `--sk-surface`, `shadow-card`, placed at 12vh from the top (not centered, so the list
grows downward without moving the input).

| Part | Treatment |
|---|---|
| input row | 54px, 15.5px text, `SearchIcon` `--sk-text-faint`, `Esc` key cap at the end, bottom `--sk-line-soft` |
| list | max 324px, scrolls; 6px padding |
| group heading | `text-xs` bold uppercase, tracking .1em, `--sk-text-faint` |
| item | 2 lines (label semibold `--sk-text`, description `text-xs --sk-text-faint`), 30px icon tile `--sk-surface-2`; highlighted `bg --sk-surface-2`, icon `--sk-accent` on `--sk-surface`, a `↵` at the end |
| match highlight | matched letters `--sk-accent`, extra-bold (no background) |
| hint | `--sk-accent` at 9% panel, `InfoIcon` in `--sk-accent`, text `--sk-text` |
| footer | `text-xs --sk-text-faint` with Kbd hints, top `--sk-line-soft` |

## 5. States

| State | Behavior |
|---|---|
| closed | server renders the Trigger only |
| open, empty query | all groups, in the order given; first item highlighted |
| typing | items filtered and sorted by score within each group; empty groups hide; `maxPerGroup` |
| remote search | "Searching…" row under `labels.results` (after 150ms debounce), then results; stale requests aborted; errors show `labels.searchFailed` |
| hint | shown above the results while `hint(query)` returns something |
| no results | `labels.empty(query)` or `CommandPalette.Empty` |
| select | `href` items navigate (real `<a>`), `onSelect` runs; the dialog closes; focus returns to the element that opened it |

**Motion:** Dialog's fade + 98→100% scale; reduced motion instant.

## 6. Logic (`command-palette.logic.tsx`)

- `'use client'`. `Base.Dialog.Root` (open state via `useControllableState`) → Portal → Backdrop →
  Popup → `Base.Autocomplete.Root inline open autoHighlight="always"` with our `filter` →
  `Autocomplete.Input` + `Autocomplete.List` (groups via `Autocomplete.Group`/`GroupLabel`).
  Base UI owns roving highlight, `aria-activedescendant` and the listbox roles.
- **Filter:** subsequence match over `value` + `keywords`, case- and accent-insensitive (NFD,
  marks stripped, so "bahia" finds "Bahía"). Score: +1 per matched letter, +3 for consecutive
  letters, +2 at a word start; ties keep the given order. The matched indices drive the highlight.
- **Shortcut:** one `keydown` listener on `document` (in `useEffect`) for `shortcut`, parsed by the
  Kbd key table; `mod` = Meta on Apple platforms, Ctrl elsewhere. Calls `preventDefault` so the
  browser's own Ctrl+K doesn't fire.
- **Remote search:** `onSearch` runs after 150ms idle with a fresh `AbortController`; results render
  as items in a first group. Pending/failed states are rows in the list, announced politely.
- Items are registered through context (React order), so the server/first render never depends on
  measuring.

## 7. Styles (`command-palette.styles.tsx`)

`tv()` `slots` as in §2. No variants. Highlight via `data-[highlighted]` from Base UI.

## 8. Accessibility checklist

- [ ] Dialog named (`labels.dialog`); focus goes to the input on open and back to the opener on close.
- [ ] Input is `role="combobox"` with `aria-controls` and `aria-activedescendant` (Base UI).
- [ ] Groups are `role="group"` labelled by their heading; items are options with their full label
      (highlight marks are presentational).
- [ ] Hint, "Searching…" and empty states are polite live regions.
- [ ] `href` items are real links (middle-click, open in new tab work).
- [ ] Shortcut shown on the Trigger with `Kbd`; it's never the only way to open the palette.
- [ ] Text ≥ 4.5:1; focus/highlight visible in both themes.

## 9. Tests

**Unit:** server renders the Trigger only; shortcut opens (Meta on Mac, Ctrl elsewhere) and
`shortcut={null}` doesn't; filter scoring and accent folding; groups hide when empty;
`maxPerGroup`; `hint`; `onSearch` debounce, abort of stale calls, loading and error rows; `href` vs
`onSelect`; closes and restores focus; `Empty` override; labels; axe both themes (open).
**Browser:** Ctrl+K opens; type → arrows → Enter follows the link; Escape closes and focus returns.

## 10. Stories

`PlayerSearch` (sukuna-gg-web style with `hint` and a fake `onSearch`), `Actions` (shortcuts),
`Loading`, `Empty`, `CustomTrigger`. Both `data-theme` values.

## 11. Decisions

- Built-in filtering **and** optional `onSearch` (owner, Q42 recommendation 1).
- Base UI Autocomplete's `inline` mode instead of a hand-rolled listbox: same keyboard model as
  Combobox, no new dependency.
- Budget target: `Combobox + deps` (53 kB) + `Dialog` parts + ~2 kB own code, measured +10% (P5).
