import { describe, expect, it } from 'bun:test'
import { mulberry32 } from './random'

describe('mulberry32', () => {
  it('is reproducible: the same seed gives the same sequence', () => {
    const a = mulberry32(0x5ea5007)
    const b = mulberry32(0x5ea5007)
    const first = Array.from({ length: 5 }, a)
    expect(Array.from({ length: 5 }, b)).toEqual(first)
    expect(Array.from({ length: 5 }, mulberry32(1))).not.toEqual(first)
  })

  it('returns floats in [0, 1)', () => {
    const rand = mulberry32(42)
    const values = Array.from({ length: 2000 }, rand)
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true)
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    expect(mean).toBeGreaterThan(0.45)
    expect(mean).toBeLessThan(0.55)
  })
})
