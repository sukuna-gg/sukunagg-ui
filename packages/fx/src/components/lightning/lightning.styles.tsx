import { tv } from '../../utils/tv'

/**
 * Slot class map for {@link Lightning}. Pure and server-safe: no hooks, no DOM, no 'use client'.
 *
 * - `root` is the always-dark stage (`data-theme="dark"` is pinned by the component) and a size
 *   container, so the default bolt position can move with the effect's own width.
 * - `stage` holds the effect at `-z-10` inside the `isolate` root: `children` paint above it in
 *   normal flow. It carries `--sk-lightning-x`, which the poster SVGs and the WebGL renderer read.
 * - `glow`/`bolt` are the server-rendered poster bolt (two HTML-level SVGs, blurred with CSS
 *   `filter`); `lightning-glow` (packages/fx/src/styles/lightning.css) is its sky glow.
 * - `canvas` uses the shared loop's crossfade strings (packages/fx/BUILDERS.md § 3). The canvas is
 *   opaque, so the poster under it never needs fading; with `lost`/`off` the canvas fades back out.
 */
export const lightningStyles = tv({
  slots: {
    root: 'group/fx @container relative isolate overflow-hidden bg-bg text-text',
    // DECISION(open): default position 0.66, 0.8 below 720 px (the approved mockup's values).
    stage:
      'pointer-events-none absolute inset-0 -z-10 [--sk-lightning-x:0.66] @max-[720px]:[--sk-lightning-x:0.8]',
    poster: 'absolute inset-0 lightning-glow',
    glow: [
      'absolute top-0 left-[calc(var(--sk-lightning-x)*100%)] h-full w-auto aspect-square -translate-x-1/2',
      'overflow-visible fill-none [stroke-linecap:round] [stroke-linejoin:round]',
      'stroke-accent [stroke-width:12] opacity-80 blur-[2px] drop-shadow-[0_0_5px_var(--sk-accent),0_0_12px_var(--sk-accent)]',
    ],
    glowBranch: '[stroke-width:7.2]',
    bolt: [
      'absolute top-0 left-[calc(var(--sk-lightning-x)*100%)] h-full w-auto aspect-square -translate-x-1/2',
      'overflow-visible fill-none [stroke-linecap:round] [stroke-linejoin:round]',
      'stroke-[color-mix(in_srgb,var(--sk-text)_90%,var(--sk-accent))] [stroke-width:4]',
    ],
    boltBranch: '[stroke-width:2.4]',
    canvas:
      'absolute inset-0 block size-full opacity-0 transition-opacity duration-slow ease-sukuna motion-reduce:transition-none group-data-[state=running]/fx:opacity-100 group-data-[state=paused]/fx:opacity-100 group-data-[state=still]/fx:opacity-100',
  },
})
