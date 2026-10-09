import { type ComponentPropsWithoutRef, forwardRef } from 'react'
import { FlowFieldCanvas } from './flow-field.canvas'
import { flowFieldStyles } from './flow-field.styles'

/** Props for {@link FlowField}: native `<div>` attributes plus the field options below. */
export interface FlowFieldProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * How many particles ride the field, scaled by the stage's area: 'medium' is 600 on a 540 × 320
   * stage, 'low' half that, 'high' 1.6×, each clamped for very small and very large stages.
   * Changing it never remounts the canvas.
   * @default 'medium'
   */
  density?: 'low' | 'medium' | 'high'
  /**
   * Calm the field to a slow, dim drift, for when the player is not queued. Toggling eases between
   * the two looks over about a second; under reduced motion the still frame is redrawn.
   * @default false
   */
  calm?: boolean
  /**
   * Hold the current frame, on top of the automatic pause off-screen and in hidden tabs.
   * @default false
   */
  paused?: boolean
}

/**
 * A matchmaking-screen backdrop where crimson particles stream along a drifting noise field and
 * swirl around the content you centre on it ("Searching for match…", a queue or lobby hero).
 *
 * @remarks
 * - SSR/RSC: a server component (no `'use client'`). The server HTML is the stage, a CSS poster
 *   and your `children`; a small client island mounts the canvas on the shared fx loop after
 *   hydration and crossfades it in. Without JS, or without a 2D context, the poster stays.
 * - Always dark: the root pins `data-theme="dark"` (like VideoPlayer), so the stage and your
 *   children's tokens resolve to the dark palette inside a light app too.
 * - Accessibility: the effect layers are `aria-hidden` decoration; `children` stay readable and
 *   focusable. Particles dim around the centre and a scrim darkens it, so centred text stays
 *   legible. Announce state changes (a match found) from your own live region.
 * - Motion: pauses off-screen and in hidden tabs. `prefers-reduced-motion: reduce` draws one still,
 *   pre-advanced frame and never loops; information you render (a queue timer) is yours to keep
 *   updating. The loop mirrors its state on the root as `data-state`
 *   (`running | paused | still | off`), absent in the server HTML.
 * - Performance: the trails canvas keeps a 1x backing store on any display (its cost follows the
 *   store's pixels) and a resize rescales the painted trails instead of re-simulating them.
 * - Layout: a flex column that centres `children`, at least 320px tall (`min-h-80`); size it with
 *   `className` (`h-dvh`, or `aspect-video min-h-0`), and add `min-h-0` for any stage shorter than
 *   320px. The ref points at the root `<div>`; `className` merges last.
 * - Replay: the field is continuous; remount it with a new `key` to restart from its opening.
 *
 * @example
 * ```tsx
 * import { FlowField } from '@sukunagg/fx'
 *
 * <FlowField calm={!searching} className="h-dvh">
 *   <p className="font-display text-3xl font-bold">Searching for match…</p>
 * </FlowField>
 * ```
 */
export const FlowField = forwardRef<HTMLDivElement, FlowFieldProps>(function FlowField(
  { density = 'medium', calm = false, paused = false, className, children, ...rest },
  ref,
) {
  const s = flowFieldStyles()
  return (
    <div
      ref={ref}
      data-sk-fx="flow-field"
      data-theme="dark"
      className={s.root({ className })}
      {...rest}
    >
      {/* Decoration only. aria-hidden sits on this wrapper, not on the canvases (Biome counts a
          <canvas> as focusable). */}
      <div aria-hidden="true" className={s.stage()}>
        <div className={s.poster()} />
        <FlowFieldCanvas density={density} calm={calm} paused={paused} />
        <div className={s.scrim()} />
      </div>
      {children}
    </div>
  )
})
