/**
 * Motion CSS for the `glitch-text` showpiece (Q39): its `@property`, `@keyframes` and `@utility`
 * blocks, emitted into the generated `theme.css` by `scripts/build-tokens.ts` (in the order
 * fixed by `./index.ts`). Names: `--sk-glitch-text-*`, `sk-glitch-text-*`, `animate-glitch-text-*`.
 *
 * Spec: docs/component-glitch-text.md §4. The base styles are the clean, final text: the slice
 * band (`--sk-glitch-text-y0`/`-y1`) is 0% tall and the fringe copies are clipped shut, so
 * reduced motion (`animate-none`) and browsers without `@property` land on the clean text.
 * Offsets are in `em` so the effect scales with the consumer's font size. The copies move by
 * `text-shadow` (ink overflow), so only the root's own jitter can reach past its box.
 */
// DECISION(open): motion.md carve-out (Q39) — animating clip-path and @property values (rule 2)
// and an idle burst loop (rule 5) go beyond the v1.3 motion rules; recorded in the component doc.
// DECISION(open): burst timing — the approved mockup's values (3.5s period, ~0.37s burst of
// 52.5ms steps, 420ms wipe, 600ms settle), pending owner confirmation; tunable as a patch.
export const css = String.raw`
/* GlitchText (docs/component-glitch-text.md): RGB-split bursts on real text, one per 3.5s. */
@property --sk-glitch-text-y0 {
  syntax: '<percentage>';
  inherits: true;
  initial-value: 0%;
}

@property --sk-glitch-text-y1 {
  syntax: '<percentage>';
  inherits: true;
  initial-value: 0%;
}

@property --sk-glitch-text-dx {
  syntax: '<length>';
  inherits: true;
  initial-value: 0px;
}

@property --sk-glitch-text-k {
  syntax: '<number>';
  inherits: true;
  initial-value: 1;
}

@property --sk-glitch-text-m {
  syntax: '<number>';
  inherits: false;
  initial-value: 1;
}

/* 3.1s clean, then seven 52.5ms positional steps (a ~0.37s burst). Moves glyphs, never flashes. */
@keyframes sk-glitch-text-burst {
  0%,
  88.5% {
    transform: none;
    --sk-glitch-text-y0: 0%;
    --sk-glitch-text-y1: 0%;
    --sk-glitch-text-dx: 0em;
  }
  88.6% {
    transform: translateX(0.06em) skewX(-8deg);
    --sk-glitch-text-y0: 30%;
    --sk-glitch-text-y1: 42%;
    --sk-glitch-text-dx: 0.16em;
  }
  90.1% {
    transform: none;
    --sk-glitch-text-y0: 62%;
    --sk-glitch-text-y1: 70%;
    --sk-glitch-text-dx: -0.12em;
  }
  91.6% {
    transform: translateX(-0.04em);
    --sk-glitch-text-y0: 18%;
    --sk-glitch-text-y1: 27%;
    --sk-glitch-text-dx: 0.1em;
  }
  93.1% {
    transform: none;
    --sk-glitch-text-y0: 50%;
    --sk-glitch-text-y1: 60%;
    --sk-glitch-text-dx: -0.18em;
  }
  94.6% {
    transform: translateX(0.02em) skewX(5deg);
    --sk-glitch-text-y0: 68%;
    --sk-glitch-text-y1: 77%;
    --sk-glitch-text-dx: 0.12em;
  }
  96.1% {
    transform: none;
    --sk-glitch-text-y0: 36%;
    --sk-glitch-text-y1: 44%;
    --sk-glitch-text-dx: -0.08em;
  }
  97.6% {
    --sk-glitch-text-y0: 55%;
    --sk-glitch-text-y1: 60%;
    --sk-glitch-text-dx: 0.06em;
  }
  99.1%,
  100% {
    transform: none;
    --sk-glitch-text-y0: 0%;
    --sk-glitch-text-y1: 0%;
    --sk-glitch-text-dx: 0em;
  }
}

/* The fringe copies: thin offset slices on the same 3.5s clock (clipped shut at rest). */
@keyframes sk-glitch-text-split {
  0%,
  88.5% {
    clip-path: inset(50% 0 50% 0);
    --sk-glitch-text-m: 1;
  }
  88.6% {
    clip-path: inset(8% -0.5em 66% -0.5em);
    --sk-glitch-text-m: 1.3;
  }
  90.1% {
    clip-path: inset(56% -0.5em 22% -0.5em);
    --sk-glitch-text-m: -1;
  }
  91.6% {
    clip-path: inset(28% -0.5em 50% -0.5em);
    --sk-glitch-text-m: 0.7;
  }
  93.1% {
    clip-path: inset(70% -0.5em 8% -0.5em);
    --sk-glitch-text-m: 1.3;
  }
  94.6% {
    clip-path: inset(2% -0.5em 78% -0.5em);
    --sk-glitch-text-m: -0.7;
  }
  96.1% {
    clip-path: inset(42% -0.5em 36% -0.5em);
    --sk-glitch-text-m: 1;
  }
  97.6% {
    clip-path: inset(62% -0.5em 14% -0.5em);
    --sk-glitch-text-m: 1.3;
  }
  99.1%,
  100% {
    clip-path: inset(50% 0 50% 0);
    --sk-glitch-text-m: 1;
  }
}

/* Intro: the split starts doubled and eases back to 1. */
@keyframes sk-glitch-text-k {
  from {
    --sk-glitch-text-k: 2.2;
  }
}

/* Intro: a stepped left-to-right wipe. */
@keyframes sk-glitch-text-wipe {
  0% {
    clip-path: inset(-30% 100% -30% -8%);
  }
  15% {
    clip-path: inset(38% 72% 40% -8%);
  }
  30% {
    clip-path: inset(-30% 52% -30% -8%);
  }
  45% {
    clip-path: inset(20% 30% 50% -8%);
  }
  60% {
    clip-path: inset(-30% 14% 46% -8%);
  }
  75%,
  100% {
    clip-path: inset(-30% 6% -30% -8%);
  }
}

/* Intro: the word lands skewed and springs upright. */
@keyframes sk-glitch-text-settle {
  from {
    transform: translateX(-0.14em) skewX(-14deg);
  }
}

@utility animate-glitch-text-burst {
  animation: sk-glitch-text-burst 3.5s steps(1, end) -3.08s infinite;
}

@utility animate-glitch-text-burst-intro {
  animation:
    sk-glitch-text-burst 3.5s steps(1, end) -3.08s infinite,
    sk-glitch-text-k 700ms ease-out backwards;
}

@utility animate-glitch-text-reveal {
  animation:
    sk-glitch-text-wipe 420ms steps(1, end) backwards,
    sk-glitch-text-settle 600ms var(--sk-ease-spring) backwards;
}

@utility animate-glitch-text-split {
  animation: sk-glitch-text-split 3.5s steps(1, end) -3.08s infinite;
}

@utility animate-glitch-text-split-late {
  animation: sk-glitch-text-split 3.5s steps(1, end) -2.975s infinite;
}

/* The real text, with the y0..y1 band cut out (the shard fills it, displaced). */
@utility glitch-text-cut {
  clip-path: polygon(
    -1em -1em,
    calc(100% + 1em) -1em,
    calc(100% + 1em) var(--sk-glitch-text-y0),
    -0.5em var(--sk-glitch-text-y0),
    -0.5em var(--sk-glitch-text-y1),
    calc(100% + 1em) var(--sk-glitch-text-y1),
    calc(100% + 1em) calc(100% + 1em),
    -1em calc(100% + 1em)
  );
}

@utility glitch-text-glow {
  text-shadow: 0 0 0.45em color-mix(in oklab, var(--sk-accent-glow) 45%, transparent);
}

/* The copies are displaced with text-shadow, never translate. A shadow is ink overflow; a moved
   box is scrollable overflow and would blink a scrollbar around a full-width root on every burst.
   Fringe: transparent glyphs whose only paint is one shadow in an explicit tint (a currentColor
   shadow on a transparent fill paints nothing in Firefox, which resolves it against the fill). */
@utility glitch-text-fringe {
  clip-path: inset(50% 0 50% 0);
  -webkit-text-fill-color: transparent;
  text-shadow: calc(var(--sk-glitch-text-side, 1) * var(--sk-glitch-text-m, 1) * var(--sk-glitch-text-k, 1) * -0.06em) 0 var(--sk-glitch-text-tint);
}

/* Shard: the cut band. A size container clipped on the block axis only, so the band's shadows
   can spill sideways while its ink child (below) stays out of sight and out of the scroll area. */
@utility glitch-text-shard {
  container-type: size;
  overflow-y: clip;
  clip-path: inset(var(--sk-glitch-text-y0) -1em calc(100% - var(--sk-glitch-text-y1)) -1em);
}

/* The shard's glyphs keep the consumer's colour as their fill but sit one shard-height (100cqh)
   below, clipped away; the shadows paint them back up into the band, moved by dx. */
@utility glitch-text-shard-ink {
  display: block;
  translate: 0 100cqh;
  text-shadow:
    calc(var(--sk-glitch-text-dx) * var(--sk-glitch-text-k, 1)) -100cqh currentColor,
    calc((var(--sk-glitch-text-dx) - 0.06em) * var(--sk-glitch-text-k, 1)) -100cqh var(--sk-accent),
    calc((var(--sk-glitch-text-dx) + 0.06em) * var(--sk-glitch-text-k, 1)) -100cqh var(--sk-chart-2),
    calc(var(--sk-glitch-text-dx) * var(--sk-glitch-text-k, 1)) -100cqh 0.45em color-mix(in oklab, var(--sk-accent-glow) 45%, transparent);
}

/* Full width of the frame, no bleed past it (a wider box would be scrollable overflow). */
@utility glitch-text-edge {
  top: var(--sk-glitch-text-y1);
  left: 0;
  right: 0;
  height: min(max(1px, 0.04em), calc((var(--sk-glitch-text-y1) - var(--sk-glitch-text-y0)) * 99));
  opacity: 0.75;
  background-image: linear-gradient(
    90deg,
    transparent,
    var(--sk-accent) 22%,
    var(--sk-text) 50%,
    var(--sk-accent) 78%,
    transparent
  );
}

/* Solid stops only: Firefox paints a color-mix() stop in a 3px repeating gradient as one flat
   tint. The slot's opacity-30 fades the layer instead. */
@utility glitch-text-scanlines {
  background-image: repeating-linear-gradient(to bottom, transparent 0 2px, var(--sk-bg) 2px 3px);
}
`
