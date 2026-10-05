import { tv, type VariantProps } from '../../utils/tv'

export const dataBarStyles = tv({
  slots: {
    root: 'inline-grid min-w-24 gap-1 align-middle',
    value: 'text-xs leading-none text-text tabular-nums',
    track: 'overflow-hidden rounded-[3px] bg-surface-2',
    fill: 'block h-full rounded-[3px] bg-(--sk-databar-color)',
    missing: 'inline-flex min-w-24 align-middle text-xs text-text-faint',
  },
  variants: {
    size: {
      sm: { track: 'h-1' },
      md: { track: 'h-1.5' },
    },
  },
  defaultVariants: { size: 'md' },
})

export type DataBarStyleProps = VariantProps<typeof dataBarStyles>
