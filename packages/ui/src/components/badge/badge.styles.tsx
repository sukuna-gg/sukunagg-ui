import { tv, type VariantProps } from '../../utils/tv'

// Every tone × variant look is a literal string (rule #7). `auto` is the internal default and
// reproduces the original per-tone look exactly: accent was solid (gradient), the rest soft.
// Solid fills use `text-bg` (the page-background token), which is dark on a light fill and light
// on a dark fill in both themes, so each solid pairing stays legible without a per-theme rule.
export const badgeStyles = tv({
  base: 'inline-flex items-center justify-center rounded-pill font-semibold whitespace-nowrap select-none align-middle border',
  variants: {
    tone: { neutral: '', accent: '', success: '', premium: '' },
    variant: { auto: '', soft: '', solid: '', outline: '' },
    size: {
      sm: 'h-5 px-2 text-xs gap-1',
      md: 'h-6 px-2.5 text-sm gap-1.5',
    },
  },
  compoundVariants: [
    // auto = original look
    { tone: 'neutral', variant: 'auto', class: 'bg-surface-2 text-text-dim border-line' },
    { tone: 'accent', variant: 'auto', class: 'bg-gradient-accent text-text border-transparent' },
    { tone: 'success', variant: 'auto', class: 'bg-surface-2 text-success border-line' },
    { tone: 'premium', variant: 'auto', class: 'bg-surface-2 text-premium border-line' },
    // soft
    { tone: 'neutral', variant: 'soft', class: 'bg-surface-2 text-text-dim border-line' },
    { tone: 'accent', variant: 'soft', class: 'bg-surface-2 text-accent border-line' },
    { tone: 'success', variant: 'soft', class: 'bg-surface-2 text-success border-line' },
    { tone: 'premium', variant: 'soft', class: 'bg-surface-2 text-premium border-line' },
    // solid
    { tone: 'neutral', variant: 'solid', class: 'bg-text-dim text-bg border-transparent' },
    { tone: 'accent', variant: 'solid', class: 'bg-gradient-accent text-text border-transparent' },
    { tone: 'success', variant: 'solid', class: 'bg-success text-bg border-transparent' },
    { tone: 'premium', variant: 'solid', class: 'bg-premium text-bg border-transparent' },
    // outline
    { tone: 'neutral', variant: 'outline', class: 'bg-transparent text-text-dim border-line' },
    { tone: 'accent', variant: 'outline', class: 'bg-transparent text-accent border-accent' },
    { tone: 'success', variant: 'outline', class: 'bg-transparent text-success border-success' },
    { tone: 'premium', variant: 'outline', class: 'bg-transparent text-premium border-premium' },
  ],
  defaultVariants: { tone: 'neutral', variant: 'auto', size: 'md' },
})

/** Leading status dot. Decorative — always paired with `aria-hidden`. */
export const badgeDot = 'inline-block size-1.5 rounded-full bg-current shrink-0'

/**
 * Live pulse for the dot (`pulse`): it blinks and a ring ripples out of it, both Tailwind's
 * built-in keyframes (no new motion tokens). `motion-safe:` keeps it still under reduced motion.
 */
export const badgeDotPulse =
  'relative motion-safe:animate-pulse after:absolute after:inset-0 after:rounded-full after:bg-current motion-safe:after:animate-ping'

export type BadgeStyleProps = VariantProps<typeof badgeStyles>
