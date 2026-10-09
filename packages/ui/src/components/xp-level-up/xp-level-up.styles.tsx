import { tv, type VariantProps } from '../../utils/tv'

// The bar fill (old level and new level share it): an accent ramp with a bright tip at its end.
const fill = [
  'absolute inset-0 overflow-hidden rounded-pill',
  'bg-[linear-gradient(90deg,var(--sk-accent-deep),var(--sk-accent)_calc(100%_-_24px),color-mix(in_oklab,var(--sk-accent),var(--sk-on-accent)_25%))]',
  'before:absolute before:inset-y-0.75 before:right-0.75 before:w-0.75 before:rounded-pill before:bg-on-accent before:shadow-[0_0_8px_2px_var(--sk-accent-glow)]',
  // Forced colors drop background images: paint the fill with the system highlight instead.
  'forced-colors:bg-[Highlight]',
]

// A light band that sweeps once across whichever fill moves first. At rest it sits past the
// fill's right edge (translate 360%), clipped away by the fill's overflow.
const shine = [
  'after:absolute after:inset-y-0 after:left-0 after:w-[30%] after:[translate:360%_0]',
  'after:bg-[linear-gradient(100deg,transparent_15%,color-mix(in_oklab,var(--sk-on-accent)_75%,transparent)_50%,transparent_85%)]',
  'after:animate-xp-level-up-shine motion-reduce:after:animate-none',
]

/**
 * Slot class map for {@link XpLevelUp}. Pure and server-safe: no hooks, no DOM, no 'use client'.
 *
 * The base utilities ARE the settled card (final level, bar at `progress`, "Level up"); every
 * `animate-xp-level-up-*` utility animates from the start state, and each one is paired with
 * `motion-reduce:animate-none`, so reduced motion shows the final frame. The keyframes, the two
 * `@property` counters and the `xp-level-up-*` / `animate-xp-level-up-*` utilities are emitted into
 * the generated `theme.css` from `scripts/motion/xp-level-up.ts`. Each slot carries at most one
 * `animate-*` class (tailwind-merge can't dedupe custom ones); mode-dependent ones sit in the
 * `levelUp` variant.
 */
export const xpLevelUpStyles = tv({
  slots: {
    // A size container doesn't size to its content, so it would collapse to 0 in a shrink-to-fit
    // parent (w-fit dialog, items-center column, inline-flex); the intrinsic width stands in.
    root: [
      '@container relative isolate flex min-w-0 max-w-full flex-col gap-5 font-sans text-text',
      '[contain-intrinsic-inline-size:30rem]',
    ],
    eyebrow: [
      'm-0 flex items-center gap-2.25 font-display text-sm font-extrabold uppercase leading-none',
      'tracking-eyebrow font-stretch-[125%]',
      'before:size-1.75 before:flex-none before:rotate-45 before:bg-accent before:shadow-[0_0_8px_var(--sk-accent-glow)]',
    ],
    main: 'flex items-center gap-5.5 @max-md:gap-3.5',
    badge: [
      'relative h-26 w-23 flex-none @max-md:h-21.5 @max-md:w-19',
      '[--sk-xp-level-up-rim:color-mix(in_oklab,var(--sk-premium),var(--sk-on-accent)_40%)]',
    ],
    glow: [
      'pointer-events-none absolute top-1/2 left-1/2 -mt-30 -ml-26.5 size-60 rounded-pill opacity-42',
      'bg-[radial-gradient(closest-side,var(--sk-accent-glow),transparent)]',
    ],
    ring: [
      'pointer-events-none absolute top-1/2 left-1/2 -m-11.5 size-23 rounded-pill border-2 border-accent',
      'opacity-0 shadow-[0_0_16px_var(--sk-accent-glow)] [scale:2.2]',
      'animate-xp-level-up-ring motion-reduce:animate-none',
    ],
    sparks:
      'pointer-events-none absolute top-1/2 left-1/2 drop-shadow-[0_0_3px_var(--sk-accent-glow)]',
    // DECISION(open): Q39 spark colors. The mockup alternates accent/premium through light-dark(),
    // which needs a color-scheme the theme doesn't set; odd sparks take --sk-premium in every theme
    // (the mockup's cream in dark, the rim's gold-brown in light).
    spark: [
      'xp-level-up-spark odd:[--sk-xp-level-up-c:var(--sk-premium)]',
      'animate-xp-level-up-spark motion-reduce:animate-none',
    ],
    hexWrap: 'absolute inset-0',
    // Its own layer so the flare fades linearly while the badge pops on the spring.
    flare:
      'absolute inset-0 [filter:brightness(1)_saturate(1)_drop-shadow(0_8px_14px_var(--sk-accent-glow))]',
    hex: [
      'xp-level-up-hex absolute inset-0',
      'bg-[conic-gradient(from_200deg,var(--sk-xp-level-up-rim),var(--sk-premium-dim),var(--sk-xp-level-up-rim),var(--sk-premium-dim),var(--sk-xp-level-up-rim))]',
    ],
    // The highlight sits just above the top tip so the small LV caption reads ≥ 4.5:1 in both themes.
    face: [
      'xp-level-up-hex absolute inset-1 grid place-content-center justify-items-center gap-px text-on-accent',
      'bg-[radial-gradient(120%_80%_at_50%_-4%,var(--sk-accent),var(--sk-accent-deep)_78%)]',
    ],
    // Forced colors: positioned, so it paints over the number's (taller) text backplate.
    prefix: [
      '-mr-[.26em] text-[10px] font-semibold leading-none tracking-[.26em]',
      '[text-shadow:0_1px_0_var(--sk-accent-deep)] forced-colors:relative',
    ],
    num: [
      'xp-level-up-level font-display text-[40px] font-black leading-none font-stretch-[105%] tabular-nums',
      '[text-shadow:0_2px_0_var(--sk-accent-deep)] @max-md:text-[32px]',
    ],
    col: 'flex min-w-0 flex-1 flex-col gap-3',
    head: 'flex min-h-7 flex-wrap items-center justify-between gap-x-3 gap-y-2',
    heading: 'm-0 grid',
    prelude: '[grid-area:1/1] self-center text-md font-semibold leading-none text-text-dim',
    headline: [
      '[grid-area:1/1] font-display text-[28px] font-black uppercase leading-none font-stretch-[118%]',
      'text-text bg-clip-text [-webkit-background-clip:text] [-webkit-text-fill-color:transparent]',
      'bg-[linear-gradient(100deg,var(--sk-text)_40%,var(--sk-accent)_47%,var(--sk-premium)_51%,var(--sk-text)_58%)]',
      'bg-[length:320%_100%] @max-md:text-[21px]',
      'animate-xp-level-up-headline motion-reduce:animate-none',
    ],
    chip: [
      'm-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill bg-accent/11 px-2.5 py-1.5',
      'text-xs font-medium leading-none tabular-nums text-text-dim ring-1 ring-inset ring-accent/36',
      '[&_b]:font-semibold [&_b]:[color:color-mix(in_oklab,var(--sk-accent),var(--sk-text)_22%)]',
      'animate-xp-level-up-chip motion-reduce:animate-none',
    ],
    bar: 'relative h-3',
    track: [
      'absolute inset-0 rounded-pill bg-surface-2 ring-1 ring-inset ring-line',
      'bg-[repeating-linear-gradient(90deg,transparent_0_calc(10%_-_1px),var(--sk-line-soft)_0_10%)]',
      // Forced colors drop the ring (a box-shadow): outline the track with a real border.
      'forced-colors:border forced-colors:border-[CanvasText]',
    ],
    barGlow: 'absolute inset-0 rounded-pill drop-shadow-[0_0_6px_var(--sk-accent-glow)]',
    clip: 'absolute inset-0 overflow-hidden rounded-pill',
    fillOld: [...fill, 'opacity-0 animate-xp-level-up-charge motion-reduce:animate-none', ...shine],
    fillNew: [...fill, '[translate:calc(var(--sk-xp-level-up-progress)_*_1%_-_100%)_0]'],
    flash: [
      'pointer-events-none absolute inset-0 rounded-pill bg-accent opacity-0',
      'bg-[linear-gradient(transparent_30%,var(--sk-on-accent)_50%,transparent_70%)] shadow-[0_0_22px_6px_var(--sk-accent-glow)]',
      'animate-xp-level-up-flash motion-reduce:animate-none',
    ],
    meta: [
      'grid grid-cols-[1fr_auto] gap-x-3 text-[10.5px] font-medium uppercase leading-none tracking-[.06em]',
      'tabular-nums text-text-faint [&_b]:font-semibold [&_b]:text-text',
    ],
    targetOld: '[grid-area:1/1] opacity-0 animate-xp-level-up-swap-out motion-reduce:animate-none',
    targetNew: '[grid-area:1/1]',
    pct: [
      'xp-level-up-pct [grid-area:1/2] justify-self-end font-semibold text-text opacity-0',
      'animate-xp-level-up-count motion-reduce:animate-none',
    ],
    xp: '[grid-area:1/2] justify-self-end',
  },
  variants: {
    levelUp: {
      true: {
        glow: 'animate-xp-level-up-glow motion-reduce:animate-none',
        hexWrap: 'animate-xp-level-up-pop motion-reduce:animate-none',
        flare: 'animate-xp-level-up-flare motion-reduce:animate-none',
        num: 'animate-xp-level-up-roll motion-reduce:animate-none',
        prelude: 'opacity-0 animate-xp-level-up-prelude motion-reduce:animate-none',
        fillNew: 'animate-xp-level-up-refill motion-reduce:animate-none',
        targetNew: 'animate-xp-level-up-swap-in motion-reduce:animate-none',
        xp: 'animate-xp-level-up-swap-in motion-reduce:animate-none',
      },
      false: {
        // No headline swap: the prelude is the heading, so it takes the display type. A font size
        // drops `leading-none` in tailwind-merge, so each size here restates it.
        prelude:
          'font-display text-[22px] leading-none font-black uppercase text-text font-stretch-[112%] @max-md:text-xl',
        fillNew: ['animate-xp-level-up-gain motion-reduce:animate-none', ...shine],
      },
    },
    // Prestige levels need a smaller number to fit the hexagon: four digits, then five (the most
    // that fit). Each size restates `leading-none`, which tailwind-merge drops with the base size.
    digits: {
      4: { num: 'text-[28px] leading-none @max-md:text-[22px]' },
      5: { num: 'text-[22px] leading-none @max-md:text-xl' },
    },
  },
  defaultVariants: { levelUp: true },
})

export type XpLevelUpStyleProps = VariantProps<typeof xpLevelUpStyles>
