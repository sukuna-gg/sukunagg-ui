/*
 * CommandPalette's fuzzy filter. Pure functions, no React, no DOM.
 *
 * A query matches when its letters appear in the text in order (a subsequence), ignoring case,
 * accents and the query's spaces: "bahia" finds "Bahía", "swth" finds "Switch theme". Each matched
 * letter scores +1, +3 more when it directly follows the previous matched letter, and +2 more at
 * the start of a word. The best-scoring placement wins (a small dynamic program), so "st" in
 * "Last Stand" lights up "St", not "st".
 */

/** A searchable text folded for matching, with a way back to the original characters. */
interface Folded {
  /** Lower-case, accent-free text, one entry per folded character. */
  chars: string[]
  /** For each folded character, the index of the code point it came from in the original. */
  from: number[]
  /** For each folded character, whether it starts a word. */
  starts: boolean[]
}

/** Where a query matched and how well. */
export interface FuzzyMatch {
  /** Higher is better. 0 for an empty query. */
  score: number
  /** Matched code-point indices into the original text (`[...text]`), ascending. */
  indices: number[]
}

const MARKS = /\p{M}/gu
const WORD_CHAR = /[\p{L}\p{N}]/u
const NONE = -1

/** Lower-cases one character and strips its accents ("Í" → "i"). May return '' or 2+ chars. */
const foldChar = (ch: string) => ch.toLowerCase().normalize('NFD').replace(MARKS, '')

function fold(source: string): Folded {
  const folded: Folded = { chars: [], from: [], starts: [] }
  let prev = ''
  let index = 0
  for (const ch of source) {
    let first = true
    for (const f of foldChar(ch)) {
      folded.chars.push(f)
      folded.from.push(index)
      // A word starts after anything that isn't a letter or a digit (space, #, ·, -, …).
      folded.starts.push(first && (index === 0 || !WORD_CHAR.test(prev)))
      first = false
    }
    // A bare combining mark (already-decomposed text) doesn't end the word it sits on.
    if (!first) prev = ch
    index++
  }
  return folded
}

/** The query as the matcher sees it: folded, with every space removed. */
export const normalizeQuery = (query: string) => fold(query).chars.join('').replace(/\s+/g, '')

/** `list[i]`, or `NONE` past the end (keeps the DP readable under noUncheckedIndexedAccess). */
const at = (list: readonly number[], i: number) => list[i] ?? NONE

/**
 * Scores `query` against `text`. Returns `null` when the letters don't all appear in order.
 * `query` must already be normalized with {@link normalizeQuery}.
 */
export function fuzzyMatch(text: string, query: string): FuzzyMatch | null {
  if (query === '') return { score: 0, indices: [] }
  const { chars, from, starts } = fold(text)
  const wanted = [...query]
  const n = chars.length
  // best[j]: best score with the current query letter matched at chars[j] (NONE = impossible).
  let best: number[] = []
  // links[i][j]: where query letter i-1 sat in the best placement ending with letter i at j.
  const links: number[][] = []
  wanted.forEach((letter, i) => {
    const row = new Array<number>(n).fill(NONE)
    const link = new Array<number>(n).fill(NONE)
    // Running best over best[0..j-2]: the previous letter matched with a gap before chars[j].
    let gapBest = NONE
    let gapAt = NONE
    for (let j = 0; j < n; j++) {
      if (at(best, j - 2) > gapBest) {
        gapBest = at(best, j - 2)
        gapAt = j - 2
      }
      if (chars[j] !== letter) continue
      const gain = starts[j] ? 3 : 1
      if (i === 0) {
        row[j] = gain
        continue
      }
      const run = at(best, j - 1) === NONE ? NONE : at(best, j - 1) + 3
      // Ties go to the run (consecutive letters read better highlighted).
      if (run !== NONE && run >= gapBest) {
        row[j] = run + gain
        link[j] = j - 1
      } else if (gapBest !== NONE) {
        row[j] = gapBest + gain
        link[j] = gapAt
      }
    }
    links.push(link)
    best = row
  })
  let end = NONE
  best.forEach((score, j) => {
    if (score !== NONE && (end === NONE || score > at(best, end))) end = j
  })
  if (end === NONE) return null
  const indices: number[] = []
  for (let i = wanted.length - 1, j = end; i >= 0; i--) {
    const cp = at(from, j)
    if (indices[0] !== cp) indices.unshift(cp)
    j = at(links[i] ?? [], j)
  }
  return { score: at(best, end), indices }
}

/**
 * Matches an item: its shown `value` and its hidden `keywords`. The best score wins; highlight
 * indices only ever point into `value` (a keyword-only match highlights nothing).
 */
export function matchItem(
  value: string,
  keywords: readonly string[] | undefined,
  query: string,
): FuzzyMatch | null {
  const own = fuzzyMatch(value, query)
  let score = own ? own.score : NONE
  for (const word of keywords ?? []) {
    const hit = fuzzyMatch(word, query)
    if (hit && hit.score > score) score = hit.score
  }
  return score === NONE ? null : { score, indices: own ? own.indices : [] }
}
