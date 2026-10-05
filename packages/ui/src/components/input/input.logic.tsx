import { type ComponentPropsWithoutRef, forwardRef } from 'react'
import { RevealInput, type RevealLabels } from './input.reveal'
import { type InputStyleProps, inputStyles } from './input.styles'

/**
 * Props for {@link Input}: every native `<input>` attribute except the numeric `size` (visible
 * width in characters), which is replaced by the variant `size`, plus the style variants
 * `size?: 'sm' | 'md' | 'lg'` (default `'md'`) and `invalid?: boolean` (default `false`).
 */
export interface InputProps
  extends Omit<ComponentPropsWithoutRef<'input'>, 'size'>,
    InputStyleProps {
  /**
   * With `type="password"`, adds a Show/Hide toggle inside the field. Ignored for other types.
   * Only these fields load client JS; every other Input stays a server component.
   * @default false
   */
  reveal?: boolean
  /**
   * Toggle text, for translation. An sr-only " password" is appended to each.
   * @default { show: 'Show', hide: 'Hide' }
   */
  revealLabels?: RevealLabels
}

/**
 * Single-line text input styled to Sukuna: a plain native `<input>` with a size scale and an
 * invalid state.
 *
 * @remarks
 * - SSR/RSC: static and RSC-safe (no `'use client'`). The native element holds its own value;
 *   controlled use goes through native `value`/`onChange` from a client component you own.
 * - Accessibility: the component renders no label. Every Input needs a programmatic label — a
 *   `<label htmlFor>` (or wrap it in `Field`), `aria-label` or `aria-labelledby`. A placeholder
 *   is not a label. `invalid` sets `aria-invalid="true"`; pair it with `aria-describedby` that
 *   points at the error text. Focus ring is visible in both themes.
 * - Variants: `variant`: 'filled' (default — `surface-2` fill + `line` border) | 'outline'
 *   (transparent, `line` border) | 'ghost' (borderless and transparent until hover/focus; the
 *   inline-edit field). `size`: 'sm' (32px) | 'md' (40px, default) | 'lg' (48px); `invalid`:
 *   boolean (default false) — crimson border plus `aria-invalid`, on every variant.
 * - The native numeric `size` attribute is not available; use `className` or a wrapper to
 *   constrain width. The input is full width (`w-full`) by default.
 * - `size` and `invalid` are consumed here and never reach the DOM as attributes.
 * - The ref points at the `<input>` element.
 * - `reveal` (with `type="password"`): renders a client child that adds a Show/Hide toggle — a
 *   native button with `aria-pressed` and `aria-controls`, named "Show password" / "Hide
 *   password". The field gets right padding for it. Give the input an `id` (one is generated
 *   otherwise).
 *
 * @example
 * ```tsx
 * import { Input } from '@sukunagg/ui'
 *
 * <label htmlFor="email">Email</label>
 * <Input id="email" type="email" name="email" placeholder="you@company.com" required />
 * ```
 *
 * @example
 * ```tsx
 * import { Input } from '@sukunagg/ui'
 *
 * // Controlled + invalid, with the error text wired via aria-describedby.
 * <label htmlFor="handle">Handle</label>
 * <Input
 *   id="handle"
 *   size="sm"
 *   value={handle}
 *   onChange={(e) => setHandle(e.target.value)}
 *   invalid={!isValid}
 *   aria-describedby="handle-error"
 * />
 * <p id="handle-error">Handles may only contain letters and digits.</p>
 * ```
 *
 * @example
 * ```tsx
 * import { Input } from '@sukunagg/ui'
 *
 * <label htmlFor="pw">Password</label>
 * <Input id="pw" type="password" autoComplete="current-password" reveal />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { variant, size, invalid, className, reveal, revealLabels, ...rest },
  ref,
) {
  if (reveal && rest.type === 'password') {
    const { type: _password, ...props } = rest
    return (
      <RevealInput
        ref={ref}
        variant={variant}
        size={size}
        invalid={invalid}
        className={className}
        revealLabels={revealLabels}
        {...props}
      />
    )
  }
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={inputStyles({ variant, size, invalid, className })}
      {...rest}
    />
  )
})
