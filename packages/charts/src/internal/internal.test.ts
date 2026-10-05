import { describe, expect, it, spyOn } from 'bun:test'
import {
  colorOf,
  defaultColor,
  devWarn,
  formatter,
  hashId,
  legendColor,
  num,
  titleCase,
} from './data'
import { areaPath, linePath, runs } from './path'
import { bandCenter, bandStart, niceDomain, percent, pointX, tickStep, ticks } from './scale'

describe('scale', () => {
  it('tickStep picks 1/2/5 × 10ⁿ steps like d3', () => {
    expect(tickStep(0, 10, 4)).toBe(2)
    expect(tickStep(0, 100, 10)).toBe(10)
    expect(tickStep(0, 1, 4)).toBe(0.2)
    expect(tickStep(0, 944, 4)).toBe(200)
    expect(tickStep(0, 70, 1)).toBe(50)
    expect(tickStep(10, 0, 4)).toBe(-2)
  })

  it('niceDomain rounds outward and widens empty ranges', () => {
    expect(niceDomain(0, 944)).toEqual([0, 1000])
    expect(niceDomain(1838, 2012)).toEqual([1800, 2050])
    expect(niceDomain(-3420, 4100)).toEqual([-4000, 6000])
    expect(niceDomain(0, 0)).toEqual([0, 1])
    expect(niceDomain(5, 5)).toEqual([4.4, 5.6])
    expect(niceDomain(-2, -2)).toEqual([-2.2, -1.8])
    expect(niceDomain(9, 1)).toEqual([0, 10])
  })

  it('ticks lands on round values without float noise', () => {
    expect(ticks(0, 1000, 4)).toEqual([0, 200, 400, 600, 800, 1000])
    expect(ticks(0, 1, 4)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1])
    expect(ticks(3, 3)).toEqual([3])
  })

  it('percent maps a domain to 0–100 (and centres a zero span)', () => {
    const p = percent(0, 200)
    expect(p(50)).toBe(25)
    expect(p(250)).toBe(125)
    expect(percent(4, 4)(4)).toBe(50)
  })

  it('band and point positions', () => {
    expect(bandCenter(0, 4)).toBe(12.5)
    expect(bandStart(2, 4)).toBe(50)
    expect(pointX(0, 1)).toBe(50)
    expect(pointX(3, 4)).toBe(100)
  })
})

describe('path', () => {
  const pts = [{ x: 0, y: 10 }, { x: 50, y: 0 }, null, { x: 75, y: 5 }, { x: 100, y: 20 }]

  it('runs splits at null and keeps start indices', () => {
    expect(runs(pts).map((r) => [r.start, r.pts.length])).toEqual([
      [0, 2],
      [3, 2],
    ])
    expect(runs([null, null])).toEqual([])
  })

  it('linePath draws one subpath per run of 2+ points', () => {
    expect(linePath(pts)).toBe('M0,10L50,0M75,5L100,20')
    expect(linePath([{ x: 0, y: 0 }, null, { x: 100, y: 1 }])).toBe('')
  })

  it('monotone curves through 3+ points; 2-point runs stay straight', () => {
    const d = linePath(
      [
        { x: 0, y: 100 },
        { x: 50, y: 50 },
        { x: 100, y: 0 },
      ],
      'monotone',
    )
    expect(d.startsWith('M0,100C')).toBe(true)
    expect(d.match(/C/g)).toHaveLength(2)
    expect(d.endsWith('100,0')).toBe(true)
    expect(
      linePath(
        [
          { x: 0, y: 1 },
          { x: 1, y: 2 },
        ],
        'monotone',
      ),
    ).toBe('M0,1L1,2')
    // A peak gets a flat tangent (never overshoots): the control points stay at the peak's y.
    const peak = linePath(
      [
        { x: 0, y: 50 },
        { x: 50, y: 0 },
        { x: 100, y: 50 },
      ],
      'monotone',
    )
    expect(peak).toContain(',0,50,0')
  })

  it('areaPath closes each run along the baseline', () => {
    expect(areaPath(pts, 100)).toBe('M0,100L0,10L50,0L50,100ZM75,100L75,5L100,20L100,100Z')
    expect(
      areaPath(
        [
          { x: 0, y: 1 },
          { x: 50, y: 2 },
          { x: 100, y: 1 },
        ],
        50,
        'monotone',
      ),
    ).toContain('C')
  })
})

describe('data helpers', () => {
  it('num accepts finite numbers only', () => {
    expect(num(3)).toBe(3)
    expect(num(0)).toBe(0)
    for (const v of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY, '3', {}])
      expect(num(v)).toBeNull()
  })

  it('formatter uses Intl options with a fixed locale, or a function', () => {
    expect(formatter(undefined)(1234.5)).toBe('1,234.5')
    expect(formatter({ style: 'percent' })(0.25)).toBe('25%')
    expect(formatter(undefined, 'de-DE')(1234.5)).toBe('1.234,5')
    expect(formatter((v) => `${v} LP`)(64)).toBe('64 LP')
  })

  it('colors: defaults in order, then other; functions per row; legend only for fixed colors', () => {
    expect(defaultColor(0)).toBe('var(--sk-chart-1)')
    expect(defaultColor(5)).toBe('var(--sk-chart-6)')
    expect(defaultColor(6)).toBe('var(--sk-chart-other)')
    const row = { v: 1 }
    expect(colorOf({ key: 'v', label: 'V' }, 1, row, 0)).toBe('var(--sk-chart-2)')
    expect(colorOf({ key: 'v', label: 'V', color: 'red' }, 1, row, 0)).toBe('red')
    expect(colorOf({ key: 'v', label: 'V', color: (_r, i) => `c${i}` }, 0, row, 4)).toBe('c4')
    expect(legendColor({ key: 'v', label: 'V', color: () => 'x' }, 0)).toBeNull()
    expect(legendColor({ key: 'v', label: 'V' }, 2)).toBe('var(--sk-chart-3)')
    expect(legendColor({ key: 'v', label: 'V', color: 'blue' }, 2)).toBe('blue')
  })

  it('titleCase and hashId', () => {
    expect(titleCase('placement')).toBe('Placement')
    expect(hashId('a')).toBe(hashId('a'))
    expect(hashId('a')).not.toBe(hashId('b'))
    expect(hashId('a')).toMatch(/^skc-[0-9a-z]+$/)
  })

  it('devWarn warns in development and is silent in production', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    devWarn('careful')
    expect(warn).toHaveBeenCalledWith('[@sukunagg/charts] careful')
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    devWarn('quiet')
    process.env.NODE_ENV = prev
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})
