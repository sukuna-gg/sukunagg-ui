/**
 * FlowField's simulation: pure math, no DOM, no canvas (docs/component-flow-field.md § 6).
 *
 * Particles ride the curl of a stream function built from seeded 2D gradient noise (two octaves
 * drifting apart over time), plus a gentle vortex and outward push around the stage's centre.
 * Each step moves every particle and buckets its segment by color group × alpha level, so the
 * renderer strokes 16 paths per frame instead of one per particle. Everything random comes from a
 * seeded mulberry32 stream, so a scene is reproducible in every browser, test and screenshot.
 */
import { mulberry32 } from '../../internal/random'

/** How many particles ride the field (see {@link particleCount}). */
export type FlowFieldDensity = 'low' | 'medium' | 'high'

/** The approved mockup's stage area (540 × 320 CSS px), where 'medium' is exactly 600 particles. */
const BASE_AREA = 540 * 320

/**
 * Per density: [particles at BASE_AREA, minimum, maximum].
 * DECISION(open): FlowField density clamps — 'medium' matches the mockup (600 on 540 × 320); the
 * area scaling and the clamps are agent-picked for full-screen stages (GPU headless Chromium, a
 * 1872 × 1032 stage at device-pixel-ratio 2 with the 1x trails store: 'medium' about 110 fps,
 * 'high' about 80 fps). docs/component-flow-field.md § 11.
 */
const DENSITY: Record<FlowFieldDensity, readonly [number, number, number]> = {
  low: [300, 80, 900],
  medium: [600, 160, 1800],
  high: [960, 240, 3000],
}

/** Particles on the approved stage ('medium' on 540 × 320): the cost a rebuild is budgeted at. */
const BASE_COUNT = 600

/**
 * How many steps a synchronous rebuild (the warm-up, the reduced-motion still frame) of `count`
 * particles splits `frames` 60 Hz frames into: one step per frame up to the approved stage's 600
 * particles, proportionally fewer and longer steps above, so a rebuild never costs more
 * particle-steps than it does there. A full-screen 'medium' field of 1800 particles covers the
 * same time in a third of the steps, three frames each (what a 20 fps display draws). Always at
 * least one step.
 */
export function rebuildSteps(count: number, frames: number): number {
  return Math.max(1, Math.min(frames, Math.floor((frames * BASE_COUNT) / count)))
}

/** The seed of the approved opening (mockup `mulberry32(0x5c0a37)`). */
export const FLOW_SEED = 0x5c0a37

/** Color groups, darkest first: accent-deep, the deep/accent mix, accent, premium sparks. */
export const GROUPS = 4
/** Stroke alpha per level (a particle's life × distance-from-centre brightness, quantized). */
export const LEVEL_ALPHA = [0.2, 0.42, 0.68, 0.92] as const
/** Stroke width (CSS px) per color group. */
export const GROUP_WIDTH = [1.5, 1.25, 1.05, 1.3] as const
/** Energy of a calm field (an active one is 1). */
export const CALM_ENERGY = 0.22

const FADE = 0.05 // trail fade per 60 Hz frame at full energy
const SPEED = 1.55 // CSS px per frame at full energy
const SCALE = 1 / 270 // noise units per CSS px
const EPS = 0.01 // finite-difference step for the curl
const VORTEX = 1.5
const OUTWARD = 0.14
const OPENING_TIME = 28 // the stream function opens in a streamy phase here
const MARGIN = 20 // CSS px a particle may leave the stage before it respawns

/**
 * The particle count for a `width × height` stage (CSS px): proportional to the area, so the field
 * looks equally dense at any size, and clamped so a full-screen stage stays affordable.
 */
export function particleCount(width: number, height: number, density: FlowFieldDensity): number {
  const [base, min, max] = DENSITY[density]
  return Math.max(min, Math.min(max, Math.round((base * width * height) / BASE_AREA)))
}

const Q = Math.SQRT1_2
const GX = [1, -1, 0, 0, Q, -Q, Q, -Q]
const GY = [0, 0, 1, -1, Q, Q, -Q, -Q]
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

/**
 * Seeded 2D gradient noise in about [-1, 1]: a permutation shuffled by `rand`, eight gradient
 * directions, quintic interpolation. Consumes 255 values from `rand`.
 */
export function gradientNoise(rand: () => number): (x: number, y: number) => number {
  const order = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const swap = order[i] ?? 0
    order[i] = order[j] ?? 0
    order[j] = swap
  }
  const perm = Uint8Array.from({ length: 512 }, (_, i) => order[i & 255] ?? 0)
  const at = (i: number) => perm[i] ?? 0
  const grad = (hash: number, x: number, y: number) => {
    const k = hash & 7
    return (GX[k] ?? 0) * x + (GY[k] ?? 0) * y
  }
  return (x, y) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = x - xi
    const yf = y - yi
    const cx = xi & 255
    const cy = yi & 255
    const u = fade(xf)
    const v = fade(yf)
    const a = at(cx) + cy
    const b = at(cx + 1) + cy
    const g00 = grad(at(a), xf, yf)
    const g10 = grad(at(b), xf - 1, yf)
    const g01 = grad(at(a + 1), xf, yf - 1)
    const g11 = grad(at(b + 1), xf - 1, yf - 1)
    const x1 = g00 + u * (g10 - g00)
    const x2 = g01 + u * (g11 - g01)
    return x1 + v * (x2 - x1)
  }
}

/** One particle. Positions are CSS px; `life`/`ttl` are 60 Hz frames. */
export interface FlowParticle {
  x: number
  y: number
  life: number
  ttl: number
  speed: number
  /** Color group, 0 (accent-deep) to 3 (premium spark). */
  group: number
}

/** A running flow: particles on a stage, stepped frame by frame. */
export interface Flow {
  /** The live particles (read-only for callers). */
  readonly particles: readonly FlowParticle[]
  /**
   * Segments from the last {@link Flow.step}, one flat `[x0, y0, x1, y1, …]` list per bucket
   * `group * 4 + level` (16 buckets).
   */
  readonly buckets: readonly (readonly number[])[]
  /** Current energy: 1 is an active field, {@link CALM_ENERGY} a calm one. Eases toward a target. */
  energy: number
  /** Fit the stage: rescale the particles to the new size, then match `count`. */
  resize(width: number, height: number, count: number): void
  /** Add (spawned mid-life) or drop particles to reach `count`. */
  setCount(count: number): void
  /**
   * Advance `dt` 60 Hz frames, easing the energy toward `target`. Fills {@link Flow.buckets} and
   * returns the alpha of the stage-colored fill that fades the previous trails.
   */
  step(dt: number, target: number): number
}

/**
 * Create a flow from `seed`. Two flows from the same seed, resized and stepped the same way, are
 * identical (the reduced-motion still frame relies on it).
 */
export function createFlow(seed: number): Flow {
  const rand = mulberry32(seed)
  const noise = gradientNoise(rand)
  const stream = (u: number, v: number, t: number) =>
    noise(u + t * 0.045, v - t * 0.03) +
    0.3 * noise(u * 1.6 - t * 0.06 + 37.1, v * 1.6 + t * 0.05 + 11.9)
  const particles: FlowParticle[] = []
  const buckets: number[][] = Array.from({ length: GROUPS * LEVEL_ALPHA.length }, () => [])
  let width = 0
  let height = 0
  let time = OPENING_TIME

  const spawn = (p: FlowParticle, midLife: boolean): FlowParticle => {
    p.x = rand() * width
    p.y = rand() * height
    p.ttl = 140 + rand() * 240
    p.life = midLife ? rand() * p.ttl : 0
    p.speed = 0.75 + rand() * 0.6
    const r = rand()
    p.group = r < 0.05 ? 3 : r < 0.35 ? 2 : r < 0.68 ? 1 : 0
    return p
  }

  const flow: Flow = {
    particles,
    buckets,
    energy: 1,
    resize(w, h, count) {
      if (width && height) {
        const sx = w / width
        const sy = h / height
        for (const p of particles) {
          p.x *= sx
          p.y *= sy
        }
      }
      width = w
      height = h
      flow.setCount(count)
    },
    setCount(count) {
      if (particles.length > count) particles.length = count
      while (particles.length < count) {
        particles.push(spawn({ x: 0, y: 0, life: 0, ttl: 1, speed: 1, group: 0 }, true))
      }
    },
    step(dt, target) {
      for (const bucket of buckets) bucket.length = 0
      flow.energy += (target - flow.energy) * (1 - Math.exp(-dt / 40))
      const e = flow.energy
      const alpha = 1 - (1 - FADE * (0.45 + 0.55 * e)) ** dt
      time += (dt / 60) * (0.35 + 0.65 * e)
      const t = time
      const travel = SPEED * (0.2 + 0.8 * e) * dt
      const brightness = 0.4 + 0.6 * e
      const cx = width / 2
      const cy = height / 2
      const r2 = (width * width + height * height) / 4
      const r = Math.sqrt(r2)
      const rx = 1 / (width * 0.3)
      const ry = 1 / (height * 0.27)
      for (const p of particles) {
        const { x, y } = p
        const u = x * SCALE
        const v = y * SCALE
        const s0 = stream(u, v, t)
        // Velocity = the curl of the stream function, normalized (soft) so it never stalls.
        let vx = (stream(u, v + EPS, t) - s0) / EPS
        let vy = -(stream(u + EPS, v, t) - s0) / EPS
        const k = 1 / (Math.hypot(vx, vy) + 0.4)
        vx *= k
        vy *= k
        const dx = x - cx
        const dy = y - cy
        const swirl = (VORTEX * Math.exp(-(dx * dx + dy * dy) / r2)) / r
        const push = OUTWARD / r
        vx += dx * push - dy * swirl
        vy += dy * push + dx * swirl
        const nx = x + vx * travel * p.speed
        const ny = y + vy * travel * p.speed
        p.life += dt
        // Fade in and out over the life; dim inside the centre ellipse, where content sits.
        const qx = dx * rx
        const qy = dy * ry
        const a =
          Math.sin(Math.PI * Math.min(1, p.life / p.ttl)) *
          Math.min(1, 0.12 + 0.88 * (qx * qx + qy * qy)) *
          brightness
        if (a > 0.05) {
          buckets[p.group * 4 + Math.min(3, Math.floor(a * 4))]?.push(x, y, nx, ny)
        }
        p.x = nx
        p.y = ny
        const out = nx < -MARGIN || nx > width + MARGIN || ny < -MARGIN || ny > height + MARGIN
        if (p.life >= p.ttl || out) spawn(p, false)
      }
      return alpha
    },
  }
  return flow
}
