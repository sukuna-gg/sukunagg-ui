import { describe, expect, it } from 'bun:test'
import { mulberry32 } from '../../internal/random'
import {
  CALM_ENERGY,
  createFlow,
  FLOW_SEED,
  type Flow,
  GROUPS,
  gradientNoise,
  LEVEL_ALPHA,
  particleCount,
  rebuildSteps,
} from './flow-field.sim'

/** A flow fitted to the approved 540 × 320 stage. */
function stageFlow(seed = FLOW_SEED): Flow {
  const flow = createFlow(seed)
  flow.resize(540, 320, particleCount(540, 320, 'medium'))
  return flow
}

const snapshot = (flow: Flow) => flow.particles.map((p) => ({ ...p }))

describe('particleCount', () => {
  it('matches the approved mockup on its 540 × 320 stage', () => {
    expect(particleCount(540, 320, 'low')).toBe(300)
    expect(particleCount(540, 320, 'medium')).toBe(600)
    expect(particleCount(540, 320, 'high')).toBe(960)
  })

  it('scales with the area and clamps tiny and huge stages', () => {
    expect(particleCount(270, 320, 'medium')).toBe(300)
    expect(particleCount(10, 10, 'low')).toBe(80)
    expect(particleCount(10, 10, 'medium')).toBe(160)
    expect(particleCount(10, 10, 'high')).toBe(240)
    expect(particleCount(3840, 2160, 'low')).toBe(900)
    expect(particleCount(3840, 2160, 'medium')).toBe(1800)
    expect(particleCount(3840, 2160, 'high')).toBe(3000)
  })
})

describe('rebuildSteps', () => {
  it('takes every step up to the approved stage, then fewer, within its particle-step budget', () => {
    expect(rebuildSteps(160, 120)).toBe(120)
    expect(rebuildSteps(600, 120)).toBe(120)
    expect(rebuildSteps(600, 60)).toBe(60)
    expect(rebuildSteps(1800, 120)).toBe(40)
    expect(rebuildSteps(1800, 60)).toBe(20)
    expect(rebuildSteps(3000, 120)).toBe(24)
    for (const count of [160, 600, 961, 1800, 3000]) {
      expect(count * rebuildSteps(count, 120)).toBeLessThanOrEqual(600 * 120)
    }
    expect(rebuildSteps(1e9, 60)).toBe(1)
  })
})

describe('gradientNoise', () => {
  it('is seeded: the same seed gives the same field, another seed a different one', () => {
    const a = gradientNoise(mulberry32(1))
    const b = gradientNoise(mulberry32(1))
    const c = gradientNoise(mulberry32(2))
    const points = [0.31, 1.7, 2.45, 7.9, 13.13, 200.5]
    expect(points.map((x) => a(x, x * 0.7))).toEqual(points.map((x) => b(x, x * 0.7)))
    expect(points.map((x) => a(x, x * 0.7))).not.toEqual(points.map((x) => c(x, x * 0.7)))
  })

  it('is zero on the lattice, bounded and continuous in between', () => {
    const noise = gradientNoise(mulberry32(FLOW_SEED))
    expect(noise(3, 4)).toBe(0)
    expect(noise(-2, 9)).toBe(0)
    let min = 0
    let max = 0
    for (let i = 0; i < 4000; i++) {
      const v = noise(i * 0.137, i * 0.071 - 40)
      min = Math.min(min, v)
      max = Math.max(max, v)
    }
    expect(min).toBeGreaterThan(-1)
    expect(max).toBeLessThan(1)
    expect(max - min).toBeGreaterThan(0.5) // not flat
    expect(Math.abs(noise(5.5, 5.5) - noise(5.5001, 5.5))).toBeLessThan(0.001)
  })
})

describe('createFlow', () => {
  it('spawns `count` particles inside the stage, in every color group', () => {
    const flow = stageFlow()
    expect(flow.particles).toHaveLength(600)
    for (const p of flow.particles) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThan(540)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThan(320)
      expect(p.life).toBeLessThanOrEqual(p.ttl)
    }
    const groups = new Set(flow.particles.map((p) => p.group))
    expect([...groups].sort()).toEqual([0, 1, 2, 3])
    // Sparks (the premium group) stay rare.
    expect(flow.particles.filter((p) => p.group === 3).length).toBeLessThan(60)
  })

  it('is deterministic: the same seed, size and steps give the same scene', () => {
    const a = stageFlow()
    const b = stageFlow()
    for (let i = 0; i < 30; i++) {
      a.step(1, 1)
      b.step(1, 1)
    }
    expect(snapshot(a)).toEqual(snapshot(b))
    const c = stageFlow(FLOW_SEED + 1)
    expect(snapshot(c)).not.toEqual(snapshot(stageFlow()))
  })

  it('steps: particles move, segments land in the 16 buckets, the fade alpha is a fraction', () => {
    const flow = stageFlow()
    const before = snapshot(flow)
    const alpha = flow.step(1, 1)
    expect(alpha).toBeGreaterThan(0)
    expect(alpha).toBeLessThan(1)
    expect(flow.buckets).toHaveLength(GROUPS * LEVEL_ALPHA.length)
    const segments = flow.buckets.reduce((n, b) => n + b.length, 0)
    expect(segments % 4).toBe(0)
    expect(segments / 4).toBeGreaterThan(100)
    expect(flow.buckets.every((b) => b.length % 4 === 0)).toBe(true)
    const moved = flow.particles.filter((p, i) => p.x !== before[i]?.x || p.y !== before[i]?.y)
    expect(moved.length).toBeGreaterThan(590)
    // Each step clears the previous segments.
    flow.step(1, 1)
    expect(flow.buckets.reduce((n, b) => n + b.length, 0) / 4).toBeLessThan(600)
  })

  it('a longer step fades the trails more', () => {
    expect(stageFlow().step(3, 1)).toBeGreaterThan(stageFlow().step(1, 1))
  })

  it('eases the energy toward its target', () => {
    const flow = stageFlow()
    expect(flow.energy).toBe(1)
    flow.step(40, CALM_ENERGY)
    expect(flow.energy).toBeLessThan(0.6)
    expect(flow.energy).toBeGreaterThan(CALM_ENERGY)
    for (let i = 0; i < 400; i++) flow.step(1, CALM_ENERGY)
    expect(flow.energy).toBeCloseTo(CALM_ENERGY, 3)
  })

  it('a calm field moves slower than an active one', () => {
    const active = stageFlow()
    const calm = stageFlow()
    calm.energy = CALM_ENERGY
    const a0 = snapshot(active)
    const c0 = snapshot(calm)
    active.step(1, 1)
    calm.step(1, CALM_ENERGY)
    // Distance moved by the particles that did not respawn this step.
    const travel = (flow: Flow, from: ReturnType<typeof snapshot>) =>
      flow.particles.reduce((sum, p, i) => {
        const was = from[i]
        if (!was || p.life < was.life) return sum
        return sum + Math.hypot(p.x - was.x, p.y - was.y)
      }, 0)
    expect(travel(calm, c0)).toBeLessThan(travel(active, a0) * 0.6)
  })

  it('respawns particles that expire or leave the stage', () => {
    const flow = stageFlow()
    const p = flow.particles[0]
    const q = flow.particles[1]
    if (!p || !q) throw new Error('no particles')
    p.life = p.ttl // expires on the next step
    q.x = -500 // far off-stage
    flow.step(1, 1)
    expect(p.life).toBe(0)
    expect(q.life).toBe(0)
    expect(q.x).toBeGreaterThanOrEqual(0)
  })

  it('rescales the particles on resize and matches the new count', () => {
    const flow = stageFlow()
    const before = snapshot(flow)
    flow.resize(1080, 160, 900)
    expect(flow.particles).toHaveLength(900)
    expect(flow.particles[0]?.x).toBeCloseTo((before[0]?.x ?? 0) * 2)
    expect(flow.particles[0]?.y).toBeCloseTo((before[0]?.y ?? 0) / 2)
    flow.setCount(200)
    expect(flow.particles).toHaveLength(200)
    flow.setCount(250)
    expect(flow.particles).toHaveLength(250)
    // New particles start mid-life, so the field never pulses in unison.
    expect(flow.particles[249]?.life).toBeGreaterThan(0)
  })
})
