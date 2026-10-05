import { tv, type VariantProps } from '../../utils/tv'

// Colors arrive as CSS custom properties set on the root (`--sk-spark-*`) and are read by the
// literal utilities below, so no class name is ever built from a value (rule #7).
export const sparklineStyles = tv({
  slots: {
    root: 'relative inline-block shrink-0 align-middle min-w-12',
    // Inset by the dot's radius + ring so the end dot never clips at the edges.
    plot: 'absolute inset-y-0 inset-x-[5px]',
    svg: 'block size-full overflow-visible',
    line: 'fill-none stroke-(--sk-spark-color) [stroke-linecap:round] [stroke-linejoin:round] [vector-effect:non-scaling-stroke]',
    area: 'fill-(--sk-spark-color) opacity-12 stroke-none',
    dot: 'pointer-events-none absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--sk-spark-dot) ring-2 ring-surface',
    // A lone known point between gaps: a small dot in the line color, no ring.
    point:
      'pointer-events-none absolute size-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--sk-spark-color)',
    bars: 'absolute inset-0 flex gap-0.5',
    bar: 'min-w-px flex-1 rounded-t-[1.5px]',
    barOld: 'bg-(--sk-spark-color) opacity-55',
    barLast: 'bg-(--sk-spark-dot)',
    // winloss: a column per game split at the middle; wins rise from it, losses hang below it.
    wl: 'flex h-full max-w-1.5 flex-1 flex-col',
    half: 'flex h-1/2 w-full',
    win: 'mt-auto mb-px h-[calc(100%-3px)] w-full rounded-t-[1.5px] bg-(--sk-spark-win)',
    loss: 'mt-px h-[calc(100%-3px)] w-full rounded-b-[1.5px] bg-(--sk-spark-loss)',
    empty: 'inline-flex items-center text-sm text-text-faint',
  },
  variants: {
    variant: {
      line: {},
      area: {},
      bar: { bars: 'items-end' },
      winloss: { bars: 'items-stretch' },
    },
  },
  defaultVariants: { variant: 'line' },
})

export type SparklineStyleProps = VariantProps<typeof sparklineStyles>
