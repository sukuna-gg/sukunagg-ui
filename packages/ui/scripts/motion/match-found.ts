/**
 * Motion CSS for the `match-found` showpiece (Q39): its `@property`, `@keyframes` and `@utility`
 * blocks, emitted into the generated `theme.css` by `scripts/build-tokens.ts` (in the order
 * fixed by `./index.ts`). Names: `--sk-match-found-*`, `sk-match-found-*`, `animate-match-found-*`.
 *
 * Base styles are the final frame; every keyframe's `from` holds the start. Seven keyframes cover
 * the choreography: each utility sets the custom properties its keyframe reads (fade `-o`, offset
 * `-t`, scale `-s`/`-s2`, start colour `-from`, glow `-blur`/`-spread`). Inherited values would
 * leak between nested parts, so every utility sets all the ones it uses. Spec:
 * docs/component-match-found.md §4.
 */
// DECISION(open): urgency window — the danger tint, ripple and beat start at `seconds - 3` (the
// mockup's 9 s of 12), fixed in the utilities below rather than exposed as a prop (doc §11).
export const css = String.raw`
/* MatchFound (docs/component-match-found.md): seconds left, drawn with counter(). */
@property --sk-match-found-n {
  syntax: '<integer>';
  inherits: false;
  initial-value: 0;
}

/* Entrances and pulses: from a fade / offset / scale to the base (final) frame. */
@keyframes sk-match-found-enter {
  from {
    opacity: var(--sk-match-found-o, 0);
    translate: var(--sk-match-found-t, 0 0);
    scale: var(--sk-match-found-s, 1);
  }
}

/* Title bar: grows from the left, then leaves to the right. */
@keyframes sk-match-found-wipe {
  0% {
    scale: 0 1;
    transform-origin: left;
  }
  50% {
    scale: 1 1;
    transform-origin: left;
  }
  50.1% {
    scale: 1 1;
    transform-origin: right;
  }
  100% {
    scale: 0 1;
    transform-origin: right;
  }
}

/* From 3600 down to 0 (the registered initial value and the base). The utility runs it over an
   hour, one step a second, with a negative delay that starts it "seconds" before the end. The
   value is literal because Firefox doesn't interpolate a registered property whose keyframe value
   uses var(). */
@keyframes sk-match-found-count {
  from {
    --sk-match-found-n: 3600;
  }
}

/* Ring arc drain + comet orbit + waiting-slot spinner: from full / 0deg to the base. */
@keyframes sk-match-found-sweep {
  from {
    stroke-dashoffset: 0;
    rotate: 0deg;
  }
}

/* From a start colour to the base colour (urgent danger, revealed title text). */
@keyframes sk-match-found-tint {
  from {
    color: var(--sk-match-found-from);
  }
}

/* Ripple ring. */
@keyframes sk-match-found-ping {
  from {
    opacity: var(--sk-match-found-o, 0.75);
    scale: var(--sk-match-found-s, 0.94);
  }
  to {
    opacity: 0;
    scale: var(--sk-match-found-s2, 1.55);
  }
}

/* Glow pulse. */
@keyframes sk-match-found-glow {
  from {
    box-shadow: 0 0 0 0 var(--sk-accent-glow);
  }
  to {
    box-shadow: 0 0 var(--sk-match-found-blur, 0px) var(--sk-match-found-spread, 6px) transparent;
  }
}

@utility match-found-number {
  counter-reset: sk-match-found var(--sk-match-found-n);
  &::after {
    content: counter(sk-match-found);
  }
}

/* Ring glow strength (halo, drop-shadow): softer on the light palette, where colour on white reads
   stronger. The closest data-theme wins one level deep (dark inside light). */
@utility match-found-glow {
  --sk-match-found-halo: 22%;
  --sk-match-found-shadow: 55%;
  :where([data-theme='light']) & {
    --sk-match-found-halo: 9%;
    --sk-match-found-shadow: 30%;
  }
  :where([data-theme='light'] [data-theme='dark']) & {
    --sk-match-found-halo: 22%;
    --sk-match-found-shadow: 55%;
  }
}

/* Countdown: information, so it keeps running under reduced motion (stepped). */
@utility animate-match-found-count {
  --sk-match-found-from: var(--sk-text);
  animation:
    sk-match-found-count 3600s steps(3600, end) calc((var(--sk-match-found-seconds, 0) - 3600) * 1s)
      both var(--sk-match-found-play, running),
    sk-match-found-tint 200ms linear calc((var(--sk-match-found-seconds, 0) - 3) * 1s) both
      var(--sk-match-found-play, running);
}

@utility animate-match-found-urgent {
  --sk-match-found-from: var(--sk-accent);
  animation: sk-match-found-tint 200ms linear calc((var(--sk-match-found-seconds, 0) - 3) * 1s)
    both var(--sk-match-found-play, running);
}

@utility animate-match-found-drain {
  animation: sk-match-found-sweep calc(var(--sk-match-found-seconds, 0) * 1s)
    var(--sk-match-found-ease, linear) both var(--sk-match-found-play, running);
}

@utility animate-match-found-spin {
  animation: sk-match-found-sweep 7s linear infinite;
}

/* Entrance stagger. */
@utility animate-match-found-scan {
  --sk-match-found-o: 1;
  --sk-match-found-t: 0 0;
  --sk-match-found-s: 0 1;
  animation: sk-match-found-enter 900ms var(--sk-ease) both;
}

@utility animate-match-found-slide {
  --sk-match-found-o: 0;
  --sk-match-found-t: -12px 0;
  --sk-match-found-s: 1;
  animation: sk-match-found-enter 420ms var(--sk-ease) 60ms both;
}

@utility animate-match-found-rise {
  --sk-match-found-o: 0;
  --sk-match-found-t: 0 10px;
  --sk-match-found-s: 1;
  animation: sk-match-found-enter 480ms var(--sk-ease) var(--sk-match-found-d, 0ms) both;
}

@utility animate-match-found-show {
  --sk-match-found-from: transparent;
  animation: sk-match-found-tint 1ms linear calc(var(--sk-match-found-d, 0ms) + 310ms) both;
}

@utility animate-match-found-wipe {
  animation: sk-match-found-wipe 620ms cubic-bezier(0.7, 0, 0.25, 1) var(--sk-match-found-d, 0ms)
    both;
}

@utility animate-match-found-pop-in {
  --sk-match-found-o: 0;
  --sk-match-found-t: 0 0;
  --sk-match-found-s: 0.82;
  animation: sk-match-found-enter 700ms cubic-bezier(0.3, 1.5, 0.5, 1) both;
}

/* Decoration. */
@utility animate-match-found-breathe {
  --sk-match-found-o: 0.5;
  --sk-match-found-t: 0 0;
  --sk-match-found-s: 1;
  animation: sk-match-found-enter 2.6s ease-in-out infinite alternate;
}

@utility animate-match-found-beat {
  --sk-match-found-o: 1;
  --sk-match-found-t: 0 0;
  --sk-match-found-s: 1.14;
  animation: sk-match-found-enter 1s var(--sk-ease) calc((var(--sk-match-found-seconds, 0) - 3) * 1s)
    3;
}

@utility animate-match-found-lock {
  --sk-match-found-o: 1;
  --sk-match-found-t: 0 0;
  --sk-match-found-s: 1.07;
  animation: sk-match-found-enter 600ms var(--sk-ease);
}

@utility animate-match-found-ping {
  --sk-match-found-o: 0.75;
  --sk-match-found-s: 0.94;
  --sk-match-found-s2: 1.55;
  animation: sk-match-found-ping 1.1s cubic-bezier(0.2, 0.7, 0.3, 1) 2;
}

@utility animate-match-found-ping-urgent {
  --sk-match-found-o: 0.75;
  --sk-match-found-s: 0.94;
  --sk-match-found-s2: 1.55;
  animation: sk-match-found-ping 1s ease-out calc((var(--sk-match-found-seconds, 0) - 3) * 1s) 3;
}

@utility animate-match-found-ping-ready {
  --sk-match-found-o: 0.75;
  --sk-match-found-s: 0.94;
  --sk-match-found-s2: 1.55;
  animation: sk-match-found-ping 900ms cubic-bezier(0.2, 0.7, 0.3, 1) 2;
}

@utility animate-match-found-pop {
  --sk-match-found-o: 1;
  --sk-match-found-t: 0 0;
  --sk-match-found-s: 0.7;
  animation: sk-match-found-enter 460ms cubic-bezier(0.3, 1.6, 0.5, 1) both;
}

@utility animate-match-found-burst {
  --sk-match-found-o: 0.9;
  --sk-match-found-s: 1;
  --sk-match-found-s2: 2.2;
  animation: sk-match-found-ping 700ms cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
}

@utility animate-match-found-live {
  --sk-match-found-blur: 0px;
  --sk-match-found-spread: 6px;
  animation: sk-match-found-glow 1.4s ease-out infinite;
}

@utility animate-match-found-pulse {
  --sk-match-found-blur: 10px;
  --sk-match-found-spread: 12px;
  animation: sk-match-found-glow 1.6s cubic-bezier(0.2, 0.6, 0.3, 1) infinite;
}

/* The existing sk-shine sweep, slowed so the band crosses about once every 5 s. */
@utility animate-match-found-sheen {
  animation: sk-shine 4.8s linear 1.4s infinite;
}
`
