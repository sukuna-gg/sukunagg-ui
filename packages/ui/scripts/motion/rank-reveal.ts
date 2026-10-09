/**
 * Motion CSS for the `rank-reveal` showpiece (Q39): its `@property`, `@keyframes` and `@utility`
 * blocks, emitted into the generated `theme.css` by `scripts/build-tokens.ts` (in the order
 * fixed by `./index.ts`). Names: `--sk-rank-reveal-*`, `sk-rank-reveal-*`, `animate-rank-reveal-*`.
 *
 * Every keyframe states only where a part *starts* (and peaks); the part's own utilities are the
 * final frame, so `motion-reduce:animate-none` (and any browser that skips the animation) lands on
 * the finished reveal. Shape values come from component-local variables set by literal classes in
 * `rank-reveal.styles.tsx`, so one keyframe serves many parts (8 keyframes, no `@property`).
 * Spec: docs/component-rank-reveal.md §4.
 */
export const css = String.raw`
/* RankReveal (Q39): plays once on mount, replay = remount (key). docs/component-rank-reveal.md */
@keyframes sk-rank-reveal-enter {
  from {
    opacity: var(--sk-rank-reveal-o, 0);
    scale: var(--sk-rank-reveal-s, 1);
    translate: var(--sk-rank-reveal-y, 0);
    stroke-dashoffset: var(--sk-rank-reveal-dash, 0);
  }
}

@keyframes sk-rank-reveal-pop {
  0% {
    opacity: 0;
    scale: var(--sk-rank-reveal-from, 0);
    rotate: var(--sk-rank-reveal-r0, 0deg);
  }
  45% {
    opacity: 1;
    scale: var(--sk-rank-reveal-peak, 1);
  }
}

@keyframes sk-rank-reveal-burst {
  0% {
    opacity: 0;
    transform: var(--sk-rank-reveal-t0, none);
  }
  12% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: var(--sk-rank-reveal-t1, none);
  }
}

@keyframes sk-rank-reveal-flash {
  0% {
    filter: brightness(1.5);
  }
  30% {
    filter: brightness(2.8) saturate(0.7);
  }
}

@keyframes sk-rank-reveal-sheen {
  from {
    background-position: 100% 0;
  }
}

@keyframes sk-rank-reveal-spin {
  to {
    rotate: 360deg;
  }
}

@keyframes sk-rank-reveal-breathe {
  to {
    opacity: 0.62;
  }
}

/* A copy line's slot: clipped at its bottom edge while the text rises, then released. */
@keyframes sk-rank-reveal-slot {
  0%,
  85% {
    clip-path: inset(-40px -60px 0);
  }
  to {
    clip-path: inset(-40px -60px -40px);
  }
}

/* The timeline: one utility per part, literal timings (settles by ~2.4s, when glint-alt ends). */
@utility animate-rank-reveal-rays {
  animation:
    sk-rank-reveal-enter 1s var(--sk-ease) both,
    sk-rank-reveal-spin 90s linear infinite;
}

@utility animate-rank-reveal-rays-alt {
  animation:
    sk-rank-reveal-enter 1.3s var(--sk-ease) 0.1s both,
    sk-rank-reveal-spin 140s linear infinite reverse;
}

@utility animate-rank-reveal-halo {
  animation:
    sk-rank-reveal-pop 1.2s var(--sk-ease) both,
    sk-rank-reveal-breathe 3.6s ease-in-out 1.4s infinite alternate;
}

@utility animate-rank-reveal-crest {
  animation: sk-rank-reveal-enter 0.9s var(--sk-ease-spring) 0.12s both;
}

@utility animate-rank-reveal-flash {
  animation: sk-rank-reveal-flash 0.8s ease-out 0.12s both;
}

/* No fill: a wave is invisible until its delay ends (its base frame is opacity 0). */
@utility animate-rank-reveal-wave {
  animation: sk-rank-reveal-enter 0.9s cubic-bezier(0.1, 0.7, 0.2, 1) 0.32s;
}

@utility animate-rank-reveal-wave-alt {
  animation: sk-rank-reveal-enter 1.25s cubic-bezier(0.1, 0.7, 0.2, 1) 0.42s;
}

@utility animate-rank-reveal-spark {
  animation: sk-rank-reveal-burst 0.75s cubic-bezier(0.2, 0.7, 0.3, 1) 0.34s both;
}

@utility animate-rank-reveal-orbit {
  animation: sk-rank-reveal-enter 0.9s var(--sk-ease) 0.45s both;
}

@utility animate-rank-reveal-ticks {
  animation: sk-rank-reveal-enter 1s ease 0.5s both;
}

@utility animate-rank-reveal-pip {
  animation: sk-rank-reveal-pop 0.5s var(--sk-ease) calc(0.52s + var(--sk-rank-reveal-i, 0) * 65ms) both;
}

@utility animate-rank-reveal-glint {
  animation: sk-rank-reveal-pop 0.8s ease-in-out 1.35s both;
}

@utility animate-rank-reveal-glint-alt {
  animation: sk-rank-reveal-pop 0.8s ease-in-out 1.6s both;
}

@utility animate-rank-reveal-eyebrow {
  animation: sk-rank-reveal-enter 0.6s var(--sk-ease) 0.82s both;
}

@utility animate-rank-reveal-title {
  animation:
    sk-rank-reveal-enter 0.7s var(--sk-ease) 0.94s both,
    sk-rank-reveal-sheen 1s ease-in-out 1.3s both;
}

@utility animate-rank-reveal-line {
  animation: sk-rank-reveal-enter 0.6s var(--sk-ease) 1.08s both;
}

/* No fill: once released the line is unclipped (the title's glow can spread). */
@utility animate-rank-reveal-slot {
  animation: sk-rank-reveal-slot 2s linear;
}

/* Static image layers (too long for one arbitrary class). Never named bg-* (tailwind-merge). */
/* The tone's soft glow behind the crest; it fades out well inside the box, so no seam. */
@utility rank-reveal-glow {
  background-image: radial-gradient(60% 70% at 50% 34%, color-mix(in oklab, var(--sk-rank-reveal-hue) 10%, transparent), transparent 70%);
}

/* Ray fields, interpolated "in srgb": Firefox draws a repeating conic gradient with non-legacy
   (color-mix) stops as dotted hairlines under the default oklab interpolation. A browser without
   gradient interpolation methods (Firefox < 127, Safari < 16.2) drops the "in srgb" declaration
   as invalid, so the plain one before it keeps the rays. */
@utility rank-reveal-rays {
  background-image: repeating-conic-gradient(transparent 0, var(--sk-rank-reveal-glow) 2.5deg 5deg, transparent 7.5deg 15deg);
  background-image: repeating-conic-gradient(in srgb, transparent 0, var(--sk-rank-reveal-glow) 2.5deg 5deg, transparent 7.5deg 15deg);
  mask-image: radial-gradient(closest-side, transparent 9%, black 20%, transparent 78%);
}

@utility rank-reveal-rays-alt {
  background-image: repeating-conic-gradient(from 5deg, transparent 0, color-mix(in oklab, var(--sk-premium) 50%, var(--sk-rank-reveal-hue)) 1deg 2deg, transparent 3deg 20deg);
  background-image: repeating-conic-gradient(from 5deg in srgb, transparent 0, color-mix(in oklab, var(--sk-premium) 50%, var(--sk-rank-reveal-hue)) 1deg 2deg, transparent 3deg 20deg);
  mask-image: radial-gradient(closest-side, transparent 9%, black 20%, transparent 78%);
}

@utility rank-reveal-halo {
  background-image: radial-gradient(closest-side, var(--sk-rank-reveal-glow), color-mix(in oklab, var(--sk-rank-reveal-glow) 28%, transparent) 45%, transparent);
}

@utility rank-reveal-glint {
  background:
    linear-gradient(90deg, transparent, var(--sk-rank-reveal-bone), transparent) 50% / 100% 1.5px no-repeat,
    linear-gradient(transparent, var(--sk-rank-reveal-bone), transparent) 50% / 1.5px 100% no-repeat;
}

@utility rank-reveal-flame {
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='36 28 48 72'%3E%3Cpath fill-rule='evenodd' d='M60 28l10 28 10-12 4 28c0 16-10 28-24 28S36 88 36 72l4-28 10 12zM60 60l7 20c0 8-3 12-7 13-4-1-7-5-7-13z'/%3E%3C/svg%3E") center / 100% 100% no-repeat;
}
`
