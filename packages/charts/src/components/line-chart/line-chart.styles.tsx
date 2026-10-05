import { tv, type VariantProps } from '../../utils/tv'

// Series colors arrive as CSS custom properties (`--sk-series-color`, `--sk-dot-color`, …) and are
// read by literal utilities, so no class name is ever built from a value (rule #7).
export const lineChartStyles = tv({
  slots: {
    svg: 'pointer-events-none absolute inset-0 size-full overflow-visible',
    line: 'fill-none stroke-(--sk-series-color) [stroke-linecap:round] [stroke-linejoin:round] [vector-effect:non-scaling-stroke]',
    area: 'fill-(--sk-series-color) stroke-none opacity-10',
    split: 'stroke-none opacity-32',
    dot: 'pointer-events-none absolute size-2 -translate-1/2 rounded-full bg-(--sk-dot-color) ring-2 ring-surface',
    lone: 'pointer-events-none absolute size-1.5 -translate-1/2 rounded-full bg-(--sk-dot-color)',
    endLabel:
      'pointer-events-none absolute left-[calc(100%+8px)] -translate-y-1/2 whitespace-nowrap text-xs leading-none',
    band: 'pointer-events-none absolute inset-x-0 bg-(--sk-band-color) opacity-7',
    bandLabel:
      'pointer-events-none absolute left-1.5 mt-1 text-[10.5px] leading-none text-text-faint',
    reference: 'pointer-events-none absolute inset-x-0 h-px bg-text-dim opacity-60',
    gap: 'pointer-events-none absolute inset-y-0 bg-text/4',
    gapLabel: 'absolute inset-x-0 top-1 text-center text-[10.5px] leading-none text-text-faint',
  },
  variants: {
    endTone: {
      value: { endLabel: 'font-semibold text-text tabular-nums' },
      series: { endLabel: 'text-text-dim' },
    },
  },
})

export type LineChartStyleProps = VariantProps<typeof lineChartStyles>
