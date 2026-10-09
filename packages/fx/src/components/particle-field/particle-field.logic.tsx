import { type ComponentPropsWithoutRef, forwardRef, type ReactNode } from 'react'
import { ParticleFieldCanvas } from './particle-field.canvas'
import type { ParticleFieldDensity, ParticleFieldTone } from './particle-field.sim'
import { particleFieldStyles } from './particle-field.styles'

/** Props for {@link ParticleField}: native `<div>` attributes plus the options below. */
export interface ParticleFieldProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /**
   * How many embers rise: `'low'` (about half) for busy overlays or small stages, `'high'`
   * (about 1.6×) for a sparse page with a big hero. Changing it restarts the scene.
   * @default 'medium'
   */
  density?: ParticleFieldDensity
  /**
   * The ember palette: `'accent'` is crimson embers with bone-white cores; `'premium'` is
   * amber embers with bone cores (a premium tier, a gold reward). Changing it restarts the scene.
   * @default 'accent'
   */
  tone?: ParticleFieldTone
  /**
   * Hold the current frame and schedule no animation frames (e.g. while a dialog covers the
   * hero). It already pauses on its own off-screen and in a hidden tab.
   * @default false
   */
  paused?: boolean
  /**
   * Overlay content (hero copy, calls to action), rendered above the effect in a
   * `relative h-full` wrapper. Start-aligned copy sits on the darker side of the stage.
   */
  children?: ReactNode
}

/**
 * An always-dark hero stage where embers rise out of a glowing haze behind your content: season
 * launches, event banners, landing heroes.
 *
 * @remarks
 * - SSR/RSC: a server component (no `'use client'`). The server renders a CSS poster (the haze
 *   and a few still embers), so the first paint and no-JS visitors see the finished look; a small
 *   client island then draws a few hundred embers on a Canvas 2D through the shared fx loop and
 *   crossfades in. With no 2D context the poster stays (`data-state="off"`).
 * - Theme: always dark. The root pins `data-theme="dark"`, so `text-text`, `text-text-dim` and
 *   every `--sk-*` token inside resolve to their dark values in both page themes.
 * - Accessibility: every effect layer is `aria-hidden`; `children` stay ordinary, readable DOM.
 *   Reduced motion draws one still frame and stops the haze; the loop pauses off-screen and in
 *   hidden tabs; `paused` stops it on demand. No flashing.
 * - Variants: `tone`: 'accent' (default) | 'premium'; `density`: 'low' | 'medium' (default) |
 *   'high'.
 * - Composition: the plume rises on the end side (right, or left under `dir="rtl"`) and a scrim
 *   shades the start side, so start-aligned copy stays legible. The canvas reads the direction
 *   once, at mount (the CSS layers follow `dir` live): if your app flips `dir` without
 *   remounting, key the stage on it (`<ParticleField key={dir} …>`).
 * - The root `<div>` gets the ref; give it a height and a radius through `className`, which
 *   merges last. The shared loop owns its `data-state` (`running`, `paused`, `still`, `off`).
 *
 * @example
 * ```tsx
 * import { ParticleField } from '@sukunagg/fx'
 * import { Button } from '@sukunagg/ui'
 *
 * <ParticleField className="h-96 rounded-lg">
 *   <div className="flex h-full max-w-xl flex-col justify-center gap-4 px-12">
 *     <p className="text-xs font-semibold uppercase tracking-eyebrow text-text-dim">Season 07</p>
 *     <h2 className="font-display text-3xl font-black uppercase">Crimson Ascent</h2>
 *     <Button size="lg">Play now</Button>
 *   </div>
 * </ParticleField>
 * ```
 */
export const ParticleField = forwardRef<HTMLDivElement, ParticleFieldProps>(function ParticleField(
  { density = 'medium', tone = 'accent', paused = false, className, children, ...rest },
  ref,
) {
  const s = particleFieldStyles({ tone })
  return (
    <div
      ref={ref}
      className={s.root({ className })}
      {...rest}
      data-sk-fx="particle-field"
      data-theme="dark"
    >
      <div aria-hidden="true" className={s.haze()} />
      <div aria-hidden="true" className={s.embers()} />
      <ParticleFieldCanvas
        key={`${tone}:${density}`}
        density={density}
        tone={tone}
        paused={paused}
      />
      <div aria-hidden="true" className={s.scrim()} />
      {children != null && <div className={s.content()}>{children}</div>}
    </div>
  )
})
