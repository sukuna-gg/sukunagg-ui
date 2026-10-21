# Component: Combobox

> Follows the `docs/component-button.md` template. `'use client'` — headless-backed (Base UI
> `autocomplete`).

## 1. Purpose

A text input with a filtered list of suggestions (free-text autocomplete). For a fixed
pick-from-list without typing, use Select.

## 2. Files

```
packages/ui/src/components/combobox/
├── combobox.styles.tsx   # tv() slots: input, popup, item, empty.
├── combobox.logic.tsx    # 'use client'; prop-driven wrapper.
├── combobox.test.tsx
├── combobox.stories.tsx
└── index.tsx
test/browser/combobox.test.ts  # Playwright: type → filter → select
```

## 3. API

```ts
export interface ComboboxProps {
  items: string[]
  value?: string          // the input text (controlled)
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string    // default 'Search…'
  disabled?: boolean
  emptyMessage?: string   // default 'No results'
  maxRenderedItems?: number // cap displayed suggestions (Base UI `limit`); search spans all items
  variant?: 'filled' | 'outline' | 'ghost'   // default 'filled' (the original look); same map as Input
  size?: 'sm' | 'md' | 'lg'                   // default 'md'; same scale as Input
  itemIcon?: (item: string) => ReactNode      // a leading visual per suggestion (avatar, portrait); decorative
  'aria-label'?: string
}
```

`itemIcon` draws a leading visual before each suggestion's text, such as a champion portrait or an
avatar (`(item) => <img src={…} alt="" width={20} height={20} />`). It's decorative: the item's
text stays the option's accessible name, so give images `alt=""`. Return `null` for an item
without one; its text still lines up with the others only if the slot keeps its width, so return
a sized placeholder when some items lack an image.

For large suggestion lists, set `maxRenderedItems` (e.g. `50`) so only the top N filtered matches
render — filtering still runs over the full `items`. Items also use `content-visibility: auto` so
off-screen options are cheap. Beyond a few thousand items, prefer server-side search feeding a
capped `items`.

## 4. Variants → tokens

input: same as Input — `variant` filled `bg-surface-2 border-line` (default) / outline
`bg-transparent border-line` / ghost `bg-transparent border-transparent hover:bg-surface-2`; `size`
sm `h-8 px-3 text-sm rounded-sm` / md `h-10 px-3 text-md rounded-md` / lg `h-12 px-4 text-lg
rounded-lg`; focus ring. popup: `z-50 max-h-72
overflow-y-auto rounded-md border border-line bg-surface p-1 shadow-card` + fade/scale; at least
as wide as the input (`min-w-[var(--anchor-width,12rem)]`) and aligned to its start edge, like
Select. item: `h-9 px-2.5 gap-2 rounded-sm data-[highlighted]:bg-line-soft
data-[selected]:text-accent`; itemIcon: `inline-flex shrink-0 items-center`. empty:
`px-2.5 py-2 empty:p-0 text-sm text-text-dim` (the status stays in the DOM while suggestions show;
with nothing in it, it takes no room).

## 5. States

closed · typing (filtered list) · item highlighted (keyboard) · empty (no matches) · disabled.

**Motion (v1.3, `docs/motion.md`):** directional entrance — fade + scale 95→100% + a 4px slide from the input side (`data-side`). Reduced motion: instant.

## 6. Logic (`combobox.logic.tsx`)

- `'use client'`. `Base.Root` (items, value/defaultValue/onValueChange) → `Base.Input` → `Portal` →
  `Positioner` (`align="start"`) → `Popup` → `Empty` + `List` (render-prop → `Item` per filtered
  string, with `itemIcon(item)` in a leading slot when given).

## 7. Styles

`tv()` `slots` (no variants).

## 8. Accessibility checklist

- [ ] `role="combobox"` input with `aria-expanded`/`aria-controls`; listbox + options wired by Base UI.
- [ ] Arrow keys move, Enter selects, Escape closes; typeahead filters.
- [ ] Give the input an `aria-label` or associate a `<label>`.

## 9. Tests

**Unit:** renders a combobox input; typing filters to matching options; `itemIcon` draws a leading
visual and the option's name stays its text; SSR renders the input.
**Browser:** type → filtered option appears → selecting fills the input.

## 10. Stories

`Default`, `WithValue`, `Disabled`, `WithIcons`.

## 11. Decisions

- String suggestions in v1 (object items / async loading deferred). Free-text value = input text.
- The popup starts at the input's start edge and is at least as wide as it (Q44): centered at its
  own minimum width, it floated away from a wide input.
- Leading visuals come from `itemIcon(item)` rather than object items (Q44), so `items` stays
  `string[]` and filtering is unchanged.
