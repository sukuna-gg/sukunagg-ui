import { tv, type VariantProps } from '../../utils/tv'

/**
 * Slot class map for {@link AvatarFrame}. Pure and server-safe: no hooks, no DOM, no 'use client'.
 *
 * The `animate-avatar-frame-*` utilities, the `sk-avatar-frame-*` keyframes and the paint
 * utilities (`avatar-frame-band`, `-comet`, `-metal`, `-spark`, `-cutout`…) are emitted into the
 * generated `theme.css` from `scripts/motion/avatar-frame.ts`. Every animated slot carries
 * `motion-reduce:animate-none`; each `animate-*` utility also sets the layer's rest angle
 * (`--sk-avatar-frame-phase`), so reduced motion lands on a designed still frame.
 *
 * Geometry: the root is sized by the child plus a 6px pad (3px ring + 3px gap). `back` and
 * `front` cover that frame box and are size containers, so every layer measures itself in `cqw`.
 * Inside `back`, `cut` bleeds 24px past the frame (room for the glow) and carries the status
 * hole; `layers` brings the ring layers back to the frame box.
 */
export const avatarFrameStyles = tv({
  slots: {
    root: 'group/avatar-frame relative isolate inline-grid shrink-0 place-items-center p-[6px] align-middle',
    back: 'pointer-events-none absolute inset-0 @container-[size]',
    cut: 'absolute -inset-[24px]',
    layers: 'absolute inset-[24px]',
    halo: 'absolute -inset-[20cqw] rounded-full opacity-70 avatar-frame-halo animate-avatar-frame-breathe motion-reduce:animate-none',
    ripple:
      'absolute inset-0 rounded-full border-[1.5px] border-accent opacity-0 animate-avatar-frame-ripple motion-reduce:animate-none',
    glow: 'absolute inset-0 rounded-full blur-[max(4px,7cqw)] opacity-75 transition-opacity duration-slow ease-sukuna group-hover/avatar-frame:opacity-100 motion-reduce:transition-none',
    glowRing: 'absolute inset-0 rounded-full avatar-frame-band [--sk-avatar-frame-bw:5px]',
    track: 'absolute inset-0 rounded-full bg-accent/8 avatar-frame-band',
    hair: 'absolute -inset-[6cqw] rounded-full border border-premium/28',
    ring: 'absolute inset-0 rounded-full avatar-frame-band',
    head: 'absolute inset-0 avatar-frame-head [--sk-avatar-frame-phase:33deg] animate-avatar-frame-spin motion-reduce:animate-none',
    sheen:
      'absolute inset-0 rounded-full avatar-frame-band avatar-frame-sheen [--sk-avatar-frame-phase:-20deg] animate-avatar-frame-sheen motion-reduce:animate-none',
    avatar: 'pointer-events-auto relative grid place-items-center rounded-full',
    front: 'pointer-events-none absolute inset-0 @container-[size]',
    orbit: 'absolute rounded-full animate-avatar-frame-orbit motion-reduce:animate-none',
    spark: 'avatar-frame-spark',
    status: 'avatar-frame-status',
    pill: [
      'absolute top-full left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-[.45em]',
      'rounded-pill py-[.27em] pr-[.73em] pl-[.64em] whitespace-nowrap',
      // No mono token exists (Q39 brief): display face, bold, uppercase, tracked.
      'font-display font-bold uppercase leading-none tracking-[.14em] text-[length:clamp(8px,11cqw,11px)]',
      // DECISION(open): pill fill — the accent gradient (not the mockup's flat --sk-accent, ≈ 3.5:1
      // in dark) so the white label clears 4.5:1 in both themes.
      'bg-gradient-accent text-on-accent',
      // DECISION(open): pill separator — a 3px ring in --sk-avatar-frame-backdrop (default
      // --sk-surface, the mockup's stage); consumers on another surface set the variable.
      'shadow-[0_0_0_3px_var(--sk-avatar-frame-backdrop,var(--sk-surface)),0_6px_16px_-4px_var(--sk-accent-glow)]',
    ],
    pillDot:
      'size-[.45em] shrink-0 rounded-full bg-current animate-avatar-frame-blink motion-reduce:animate-none',
  },
  variants: {
    tone: {
      accent: {},
      premium: {
        glow: 'opacity-45',
        glowRing: 'bg-premium',
        ring: 'avatar-frame-metal',
      },
    },
    live: {
      true: {},
      false: {},
    },
    status: {
      online: {
        cut: 'avatar-frame-cutout',
        avatar: 'avatar-frame-cutout-avatar',
        status: 'avatar-frame-online',
      },
      offline: {
        cut: 'avatar-frame-cutout',
        avatar: 'avatar-frame-cutout-avatar',
        status: 'avatar-frame-offline',
      },
    },
  },
  compoundVariants: [
    // The comet: ring + glow turn together (rest at 40deg), the head rides 7deg behind the peak.
    {
      tone: 'accent',
      live: false,
      class: {
        glow: 'opacity-90 blur-[max(4px,9cqw)]',
        glowRing:
          'avatar-frame-comet-glow [--sk-avatar-frame-phase:40deg] animate-avatar-frame-spin motion-reduce:animate-none',
        ring: 'avatar-frame-comet [--sk-avatar-frame-phase:40deg] animate-avatar-frame-spin motion-reduce:animate-none',
      },
    },
    // DECISION(open): live overrides the accent comet — halo, ripple and pill carry the motion and
    // the accent ring holds solid (the mockup's live look); premium keeps its metal ring + sheen.
    { tone: 'accent', live: true, class: { glowRing: 'bg-accent', ring: 'bg-accent' } },
  ],
  defaultVariants: { tone: 'accent', live: false },
})

/**
 * The three spark orbits: radius (inset in `cqw`, outward), speed, direction and rest angle, plus
 * the spark's own class (the counter-clockwise one is mirrored so its tail trails behind it).
 * Literal per-orbit classes (rule 7) — fixed, so server and client markup always match.
 */
export const avatarFrameOrbits = [
  { orbit: '-inset-[2cqw] [--sk-avatar-frame-t:3.7s] [--sk-avatar-frame-phase:140deg]', spark: '' },
  {
    orbit:
      '-inset-[8cqw] [--sk-avatar-frame-t:6.1s] [--sk-avatar-frame-phase:259deg] [--sk-avatar-frame-dir:reverse]',
    spark: '-scale-x-100',
  },
  { orbit: '-inset-[13cqw] [--sk-avatar-frame-t:9.3s] [--sk-avatar-frame-phase:11deg]', spark: '' },
] as const

export type AvatarFrameStyleProps = VariantProps<typeof avatarFrameStyles>
