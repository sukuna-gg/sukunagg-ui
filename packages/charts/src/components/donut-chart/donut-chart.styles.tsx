import { tv, type VariantProps } from '../../utils/tv'

// Segment colors arrive as `--sk-segment-color` and are read by a literal utility (rule #7).
export const donutChartStyles = tv({
  slots: {
    root: 'm-0 grid min-w-0 gap-3',
    body: 'flex flex-wrap items-center gap-5',
    ring: 'relative shrink-0',
    svg: 'block size-full',
    segment: 'fill-(--sk-segment-color) transition-opacity duration-fast',
    track: 'fill-none stroke-surface-2',
    center: 'pointer-events-none absolute inset-0 grid place-content-center text-center',
    value: 'text-2xl leading-tight font-semibold text-text tabular-nums',
    missingValue: 'text-2xl leading-tight font-semibold text-text-faint',
    caption: 'text-xs text-text-faint',
    legend: 'm-0 grid min-w-36 flex-1 list-none gap-2 p-0 text-sm text-text-dim',
    item: 'flex items-center justify-between gap-4',
    swatch: 'size-2.5 shrink-0 rounded-[3px] bg-(--sk-segment-color)',
    share: 'font-semibold text-text tabular-nums',
    note: 'text-xs text-text-faint',
  },
})

export type DonutChartStyleProps = VariantProps<typeof donutChartStyles>
