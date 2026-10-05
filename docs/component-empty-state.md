# Component: EmptyState

> Follows the `docs/component-button.md` template. **Server component** (no hooks, no directive).
> Approved in Q31/Q32 (charts & stats, wave 1). Replaces sukuna-gg-web's `StatePanel`.

## 1. Purpose

Takes the place of content that isn't there: no results, nothing yet this season, a player not
found, a service not answering. It says what happened, then offers a way forward. The same
component, at `size="sm"`, is what charts show inside an empty plot.

Copy rule (goes in the TSDoc): say what happened, then what to do. No error codes, no blame.

## 2. Files

```
packages/ui/src/components/empty-state/
├── empty-state.styles.tsx   # tv() slots root/icon/title/description/actions + size/surface.
├── empty-state.logic.tsx    # forwardRef <div>; heading level switch. No hooks.
├── empty-state.test.tsx
├── empty-state.stories.tsx
└── index.tsx                # export { EmptyState } ; export type { EmptyStateProps }
```

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

export interface EmptyStateProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  title: ReactNode
  /** Decorative glyph in the rounded square (aria-hidden). */
  icon?: ReactNode
  /** Body text: the reason, then what to do. */
  children?: ReactNode
  /** Buttons/links. Always give a way forward when there is one. */
  actions?: ReactNode
  /** Heading element for `title`. Default 'h3'. */
  headingLevel?: 'h2' | 'h3' | 'h4'
  /** 'md' for a page section, 'sm' inside a chart or table cell area. Default 'md'. */
  size?: 'sm' | 'md'
  /** 'panel' draws the surface + border (stand-alone); 'plain' sits inside an existing card. Default 'plain'. */
  surface?: 'plain' | 'panel'
}
```

Not here: illustrations (pass any node as `icon`), automatic live-region behaviour (pass
`role="status"` or `role="alert"` yourself when the state appears after an action).

## 4. Variants → tokens

| Slot | md | sm |
|---|---|---|
| root | `flex flex-col items-center text-center gap-3 px-6 py-10` | `gap-1.5 px-4 py-3` |
| icon | `size-12 rounded-lg bg-surface-2 text-text-dim grid place-items-center` (glyph 22px) | `size-9 rounded-md` (glyph 18px) |
| title | `font-display font-extrabold font-stretch-[112%] text-lg text-text text-balance` | `font-sans font-semibold text-md` |
| description | `text-sm text-text-dim max-w-[46ch]` | `text-xs max-w-[34ch]` |
| actions | `flex flex-wrap justify-center gap-2` | same, `Button size="sm"` recommended |

`surface="panel"`: `bg-surface border border-line rounded-lg`.

## 5. States

Static. The component *is* a state; it has none of its own.

## 6. Logic (`empty-state.logic.tsx`)

- No `'use client'`. `forwardRef<HTMLDivElement>`; spreads native props (so `role`, `id`,
  `aria-*` pass through).
- `title` renders as `headingLevel`; `icon` wrapper is `aria-hidden`.
- Nothing renders for missing `icon` / `children` / `actions` (no empty wrappers).

## 7. Styles (`empty-state.styles.tsx`)

`tv()` slots above; variants `size` (`sm | md`) and `surface` (`plain | panel`); defaults `md`, `plain`.

## 8. Accessibility checklist

- [ ] Title is a real heading at the level the page needs (`headingLevel`).
- [ ] Icon is decorative (`aria-hidden`); the title carries the meaning.
- [ ] Actions are real buttons/links (consumer passes `Button`), reachable in order after the text.
- [ ] Text ≥ 4.5:1 in all themes.
- [ ] When shown in response to an action, the consumer adds `role="status"` (documented in TSDoc).

## 9. Tests

Server render; heading level switch; icon wrapper `aria-hidden`; optional parts omitted when
absent; `size`/`surface` classes; native props (`role`, `id`) pass through; `ref`; `className`
merges; hydrate; axe both themes.

## 10. Stories

`Playground`, `NoGamesYet` (with action), `NotFound` (two actions), `ServiceDown` (`role="status"`),
`InsideCard` (`plain`), `Panel`, `Small` (as used inside a chart). Both themes.

## 11. Decisions

- Generic name (`EmptyState`) for a component that also covers not-found and error states — it
  replaces the content that isn't there, whatever the reason (Q32).
- `sm` size exists so charts reuse it instead of shipping their own empty message (rule: "Empty
  keeps the frame", Q32).
