import { tv, type VariantProps } from '../../utils/tv'

// One literal class per level (rule #7): tracked days use the heat ramp, untracked days an outline.
export const heatmapStyles = tv({
  slots: {
    root: 'm-0 grid min-w-0 gap-2.5',
    wrap: 'relative w-fit max-w-full',
    grid: 'grid gap-[3px]',
    month: 'h-3.5 overflow-visible text-[10.5px] leading-none whitespace-nowrap text-text-faint',
    day: 'flex items-center pr-1.5 text-[10.5px] leading-none text-text-faint',
    cell: 'aspect-square w-full rounded-[3px]',
    legend: 'flex flex-wrap items-center gap-1 text-xs text-text-dim',
    swatch: 'inline-block size-2.5 rounded-[3px]',
    overlay: 'absolute inset-0 grid place-items-center rounded-md bg-surface/85',
  },
  variants: {
    level: {
      0: { cell: 'bg-surface-2', swatch: 'bg-surface-2' },
      1: { cell: 'bg-heat-1', swatch: 'bg-heat-1' },
      2: { cell: 'bg-heat-2', swatch: 'bg-heat-2' },
      3: { cell: 'bg-heat-3', swatch: 'bg-heat-3' },
      4: { cell: 'bg-heat-4', swatch: 'bg-heat-4' },
      untracked: { cell: 'ring-1 ring-line ring-inset', swatch: 'ring-1 ring-line ring-inset' },
      blank: { cell: 'invisible' },
      loading: { cell: 'animate-pulse bg-surface-2 motion-reduce:animate-none' },
    },
  },
})

export type HeatmapStyleProps = VariantProps<typeof heatmapStyles>
