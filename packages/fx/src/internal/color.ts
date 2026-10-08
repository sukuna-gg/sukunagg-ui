/**
 * Theme colors for canvas/WebGL effects. Canvas can't read `var(--sk-accent)`, so a renderer's
 * `theme(style)` resolves the tokens it needs to numbers once, and again on a theme change:
 *
 * ```ts
 * theme(style) {
 *   accent = cssColor(style, '--sk-accent', [255, 59, 78])
 * }
 * // then: ctx.fillStyle = `rgb(${accent})`, or gl.uniform3f(u, ...accent.map((c) => c / 255))
 * ```
 *
 * Hex and `rgb()`/`rgba()` (every color token today) are parsed directly; anything else
 * (`color-mix()`, `oklch()`, named colors) is resolved by a lazily created 1×1 canvas. When that
 * isn't available (happy-dom), the fallback is returned. The fallback is literal by necessity:
 * it is only used when the token can't be read, and should match the dark-theme token value.
 */

/** An sRGB color as `[r, g, b]`, each 0–255. `rgb(${color})` prints it as CSS. */
export type Rgb = [number, number, number]

const HEX = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i
const NUM = String.raw`(\d+(?:\.\d+)?)(?![\d.%])`
const RGB = new RegExp(String.raw`^rgba?\(\s*${NUM}[\s,]+${NUM}[\s,]+${NUM}`, 'i')

let probe: CanvasRenderingContext2D | null | undefined

/**
 * Resolve a CSS color string to `[r, g, b]` (alpha is dropped). Empty or unparseable input
 * returns `fallback`.
 */
export function parseColor(value: string, fallback: Rgb): Rgb {
  const v = value.trim()
  if (!v) return fallback
  const hex = HEX.exec(v)?.[1]
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex
    return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16)) as Rgb
  }
  const rgb = RGB.exec(v)
  if (rgb) return rgb.slice(1, 4).map((n) => Math.min(255, Math.round(Number(n)))) as Rgb
  // Anything else: let a 1×1 canvas resolve it (an invalid value leaves the fallback painted).
  probe ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!probe) return fallback
  probe.clearRect(0, 0, 1, 1)
  probe.fillStyle = `rgb(${fallback})`
  probe.fillStyle = v
  probe.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = probe.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

/** Read the custom property `name` (e.g. `'--sk-accent'`) from a computed style as `[r, g, b]`. */
export function cssColor(style: CSSStyleDeclaration, name: string, fallback: Rgb): Rgb {
  return parseColor(style.getPropertyValue(name), fallback)
}
