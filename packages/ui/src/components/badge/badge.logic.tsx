import { type ComponentPropsWithoutRef, forwardRef } from 'react'
import { type BadgeStyleProps, badgeDot, badgeDotPulse, badgeStyles } from './badge.styles'

export interface BadgeProps
  extends ComponentPropsWithoutRef<'span'>,
    Omit<BadgeStyleProps, 'variant'> {
  /**
   * Surface treatment. Unset keeps each tone's original look (`accent` solid, the rest soft);
   * set it to force one: `soft` (tinted label on `surface-2`), `solid` (filled with the tone
   * color), `outline` (transparent with a tone-colored border).
   */
  variant?: 'soft' | 'solid' | 'outline'
  /**
   * Render a small leading dot in `currentColor` before the children (e.g. a "LIVE" pulse).
   * The dot is `aria-hidden`; the text must still convey the status on its own.
   * @default false
   */
  dot?: boolean
  /**
   * Animate the dot for a live state ("In game"): it blinks and a ring ripples out of it. Needs
   * `dot`; on its own it does nothing. Still under `prefers-reduced-motion`. The text must still
   * say the state.
   * @default false
   */
  pulse?: boolean
}

/**
 * Small pill-shaped label for status and metadata such as "LIVE", counts or tags.
 *
 * @remarks
 * - SSR/RSC: static and RSC-safe (no `'use client'`).
 * - Accessibility: renders a plain `<span>` with no role and no focus — it is not interactive.
 *   For a clickable status, wrap it in a Button or Link. Never let color or the `dot` alone
 *   carry meaning; the label text does.
 * - Variants:
 *   - `tone`: 'neutral' (default) | 'accent' | 'success' | 'premium'.
 *   - `variant`: unset (default) keeps each tone's original look — `accent` is solid (crimson
 *     gradient, light text), the others are soft (tinted label on `surface-2`). 'soft' | 'solid' |
 *     'outline' force a treatment; solid fills use the page-background token for the label so
 *     they stay legible in both themes.
 *   - `size`: 'sm' | 'md' (default) — 20px / 24px tall.
 *   - `pulse`: animates the `dot` for live states (Tailwind's built-in `animate-pulse` /
 *     `animate-ping`), still under reduced motion.
 * - The pill radius is fixed; `className` merges last and wins over a conflicting utility.
 * - Theming: colors come from `--sk-*` tokens and flip with `data-theme`.
 *
 * @example
 * ```tsx
 * import { Badge } from '@sukunagg/ui'
 *
 * <Badge tone="accent" dot pulse>
 *   Live
 * </Badge>
 * <Badge tone="success" size="sm">
 *   Cleared
 * </Badge>
 * ```
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { tone, variant, size, dot, pulse, className, children, ...rest },
  ref,
) {
  return (
    <span ref={ref} className={badgeStyles({ tone, variant, size, className })} {...rest}>
      {dot ? (
        <span aria-hidden="true" className={pulse ? `${badgeDot} ${badgeDotPulse}` : badgeDot} />
      ) : null}
      {children}
    </span>
  )
})
