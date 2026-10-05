# Component: Input

> Follows the `docs/component-button.md` section template. Static component — no `'use client'`
> (a native `<input>` holds its own value; controlled use goes through native `value`/`onChange`).

## 1. Purpose

A single-line text input. Native `<input>` styled to Sukuna, with size and an invalid state.

## 2. Files

```
packages/ui/src/components/input/
├── input.styles.tsx
├── input.logic.tsx   # forwardRef; NO 'use client'.
├── input.test.tsx
├── input.stories.tsx
└── index.tsx
```

## 3. API

```ts
import type { ComponentPropsWithoutRef } from 'react'

export interface InputProps extends Omit<ComponentPropsWithoutRef<'input'>, 'size'> {
  variant?: 'filled' | 'outline' | 'ghost'   // default 'filled' (the original look)
  size?: 'sm' | 'md' | 'lg'   // default 'md' (shadows the native numeric `size` attr — omitted)
  invalid?: boolean           // sets aria-invalid + crimson border
  /** Q32: with type="password", adds a Show/Hide toggle inside the field. Ignored for other types. */
  reveal?: boolean
  /** Toggle text for i18n. Default { show: 'Show', hide: 'Hide' }; sr-only " password" is appended. */
  revealLabels?: { show: string; hide: string }
}
```

Native `size` (visible width in chars) is omitted in favor of the variant `size`. Everything else
native passes through (`type`, `value`, `defaultValue`, `onChange`, `placeholder`, `disabled`,
`required`, `name`, `autoComplete`, `aria-*`, …).

## 4. Variants → tokens

Base: `w-full text-text border placeholder:text-text-faint transition-[border-color,box-shadow] duration-fast ease-sukuna focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:border-accent disabled:opacity-45 disabled:cursor-not-allowed`.

| variant | utilities | use |
|---|---|---|
| filled | `bg-surface-2 border-line` | default — the original look |
| outline | `bg-transparent border-line` | on busy/tinted surfaces |
| ghost | `bg-transparent border-transparent hover:bg-surface-2` | inline edit; the border appears on focus (`border-accent`) or `invalid` |

The same `variant` map is shared by Select, Combobox and NumberField so the form layer reads as one.

| size | utilities |
|---|---|
| sm | `h-8 px-3 text-sm rounded-sm` |
| md | `h-10 px-3 text-md rounded-md` |
| lg | `h-12 px-4 text-lg rounded-lg` |

| invalid | utilities |
|---|---|
| true | `border-accent focus-visible:ring-accent-glow` |

Sukuna has one red (crimson), so the invalid border reuses `--sk-accent` (see `docs/questions.md` Q10).

**`reveal` (Q32):** the field gets right padding (`pr-20`) and an absolutely positioned toggle —
`Button variant="ghost" size="sm"` look, vertically centred, `right-1.5`.

## 5. States

| State | Behavior |
|---|---|
| default | as above |
| focus-visible | 2px `--sk-accent-glow` ring, border → accent |
| invalid | crimson border always; `aria-invalid="true"` |
| disabled | `opacity .45`, `cursor: not-allowed` (native disabled) |
| reveal: hidden → shown | toggle press flips `type` password ↔ text, label Show ↔ Hide, `aria-pressed`; focus stays on the toggle; the value is untouched. Disabled with the field. |

## 6. Logic (`input.logic.tsx`)

- No `'use client'`. **Exception (Q32):** `reveal` needs state, so `type="password" reveal` renders
  `<RevealInput>` from a fourth file, `input.reveal.tsx` (`'use client'`), which owns the shown/hidden
  state and renders the same styled `<input>` + toggle. Every other Input stays a zero-JS server
  component (D36).
- `forwardRef<HTMLInputElement, InputProps>` (the ref reaches the `<input>` in both paths).
- Destructure `size`, `invalid`, `className` out; set `aria-invalid={invalid || undefined}`; spread
  the rest onto `<input>`.
- Full width by default (`w-full` in base); constrain with a wrapper or `className`.

## 7. Styles (`input.styles.tsx`)

`tv()` with `size` and `invalid` variants; `defaultVariants: { size: 'md' }`.

## 8. Accessibility checklist

- [ ] Every input has a programmatic label — a `<label htmlFor>`, `aria-label`, or
      `aria-labelledby`. The component does not render a label; the consumer supplies one.
- [ ] `invalid` sets `aria-invalid`; pair with `aria-describedby` pointing at the error text.
- [ ] Placeholder is not a label (it disappears on input); never rely on it alone.
- [ ] Focus ring ≥ 3:1 against the surface in both themes.
- [ ] Reveal toggle is a native `<button type="button">` with `aria-controls` (the input id) and
      `aria-pressed`; its name is "Show password" / "Hide password" (visible text + sr-only suffix).
- [ ] The toggle never submits the form and is reachable by Tab right after the field.

## 9. Tests

- Renders every `size` on the server without throwing.
- `invalid` sets `aria-invalid="true"`; absent otherwise.
- Controlled `value` + `onChange` works; `disabled` blocks typing.
- Forwards `ref` to the `<input>`.
- Native props pass through (`type`, `placeholder`, `name`, `data-*`).
- `size`/`invalid` never leak to the DOM as raw attributes.
- Consumer `className` wins over a conflicting utility.
- Hydrates cleanly; axe passes in both themes (rendered with a label).
- `reveal`: toggle flips `type` and `aria-pressed`; ignored when `type` isn't password; `revealLabels`
  replace the text; `ref` still reaches the `<input>`; a plain Input's module has no `'use client'`
  (RSC boundary test).

## 10. Stories

`Playground`, `Sizes`, `Invalid`, `Disabled`, `Types`, `WithLabel`, `PasswordReveal`. Both themes.

## 11. Decisions

- Native numeric `size` attribute dropped in favor of the variant `size` (see `docs/ai-decisions.md`).
- No leading/trailing icon slots in v1 (compose a wrapper), keeping the element a plain `<input>`.
- Full width by default.
- `reveal` (Q32) replaces sukuna-gg-web's `PasswordInput`; split into a client file so plain Inputs stay server-only (D36).
