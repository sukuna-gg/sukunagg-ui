/**
 * Motion CSS for the `border-beam` showpiece (Q39): its `@property`, `@keyframes` and `@utility`
 * blocks, emitted into the generated `theme.css` by `scripts/build-tokens.ts` (in the order
 * fixed by `./index.ts`). Names: `--sk-border-beam-*`, `sk-border-beam-*`, `animate-border-beam-*`.
 *
 * One registered angle, animated by one keyframe, drives three conic-gradient layers (ring, glow,
 * sheen). Colors come from the `--sk-border-beam-*` variables that `border-beam.styles.tsx` sets
 * per tone from `--sk-*` tokens; `black` in the masks is an alpha mask, never a painted color.
 */
export const css = String.raw`
/* BorderBeam (docs/component-border-beam.md): a light that orbits the border. */
@property --sk-border-beam-angle {
  syntax: '<angle>';
  inherits: true;
  initial-value: 0deg;
}

@keyframes sk-border-beam-orbit {
  to {
    --sk-border-beam-angle: 360deg;
  }
}

/* One lap per --sk-border-beam-duration; --sk-border-beam-phase (0-1) starts it part-way round. */
@utility animate-border-beam-orbit {
  animation: sk-border-beam-orbit var(--sk-border-beam-duration, 4s) linear
    calc(var(--sk-border-beam-phase, 0) * var(--sk-border-beam-duration, 4s) * -1) infinite;
}

/*
 * The stroke: a long fading tail, full color, then the hot head, masked to a 1.5px ring. The layer
 * is a size container (it is absolutely inset, so containment never changes the card's layout):
 * on a wide, short card (or a tall, narrow one) a constant-angle sweep races along the long edges,
 * so the tail gets shorter there.
 */
@utility border-beam-ring {
  container-type: size;
  filter: drop-shadow(0 0 1.5px var(--sk-border-beam-color));

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1.5px;
    background: conic-gradient(
      from var(--sk-border-beam-angle),
      transparent 0 58%,
      color-mix(in oklab, var(--sk-border-beam-color) 14%, transparent) 72%,
      color-mix(in oklab, var(--sk-border-beam-color) 62%, transparent) 88%,
      var(--sk-border-beam-color) 95%,
      var(--sk-border-beam-head) 99%,
      transparent 100%
    );
    -webkit-mask:
      linear-gradient(black 0 0) content-box,
      linear-gradient(black 0 0);
    -webkit-mask-composite: xor;
    mask:
      linear-gradient(black 0 0) content-box,
      linear-gradient(black 0 0);
    mask-composite: exclude;
  }

  @container (aspect-ratio > 3 / 2) or (aspect-ratio < 2 / 3) {
    &::before {
      background: conic-gradient(
        from var(--sk-border-beam-angle),
        transparent 0 74%,
        color-mix(in oklab, var(--sk-border-beam-color) 14%, transparent) 84%,
        color-mix(in oklab, var(--sk-border-beam-color) 62%, transparent) 92%,
        var(--sk-border-beam-color) 96.5%,
        var(--sk-border-beam-head) 99%,
        transparent 100%
      );
    }
  }

  /* Reduced motion: no orbit (animate-none in the class map); a still, quiet full-border tint. */
  @media (prefers-reduced-motion: reduce) {
    &::before {
      background: color-mix(in oklab, var(--sk-border-beam-color) 34%, transparent);
    }
  }
}

/*
 * A soft bloom riding the head. The blur sits on the layer so the ring mask can't clip it; the
 * beam-colored drop-shadow after it (as on the ring and the sheen) deepens the bloom's core.
 */
@utility border-beam-glow {
  filter: blur(9px) drop-shadow(0 0 1.5px var(--sk-border-beam-color));

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 6px;
    background: conic-gradient(
      from var(--sk-border-beam-angle),
      transparent 0 80%,
      var(--sk-border-beam-glow) 93%,
      var(--sk-border-beam-bloom) 99%,
      transparent 100%
    );
    -webkit-mask:
      linear-gradient(black 0 0) content-box,
      linear-gradient(black 0 0);
    -webkit-mask-composite: xor;
    mask:
      linear-gradient(black 0 0) content-box,
      linear-gradient(black 0 0);
    mask-composite: exclude;
  }
}

/* A faint searchlight sheen inside the card, strongest near the edge it lights. */
@utility border-beam-sheen {
  filter: drop-shadow(0 0 1.5px var(--sk-border-beam-color));
  background: conic-gradient(
    from var(--sk-border-beam-angle),
    transparent 0 76%,
    light-dark(
        color-mix(in oklab, var(--sk-border-beam-color) 5%, transparent),
        color-mix(in oklab, var(--sk-border-beam-color) 11%, transparent)
      )
      96.5%,
    transparent 100%
  );
  -webkit-mask: radial-gradient(farthest-side, transparent 45%, black);
  mask: radial-gradient(farthest-side, transparent 45%, black);
}
`
