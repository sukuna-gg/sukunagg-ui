/**
 * A seeded pseudo-random generator (mulberry32) returning floats in `[0, 1)`.
 *
 * Effects use it instead of `Math.random` so a scene is reproducible: the same seed gives the same
 * particles in every browser, in tests and in screenshots, and anything computed during render
 * matches between server and client (no hydration mismatch).
 *
 * @example
 * ```ts
 * const rand = mulberry32(0x5ea5007)
 * const x = rand() * width
 * ```
 */
export function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
