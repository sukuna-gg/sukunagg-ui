'use client'

import { type KeyboardEvent, type PointerEvent, useState } from 'react'

/** One tooltip: a title and a row per series, already formatted on the server. */
export interface ChartTip {
  title: string
  rows: { label: string; value: string; color?: string }[]
}

export interface ChartInteractionProps {
  /** The chart's accessible name (the island adds "use the arrow keys"). */
  label: string
  /** `x`: positions run left → right (columns, points). `y`: top → bottom (horizontal bars). */
  axis: 'x' | 'y'
  /** Centre of each point/band, in % of the plot along `axis`. */
  positions: readonly number[]
  /** Band highlight thickness in %; unset draws a crosshair line instead. */
  band?: number
  /** Ringed dots on hover, per series: position across `axis` (% from top) per index. */
  marks?: readonly { color: string; at: readonly (number | null)[] }[]
  /** Where the tooltip points, across `axis`, per index (% from top for `x`, % from left for `y`). */
  anchors: readonly (number | null)[]
  tips: readonly ChartTip[]
}

const NEXT = new Set(['ArrowRight', 'ArrowDown'])
const PREV = new Set(['ArrowLeft', 'ArrowUp'])

/**
 * The client half of every chart: pointer and keyboard inspection over the server-rendered plot.
 * It only receives numbers and strings, so it crosses the RSC boundary as plain props.
 * @internal
 */
export function ChartInteraction({
  label,
  axis,
  positions,
  band,
  marks = [],
  anchors,
  tips,
}: ChartInteractionProps) {
  const [active, setActive] = useState<number | null>(null)
  const last = positions.length - 1

  const nearest = (pct: number): number => {
    let best = 0
    let dist = Number.POSITIVE_INFINITY
    positions.forEach((p, k) => {
      const d = Math.abs(p - pct)
      if (d < dist) {
        dist = d
        best = k
      }
    })
    return best
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const along = axis === 'x' ? (e.clientX - r.left) / r.width : (e.clientY - r.top) / r.height
    setActive(nearest(along * 100))
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number | null | undefined
    if (NEXT.has(e.key)) next = active === null ? 0 : Math.min(last, active + 1)
    else if (PREV.has(e.key)) next = active === null ? 0 : Math.max(0, active - 1)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    else if (e.key === 'Escape') next = null
    if (next === undefined) return
    e.preventDefault()
    setActive(next)
  }

  const tip = active === null ? undefined : tips[active]
  const pos = active === null ? 0 : (positions[active] as number)
  const anchor = active === null ? 50 : (anchors[active] ?? 50)

  // Keep the tooltip on the plot: flip to the other side past 60%, drop below near the top.
  const tipStyle =
    axis === 'x'
      ? {
          left: `${pos}%`,
          top: `${anchor}%`,
          translate: `${pos > 60 ? 'calc(-100% - 12px)' : '12px'} ${anchor < 25 ? '8px' : 'calc(-100% - 8px)'}`,
        }
      : {
          top: `${pos}%`,
          left: `${anchor}%`,
          translate: `${anchor > 60 ? 'calc(-100% - 12px)' : '12px'} -50%`,
        }

  return (
    // biome-ignore lint/a11y/useSemanticElements: a focusable group is the established chart pattern
    <div
      role="group"
      aria-roledescription="chart"
      aria-label={`${label}. Use the arrow keys to read values.`}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users inspect values from here
      tabIndex={0}
      className="absolute inset-0 z-[1] touch-pan-y rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
      onPointerMove={onPointerMove}
      onPointerLeave={() => setActive(null)}
      onKeyDown={onKeyDown}
      onBlur={() => setActive(null)}
    >
      {tip ? (
        <>
          {band === undefined ? (
            <span
              aria-hidden="true"
              className="absolute inset-y-0 w-px -translate-x-1/2 bg-text-faint"
              style={{ left: `${pos}%` }}
            />
          ) : (
            <span
              aria-hidden="true"
              className="absolute rounded-md bg-text/5"
              style={
                axis === 'x'
                  ? { left: `${pos - band / 2}%`, width: `${band}%`, top: 0, bottom: 0 }
                  : { top: `${pos - band / 2}%`, height: `${band}%`, left: 0, right: 0 }
              }
            />
          )}
          {marks.map((m) => {
            const at = m.at[active as number]
            return at === null || at === undefined ? null : (
              <span
                key={m.color + at}
                aria-hidden="true"
                className="absolute size-2.5 -translate-1/2 rounded-full bg-(--sk-mark-color) ring-2 ring-surface"
                style={{ left: `${pos}%`, top: `${at}%`, ['--sk-mark-color' as string]: m.color }}
              />
            )
          })}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 grid min-w-32 gap-1 rounded-sm border border-line bg-surface-2 px-2.5 py-2 text-xs whitespace-nowrap text-text-dim shadow-card"
            style={tipStyle}
          >
            <span className="font-semibold text-text">{tip.title}</span>
            {tip.rows.map((r) => (
              <span key={r.label} className="flex items-center gap-2">
                {r.color ? (
                  <span
                    className="size-2.5 shrink-0 rounded-[3px] bg-(--sk-mark-color)"
                    style={{ ['--sk-mark-color' as string]: r.color }}
                  />
                ) : null}
                {r.label}
                <span className="ml-auto pl-3 font-semibold text-text tabular-nums">{r.value}</span>
              </span>
            ))}
          </div>
        </>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {tip ? `${tip.title}: ${tip.rows.map((r) => `${r.label} ${r.value}`).join(', ')}` : ''}
      </span>
    </div>
  )
}
