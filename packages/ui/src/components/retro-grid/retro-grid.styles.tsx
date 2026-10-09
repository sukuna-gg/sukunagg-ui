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
    // A plane of width X shows its side edges at the frame's sides W/X of the way down the floor
    // (W = container width), so each plane is wide enough for its mask to hide them at any W: the
    // far plane and the wave 10W (the floor mask is clear down to 11%), the near plane 4W (its own
    // mask is clear down to 26%), never under the 6000px that small stages need. The far plane is
    // a quarter-scale model (zoom 4) of its 1500px-deep plane, which keeps its raster memory near
    // the old fixed 6000px plane's; its soft lines don't need full resolution.
    plane: [
      'retro-grid-plane retro-grid-tilt absolute bottom-0 left-1/2 h-[375px] w-[max(1500px,250%)]',
      '-ml-[max(750px,125%)] [--sk-retro-grid-zoom:4] motion-reduce:animate-none',
    ],
    near: 'retro-grid-near absolute inset-0',
    nearPlane: [
      'retro-grid-plane-near retro-grid-tilt absolute bottom-0 left-1/2 w-[max(6000px,400%)]',
      '-ml-[max(3000px,200%)] h-[calc(var(--sk-retro-grid-cell)*10)] motion-reduce:animate-none',
    ],
    sweep: [
      'retro-grid-sweep retro-grid-tilt absolute bottom-0 left-1/2 h-[260px] w-[max(6000px,1000%)]',
      '-ml-[max(3000px,500%)] opacity-0 animate-retro-grid-sweep motion-reduce:hidden',
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
      'px-4 pt-6 pb-7.5 text-center',
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
