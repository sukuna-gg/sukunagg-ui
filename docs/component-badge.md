# Component: Badge

> Follows the `docs/component-button.md` section template. Static component — no `'use client'`.

## 1. Purpose

A small, pill-shaped label for status and metadata — "LIVE", counts, tags. Not interactive; if a
badge needs to be clickable it belongs inside a Button or Link.

## 2. Files

```
packages/ui/src/components/badge/
├── badge.styles.tsx
├── badge.logic.tsx   # forwardRef; NO 'use client'.
├── badge.test.tsx
├── badge.stories.tsx
└── index.tsx
```

## 3. API

```ts
import type { ComponentPropsWithoutRef } from 'react'

export interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  tone?: 'neutral' | 'accent' | 'success' | 'premium'  // default 'neutral'
  variant?: 'soft' | 'solid' | 'outline'                // unset = each tone's original look
  size?: 'sm' | 'md'                                    // default 'md'
  dot?: boolean   // leading status dot in currentColor
  pulse?: boolean // charts & stats wave 1 (Q32): animates the dot for a live state ("In game"). Needs `dot`.
}
```

Extends `<span>`; adds only `tone`, `variant`, `size`, `dot`, `pulse`. Pill radius is fixed (not a prop).

## 4. Variants → tokens

Base: `… border`. Each tone × variant is one literal compound class (below). **Unset `variant`**
(internal `auto`) reproduces the original look exactly — `accent` solid, the others soft — so adding
`variant` changed nothing. Solid fills use `text-bg` (the page-background token) for the label: it
is dark on a light fill and light on a dark fill in both themes.

| tone | soft | solid | outline |
|---|---|---|---|
| neutral | `bg-surface-2 text-text-dim border-line` | `bg-text-dim text-bg border-transparent` | `bg-transparent text-text-dim border-line` |
| accent | `bg-surface-2 text-accent border-line` | `bg-gradient-accent text-text border-transparent` (original) | `bg-transparent text-accent border-accent` |
| success | `bg-surface-2 text-success border-line` (original) | `bg-success text-bg border-transparent` | `bg-transparent text-success border-success` |
| premium | `bg-surface-2 text-premium border-line` (original) | `bg-premium text-bg border-transparent` | `bg-transparent text-premium border-premium` |

| size | utilities |
|---|---|
| sm | `h-5 px-2 text-xs gap-1` |
| md | `h-6 px-2.5 text-sm gap-1.5` |

Base: `inline-flex items-center justify-center rounded-pill font-semibold whitespace-nowrap select-none align-middle`. Dot: `inline-block size-1.5 rounded-full bg-current shrink-0`, `aria-hidden`.

## 5. States

Static; no interactive states.

**`pulse` (Q32):** the dot blinks (`motion-safe:animate-pulse`) and a ring ripples out of it
(`after:` pseudo-element in `currentColor`, `motion-safe:after:animate-ping`). Both are Tailwind's
built-in keyframes, so no new motion tokens. Under reduced motion the dot is still. `pulse`
without `dot` does nothing (documented in the prop's TSDoc).

## 6. Logic (`badge.logic.tsx`)

- No `'use client'`.
- `forwardRef<HTMLSpanElement, BadgeProps>`.
- Destructure `tone`, `size`, `dot`, `className`, `children` out; spread the rest onto `<span>`.
- When `dot`, render a leading `<span aria-hidden="true">` dot before `children`.
- When `dot && pulse`, the dot gets the `pulse` classes (`relative` + the `after:` ring).

## 7. Styles (`badge.styles.tsx`)

`tv()` with `tone` and `size` variants; `defaultVariants: { tone: 'neutral', size: 'md' }`. Dot
class is a static string exported alongside.

## 8. Accessibility checklist

- [ ] The dot is decorative (`aria-hidden`); status is conveyed by the text, never color/dot alone.
- [ ] `pulse` stops under `prefers-reduced-motion` (WCAG 2.3.3); it never flashes more than 3×/s.
- [ ] `accent` text on the crimson gradient meets contrast in both themes (shares the Button
      primary treatment; verify).
- [ ] Not a `button`/`a` — no role, not focusable. Clickable status → wrap in Button/Link.
- [ ] Text contrast ≥ 4.5:1 for every tone in both themes.

## 9. Tests

- Renders every `tone` × `size` on the server without throwing.
- `dot` renders exactly one `aria-hidden` dot; without `dot`, none.
- `pulse` adds the motion-safe pulse/ping classes to the dot; `pulse` without `dot` renders no dot.
- Variant props never leak to the DOM.
- Forwards `ref` to the `<span>`.
- Native props pass through (`id`, `data-*`, `aria-label`).
- Consumer `className` wins over a conflicting utility.
- Hydrates cleanly; axe passes in both themes.

## 10. Stories

`Playground`, `Tones`, `Variants` (tone × soft/solid/outline grid), `Sizes`, `WithDot`, `Live`
(now with `pulse`: In game / Not in game / unavailable / checking), `InText`. Both themes via toolbar.

## 11. Decisions

- Pill radius fixed (not a prop): badges are always fully rounded in Sukuna.
- `variant` (added post-0.8.0) has **no public default**: unset keeps the mixed original look
  (accent solid, others soft) so the addition is non-breaking; the trio is opt-in. Same map as Chip.
- `dot` uses `currentColor`, not a separate color prop (kept minimal for v1).
- No `count`/number formatting helper in v1 (pass the string yourself).
- `pulse` (Q32): replaces sukuna-gg-web's hand-rolled `t-live` blink + ripple; built-in keyframes only.
