import { tv, type VariantProps } from '../../utils/tv'

// The fill color arrives as `--sk-gauge-color`; the track mixes it with the surface (rule #7).
export const radialGaugeStyles = tv({
  slots: {
    root: 'inline-grid justify-items-center gap-0.5 text-center',
    dial: 'relative',
    svg: 'block size-full',
    track: 'fill-none stroke-[color-mix(in_oklab,var(--sk-gauge-color)_16%,var(--sk-surface))]',
    fill: 'fill-none stroke-(--sk-gauge-color)',
    center:
      'pointer-events-none absolute inset-x-0 top-[57%] grid -translate-y-1/2 justify-items-center',
    value: 'text-[26px] leading-tight font-semibold text-text tabular-nums',
    missing: 'text-[26px] leading-tight font-semibold text-text-faint',
    caption: 'text-xs text-text-faint',
    label: 'text-sm font-semibold text-text',
    description: 'text-xs text-text-dim',
  },
})

export type RadialGaugeStyleProps = VariantProps<typeof radialGaugeStyles>
