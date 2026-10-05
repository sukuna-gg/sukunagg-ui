/**
 * SVG path builders for line and area marks, in the 0–100 viewBox the charts stretch with CSS.
 * `null` points break the path (missing data is never drawn as a value). `monotone` follows d3's
 * `curveMonotoneX` (Fritsch–Carlson tangents), which never overshoots the data.
 */

export interface Pt {
  x: number
  y: number
}

/** Splits points at `null` into runs of consecutive known points, keeping their indices. */
export function runs(points: readonly (Pt | null)[]): { start: number; pts: Pt[] }[] {
  const out: { start: number; pts: Pt[] }[] = []
  let cur: Pt[] = []
  let start = 0
  points.forEach((p, i) => {
    if (p === null) {
      if (cur.length) out.push({ start, pts: cur })
      cur = []
    } else {
      if (!cur.length) start = i
      cur.push(p)
    }
  })
  if (cur.length) out.push({ start, pts: cur })
  return out
}

const f = (n: number): string => (Math.round(n * 100) / 100).toString()

const sign = (x: number): number => (x < 0 ? -1 : 1)

/**
 * d3 `slope3`: the tangent at `b` that keeps the curve monotone between `a` and `c`. Chart x
 * positions are strictly increasing, so the step widths are never 0 (d3's zero guards dropped).
 */
function slope3(a: Pt, b: Pt, c: Pt): number {
  const h0 = b.x - a.x
  const h1 = c.x - b.x
  const s0 = (b.y - a.y) / h0
  const s1 = (c.y - b.y) / h1
  const p = (s0 * h1 + s1 * h0) / (h0 + h1)
  return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0
}

/** d3 `slope2`: an end tangent from the neighbouring tangent `t`. */
function slope2(a: Pt, b: Pt, t: number): number {
  return ((3 * (b.y - a.y)) / (b.x - a.x) - t) / 2
}

/** Path commands for one run (without the leading move-to). */
function segment(pts: Pt[], curve: 'linear' | 'monotone'): string {
  if (curve === 'linear' || pts.length < 3)
    return pts
      .slice(1)
      .map((p) => `L${f(p.x)},${f(p.y)}`)
      .join('')
  const n = pts.length
  const m: number[] = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) m[i] = slope3(pts[i - 1] as Pt, pts[i] as Pt, pts[i + 1] as Pt)
  m[0] = slope2(pts[0] as Pt, pts[1] as Pt, m[1] as number)
  m[n - 1] = slope2(pts[n - 2] as Pt, pts[n - 1] as Pt, m[n - 2] as number)
  let d = ''
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i] as Pt
    const b = pts[i + 1] as Pt
    const dx = (b.x - a.x) / 3
    d += `C${f(a.x + dx)},${f(a.y + dx * (m[i] as number))},${f(b.x - dx)},${f(b.y - dx * (m[i + 1] as number))},${f(b.x)},${f(b.y)}`
  }
  return d
}

/** The line through each run of ≥ 2 points; a lone point between gaps has no path (it gets a dot). */
export function linePath(
  points: readonly (Pt | null)[],
  curve: 'linear' | 'monotone' = 'linear',
): string {
  return runs(points)
    .filter((r) => r.pts.length > 1)
    .map((r) => `M${f((r.pts[0] as Pt).x)},${f((r.pts[0] as Pt).y)}${segment(r.pts, curve)}`)
    .join('')
}

/** The fill under (or over) each run, closed along the horizontal line `baseY`. */
export function areaPath(
  points: readonly (Pt | null)[],
  baseY: number,
  curve: 'linear' | 'monotone' = 'linear',
): string {
  return runs(points)
    .filter((r) => r.pts.length > 1)
    .map((r) => {
      const first = r.pts[0] as Pt
      const last = r.pts[r.pts.length - 1] as Pt
      return `M${f(first.x)},${f(baseY)}L${f(first.x)},${f(first.y)}${segment(r.pts, curve)}L${f(last.x)},${f(baseY)}Z`
    })
    .join('')
}
