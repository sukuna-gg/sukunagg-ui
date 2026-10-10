/**
 * BracketBeam's pure maths (no DOM, no React): the bracket model the server renders from, the
 * wire paths the island draws, the beam timeline and the seeded sparks. Ported from the approved
 * mockup (fx-mockups/parts/bracket-beam.html) and unit-tested on its own.
 */
import { mulberry32 } from '../../internal/random'

/** A team in a match: its name, or its name plus a seed. */
export type BracketTeam = string | BracketTeamInfo

/** A team with a seed, for {@link BracketTeam}. */
export interface BracketTeamInfo {
  /** The team's name. Also how BracketBeam follows the champion from round to round. */
  name: string
  /** Seed shown before the name (e.g. `1`). */
  seed?: number | string
}

/** One match of a {@link BracketRound}. */
export interface BracketMatch {
  /** The two teams, top row first. */
  teams: readonly [BracketTeam, BracketTeam]
  /** Each team's score (series wins), in `teams` order. Omit while the match is unplayed. */
  scores?: readonly [number | string, number | string]
  /** The winning row: `0` (top) or `1` (bottom). Omit while undecided. */
  winner?: 0 | 1
  /**
   * The match's id, unique in the bracket: what `next` links name. Required on every upper,
   * lower and grand-final match in double elimination (`format="double"`); ignored in single.
   */
  id?: string
  /**
   * Where this match's winner and loser play next, by match `id`. Double elimination only (single
   * elimination follows match positions): an upper match sends its winner up the upper bracket
   * and its loser down to the lower one; both finals send their winner to the grand final.
   * Ignored on the grand final and the reset, whose winners go to the reset and the trophy.
   */
  next?: BracketNext
}

/** Where a double-elimination match's teams go next: {@link BracketMatch.next}. */
export interface BracketNext {
  /** The `id` of the match the winner plays next. Its connector is drawn. */
  winner?: string
  /**
   * The `id` of the lower-bracket match the loser drops to. No connector is drawn: the team's
   * row there shows a drop chip ("▼ SF1") naming this match.
   */
  loser?: string
}

/** One column of the bracket. */
export interface BracketRound {
  /** Round name, e.g. `'Quarter-finals'`: the column heading and the round's accessible name. */
  name: string
  /** Short note at the right of the heading, e.g. `'Bo3'`. */
  meta?: string
  /** The round's matches, top to bottom. Match `i` feeds match `⌊i/2⌋` of the next round. */
  matches: readonly BracketMatch[]
}

/** The trophy card's id in {@link BracketLink}s and `data-match`. */
export const CHAMPION = 'champion'
/** Px from a match box's centre to a row's centre: (26px row + 1px divider) / 2. */
export const ROW = 13.5
/** Nominal first-round slot height (55px box + 2 × 12px), used to pick a poster wire's direction. */
export const SLOT = 79

/**
 * A connector: from a match (its `data-match`, e.g. `'<round>-<index>'`) to a match of a later
 * column, landing on `row` (0 top, 1 bottom), or to the trophy card (`to = 'champion'`,
 * `row = -1`: its centre). It leaves the source's winning row, or row `fromRow` when given (`-1`:
 * the box's centre). `drop` marks a double-elimination drop into the lower bracket: no wire, the
 * beam lands on the destination row's drop chip.
 */
export type BracketLink = readonly [
  from: string,
  to: string,
  row: number,
  fromRow?: number,
  drop?: 1,
]

/** How the server draws one connector in CSS (the poster): numbers for inline custom properties. */
export interface PosterWire {
  /** Which way the elbow goes. */
  dir: 'down' | 'up' | 'flat'
  /** On the champion's path (lit). */
  lit: boolean
  /** Top edge, from the source slot's centre: `ys` slot heights plus `y` px. */
  ys: number
  y: number
  /** Height: `hs` slot heights plus `h` px. */
  hs: number
  h: number
  /**
   * Double elimination: the wire is a child of the grid, not of its match, placed at this
   * `grid-column` over both bands, so `ys`/`hs` are fractions of the bands' height. The area is
   * the destination's column (the wire fills the gap on its left), or with `over` the columns it
   * crosses (a final into the grand final: one gap past each side).
   */
  grid?: string
  over?: boolean
}

/** What {@link bracketModel} derives from the rounds. */
export interface BracketModel {
  /** Every connector, in round order. */
  links: BracketLink[]
  /** Indices into `links` of the champion's path, in travel order (the last one ends at the card). */
  trail: number[]
  /** `'<round>-<index>-<row>'` of every row on the champion's path, in travel order. */
  trailRows: ReadonlySet<string>
  /** The poster wire leaving each match, by match id. */
  wires: ReadonlyMap<string, PosterWire>
}

/** The team's display name. */
export const teamName = (team: BracketTeam): string => (typeof team === 'string' ? team : team.name)

/** The team's seed, if any. */
export const teamSeed = (team: BracketTeam): number | string | undefined =>
  typeof team === 'string' ? undefined : team.seed

/** The winning team's name, if decided. */
export const winnerOf = (match: BracketMatch | undefined): string | undefined =>
  match?.winner === undefined ? undefined : teamName(match.teams[match.winner])

const rowOffset = (row: number | undefined): number =>
  row === undefined || row < 0 ? 0 : row ? ROW : -ROW

/**
 * Derive the links, the champion's path and the poster wires from the rounds.
 *
 * The path is found by name: the last-round match `champion` won, then, walking back, the feeder
 * (match `2i` or `2i + 1`) they won, until a round has none. A link lands on the next match's row
 * holding the source's winner, else on the top row for an even source and the bottom for an odd.
 */
export function bracketModel(rounds: readonly BracketRound[], champion?: string): BracketModel {
  const last = rounds.length - 1
  const path = new Set<string>()
  if (champion !== undefined) {
    let i = rounds[last]?.matches.findIndex((m) => winnerOf(m) === champion) ?? -1
    for (let r = last; i >= 0; r--) {
      path.add(`${r}-${i}`)
      const prev = rounds[r - 1]?.matches ?? []
      const feeders = [2 * i, 2 * i + 1]
      i = feeders.find((f) => winnerOf(prev[f]) === champion) ?? -1
    }
  }

  const firstSlots = rounds[0]?.matches.length ?? 1
  const links: BracketLink[] = []
  const trail: number[] = []
  const trailRows = new Set<string>()
  const wires = new Map<string, PosterWire>()

  rounds.forEach((round, r) => {
    const n = round.matches.length
    const next = rounds[r + 1]
    round.matches.forEach((match, i) => {
      const id = `${r}-${i}`
      const win = winnerOf(match)
      const lit = path.has(id)
      let to = CHAMPION
      let row = -1
      let j = 0
      let slots = 1
      if (next) {
        j = i >> 1
        const dest = next.matches[j]
        if (!dest) return
        const k = dest.teams.findIndex((team) => teamName(team) === win)
        to = `${r + 1}-${j}`
        row = k >= 0 ? k : i % 2
        slots = next.matches.length
      } else if (champion === undefined || !(path.size ? lit : n === 1)) {
        return // only the champion's final (or the only final) feeds the trophy
      }

      if (lit) {
        trail.push(links.length)
        trailRows.add(`${id}-${match.winner}`)
      }
      links.push([id, to, row])

      // The destination's centre, in source slots: slots are equal shares of the same height.
      const dSlots = (n * (j + 0.5)) / slots - (i + 0.5)
      const y0 = rowOffset(match.winner)
      const y1 = rowOffset(row)
      const px = (dSlots * SLOT * firstSlots) / n + y1 - y0
      const dir = px > 0.5 ? 'down' : px < -0.5 ? 'up' : 'flat'
      wires.set(
        id,
        dir === 'up'
          ? { dir, lit, ys: dSlots, y: y1, hs: -dSlots, h: y0 - y1 }
          : dir === 'down'
            ? { dir, lit, ys: 0, y: y0, hs: dSlots, h: y1 - y0 }
            : { dir, lit, ys: 0, y: y0, hs: 0, h: 0 },
      )
    })
  })

  return { links, trail, trailRows, wires }
}

/** Round to 2 decimals (SVG attribute values). */
export const round2 = (n: number): number => Math.round(n * 100) / 100

/** A measured wire: its SVG path, its length and a point at any distance along it. */
export interface Wire {
  d: string
  length: number
  at(distance: number): [x: number, y: number]
}

// Length of the quadratic corner from (−r, 0) through control (0, 0) to (0, r).
const CORNER = 1 + Math.SQRT1_2 * Math.log(1 + Math.SQRT2)

/**
 * An orthogonal connector from (x1, y1) to (x2, y2): across to the midpoint, down or up with
 * rounded elbows (radius ≤ 7), across again. Its exact length goes in `pathLength`, so dash
 * offsets in px line up with `at()`.
 */
export function wire(x1: number, y1: number, x2: number, y2: number): Wire {
  const dy = y2 - y1
  if (Math.abs(dy) < 1) {
    return {
      d: `M${round2(x1)} ${round2(y1)}H${round2(x2)}`,
      length: x2 - x1,
      at: (s) => [x1 + Math.min(Math.max(s, 0), x2 - x1), y1],
    }
  }
  const m = round2((x1 + x2) / 2)
  const sign = Math.sign(dy)
  const r = Math.min(7, Math.abs(dy) / 2, (x2 - x1) / 2)
  const run1 = m - r - x1
  const corner = r * CORNER
  const rise = Math.abs(dy) - 2 * r
  const run2 = x2 - m - r
  const length = run1 + corner + rise + corner + run2
  // Point on the quadratic corner from p0 via control c to p2, at fraction t.
  const q = (t: number, p0: number, c: number, p2: number) =>
    (1 - t) * (1 - t) * p0 + 2 * t * (1 - t) * c + t * t * p2
  const at = (distance: number): [number, number] => {
    let s = Math.min(Math.max(distance, 0), length)
    if (s <= run1) return [x1 + s, y1]
    s -= run1
    if (s <= corner) {
      const t = s / corner
      return [q(t, m - r, m, m), q(t, y1, y1, y1 + sign * r)]
    }
    s -= corner
    if (s <= rise) return [m, y1 + sign * (r + s)]
    s -= rise
    if (s <= corner) {
      const t = s / corner
      return [q(t, m, m, m + r), q(t, y2 - sign * r, y2, y2)]
    }
    return [m + r + (s - corner), y2]
  }
  const d =
    `M${round2(x1)} ${round2(y1)}H${round2(m - r)}Q${m} ${round2(y1)} ${m} ${round2(y1 + sign * r)}` +
    `V${round2(y2 - sign * r)}Q${m} ${round2(y2)} ${round2(m + r)} ${round2(y2)}H${round2(x2)}`
  return { d, length, at }
}

/** The beam's timing for a path of `segments` wires, in ms of one loop. */
export interface Timeline {
  /** Travel time of one beam. */
  travel: number
  /** When each beam leaves. */
  start: number[]
  /** When each beam lands. */
  arrive: number[]
  /** When each row on the path lights (the first right away, the others as their beam lands). */
  lit: number[]
  /** The last beam lands: the trophy ignites. */
  ignite: number
  /** Everything fades. */
  fade: number
  /** The representative frame: path lit, trophy lit, flow running. */
  still: number
  /** Loop length. */
  period: number
}

/** The mockup's timeline (6 s for three segments), stretched to any number of segments. */
export function timeline(segments: number): Timeline {
  const travel = 560
  const start = Array.from({ length: segments }, (_, i) => 420 + 900 * i)
  const arrive = start.map((t) => t + travel)
  const ignite = arrive.at(-1) ?? 0
  const fade = ignite + 2520
  return {
    travel,
    start,
    arrive,
    lit: [100, ...arrive.slice(0, -1)],
    ignite,
    fade,
    still: ignite + 1520,
    period: fade + 700,
  }
}

/**
 * How far the beam's head is along a wire of `length` px, `elapsed` ms after it left: an
 * ease-in that hits the box at full speed, then keeps going so the tail drains into it.
 * Negative before it leaves.
 */
export function beamHead(length: number, elapsed: number, travel: number): number {
  if (elapsed < 0) return -1
  const p = elapsed / travel
  return p <= 1 ? length * (0.3 * p + 0.7 * p * p) : length * (1 + 1.7 * (p - 1))
}

/** A measured box, relative to the bracket. */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** The point at fraction `u` around a box's edge (clockwise from its top-left), with its outward normal angle. */
export function perimeter(box: Rect, u: number): [x: number, y: number, normal: number] {
  let d = u * 2 * (box.w + box.h)
  if (d < box.w) return [box.x + d, box.y, -Math.PI / 2]
  d -= box.w
  if (d < box.h) return [box.x + box.w, box.y + d, 0]
  d -= box.h
  if (d < box.w) return [box.x + box.w - d, box.y + box.h, Math.PI / 2]
  d -= box.w
  return [box.x, box.y + box.h - d, Math.PI]
}

/**
 * One spark: `kind` is the landing burst of path segment `kind` (≥ 0), the trophy's perimeter
 * burst (`-1`) or a rising ember (`-2`).
 */
export interface Spark {
  kind: number
  /** Angle (bursts), or sway phase (embers). */
  angle: number
  /** Speed, px per ms. */
  speed: number
  /** Lifetime in ms (bursts), or cycle phase (embers). */
  life: number
  /** Radius in px. */
  radius: number
  /** Gravity, px per ms² (bursts). */
  gravity: number
  /** Position around the card (perimeter burst) or across it (embers), 0–1. */
  u: number
  /** Drawn in the hot color. */
  hot: boolean
}

/**
 * The seeded spark set (mulberry32, so every loop and every browser shows the same pattern): seven
 * per intermediate landing, 18 around the trophy, ten embers.
 */
export function makeSparks(landings: number): Spark[] {
  const rand = mulberry32(0x5ca1ab1e)
  const sparks: Omit<Spark, 'hot'>[] = []
  for (let kind = 0; kind < landings; kind++) {
    for (let j = 0; j < 7; j++) {
      const angle = Math.PI * (0.5 + rand())
      const speed = 0.04 + rand() * 0.1
      const life = 300 + rand() * 380
      const radius = 0.8 + rand() * 1.1
      sparks.push({ kind, angle, speed, life, radius, gravity: 28e-5, u: 0 })
    }
  }
  for (let j = 0; j < 18; j++) {
    const u = rand()
    const angle = (rand() - 0.5) * 1.1
    const speed = 0.025 + rand() * 0.09
    const life = 600 + rand() * 700
    const radius = 0.8 + rand() * 1.4
    sparks.push({ kind: -1, angle, speed, life, radius, gravity: -3e-5, u })
  }
  for (let j = 0; j < 10; j++) {
    const u = rand()
    const life = rand() * 1600
    const speed = 0.02 + rand() * 0.03
    const angle = rand() * 6.28
    const radius = 0.7 + rand() * 0.9
    sparks.push({ kind: -2, angle, speed, life, radius, gravity: 0, u })
  }
  return sparks.map((spark, i) => ({ ...spark, hot: i % 3 === 0 }))
}

/**
 * Where a spark is at loop time `t` and how opaque (`alpha` 0 = hidden). `landings[k]` is the
 * landing point of segment `k`; `card` the trophy card's box.
 */
export function sparkAt(
  spark: Spark,
  t: number,
  tl: Timeline,
  landings: readonly (readonly [number, number])[],
  card: Rect,
): [x: number, y: number, alpha: number] {
  if (spark.kind === -2) {
    const env = Math.min(
      1,
      Math.max(0, (t - tl.ignite - 200) / 400),
      Math.max(0, (tl.fade + 300 - t) / 400),
    )
    if (env <= 0) return [0, 0, 0]
    const tau = (t - tl.ignite + spark.life) % 1600 // env > 0 only after the ignition
    return [
      card.x + 10 + spark.u * (card.w - 20) + Math.sin(spark.angle + tau / 260) * 4,
      card.y - 2 - spark.speed * tau,
      env * Math.sin((Math.PI * tau) / 1600) * 0.8,
    ]
  }
  const born = spark.kind >= 0 ? (tl.arrive[spark.kind] ?? 0) : tl.ignite
  const tau = t - born
  if (tau < 0 || tau >= spark.life) return [0, 0, 0]
  const [ox, oy, normal] =
    spark.kind >= 0 ? [...(landings[spark.kind] ?? [0, 0]), 0] : perimeter(card, spark.u)
  const a = spark.angle + normal
  return [
    ox + Math.cos(a) * spark.speed * tau,
    oy + Math.sin(a) * spark.speed * tau + 0.5 * spark.gravity * tau * tau,
    (1 - tau / spark.life) ** 1.4,
  ]
}
