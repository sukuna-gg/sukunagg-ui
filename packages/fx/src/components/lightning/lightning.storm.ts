import { mulberry32 } from '../../internal/random'

/** How often and how hard the bolt strikes. */
export type LightningIntensity = 'calm' | 'normal' | 'storm'

/**
 * The shader inputs for one frame (the uniforms of `lightning.shaders.ts`).
 * - `T`: noise time, the route's crawl. `S`: route seed (which bolt). `I`: bolt intensity.
 * - `B`: branch intensity (0 = no branch). `F`: flash (sky and haze boost).
 * - `Q`: branch geometry `[fork height, length, side]` (side -1 = left, 1 = right).
 */
export interface StormFrame {
  T: number
  S: number
  I: number
  B: number
  F: number
  Q: [number, number, number]
}

/**
 * The frozen frame: the route the server-rendered SVG poster was traced from (same maths, float32),
 * so the poster, the reduced-motion still frame and the first live frame line up.
 */
export const FROZEN: Readonly<StormFrame> = Object.freeze({
  T: 12.4,
  S: 41.3,
  I: 0.92,
  B: 1,
  F: 0,
  Q: [0.1, 0.3, -1] as [number, number, number],
})

interface Preset {
  /** Shortest wait between two strikes, in seconds. */
  gap: number
  /** Random extra wait on top of `gap` (0 – spread s). */
  spread: number
  /** Resting bolt intensity between strikes. */
  base: number
  /** Extra intensity at the strike's peak. */
  attack: number
  /** Strength of the echo pulse 150 ms after the strike (relative to the strike). */
  echo: number
  /** Chance that a strike forks a branch. */
  branch: number
}

/** Seconds between a strike and its echo pulse. */
export const ECHO_AT = 0.15

// DECISION(open): intensity presets are proposals (normal = the approved mockup), tunable as a
// patch pre-1.0. Every `gap` stays >= 1.0 s: with one echo per strike that is at most three
// flashes in any one-second window (WCAG 2.3.1), so never lower a gap below 1.0.
export const PRESETS: Readonly<Record<LightningIntensity, Readonly<Preset>>> = {
  calm: { gap: 2.6, spread: 2.4, base: 0.72, attack: 0.3, echo: 0.5, branch: 0.5 },
  normal: { gap: 1.2, spread: 1.5, base: 0.8, attack: 0.45, echo: 0.8, branch: 0.7 },
  storm: { gap: 1, spread: 0.7, base: 0.86, attack: 0.55, echo: 0.9, branch: 0.85 },
}

/** Noise time wraps after this many seconds, keeping the shader's float inputs small. */
export const WRAP = 240

/** What {@link createStorm} returns. */
export interface Storm {
  /** Advance by `dt` seconds (0 = repaint the current frame) and return the frame to draw. */
  advance(dt: number, intensity: LightningIntensity): Readonly<StormFrame>
  /** The reduced-motion still frame: the frozen route, lit. The strike schedule is kept. */
  still(): Readonly<StormFrame>
  /** Seconds of storm time so far, and when the last strike hit (for tests and debugging). */
  readonly time: number
  readonly hit: number
}

/**
 * A seeded storm: when the bolt strikes, where it goes next, and how bright each frame is. Pure
 * (no DOM, no clock): the renderer feeds it the loop's `dt`, so the same seed replays the same
 * storm in every browser, test and screenshot.
 *
 * Until the first strike every frame is the frozen one, so the canvas takes over from the poster
 * without a jump. The first strike happens on the first advancing frame and keeps the frozen route;
 * later strikes re-route.
 */
export function createStorm(seed: number): Storm {
  const rand = mulberry32(seed)
  const frame: StormFrame = { ...FROZEN, Q: [...FROZEN.Q] }
  let time = 0
  let hit = -9 // long ago: no flash before the first strike
  let next = 0
  let first = true
  let branch = true

  const pulse = (since: number, rate: number, echo: number) =>
    Math.exp(-since * rate) + (since > ECHO_AT ? echo * Math.exp((ECHO_AT - since) * rate) : 0)

  return {
    get time() {
      return time
    },
    get hit() {
      return hit
    },
    advance(dt, intensity) {
      const p = PRESETS[intensity]
      time += dt
      if (dt > 0 && time >= next) {
        if (!first) {
          // k / 97 is never FROZEN.S (41.3): the renderer reads `S === FROZEN.S` as "frozen route".
          frame.S = Math.floor(rand() * 9000) / 97
          frame.Q = [rand() * 0.34 - 0.1, 0.2 + rand() * 0.14, rand() < 0.6 ? -1 : 1]
          branch = rand() < p.branch
        }
        first = false
        hit = time
        next = time + p.gap + rand() * p.spread
      }
      if (first) return frame // nothing has struck yet: hold the frozen frame (the poster's bolt)
      const since = time - hit
      frame.T = FROZEN.T + (time % WRAP)
      frame.I =
        p.base +
        p.attack * pulse(since, 14, p.echo) +
        0.05 * Math.sin(time * 6.1) * Math.sin(time * 2.3 + 1)
      frame.F = pulse(since, 20, 0.75 * p.echo)
      frame.B = branch ? Math.max(0, 1 - since / 0.7) : 0
      return frame
    },
    still() {
      Object.assign(frame, FROZEN, { Q: [...FROZEN.Q] })
      return frame
    },
  }
}
