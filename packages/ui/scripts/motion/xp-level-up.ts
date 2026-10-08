/**
 * Motion CSS for the `xp-level-up` showpiece (Q39): its `@property`, `@keyframes` and `@utility`
 * blocks, emitted into the generated `theme.css` by `scripts/build-tokens.ts` (in the order
 * fixed by `./index.ts`). Names: `--sk-xp-level-up-*`, `sk-xp-level-up-*`, `animate-xp-level-up-*`.
 *
 * Base styles are the settled card; every keyframe animates FROM the start state, so reduced
 * motion (`motion-reduce:animate-none`) and browsers without `@property` land on the final frame.
 * Timeline and per-slot use: docs/component-xp-level-up.md §4.
 */
// DECISION(open): Q39 timeline. Durations, delays and easings are the approved mockup's, literal in
// the @utility blocks (the sk-shine precedent); tunable as a patch pre-1.0.
export const css = String.raw`
/* XpLevelUp (Q39, docs/component-xp-level-up.md): fill → flash → burst → count → settle. */
@property --sk-xp-level-up-step {
  syntax: '<integer>';
  inherits: false;
  initial-value: 0;
}

@property --sk-xp-level-up-t {
  syntax: '<integer>';
  inherits: false;
  initial-value: 100;
}

@keyframes sk-xp-level-up-in {
  from {
    opacity: 0;
    translate: var(--sk-xp-level-up-shift, 0 6px);
  }
}

@keyframes sk-xp-level-up-out {
  from {
    opacity: 1;
  }
  to {
    translate: 0 -6px;
  }
}

@keyframes sk-xp-level-up-fill {
  from {
    translate: calc(var(--sk-xp-level-up-start, 0) * 1% - 100%) 0;
  }
}

@keyframes sk-xp-level-up-burst {
  0% {
    scale: var(--sk-xp-level-up-burst, 1.25);
  }
  10% {
    opacity: 1;
    filter: var(--sk-xp-level-up-flare, none);
  }
}

@keyframes sk-xp-level-up-spark {
  0% {
    opacity: 0;
    translate: 0 0;
    scale: 0.3 1;
  }
  12% {
    opacity: 1;
    scale: 1 1;
  }
  70% {
    opacity: 1;
  }
}

@keyframes sk-xp-level-up-roll {
  0% {
    --sk-xp-level-up-step: -1;
  }
  45% {
    --sk-xp-level-up-step: -1;
    translate: 0 -50%;
    opacity: 0;
    filter: blur(2px);
  }
  55% {
    --sk-xp-level-up-step: 0;
    translate: 0 50%;
    opacity: 0;
    filter: blur(2px);
  }
}

@keyframes sk-xp-level-up-title {
  0% {
    clip-path: inset(-30% 100% -30% 0);
    translate: -8px 0;
    background-position: 100% 0;
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  9% {
    background-position: 100% 0;
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
  47% {
    clip-path: inset(-30% -10% -30% 0);
    translate: 0 0;
  }
}

@keyframes sk-xp-level-up-count {
  from {
    --sk-xp-level-up-t: 0;
  }
}

@utility xp-level-up-hex {
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}

@utility xp-level-up-level {
  counter-reset: sk-xp-level-up-level
    calc(var(--sk-xp-level-up-level, 0) + var(--sk-xp-level-up-step));
  &::after {
    content: counter(sk-xp-level-up-level);
  }
}

@utility xp-level-up-pct {
  counter-reset: sk-xp-level-up-pct
    calc(
      var(--sk-xp-level-up-from, 0) + (100 - var(--sk-xp-level-up-from, 0)) *
        var(--sk-xp-level-up-t) / 100
    );
  &::after {
    content: counter(sk-xp-level-up-pct) '%';
  }
}

@utility xp-level-up-spark {
  --sk-xp-level-up-a: calc(var(--sk-xp-level-up-i, 0) * 22.5deg + 8deg);
  --sk-xp-level-up-r: calc(120px + sin(var(--sk-xp-level-up-i, 0) * 2.4) * 40px);
  position: absolute;
  left: 0;
  top: -1.5px;
  width: calc(21px + cos(var(--sk-xp-level-up-i, 0) * 3.7) * 7px);
  height: 3px;
  border-radius: var(--sk-radius-pill);
  transform-origin: 0 50%;
  rotate: var(--sk-xp-level-up-a);
  translate: calc(cos(var(--sk-xp-level-up-a)) * var(--sk-xp-level-up-r))
    calc(sin(var(--sk-xp-level-up-a)) * var(--sk-xp-level-up-r));
  scale: 0.5 1;
  opacity: 0;
  background-image: linear-gradient(
    90deg,
    transparent,
    var(--sk-xp-level-up-c, var(--sk-accent)) 60%,
    var(--sk-on-accent)
  );
}

@utility animate-xp-level-up-chip {
  --sk-xp-level-up-shift: 28px 0;
  animation: sk-xp-level-up-in 600ms var(--sk-ease-spring) 60ms both;
}

@utility animate-xp-level-up-charge {
  --sk-xp-level-up-start: var(--sk-xp-level-up-from, 0);
  animation:
    sk-xp-level-up-out 140ms linear 1060ms both,
    sk-xp-level-up-fill 900ms cubic-bezier(0.3, 0.7, 0.3, 1.08) 250ms both;
}

@utility animate-xp-level-up-shine {
  --sk-xp-level-up-start: -20;
  animation: sk-xp-level-up-fill 800ms cubic-bezier(0.4, 0, 0.2, 1) 300ms both;
}

@utility animate-xp-level-up-refill {
  --sk-xp-level-up-start: 0;
  animation: sk-xp-level-up-fill 900ms var(--sk-ease-spring) 1260ms both;
}

@utility animate-xp-level-up-gain {
  --sk-xp-level-up-start: var(--sk-xp-level-up-from, 0);
  animation: sk-xp-level-up-fill 900ms cubic-bezier(0.3, 0.7, 0.3, 1.08) 250ms both;
}

@utility animate-xp-level-up-count {
  animation:
    sk-xp-level-up-count 900ms cubic-bezier(0.3, 0.7, 0.3, 1) 250ms both,
    sk-xp-level-up-out 150ms linear 1200ms both;
}

@utility animate-xp-level-up-prelude {
  animation: sk-xp-level-up-out 140ms linear 960ms both;
}

@utility animate-xp-level-up-flash {
  --sk-xp-level-up-burst: 1.01 1.8;
  animation: sk-xp-level-up-burst 520ms ease-out 1000ms both;
}

@utility animate-xp-level-up-glow {
  animation: sk-xp-level-up-burst 1000ms linear 1000ms both;
}

@utility animate-xp-level-up-ring {
  --sk-xp-level-up-burst: 0.5;
  animation: sk-xp-level-up-burst 760ms cubic-bezier(0.1, 0.7, 0.2, 1) 1000ms both;
}

@utility animate-xp-level-up-pop {
  --sk-xp-level-up-burst: 1.16;
  animation: sk-xp-level-up-burst 750ms var(--sk-ease-spring) 1000ms both;
}

@utility animate-xp-level-up-flare {
  --sk-xp-level-up-burst: 1;
  --sk-xp-level-up-flare: brightness(1.5) saturate(1.3) drop-shadow(0 0 30px var(--sk-accent-glow));
  animation: sk-xp-level-up-burst 400ms linear 1000ms both;
}

@utility animate-xp-level-up-spark {
  animation: sk-xp-level-up-spark 860ms cubic-bezier(0.12, 0.75, 0.25, 1)
    calc(1040ms + sin(var(--sk-xp-level-up-i, 0) * 5.1) * 40ms) both;
}

@utility animate-xp-level-up-roll {
  animation: sk-xp-level-up-roll 420ms cubic-bezier(0.3, 0, 0.2, 1) 1030ms both;
}

@utility animate-xp-level-up-headline {
  animation: sk-xp-level-up-title 1100ms linear 1080ms both;
}

@utility animate-xp-level-up-swap-out {
  animation: sk-xp-level-up-out 150ms linear 1200ms both;
}

@utility animate-xp-level-up-swap-in {
  animation: sk-xp-level-up-in 420ms var(--sk-ease) 1360ms both;
}
`
