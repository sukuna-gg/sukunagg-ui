# Component: ScrollArea

> Follows the `docs/component-button.md` template. `'use client'` — headless-backed (Base UI
> `scroll-area`). A scrollable region with consistent, themed scrollbars across browsers/OSes.

## 1. Purpose

Give a bounded region (a list, a code block, a sidebar) an overlay scrollbar that looks the same in
every browser and matches the Sukuna surface, instead of the OS default. The content is real,
server-rendered DOM inside a native-scrolling viewport — only the visible scrollbar is custom — so
keyboard scrolling, wheel, and text selection behave natively.

## 2. Files

```
packages/ui/src/components/scroll-area/
├── scroll-area.styles.tsx   # tv() slots: root, viewport, scrollbar, thumb, corner + `orientation`.
├── scroll-area.logic.tsx    # 'use client'; forwardRef to the root.
├── scroll-area.test.tsx
├── scroll-area.stories.tsx
└── index.tsx
test/browser/scroll-area.test.ts  # Playwright: thumb appears; drag/keyboard scrolls the viewport
```

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

interface ScrollAreaOwnProps {
  orientation?: 'vertical' | 'horizontal' | 'both'  // which scrollbars to render; default 'vertical'
  tone?: 'neutral' | 'accent'                       // thumb/track color; default 'neutral'
  children: ReactNode
}

// Sizing (height / max-height / width) is the consumer's job via className on the root.
export type ScrollAreaProps = ScrollAreaOwnProps & ComponentPropsWithoutRef<'div'>
```

Deliberately **not** in v1: a Radix-style `type` (`hover`/`always`/`scroll`/`auto`) visibility mode
(Base UI shows the scrollbar on interaction; a single sensible default), and `scrollHideDelay`.

## 4. Variants → tokens

root: `relative overflow-hidden` (consumer sets size). viewport: `h-full w-full rounded-[inherit]`
(native scroll; `focus-visible:ring-2 focus-visible:ring-focus-ring` when focusable).
scrollbar: `flex touch-none select-none p-0.5 bg-transparent transition-colors duration-fast` —
`w-2.5` vertical / `h-2.5` horizontal. thumb: `flex-1 rounded-pill`. corner: `bg-transparent`.

`tone` (same name and values as Badge/Chip `tone`; `accent` is the Sukuna crimson):

| tone | scrollbar (track) hover | thumb idle | thumb hover |
|---|---|---|---|
| `neutral` (default) | `hover:bg-surface-2` | `bg-line` | `hover:bg-text-faint` |
| `accent` | `hover:bg-accent/10` | `bg-accent/80` | `hover:bg-accent` |

The `accent` idle thumb (crimson at 80%) is ≈3.7:1 on dark `surface` and ≈3.8:1 on light `surface`;
the hover thumb (solid crimson) is ≈5.2:1 / ≈5.0:1.

No new tokens — reuses `--sk-line`, `--sk-surface-2`, `--sk-text-faint`, `--sk-accent`,
`--sk-focus-ring`, `--sk-radius-pill`.

## 5. States

idle (thumb dim) · hovering scrollbar (track tint, thumb brighter) · dragging thumb · at edge.
Vertical only / horizontal only / both (a corner square where they meet). Each in `neutral` and
`accent` tone.

## 6. Logic (`scroll-area.logic.tsx`)

- `'use client'` (Base UI measures content to size/position the thumb via refs).
- `forwardRef<HTMLDivElement, ScrollAreaProps>` — ref on `Base.ScrollArea.Root`.
- `Root` → `Viewport` → `Content` (children) → one `Scrollbar`+`Thumb` per active orientation →
  `Corner` when `orientation="both"`.
- Children render server-side inside the viewport; no `useEffect`/DOM access in our code.

## 7. Styles (`scroll-area.styles.tsx`)

`tv()` `slots` (root, viewport, scrollbar, thumb, corner) + a `tone` variant that colors the
scrollbar and thumb slots. Orientation is not a style variant: the logic renders one scrollbar per
active orientation and Base UI's `data-orientation` attribute picks its `w`/`h`.

## 8. Accessibility checklist

- [ ] Viewport scrolls with wheel, arrow keys, PageUp/Down, Home/End (native — not intercepted).
- [ ] Content is real DOM, present at SSR and reachable by AT and Find-in-page.
- [ ] Custom scrollbar is decorative; never the only way to reach content.
- [ ] Thumb ≥3:1 against the track; focusable viewport shows a visible ring.
- [ ] Respects OS "always show scrollbars" without breaking layout (overlay, not layout-shifting).

## 9. Tests

**Unit:** renders root/viewport/children; `orientation` renders the right scrollbar slot(s) and the
corner only for `both`; `tone` colors every thumb (neutral by default, crimson for `accent`);
consumer `className` reaches the root; forwards `ref`; SSR renders the children inside the viewport. **Browser:** overflowing content shows a thumb; dragging it and
pressing arrows scroll the viewport.

## 10. Stories

`Vertical`, `Horizontal`, `Both`, `InACard` (sized container), `Accent` (crimson thumb), `Tones`
(neutral and accent side by side). Both `data-theme` values.

## 11. Decisions

- Content is server-rendered inside a native-scrolling viewport — SSR-safe; only the thumb is custom.
- Single visibility behavior (no `type` prop) to keep the API small; can add later if asked.
- Sizing left to the consumer (`className`) — the component doesn't guess a height.
- Crimson scrollbar ships as `tone="accent"`, not `variant="crimson"`: the library names its one red
  `accent` in every color prop (Badge/Chip `tone`), and themes keep that name stable (Q36).
