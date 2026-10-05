import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  forwardRef,
  type ReactNode,
} from 'react'
import { Sparkline } from '../sparkline'
import { statTileStyles } from './stat-tile.styles'

/** A signed change shown under the value. */
export interface StatTileDelta {
  /** Signed change. `0` renders "No change". */
  value: number
  /** What it's compared to: "vs last act", "since yesterday". */
  period?: ReactNode
  /** Number format for the change, e.g. `{ maximumFractionDigits: 1 }`. */
  format?: Intl.NumberFormatOptions
  /** Text after the number: `' pts'`, `'%'`, `' LP'`. */
  unit?: string
  /**
   * `true` when down is good (deaths, churn, latency): flips which direction is colored good.
   * @default false
   */
  invert?: boolean
}

/** Props for {@link StatTile}. Extends the native `<div>` except `children`. */
export interface StatTileProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** What the number is: "Win rate", "Avg. place". */
  label: ReactNode
  /**
   * The headline value. A number is formatted with `format`; a string or node is shown as is.
   * `null` (or `undefined`) means missing: it renders "—", never 0 — say why in `caption`.
   */
  value: ReactNode
  /** Number format for a numeric `value`, e.g. `{ style: 'percent' }`. */
  format?: Intl.NumberFormatOptions
  /**
   * Locale for numbers. Fixed by default so the server and the browser print the same string.
   * @default 'en-US'
   */
  locale?: string
  /** Line under the value: a record, a breakdown, or why the value is missing. */
  caption?: ReactNode
  /**
   * Value color, from your own thresholds ("win rate ≥ 60% is good").
   * @default 'default'
   */
  tone?: 'default' | 'positive' | 'negative' | 'premium'
  /** Any CSS color for the value, e.g. `'var(--l-great)'`. Overrides `tone`. */
  valueColor?: string
  /** Signed change against a named period. */
  delta?: StatTileDelta
  /** Recent values, oldest → newest, drawn as a Sparkline. `null` points break the line. */
  trend?: readonly (number | null)[]
  /**
   * `lg` is the hero tile: 52px value and a full-width trend under it.
   * @default 'md'
   */
  size?: 'md' | 'lg'
  /**
   * `display` = Archivo 900 italic, expanded (load Archivo with its `wdth` axis). `sans` for dense UIs.
   * @default 'display'
   */
  valueFont?: 'display' | 'sans'
  /**
   * Screen-reader text for a missing value.
   * @default 'Not reported'
   */
  missingLabel?: string
  /**
   * Show a skeleton of the same size and set `aria-busy`.
   * @default false
   */
  loading?: boolean
}

/**
 * One headline number with what it means: a label, the value, a caption line, and optionally a
 * signed change against a named period and a small trend.
 *
 * @remarks
 * - SSR/RSC: a server component (no `'use client'`). Numbers format with a fixed `locale` so the
 *   server and browser output match. For a count-up, put a `Counter` in `value`.
 * - Missing data: `value={null}` shows "—" with sr-only `missingLabel`; a real `0` shows "0".
 * - Accessibility: reads in order label → value → caption → change. The change is spelled out for
 *   screen readers ("up 2.1 pts, better, vs last act"); the arrow and color are never the only cue.
 * - Variants: `tone` 'default' | 'positive' | 'negative' | 'premium' (or any `valueColor`);
 *   `size` 'md' | 'lg'; `valueFont` 'display' | 'sans'.
 * - Colors: up/better is `--sk-success`, down/worse is `--sk-danger` (coral, never the accent).
 *
 * @example
 * ```tsx
 * import { StatTile } from '@sukunagg/ui'
 *
 * <StatTile label="Win rate" value={0.583} format={{ style: 'percent', maximumFractionDigits: 1 }}
 *   tone="positive" caption="35W 25L" />
 * <StatTile label="Avg deaths / match" value={14.3} caption="Last 20 games"
 *   delta={{ value: -1.6, period: 'vs last 20', invert: true }} trend={[16.4, 15.9, 15.1, 14.3]} />
 * <StatTile label="Damage / game" value={null} caption="Not reported by Riot for Set 18" />
 * ```
 */
export const StatTile = forwardRef<HTMLDivElement, StatTileProps>(function StatTile(
  {
    label,
    value,
    format,
    locale = 'en-US',
    caption,
    tone = 'default',
    valueColor,
    delta,
    trend,
    size = 'md',
    valueFont,
    missingLabel = 'Not reported',
    loading = false,
    className,
    style,
    ...rest
  },
  ref,
) {
  if (loading) {
    const s = statTileStyles({ size })
    return (
      <div ref={ref} aria-busy="true" className={s.root({ className })} style={style} {...rest}>
        <span aria-hidden="true" className={s.skeleton({ class: 'h-3 w-2/5' })} />
        <span
          aria-hidden="true"
          className={s.skeleton({ class: size === 'lg' ? 'h-12 w-3/5' : 'h-7 w-3/5' })}
        />
        <span aria-hidden="true" className={s.skeleton({ class: 'h-3 w-3/4' })} />
      </div>
    )
  }

  const nf = (n: number, o?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale, o).format(n)

  let deltaTone: 'good' | 'bad' | 'flat' = 'flat'
  if (delta && delta.value !== 0)
    deltaTone = delta.value > 0 !== Boolean(delta.invert) ? 'good' : 'bad'

  const s = statTileStyles({ size, valueFont, tone: valueColor ? 'custom' : tone, deltaTone })
  const missing = value === null || value === undefined
  const shown = typeof value === 'number' ? nf(value, format) : value
  // An all-null trend has nothing to draw: skip the slot instead of showing an empty sparkline.
  const trendEl = trend?.some((v) => v !== null) ? (
    <Sparkline
      data={trend}
      variant={size === 'lg' ? 'area' : 'line'}
      height={size === 'lg' ? 56 : 28}
    />
  ) : null

  let deltaEl: ReactNode = null
  if (delta) {
    const amount = `${nf(Math.abs(delta.value), delta.format)}${delta.unit ?? ''}`
    const words =
      delta.value === 0
        ? 'no change'
        : `${delta.value > 0 ? 'up' : 'down'} ${amount}, ${deltaTone === 'good' ? 'better' : 'worse'}`
    deltaEl = (
      <span className={s.delta()}>
        <span aria-hidden="true">
          {delta.value === 0 ? '– No change' : `${delta.value > 0 ? '▲' : '▼'} ${amount}`}
        </span>
        <span className="sr-only">{delta.period ? `${words},` : words}</span>
        {delta.period ? <span className={s.period()}>{delta.period}</span> : null}
      </span>
    )
  }

  return (
    <div
      ref={ref}
      className={s.root({ className })}
      style={valueColor ? ({ '--sk-stat-value': valueColor, ...style } as CSSProperties) : style}
      {...rest}
    >
      <span className={s.label()}>{label}</span>
      <div className={s.row()}>
        {missing ? (
          // Missing ignores tone/valueColor: always the faint "—".
          <span className={statTileStyles({ size, valueFont }).value({ class: s.missing() })}>
            <span aria-hidden="true">—</span>
            <span className="sr-only">{missingLabel}</span>
          </span>
        ) : (
          <span className={s.value()}>{shown}</span>
        )}
        {size === 'md' && trendEl ? <span className={s.trendBeside()}>{trendEl}</span> : null}
      </div>
      {caption ? <span className={s.caption()}>{caption}</span> : null}
      {deltaEl}
      {size === 'lg' && trendEl ? <span className={s.trendBelow()}>{trendEl}</span> : null}
    </div>
  )
})
