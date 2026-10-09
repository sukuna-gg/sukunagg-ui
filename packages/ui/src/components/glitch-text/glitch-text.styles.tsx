import { tv } from '../../utils/tv'

/** Shared by every `aria-hidden` copy: out of the way of pointer, selection and reduced motion. */
const layer = 'pointer-events-none absolute inset-0 select-none motion-reduce:hidden'

/**
 * Slot class map for {@link GlitchText}. Pure and server-safe: no hooks, no DOM, no 'use client'.
 *
 * The `animate-glitch-text-*` and `glitch-text-*` utilities, the `sk-glitch-text-*` keyframes and
 * the `--sk-glitch-text-*` `@property` registrations are emitted into the generated `theme.css`
 * from `scripts/motion/glitch-text.ts`. The base classes ARE the clean final text: the slice band
 * is 0% tall and the fringes are clipped shut until a keyframe opens them, so
 * `motion-reduce:animate-none` / `motion-reduce:hidden` land on plain glowing text.
 *
 * - `root`: runs the burst clock (transform jitter + the inherited band variables). It takes the
 *   consumer's `className`, padding included.
 * - `frame`: the positioning box for the layers, so they line up with the text whatever padding
 *   or border the root gets.
 * - `text`: the real text, glowing, with the band cut out; the intro wipes it in.
 * - `fringe` / `fringeLate`: accent and `chart-2` copies behind the text (the RGB split), tinted
 *   through `--sk-glitch-text-tint`.
 * - `scanline`: an optional copy whose glyphs are filled with a static line texture.
 * - `shard`: the cut band, displaced on top; `shardInk` holds its glyphs. `edge`: the bright streak
 *   under it.
 *
 * The copies are displaced with `text-shadow`, not `translate`, and the edge stays inside the
 * frame, so a burst never adds scrollable overflow around a full-width root.
 */
export const glitchTextStyles = tv({
  slots: {
    root: 'inline-block motion-reduce:animate-none',
    frame: 'relative isolate block',
    // Forced colors drop text-shadow, so the shard can't fill the band there: keep the text whole.
    text: [
      'relative isolate block glitch-text-cut glitch-text-glow motion-reduce:animate-none',
      'forced-colors:[clip-path:none]',
    ],
    fringe: [
      layer,
      '-z-1 glitch-text-fringe animate-glitch-text-split [--sk-glitch-text-tint:var(--sk-accent)]',
    ],
    fringeLate: [
      layer,
      '-z-1 glitch-text-fringe animate-glitch-text-split-late',
      '[--sk-glitch-text-side:-1] [--sk-glitch-text-tint:var(--sk-chart-2)]',
    ],
    // Solid line stops faded by the layer's opacity (a color-mix stop renders flat in Firefox).
    scanline: [
      'pointer-events-none absolute inset-0 select-none opacity-30 [text-shadow:none]',
      'bg-clip-text [-webkit-background-clip:text] [-webkit-text-fill-color:transparent]',
      'glitch-text-scanlines',
    ],
    shard: [layer, 'z-1 glitch-text-shard'],
    shardInk: 'glitch-text-shard-ink',
    edge: 'pointer-events-none absolute z-2 glitch-text-edge motion-reduce:hidden',
  },
  variants: {
    // The animation sits in a variant so a slot never carries two custom `animate-*` classes
    // (tailwind-merge can't dedupe utilities it doesn't know).
    intro: {
      true: { root: 'animate-glitch-text-burst-intro', text: 'animate-glitch-text-reveal' },
      false: { root: 'animate-glitch-text-burst' },
    },
  },
  defaultVariants: { intro: true },
})
