import { type ComponentPropsWithoutRef, type CSSProperties, forwardRef } from 'react'
import { devWarn, formatter } from '../../internal/data'
import { dataBarStyles } from './data-bar.styles'

/** Props for {@link DataBar}. Extends the native `<span>` except `children`. */
export interface DataBarProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  /** The value. `null` = not reported: "–" and no bar, never an empty bar that reads as 0. */
  value: number | null
  /** The value a full bar represents — usually the column's top value, so rows share one scale. */
  max: number
  /**
   * Bar color, any CSS color (e.g. `'var(--l-blue)'`).
   * @default 'var(--sk-chart-1)'
   */
  color?: string
  /** Number format: `Intl` options, or a function. */
  format?: Intl.NumberFormatOptions | ((v: number) => string)
  /**
   * Locale for numbers, fixed so server and browser output match.
   * @default 'en-US'
   */
  locale?: string
  /**
   * Print the number above the bar. With `false`, pass an `aria-label` (the bar becomes the image).
   * @default true
   */
  showValue?: boolean
  /**
   * What screen readers hear for a missing value.
   * @default 'Not reported'
   */
  missingLabel?: string
  /**
   * Track thickness: `sm` 4px, `md` 6px.
   * @default 'md'
   */
  size?: 'sm' | 'md'
}

/**
 * A number with a small bar under it, for comparing table rows at a glance (damage in a
 * scoreboard, pick rate in a meta table). The bar is `value / max`, clamped to the track.
 *
 * @remarks
 * - SSR/RSC: a server component, plain HTML, no client JS.
 * - Missing data: `null` renders "–" plus sr-only `missingLabel`, with no track; `0` renders "0"
 *   and an empty track. `max <= 0` draws no bar.
 * - Accessibility: the number is real text read in table order; the bar is decorative. With
 *   `showValue={false}` the root is `role="img"` and needs an `aria-label`.
 * - Not a `Meter` (a standalone gauge with `role="meter"`): DataBar is a cell-level comparison.
 *
 * @example
 * ```tsx
 * import { DataBar } from '@sukunagg/charts'
 *
 * <DataBar value={p.damage.to_champions} max={maxDamage} color="var(--l-blue)" />
 * <DataBar value={null} max={maxDamage} />
 * ```
 */
export const DataBar = forwardRef<HTMLSpanElement, DataBarProps>(function DataBar(
  {
    value,
    max,
    color,
    format,
    locale = 'en-US',
    showValue = true,
    missingLabel = 'Not reported',
    size,
    className,
    style,
    ...rest
  },
  ref,
) {
  const s = dataBarStyles({ size })
  if (value === null) {
    return (
      <span ref={ref} className={s.missing({ className })} style={style} {...rest}>
        <span aria-hidden="true">–</span>
        <span className="sr-only">{missingLabel}</span>
      </span>
    )
  }
  if (!showValue && !rest['aria-label'])
    devWarn('DataBar with showValue={false} needs an aria-label.')
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const text = formatter(format, locale)(value)
  return (
    <span
      ref={ref}
      role={showValue ? undefined : 'img'}
      className={s.root({ className })}
      style={
        {
          ...style,
          ['--sk-databar-color' as string]: color ?? 'var(--sk-chart-1)',
        } as CSSProperties
      }
      {...rest}
    >
      {showValue ? <span className={s.value()}>{text}</span> : null}
      <span aria-hidden="true" className={s.track()}>
        <span className={s.fill()} style={{ width: `${pct}%` }} />
      </span>
    </span>
  )
})
