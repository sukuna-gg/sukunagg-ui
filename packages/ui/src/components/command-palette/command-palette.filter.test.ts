import { describe, expect, it } from 'bun:test'
import { fuzzyMatch, matchItem, normalizeQuery } from './command-palette.filter'

const match = (text: string, query: string) => fuzzyMatch(text, normalizeQuery(query))

describe('normalizeQuery', () => {
  it('lower-cases, strips accents and drops every space', () => {
    expect(normalizeQuery('  Bahía  #LAN ')).toBe('bahia#lan')
    expect(normalizeQuery('Switch Theme')).toBe('switchtheme')
  })
})

describe('fuzzyMatch', () => {
  it('matches everything with no indices for an empty query', () => {
    expect(fuzzyMatch('Faker', '')).toEqual({ score: 0, indices: [] })
  })

  it('scores +1 per letter, +3 when consecutive, +2 at a word start', () => {
    // f at a word start (1+2), a right after it (1+3).
    expect(match('Faker', 'fa')).toEqual({ score: 7, indices: [0, 1] })
    // Three consecutive letters, the first at a word start.
    expect(match('abc', 'abc')?.score).toBe(3 + 4 + 4)
    // A lone letter inside a word scores 1.
    expect(match('Faker', 'k')).toEqual({ score: 1, indices: [2] })
  })

  it('returns null when the letters are missing or out of order', () => {
    expect(match('Faker', 'xz')).toBeNull()
    expect(match('Faker', 'rf')).toBeNull()
    expect(match('ab', 'abc')).toBeNull()
  })

  it('is case- and accent-insensitive both ways', () => {
    expect(match('Bahía#LAN', 'bahia')?.indices).toEqual([0, 1, 2, 3, 4])
    expect(match('Bahia', 'BAHÍA')?.indices).toEqual([0, 1, 2, 3, 4])
  })

  it('maps decomposed text (a separate combining mark) back to the base letter', () => {
    // "Bahía": the accent is its own code point (index 4) and is never highlighted.
    expect(match('Bahía', 'bahia')?.indices).toEqual([0, 1, 2, 3, 5])
  })

  it('maps a character that folds to several letters back to one index', () => {
    // Hangul syllables decompose into jamo under NFD; the query decomposes the same way.
    expect(match('한국', '한')).toEqual({ score: 3 + 4 + 4, indices: [0] })
  })

  it('ignores the query spaces', () => {
    expect(match('Switch theme', 'sw th')?.indices).toEqual([0, 1, 7, 8])
  })

  it('treats any non-letter, non-digit as a word boundary', () => {
    // t after "#" starts a word; the t inside "Switch" does not.
    expect(match('Switch#theme', 't')?.indices).toEqual([7])
    expect(match('a·b', 'b')?.score).toBe(3)
  })

  it('picks the best placement, not the first one', () => {
    // Greedy would take "st" inside "Last" (5); the word-start run in "Stand" scores 7.
    expect(match('Last Stand', 'st')).toEqual({ score: 7, indices: [5, 6] })
  })

  it('prefers consecutive letters to a later, scattered match', () => {
    // a→b(1) is a run (3 + 4); a→b(3) is a gap (3 + 1).
    expect(match('abxb', 'ab')).toEqual({ score: 7, indices: [0, 1] })
  })
})

describe('matchItem', () => {
  it('matches the value and returns its highlight indices', () => {
    expect(matchItem('Faker', undefined, 'fa')).toEqual({ score: 7, indices: [0, 1] })
  })

  it('matches hidden keywords without highlighting anything', () => {
    expect(matchItem('Preferences', ['settings'], 'set')).toEqual({ score: 11, indices: [] })
  })

  it('takes the best score across value and keywords, keeping the value highlight', () => {
    // In the value "abc" starts mid-word (1+4+4); the keyword starts with it (3+4+4).
    expect(matchItem('xyzabc', ['zz', 'abc'], 'abc')).toEqual({ score: 11, indices: [3, 4, 5] })
  })

  it('returns null when neither matches', () => {
    expect(matchItem('Faker', ['mid', 'kr'], 'zed')).toBeNull()
  })
})
