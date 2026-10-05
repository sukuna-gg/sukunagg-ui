import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  forwardRef,
  type ReactNode,
} from 'react'
import { hashId } from '../../internal/data'
import { radialGaugeStyles } from './radial-gauge.styles'

/** Props for {@link RadialGauge}. Extends the native `<div>` except `children`. */
export interface RadialGaugeProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** The value. `null` = not reported: track only, "—", announced as `missingLabel`. */
  value: number | null
  /** @default 0 */
  min?: number
  /** @default 100 */
  max?: number
  /** Visible name under the gauge; also names the meter. Without it, pass `aria-label`. */
  label?: ReactNode
  /** Text in the middle. Default: the formatted value. */
  valueLabel?: ReactNode
  /** Small text under the middle value, e.g. "of 100 LP". */
  caption?: ReactNode
  /** Line under the label, e.g. "Diamond II → I". */
  description?: ReactNode
  /**
   * Fill color, any CSS color.
   * @default 'var(--sk-chart-1)'
   */
  color?: string
  /**
   * Width in px (the dial is 88% as tall).
   * @default 150
   */
  size?: number
  /**
   * Arc width in px.
   * @default 12
   */
  thickness?: number
  /** Number format for the value and `aria-valuetext`. */
  format?: Intl.NumberFormatOptions
  /**
   * Locale for numbers, fixed so server and browser output match.
   * @default 'en-US'
   */
  locale?: string
  /**
   * What screen readers hear for a missing value.
   * @default 'Not reported'
   */
  missingLabel?: string
}

const START = -0.75 * Math.PI
const END = 0.75 * Math.PI

/** An arc of radius r from angle a0 to a1 (radians from the top, clockwise) in a 0–100 viewBox. */
function arcPath(r: number, a0: number, a1: number): string {
  const pt = (a: number) =>
    `${(50 + r * Math.sin(a)).toFixed(3)},${(50 - r * Math.cos(a)).toFixed(3)}`
  return `M${pt(a0)}A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${pt(a1)}`
}

/**
 * One value against a range as a 270° arc with the number in the middle: LP to the next
 * division, plan usage, a score.
 *
 * @remarks
 * - SSR/RSC: a server component, no client JS. The dial is SVG in a square viewBox (the arc
 *   never stretches); the texts are HTML.
 * - Accessibility: `role="meter"` with `aria-valuemin/max/now` and a text value, named by
 *   `label` or `aria-label`. A missing value can't be a meter (`aria-valuenow` is required and 0
 *   would lie), so it becomes `role="img"` with the same name, described as `missingLabel`.
 * - Missing data: `null` draws only the track and "—", never 0. Values outside the range clamp.
 * - Use `Meter` (a bar, `@sukunagg/ui`) inside tables and forms; this is for a headline figure.
 *
 * @example
 * ```tsx
 * import { RadialGauge } from '@sukunagg/charts'
 *
 * <RadialGauge value={64} label="LP to next division" caption="of 100 LP" description="Diamond II → I" />
 * <RadialGauge value={null} aria-label="LP to next division" caption="Unranked" />
 * ```
 */
export const RadialGauge = forwardRef<HTMLDivElement, RadialGaugeProps>(function RadialGauge(
  {
    value,
    min = 0,
    max = 100,
    label,
    valueLabel,
    caption,
    description,
    color,
    size = 150,
    thickness = 12,
    format,
    locale = 'en-US',
    missingLabel = 'Not reported',
    className,
    style,
    id,
    'aria-valuetext': valueText,
    ...rest
  },
  ref,
) {
  const s = radialGaugeStyles()
  const baseId =
    id ??
    hashId(
      JSON.stringify([rest['aria-label'], min, max, value, typeof label === 'string' ? label : '']),
    )
  const labelId = `${baseId}-label`
  const text = value === null ? null : new Intl.NumberFormat(locale, format).format(value)
  const span = max - min
  const ratio = value === null || span <= 0 ? 0 : Math.min(1, Math.max(0, (value - min) / span))
  const r = 50 - (thickness / size) * 50
  const sw = (thickness / size) * 100

  // A meter must have a value (aria-valuenow is required), so a missing value is an image named
  // like the gauge and described as `missingLabel` — never a meter at 0.
  const missing = value === null
  const labelledBy = label ? labelId : undefined
  // Role-specific ARIA is built per role (and spread) so each element only gets what its role supports.
  const roleProps = missing
    ? { role: 'img', 'aria-labelledby': labelledBy, 'aria-describedby': `${baseId}-missing` }
    : {
        role: 'meter',
        'aria-labelledby': labelledBy,
        'aria-valuemin': min,
        'aria-valuemax': max,
        'aria-valuenow': value,
        'aria-valuetext': valueText ?? (text as string),
      }
  return (
    <div
      ref={ref}
      id={id}
      {...roleProps}
      className={s.root({ className })}
      style={
        { ...style, ['--sk-gauge-color' as string]: color ?? 'var(--sk-chart-1)' } as CSSProperties
      }
      {...rest}
    >
      <div className={s.dial()} style={{ width: size, height: size * 0.88 }}>
        <svg aria-hidden="true" focusable="false" className={s.svg()} viewBox="0 0 100 88">
          <path
            className={s.track()}
            d={arcPath(r, START, END)}
            strokeWidth={sw}
            strokeLinecap="round"
          />
          {ratio > 0 ? (
            <path
              className={s.fill()}
              d={arcPath(r, START, START + (END - START) * ratio)}
              strokeWidth={sw}
              strokeLinecap="round"
            />
          ) : null}
        </svg>
        <div aria-hidden="true" className={s.center()}>
          {text === null ? (
            <span className={s.missing()}>{valueLabel ?? '—'}</span>
          ) : (
            <span className={s.value()}>{valueLabel ?? text}</span>
          )}
          {caption ? <span className={s.caption()}>{caption}</span> : null}
        </div>
      </div>
      {label ? (
        <span id={labelId} className={s.label()}>
          {label}
        </span>
      ) : null}
      {description ? <span className={s.description()}>{description}</span> : null}
      {missing ? (
        <span id={`${baseId}-missing`} className="sr-only">
          {missingLabel}
        </span>
      ) : null}
    </div>
  )
})
