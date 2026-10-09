import { type ComponentPropsWithoutRef, forwardRef, type ReactNode } from 'react'
import { type RetroGridStyleProps, retroGridStyles } from './retro-grid.styles'

/** Props for {@link RetroGrid}: native `<div>` attributes plus the options below. */
export interface RetroGridProps extends ComponentPropsWithoutRef<'div'>, RetroGridStyleProps {
  /**
   * How fast the floor scrolls toward the viewer: one grid cell per 2.4s (`'slow'`), 1.2s
   * (`'normal'`) or 0.6s (`'fast'`). The spotlights and the horizon wave keep their own tempo.
   * @default 'normal'
   */
  speed?: 'slow' | 'normal' | 'fast'
  /**
   * Overlay content (hero copy, CTAs), centred in the sky above the horizon. The root is an
   * inline-size container, so this content can size itself with `cqi` units or `@container`
   * variants. Optional: without it the grid is a plain backdrop.
   */
  children?: ReactNode
}

/**
 * A synthwave arena backdrop for hero sections: a crimson perspective grid scrolls toward the
 * viewer under a glowing horizon, two spotlights sway in the sky and a light wave rolls out of the
 * horizon every 6 seconds.
 *
 * @remarks
 * - SSR/RSC: static and RSC-safe (no `'use client'`). The motion is CSS keyframes from the
 *   generated `theme.css`: no hooks, no DOM access, no JS.
 * - Accessibility: every decorative layer sits in one `aria-hidden`, `pointer-events-none` scene;
 *   only `children` are exposed. The root is a plain `<div>` (wrap it in a `<section>`/`<header>`
 *   or pass `role`/`aria-label`). Reduced motion (`motion-reduce:`) stops every loop and removes
 *   the wave, leaving a still, lit grid. The only brightness change is one horizon flare per 6s.
 *   Contrast: `text-text` clears 8:1 across the sky; inside the horizon glow `text-text-dim` dips
 *   below 4.5:1, so set small secondary text near the horizon in `text-text/70` or stronger.
 * - Theming: built from `--sk-*` tokens and designed for both themes (a night arena in dark, a pale
 *   dawn sky over a bone floor in light). A dark region nested in a light page stays dark.
 * - Layout: fills its container's width with a default `min-h-96`; size it with a `min-h-*` class
 *   (`min-h-[420px]`, `min-h-svh`), which replaces the default (a smaller `h-*` alone can't undercut
 *   it). The floor reaches both sides at any size, full-viewport heroes included. The horizon sits
 *   at 62% of the height and `children` fill the sky above it (inset 24px from the top); taller
 *   content grows the grid. A fixed `h-*` can't grow, so content taller than its sky spills past
 *   the horizon onto the floor: prefer `min-h-*`. Below 560px of width the cells shrink.
 * - Variants: `speed`: 'slow' | 'normal' (default) | 'fast', mapped to literal
 *   `animate-retro-grid-scroll*` utilities.
 * - The ref points at the root `<div>`; `className` merges last; the root carries
 *   `data-sk-retro-grid`.
 *
 * @example
 * ```tsx
 * import { RetroGrid } from '@sukunagg/ui'
 *
 * <RetroGrid className="min-h-[420px] rounded-lg">
 *   <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">
 *     Sukuna Invitational
 *   </p>
 *   <h1 className="font-display text-[clamp(48px,14cqi,112px)] font-black uppercase">Arena</h1>
 *   <p className="text-md text-text/70">Oct 24–27 · Seoul</p>
 * </RetroGrid>
 * ```
 */
export const RetroGrid = forwardRef<HTMLDivElement, RetroGridProps>(function RetroGrid(
  { speed, className, children, ...rest },
  ref,
) {
  const s = retroGridStyles({ speed })
  return (
    <div ref={ref} data-sk-retro-grid="" className={s.root({ className })} {...rest}>
      <div aria-hidden="true" className={s.scene()}>
        <div className={s.sky()}>
          <span className={s.beam({ className: s.beamLeft() })} />
          <span className={s.beam({ className: s.beamRight() })} />
        </div>
        <div className={s.floor()}>
          <div className={s.plane()} />
          <div className={s.near()}>
            <div className={s.nearPlane()} />
          </div>
          <div className={s.sweep()} />
        </div>
        <div className={s.horizon()}>
          <span className={s.glow()} />
          <span className={s.line()} />
        </div>
        <span className={s.vignette()} />
      </div>
      <div className={s.content()}>{children}</div>
    </div>
  )
})
