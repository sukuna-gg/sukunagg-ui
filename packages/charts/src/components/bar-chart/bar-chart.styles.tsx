import { tv, type VariantProps } from '../../utils/tv'

// Bar colors arrive as `--sk-bar-color` on each bar and are read by a literal utility (rule #7).
export const barChartStyles = tv({
  slots: {
    /** One category: an absolutely positioned column (vertical) or row (horizontal). */
    band: 'absolute flex',
    /** Holds one bar plus its value label. */
    slot: 'relative',
    bar: 'absolute bg-(--sk-bar-color)',
    segment: 'absolute inset-x-0 bg-(--sk-bar-color)',
    cap: 'absolute text-xs font-bold whitespace-nowrap text-text tabular-nums leading-none',
    capMissing: 'text-text-faint',
  },
  variants: {
    layout: {
      grouped: {
        band: 'inset-y-0 items-end justify-center gap-0.5',
        slot: 'h-full max-w-6 flex-1',
        bar: 'inset-x-0 bottom-0 rounded-t-[4px]',
        cap: 'left-1/2 -translate-x-1/2',
      },
      stacked: {
        band: 'inset-y-0 items-end justify-center',
        slot: 'h-full max-w-6 flex-1',
        cap: 'left-1/2 -translate-x-1/2',
      },
      horizontal: {
        band: 'inset-x-0 flex-col justify-center gap-0.5',
        slot: 'max-h-[18px] w-full flex-1',
        bar: 'inset-y-0 left-0 rounded-r-[4px]',
        cap: 'top-1/2 -translate-y-1/2',
      },
    },
  },
  defaultVariants: { layout: 'grouped' },
})

export type BarChartStyleProps = VariantProps<typeof barChartStyles>
