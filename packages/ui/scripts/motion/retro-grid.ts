/**
 * Motion CSS for the `retro-grid` showpiece (Q39): its `@property`, `@keyframes` and `@utility`
 * blocks, emitted into the generated `theme.css` by `scripts/build-tokens.ts` (in the order
 * fixed by `./index.ts`). Names: `--sk-retro-grid-*`, `sk-retro-grid-*`, `animate-retro-grid-*`.
 *
 * Layout (position, size, insets, container variants) lives in `retro-grid.styles.tsx`; this file
 * holds the paint (gradients, masks, 3D) and the four loops. Spec: component-retro-grid.md §4.
 */
// DECISION(open): theme-aware palette via a light-scheme selector in `retro-grid-stage` (the tokens
// carry no scheme switch); future light-scheme themes (`paper`) must join it, or move to
// `light-dark()` once theme blocks set `color-scheme` (docs/component-retro-grid.md §11).
export const css = String.raw`
/* RetroGrid (docs/component-retro-grid.md): a perspective floor scrolling toward the viewer. */
@utility retro-grid-stage {
  /* Component-private palette, mixed from tokens. Dark scheme is the default. */
  --sk-retro-grid-horizon: 62%;
  --sk-retro-grid-line: color-mix(in srgb, var(--sk-accent) 54%, transparent);
  --sk-retro-grid-sub: color-mix(in srgb, var(--sk-accent) 13%, transparent);
  --sk-retro-grid-ground: color-mix(in oklab, var(--sk-well) 65%, var(--sk-bg));
  --sk-retro-grid-soft: color-mix(in srgb, var(--sk-accent) 36%, transparent);
  --sk-retro-grid-halo: color-mix(in srgb, var(--sk-accent) 20%, transparent);
  --sk-retro-grid-beam: color-mix(in srgb, var(--sk-accent) 20%, transparent);
  --sk-retro-grid-sky: color-mix(in oklab, var(--sk-accent-deep) 38%, var(--sk-bg));
  --sk-retro-grid-core: color-mix(in oklab, var(--sk-accent) 35%, var(--sk-text));
  --sk-retro-grid-vignette: var(--sk-well);
  /* Light scheme: a pale dawn sky, crimson ink on a bone floor (not an inversion). Applies under a
     light ancestor (or on a light root) unless a dark region sits between them. */
  :where([data-theme='light'])
    &:not(
      :where(
        [data-theme='light'] [data-theme='dark'],
        [data-theme='light'] [data-theme='dark'] *
      )
    ),
  &:where([data-theme='light']) {
    --sk-retro-grid-soft: color-mix(in srgb, var(--sk-accent) 28%, transparent);
    --sk-retro-grid-halo: color-mix(in srgb, var(--sk-accent) 11%, transparent);
    --sk-retro-grid-beam: color-mix(in srgb, var(--sk-accent) 8%, transparent);
    --sk-retro-grid-sky: color-mix(in oklab, var(--sk-accent) 15%, var(--sk-bg));
    --sk-retro-grid-core: var(--sk-accent);
    --sk-retro-grid-vignette: var(--sk-bg);
  }
  background-image: linear-gradient(
    to bottom,
    var(--sk-bg) 28%,
    var(--sk-retro-grid-sky) var(--sk-retro-grid-horizon),
    var(--sk-retro-grid-ground) var(--sk-retro-grid-horizon)
  );
}

/* Sky: an arena spotlight rising from the horizon (rotated about its foot). */
@utility retro-grid-beam {
  background-image: conic-gradient(
    from -12deg at 50% 100%,
    transparent,
    var(--sk-retro-grid-beam) 9deg 15deg,
    transparent 24deg
  );
  -webkit-mask-image: linear-gradient(to top, black 15%, transparent 95%);
  mask-image: linear-gradient(to top, black 15%, transparent 95%);
}

/* Floor: tilted planes in a perspective box. perspective-origin.y = 150px * tan(15deg) puts the
   vanishing line exactly on the box's top edge, i.e. the horizon. Mask stops are alpha only. */
@utility retro-grid-floor {
  perspective: 150px;
  perspective-origin: 50% 40.2px;
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 11%,
    rgb(0 0 0 / 22%) 30%,
    rgb(0 0 0 / 65%) 50%,
    black 78%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 11%,
    rgb(0 0 0 / 22%) 30%,
    rgb(0 0 0 / 65%) 50%,
    black 78%
  );
}

/* The near-floor box: same projection, a screen-space mask that keeps the crisp plane close. */
@utility retro-grid-near {
  perspective: 150px;
  perspective-origin: 50% 40.2px;
  -webkit-mask-image: linear-gradient(to bottom, transparent 26%, black 82%);
  mask-image: linear-gradient(to bottom, transparent 26%, black 82%);
}

/* The shared resting tilt of every floor layer (the keyframes keep it). A layer may be drawn as a
   1/zoom scale model of its plane (--sk-retro-grid-zoom, default 1): the scale() restores its size
   on the same plane, and the translations before it stay in full-size pixels. */
@utility retro-grid-tilt {
  transform-origin: 50% 100%;
  transform: rotateX(75deg) scale(var(--sk-retro-grid-zoom, 1));
}

/* 3D layers get no mipmaps, so the long far plane carries only soft, wide line profiles (they
   survive heavy minification near the horizon). It is a quarter-scale model (zoom 4): its plane
   must be about 10x the container's width so its side edges stay hidden by the floor mask, and the
   soft lines lose nothing when the browser rasterizes them below full size. */
@utility retro-grid-plane {
  background-image:
    linear-gradient(
      90deg,
      transparent calc(50% - 7px / var(--sk-retro-grid-zoom, 1)),
      var(--sk-retro-grid-soft),
      transparent calc(50% + 7px / var(--sk-retro-grid-zoom, 1))
    ),
    linear-gradient(
      0deg,
      transparent calc(50% - 12px / var(--sk-retro-grid-zoom, 1)),
      var(--sk-retro-grid-soft),
      transparent calc(50% + 12px / var(--sk-retro-grid-zoom, 1))
    );
  background-size: calc(var(--sk-retro-grid-cell) / var(--sk-retro-grid-zoom, 1))
    calc(var(--sk-retro-grid-cell) / var(--sk-retro-grid-zoom, 1));
  background-position: 50% 100%;
}

/* Crisp line cores plus a faint mid-cell depth grid, on the masked near plane. */
@utility retro-grid-plane-near {
  background-image:
    linear-gradient(90deg, transparent calc(50% - 1px), var(--sk-retro-grid-line) 0 calc(50% + 1px), transparent 0),
    linear-gradient(0deg, transparent calc(50% - 1.5px), var(--sk-retro-grid-line) 0 calc(50% + 1.5px), transparent 0),
    linear-gradient(90deg, var(--sk-retro-grid-sub) 2px, transparent 2px),
    linear-gradient(0deg, var(--sk-retro-grid-sub) 3px, transparent 3px);
  background-size: var(--sk-retro-grid-cell) var(--sk-retro-grid-cell);
  background-position: 50% 100%;
}

/* The light wave the horizon emits, rolling toward the viewer. */
@utility retro-grid-sweep {
  background-image: linear-gradient(
    to top,
    transparent,
    var(--sk-retro-grid-core) 1.5%,
    var(--sk-retro-grid-line) 4%,
    var(--sk-retro-grid-halo) 30%,
    transparent
  );
}

@utility retro-grid-glow {
  background-image: radial-gradient(closest-side, var(--sk-accent-glow), transparent);
}

@utility retro-grid-line {
  background-image: linear-gradient(
    90deg,
    transparent,
    var(--sk-accent) 22%,
    var(--sk-retro-grid-core) 50%,
    var(--sk-accent) 78%,
    transparent
  );
  box-shadow: 0 0 16px 1px var(--sk-accent-glow);
}

@utility retro-grid-vignette {
  background-image: radial-gradient(
    ellipse 80% 95% at 50% 58%,
    transparent 55%,
    color-mix(in srgb, var(--sk-retro-grid-vignette) 70%, transparent)
  );
}

@keyframes sk-retro-grid-scroll {
  from {
    transform: rotateX(75deg) translate3d(0, 0, 0) scale(var(--sk-retro-grid-zoom, 1));
  }
  to {
    transform: rotateX(75deg) translate3d(0, var(--sk-retro-grid-cell), 0)
      scale(var(--sk-retro-grid-zoom, 1));
  }
}

@keyframes sk-retro-grid-sweep {
  0% {
    transform: rotateX(75deg) translate3d(0, -1300px, 0) scale(var(--sk-retro-grid-zoom, 1));
    opacity: 0;
  }
  12% {
    opacity: 1;
  }
  58% {
    transform: rotateX(75deg) translate3d(0, 40px, 0) scale(var(--sk-retro-grid-zoom, 1));
    opacity: 1;
  }
  64%,
  100% {
    transform: rotateX(75deg) translate3d(0, 40px, 0) scale(var(--sk-retro-grid-zoom, 1));
    opacity: 0;
  }
}

@keyframes sk-retro-grid-beam {
  to {
    rotate: var(--sk-retro-grid-to);
  }
}

@keyframes sk-retro-grid-emit {
  0%,
  60%,
  100% {
    opacity: 0.78;
  }
  7% {
    opacity: 1;
  }
}

@utility animate-retro-grid-scroll {
  animation: sk-retro-grid-scroll 1.2s linear infinite;
}

@utility animate-retro-grid-scroll-slow {
  animation: sk-retro-grid-scroll 2.4s linear infinite;
}

@utility animate-retro-grid-scroll-fast {
  animation: sk-retro-grid-scroll 0.6s linear infinite;
}

@utility animate-retro-grid-sweep {
  animation: sk-retro-grid-sweep 6s linear 1s infinite;
}

@utility animate-retro-grid-beam {
  animation: sk-retro-grid-beam 9s ease-in-out var(--sk-retro-grid-delay, 0s) infinite alternate;
}

@utility animate-retro-grid-emit {
  animation: sk-retro-grid-emit 6s ease-out 1s infinite;
}
`
