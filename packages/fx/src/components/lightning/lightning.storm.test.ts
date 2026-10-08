import { describe, expect, it } from 'bun:test'
import {
  createStorm,
  ECHO_AT,
  FROZEN,
  type LightningIntensity,
  PRESETS,
  type StormFrame,
  WRAP,
} from './lightning.storm'

const INTENSITIES = ['calm', 'normal', 'storm'] as const satisfies readonly LightningIntensity[]
const snapshot = (f: Readonly<StormFrame>) => ({ ...f, Q: [...f.Q] })

/** Run `seconds` of storm at 60 fps and return every flash time (strikes and their echoes). */
function flashes(intensity: LightningIntensity, seconds: number): number[] {
  const storm = createStorm(0x5c0a)
  const times: number[] = []
  let last = storm.hit
  for (let t = 0; t < seconds; t += 1 / 60) {
    storm.advance(1 / 60, intensity)
    if (storm.hit !== last) {
      last = storm.hit
      times.push(storm.hit, storm.hit + ECHO_AT)
    }
  }
  return times.sort((a, b) => a - b)
}

describe('createStorm', () => {
  it('holds the frozen frame until the first strike, and dt = 0 never advances', () => {
    const storm = createStorm(1)
    expect(snapshot(storm.advance(0, 'normal'))).toEqual(snapshot(FROZEN))
    expect(snapshot(storm.advance(0, 'storm'))).toEqual(snapshot(FROZEN))
    expect(storm.time).toBe(0)
    expect(storm.hit).toBeLessThan(0) // no strike yet
  })

  it('keeps the poster route on the first strike and re-routes on later ones', () => {
    const storm = createStorm(1)
    storm.advance(1 / 60, 'storm')
    expect(storm.hit).toBeCloseTo(1 / 60)
    expect(storm.advance(0, 'storm').S).toBe(FROZEN.S)
    const first = storm.hit
    let frame = storm.advance(0, 'storm')
    while (storm.hit === first) frame = storm.advance(1 / 60, 'storm')
    expect(frame.S).not.toBe(FROZEN.S)
    expect([-1, 1]).toContain(frame.Q[2])
    expect(frame.Q[1]).toBeGreaterThanOrEqual(0.2)
  })

  it('flashes at the strike and again at the echo, then settles', () => {
    const storm = createStorm(1)
    const peak = storm.advance(1 / 60, 'normal').I
    const dip = storm.advance(0.1, 'normal').I
    const echo = storm.advance(ECHO_AT - 0.1 + 1 / 60, 'normal').I
    const rest = storm.advance(0.5, 'normal')
    expect(peak).toBeGreaterThan(dip)
    expect(echo).toBeGreaterThan(dip)
    expect(rest.I).toBeLessThan(echo)
    expect(rest.F).toBeLessThan(0.05)
  })

  it('never puts more than three flashes in any one-second window (WCAG 2.3.1)', () => {
    for (const intensity of INTENSITIES) {
      const times = flashes(intensity, 600)
      expect(times.length).toBeGreaterThan(100)
      let worst = 0
      for (const [i, start] of times.entries())
        worst = Math.max(worst, times.slice(i).filter((t) => t < start + 1).length)
      expect(worst).toBeLessThanOrEqual(3)
      expect(PRESETS[intensity].gap).toBeGreaterThanOrEqual(1)
    }
  })

  it('strikes more often as the intensity rises', () => {
    const counts = INTENSITIES.map((intensity) => flashes(intensity, 300).length)
    expect(counts[0]).toBeLessThan(counts[1] as number)
    expect(counts[1]).toBeLessThan(counts[2] as number)
  })

  it('returns the frozen, lit frame for reduced motion, keeping the schedule', () => {
    const storm = createStorm(1)
    for (let i = 0; i < 400; i++) storm.advance(1 / 60, 'storm')
    const hit = storm.hit
    expect(snapshot(storm.still())).toEqual(snapshot(FROZEN))
    expect(storm.hit).toBe(hit)
  })

  it('wraps the noise time so the shader inputs stay small', () => {
    const storm = createStorm(1)
    storm.advance(WRAP + 1, 'calm')
    expect(storm.advance(0, 'calm').T).toBeCloseTo(FROZEN.T + 1)
  })

  it('drops the branch on strikes that roll no fork', () => {
    const storm = createStorm(7)
    const branches = new Set<number>()
    for (let i = 0; i < 60 * 120; i++) {
      const frame = storm.advance(1 / 60, 'calm')
      if (storm.time - storm.hit < 0.05) branches.add(frame.B > 0 ? 1 : 0)
    }
    expect([...branches].sort()).toEqual([0, 1])
  })
})
