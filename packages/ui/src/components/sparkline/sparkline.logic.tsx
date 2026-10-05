import { type ComponentPropsWithoutRef, type CSSProperties, forwardRef } from 'react'
import { sparklineStyles } from './sparkline.styles'

/** Props for {@link Sparkline}. Extends the native `<span>` except `children`. */
export interface SparklineProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  /**
   * Values, oldest → newest. `null` is a missing point: the line breaks there instead of being
   * drawn as 0. For `winloss`, only the sign counts (`> 0` win, `< 0` loss, `0`/`null` gap).
   */
  data: readonly (number | null)[]
  /**
   * Shape: `line`, `area` (line + 12% fill), `bar`, or `winloss` (up/down bars from the middle).
   * @default 'line'
   */
  variant?: 'line' | 'area' | 'bar' | 'winloss'
  /**
   * Width as a CSS length or px number. Line and area stretch to any width without client JS.
   * @default '100%'
   */
  width?: number | string
  /**
   * Height in px.
   * @default 28
   */
  height?: number
  /**
   * Mark color as any CSS color, e.g. `'var(--l-blue)'`. Unset: `line` and `bar` use the
   * de-emphasis grey (`--sk-text-faint`) with the latest point in `--sk-chart-1`; `area` uses
   * `--sk-chart-1`.
   */
  color?: string
  /**
   * `winloss` only: color of win bars.
   * @default 'var(--sk-chart-1)'
   */
  winColor?: string
  /**
   * `winloss` only: color of loss bars.
   * @default 'var(--sk-text-faint)'
   */
  lossColor?: string
  /**
   * Emphasise the latest known point (ringed dot on line/area, full-strength bar on bar).
   * @default true
   */
  highlightLast?: boolean
  /**
   * Shown when `data` has no numbers.
   * @default '–'
   */
  emptyLabel?: string
}

/** Pixels between the plot edge and the outermost point, so the ringed dot never clips. */
const PAD = 6

/** Indices of the runs of known (non-null) values, in order: `[1, 2, null, 4]` → `[[0, 1], [3]]`. */
export function toSegments(data: readonly (number | null)[]): number[][] {
  const runs: number[][] = []
  let run: number[] = []
  data.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) {
      if (run.length) runs.push(run)
      run = []
    } else run.push(i)
  })
  if (run.length) runs.push(run)
  return runs
}

/**
 * Maps the known values to y pixels inside `height`, keeping `PAD` px free at the top and bottom.
 * Flat data sits in the middle. Returns `null` for missing points.
 */
export function scaleY(data: readonly (number | null)[], height: number): (number | null)[] {
  const known = data.filter((v): v is number => v !== null && Number.isFinite(v))
  const lo = Math.min(...known)
  const hi = Math.max(...known)
  return data.map((v) => {
    if (v === null || !Number.isFinite(v)) return null
    if (hi === lo) return height / 2
    return PAD + ((hi - v) / (hi - lo)) * (height - PAD * 2)
  })
}

/** x position (0–100, percent of the plot) of point `i` of `n`. One point sits at the right edge. */
const xAt = (i: number, n: number): number => (n <= 1 ? 100 : (i / (n - 1)) * 100)

const fmt = (v: number): string => new Intl.NumberFormat('en-US').format(v)

/** The default spoken summary for `data`. */
function summary(data: readonly (number | null)[], variant: SparklineProps['variant']): string {
  if (variant === 'winloss') {
    const wins = data.filter((v) => v !== null && v > 0).length
    const losses = data.filter((v) => v !== null && v < 0).length
    return `${wins} ${wins === 1 ? 'win' : 'wins'}, ${losses} ${losses === 1 ? 'loss' : 'losses'}`
  }
  const known = data.filter((v): v is number => v !== null && Number.isFinite(v))
  const first = known[0] as number
  const last = known[known.length - 1] as number
  return known.length === 1 ? `Trend: ${fmt(first)}` : `Trend from ${fmt(first)} to ${fmt(last)}`
}

/**
 * A word-sized trend with no axes, for stat tiles, table cells and running text.
 *
 * @remarks
 * - SSR/RSC: a server component (no `'use client'`, no hooks). Line and area are an SVG with
 *   `preserveAspectRatio="none"` and non-scaling strokes, and the dots are HTML, so it stretches to
 *   any container width with no client measuring and no layout shift.
 * - Missing data: `null` breaks the line instead of drawing 0. With no numbers at all it renders
 *   `emptyLabel` ("–") plus sr-only "no data", at the same height.
 * - Accessibility: the root is `role="img"` with a summary (`"Trend from 1,810 to 1,902"`,
 *   `"6 wins, 4 losses"`); pass `aria-label` to say more. Win/loss reads by position (up vs
 *   down), not color alone.
 * - Variants: `line` (default), `area`, `bar`, `winloss`.
 * - Theming: colors are `--sk-*` tokens by default; `color`/`winColor`/`lossColor` take any CSS
 *   color, so apps can pass their own palettes.
 *
 * @example
 * ```tsx
 * import { Sparkline } from '@sukunagg/ui'
 *
 * <Sparkline data={[1810, 1825, null, 1840, 1866, 1902]} width={96} />
 * <Sparkline variant="winloss" data={[1, 1, -1, 1, -1]} winColor="var(--l-win)" lossColor="var(--l-loss)" />
 * ```
 */
export const Sparkline = forwardRef<HTMLSpanElement, SparklineProps>(function Sparkline(
  {
    data,
    variant = 'line',
    width = '100%',
    height = 28,
    color,
    winColor,
    lossColor,
    highlightLast = true,
    emptyLabel = '–',
    className,
    style,
    'aria-label': ariaLabel,
    ...rest
  },
  ref,
) {
  const s = sparklineStyles({ variant })
  const segments = toSegments(data)

  if (segments.length === 0) {
    return (
      <span ref={ref} className={s.empty({ className })} style={{ height, ...style }} {...rest}>
        <span aria-hidden="true">{emptyLabel}</span>
        <span className="sr-only">{ariaLabel ?? 'no data'}</span>
      </span>
    )
  }

  const vars = {
    '--sk-spark-color':
      color ?? (variant === 'area' ? 'var(--sk-chart-1)' : 'var(--sk-text-faint)'),
    '--sk-spark-dot': color ?? 'var(--sk-chart-1)',
    '--sk-spark-win': winColor ?? 'var(--sk-chart-1)',
    '--sk-spark-loss': lossColor ?? 'var(--sk-text-faint)',
  } as CSSProperties

  const root = {
    ref,
    role: 'img',
    'aria-label': ariaLabel ?? summary(data, variant),
    className: s.root({ className }),
    style: { width, height, ...vars, ...style },
    ...rest,
  }

  const n = data.length

  if (variant === 'bar' || variant === 'winloss') {
    const known = data.filter((v): v is number => v !== null && Number.isFinite(v))
    const hi = Math.max(...known.map(Math.abs))
    const lastKnown = segments[segments.length - 1]?.at(-1)
    return (
      <span {...root}>
        <span aria-hidden="true" className={s.bars()}>
          {data.map((v, i) => {
            if (variant === 'winloss') {
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: positions are the identity here
                <span key={i} className={s.wl()}>
                  <span className={s.half()}>
                    {v !== null && v > 0 ? <span className={s.win()} /> : null}
                  </span>
                  <span className={s.half()}>
                    {v !== null && v < 0 ? <span className={s.loss()} /> : null}
                  </span>
                </span>
              )
            }
            const h = v === null || !Number.isFinite(v) || hi === 0 ? 0 : (Math.abs(v) / hi) * 100
            const last = highlightLast && i === lastKnown
            return (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: positions are the identity here
                key={i}
                className={`${s.bar()} ${last ? s.barLast() : s.barOld()}`}
                style={{ height: `${h}%` }}
              />
            )
          })}
        </span>
      </span>
    )
  }

  const ys = scaleY(data, height)
  const path = segments
    .filter((seg) => seg.length > 1)
    .map((seg) =>
      seg
        .map((i, k) => `${k ? 'L' : 'M'}${xAt(i, n).toFixed(2)},${(ys[i] as number).toFixed(2)}`)
        .join(''),
    )
  const lonePoints = segments.filter((seg) => seg.length === 1).map((seg) => seg[0] as number)
  const lastKnown = segments[segments.length - 1]?.at(-1) as number

  return (
    <span {...root}>
      <span className={s.plot()}>
        <svg
          aria-hidden="true"
          focusable="false"
          className={s.svg()}
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
        >
          {variant === 'area'
            ? segments
                .filter((seg) => seg.length > 1)
                .map((seg) => (
                  <path
                    key={seg[0]}
                    className={s.area()}
                    d={`M${xAt(seg[0] as number, n).toFixed(2)},${height}${seg
                      .map((i) => `L${xAt(i, n).toFixed(2)},${(ys[i] as number).toFixed(2)}`)
                      .join('')}L${xAt(seg.at(-1) as number, n).toFixed(2)},${height}Z`}
                  />
                ))
            : null}
          {path.map((d) => (
            <path key={d} className={s.line()} d={d} strokeWidth={1.5} />
          ))}
        </svg>
        {lonePoints
          .filter((i) => !(highlightLast && i === lastKnown))
          .map((i) => (
            <span
              key={i}
              aria-hidden="true"
              className={s.point()}
              style={{ left: `${xAt(i, n)}%`, top: ys[i] as number }}
            />
          ))}
        {highlightLast ? (
          <span
            aria-hidden="true"
            className={s.dot()}
            style={{ left: `${xAt(lastKnown, n)}%`, top: ys[lastKnown] as number }}
          />
        ) : null}
      </span>
    </span>
  )
})
