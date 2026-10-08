import { tv, type VariantProps } from '../../utils/tv'

/**
 * Slot class map for {@link RankReveal}. Pure and server-safe — no hooks, no DOM, no 'use client'.
 *
 * The `animate-rank-reveal-*` timeline, the `sk-rank-reveal-*` keyframes and the static
 * `rank-reveal-*` image layers are emitted into the generated `theme.css` from
 * `scripts/motion/rank-reveal.ts`. Base utilities ARE the final frame; each keyframe only holds the
 * start, fed per part by the literal `[--sk-rank-reveal-*:…]` classes below, so
 * `motion-reduce:animate-none` lands on the finished reveal.
 *
 * Colors: the `tone` variant captures `--sk-rank-reveal-hue|deep|glow` on the root (plus the shared
 * bone `--sk-rank-reveal-bone` and crest-outline `--sk-rank-reveal-cb`). The built-in crest pins
 * `data-theme="dark"` for its always-dark core and reads those captured values, so it still follows
 * the page theme's accent.
 */
export const rankRevealStyles = tv({
  slots: {
    root: [
      'relative isolate flex w-full flex-col items-center justify-center overflow-hidden',
      'px-4 pt-2 pb-8 text-center font-sans text-text @container rank-reveal-glow',
      '[--sk-rank-reveal-bone:color-mix(in_oklab,var(--sk-premium)_72%,var(--sk-on-accent))]',
      '[--sk-rank-reveal-cb:color-mix(in_oklab,var(--sk-on-accent)_75%,var(--sk-premium))]',
    ],
    // The effect layer: one aria-hidden box; `anchor` is the crest's center (a 0×0 grid cell every
    // part is stacked and centered on).
    fx: 'pointer-events-none relative h-47 w-full shrink-0 select-none',
    anchor:
      'absolute top-25 left-1/2 grid size-0 grid-cols-[0px] grid-rows-[0px] place-items-center',
    beams: [
      'col-start-1 row-start-1 grid size-180 place-items-center',
      '[mask-image:linear-gradient(black_412px,transparent_458px)]',
    ],
    rays: [
      'col-start-1 row-start-1 size-full rounded-pill opacity-50 rank-reveal-rays',
      '[--sk-rank-reveal-s:.55] animate-rank-reveal-rays motion-reduce:animate-none',
    ],
    raysAlt: [
      'col-start-1 row-start-1 size-full rounded-pill opacity-14 rank-reveal-rays-alt',
      '[--sk-rank-reveal-s:.55] animate-rank-reveal-rays-alt motion-reduce:animate-none',
    ],
    halo: [
      'col-start-1 row-start-1 size-75 rounded-pill opacity-90 rank-reveal-halo',
      '[--sk-rank-reveal-from:.4] [--sk-rank-reveal-peak:1.2]',
      'animate-rank-reveal-halo motion-reduce:animate-none',
    ],
    wave: [
      'col-start-1 row-start-1 size-27.5 rounded-pill opacity-0',
      'border-[1.5px] border-(--sk-rank-reveal-bone)',
      'shadow-[0_0_16px_var(--sk-rank-reveal-glow),inset_0_0_16px_var(--sk-rank-reveal-glow)]',
      '[scale:2.9] [--sk-rank-reveal-o:1] [--sk-rank-reveal-s:.55]',
      'animate-rank-reveal-wave motion-reduce:animate-none',
    ],
    waveAlt: [
      'col-start-1 row-start-1 size-27.5 rounded-pill opacity-0',
      'border-[1.5px] border-(--sk-rank-reveal-hue)',
      'shadow-[0_0_16px_var(--sk-rank-reveal-glow),inset_0_0_16px_var(--sk-rank-reveal-glow)]',
      '[scale:4.4] [--sk-rank-reveal-o:1] [--sk-rank-reveal-s:.55]',
      'animate-rank-reveal-wave-alt motion-reduce:animate-none',
    ],
    sparks:
      'col-start-1 row-start-1 grid size-0 grid-cols-[0px] grid-rows-[0px] place-items-center',
    spark: [
      'col-start-1 row-start-1 h-6 w-[2.5px] rounded-pill opacity-0',
      'bg-[linear-gradient(to_top,transparent,var(--sk-rank-reveal-hue)_45%,var(--sk-rank-reveal-bone))]',
      '[--sk-rank-reveal-a:calc(var(--sk-rank-reveal-i)*36deg_+_18deg)]',
      '[--sk-rank-reveal-d:150px] even:[--sk-rank-reveal-d:116px]',
      '[--sk-rank-reveal-t0:rotate(var(--sk-rank-reveal-a))_translateY(-40px)_scaleY(.2)]',
      '[--sk-rank-reveal-t1:rotate(var(--sk-rank-reveal-a))_translateY(calc(var(--sk-rank-reveal-d)*-1))_scaleY(1)]',
      'animate-rank-reveal-spark motion-reduce:animate-none',
    ],
    orbit: 'col-start-1 row-start-1 size-50 -rotate-90 overflow-visible fill-none',
    orbitRing: [
      'stroke-[color-mix(in_oklab,var(--sk-rank-reveal-bone)_38%,transparent)] stroke-1',
      '[stroke-dasharray:1] [--sk-rank-reveal-o:1] [--sk-rank-reveal-dash:1]',
      'animate-rank-reveal-orbit motion-reduce:animate-none',
    ],
    ticks: 'animate-rank-reveal-ticks motion-reduce:animate-none',
    tickArc: [
      'stroke-[color-mix(in_oklab,var(--sk-text)_16%,transparent)] stroke-4',
      '[stroke-dasharray:.1_.9] [stroke-dashoffset:.55]',
    ],
    pips: 'col-start-1 row-start-1 grid size-0 grid-cols-[0px] grid-rows-[0px] place-items-center',
    // DECISION(open): pip knock-out ring — the 3px ring that cuts the orbit line behind each pip is
    // --sk-surface, the stage it is designed on; on another background it shows as a faint ring.
    pip: [
      'col-start-1 row-start-1 size-[9px] bg-(--sk-rank-reveal-bone) [transform:rotate(45deg)]',
      'even:size-1.5 even:bg-(--sk-rank-reveal-hue)',
      '[--sk-rank-reveal-a:calc(var(--sk-rank-reveal-i)*45deg_-_90deg)]',
      '[translate:calc(cos(var(--sk-rank-reveal-a))*74px)_calc(sin(var(--sk-rank-reveal-a))*74px)]',
      'shadow-[0_0_0_3px_var(--sk-surface),0_0_14px_2px_var(--sk-rank-reveal-glow)]',
      '[--sk-rank-reveal-peak:1.7] animate-rank-reveal-pip motion-reduce:animate-none',
    ],
    crest: [
      'col-start-1 row-start-1 grid place-items-center',
      '[filter:drop-shadow(0_10px_16px_color-mix(in_oklab,var(--sk-rank-reveal-deep)_60%,transparent))]',
      '[--sk-rank-reveal-s:.4] animate-rank-reveal-crest motion-reduce:animate-none',
    ],
    flash: 'grid place-items-center animate-rank-reveal-flash motion-reduce:animate-none',
    glint: [
      'col-start-1 row-start-1 size-5.5 rotate-45 [scale:0] opacity-0 rank-reveal-glint [translate:44px_-50px]',
      '[--sk-rank-reveal-r0:-45deg] animate-rank-reveal-glint motion-reduce:animate-none',
    ],
    glintAlt: [
      'col-start-1 row-start-1 size-4 rotate-45 [scale:0] opacity-0 rank-reveal-glint [translate:-46px_34px]',
      '[--sk-rank-reveal-r0:-45deg] animate-rank-reveal-glint-alt motion-reduce:animate-none',
    ],

    // Built-in crest: CSS layers in a 106×117 box (the mockup's 120×132 SVG, as percentages). Its
    // core is always dark, so the box pins data-theme="dark" (--sk-bg / --sk-text are the stage).
    crestArt: 'relative block h-[117px] w-[106px]',
    crestFace: [
      'absolute top-[2.27%] left-[5.83%] h-[95.45%] w-[88.33%]',
      '[clip-path:polygon(50%_0%,100%_23.81%,100%_76.19%,50%_100%,0%_76.19%,0%_23.81%)]',
      'bg-[linear-gradient(var(--sk-rank-reveal-hue),var(--sk-rank-reveal-deep))]',
    ],
    crestTop: [
      'absolute inset-0 bg-[color-mix(in_oklab,var(--sk-text)_20%,transparent)]',
      '[clip-path:polygon(50%_2.27%,94.17%_25%,50%_50%,5.83%_25%)]',
    ],
    crestBottom: [
      'absolute inset-0 bg-[color-mix(in_oklab,var(--sk-bg)_32%,transparent)]',
      '[clip-path:polygon(5.83%_75%,50%_50%,94.17%_75%,50%_97.73%)]',
    ],
    crestRim: [
      'absolute inset-0 bg-(--sk-rank-reveal-cb)',
      '[clip-path:polygon(50%_11.79%,84.38%_29.76%,84.38%_70.24%,50%_88.21%,15.63%_70.24%,15.63%_29.76%)]',
    ],
    // The core and the inner line's center share one box, so their radial gradients line up.
    crestCore: [
      'absolute top-[12.88%] left-[16.67%] h-[74.24%] w-[66.67%]',
      'bg-[radial-gradient(60%_60%_at_50%_55%,color-mix(in_oklab,var(--sk-rank-reveal-deep)_85%,var(--sk-bg)),color-mix(in_oklab,var(--sk-rank-reveal-deep)_30%,var(--sk-bg)))]',
      '[clip-path:polygon(50%_1.47%,98.44%_24.21%,98.44%_75.79%,50%_98.53%,1.56%_75.79%,1.56%_24.21%)]',
    ],
    crestLine: [
      'absolute top-[12.88%] left-[16.67%] h-[74.24%] w-[66.67%]',
      'bg-[color-mix(in_oklab,var(--sk-rank-reveal-hue)_45%,transparent)]',
      '[clip-path:polygon(50%_8.59%,90.63%_27.77%,90.63%_72.23%,50%_91.41%,9.38%_72.23%,9.38%_27.77%)]',
    ],
    crestLineCore: [
      'absolute top-[12.88%] left-[16.67%] h-[74.24%] w-[66.67%]',
      'bg-[radial-gradient(60%_60%_at_50%_55%,color-mix(in_oklab,var(--sk-rank-reveal-deep)_85%,var(--sk-bg)),color-mix(in_oklab,var(--sk-rank-reveal-deep)_30%,var(--sk-bg)))]',
      '[clip-path:polygon(50%_9.77%,89.38%_28.36%,89.38%_71.64%,50%_90.23%,10.63%_71.64%,10.63%_28.36%)]',
    ],
    crestFlame: [
      'absolute top-[26.15%] left-[33.2%] h-[45.82%] w-[33.6%] rank-reveal-flame',
      'bg-[linear-gradient(var(--sk-rank-reveal-cb)_15%,color-mix(in_oklab,var(--sk-rank-reveal-cb)_45%,var(--sk-rank-reveal-hue)))]',
    ],

    // Copy. Each line is a slot: the block clips at its own bottom edge (`animate-rank-reveal-slot`,
    // released once everything has risen) while an inline-block span rises up into it.
    copy: 'relative flex flex-col items-center',
    eyebrow: [
      'm-0 text-xs leading-[1.4] font-semibold tracking-eyebrow uppercase',
      'text-[color:color-mix(in_oklab,var(--sk-rank-reveal-hue)_82%,var(--sk-text))]',
      'animate-rank-reveal-slot motion-reduce:animate-none',
    ],
    eyebrowText: [
      'inline-block',
      'before:mr-3 before:inline-block before:h-px before:w-5.5 before:bg-current before:align-middle before:opacity-50',
      'after:ml-[calc(12px_-_var(--sk-tracking-eyebrow))] after:inline-block after:h-px after:w-5.5 after:bg-current after:align-middle after:opacity-50',
      '[--sk-rank-reveal-y:0_110%] animate-rank-reveal-eyebrow motion-reduce:animate-none',
    ],
    title: [
      'm-0 mt-1 pb-1.5 font-display text-[42px] leading-none font-black tracking-[.01em] uppercase',
      'font-stretch-expanded @max-[420px]:text-3xl',
      'animate-rank-reveal-slot motion-reduce:animate-none',
    ],
    titleText: [
      'inline-block text-text',
      'bg-[linear-gradient(100deg,var(--sk-text)_42%,var(--sk-rank-reveal-hue)_50%,var(--sk-text)_58%)] bg-[length:300%_100%]',
      'bg-clip-text [-webkit-background-clip:text] [-webkit-text-fill-color:transparent]',
      '[filter:drop-shadow(0_4px_20px_color-mix(in_oklab,var(--sk-rank-reveal-glow)_50%,transparent))]',
      '[--sk-rank-reveal-y:0_110%] animate-rank-reveal-title motion-reduce:animate-none',
    ],
    division: 'text-(--sk-rank-reveal-hue) [-webkit-text-fill-color:var(--sk-rank-reveal-hue)]',
    description: [
      'm-0 pb-0.5 text-[13px] leading-[1.45] text-text-dim',
      '[&_strong]:font-semibold [&_strong]:text-text',
      '[&_em]:text-sm [&_em]:font-semibold [&_em]:not-italic [&_em]:tabular-nums [&_em]:text-premium',
      'animate-rank-reveal-slot motion-reduce:animate-none',
    ],
    descriptionText: [
      'inline-block [--sk-rank-reveal-y:0_110%] animate-rank-reveal-line motion-reduce:animate-none',
    ],
  },
  variants: {
    // DECISION(open): Q38(c) rarity tokens — tier colors (Iron…Radiant) are not modelled until the
    // owner approves rarity tokens; `tone` offers crimson `accent` or bone/gold `premium` only.
    tone: {
      accent: {
        root: [
          '[--sk-rank-reveal-hue:var(--sk-accent)] [--sk-rank-reveal-deep:var(--sk-accent-deep)]',
          '[--sk-rank-reveal-glow:var(--sk-accent-glow)]',
        ],
      },
      premium: {
        root: [
          '[--sk-rank-reveal-hue:var(--sk-premium)] [--sk-rank-reveal-deep:var(--sk-premium-dim)]',
          '[--sk-rank-reveal-glow:color-mix(in_oklab,var(--sk-premium)_55%,transparent)]',
        ],
      },
    },
  },
  defaultVariants: { tone: 'accent' },
})

export type RankRevealStyleProps = VariantProps<typeof rankRevealStyles>
