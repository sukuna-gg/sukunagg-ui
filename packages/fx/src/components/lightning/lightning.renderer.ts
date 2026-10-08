import { cssColor, type Rgb } from '../../internal/color'
import type { FxRenderer } from '../../internal/loop'
import { FRAGMENT, type LightningUniform, UNIFORMS, VERTEX } from './lightning.shaders'
import { createStorm, type LightningIntensity } from './lightning.storm'

/** The storm seed: every Lightning plays the same, reproducible storm. */
const SEED = 0x5c0a

/** Default bolt position (fraction of the width) when `--sk-lightning-x` can't be read. */
export const DEFAULT_X = 0.66

/** Read the bolt position from a computed style, clamped to 0–1. */
export function readPosition(style: CSSStyleDeclaration): number {
  const x = Number.parseFloat(style.getPropertyValue('--sk-lightning-x'))
  return Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : DEFAULT_X
}

type Palette = [core: Rgb, glow: Rgb, sky: Rgb, stage: Rgb]

const unit = (palette: Palette): Palette =>
  palette.map(([r, g, b]) => [r / 255, g / 255, b / 255]) as Palette

/**
 * The Lightning WebGL renderer for `useFxCanvas` (`context: 'webgl'`): one fragment shader on a
 * full-screen triangle, its uniforms driven by `createStorm`. Returns fresh state per call (one
 * per mount, StrictMode-safe). `intensity` is read every frame, so a prop change applies live.
 *
 * - `setup` compiles and links the program (again after a context restore); a failed link
 *   returns `false`, so the loop reports `off` and the poster stays.
 * - `theme` reads `--sk-text`, `--sk-accent`, `--sk-accent-deep` and `--sk-bg` from the root.
 * - `resize` reads the bolt position, `--sk-lightning-x`, from the canvas's computed style.
 * - `dispose` frees the program and buffer and, once the canvas has really left the page (not a
 *   StrictMode remount, which keeps the same canvas attached), releases the context itself.
 *
 * @internal
 */
export function createLightningRenderer(
  intensity: () => LightningIntensity,
): FxRenderer<WebGLRenderingContext> {
  const storm = createStorm(SEED)
  let gl: WebGLRenderingContext | undefined
  let program: WebGLProgram | null = null
  let buffer: WebGLBuffer | null = null
  let u = {} as Record<LightningUniform, WebGLUniformLocation | null>
  let x = DEFAULT_X
  // The dark-theme token values (0–255) until `theme` reads the real ones; `rgb` is them in 0–1.
  let colors: Palette = [
    [244, 241, 236],
    [255, 59, 78],
    [176, 18, 33],
    [10, 10, 11],
  ]
  let rgb = unit(colors)

  return {
    setup(context) {
      gl = context
      program = context.createProgram() as WebGLProgram
      for (const [type, source] of [
        [context.VERTEX_SHADER, VERTEX],
        [context.FRAGMENT_SHADER, FRAGMENT],
      ] as const) {
        const shader = context.createShader(type) as WebGLShader
        context.shaderSource(shader, source)
        context.compileShader(shader)
        context.attachShader(program, shader)
        context.deleteShader(shader) // freed with the program
      }
      context.bindAttribLocation(program, 0, 'p')
      context.linkProgram(program)
      // A lost context or a driver that rejects the shader: report `off`, keep the poster.
      if (!context.getProgramParameter(program, context.LINK_STATUS)) return false
      // WebGL's `useProgram` is not a React hook; `.call` keeps hook linters and the RSC guard
      // (src/index.test.ts) from reading it as one.
      context.useProgram.call(context, program)
      buffer = context.createBuffer()
      context.bindBuffer(context.ARRAY_BUFFER, buffer)
      // One triangle that covers the whole clip space.
      context.bufferData(
        context.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        context.STATIC_DRAW,
      )
      context.enableVertexAttribArray(0)
      context.vertexAttribPointer(0, 2, context.FLOAT, false, 0, 0)
      u = {} as typeof u
      for (const name of UNIFORMS) u[name] = context.getUniformLocation(program, name)
      return true
    },
    theme(style) {
      colors = [
        cssColor(style, '--sk-text', colors[0]),
        cssColor(style, '--sk-accent', colors[1]),
        cssColor(style, '--sk-accent-deep', colors[2]),
        cssColor(style, '--sk-bg', colors[3]),
      ]
      rgb = unit(colors)
    },
    resize() {
      x = readPosition(getComputedStyle((gl as WebGLRenderingContext).canvas as HTMLCanvasElement))
    },
    draw(context, { width, height, dt, still }) {
      const s = still ? storm.still() : storm.advance(dt, intensity())
      context.uniform2f(u.R, context.drawingBufferWidth, context.drawingBufferHeight)
      context.uniform1f(u.X, ((x - 0.5) * width) / height)
      context.uniform1f(u.T, s.T)
      context.uniform1f(u.S, s.S)
      context.uniform1f(u.I, s.I)
      context.uniform1f(u.B, s.B)
      context.uniform1f(u.F, s.F)
      context.uniform3f(u.Q, ...s.Q)
      context.uniform3f(u.C0, ...rgb[0])
      context.uniform3f(u.C1, ...rgb[1])
      context.uniform3f(u.C2, ...rgb[2])
      context.uniform3f(u.BG, ...rgb[3])
      context.drawArrays(context.TRIANGLES, 0, 3)
    },
    dispose() {
      if (!gl) return
      const context = gl
      context.deleteBuffer(buffer)
      context.deleteProgram(program)
      // Browsers cap live WebGL contexts (~16 a page); don't wait for GC to free this one. After a
      // tick, so a StrictMode remount (same canvas, still attached) keeps a working context.
      setTimeout(() => {
        if (!(context.canvas as HTMLCanvasElement).isConnected)
          context.getExtension('WEBGL_lose_context')?.loseContext()
      }, 0)
    },
  }
}
