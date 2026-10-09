/**
 * Motion CSS for the `avatar-frame` showpiece (Q39): its `@property`, `@keyframes` and `@utility`
 * blocks, emitted into the generated `theme.css` by `scripts/build-tokens.ts` (in the order
 * fixed by `./index.ts`). Names: `--sk-avatar-frame-*`, `sk-avatar-frame-*`, `animate-avatar-frame-*`.
 *
 * Spec: docs/component-avatar-frame.md §4. Every animated property is `rotate`, `scale` or
 * `opacity` (compositor-only). Geometry is in container units of the frame (`cqw`, set up by the
 * component's `@container-[size]` layers), so the effects scale with the framed avatar. Masks use
 * `black`/`transparent`: they read alpha only, not a colour.
 */
// DECISION(open): hot colour without light-dark() — the mockup's white-hot comet head used
// `light-dark()`, which needs `color-scheme` set per theme (not shipped). The head and the comet's
// peak mix `--sk-accent` 55% with `--sk-text` instead: white-hot on dark, deep red on light.
export const css = String.raw`
/* AvatarFrame (docs/component-avatar-frame.md). One turn keyframe for every rotating layer (ring,
   glow, comet head, sheen, spark orbits): it starts from the layer's rest angle, so t=0 is the
   reduced-motion still frame. */
@keyframes sk-avatar-frame-turn {
  from {
    rotate: var(--sk-avatar-frame-phase, 0deg);
  }
  to {
    rotate: calc(var(--sk-avatar-frame-phase, 0deg) + 360deg);
  }
}

@keyframes sk-avatar-frame-breathe {
  from {
    scale: 0.94;
    opacity: 0.4;
  }
  to {
    scale: 1.04;
    opacity: 1;
  }
}

@keyframes sk-avatar-frame-ripple {
  from {
    scale: 1;
    opacity: 0.7;
  }
  to {
    scale: 1.42;
    opacity: 0;
  }
}

@keyframes sk-avatar-frame-blink {
  to {
    opacity: 0.3;
  }
}

/* The rest angle lives in the animate utility, so motion-reduce:animate-none lands on it.
   --sk-avatar-frame-delay (default 0s) shifts every loop of one frame: a negative value starts it
   mid-cycle, so frames in a list don't turn in lockstep. */
@utility animate-avatar-frame-spin {
  rotate: var(--sk-avatar-frame-phase, 0deg);
  animation: sk-avatar-frame-turn 3.2s linear var(--sk-avatar-frame-delay, 0s) infinite;
}

@utility animate-avatar-frame-sheen {
  rotate: var(--sk-avatar-frame-phase, 0deg);
  animation: sk-avatar-frame-turn 5.5s cubic-bezier(0.45, 0, 0.55, 1)
    var(--sk-avatar-frame-delay, 0s) infinite;
}

@utility animate-avatar-frame-orbit {
  rotate: var(--sk-avatar-frame-phase, 0deg);
  animation: sk-avatar-frame-turn var(--sk-avatar-frame-t, 6s) linear
    var(--sk-avatar-frame-delay, 0s) infinite var(--sk-avatar-frame-dir, normal);
}

@utility animate-avatar-frame-breathe {
  animation: sk-avatar-frame-breathe 2.8s cubic-bezier(0.45, 0, 0.55, 1)
    var(--sk-avatar-frame-delay, 0s) infinite alternate;
}

@utility animate-avatar-frame-ripple {
  animation: sk-avatar-frame-ripple 3.2s cubic-bezier(0.2, 0.6, 0.3, 1)
    var(--sk-avatar-frame-delay, 0s) infinite;
}

@utility animate-avatar-frame-blink {
  animation: sk-avatar-frame-blink 1.4s ease-in-out var(--sk-avatar-frame-delay, 0s) infinite
    alternate;
}

/* A ring-shaped mask on the element's outer edge, --sk-avatar-frame-bw wide. */
@utility avatar-frame-band {
  mask: radial-gradient(
    farthest-side,
    transparent calc(100% - var(--sk-avatar-frame-bw, 3px) - 0.6px),
    black calc(100% - var(--sk-avatar-frame-bw, 3px))
  );
}

/* Crimson comet: bright head at 352deg (white-hot on dark, deep red on light), tail behind it. */
@utility avatar-frame-comet {
  background: conic-gradient(
    var(--sk-accent),
    color-mix(in oklab, var(--sk-accent-deep) 55%, transparent) 50deg,
    transparent 100deg 210deg,
    color-mix(in oklab, var(--sk-accent-deep) 65%, transparent) 265deg,
    var(--sk-accent) 322deg,
    color-mix(in oklab, var(--sk-accent) 55%, var(--sk-text)) 352deg,
    var(--sk-accent)
  );
}

@utility avatar-frame-comet-glow {
  background: conic-gradient(
    var(--sk-accent),
    transparent 60deg 230deg,
    var(--sk-accent) 330deg,
    color-mix(in oklab, var(--sk-accent) 55%, var(--sk-text)) 352deg,
    var(--sk-accent)
  );
}

/* The comet's head: a small hot dot riding the ring's centre line, with its own glow. It shrinks
   with the frame below 100px (6px dot, 7px + 18px glow there) so on small avatars it stays a spark
   on the ring, not a second dot; it never outgrows the fixed 3px ring on large ones. */
@utility avatar-frame-head {
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 1.5px;
    width: clamp(4px, 6cqw, 7px);
    height: clamp(4px, 6cqw, 7px);
    translate: -50% -50%;
    border-radius: 50%;
    background: color-mix(in oklab, var(--sk-accent) 55%, var(--sk-text));
    box-shadow:
      0 0 0 1px var(--sk-accent),
      0 0 min(7px, 7cqw) min(2px, 2cqw) var(--sk-accent),
      0 0 min(18px, 18cqw) min(5px, 5cqw) var(--sk-accent-glow);
  }
}

/* Bone metal: two highlights and two shadows around the ring. */
@utility avatar-frame-metal {
  background: conic-gradient(
    from 200deg,
    var(--sk-premium),
    color-mix(in oklab, var(--sk-premium) 50%, var(--sk-on-accent)) 45deg,
    var(--sk-premium-dim) 110deg,
    var(--sk-premium) 170deg,
    color-mix(in oklab, var(--sk-premium) 50%, var(--sk-on-accent)) 225deg,
    var(--sk-premium-dim) 290deg,
    var(--sk-premium)
  );
}

@utility avatar-frame-sheen {
  background: conic-gradient(
    transparent 0 290deg,
    color-mix(in oklab, var(--sk-on-accent) 85%, transparent) 335deg,
    transparent
  );
}

@utility avatar-frame-halo {
  background: radial-gradient(
    closest-side,
    transparent 62%,
    color-mix(in oklab, var(--sk-accent) 42%, transparent) 75%,
    transparent
  );
}

/* A four-point star with a tapering tail, centred (75% 50%) on its orbit's top edge. */
@utility avatar-frame-spark {
  position: absolute;
  left: 50%;
  top: 0;
  width: 28cqw;
  height: 14cqw;
  translate: -75% -50%;
  transform-origin: 75% 50%;
  filter: drop-shadow(0 0 3px color-mix(in oklab, var(--sk-premium) 60%, transparent));
  &::before,
  &::after {
    content: '';
    position: absolute;
  }
  &::before {
    left: 0;
    right: 25%;
    top: 39.3%;
    height: 21.4%;
    background: linear-gradient(90deg, transparent, var(--sk-premium));
    clip-path: polygon(0 50%, 100% 0, 100% 100%);
  }
  &::after {
    top: 0;
    right: 0;
    width: 50%;
    height: 100%;
    background: radial-gradient(
      closest-side,
      color-mix(in oklab, var(--sk-premium) 55%, var(--sk-text)) 15%,
      var(--sk-premium) 60%
    );
    clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  }
}

/* Status dot on the avatar's 45deg bottom-right edge, 21% of the avatar wide. In the frame's
   container: 100cqw is the frame, 100cqw - 12px the avatar (3px ring + 3px gap each side). */
@utility avatar-frame-status {
  position: absolute;
  width: calc((100cqw - 12px) * 0.21);
  height: calc((100cqw - 12px) * 0.21);
  left: calc(50% + (50cqw - 7px) * 0.7071 - (100cqw - 12px) * 0.105);
  top: calc(50% + (50cqw - 7px) * 0.7071 - (100cqw - 12px) * 0.105);
  border-radius: 50%;
}

@utility avatar-frame-online {
  background: radial-gradient(
    circle at 35% 30%,
    color-mix(in oklab, var(--sk-success) 60%, var(--sk-on-accent)),
    var(--sk-success) 60%
  );
}

@utility avatar-frame-offline {
  box-shadow: inset 0 0 0 max(2px, (100cqw - 12px) * 0.05) var(--sk-text-faint);
}

/* The status hole (radius 15.5% of the avatar, centred on the dot): through the ring layers (a
   box centred on the frame, inside its container) and through the avatar itself (its own box,
   so pure percentages — engines reject calc(% ± px) as a gradient radius). */
@utility avatar-frame-cutout {
  mask: radial-gradient(
    circle calc((100cqw - 12px) * 0.155) at calc(50% + (50cqw - 7px) * 0.7071)
      calc(50% + (50cqw - 7px) * 0.7071),
    transparent calc(100% - 0.5px),
    black 100%
  );
}

@utility avatar-frame-cutout-avatar {
  mask: radial-gradient(
    15.5% 15.5% at calc(50% + (50% - 1px) * 0.7071) calc(50% + (50% - 1px) * 0.7071),
    transparent calc(100% - 0.5px),
    black 100%
  );
}
`
