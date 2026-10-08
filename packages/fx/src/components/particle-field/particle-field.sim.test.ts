import { describe, expect, it } from 'bun:test'
import { mulberry32 } from '../../internal/random'
import {
  clamp01,
  createEmber,
  createPose,
  type Ember,
  emberCount,
  emberPalette,
  type Field,
  layoutEmbers,
  lum,
  mix,
  plumeX,
  spriteStops,
  stepEmber,
} from './particle-field.sim'

/** A generator that replays `values` in order (then repeats them). */
const script =
  (...values: number[]) =>
  () => {
    const v = values.shift() ?? 0.5
    values.push(v)
    return v
  }

const field = (width: number, height: number, rand = mulberry32(1), rtl = false): Field => ({
  width,
  height,
  rtl,
  rand,
})

const ember = (over: Partial<Ember> = {}): Ember => ({
  z: 0.5,
  spark: false,
  flare: false,
  size: 1,
  alpha: 1,
  speed: 30,
  amp: 4,
  freq: 0.3,
  twinkle: 0.5,
  swell: 0.25,
  phase: 0,
  drift: 0,
  heatBias: 1,
  ceil: 0,
  x: 500,
  y: 300,
  ...over,
})

const tokens = {
  accent: [255, 59, 78] as [number, number, number],
  deep: [176, 18, 33] as [number, number, number],
  premium: [232, 220, 196] as [number, number, number],
  gold: [201, 128, 0] as [number, number, number],
}

describe('clamp01, mix, lum', () => {
  it('clamps to [0, 1]', () => {
    expect([clamp01(-1), clamp01(0.4), clamp01(3)]).toEqual([0, 0.4, 1])
  })

  it('mixes two colors', () => {
    expect(mix([0, 0, 0], [255, 255, 255], 0.5)).toEqual([128, 128, 128])
    expect(mix([10, 20, 30], [90, 80, 70], 0)).toEqual([10, 20, 30])
  })

  it('scales a color to a luminance, capped at 255, and leaves black alone', () => {
    const grey = lum([100, 100, 100], 200)
    expect(grey).toEqual([200, 200, 200])
    expect(lum([200, 255, 200], 400)).toEqual([255, 255, 255])
    expect(lum([0, 0, 0], 120)).toEqual([0, 0, 0])
  })
})

describe('emberCount', () => {
  it('holds 140 embers on a narrow stage, scaled by density', () => {
    expect(emberCount(300, 150, 'medium')).toBe(140)
    expect(emberCount(300, 150, 'low')).toBe(70)
    expect(emberCount(300, 150, 'high')).toBe(224)
  })

  it('scales with area on wide stages, clamped to 140–260', () => {
    expect(emberCount(1100, 380, 'medium')).toBe(259) // the mockup's stage
    expect(emberCount(600, 200, 'medium')).toBe(140)
    expect(emberCount(2400, 1200, 'medium')).toBe(260)
    expect(emberCount(2400, 1200, 'high')).toBe(416)
  })
})

describe('plumeX', () => {
  it('gathers half the embers around 70% across (62% on narrow stages)', () => {
    expect(plumeX(field(1000, 400, script(0.2, 0.5, 0.5, 0.5)))).toBeCloseTo(700)
    expect(plumeX(field(400, 400, script(0.2, 0.5, 0.5, 0.5)))).toBeCloseTo(248)
  })

  it('scatters the other half anywhere', () => {
    expect(plumeX(field(1000, 400, script(0.7, 0.25)))).toBeCloseTo(250)
  })

  it('re-rolls a plume position that falls off the stage', () => {
    // 700 + 1.5 * 240 = 1060 > 1000 → rand() * w
    expect(plumeX(field(1000, 400, script(0.2, 1, 1, 1, 0.1)))).toBeCloseTo(100)
  })

  it('mirrors under RTL', () => {
    expect(plumeX(field(1000, 400, script(0.2, 0.5, 0.5, 0.5), true))).toBeCloseTo(300)
  })

  it('stays on the stage', () => {
    const f = field(800, 300)
    for (let i = 0; i < 500; i++) {
      const x = plumeX(f)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(800)
    }
  })
})

describe('createEmber', () => {
  it('rolls ~8% sparks and ~4% flares, placed up the plume', () => {
    const f = field(1000, 400)
    const all = Array.from({ length: 4000 }, () => createEmber(f))
    const sparks = all.filter((p) => p.spark).length / all.length
    const flares = all.filter((p) => p.flare).length / all.length
    expect(sparks).toBeGreaterThan(0.06)
    expect(sparks).toBeLessThan(0.1)
    expect(flares).toBeGreaterThan(0.025)
    expect(flares).toBeLessThan(0.055)
    for (const p of all) {
      expect(p.spark && p.flare).toBe(false)
      expect(p.ceil).toBeGreaterThanOrEqual(0)
      expect(p.ceil).toBeLessThanOrEqual(400 * 0.88)
      expect(p.y).toBeGreaterThanOrEqual(p.ceil)
      expect(p.y).toBeLessThanOrEqual(400)
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(1000)
    }
  })

  it('gives flares a large core and a hotter bias', () => {
    const flare = createEmber(field(1000, 400, script(0.1, 0.5, 0.5)))
    expect(flare.flare).toBe(true)
    expect(flare.size).toBeGreaterThanOrEqual(4)
    expect(flare.heatBias).toBeGreaterThan(1)
    const spark = createEmber(field(1000, 400, script(0.05, 0.5)))
    expect(spark.spark).toBe(true)
    expect(spark.speed).toBeGreaterThan(38)
  })

  it('is reproducible for a seed', () => {
    const a = createEmber(field(1000, 400, mulberry32(42)))
    const b = createEmber(field(1000, 400, mulberry32(42)))
    expect(a).toEqual(b)
  })
})

describe('layoutEmbers', () => {
  it('fills to the count, then rescales and trims on a resize', () => {
    const f = field(0, 0)
    const embers: Ember[] = []
    layoutEmbers(embers, f, 500, 200, 10)
    expect(embers).toHaveLength(10)
    expect([f.width, f.height]).toEqual([500, 200])
    const before = embers.map((p) => [p.x, p.y, p.ceil])
    layoutEmbers(embers, f, 1000, 400, 6)
    expect(embers).toHaveLength(6)
    embers.forEach((p, i) => {
      const [x = 0, y = 0, ceil = 0] = before[i] ?? []
      expect(p.x).toBeCloseTo(x * 2)
      expect(p.y).toBeCloseTo(y * 2)
      expect(p.ceil).toBeCloseTo(ceil * 2)
    })
  })
})

describe('stepEmber', () => {
  const f = field(1000, 400)

  it('rises and drifts by dt, and holds still when dt = 0', () => {
    const p = ember({ drift: 5, y: 300 })
    const pose = createPose()
    expect(stepEmber(p, f, 0, 0, 0, 0, pose)).toBe(true)
    expect([p.x, p.y]).toEqual([500, 300])
    expect(stepEmber(p, f, 0.1, 0.1, 0, 0, pose)).toBe(true)
    expect(p.y).toBeLessThan(300)
    expect(p.x).toBeCloseTo(500.5)
  })

  it('respawns below the stage once it burns out or drifts away', () => {
    const pose = createPose()
    const burnt = ember({ ceil: 200, y: 199 })
    expect(stepEmber(burnt, f, 1, 0.05, 0, 0, pose)).toBe(false)
    expect(burnt.y).toBeGreaterThan(400)
    const away = ember({ x: 1039.9, drift: 10 })
    expect(stepEmber(away, f, 1, 0.05, 0, 0, pose)).toBe(false)
    expect(away.y).toBeGreaterThan(400)
  })

  it('skips embers too faint to see', () => {
    const p = ember({ ceil: 200, y: 200.5 })
    expect(stepEmber(p, f, 0, 0, 0, 0, createPose())).toBe(false)
  })

  it('streaks hot embers along their velocity and crossfades the heat ramp', () => {
    const pose = createPose()
    const p = ember({ y: 390, heatBias: 0.9 }) // near the bottom: hot
    expect(stepEmber(p, f, 0.3, 0, 0, 0, pose)).toBe(true)
    expect(pose.sprite).toBe(3)
    expect(pose.next).toBeGreaterThan(0)
    expect(pose.height).toBeGreaterThan(pose.width)
    expect(pose.sin).not.toBe(0)
  })

  it('draws cooled embers without a second sprite', () => {
    const pose = createPose()
    const p = ember({ ceil: 0, y: 40, heatBias: 0.9 }) // high up: cooler
    expect(stepEmber(p, f, 0, 0, 0, 0, pose)).toBe(true)
    expect(pose.sprite).toBe(1)
    const cold = ember({ ceil: 0, y: 4, heatBias: 0.75, alpha: 1 })
    stepEmber(cold, field(1000, 400), 0, 0, 0, 0, pose)
    expect(pose.sprite).toBe(0)
  })

  it('draws the nearest embers out of focus: round, unrotated, dimmer', () => {
    const pose = createPose()
    const p = ember({ z: 0.95, y: 300 })
    expect(stepEmber(p, f, 0, 0, 0, 0, pose)).toBe(true)
    expect(pose.sprite).toBe(6)
    expect(pose.width).toBe(pose.height)
    expect([pose.cos, pose.sin]).toEqual([1, 0])
    expect(pose.next).toBe(0)
  })

  it('uses the spark sprite and jitter for sparks, and swells flares', () => {
    const pose = createPose()
    expect(stepEmber(ember({ spark: true }), f, 0.2, 0, 0, 0, pose)).toBe(true)
    expect(pose.sprite).toBe(5)
    expect(pose.next).toBe(0)
    const flare = ember({ flare: true, z: 0.95, size: 4 })
    expect(stepEmber(flare, f, 0.2, 0, 0, 0, pose)).toBe(true)
    expect(pose.sprite).toBeLessThan(5) // flares are never out of focus
  })

  it('leans near embers away from the pointer (parallax)', () => {
    const still = createPose()
    const leaning = createPose()
    stepEmber(ember({ z: 0.9 }), f, 0, 0, 0, 0, still)
    stepEmber(ember({ z: 0.9 }), f, 0, 0, 1, 1, leaning)
    expect(leaning.x).toBeCloseTo(still.x - 0.81 * 28)
    expect(leaning.y).toBeCloseTo(still.y - 0.81 * 14)
  })
})

describe('emberPalette and spriteStops', () => {
  it('builds seven crimson sprites for the accent tone', () => {
    const sprites = emberPalette(tokens, 'accent')
    expect(sprites).toHaveLength(7)
    expect(sprites[0]?.color).toEqual(tokens.deep)
    expect(sprites[2]?.color).toEqual(tokens.accent)
    expect(sprites[6]?.hot).toBeLessThan(0)
    // Hot sprites have a bone core, lighter than the accent.
    const core = sprites[4]?.core ?? [0, 0, 0]
    expect(core[1]).toBeGreaterThan(200)
  })

  it('builds seven amber sprites for the premium tone', () => {
    const sprites = emberPalette(tokens, 'premium')
    expect(sprites).toHaveLength(7)
    const [r = 0, g = 0, b = 0] = sprites[2]?.color ?? []
    expect(r).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(b) // amber
    expect(sprites.some((s) => s.color.join() === tokens.accent.join())).toBe(false)
    expect(sprites[5]?.core).toEqual([255, 255, 255])
  })

  it('turns a sprite into gradient stops: a hot core fading out, or a soft disc', () => {
    const hot = spriteStops({
      color: [200, 0, 0],
      hot: 1,
      core: [255, 255, 255],
      halo: [100, 0, 0],
    })
    const soft = spriteStops({
      color: [200, 0, 0],
      hot: -1,
      core: [255, 255, 255],
      halo: [200, 0, 0],
    })
    expect(hot).toHaveLength(6)
    expect(hot[0]).toEqual([0, [255, 255, 255], 1])
    expect(hot.at(-1)).toEqual([1, [100, 0, 0], 0])
    expect(soft).toHaveLength(4)
    expect(soft[0]?.[2]).toBe(0.55)
  })
})
