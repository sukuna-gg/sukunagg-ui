import { describe, expect, it } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import * as api from './index'

const here = (rel: string) => new URL(rel, import.meta.url)
const read = (rel: string) => readFileSync(here(rel), 'utf8')

const componentDirs = readdirSync(here('./components/'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort()

/**
 * The exact runtime exports, per component directory. Builders: add ONE entry on the line
 * directly under YOUR comment, e.g. `'particle-field': ['ParticleField'],` (value exports only;
 * `export type` names don't appear at runtime). Never edit another effect's line.
 */
const EXPORTS: Record<string, string[]> = {
  // bracket-beam
  'bracket-beam': ['BracketBeam'],
  // flow-field
  'flow-field': ['FlowField'],
  // holo-card
  'holo-card': ['HoloCard'],
  // lightning
  lightning: ['Lightning'],
  // particle-field
}

/**
 * Every `'use client'` module under src/components and src/internal. A component's `.logic.tsx`
 * stays a server component and renders a feature-named client sub-file (build brief §11).
 * Builders: add your client file(s) on the line(s) directly under YOUR comment, e.g.
 * `'./components/particle-field/particle-field.canvas.tsx',`.
 */
const CLIENT_FILES = [
  './internal/use-fx-canvas.ts',
  './internal/use-fx-loop.ts',
  // bracket-beam
  './components/bracket-beam/bracket-beam.measure.tsx',
  // flow-field
  './components/flow-field/flow-field.canvas.tsx',
  // holo-card
  './components/holo-card/holo-card.tilt.tsx',
  // lightning
  './components/lightning/lightning.webgl.tsx',
  // particle-field
]

describe('public API', () => {
  it('re-exports every component directory', () => {
    // Comments don't count: the builder instructions in index.ts quote example export lines.
    const indexSrc = read('./index.ts').replace(/^\s*\/\/.*$/gm, '')
    expect(componentDirs.filter((dir) => !indexSrc.includes(`from './components/${dir}'`))).toEqual(
      [],
    )
  })

  it('lists every component directory in EXPORTS, and nothing else', () => {
    expect(Object.keys(EXPORTS).sort()).toEqual(componentDirs)
  })

  it('exports exactly the listed runtime values', () => {
    expect(Object.keys(api).sort()).toEqual(Object.values(EXPORTS).flat().sort())
  })
})

describe('component files (CLAUDE.md rule 5)', () => {
  it('gives every component the three-file split plus its test and stories', () => {
    const missing = componentDirs.flatMap((dir) =>
      [
        `${dir}.styles.tsx`,
        `${dir}.logic.tsx`,
        'index.tsx',
        `${dir}.test.tsx`,
        `${dir}.stories.tsx`,
      ]
        .map((file) => `./components/${dir}/${file}`)
        .filter((rel) => !existsSync(here(rel))),
    )
    expect(missing).toEqual([])
  })

  it("titles every component's stories `FX/<Name>` (story ids are a contract)", () => {
    const wrong = componentDirs.filter(
      (dir) => !/\btitle: 'FX\/[A-Za-z]+'/.test(read(`./components/${dir}/${dir}.stories.tsx`)),
    )
    expect(wrong).toEqual([])
  })
})

// RSC boundary (CLAUDE.md rule 5): a module that calls a hook must be a client module, and the set
// of client modules is pinned, so a `.logic.tsx` (or a styles file) can't silently go client.
describe('RSC boundary', () => {
  const sources = ['components', 'internal'].flatMap((top) =>
    readdirSync(here(`./${top}/`), { recursive: true, encoding: 'utf8' })
      .map((rel) => `./${top}/${rel.replaceAll('\\', '/')}`)
      .filter((rel) => /\.tsx?$/.test(rel) && !/\.(test|stories)\.tsx?$/.test(rel)),
  )
  const files = sources.map((rel) => {
    const raw = read(rel)
    const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    return { rel, client: /^'use client'/.test(raw), hooks: /\buse[A-Z]\w*(<[^>]*>)?\(/.test(src) }
  })

  it('marks every hook-using module as a client module', () => {
    expect(files.filter((f) => f.hooks && !f.client).map((f) => f.rel)).toEqual([])
  })

  it('has exactly the listed client modules', () => {
    expect(
      files
        .filter((f) => f.client)
        .map((f) => f.rel)
        .sort(),
    ).toEqual([...CLIENT_FILES].sort())
  })
})
