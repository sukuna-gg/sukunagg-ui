# Component: DataBar

> Follows the `docs/component-button.md` template. **Server component** in `@sukunagg/charts`
> (wave 2, Q32/Q33). No d3, no island — plain HTML.

## 1. Purpose

A number with a small bar under it, for comparing rows of a table at a glance: damage to
champions in a scoreboard, pick rate in a meta table. The bar is scaled to a `max` the caller
passes (usually the column's top value), so every row shares one scale.

Not a `Meter` (a single gauge with `role="meter"` and its own range) and not a chart (no axes).

## 2. Files

```
packages/charts/src/components/data-bar/
├── data-bar.styles.tsx   # tv() slots root/value/track/fill/missing + size.
├── data-bar.logic.tsx    # forwardRef <span>; formats, clamps, null handling. No hooks.
├── data-bar.test.tsx
├── data-bar.stories.tsx
└── index.tsx             # export { DataBar } ; export type { DataBarProps }
```

## 3. API

```ts
import type { ComponentPropsWithoutRef } from 'react'

export interface DataBarProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  /** `null` = not reported: "–" and no bar, never an empty bar that reads as 0. */
  value: number | null
  /** The value a full bar represents — usually the column's top value. */
  max: number
  /** Any CSS color. Default 'var(--sk-chart-1)'. */
  color?: string
  format?: Intl.NumberFormatOptions | ((v: number) => string)
  locale?: string            // default 'en-US'
  showValue?: boolean        // default true; false = bar only (then pass aria-label)
  missingLabel?: string      // default 'Not reported' (screen readers)
  size?: 'sm' | 'md'         // track 4px / 6px. Default 'md'
}
```

Not here: negative values, a target marker, labels inside the bar.

## 4. Variants → tokens

| Slot | Spec |
|---|---|
| root | `inline-grid gap-1 min-w-24 align-middle` |
| value | `text-xs tabular-nums text-text` (formatted) |
| track | `--sk-surface-2`, full width, rounded 3px; `sm` 4px / `md` 6px tall |
| fill | `bg-(--sk-databar-color)`, width = `value / max` clamped to 0–100%, rounded 3px |
| missing | "–" `text-text-faint` + sr-only `missingLabel`; no track |

## 5. States

| State | Behavior |
|---|---|
| value | text + bar at `value / max` |
| `0` | "0" + an empty track (a real zero) |
| `null` | "–" + sr-only "Not reported", no track |
| `value > max` | bar clamps to 100%, text shows the real value |
| `max <= 0` | bar width 0 (no division by zero) |

## 6. Logic (`data-bar.logic.tsx`)

- No `'use client'`. `forwardRef<HTMLSpanElement>`. Formats with `Intl.NumberFormat(locale, format)`
  or the `format` function.
- The track is `aria-hidden`; the value text is what screen readers read. With
  `showValue={false}` the root gets `role="img"` + the consumer's `aria-label` (dev error if missing).

## 7. Styles (`data-bar.styles.tsx`)

`tv()` slots + `size` variant; color through `--sk-databar-color` set on the root.

## 8. Accessibility checklist

- [ ] The number is real text, read in table order; the bar is decorative.
- [ ] `null` announces `missingLabel`, never "dash" or "0".
- [ ] Bar-only usage requires an `aria-label` (dev error).
- [ ] Fill ≥ 3:1 against `surface-2` with default tokens.

## 9. Tests

Server render; width % for value/max; clamp above max; `max <= 0`; `0` vs `null`; format options
and function; locale; `color` sets the variable; `size` classes; `showValue={false}` → `role="img"`
+ label (dev error without); ref; className; hydrate; axe both themes (inside a table).

## 10. Stories

`Playground`, `Scoreboard` (5 players, blue side color, one `null`), `MetaTable` (pick-rate column),
`Sizes`, `BarOnly`. Both themes.

## 11. Decisions

- Lives in `@sukunagg/charts` with the other data-viz pieces (Q31/Q32 plan), even though it needs
  no d3; it shares the charts' color and missing-data rules.
- Scale is the caller's `max`, not computed: a single cell can't see its column.
