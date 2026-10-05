# Component: RadialGauge

> Follows the `docs/component-button.md` template. **Server component** in `@sukunagg/charts`, no
> client JS (Q33, "later" trio).

## 1. Purpose

One value against a range, drawn as a 270° arc with the number in the middle: LP to the next
division, plan usage, a score out of 100. Use it where a single figure is the point and the
"how full" shape helps; inside a table or a form use `Meter` (a bar) instead.

## 2. Files

```
packages/charts/src/components/radial-gauge/
├── radial-gauge.styles.tsx   # tv() slots: root, svg, track, fill, center, value, caption, label.
├── radial-gauge.logic.tsx    # forwardRef <div role="meter">; arc math. No hooks.
├── radial-gauge.test.tsx
├── radial-gauge.stories.tsx
└── index.tsx                 # export { RadialGauge } ; export type { RadialGaugeProps }
```

## 3. API

```ts
export interface RadialGaugeProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** null = not reported: track only, "—", announced as not reported. */
  value: number | null
  min?: number             // default 0
  max?: number             // default 100
  /** Visible name under the gauge (also names the meter). Or pass aria-label. */
  label?: ReactNode
  /** Middle text. Default: the formatted value. */
  valueLabel?: ReactNode
  /** Small text under the middle value, e.g. "of 100 LP". */
  caption?: ReactNode
  /** Line under the label, e.g. "Diamond II → I". */
  description?: ReactNode
  color?: string           // fill, any CSS color; default --sk-chart-1
  size?: number            // px, default 150
  thickness?: number       // arc width px, default 12
  format?: Intl.NumberFormatOptions
  locale?: string          // default 'en-US'
  missingLabel?: string    // default 'Not reported'
  'aria-valuetext'?: string
}
```

## 4. Variants → tokens

Track = the fill color at 16% over `--sk-surface` (`color-mix`); fill = `color`; round caps.
Value `text-[26px] font-semibold text-text tabular-nums`; caption `text-xs text-text-faint`;
label `text-sm font-semibold text-text`; description `text-xs text-text-dim`.

## 5. States

| State | Behavior |
|---|---|
| value | fill from the start to `(value − min) / (max − min)`, clamped |
| at min | track only (no zero-length cap blob) |
| `null` | track only, "—" in `text-text-faint`; not a meter (see §6) |

## 6. Logic (`radial-gauge.logic.tsx`)

- No `'use client'`. `role="meter"` with `aria-valuenow/min/max` and `aria-valuetext` (from
  `format` or the override); named by `label` (`aria-labelledby`) or `aria-label`.
- A `null` value is **not** a meter (`aria-valuenow` is required, and 0 would lie): the root is
  `role="img"`, named the same way and described (`aria-describedby`) by an sr-only
  `missingLabel`. Found by axe while building.
- Arc: from −135° to +135° in a square 0–100 viewBox, stroke-based with round caps.

## 7. Styles (`radial-gauge.styles.tsx`)

`tv()` slots; color via `--sk-gauge-color`.

## 8. Accessibility checklist

- [ ] `role="meter"` with min/max/now and a text value; named.
- [ ] Missing value: `role="img"` described as `missingLabel` — never a meter at 0.
- [ ] The number is text in the middle; the arc is decorative.

## 9. Tests

Server render; fill path for a value; clamp above max / below min; null → no fill, "—",
valuetext; meter attributes; label vs aria-label naming; format/locale; color variable; ref; axe.

## 10. Stories

`Playground`, `RankProgress`, `PlanUsage`, `NotReported`, `Sizes`.

## 11. Decisions

- Separate from `Meter` (bar, in `@sukunagg/ui`): same role, different shape and home; both
  can coexist on a page.
