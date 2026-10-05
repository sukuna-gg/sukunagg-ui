import { tv, type VariantProps } from '../../utils/tv'

export const statTileStyles = tv({
  slots: {
    root: 'flex min-w-0 flex-col gap-1.5 rounded-lg border border-line bg-surface px-4 py-3.5',
    label: 'font-display text-xs font-extrabold uppercase italic tracking-[.14em] text-text-dim',
    row: 'flex min-h-[30px] items-end justify-between gap-3',
    value: 'tabular-nums',
    missing: 'text-text-faint',
    caption: 'text-xs text-text-dim',
    delta: 'flex flex-wrap items-baseline gap-1.5 text-xs font-semibold',
    period: 'font-normal text-text-faint',
    trendBeside: 'flex min-w-0 max-w-24 flex-1 justify-end',
    trendBelow: 'mt-auto block pt-1.5',
    skeleton: 'animate-pulse rounded-sm bg-surface-2 motion-reduce:animate-none',
  },
  variants: {
    size: {
      md: { root: 'min-h-28', value: 'text-[28px] leading-none' },
      lg: { root: 'min-h-44', value: 'text-[52px] leading-none' },
    },
    valueFont: {
      display: { value: 'font-display font-black italic font-stretch-expanded' },
      sans: { value: 'font-sans font-semibold tracking-tight' },
    },
    tone: {
      default: { value: 'text-text' },
      positive: { value: 'text-success' },
      negative: { value: 'text-danger' },
      premium: { value: 'text-premium' },
      // App palette: `valueColor` sets --sk-stat-value on the root.
      custom: { value: 'text-(--sk-stat-value)' },
    },
    deltaTone: {
      good: { delta: 'text-success' },
      bad: { delta: 'text-danger' },
      flat: { delta: 'text-text-dim' },
    },
  },
  defaultVariants: { size: 'md', valueFont: 'display', tone: 'default', deltaTone: 'flat' },
})

export type StatTileStyleProps = VariantProps<typeof statTileStyles>
