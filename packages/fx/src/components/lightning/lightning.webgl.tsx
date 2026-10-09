'use client'

import { useRef } from 'react'
import { useFxCanvas } from '../../internal/use-fx-canvas'
import { createLightningRenderer } from './lightning.renderer'
import type { LightningIntensity } from './lightning.storm'

interface LightningCanvasProps {
  intensity: LightningIntensity
  paused: boolean
  className: string
}

/** WebGL context attributes: opaque, no depth/stencil/AA; the frame survives re-composites. */
const ATTRIBUTES: WebGLContextAttributes = {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: true, // the still/paused frame must survive re-composites (WebKit)
  powerPreference: 'low-power',
}

/**
 * The client half of `Lightning`: a `<canvas>` running the WebGL bolt on the shared fx loop. The
 * server renders it as an empty, transparent canvas over the poster; it fades in once the loop has
 * drawn. `intensity` and `paused` apply live (no remount). Rendered only by `Lightning`.
 *
 * @internal
 */
export function LightningCanvas({ intensity, paused, className }: LightningCanvasProps) {
  const live = useRef(intensity)
  live.current = intensity
  const canvas = useFxCanvas(() => createLightningRenderer(() => live.current), {
    context: 'webgl',
    attributes: ATTRIBUTES,
    maxDpr: 1.5, // a full-screen fragment shader is fill-rate bound
    paused,
  })
  return <canvas ref={canvas} className={className} />
}
