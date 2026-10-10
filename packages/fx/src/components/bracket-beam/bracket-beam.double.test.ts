import { afterEach, describe, expect, it } from 'bun:test'
import {
  BAND_GAP,
  BAND_HEAD,
  BOX_SLOT,
  type BracketGrandFinal,
  doubleModel,
  dropChip,
  dropSpoken,
  HEAD,
  matchKey,
  production,
  ROW_Y,
} from './bracket-beam.double'
import { type BracketMatch, type BracketRound, CHAMPION } from './bracket-beam.geometry'

// The Q42 mockup's eight-team bracket (Copa Otoño): Sahuaros lose upper semi-final 1 to Cobras
// Sonora, drop to the lower bracket, win it, then beat Cobras in the grand final and the reset.
const m = (
  id: string,
  a: string,
  b: string,
  winner?: 0 | 1,
  next?: BracketMatch['next'],
): BracketMatch => ({ id, teams: [a, b], winner, ...(next && { next }) })

function copa() {
  const upper: BracketRound[] = [
    {
      name: 'Quarter-final',
      matches: [
        m('qf1', 'Cobras', 'Cerro', 0, { winner: 'sf1', loser: 'l1a' }),
        m('qf2', 'Sahuaros', 'Bahia', 0, { winner: 'sf1', loser: 'l1a' }),
        m('qf3', 'Pitayos', 'Mezquite', 0, { winner: 'sf2', loser: 'l1b' }),
        m('qf4', 'Desierto', 'Coyotes', 1, { winner: 'sf2', loser: 'l1b' }),
      ],
    },
    {
      name: 'Semi-final',
      matches: [
        m('sf1', 'Cobras', 'Sahuaros', 0, { winner: 'uf', loser: 'l2b' }),
        m('sf2', 'Pitayos', 'Coyotes', 0, { winner: 'uf', loser: 'l2a' }),
      ],
    },
    {
      name: 'Upper final',
      matches: [m('uf', 'Cobras', 'Pitayos', 0, { winner: 'gf', loser: 'lf' })],
    },
  ]
  const lower: BracketRound[] = [
    {
      name: 'Lower round 1',
      matches: [
        m('l1a', 'Cerro', 'Bahia', 1, { winner: 'l2a' }),
        m('l1b', 'Mezquite', 'Desierto', 1, { winner: 'l2b' }),
      ],
    },
    {
      name: 'Lower round 2',
      matches: [
        m('l2a', 'Bahia', 'Coyotes', 1, { winner: 'ls' }),
        m('l2b', 'Desierto', 'Sahuaros', 1, { winner: 'ls' }),
      ],
    },
    { name: 'Lower semi', matches: [m('ls', 'Coyotes', 'Sahuaros', 1, { winner: 'lf' })] },
    { name: 'Lower final', matches: [m('lf', 'Sahuaros', 'Pitayos', 0, { winner: 'gf' })] },
  ]
  const grandFinal: BracketGrandFinal = {
    match: m('gf', 'Cobras', 'Sahuaros', 1),
    reset: { teams: ['Cobras', 'Sahuaros'], winner: 1 },
  }
  return { upper, lower, grandFinal }
}

/**
 * A standard double-elimination skeleton for `n` = 2^k teams, all matches undecided: upper rounds
 * of n/2 … 1 matches, then 2(k - 1) lower rounds (a round of upper losers, then alternately a drop
 * round and a halving round), every upper loser dropping into the lower bracket.
 */
function skeleton(n: number) {
  const k = Math.log2(n)
  const lowerCount = (j: number) => n / 2 ** (Math.floor(j / 2) + 2)
  const lowerRounds = 2 * (k - 1)
  const upper: BracketRound[] = Array.from({ length: k }, (_, r) => ({
    name: `Upper ${r + 1}`,
    matches: Array.from({ length: n >> (r + 1) }, (_, i) =>
      m(`u${r}-${i}`, 'TBD', 'TBD', undefined, {
        winner: r === k - 1 ? 'gf' : `u${r + 1}-${i >> 1}`,
        loser: r === 0 ? `l0-${i >> 1}` : `l${2 * r - 1}-${i}`,
      }),
    ),
  }))
  const lower: BracketRound[] = Array.from({ length: lowerRounds }, (_, j) => ({
    name: `Lower ${j + 1}`,
    matches: Array.from({ length: lowerCount(j) }, (_, i) =>
      m(`l${j}-${i}`, 'TBD', 'TBD', undefined, {
        winner:
          j === lowerRounds - 1 ? 'gf' : (j + 1) % 2 ? `l${j + 1}-${i}` : `l${j + 1}-${i >> 1}`,
      }),
    ),
  }))
  return { upper, lower, grandFinal: { match: m('gf', 'TBD', 'TBD') } as BracketGrandFinal }
}

const env = process.env as Record<string, string | undefined>
const NODE_ENV = env.NODE_ENV
afterEach(() => {
  if (NODE_ENV === undefined) delete env.NODE_ENV
  else env.NODE_ENV = NODE_ENV
})

describe('helpers', () => {
  it('keys matches by band, round and index', () => {
    expect(matchKey('u', 1, 0)).toBe('u1-0')
    expect(matchKey('l', 3, 2)).toBe('l3-2')
  })

  it('abbreviates a round into a drop chip, numbering only rounds of several matches', () => {
    const round = (name: string, count = 2): BracketRound => ({
      name,
      matches: Array.from({ length: count }, () => ({ teams: ['A', 'B'] as const })),
    })
    expect(dropChip(round('Semi-final'), 0)).toBe('SF1')
    expect(dropChip(round('Quarter-finals'), 3)).toBe('QF4')
    expect(dropChip(round('Upper final', 1), 0)).toBe('UF')
    expect(dropChip(round('Round 1'), 1)).toBe('R1-2') // a digit: split from the match number
  })

  it('says where a team dropped from', () => {
    const round = (count: number): BracketRound => ({
      name: 'Semi-final',
      matches: Array.from({ length: count }, () => ({ teams: ['A', 'B'] as const })),
    })
    expect(dropSpoken(round(2), 1)).toBe('dropped from Semi-final 2')
    expect(dropSpoken(round(1), 0)).toBe('dropped from Semi-final')
  })

  it('reads the build mode, and treats a missing `process` as development', () => {
    env.NODE_ENV = 'production'
    expect(production()).toBe(true)
    env.NODE_ENV = 'development'
    expect(production()).toBe(false)
    const real = globalThis.process
    Object.defineProperty(globalThis, 'process', { configurable: true, value: undefined })
    try {
      expect(production()).toBe(false)
    } finally {
      Object.defineProperty(globalThis, 'process', { configurable: true, value: real })
    }
  })
})

describe('doubleModel: columns', () => {
  it('puts round i of both bands in column i, then the grand final, reset and trophy', () => {
    const { upper, lower, grandFinal } = copa()
    const model = doubleModel(upper, lower, grandFinal, 'Sahuaros')
    expect(model.band).toBe(4)
    const grid = (key: string) => model.wires.get(key)?.grid
    expect(grid('u0-0')).toBe('2') // into the semi-final's column
    expect(grid('l2-0')).toBe('4') // lower semi → lower final
    expect(grid('u2-0')).toBe('4 / 5') // upper final (col 2) → grand final (col 4): crosses col 3
    expect(model.wires.get('u2-0')?.over).toBe(true)
    expect(grid('l3-0')).toBe('5') // lower final → grand final
    expect(grid('gf')).toBe('6') // → reset
    expect(grid('gr')).toBe('7') // → trophy
    expect(model.wires.get('gf')?.over).toBeUndefined()
  })

  it('lays out 4, 8 and 16 teams', () => {
    // [teams, band columns, upper final, lower final, the upper final's wire area]
    for (const [n, band, upperFinal, lowerFinal, ufGrid] of [
      [4, 2, 'u1-0', 'l1-0', '3'], // both finals in column 1: the grand final's column is next
      [8, 4, 'u2-0', 'l3-0', '4 / 5'], // upper final in column 2 crosses column 3
      [16, 6, 'u3-0', 'l5-0', '5 / 7'], // upper final in column 3 crosses columns 4 and 5
    ] as const) {
      const { upper, lower, grandFinal } = skeleton(n)
      const model = doubleModel(upper, lower, grandFinal)
      expect(model.band).toBe(band)
      expect(upper.flatMap((r) => r.matches)).toHaveLength(n - 1)
      expect(lower.flatMap((r) => r.matches)).toHaveLength(n - 2)
      // Every winner link is drawn; no champion, so nothing feeds the trophy.
      expect(model.links).toHaveLength(n - 1 + n - 2)
      expect(model.links.some(([, to]) => to === CHAMPION)).toBe(false)
      expect(model.links).toContainEqual([upperFinal, 'gf', 0])
      expect(model.links).toContainEqual([lowerFinal, 'gf', 1])
      expect(model.wires.get(upperFinal)?.grid).toBe(ufGrid)
      expect(model.wires.get(lowerFinal)?.grid).toBe(`${band + 1}`)
      // Every upper match drops its loser into the lower bracket: one chip each.
      expect(model.drops.size).toBe(n - 1)
    }
  })

  it('places every wire in px from the bands', () => {
    const { upper, lower, grandFinal } = copa()
    const { wires } = doubleModel(upper, lower, grandFinal, 'Sahuaros')
    const top = BAND_HEAD + HEAD // the first list's top
    const upperH = 4 * BOX_SLOT
    const lowerTop = top + upperH + BAND_GAP + BAND_HEAD + HEAD // the lower list's top
    const mid = (top + lowerTop + 2 * BOX_SLOT) / 2 // the middle of both bands' lists: 320.5
    // qf1 (Cobras, top) → sf1's top row: down half a quarter-final slot.
    expect(wires.get('u0-0')).toEqual({
      dir: 'down',
      lit: false,
      ys: -0.5,
      y: top + BOX_SLOT / 2 - ROW_Y,
      hs: 0,
      h: BOX_SLOT / 2,
      grid: '2',
    })
    // qf2 (Sahuaros, top) → sf1's bottom row: up, lit.
    expect(wires.get('u0-1')).toMatchObject({ dir: 'up', lit: true, y: top + BOX_SLOT + ROW_Y })
    // Upper final → the grand final's top row; lower final → its bottom row (lit).
    expect(wires.get('u2-0')).toMatchObject({ dir: 'down', y: top + upperH / 2 - ROW_Y })
    expect(wires.get('u2-0')?.h).toBeCloseTo(mid - ROW_Y - (top + upperH / 2 - ROW_Y), 6)
    expect(wires.get('l3-0')).toMatchObject({ dir: 'up', lit: true, y: mid + ROW_Y })
    // Grand final → reset: level, flat. Reset → the trophy's centre.
    expect(wires.get('gf')).toMatchObject({ dir: 'flat', lit: true, y: mid + ROW_Y, h: 0 })
    expect(wires.get('gr')).toMatchObject({ dir: 'up', lit: true, y: mid, h: ROW_Y })
  })

  it('copes with an empty lower bracket', () => {
    const upper: BracketRound[] = [
      { name: 'Final', matches: [m('f', 'A', 'B', 0, { winner: 'gf' })] },
    ]
    const model = doubleModel(upper, [], { match: m('gf', 'A', 'C', 0) }, 'A')
    expect(model.band).toBe(1)
    expect(model.trail).toHaveLength(2)
  })
})

describe('doubleModel: links, rows and drop chips', () => {
  it('links every winner, landing on the row holding the same team', () => {
    const { upper, lower, grandFinal } = copa()
    const { links } = doubleModel(upper, lower, grandFinal, 'Sahuaros')
    expect(links.slice(0, 7)).toEqual([
      ['u0-0', 'u1-0', 0],
      ['u0-1', 'u1-0', 1],
      ['u0-2', 'u1-1', 0],
      ['u0-3', 'u1-1', 1],
      ['u1-0', 'u2-0', 0],
      ['u1-1', 'u2-0', 1],
      ['u2-0', 'gf', 0],
    ])
    expect(links.slice(7, 15)).toEqual([
      ['l0-0', 'l1-0', 0],
      ['l0-1', 'l1-1', 0],
      ['l1-0', 'l2-0', 0],
      ['l1-1', 'l2-0', 1],
      ['l2-0', 'l3-0', 0],
      ['l3-0', 'gf', 1],
      ['gf', 'gr', 1],
      ['gr', CHAMPION, -1],
    ])
  })

  it('puts a drop chip on the row each upper loser drops into', () => {
    const { upper, lower, grandFinal } = copa()
    const { drops } = doubleModel(upper, lower, grandFinal)
    const chip = (row: string) => {
      const drop = drops.get(row)
      return drop && `${drop.round.name} ${drop.index}`
    }
    expect(chip('l0-0-0')).toBe('Quarter-final 0') // Cerro, from qf1
    expect(chip('l0-0-1')).toBe('Quarter-final 1') // Bahia, from qf2
    expect(chip('l1-0-1')).toBe('Semi-final 1') // Coyotes, from sf2
    expect(chip('l1-1-1')).toBe('Semi-final 0') // Sahuaros, from sf1
    expect(chip('l3-0-1')).toBe('Upper final 0') // Pitayos
    expect(drops.has('l1-1-0')).toBe(false) // Desierto came up the lower bracket
    expect(drops.size).toBe(7)
  })

  it('fills undecided rows in order: winner links first, then drops', () => {
    const { upper, lower } = copa()
    const ls = lower[2]?.matches[0] as BracketMatch
    lower[2] = { name: 'Lower semi', matches: [{ ...ls, winner: undefined }] }
    lower[3] = {
      name: 'Lower final',
      matches: [m('lf', 'TBD', 'Pitayos', undefined, { winner: 'gf' })],
    }
    const model = doubleModel(upper, lower, { match: m('gf', 'Cobras', 'TBD') })
    expect(model.links).toContainEqual(['l2-0', 'l3-0', 0]) // undecided: the free top row
    expect(model.drops.has('l3-0-1')).toBe(true) // Pitayos keeps their row
    expect(model.links).toContainEqual(['l3-0', 'gf', 1])
    // Undecided, it leaves its box's centre (level with the next box) for the top row: up 13px.
    expect(model.wires.get('l2-0')).toMatchObject({ dir: 'up', h: ROW_Y })
  })

  it('gives a team listed twice one row, and the next feeder the other', () => {
    const upper: BracketRound[] = [
      {
        name: 'R1',
        matches: [
          m('a', 'X', 'P', 1, { winner: 'b', loser: 'l' }),
          m('c', 'X', 'Q', 1, { winner: 'b', loser: 'l' }),
        ],
      },
      { name: 'R2', matches: [m('b', 'P', 'Q', 0, { winner: 'gf' })] },
    ]
    const lower: BracketRound[] = [{ name: 'L1', matches: [m('l', 'X', 'Y', 0, { winner: 'gf' })] }]
    const { drops } = doubleModel(upper, lower, { match: m('gf', 'P', 'X') })
    expect([...drops.keys()]).toEqual(['l0-0-0', 'l0-0-1'])
  })
})

describe('doubleModel: the champion path', () => {
  it('comes back from the lower bracket and wins the reset', () => {
    const { upper, lower, grandFinal } = copa()
    const { links, trail, trailRows, wires } = doubleModel(upper, lower, grandFinal, 'Sahuaros')
    expect(trail.map((n) => links[n])).toEqual([
      ['u0-1', 'u1-0', 1],
      ['u1-0', 'l1-1', 1, 1, 1], // the drop: no wire, from their row in the semi they lost
      ['l1-1', 'l2-0', 1],
      ['l2-0', 'l3-0', 0],
      ['l3-0', 'gf', 1],
      ['gf', 'gr', 1],
      ['gr', CHAMPION, -1],
    ])
    expect([...trailRows]).toEqual([
      'u0-1-0',
      'u1-0-1',
      'l1-1-1',
      'l2-0-1',
      'l3-0-0',
      'gf-1',
      'gr-1',
    ])
    // The drop is not a wire: the semi-final's own wire carries Cobras, unlit.
    expect(wires.get('u1-0')?.lit).toBe(false)
    expect([...wires.values()].filter((w) => w.lit)).toHaveLength(6)
  })

  it('wins from the upper bracket without a reset', () => {
    const { upper, lower } = copa()
    const grandFinal = { match: m('gf', 'Cobras', 'Sahuaros', 0) }
    const { links, trail, trailRows } = doubleModel(upper, lower, grandFinal, 'Cobras')
    expect(trail.map((n) => links[n]?.slice(0, 2))).toEqual([
      ['u0-0', 'u1-0'],
      ['u1-0', 'u2-0'],
      ['u2-0', 'gf'],
      ['gf', CHAMPION],
    ])
    expect([...trailRows]).toEqual(['u0-0-0', 'u1-0-0', 'u2-0-0', 'gf-0'])
    expect(links).toHaveLength(14) // 13 band links + the grand final to the trophy, no drop
  })

  it('wins from the lower bracket without a reset', () => {
    const { upper, lower } = copa()
    const grandFinal = { match: m('gf', 'Cobras', 'Sahuaros', 1) }
    const { links, trail } = doubleModel(upper, lower, grandFinal, 'Sahuaros')
    expect(links[trail.at(-1) as number]).toEqual(['gf', CHAMPION, -1])
    expect(trail).toHaveLength(6)
  })

  it('loses the grand final from the upper bracket, then wins the reset from its own row', () => {
    const { upper, lower } = copa()
    const grandFinal: BracketGrandFinal = {
      match: m('gf', 'Cobras', 'Sahuaros', 1),
      reset: { teams: ['Sahuaros', 'Cobras'], winner: 1 },
    }
    const { links, trail, trailRows, wires } = doubleModel(upper, lower, grandFinal, 'Cobras')
    expect(trail.map((n) => links[n])).toEqual([
      ['u0-0', 'u1-0', 0],
      ['u1-0', 'u2-0', 0],
      ['u2-0', 'gf', 0],
      ['gf', 'gr', 1, 0], // from Cobras' row (they lost), onto Cobras' row in the reset
      ['gr', CHAMPION, -1],
    ])
    expect([...trailRows]).toEqual(['u0-0-0', 'u1-0-0', 'u2-0-0', 'gf-0', 'gr-1'])
    expect(wires.get('gf')).toMatchObject({ dir: 'down', lit: true, h: 2 * ROW_Y })
  })

  it('stops where the data stops: an undecided match, a lost final, a missing link', () => {
    const { upper, lower } = copa()
    // The reset not played yet: the path ends on it, the trophy link stays unlit.
    const open = doubleModel(
      upper,
      lower,
      { match: m('gf', 'Cobras', 'Sahuaros', 1), reset: { teams: ['Cobras', 'Sahuaros'] } },
      'Sahuaros',
    )
    expect([...open.trailRows].at(-1)).toBe('gr-1')
    expect(open.wires.get('gr')?.lit).toBe(false)
    // Lost the grand final with no reset: no way on.
    const lost = doubleModel(upper, lower, { match: m('gf', 'Cobras', 'Sahuaros', 0) }, 'Sahuaros')
    expect([...lost.trailRows].at(-1)).toBe('gf-1')
    expect(lost.wires.get('gf')?.lit).toBe(false)
    // The reset's next match is gone: a winner whose `next.winner` is missing stops the path.
    const cut = copa()
    const uf = cut.upper[2]?.matches[0] as BracketMatch
    cut.upper[2] = { name: 'Upper final', matches: [{ ...uf, next: { loser: 'lf' } }] }
    const stopped = doubleModel(cut.upper, cut.lower, cut.grandFinal, 'Cobras')
    expect([...stopped.trailRows]).toEqual(['u0-0-0', 'u1-0-0', 'u2-0-0'])
    // A reset whose teams don't match: its wire falls back to the top row.
    const odd = doubleModel(upper, lower, {
      match: m('gf', 'Cobras', 'Sahuaros', 1),
      reset: { teams: ['X', 'Y'] },
    })
    expect(odd.links).toContainEqual(['gf', 'gr', 0])
  })

  it('lights nothing for a champion who is not in the bracket, and links no trophy without one', () => {
    const { upper, lower, grandFinal } = copa()
    const nobody = doubleModel(upper, lower, grandFinal, 'Nobody')
    expect(nobody.trail).toEqual([])
    expect(nobody.trailRows.size).toBe(0)
    expect(nobody.links.at(-1)).toEqual(['gr', CHAMPION, -1])
    const none = doubleModel(upper, lower, grandFinal)
    expect(none.links.some(([, to]) => to === CHAMPION)).toBe(false)
  })
})

describe('doubleModel: validation', () => {
  const broken = (edit: (data: ReturnType<typeof copa>) => void) => {
    const data = copa()
    edit(data)
    return () => doubleModel(data.upper, data.lower, data.grandFinal, 'Sahuaros')
  }
  const match = (rounds: BracketRound[], r: number, i: number) =>
    rounds[r]?.matches[i] as BracketMatch & { id?: string; next?: BracketMatch['next'] }

  it('throws in development on a missing or duplicate id', () => {
    expect(
      broken(({ upper }) => {
        delete match(upper, 0, 2).id
      }),
    ).toThrow('BracketBeam: Quarter-final match 3 has no id')
    expect(
      broken(({ grandFinal }) => {
        delete grandFinal.match.id
      }),
    ).toThrow('the grand final has no id')
    expect(
      broken(({ lower }) => {
        match(lower, 0, 1).id = 'l1a'
      }),
    ).toThrow('duplicate id "l1a"')
  })

  it('throws on an unknown id', () => {
    expect(
      broken(({ upper }) => {
        match(upper, 1, 0).next = { winner: 'uf', loser: 'nowhere' }
      }),
    ).toThrow('Semi-final match 1: unknown loser id "nowhere"')
  })

  it('throws on a winner link that does not move right', () => {
    expect(
      broken(({ lower }) => {
        match(lower, 1, 0).next = { winner: 'l1a' }
      }),
    ).toThrow('Lower round 2 match 1: winner "l1a" is not in a later column')
  })

  it('throws on a match fed by more than two links', () => {
    expect(
      broken(({ upper }) => {
        match(upper, 0, 2).next = { winner: 'sf1', loser: 'l1b' }
      }),
    ).toThrow('"sf1" has more than two feeders')
  })

  it('throws on a cycle', () => {
    // sf2's loser drops to l1b, whose winner climbs back into sf2 (each still fed twice at most).
    expect(
      broken(({ upper, lower }) => {
        match(upper, 0, 2).next = { winner: 'sf2' }
        match(upper, 0, 3).next = { loser: 'l1b' }
        match(upper, 1, 1).next = { winner: 'uf', loser: 'l1b' }
        match(lower, 0, 1).next = { winner: 'sf2' }
      }),
    ).toThrow('the links loop through Semi-final match 2')
  })

  it('renders without wires in production', () => {
    env.NODE_ENV = 'production'
    const model = broken(({ upper }) => {
      match(upper, 1, 0).next = { winner: 'missing' }
    })()
    expect(model).toMatchObject({ band: 4, links: [], trail: [] })
    expect(model.wires.size + model.drops.size + model.trailRows.size).toBe(0)
  })
})
