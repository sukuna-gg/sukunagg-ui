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
├── command-palette.styles.tsx    # tv() slots: trigger, triggerIcon, triggerLabel, backdrop, popup,
│                                 #   inputRow, inputIcon, input, hint, hintIcon, scroller, list, group,
│                                 #   groupHeading, item, itemIcon, itemText, itemLabel, itemDescription,
│                                 #   match, itemEnd, enter, statusRow, emptyMessage, footer, footerHint.
├── command-palette.logic.tsx     # 'use client'; compound; item registry, remote search, shortcut.
├── command-palette.filter.ts     # pure fuzzy scorer (fold, fuzzyMatch, matchItem).
├── command-palette.shortcut.ts   # pure chord parser/matcher for the global shortcut.
├── command-palette.test.tsx      # + command-palette.filter.test.ts, command-palette.shortcut.test.ts
├── command-palette.stories.tsx
└── index.tsx                     # export { CommandPalette }; export type { CommandPaletteProps,
                                  #   CommandPaletteItemProps, CommandPaletteGroupProps,
                                  #   CommandPaletteResult, CommandPaletteLabels,
                                  #   CommandPaletteTriggerProps, CommandPaletteEmptyProps }
test/browser/command-palette.test.ts  # Playwright: shortcut opens, type filters, arrows + Enter, Escape
```

Uses `Kbd` (footer hints, trigger hint, item shortcuts, the `Esc` cap), `SearchIcon` and `InfoIcon`.

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from 'react'

export interface CommandPaletteResult {
  id: string
  label: string
  description?: string
  icon?: ReactNode
  href?: string
  onSelect?: () => void
}

export interface CommandPaletteLabels {
  placeholder: string        // 'Search…' (input placeholder + name, Trigger text)
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
  /** Global shortcut that toggles it. Default 'mod+K'; `null` turns it off. */
  shortcut?: string | null
  /** Remote results for the trimmed query, shown first under `labels.results`. Debounced 150ms,
   *  never called for an empty query; the signal aborts stale requests and on close. */
  onSearch?: (query: string, signal: AbortSignal) => Promise<readonly CommandPaletteResult[]>
  /** A line above the results for an almost-valid query, e.g. sukuna-gg-web's Riot ID rules.
   *  Receives the raw input. */
  hint?: (query: string) => ReactNode | null
  /** Max items shown per local group while searching. Default 5; `Infinity` turns it off. */
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
  disabled?: boolean            // shown, never picked (a disabled link drops its href)
}

export interface CommandPaletteTriggerProps extends ComponentPropsWithoutRef<'button'> {
  render?: ReactElement         // your own element; trigger props are merged onto it
}

export interface CommandPaletteEmptyProps {
  children: ReactNode | ((query: string) => ReactNode)
}
```

```tsx
<CommandPalette onSearch={searchPlayers} hint={(q) => (q.includes('#') ? riotIdProblem(q) : null)}>
  <CommandPalette.Trigger />
  <CommandPalette.Group heading="Recent players">
    {recent.map((p) => (
      <CommandPalette.Item key={p.id} value={p.riotId} description={p.meta} href={p.href} />
    ))}
  </CommandPalette.Group>
  <CommandPalette.Group heading="Actions">
    <CommandPalette.Item value="Switch theme" shortcut="mod+shift+L" onSelect={toggleTheme} />
  </CommandPalette.Group>
</CommandPalette>
```

`CommandPalette.Trigger` renders a search-field-looking button ("Search…" + the shortcut as
`Kbd`, hidden when `shortcut={null}`); pass `render` to use your own element, or children to
replace its content. `CommandPalette.Empty` overrides the empty message; a function child gets the
trimmed query. Groups and Items may sit inside your own components: they register with the
palette through context, in document order.

Deliberately **not** in v1: nested pages ("> theme > dark"), recent-history storage (the app owns
it), binding item `shortcut`s globally, multi-select.

## 4. Variants → tokens

No variants. Backdrop and popup as `Dialog` (`--sk-z-dialog`), popup `min(580px, 100vw - 2rem)`
(never taller than the viewport below it), `rounded-lg`, `--sk-surface`, `shadow-card`, placed at
12vh from the top (not centered, so the list grows downward without moving the input).

| Part | Treatment |
|---|---|
| trigger | 40px, max 340px, `--sk-surface-2`, border `--sk-line` (hover `--sk-text-faint`), `rounded-md`, `--sk-text-faint` |
| input row | 54px, 15.5px text, `SearchIcon` `--sk-text-faint`, `Esc` key cap at the end, bottom `--sk-line-soft` |
| list | max 324px, scrolls; 6px padding |
| group heading | `text-xs` bold uppercase, tracking .1em, `--sk-text-faint` |
| item | 2 lines (label semibold `--sk-text`, description `text-sm --sk-text-faint`), 30px icon tile `--sk-surface-2`; highlighted `bg --sk-surface-2`, icon `--sk-accent` on `--sk-surface`; at the end the item's `shortcut` as `Kbd`, else a `↵` shown only on the highlighted row |
| match highlight | matched letters `--sk-accent`, extra-bold (no background); on the highlighted row mixed 20% toward `--sk-text` (plain accent on `surface-2` is 4.30:1 in light) |
| hint | `--sk-accent` at 9% panel, `InfoIcon` in `--sk-accent`, text `--sk-text` |
| footer | `text-sm --sk-text-faint` with Kbd hints, top `--sk-line-soft`, `surface-2` 40% tint |

## 5. States

| State | Behavior |
|---|---|
| closed | server renders the Trigger only (plus one empty, inert `<template>` per Item) |
| open, empty query | all groups, in the order given; first item highlighted |
| typing | items filtered and sorted by score within each group; empty groups hide; `maxPerGroup` |
| remote search | "Searching…" row under `labels.results` (after 150ms debounce), then results first; stale requests aborted; errors (rejection or throw) show `labels.searchFailed`; "No results" waits until the search is done |
| hint | shown above the results while `hint(query)` returns something |
| no results | `labels.empty(query)` or `CommandPalette.Empty` |
| select | `href` items navigate (real `<a>`; ⌘/Ctrl/Shift-click opens elsewhere and keeps the palette open), `onSelect` runs; the dialog closes; focus returns to the element that opened it |
| shortcut while open | closes it (the shortcut toggles) |

**Motion:** Dialog's fade + 98→100% scale; reduced motion instant.

## 6. Logic (`command-palette.logic.tsx`)

- `'use client'`. `Base.Dialog.Root` (open state via `useControllableState`) → Portal → Backdrop →
  Popup (`initialFocus` = the input) → `Base.Autocomplete.Root inline open autoHighlight="always"`
  given our already-filtered groups as `items` + `filteredItems` → `Autocomplete.Input` +
  `Autocomplete.List` (groups via `Autocomplete.Group`/`GroupLabel`/`Collection`). Base UI owns
  roving highlight, `aria-activedescendant` and the listbox roles.
- **Registry:** each `Item` registers its props through context (re-registered after every
  render) and renders an empty `<template>` in place; the open list orders items by those markers'
  document position, so items inside your own components, and items added later, land where they
  are in the tree. `Group` only provides `{ id, heading }` context; group order = first item.
  Nothing is measured, and the server never renders the list.
- **Filter** (`command-palette.filter.ts`): subsequence match over `value` + `keywords`, case- and
  accent-insensitive (lower-case, NFD, marks stripped, so "bahia" finds "Bahía"); query spaces are
  ignored. Score: +1 per matched letter, +3 for consecutive letters, +2 at a word start (after any
  non-letter, non-digit); the best placement wins (a small dynamic program, not greedy). Ties keep
  the given order (stable sort). The value's matched code-point indices drive the highlight; a
  keyword-only match highlights nothing.
- **Shortcut** (`command-palette.shortcut.ts`): one `keydown` listener on `document` (in
  `useEffect`) for `shortcut`, parsed with Kbd's key names; `mod` = Meta on Apple platforms, Ctrl
  elsewhere; modifiers must match exactly; letters/digits also match by `event.code` (other
  layouts, ⌥ on a Mac). Ignores `repeat` and already-prevented events; a bare-key shortcut (`/`)
  is ignored while typing in a field. Calls `preventDefault` so the browser's own Ctrl+K doesn't
  fire.
- **Remote search:** `onSearch` runs after 150ms idle with a fresh `AbortController` (aborted when
  the query changes or the palette closes); late answers of aborted calls are dropped. Results
  render as items in a first group (`maxPerGroup` doesn't apply). Pending/failed states are rows
  in a polite live region above the list.
- **Picking:** our `onClick` on each `Autocomplete.Item` (Enter clicks the highlighted item) runs
  `onSelect` and closes, or for links closes on a plain click and lets the browser navigate. Link
  items are `<a href tabIndex={-1}>` (arrows, not Tab, reach options).

## 7. Styles (`command-palette.styles.tsx`)

`tv()` `slots` as in §2. No variants. Highlight via `data-[highlighted]` from Base UI; `group` on
the item lets the icon tile, the matched letters and the `↵` follow it. The hint, status and empty
slots style the *content* of always-mounted live regions (an empty region takes no room and is
never `display:none`).

## 8. Accessibility checklist

- [ ] Dialog named (`labels.dialog`); focus goes to the input on open and back to the opener on close.
- [ ] Input is `role="combobox"` with `aria-controls` and `aria-activedescendant` (Base UI), named by
      `labels.placeholder`.
- [ ] Groups are `role="group"` labelled by their heading; items are options with their full label
      (highlight marks are presentational: a visually-hidden copy carries the whole label, the
      highlighted copy is `aria-hidden`).
- [ ] Hint, "Searching…" and empty states are polite live regions.
- [ ] `href` items are real links (middle-click, open in new tab work).
- [ ] Shortcut shown on the Trigger with `Kbd`; it's never the only way to open the palette.
- [ ] Text ≥ 4.5:1; focus/highlight visible in both themes.

## 9. Tests

**Unit** (`command-palette.test.tsx`, 39 cases): server renders the Trigger only (also with
`defaultOpen`); hydrates (Win and Mac); axe both themes (closed trigger, open popup); Trigger props,
ref, className, custom content and `render`; Tab + Enter; shortcut opens (Meta on Mac, Ctrl
elsewhere), blocks the browser default, toggles, ignores repeat, `shortcut={null}`, prevented
events and bare keys while typing; focus returns to the opener (trigger or shortcut); filter
accent folding + highlight, keywords, groups hide when empty, score order with stable ties,
`maxPerGroup` (default / 2 / `Infinity`); `hint`; `onSearch` debounce, empty query, Searching… row,
results first, abort of stale calls, error (reject and throw), empty after search, abort on close;
`href` vs `onSelect` (keyboard and click), modified link click, disabled; `Empty` override (node and
function); labels; registration through wrapper components and document order; parts outside the
root throw. Pure helpers: `command-palette.filter.test.ts`, `command-palette.shortcut.test.ts`.
**Browser:** Ctrl/⌘+K opens at 12vh with the input focused and the first item highlighted, and
toggles closed; type → arrows → Enter follows the link (an `<a href>`) and focus returns; Enter
runs an action; Escape closes and focus returns; remote results after "Searching…"; hint.

## 10. Stories

`PlayerSearch` (sukuna-gg-web style with `hint` and a fake `onSearch`), `Actions` (shortcuts,
`mod+J`), `Loading`, `Empty`, `CustomTrigger` (`render` + `/`). Each story uses its own shortcut
(or none) and none starts open, because the showcase renders every story on one page. Link items
in the stories report where they'd go instead of leaving the page. Both `data-theme` values.

## 11. Decisions

- Built-in filtering **and** optional `onSearch` (owner, Q42 recommendation 1).
- Base UI Autocomplete's `inline` mode instead of a hand-rolled listbox: same keyboard model as
  Combobox, no new dependency.
- Items register through context and are ordered by an inert `<template>` marker's document
  position, so the compound API works through wrapper components without walking `children`.
- The shortcut toggles (a second ⌘K closes), and a bare-key shortcut never fires while typing.
- Matched letters on the highlighted row are mixed toward `--sk-text` for contrast (§4).
- Budget: measured 47.84 kB brotli (less than `Combobox + deps`: inline mode doesn't pull the
  positioner), limit 53 kB (+10%, P5).
