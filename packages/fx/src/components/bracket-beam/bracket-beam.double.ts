/**
 * BracketBeam's double-elimination model (no DOM, no React). It validates the explicit match links
 * (`id` + `next`), puts every match in a grid column, walks the champion's path forward and derives
 * what the server renders (lit rows, CSS poster wires, drop chips) and what the island draws (the
 * links and the beam's path). Spec: docs/component-bracket-beam.md §§ 3, 6. Unit-tested on its own.
 */
import {
  type BracketLink,
  type BracketMatch,
  type BracketModel,
  type BracketRound,
  CHAMPION,
  type PosterWire,
  round2,
  teamName,
  winnerOf,
} from './bracket-beam.geometry'

/** The grand final of a double-elimination bracket, and its bracket reset. */
export interface BracketGrandFinal {
  /**
   * The grand final: the upper bracket's winner against the lower bracket's. Give it an `id`:
   * both finals' `next.winner` name it. Its winner goes to `reset` when given, else to the trophy.
   */
  match: BracketMatch
  /**
   * The bracket-reset match, played when the lower bracket's team wins the grand final. Include it
   * once it's scheduled or played; it gets its own column. Its `id` and `next` are ignored.
   */
  reset?: BracketMatch
  /**
   * The grand final's column heading and list name. Localize it.
   * @default 'Grand final'
   */
  name?: string
  /**
   * The reset's column heading and list name. Localize it.
   * @default 'Reset'
   */
  resetName?: string
  /** A short note at the right of both headings, e.g. `'Bo5'`. */
  meta?: string
}

/** Where a lower-bracket team dropped from: the round and index of the match it lost. */
export interface BracketDrop {
  round: BracketRound
  index: number
}

/** What {@link doubleModel} derives: the single-elimination model's fields plus the drop chips. */
export interface DoubleModel extends BracketModel {
  /** Columns of the two bands: the wider band's round count. */
  band: number
  /** The drop chip on each row (`'<match>-<row>'`) a team dropped into. */
  drops: ReadonlyMap<string, BracketDrop>
}

/**
 * Fixed px heights of the double grid (bracket-beam.styles.tsx, bracket-beam.css), measured in
 * Chromium: the poster's wires cross bands, so they are placed in px from these.
 */
export const BAND_HEAD = 24 // a band's label: 18px plus a 6px gap
export const HEAD = 29 // a round's heading: 21px plus an 8px gap
export const BAND_GAP = 14 // space above the lower band
export const BOX_SLOT = 78 // a match box (two 26px rows, the divider inside, a 2px border) + 2 × 12px
export const ROW_Y = 13 // a row's centre from its box's centre (what the island measures)

const rowY = (row: number | undefined): number =>
  row === undefined || row < 0 ? 0 : row ? ROW_Y : -ROW_Y

/** The `data-match` of match `i` in round `r` of the upper (`'u'`) or lower (`'l'`) band. */
export const matchKey = (band: 'u' | 'l', r: number, i: number): string => `${band}${r}-${i}`

/** The default drop chip: the round name's initials plus the match number, e.g. `'SF1'`. */
export function dropChip(round: BracketRound, index: number): string {
  const initials = round.name
    .split(/[\s-]+/)
    .map((word) => (/^\d+$/.test(word) ? word : word.charAt(0)))
    .join('')
    .toUpperCase()
  if (round.matches.length < 2) return initials
  return `${initials}${/\d$/.test(initials) ? '-' : ''}${index + 1}`
}

/** The default spoken drop label, e.g. `'dropped from Semi-final 1'` (no number for one match). */
export const dropSpoken = (round: BracketRound, index: number): string =>
  `dropped from ${round.name}${round.matches.length > 1 ? ` ${index + 1}` : ''}`

/** True when bundled for production (`process.env.NODE_ENV`, which bundlers inline). */
export function production(): boolean {
  try {
    return process.env.NODE_ENV === 'production'
  } catch {
    return false // no `process` at all (an unbundled browser build): treat as development
  }
}

/** A grid position: a match or the trophy card. */
interface Spot {
  key: string
  /** Grid column, 0-based. */
  col: number
  /** Centre, px below the top of the grid's content box. */
  y: number
}

interface Node extends Spot {
  match: BracketMatch
  /** The band round it belongs to (none for the grand final and the reset). */
  round?: BracketRound
  index: number
}

type Kind = 'winner' | 'loser'
const KINDS: readonly Kind[] = ['winner', 'loser']

const loserOf = (match: BracketMatch): string | undefined =>
  match.winner === undefined ? undefined : teamName(match.teams[match.winner ? 0 : 1])

/**
 * Derive a double-elimination bracket's model.
 *
 * - Columns: upper round `i` and lower round `i` share column `i`; the grand final, the reset (only
 *   when given) and the trophy follow the wider band.
 * - Links: every `next.winner` is a connector, landing on the destination's row holding the same
 *   team, else on its first free row (winner links before loser links, upper before lower). Loser
 *   links draw nothing: they become drop chips on the row the team drops into.
 * - Path: from the champion's first match forward. A win follows `next.winner` (the grand final:
 *   the reset, else the trophy; the reset: the trophy); a loss follows `next.loser` (a drop, lit as
 *   a chip) or, in the grand final, the reset. Every match on it has the champion's row lit.
 * - Unknown ids, a match fed by more than two links, a winner link that doesn't move right, or a
 *   cycle throw in development; production renders the bracket without wires.
 */
export function doubleModel(
  upper: readonly BracketRound[],
  lower: readonly BracketRound[],
  grandFinal: BracketGrandFinal,
  champion?: string,
): DoubleModel {
  const band = Math.max(upper.length, lower.length)

  // --- Columns and px centres ----------------------------------------------------------------
  const tallest = (rounds: readonly BracketRound[]) =>
    Math.max(0, ...rounds.map((round) => round.matches.length)) * BOX_SLOT
  const bandHeight = (rounds: readonly BracketRound[]) =>
    BAND_HEAD + (rounds.length ? HEAD + tallest(rounds) : 0)
  const nodes: Node[] = []
  const place = (rounds: readonly BracketRound[], b: 'u' | 'l', top: number) => {
    const height = tallest(rounds)
    rounds.forEach((round, r) => {
      round.matches.forEach((match, i) => {
        const y = top + ((i + 0.5) * height) / round.matches.length
        nodes.push({ key: matchKey(b, r, i), col: r, y, match, round, index: i })
      })
    })
  }
  const listTop = BAND_HEAD + HEAD
  const lowerTop = bandHeight(upper) + BAND_GAP
  place(upper, 'u', listTop)
  place(lower, 'l', lowerTop + listTop)
  const mid = (listTop + lowerTop + bandHeight(lower)) / 2
  const gf: Node = { key: 'gf', col: band, y: mid, match: grandFinal.match, index: 0 }
  const reset: Node | undefined = grandFinal.reset && {
    key: 'gr',
    col: band + 1,
    y: mid,
    match: grandFinal.reset,
    index: 0,
  }
  const trophy: Spot = { key: CHAMPION, col: band + (reset ? 2 : 1), y: mid }

  // --- Validation ---------------------------------------------------------------------------
  const fail = (message: string): DoubleModel => {
    if (!production()) throw new Error(`[@sukunagg/fx] BracketBeam: ${message}`)
    return { band, links: [], trail: [], trailRows: new Set(), wires: new Map(), drops: new Map() }
  }
  const label = (node: Node) =>
    node.round ? `${node.round.name} match ${node.index + 1}` : 'the grand final'
  const byId = new Map<string, Node>()
  for (const node of [...nodes, gf]) {
    const { id } = node.match
    if (id === undefined) return fail(`${label(node)} has no id`)
    if (byId.has(id)) return fail(`duplicate id "${id}"`)
    byId.set(id, node)
  }
  // Only band matches link explicitly; the grand final's and the reset's links are implicit.
  const link = (node: Node, kind: Kind) => {
    const id = node.match.next?.[kind]
    return id === undefined ? undefined : byId.get(id)
  }
  const feeders = new Map<Node, [Node, Kind][]>()
  for (const kind of KINDS) {
    for (const node of nodes) {
      const id = node.match.next?.[kind]
      if (id === undefined) continue
      const to = byId.get(id)
      if (!to) return fail(`${label(node)}: unknown ${kind} id "${id}"`)
      if (kind === 'winner' && to.col <= node.col)
        return fail(`${label(node)}: winner "${id}" is not in a later column`)
      const list = feeders.get(to) ?? []
      if (list.push([node, kind]) > 2) return fail(`"${id}" has more than two feeders`)
      feeders.set(to, list)
    }
  }
  const state = new Map<Node, boolean>() // false: being visited, true: done
  const cycle = (node: Node): Node | undefined => {
    if (state.has(node)) return state.get(node) ? undefined : node
    state.set(node, false)
    for (const kind of KINDS) {
      const to = link(node, kind)
      const hit = to && to !== gf ? cycle(to) : undefined
      if (hit) return hit
    }
    state.set(node, true)
    return undefined
  }
  for (const node of nodes) {
    const hit = cycle(node)
    if (hit) return fail(`the links loop through ${label(hit)}`)
  }

  // --- Destination rows and drop chips ------------------------------------------------------
  const rowIn = new Map<string, number>() // `<from><kind>` → its row in the destination
  const drops = new Map<string, BracketDrop>()
  for (const [to, list] of feeders) {
    const teams = to.match.teams.map(teamName)
    const rows = list.map(([from, kind]) =>
      teams.indexOf((kind === 'winner' ? winnerOf : loserOf)(from.match) as string),
    )
    rows.forEach((row, n) => {
      if (row >= 0 && rows.indexOf(row) !== n) rows[n] = -1 // the same team twice: first wins
    })
    list.forEach(([from, kind], n) => {
      let row = rows[n] as number
      if (row < 0) row = rows[n] = rows.includes(0) ? 1 : 0
      rowIn.set(`${from.key}${kind}`, row)
      if (kind === 'loser')
        drops.set(`${to.key}-${row}`, { round: from.round as BracketRound, index: from.index })
    })
  }

  // --- The champion's path, forward from their first match ----------------------------------
  const at = (match: BracketMatch) =>
    champion === undefined ? -1 : match.teams.findIndex((team) => teamName(team) === champion)
  const final = reset ?? gf
  const path: [Node, number][] = []
  let node = [...nodes, gf, ...(reset ? [reset] : [])].find((n) => at(n.match) >= 0)
  let crowned = false
  while (node) {
    const k = at(node.match)
    path.push([node, k])
    if (node.match.winner === undefined) break
    const won = node.match.winner === k
    if (won && node === final) {
      crowned = true
      break
    }
    const next =
      node === gf ? reset : node === reset ? undefined : link(node, won ? 'winner' : 'loser')
    node = next && at(next.match) >= 0 ? next : undefined
  }
  // The matches whose drawn link the path takes: a win (or the grand final, lost or won, into the
  // reset), and the final into the trophy. A drop takes none: it has no wire.
  const takes = new Set<Node>()
  path.forEach(([from, k], n) => {
    if (path[n + 1] ? from.match.winner === k || from === gf : crowned) takes.add(from)
  })
  // A champion who lost the grand final and won the reset: the reset wire leaves their row.
  const gfRow = path.find(([n, k]) => n === gf && takes.has(n) && n.match.winner !== k)?.[1]

  // --- Links (the island) and poster wires (the server) -------------------------------------
  // Each poster wire is a grid child over both bands (top = -50% + y px from the bands' top): in
  // the gap left of its destination's column, or across the columns between (one gap past each
  // side), so it never depends on how wide a column is.
  const links: BracketLink[] = []
  const wires = new Map<string, PosterWire>()
  const linkOf = new Map<Node, number>()
  const draw = (from: Node, to: Spot, row: number, fromRow?: number) => {
    linkOf.set(from, links.length)
    links.push(fromRow === undefined ? [from.key, to.key, row] : [from.key, to.key, row, fromRow])
    const y0 = round2(from.y + rowY(fromRow ?? from.match.winner))
    const y1 = round2(to.y + rowY(row))
    const dir = y1 - y0 > 0.5 ? 'down' : y1 - y0 < -0.5 ? 'up' : 'flat'
    const over = to.col - from.col > 1
    wires.set(from.key, {
      dir,
      lit: takes.has(from),
      ys: -0.5,
      y: Math.min(y0, y1),
      hs: 0,
      h: dir === 'flat' ? 0 : round2(Math.abs(y1 - y0)),
      grid: over ? `${from.col + 2} / ${to.col + 1}` : `${to.col + 1}`,
      ...(over && { over }),
    })
  }
  for (const from of nodes) {
    const to = link(from, 'winner')
    if (to) draw(from, to, rowIn.get(`${from.key}winner`) as number)
  }
  if (reset) {
    const team = gfRow === undefined ? winnerOf(gf.match) : champion
    draw(gf, reset, Math.max(0, reset.match.teams.map(teamName).indexOf(team as string)), gfRow)
  }
  if (champion !== undefined) draw(final, trophy, -1)

  const trail: number[] = []
  path.forEach(([from, k], n) => {
    const next = path[n + 1]
    if (takes.has(from)) trail.push(linkOf.get(from) as number)
    else if (next) {
      trail.push(links.length) // a drop: no wire, the beam lands on the chip
      links.push([from.key, next[0].key, next[1], k, 1])
    }
  })

  return {
    band,
    links,
    trail,
    trailRows: new Set(path.map(([n, k]) => `${n.key}-${k}`)),
    wires,
    drops,
  }
}
