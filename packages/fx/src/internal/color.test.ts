import { afterEach, describe, expect, it } from 'bun:test'
import { type FxEnv, installFxEnv } from '../../../../test/fx'
import { cssColor, parseColor, type Rgb } from './color'

const FALLBACK: Rgb = [255, 59, 78]

let env: FxEnv | undefined
afterEach(() => {
  env?.restore()
  env = undefined
})

describe('parseColor', () => {
  it('parses hex in every length (alpha dropped)', () => {
    expect(parseColor('#FF3B4E', FALLBACK)).toEqual([255, 59, 78])
    expect(parseColor('#b01221', FALLBACK)).toEqual([176, 18, 33])
    expect(parseColor('#fff', FALLBACK)).toEqual([255, 255, 255])
    expect(parseColor('#0f08', FALLBACK)).toEqual([0, 255, 0])
    expect(parseColor('  #00000080 ', FALLBACK)).toEqual([0, 0, 0])
  })

  it('parses rgb() and rgba(), comma or space separated', () => {
    expect(parseColor('rgba(255, 59, 78, 0.6)', FALLBACK)).toEqual([255, 59, 78])
    expect(parseColor('rgb(10 20.6 300)', FALLBACK)).toEqual([10, 21, 255])
  })

  it('returns the fallback for empty input', () => {
    expect(parseColor('   ', FALLBACK)).toBe(FALLBACK)
  })

  it('returns the fallback when no canvas can resolve the color (happy-dom)', () => {
    expect(parseColor('color-mix(in srgb, red, blue)', FALLBACK)).toBe(FALLBACK)
  })

  it('resolves anything else through a 1×1 canvas', () => {
    env = installFxEnv()
    const value = parseColor('oklch(0.6 0.2 25)', FALLBACK)
    // The fake canvas paints nothing, so its pixel reads back as transparent black.
    expect(value).toEqual([0, 0, 0])
    expect(env.callsTo('fillRect')).toEqual([[0, 0, 1, 1]])
    expect(env.callsTo('getImageData')).toEqual([[0, 0, 1, 1]])
  })
})

describe('cssColor', () => {
  it('reads a custom property from a computed style', () => {
    const el = document.createElement('div')
    el.style.setProperty('--sk-accent', '#d8253a')
    document.body.append(el)
    expect(cssColor(getComputedStyle(el), '--sk-accent', FALLBACK)).toEqual([216, 37, 58])
    expect(cssColor(getComputedStyle(el), '--sk-missing', FALLBACK)).toBe(FALLBACK)
    el.remove()
  })
})
