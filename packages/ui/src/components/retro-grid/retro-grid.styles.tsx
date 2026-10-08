import { tv, type VariantProps } from '../../utils/tv'

/**
 * Slot class map for {@link RetroGrid}. Pure and server-safe: no hooks, no DOM, no 'use client'.
 *
 * Layout lives here; paint and motion are the `retro-grid-*` / `animate-retro-grid-*` utilities and
 * `sk-retro-grid-*` keyframes that `scripts/motion/retro-grid.ts` emits into the generated
 * `theme.css`. The resting styles are the reduced-motion frame (a still, lit grid): every animated
 * slot carries exactly one custom `animate-*` class plus its `motion-reduce:` guard, and the scroll
 * animation comes from the `speed` variant so tailwind-merge never has to dedupe two of them.
 */
export const retroGridStyles = tv({
  slots: {
    // `retro-grid-stage` sets the theme-aware palette + `--sk-retro-grid-horizon` (62%); the rows
    // mirror that split so `children` always fill the sky above the horizon.
    root: [
      'retro-grid-stage @container relative isolate grid w-full min-h-96 grid-rows-[62fr_38fr]',
      'overflow-hidden text-text',
    ],
    scene: 'pointer-events-none absolute inset-0',
    sky: 'absolute inset-x-0 top-0 bottom-[calc(100%-var(--sk-retro-grid-horizon))]',
    beam: [
      'retro-grid-beam absolute bottom-0 h-[120%] w-[520px] origin-bottom -translate-x-1/2',
      'rotate-(--sk-retro-grid-from) animate-retro-grid-beam motion-reduce:animate-none',
    ],
    beamLeft:
      'left-[28%] @max-[560px]:left-[18%] [--sk-retro-grid-from:-28deg] [--sk-retro-grid-to:12deg]',
    beamRight: [
      'left-[72%] @max-[560px]:left-[82%] [--sk-retro-grid-from:24deg] [--sk-retro-grid-to:-16deg]',
      '[--sk-retro-grid-delay:-4s]',
    ],
    floor: [
      'retro-grid-floor absolute inset-x-0 top-(--sk-retro-grid-horizon) bottom-0 overflow-hidden',
      '[--sk-retro-grid-cell:72px] @max-[560px]:[--sk-retro-grid-cell:56px]',
    ],
    plane: [
      'retro-grid-plane retro-grid-tilt absolute bottom-0 left-1/2 -ml-[3000px] h-[1500px] w-[6000px]',
      'motion-reduce:animate-none',
    ],
    near: 'retro-grid-near absolute inset-0',
    nearPlane: [
      'retro-grid-plane-near retro-grid-tilt absolute bottom-0 left-1/2 -ml-[3000px] w-[6000px]',
      'h-[calc(var(--sk-retro-grid-cell)*10)] motion-reduce:animate-none',
    ],
    sweep: [
      'retro-grid-sweep retro-grid-tilt absolute bottom-0 left-1/2 -ml-[3000px] h-[260px] w-[6000px]',
      'opacity-0 animate-retro-grid-sweep motion-reduce:hidden',
    ],
    horizon: 'absolute inset-x-0 top-(--sk-retro-grid-horizon) h-0',
    glow: [
      'retro-grid-glow absolute top-0 left-1/2 h-[200px] w-[130%] -translate-x-1/2 -translate-y-1/2',
      'opacity-78 animate-retro-grid-emit motion-reduce:animate-none',
    ],
    line: 'retro-grid-line absolute inset-x-0 -top-px h-0.5',
    vignette: 'retro-grid-vignette absolute inset-0',
    content: [
      'relative z-10 row-start-1 flex min-w-0 flex-col items-center justify-center',
      'px-4 pb-1.5 text-center',
    ],
  },
  variants: {
    // DECISION(open): speed tempos 2.4s / 1.2s / 0.6s per cell (prototype 1.2s, ×2 and ×½ like
    // ShinyText); the wave/flare (6s) and spotlights (9s) keep the prototype's timing.
    speed: {
      slow: {
        plane: 'animate-retro-grid-scroll-slow',
        nearPlane: 'animate-retro-grid-scroll-slow',
      },
      normal: { plane: 'animate-retro-grid-scroll', nearPlane: 'animate-retro-grid-scroll' },
      fast: {
        plane: 'animate-retro-grid-scroll-fast',
        nearPlane: 'animate-retro-grid-scroll-fast',
      },
    },
  },
  defaultVariants: { speed: 'normal' },
})

export type RetroGridStyleProps = VariantProps<typeof retroGridStyles>
