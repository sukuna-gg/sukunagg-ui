import { tv, type VariantProps } from '../../utils/tv'

/**
 * Slot class map for {@link MatchFound}. Pure and server-safe — no hooks, no DOM, no 'use client'.
 *
 * The `animate-match-found-*` / `match-found-number` utilities, the `sk-match-found-*` keyframes
 * and the `--sk-match-found-n` `@property` come from `scripts/motion/match-found.ts`, emitted into
 * the generated `theme.css`. Base utilities ARE the final frame (0 seconds, drained ring, danger
 * red); each keyframe's `from` holds the start.
 *
 * Reduced motion: every decorative animation is `motion-safe:` only. The countdown classes are
 * unconditional — the remaining time is information — and the root's `motion-reduce:` custom
 * property switches the ring from a smooth drain to one step per second.
 *
 * The countdown classes live in `phase` variants (never in a base string), so `expired` can drop
 * them: tailwind-merge doesn't know custom `animate-*` names, so two of them on one slot would
 * both stay.
 */
export const matchFoundStyles = tv({
  slots: {
    root: [
      'relative isolate grid w-full content-center overflow-hidden font-sans text-text @container',
      // Information keeps moving under reduced motion: the ring steps once a second.
      'motion-reduce:[--sk-match-found-ease:steps(var(--sk-match-found-seconds),end)]',
    ],
    decor: [
      'pointer-events-none absolute inset-0',
      // Corner hatch, faded out from the top-right corner.
      'before:absolute before:top-0 before:right-0 before:h-[62%] before:w-1/2',
      'before:bg-[repeating-linear-gradient(-45deg,var(--sk-line)_0_1px,transparent_1px_7px)]',
      'before:[mask-image:radial-gradient(farthest-side_at_100%_0,black,transparent)]',
      // Top accent line, drawn in from the left on mount.
      'after:absolute after:inset-x-0 after:top-0 after:h-0.5 after:origin-left',
      'after:bg-[linear-gradient(90deg,var(--sk-accent),transparent_70%)]',
      'motion-safe:after:animate-match-found-scan',
    ],
    panel: [
      'relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3.5 p-4.5',
      '@min-[460px]:gap-x-7.5 @min-[460px]:gap-y-4 @min-[460px]:px-7.5 @min-[460px]:py-6',
    ],
    head: 'min-w-0 [grid-area:head]',
    eyebrow: [
      'mb-1.75 flex items-center gap-2 text-xs font-semibold uppercase leading-none tracking-eyebrow text-accent',
      'motion-safe:animate-match-found-slide',
      'before:size-1.5 before:shrink-0 before:rounded-full before:bg-current',
      'motion-safe:before:animate-match-found-live',
    ],
    // 27px / 46px, shrunk so the longest word (`--sk-match-found-fit` characters at about .95em
    // each) still fits the head column: the full width less the padding when stacked, and less
    // the padding, ring and gap from 460px. A translated title never clips.
    title: [
      'm-0 font-display font-black uppercase tracking-[-.01em] font-stretch-expanded',
      'text-[length:clamp(18px,calc((100cqi_-_36px)/(var(--sk-match-found-fit,1)*.95)),27px)]',
      // After the size: tailwind-merge drops a line-height that precedes a font-size.
      'leading-[.92]',
      '@min-[460px]:text-[length:clamp(24px,calc((100cqi_-_250px)/(var(--sk-match-found-fit,1)*.95)),46px)]',
    ],
    // One per title word: the text appears under an accent bar that wipes across it.
    word: [
      'relative inline-block @min-[460px]:block @min-[460px]:w-fit',
      'motion-safe:animate-match-found-show',
      'after:absolute after:-inset-x-[.05em] after:inset-y-[.06em] after:origin-left after:bg-accent after:[scale:0_1]',
      'motion-safe:after:animate-match-found-wipe',
    ],
    meta: [
      'mt-2 truncate text-sm text-text-dim @min-[460px]:mt-2.5 @min-[460px]:text-[13px]',
      '[--sk-match-found-d:460ms] motion-safe:animate-match-found-rise',
    ],
    ring: [
      'relative aspect-square size-25 self-center justify-self-center [grid-area:ring] @min-[460px]:size-40',
      'motion-safe:animate-match-found-pop-in',
    ],
    // Carries the ring colour (accent → danger, or the phase colour) for everything inside.
    dial: [
      'absolute inset-0 text-danger match-found-glow',
      'before:pointer-events-none before:absolute before:-inset-[42%] before:rounded-full',
      'before:bg-[radial-gradient(closest-side,color-mix(in_oklab,currentColor_var(--sk-match-found-halo),transparent),transparent)]',
      'before:opacity-70 motion-safe:before:opacity-100',
      'after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:border-[1.5px] after:border-current after:opacity-0',
      'motion-safe:after:animate-match-found-ping',
    ],
    svg: [
      'absolute inset-0 size-full overflow-visible',
      'drop-shadow-[0_0_5px_color-mix(in_oklab,currentColor_var(--sk-match-found-shadow),transparent)]',
    ],
    disc: 'fill-well/40 stroke-line-soft',
    tick: 'fill-none stroke-line',
    tickMajor: 'fill-none stroke-text-faint',
    track: 'fill-none stroke-line',
    arc: 'fill-none stroke-current [stroke-dashoffset:-314.16px]',
    comet: [
      '[rotate:1turn] [transform-origin:60px_60px]',
      'transition-opacity duration-slow ease-sukuna motion-reduce:transition-none',
    ],
    cometHalo: 'fill-current opacity-40',
    cometCore: 'fill-on-accent',
    ping: 'pointer-events-none absolute inset-0 rounded-full border-[1.5px] border-current opacity-0',
    readyPing: [
      'pointer-events-none absolute inset-0 rounded-full border-[1.5px] border-current opacity-0',
      'motion-safe:animate-match-found-ping-ready',
    ],
    num: 'absolute inset-0 flex flex-col items-center justify-center gap-0.75',
    number: [
      'match-found-number font-display text-3xl font-black leading-[.9] tabular-nums font-stretch-expanded text-danger',
      '@min-[460px]:text-[54px]',
    ],
    unit: '-mr-[.24em] text-[9px] font-semibold uppercase leading-none tracking-[.24em] text-text-faint',
    side: 'flex min-w-0 flex-wrap items-center gap-x-3.5 gap-y-2.5 self-center [grid-area:side]',
    slots: 'm-0 flex list-none gap-1.25 p-0',
    status: [
      'whitespace-nowrap text-xs font-semibold uppercase leading-tight tracking-[.12em] text-text-dim',
      '[--sk-match-found-d:860ms] motion-safe:animate-match-found-rise',
    ],
    actions: [
      'flex gap-2.5 [grid-area:act] [--sk-match-found-d:720ms] motion-safe:animate-match-found-rise',
      // Narrow: Accept (first) takes 1.5 shares; wide: natural widths, Accept at least 150px.
      '*:flex-1 [&>:first-child]:flex-[1.5]',
      '@min-[460px]:*:flex-none @min-[460px]:[&>:first-child]:flex-none @min-[460px]:[&>:first-child]:min-w-[150px]',
    ],
  },
  variants: {
    /** Whether an actions row exists (its grid row is dropped otherwise). */
    actions: {
      true: {
        panel: [
          "[grid-template-areas:'head_head'_'ring_side'_'act_act']",
          "@min-[460px]:[grid-template-areas:'ring_head'_'ring_side'_'ring_act']",
        ],
      },
      false: {
        panel: [
          "[grid-template-areas:'head_head'_'ring_side']",
          "@min-[460px]:[grid-template-areas:'ring_head'_'ring_side']",
        ],
      },
    },
    /** Countdown phase, derived from `state` + `accepted` in the logic. */
    phase: {
      running: {
        dial: 'animate-match-found-urgent',
        arc: 'animate-match-found-drain',
        comet: 'animate-match-found-drain',
        number: 'animate-match-found-count',
        ping: 'motion-safe:animate-match-found-ping-urgent',
        num: 'motion-safe:animate-match-found-beat',
      },
      // Everyone accepted: freeze where it was, go success green (important beats the animation).
      ready: {
        root: '[--sk-match-found-play:paused]',
        dial: 'animate-match-found-urgent text-success!',
        arc: 'animate-match-found-drain',
        comet: 'animate-match-found-drain',
        number: 'animate-match-found-count text-success!',
        svg: 'motion-safe:animate-match-found-lock',
        status: 'text-success',
      },
      declined: {
        root: '[--sk-match-found-play:paused]',
        dial: 'animate-match-found-urgent text-text-faint!',
        arc: 'animate-match-found-drain',
        comet: 'animate-match-found-drain',
        number: 'animate-match-found-count text-text-dim!',
        status: 'text-danger',
      },
      // The app's timer ran out: no countdown animation, so the base (final) frame shows.
      expired: {
        comet: 'opacity-0',
        status: 'text-danger',
      },
    },
    /** Waiting for your answer: the halo breathes and the first action is emphasised. */
    pending: {
      true: {
        dial: 'motion-safe:before:animate-match-found-breathe',
        // DECISION(open): first-action emphasis — styles the consumer's first child (Accept) through
        // its pseudo-elements; the alternative is a dedicated `MatchFound.Accept` part (doc §11).
        actions: [
          '[&>:first-child]:relative',
          // Glow pulse on ::before (box-shadow there never hides the button's focus ring).
          '[&>:first-child]:before:pointer-events-none [&>:first-child]:before:absolute [&>:first-child]:before:inset-0 [&>:first-child]:before:rounded-[inherit]',
          'motion-safe:[&>:first-child]:before:animate-match-found-pulse',
          // Light band on ::after; parked off the right edge until the sheen sweeps it across.
          '[&>:first-child]:after:pointer-events-none [&>:first-child]:after:absolute [&>:first-child]:after:inset-0 [&>:first-child]:after:rounded-[inherit]',
          '[&>:first-child]:after:bg-[linear-gradient(105deg,transparent_44%,color-mix(in_oklab,var(--sk-on-accent)_40%,transparent)_50%,transparent_56%)]',
          '[&>:first-child]:after:bg-[length:250%_100%] [&>:first-child]:after:bg-no-repeat',
          'motion-safe:[&>:first-child]:after:animate-match-found-sheen',
        ],
      },
      false: {},
    },
  },
  defaultVariants: { actions: true, phase: 'running', pending: true },
})

/**
 * One player slot in {@link MatchFound}: a dot that is waiting (dashed spinner), ready (success
 * fill + check), you while you haven't answered (accent ring + label), or you after declining or
 * expiring (danger ring + cross). A slot that turns ready transitions its colour and plays a pop
 * and a burst ring — the class change starts them, so slots that mount ready play them while
 * still hidden by their rise-in delay.
 */
export const matchFoundSlotStyles = tv({
  slots: {
    slot: [
      'relative size-6.5 @min-[460px]:size-7 motion-safe:animate-match-found-rise',
      'after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:border-2 after:border-success after:opacity-0',
    ],
    dot: [
      'absolute inset-0 grid place-items-center rounded-full *:[grid-area:1/1]',
      'transition-[background-color,box-shadow] duration-slow ease-sukuna motion-reduce:transition-none',
      // Dashed spinner ring (waiting / you).
      'before:absolute before:rounded-full before:border-[1.5px] before:border-dashed before:[rotate:1turn]',
      'before:transition-opacity before:duration-fast motion-reduce:before:transition-none',
    ],
    check: [
      'w-[62%] fill-none stroke-bg [stroke-dasharray:14]',
      'transition-[stroke-dashoffset] delay-120 duration-slow ease-sukuna motion-reduce:transition-none',
    ],
    you: 'text-[7.5px] font-bold uppercase leading-none tracking-[.06em]',
    cross: 'w-[56%] fill-none stroke-current',
  },
  variants: {
    fill: {
      waiting: {
        dot: [
          'bg-surface-2 text-text-faint shadow-[inset_0_0_0_1px_var(--sk-line)]',
          'before:inset-0.75 before:opacity-60 motion-safe:before:animate-match-found-spin',
        ],
        check: '[stroke-dashoffset:14]',
      },
      ready: {
        slot: 'motion-safe:after:animate-match-found-burst',
        dot: [
          'bg-success text-text-faint',
          'shadow-[inset_0_0_0_1px_var(--sk-success),0_0_14px_-3px_color-mix(in_oklab,var(--sk-success)_70%,transparent)]',
          'before:inset-0.75 before:opacity-0 motion-safe:animate-match-found-pop',
        ],
        check: '[stroke-dashoffset:0]',
      },
      you: {
        dot: [
          'bg-surface-2 text-accent shadow-[inset_0_0_0_1px_var(--sk-accent)]',
          'before:-inset-1 before:opacity-70 motion-safe:before:animate-match-found-spin',
        ],
        check: '[stroke-dashoffset:14]',
      },
      lost: {
        dot: [
          'bg-surface-2 text-danger shadow-[inset_0_0_0_1.5px_var(--sk-danger)]',
          'before:-inset-1 before:opacity-0',
        ],
        check: '[stroke-dashoffset:14]',
      },
    },
  },
  defaultVariants: { fill: 'waiting' },
})

export type MatchFoundStyleProps = VariantProps<typeof matchFoundStyles>
export type MatchFoundSlotStyleProps = VariantProps<typeof matchFoundSlotStyles>
