/**
 * Scale math for the charts — the parts of d3 we need, in-house.
 *
 * Why not `d3-scale`: the per-file build (`bundle: false`, needed so `'use client'` stays on its
 * own file) can't inline dependencies, and d3 ships ESM only, so the CommonJS output would
 * `require()` an ES module — which Node 18 (still supported) can't do. These helpers follow d3's
 * algorithms (d3-array `tickIncrement`, d3-scale `nice`) so ticks come out the same. See D37.
 */

const E10 = Math.sqrt(50)
const E5 = Math.sqrt(10)
const E2 = Math.sqrt(2)

/** d3's tick step: a 1/2/5 × 10ⁿ step giving about `count` ticks across [start, stop]. */
export function tickStep(start: number, stop: number, count: number): number {
  const step0 = Math.abs(stop - start) / Math.max(1, count)
  let step1 = 10 ** Math.floor(Math.log10(step0))
  const error = step0 / step1
  if (error >= E10) step1 *= 10
  else if (error >= E5) step1 *= 5
  else if (error >= E2) step1 *= 2
  return stop < start ? -step1 : step1
}

/** Removes float noise from a multiple of a step (0.30000000000000004 → 0.3). */
const clean = (v: number): number => Number.parseFloat(v.toPrecision(12))

/**
 * Extends [lo, hi] outward to round tick values (d3-scale `nice`). An empty range is first widened
 * by 10% so there is something to draw: [5, 5] → [4.4, 5.6], [0, 0] → [0, 1].
 */
export function niceDomain(lo: number, hi: number, count = 4): [number, number] {
  let a = Math.min(lo, hi)
  let b = Math.max(lo, hi)
  if (a === b) {
    if (a === 0) return [0, 1]
    const pad = Math.abs(a) * 0.1 || 1
    a -= pad
    b += pad
  }
  let prev = 0
  for (let i = 0; i < 10; i++) {
    const step = tickStep(a, b, count)
    if (step === prev) break
    a = clean(Math.floor(a / step) * step)
    b = clean(Math.ceil(b / step) * step)
    prev = step
  }
  return [a, b]
}

/** Round tick values inside [lo, hi], about `count` of them. */
export function ticks(lo: number, hi: number, count = 4): number[] {
  if (lo === hi) return [lo]
  const step = tickStep(lo, hi, count)
  const out: number[] = []
  for (let i = Math.ceil(lo / step); i <= Math.floor(hi / step); i++) out.push(clean(i * step))
  return out
}

/**
 * A linear map from [d0, d1] to a percentage 0–100, rounded to 3 decimals (no float noise like
 * `94.39999999999999%` in the markup). Values outside the domain are not clamped.
 */
export function percent(d0: number, d1: number): (v: number) => number {
  const span = d1 - d0
  return (v) => (span === 0 ? 50 : Math.round(((v - d0) / span) * 100000) / 1000)
}

/** Rounds a position to 3 decimals, like `percent`, so markup carries no float noise. */
const r3 = (n: number): number => Math.round(n * 1000) / 1000

/** Centre (0–100) of band `i` of `n` equal bands. */
export const bandCenter = (i: number, n: number): number => r3(((i + 0.5) / n) * 100)

/** Left edge (0–100) of band `i` of `n`. */
export const bandStart = (i: number, n: number): number => r3((i / n) * 100)

/** x position (0–100) of point `i` of `n` on an ordinal line axis; one point sits in the middle. */
export const pointX = (i: number, n: number): number => (n <= 1 ? 50 : r3((i / (n - 1)) * 100))
