import { describe, expect, it } from 'bun:test'
import {
  type BracketMatch,
  type BracketRound,
  beamHead,
  bracketModel,
  CHAMPION,
  makeSparks,
  perimeter,
  ROW,
  round2,
  sparkAt,
  teamName,
  teamSeed,
  timeline,
  wire,
} from './bracket-beam.geometry'

const m = (a: string, b: string, winner?: 0 | 1): BracketMatch => ({
  teams: [a, b],
  scores: winner === undefined ? undefined : winner ? [0, 2] : [2, 0],
  winner,
})

// The mockup's eight-team bracket (seeds omitted): Crimson Vow wins it all.
const EIGHT: BracketRound[] = [
  {
    name: 'Quarter-finals',
    matches: [
      m('Crimson Vow', 'Paper Tigers', 0),
      m('Night Shift', 'Iron Lotus', 0),
      m('Kitsune Five', 'Hollow Crown', 1),
      m('Ember Tide', 'Static Saints', 0),
    ],
  },
  {
    name: 'Semi-finals',
    matches: [m('Crimson Vow', 'Night Shift', 0), m('Hollow Crown', 'Ember Tide', 0)],
  },
  { name: 'Grand final', matches: [m('Crimson Vow', 'Hollow Crown', 0)] },
]

describe('teams', () => {
  it('reads names and seeds from strings and objects', () => {
    expect(teamName('Crimson Vow')).toBe('Crimson Vow')
    expect(teamName({ name: 'Night Shift', seed: 4 })).toBe('Night Shift')
    expect(teamSeed('Crimson Vow')).toBeUndefined()
    expect(teamSeed({ name: 'Night Shift', seed: 4 })).toBe(4)
  })
})

describe('bracketModel', () => {
  it('links every match to the next round, and the final to the trophy', () => {
    const { links } = bracketModel(EIGHT, 'Crimson Vow')
    expect(links).toEqual([
      ['0-0', '1-0', 0],
      ['0-1', '1-0', 1],
      ['0-2', '1-1', 0],
      ['0-3', '1-1', 1],
      ['1-0', '2-0', 0],
      ['1-1', '2-0', 1],
      ['2-0', CHAMPION, -1],
    ])
  })

  it("follows the champion's path by name, in travel order", () => {
    const { trail, trailRows, links } = bracketModel(EIGHT, 'Crimson Vow')
    expect(trail.map((k) => links[k]?.[0])).toEqual(['0-0', '1-0', '2-0'])
    expect([...trailRows]).toEqual(['0-0-0', '1-0-0', '2-0-0'])
  })

  it('computes each poster wire: direction, offsets and whether it is lit', () => {
    const { wires } = bracketModel(EIGHT, 'Crimson Vow')
    // q1 (winner on top) → s1 top row: down half a slot.
    expect(wires.get('0-0')).toEqual({ dir: 'down', lit: true, ys: 0, y: -ROW, hs: 0.5, h: 0 })
    // q2 (winner on top) → s1 bottom row: up half a slot, landing a row lower.
    expect(wires.get('0-1')).toEqual({
      dir: 'up',
      lit: false,
      ys: -0.5,
      y: ROW,
      hs: 0.5,
      h: -2 * ROW,
    })
    // q3 (winner at the bottom) → s2 top row.
    expect(wires.get('0-2')).toEqual({
      dir: 'down',
      lit: false,
      ys: 0,
      y: ROW,
      hs: 0.5,
      h: -2 * ROW,
    })
    // The final's top row → the trophy card's centre.
    expect(wires.get('2-0')).toEqual({ dir: 'down', lit: true, ys: 0, y: -ROW, hs: 0, h: ROW })
  })

  it("lands on the next match's row holding the winner, wherever it is", () => {
    const swapped: BracketRound[] = [
      { name: 'Semi-finals', matches: [m('A', 'B', 0), m('C', 'D', 1)] },
      { name: 'Final', matches: [m('D', 'A', 1)] },
    ]
    expect(bracketModel(swapped).links).toEqual([
      ['0-0', '1-0', 1],
      ['0-1', '1-0', 0],
    ])
  })

  it('falls back to top for even and bottom for odd sources while undecided', () => {
    const open: BracketRound[] = [
      { name: 'Semi-finals', matches: [m('A', 'B'), m('C', 'D')] },
      { name: 'Final', matches: [m('TBD', 'TBD')] },
    ]
    const { links, wires } = bracketModel(open)
    expect(links).toEqual([
      ['0-0', '1-0', 0],
      ['0-1', '1-0', 1],
    ])
    expect(wires.get('0-0')).toMatchObject({ y: 0 }) // starts from the box centre
  })

  it('draws no trophy link without a champion, and an unlit one when the champion is not found', () => {
    expect(bracketModel(EIGHT).links.some(([, to]) => to === CHAMPION)).toBe(false)
    const other = bracketModel(EIGHT, 'Nobody')
    expect(other.trail).toEqual([])
    expect(other.links.at(-1)).toEqual(['2-0', CHAMPION, -1])
    expect(other.wires.get('2-0')?.lit).toBe(false)
  })

  it('feeds the trophy only from the champion when the last round has several matches', () => {
    const rounds: BracketRound[] = [{ name: 'Finals', matches: [m('A', 'B', 0), m('C', 'D', 0)] }]
    expect(bracketModel(rounds, 'C').links).toEqual([['0-1', CHAMPION, -1]])
    expect(bracketModel(rounds, 'Z').links).toEqual([])
  })

  it('skips a match whose destination does not exist', () => {
    const short: BracketRound[] = [
      { name: 'R1', matches: [m('A', 'B', 0), m('C', 'D', 0), m('E', 'F', 0)] },
      { name: 'R2', matches: [m('A', 'C', 0)] },
    ]
    expect(bracketModel(short).links.map(([from]) => from)).toEqual(['0-0', '0-1'])
  })

  it('draws a flat wire when source and destination rows line up', () => {
    const straight: BracketRound[] = [
      { name: 'Semi', matches: [m('A', 'B', 0)] },
      { name: 'Final', matches: [m('A', 'C', 0)] },
    ]
    expect(bracketModel(straight).wires.get('0-0')).toEqual({
      dir: 'flat',
      lit: false,
      ys: 0,
      y: -ROW,
      hs: 0,
      h: 0,
    })
  })

  it('handles an empty bracket', () => {
    expect(bracketModel([], 'A')).toMatchObject({ links: [], trail: [] })
  })
})

describe('wire', () => {
  it('is a straight line when both ends are level', () => {
    const w = wire(0, 10, 40, 10.5)
    expect(w.d).toBe('M0 10H40')
    expect(w.length).toBe(40)
    expect(w.at(15)).toEqual([15, 10])
    expect(w.at(-5)).toEqual([0, 10])
    expect(w.at(99)).toEqual([40, 10])
  })

  it('routes an elbow with rounded corners and walks along it', () => {
    const w = wire(0, 0, 40, 40) // midpoint 20, radius 7
    expect(w.d).toBe('M0 0H13Q20 0 20 7V33Q20 40 27 40H40')
    const corner = 7 * (1 + Math.SQRT1_2 * Math.log(1 + Math.SQRT2))
    expect(w.length).toBeCloseTo(13 + corner + 26 + corner + 13, 6)
    expect(w.at(5)).toEqual([5, 0])
    const [cx, cy] = w.at(13 + corner / 2)
    expect(cx).toBeCloseTo(18.25, 6) // the corner's midpoint
    expect(cy).toBeCloseTo(1.75, 6)
    expect(w.at(13 + corner + 10)).toEqual([20, 17])
    const [dx, dy] = w.at(13 + corner + 26 + corner / 2)
    expect(dx).toBeCloseTo(21.75, 6)
    expect(dy).toBeCloseTo(38.25, 6)
    const [ex, ey] = w.at(w.length)
    expect(ex).toBeCloseTo(40, 6)
    expect(ey).toBe(40)
  })

  it('goes up as well, and shrinks the corner radius to fit a short rise', () => {
    const w = wire(0, 10, 30, 4)
    expect(w.d).toBe('M0 10H12Q15 10 15 7V7Q15 4 18 4H30')
    const [ex, ey] = w.at(1e9)
    expect(ex).toBeCloseTo(30, 6)
    expect(ey).toBe(4)
  })
})

describe('timeline', () => {
  it("matches the mockup's six-second loop for three segments", () => {
    expect(timeline(3)).toEqual({
      travel: 560,
      start: [420, 1320, 2220],
      arrive: [980, 1880, 2780],
      lit: [100, 980, 1880],
      ignite: 2780,
      fade: 5300,
      still: 4300,
      period: 6000,
    })
  })

  it('stretches for more segments and degrades to nothing for none', () => {
    expect(timeline(4).period).toBe(6900)
    expect(timeline(0)).toMatchObject({ start: [], ignite: 0, lit: [100] })
  })
})

describe('beamHead', () => {
  it('waits, eases in, then keeps going so the tail drains', () => {
    expect(beamHead(100, -1, 560)).toBe(-1)
    expect(beamHead(100, 0, 560)).toBe(0)
    expect(beamHead(100, 280, 560)).toBeCloseTo(100 * (0.15 + 0.175), 6)
    expect(beamHead(100, 560, 560)).toBe(100)
    expect(beamHead(100, 840, 560)).toBeCloseTo(185, 6)
  })
})

describe('perimeter', () => {
  const box = { x: 10, y: 20, w: 100, h: 50 }
  it('walks the edge clockwise with an outward normal', () => {
    expect(perimeter(box, 0.1)).toEqual([40, 20, -Math.PI / 2]) // top
    expect(perimeter(box, 0.4)).toEqual([110, 40, 0]) // right
    expect(perimeter(box, 0.6)).toEqual([80, 70, Math.PI / 2]) // bottom
    expect(perimeter(box, 0.9)).toEqual([10, 50, Math.PI]) // left
  })
})

describe('sparks', () => {
  const tl = timeline(3)
  const card = { x: 800, y: 100, w: 240, h: 95 }
  const landings: [number, number][] = [
    [300, 80],
    [560, 160],
  ]
  const sparks = makeSparks(2)

  it('is seeded: seven per landing, 18 around the trophy, ten embers, every third hot', () => {
    expect(sparks).toHaveLength(14 + 18 + 10)
    expect(makeSparks(2)).toEqual(sparks)
    expect(sparks.filter((s) => s.kind === 1)).toHaveLength(7)
    expect(sparks.filter((s) => s.kind === -1)).toHaveLength(18)
    expect(sparks.filter((s) => s.kind === -2)).toHaveLength(10)
    expect(sparks.map((s) => s.hot).slice(0, 4)).toEqual([true, false, false, true])
  })

  it('bursts from a landing point only during its life', () => {
    const spark = sparks.find((s) => s.kind === 0)
    if (!spark) throw new Error('no spark')
    expect(sparkAt(spark, (tl.arrive[0] ?? 0) - 1, tl, landings, card)[2]).toBe(0)
    const [x, y, alpha] = sparkAt(spark, (tl.arrive[0] ?? 0) + 50, tl, landings, card)
    expect(alpha).toBeGreaterThan(0)
    expect(Math.hypot(x - 300, y - 80)).toBeGreaterThan(0)
    expect(sparkAt(spark, (tl.arrive[0] ?? 0) + spark.life, tl, landings, card)[2]).toBe(0)
  })

  it('bursts off the trophy card at ignition', () => {
    const spark = sparks.find((s) => s.kind === -1)
    if (!spark) throw new Error('no spark')
    const [x, y, alpha] = sparkAt(spark, tl.ignite + 10, tl, landings, card)
    expect(alpha).toBeGreaterThan(0.9)
    expect(x).toBeGreaterThan(card.x - 5)
    expect(y).toBeGreaterThan(card.y - 5)
  })

  it('lets embers rise only while the trophy is lit', () => {
    const ember = sparks.find((s) => s.kind === -2)
    if (!ember) throw new Error('no ember')
    expect(sparkAt(ember, tl.ignite, tl, landings, card)[2]).toBe(0)
    expect(sparkAt(ember, tl.fade + 400, tl, landings, card)[2]).toBe(0)
    const lit = [0, 200, 400, 600, 800].map((d) =>
      sparkAt(ember, tl.ignite + 800 + d, tl, landings, card),
    )
    expect(lit.some(([, , a]) => a > 0)).toBe(true)
    for (const [, y] of lit) expect(y).toBeLessThanOrEqual(card.y)
  })

  it('rounds attribute values to two decimals', () => {
    expect(round2(1.23456)).toBe(1.23)
  })
})
