import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import * as api from './index'

describe('public API', () => {
  it('re-exports every component directory', () => {
    const componentsDir = new URL('./components', import.meta.url)
    const indexSrc = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')
    const dirs = readdirSync(componentsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
    expect(dirs.filter((name) => !indexSrc.includes(`/components/${name}'`))).toEqual([])
  })

  it('exports the seven charts', () => {
    expect(Object.keys(api).sort()).toEqual([
      'AreaChart',
      'BarChart',
      'DataBar',
      'DonutChart',
      'Heatmap',
      'LineChart',
      'RadialGauge',
    ])
  })
})

// RSC boundary (CLAUDE.md rule 5): charts are server components; only the interaction island is a
// client module. A logic file that calls a hook must be client, one that calls none must not be.
describe('RSC boundary', () => {
  const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8')
  const files = [
    ...readdirSync(new URL('./components/', import.meta.url), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => `./components/${d.name}/${d.name}.logic.tsx`),
    './internal/frame.tsx',
    './internal/interaction.tsx',
  ].map((rel) => {
    const raw = read(rel)
    const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    return { rel, client: /^'use client'/.test(raw), hooks: /\buse[A-Z]\w*(<[^>]*>)?\(/.test(src) }
  })

  it('marks every hook-using file as a client module', () => {
    expect(files.filter((f) => f.hooks && !f.client).map((f) => f.rel)).toEqual([])
  })

  it('keeps every chart and the frame on the server', () => {
    expect(files.filter((f) => f.client).map((f) => f.rel)).toEqual(['./internal/interaction.tsx'])
  })
})
