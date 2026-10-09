/**
 * Motion CSS for the `loot-reveal` showpiece (Q39): its `@property`, `@keyframes` and `@utility`
 * blocks, emitted into the generated `theme.css` by `scripts/build-tokens.ts` (in the order
 * fixed by `./index.ts`). Names: `--sk-loot-reveal-*`, `sk-loot-reveal-*`, `animate-loot-reveal-*`.
 *
 * The component's base classes ARE the revealed frame; every keyframe's start holds the face-down
 * state, so reduced motion (`motion-reduce:animate-none`), `play={false}` and no-JS all land on
 * the reveal. Card i flips at `--sk-loot-reveal-at` (from `loot-reveal-clock` on its <li>).
 * Spec: docs/component-loot-reveal.md §4.
 */
export const css = String.raw`
/* LootReveal (docs/component-loot-reveal.md §4): 6 keyframes; the base classes are the reveal. */
@keyframes sk-loot-reveal-flip {
  from {
    rotate: y 0deg;
  }
}

@keyframes sk-loot-reveal-pop {
  28% {
    translate: 0 -3.2cqi;
    scale: 1.07;
  }
  70% {
    translate: 0 0.4cqi;
    scale: 0.99;
  }
}

/* Swaps the visible side at mid-flip (Firefox/WebKit otherwise leak the mirrored face). */
@keyframes sk-loot-reveal-side {
  0%,
  11% {
    visibility: var(--sk-loot-reveal-pre);
    animation-timing-function: step-start;
  }
}

/* Shared appear/fade: start values come from each utility; the end is the element's own style. */
@keyframes sk-loot-reveal-bloom {
  0% {
    opacity: var(--sk-loot-reveal-o0, 0);
    scale: var(--sk-loot-reveal-s0, 1);
    rotate: var(--sk-loot-reveal-r0, 0deg);
    translate: var(--sk-loot-reveal-y0, 0 0);
  }
  20% {
    opacity: var(--sk-loot-reveal-o1, 1);
  }
}

/* Legendary back: shakes while it charges up to the rarity color. */
@keyframes sk-loot-reveal-charge {
  20%,
  60% {
    translate: -1.6px 0;
    rotate: -1deg;
    scale: 1.02;
  }
  40%,
  80% {
    translate: 1.6px 0;
    rotate: 1deg;
    scale: 1.03;
  }
  100% {
    color: var(--sk-loot-reveal-color);
    border-color: var(--sk-loot-reveal-color);
    box-shadow:
      var(--sk-shadow-card),
      0 0 28px color-mix(in oklab, var(--sk-loot-reveal-color) 60%, transparent),
      inset 0 0 22px color-mix(in oklab, var(--sk-loot-reveal-color) 35%, transparent);
  }
}

/* One spark: shoots out along its angle, shrinks and fades (move eases out, fade is linear). */
@keyframes sk-loot-reveal-spark {
  0% {
    opacity: 0;
    scale: 1.6 1;
    translate:
      calc(cos(var(--sk-loot-reveal-a)) * var(--sk-loot-reveal-d) * 0.45)
      calc(sin(var(--sk-loot-reveal-a)) * var(--sk-loot-reveal-d) * 0.45);
    animation-timing-function: cubic-bezier(0.08, 0.7, 0.2, 1);
  }
  8%,
  55% {
    opacity: 1;
    animation-timing-function: linear;
  }
  100% {
    opacity: 0;
    scale: 0.2 1;
    translate:
      calc(cos(var(--sk-loot-reveal-a)) * var(--sk-loot-reveal-d))
      calc(sin(var(--sk-loot-reveal-a)) * var(--sk-loot-reveal-d) + 12px);
  }
}

/* When card i flips: a 200ms lead, one step per card, +450ms per legendary charge so far. */
@utility loot-reveal-clock {
  --sk-loot-reveal-at: calc(
    200ms + var(--sk-loot-reveal-i, 0) * var(--sk-loot-reveal-step, 350ms) +
      var(--sk-loot-reveal-charge, 0) * 450ms
  );
}

/* Spark j: a deterministic CSS trig hash spreads 24 sparks around the card (no Math.random). */
@utility loot-reveal-spark {
  --sk-loot-reveal-r: pow(sin(var(--sk-loot-reveal-j, 0) * 83deg), 2);
  --sk-loot-reveal-q: pow(sin(var(--sk-loot-reveal-j, 0) * 137deg), 2);
  --sk-loot-reveal-a: calc(
    var(--sk-loot-reveal-j, 0) * 15deg + sin(var(--sk-loot-reveal-j, 0) * 47deg) * 7deg
  );
  --sk-loot-reveal-d: calc(17cqi + 11cqi * var(--sk-loot-reveal-r));
  --sk-loot-reveal-w: calc(12px + 16px * var(--sk-loot-reveal-q));
  position: absolute;
  rotate: var(--sk-loot-reveal-a);
  opacity: 0;
}

@utility loot-reveal-glow {
  box-shadow:
    var(--sk-shadow-card),
    0 0 22px -2px color-mix(in oklab, var(--sk-loot-reveal-color) 50%, transparent),
    inset 0 0 18px -4px color-mix(in oklab, var(--sk-loot-reveal-color) 45%, transparent);
}

@utility loot-reveal-glow-gilded {
  box-shadow:
    var(--sk-shadow-card),
    0 0 30px color-mix(in oklab, var(--sk-loot-reveal-color) 55%, transparent),
    inset 0 0 0 4px var(--sk-surface-2),
    inset 0 0 0 5px color-mix(in oklab, var(--sk-loot-reveal-color) 60%, transparent),
    inset 0 0 26px -4px color-mix(in oklab, var(--sk-loot-reveal-color) 50%, transparent);
}

@utility loot-reveal-flare {
  box-shadow:
    0 0 60px 6px color-mix(in oklab, var(--sk-loot-reveal-glint) 80%, transparent),
    inset 0 0 0 4px var(--sk-surface-2),
    inset 0 0 0 5px var(--sk-loot-reveal-color),
    inset 0 0 40px color-mix(in oklab, var(--sk-loot-reveal-color) 70%, transparent);
}

@utility animate-loot-reveal-flip {
  animation: sk-loot-reveal-flip 900ms
    linear(
      0,
      0.047 3%,
      0.164 6%,
      0.317 9%,
      0.481 12%,
      0.638 15%,
      0.816 19%,
      0.948 23%,
      1.034 27%,
      1.079 31%,
      1.094 35%,
      1.086 40%,
      1.063 45%,
      1.038 50%,
      1.013 56%,
      0.996 63%,
      0.991 70%,
      0.994 80%,
      1
    )
    var(--sk-loot-reveal-at, 0ms) both;
}

@utility animate-loot-reveal-pop {
  animation: sk-loot-reveal-pop 900ms ease-in-out var(--sk-loot-reveal-at, 0ms);
}

@utility animate-loot-reveal-back {
  --sk-loot-reveal-pre: visible;
  animation: sk-loot-reveal-side 900ms linear var(--sk-loot-reveal-at, 0ms) both;
}

@utility animate-loot-reveal-charge {
  --sk-loot-reveal-pre: visible;
  animation:
    sk-loot-reveal-charge 450ms linear calc(var(--sk-loot-reveal-at, 0ms) - 450ms) both,
    sk-loot-reveal-side 900ms linear var(--sk-loot-reveal-at, 0ms) both;
}

@utility animate-loot-reveal-face {
  --sk-loot-reveal-pre: hidden;
  animation: sk-loot-reveal-side 900ms linear var(--sk-loot-reveal-at, 0ms) both;
}

@utility animate-loot-reveal-glyph {
  --sk-loot-reveal-o1: 0.9;
  --sk-loot-reveal-s0: 0.55;
  --sk-loot-reveal-r0: -8deg;
  animation: sk-loot-reveal-bloom 700ms var(--sk-ease-spring)
    calc(var(--sk-loot-reveal-at, 0ms) + 120ms) both;
}

@utility animate-loot-reveal-halo {
  --sk-loot-reveal-o1: 0.35;
  animation: sk-loot-reveal-bloom 800ms ease var(--sk-loot-reveal-at, 0ms) both;
}

@utility animate-loot-reveal-ring {
  --sk-loot-reveal-o0: 0.9;
  --sk-loot-reveal-o1: 0.72;
  animation: sk-loot-reveal-bloom 700ms var(--sk-ease) calc(var(--sk-loot-reveal-at, 0ms) + 550ms);
}

/* The label rises in after the flip; like the face it stays visibility: hidden (out of the
   accessibility tree) until its card turns over, so no "Legendary" is read before its name. */
@utility animate-loot-reveal-label {
  --sk-loot-reveal-o1: 0.6;
  --sk-loot-reveal-y0: 0 4px;
  --sk-loot-reveal-pre: hidden;
  animation:
    sk-loot-reveal-bloom 350ms var(--sk-ease) calc(var(--sk-loot-reveal-at, 0ms) + 300ms) both,
    sk-loot-reveal-side 900ms linear var(--sk-loot-reveal-at, 0ms) both;
}

@utility animate-loot-reveal-hint {
  --sk-loot-reveal-o0: 1;
  --sk-loot-reveal-o1: 0.8;
  animation: sk-loot-reveal-bloom 200ms linear var(--sk-loot-reveal-at, 0ms) both;
}

@utility animate-loot-reveal-rays {
  --sk-loot-reveal-o1: 0.8;
  --sk-loot-reveal-s0: 0.4;
  --sk-loot-reveal-r0: -40deg;
  animation: sk-loot-reveal-bloom 2.4s cubic-bezier(0.2, 0.7, 0.2, 1)
    calc(var(--sk-loot-reveal-at, 0ms) + 100ms) both;
}

@utility animate-loot-reveal-core {
  --sk-loot-reveal-s0: 0.3;
  animation: sk-loot-reveal-bloom 1.1s cubic-bezier(0.2, 0.7, 0.3, 1)
    calc(var(--sk-loot-reveal-at, 0ms) + 80ms) both;
}

@utility animate-loot-reveal-wave {
  --sk-loot-reveal-o0: 1;
  --sk-loot-reveal-o1: 0.8;
  --sk-loot-reveal-s0: 0.35;
  animation: sk-loot-reveal-bloom 900ms cubic-bezier(0.15, 0.7, 0.3, 1)
    calc(var(--sk-loot-reveal-at, 0ms) + 100ms);
}

/* The flare rides the face's side of the flip (y 180deg): bloom must start there, not at 0deg. */
@utility animate-loot-reveal-flare {
  --sk-loot-reveal-r0: y 180deg;
  animation: sk-loot-reveal-bloom 1.3s ease-out calc(var(--sk-loot-reveal-at, 0ms) + 100ms) both;
}

@utility animate-loot-reveal-sheen {
  --sk-loot-reveal-o0: 1;
  --sk-loot-reveal-y0: -120% 0;
  animation: sk-loot-reveal-bloom 1.1s var(--sk-ease) calc(var(--sk-loot-reveal-at, 0ms) + 350ms)
    both;
}

@utility animate-loot-reveal-spark {
  animation: sk-loot-reveal-spark calc(700ms + 600ms * var(--sk-loot-reveal-q)) linear
    calc(var(--sk-loot-reveal-at, 0ms) + 100ms + 90ms * var(--sk-loot-reveal-r)) both;
}
`
