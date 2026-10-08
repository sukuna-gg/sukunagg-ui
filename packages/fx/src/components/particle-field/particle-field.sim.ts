import type { Rgb } from '../../internal/color'

/*
 * ParticleField's ember simulation, ported from the approved mockup
 * (fx-mockups/parts/particle-field.html). Pure math: no DOM, no canvas, no hooks, so it is unit
 * tested on its own and the canvas glue in particle-field.canvas.tsx stays thin. Every random
 * number comes from the field's seeded `rand` (mulberry32), in the mockup's call order, so a seed
 * always gives the same scene.
 */

/** How many embers rise: `'low'` ≈ ½, `'high'` ≈ 1.6× the default count. */
export type ParticleFieldDensity = 'low' | 'medium' | 'high'

/** The ember palette: crimson (`'accent'`) or amber/bone (`'premium'`). */
export type ParticleFieldTone = 'accent' | 'premium'

const TAU = Math.PI * 2
const WHITE: Rgb = [255, 255, 255]

/** Clamp to `[0, 1]`. */
export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

// DECISION(open): density multipliers over the mockup's area-scaled count
// (docs/component-particle-field.md §11).
const DENSITY: Record<ParticleFieldDensity, number> = { low: 0.5, medium: 1, high: 1.6 }

/**
 * How many embers a `width`×`height` stage (CSS px) holds: 140 below 500 px wide, else scaled by
 * area and clamped to 140–260, then multiplied by the density.
 */
export function emberCount(width: number, height: number, density: ParticleFieldDensity): number {
  const base =
    width < 500 ? 140 : Math.min(260, Math.max(140, 140 + (width * height - 140_000) / 2333))
  return Math.round(Math.round(base) * DENSITY[density])
}

/** The stage the embers live in. `layoutEmbers` keeps `width`/`height` current. */
export interface Field {
  /** Stage width in CSS px (0 until the first layout). */
  width: number
  /** Stage height in CSS px (0 until the first layout). */
  height: number
  /** Right-to-left (`dir="rtl"`): the plume mirrors to the left side. */
  rtl: boolean
  /** Seeded generator, `[0, 1)`. */
  rand: () => number
}

/** One ember. Kind fields are rolled once per slot; the path fields re-roll on every respawn. */
export interface Ember {
  /** Depth: 0 far … 1 near (parallax, size, out-of-focus blur). */
  z: number
  /** A fast, bright spark (~8%). */
  spark: boolean
  /** A slow, swelling flare (~4%). */
  flare: boolean
  /** Core size in CSS px. */
  size: number
  /** Peak opacity. */
  alpha: number
  /** Rise speed at the bottom, px/s. */
  speed: number
  /** Sideways sway amplitude, px. */
  amp: number
  /** Sway frequency, Hz. */
  freq: number
  /** Twinkle frequency, Hz. */
  twinkle: number
  /** Flare swell frequency, Hz. */
  swell: number
  /** Phase offset, radians. */
  phase: number
  /** Sideways drift, px/s. */
  drift: number
  /** Heat multiplier: how hot (bone-white) it burns while low. */
  heatBias: number
  /** The height (px from the top) where it burns out. */
  ceil: number
  /** Position, CSS px. */
  x: number
  /** Position, CSS px. */
  y: number
}

/**
 * A spawn x: half the embers gather in the plume (70% across, 62% on narrow stages, mirrored
 * under RTL), the rest anywhere.
 */
export function plumeX({ width: w, rtl, rand }: Field): number {
  let x =
    rand() < 0.5
      ? w * (w < 500 ? 0.62 : 0.7) + (rand() + rand() + rand() - 1.5) * w * 0.24
      : rand() * w
  if (x < 0 || x > w) x = rand() * w
  return rtl ? w - x : x
}

/** Roll a new path: below the stage (`respawn`), or anywhere up the plume (first layout). */
function launch(p: Ember, f: Field, respawn: boolean): Ember {
  const { height: h, rand } = f
  p.phase = rand() * TAU
  p.drift = (rand() - 0.45) * 7
  p.heatBias = 0.75 + rand() * 0.45 + (p.flare ? 0.3 : 0)
  // ~40% sputter out in the haze, so the plume visibly rises out of it.
  p.ceil = !p.flare && rand() < 0.4 ? h * (0.5 + rand() * 0.38) : h * rand() * rand() * 0.6
  p.x = plumeX(f)
  p.y = respawn ? h + 12 + rand() * 40 : h - (h - p.ceil) * rand() ** 1.3
  return p
}

/** A new ember somewhere up the plume of `f`. */
export function createEmber(f: Field): Ember {
  const { rand } = f
  const r = rand()
  const spark = r < 0.08
  const flare = !spark && r < 0.12
  const z = flare ? 0.55 + rand() * 0.3 : rand() ** 1.15
  const size = flare ? 4 + rand() : spark ? 0.9 + z * 1.7 : 0.6 + z * z * 2.6
  const alpha = flare ? 0.9 : spark ? 0.75 + z / 4 : 0.4 + z * 0.6
  const speed = (spark ? 38 : 11) + z * (spark ? 64 : 38) + rand() * 9
  const amp = (3 + rand() * 11) * (0.4 + z)
  const freq = 0.12 + rand() * 0.4
  const twinkle = 0.3 + rand() * 0.9
  const swell = 0.2 + rand() * 0.15
  const ember: Ember = {
    z,
    spark,
    flare,
    size,
    alpha,
    speed,
    amp,
    freq,
    twinkle,
    swell,
    phase: 0,
    drift: 0,
    heatBias: 0,
    ceil: 0,
    x: 0,
    y: 0,
  }
  return launch(ember, f, false)
}

/**
 * Fit `embers` to a `width`×`height` stage: rescale the existing ones to the new size, then add
 * or drop embers to reach `count`. Updates `f.width`/`f.height`.
 */
export function layoutEmbers(
  embers: Ember[],
  f: Field,
  width: number,
  height: number,
  count: number,
): void {
  if (f.width && f.height) {
    const sx = width / f.width
    const sy = height / f.height
    for (const p of embers) {
      p.x *= sx
      p.y *= sy
      p.ceil *= sy
    }
  }
  f.width = width
  f.height = height
  while (embers.length < count) embers.push(createEmber(f))
  embers.length = count
}

/** Where and how to draw one ember this frame (filled in place by {@link stepEmber}). */
export interface Pose {
  /** Rotation (along the ember's velocity) as cos/sin. */
  cos: number
  /** Rotation (along the ember's velocity) as cos/sin. */
  sin: number
  /** Centre, CSS px. */
  x: number
  /** Centre, CSS px. */
  y: number
  /** Sprite width, CSS px. */
  width: number
  /** Sprite height (stretched along the motion), CSS px. */
  height: number
  /** Sprite index: 0 burn-out … 4 just lit, 5 spark, 6 out of focus. */
  sprite: number
  /** Opacity of sprite `sprite`. */
  alpha: number
  /** Opacity of sprite `sprite + 1`, crossfaded along the heat ramp (0 = don't draw it). */
  next: number
}

/** An empty {@link Pose} to reuse across frames. */
export const createPose = (): Pose => ({
  cos: 1,
  sin: 0,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  sprite: 0,
  alpha: 0,
  next: 0,
})

/**
 * Advance ember `p` by `dt` seconds (none when 0) at animated time `time`, then pose it in `out`.
 * Embers slow, cool, dim and shrink as they rise; the nearest are big, soft and round, the rest
 * streak along their velocity. `px`/`py` (-1…1) is the eased pointer, for parallax.
 *
 * @returns `false` when there is nothing to draw: it burnt out and respawned, or it is too faint.
 */
export function stepEmber(
  p: Ember,
  f: Field,
  time: number,
  dt: number,
  px: number,
  py: number,
  out: Pose,
): boolean {
  const { width: w, height: h } = f
  // raw: 1 at the bottom … 0 at burn-out.
  const raw = clamp01((p.y - p.ceil) / (h - p.ceil))
  const vy = p.speed * (0.7 + raw / 2)
  const ph = time * p.freq * TAU + p.phase
  if (dt) {
    p.y -= vy * dt
    p.x += p.drift * dt
    if (p.y < p.ceil - 2 || p.x < -40 || p.x > w + 40) {
      launch(p, f, true)
      return false
    }
  }
  const depth = p.z * p.z
  const heat = clamp01(Math.sqrt(raw) * p.heatBias)
  let a =
    p.alpha *
    clamp01((p.y - p.ceil) / Math.min(h * 0.2, (h - p.ceil) * 0.6)) *
    clamp01((h + 6 - p.y) / 24) *
    (0.84 + 0.16 * Math.sin(time * p.twinkle * TAU + p.phase)) *
    (0.45 + 0.55 * heat)
  if (p.flare) a *= 0.7 + 0.3 * Math.sin(time * p.swell * TAU + p.phase)
  if (a < 0.012) return false
  const blur = !p.spark && !p.flare && p.z > 0.92
  const s = p.size * (blur ? 16 : 8 + 5 * heat)
  const r = blur ? 0 : Math.atan2(p.drift + Math.cos(ph) * p.amp * p.freq * TAU * 0.6, vy)
  const k = blur ? 6 : p.spark ? 5 : Math.min(3, Math.floor(heat * 4))
  const fade = blur || p.spark ? 0 : heat * 4 - k
  out.cos = Math.cos(r)
  out.sin = Math.sin(r)
  out.x =
    p.x +
    Math.sin(ph) * p.amp +
    (p.spark ? Math.sin(time * 4.7 + p.phase * 3) * 1.8 : 0) -
    px * depth * 28
  out.y = p.y - py * depth * 14
  out.width = s
  out.height = blur ? s : s * (1 + (p.flare ? 0.3 : 0.85) * heat * Math.min(1, vy / 40))
  out.sprite = k
  out.alpha = (blur ? 0.45 : 1) * a * (1 - fade)
  out.next = fade > 0.02 ? a * fade : 0
  return true
}

/** The four token colors the canvas reads (dark values: the stage pins `data-theme="dark"`). */
export interface EmberTokens {
  /** `--sk-accent`. */
  accent: Rgb
  /** `--sk-accent-deep`. */
  deep: Rgb
  /** `--sk-premium`. */
  premium: Rgb
  /** `--sk-chart-4` (amber). */
  gold: Rgb
}

/** One glow sprite: `color` with a `core` that is `hot` (0…1) white-hot, fading to `halo`. */
export interface SpriteSpec {
  /** Body color. */
  color: Rgb
  /** How far the core blends toward `core`; `< 0` draws a soft, out-of-focus disc. */
  hot: number
  /** Core color. */
  core: Rgb
  /** Outer glow color. */
  halo: Rgb
}

/** Mix `a` toward `b` by `k` (0…1). */
export const mix = (a: Rgb, b: Rgb, k: number): Rgb =>
  a.map((v, i) => Math.round(v + ((b[i] ?? v) - v) * k)) as Rgb

/** Scale `c` to luminance `y` (0…255), so a token reads equally bright on the dark stage. */
export const lum = (c: Rgb, y: number): Rgb => {
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] || 1
  return c.map((v) => Math.min(255, Math.round((v * y) / l))) as Rgb
}

const spec = (color: Rgb, hot: number, core: Rgb = WHITE, halo: Rgb = color): SpriteSpec => ({
  color,
  hot,
  core,
  halo,
})

/**
 * The seven sprites, indexed like {@link Pose.sprite}: 0 burn-out … 4 just lit (bone core),
 * 5 spark, 6 out of focus.
 */
export function emberPalette(t: EmberTokens, tone: ParticleFieldTone): SpriteSpec[] {
  const premium = lum(t.premium, 215)
  const gold = lum(t.gold, 150)
  const bone = mix(premium, WHITE, 0.5)
  if (tone === 'premium') {
    const ash = lum(t.gold, 60)
    return [
      spec(ash, 0.2),
      spec(mix(ash, gold, 0.5), 0.35),
      spec(gold, 0.55),
      spec(gold, 0.85, bone),
      spec(mix(gold, premium, 0.4), 1, bone),
      spec(premium, 1, WHITE, gold),
      spec(gold, -1),
    ]
  }
  return [
    spec(t.deep, 0.2),
    spec(mix(t.accent, t.deep, 0.5), 0.35),
    spec(t.accent, 0.55),
    spec(t.accent, 0.85, bone),
    spec(mix(t.accent, premium, 0.2), 1, bone),
    spec(mix(premium, gold, 0.25), 1, bone, mix(premium, gold, 0.45)),
    spec(t.accent, -1),
  ]
}

/** A sprite's radial gradient as `[offset, color, alpha]` stops, centre outward. */
export function spriteStops({ color, hot, core, halo }: SpriteSpec): [number, Rgb, number][] {
  if (hot < 0) {
    return [
      [0, color, 0.55],
      [0.35, color, 0.4],
      [0.62, color, 0.12],
      [1, color, 0],
    ]
  }
  return [
    [0, mix(color, core, hot), 1],
    [0.14, mix(color, core, hot / 2), 1],
    [0.26, color, 0.75],
    [0.45, halo, 0.2],
    [0.72, halo, 0.05],
    [1, halo, 0],
  ]
}
