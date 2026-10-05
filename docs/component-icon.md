# Component: Icon

> Follows the `docs/component-button.md` template. **Server components** (no hooks, no directive).
> Charts & stats wave 3 (Q32/Q33): the icons sukuna-gg-web draws inline today.

## 1. Purpose

A small set of line icons for the interface: disclosure chevrons, status glyphs for empty and
error states, the theme toggle, search, external links. One stroke style (24px grid, 2px,
round caps, `currentColor`), so icons match each other and the text around them.

Not an icon library: the set grows when a component or a consumer needs a glyph, not ahead of it.

## 2. Files

```
packages/ui/src/components/icon/
├── icon.styles.tsx   # tv(): base inline-block / shrink-0 / vertical alignment.
├── icon.logic.tsx    # createIcon() factory + every icon (path data). No hooks.
├── icon.test.tsx
├── icon.stories.tsx
└── index.tsx         # export { AlertIcon, CheckIcon, … } ; export type { IconProps }
```

## 3. API

```ts
import type { ComponentPropsWithoutRef } from 'react'

export interface IconProps extends Omit<ComponentPropsWithoutRef<'svg'>, 'children'> {
  /** Width and height in px. Default 18. */
  size?: number | string
  /** Stroke width in px at 24px (scales with size). Default 2. */
  strokeWidth?: number
  /** Accessible name. Without it the icon is decorative (aria-hidden). */
  title?: string
}

// One component per glyph, each a forwardRef<SVGSVGElement, IconProps>:
AlertIcon, ChartIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon,
ChevronUpIcon, ClockIcon, CloseIcon, ExternalIcon, InfoIcon, LockIcon, MoonIcon,
RefreshIcon, SearchIcon, SunIcon, UserIcon
```

Exported from the main entry: the build is per-file and the package is side-effect free (except
CSS), so bundlers keep only the icons you import — no separate `/icons` subpath needed.

## 4. Variants → tokens

No variants. `fill="none"`, `stroke="currentColor"` (inherits the text color, so `text-*` utilities
color it), `stroke-linecap/linejoin="round"`. Base class `inline-block shrink-0 align-[-0.125em]`.

## 5. States

Static.

## 6. Logic (`icon.logic.tsx`)

- No `'use client'`. `createIcon(displayName, paths)` returns a `forwardRef<SVGSVGElement>` that
  renders `<svg viewBox="0 0 24 24">` with the glyph's elements.
- Decorative by default: `aria-hidden="true"` and `focusable="false"`. With `title`: `role="img"`,
  a `<title>` child, and no `aria-hidden`. An explicit `aria-label` also counts as a name.
- `size` sets `width`/`height`; native SVG props pass through (`className` merges).
- Every `createIcon(...)` call is marked `/* @__PURE__ */`: without it bundlers must keep all 17
  module-level calls (one import measured 967 B); with it, one icon is 481 B. The size budget
  (`One icon`, 0.6 kB) guards this.

## 7. Styles (`icon.styles.tsx`)

`tv({ base: 'inline-block shrink-0 align-[-0.125em]' })`.

## 8. Accessibility checklist

- [ ] Decorative icons are `aria-hidden` and not focusable.
- [ ] Meaningful standalone icons get `title` (→ `role="img"` + `<title>`) or `aria-label`.
- [ ] Inside a button, the button carries the name (`Button iconOnly aria-label`), the icon stays decorative.
- [ ] `currentColor` keeps contrast tied to the text color (already AA).

## 9. Tests

Every icon renders on the server; decorative by default (`aria-hidden`, `focusable="false"`);
`title` → `role="img"` + `<title>`; `aria-label` → named, not hidden; `size` and `strokeWidth`;
native props and `className` pass through; `ref` reaches the `<svg>`; display names; hydrate; axe.

## 10. Stories

`Playground`, `All` (grid with names), `Sizes`, `InButton` (with `Button iconOnly`), `Colored`
(`text-*` utilities). Both themes.

## 11. Decisions

- Main-entry exports instead of an `@sukunagg/ui/icons` subpath (the wave plan): per-file output
  already tree-shakes per icon, and a subpath would need its own export map, type entry and docs
  wiring for no size win.
- 2px round line style matches the glyphs sukuna-gg-web already draws inline.
