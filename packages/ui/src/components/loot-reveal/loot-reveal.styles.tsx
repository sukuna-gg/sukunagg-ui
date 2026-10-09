import { tv, type VariantProps } from '../../utils/tv'

/**
 * Slot class map for {@link LootReveal}. Pure and server-safe — no hooks, no DOM, no 'use client'.
 *
 * The base classes ARE the revealed frame (face up, halo on, rays resting at 30%); the
 * `animate-loot-reveal-*` utilities (only in the `play` variant) start each layer from its
 * face-down state, so `motion-reduce:animate-none` and `play={false}` land on the reveal. The
 * keyframes and utilities come from `scripts/motion/loot-reveal.ts` (emitted into `theme.css`).
 * Every layer reads its color from `--sk-loot-reveal-color`, set per card by `rarity`.
 */
export const lootRevealStyles = tv({
  slots: {
    // overflow-x-clip: the burst spills up and down but never widens the page (a stage that
    // clips itself can opt out with overflow-x-visible so the rays reach its edges).
    root: [
      '@container isolate m-0 flex w-full list-none flex-wrap items-start justify-center gap-y-6 p-0',
      'overflow-x-clip',
      // The card width. Each slot takes 99cqi/n of the row: its card plus its own 2 × 2.25cqi
      // padding (`px-[2.25cqi]` below), so n cards always fit and only the 72px floor wraps the
      // row. At n = 3 the card is 28.5cqi, as in the prototype. (cqi resolves where it is used:
      // in the slots, against this container.)
      '[--sk-loot-reveal-card:clamp(72px,calc(99cqi/var(--sk-loot-reveal-n,3)_-_4.5cqi),124px)]',
    ],
    slot: 'loot-reveal-clock flex flex-col items-center gap-3.5 px-[2.25cqi]',
    box: [
      'relative aspect-[5/7] w-(--sk-loot-reveal-card)',
      // the soft floor shadow under the card
      'before:absolute before:inset-x-[6%] before:-bottom-[8%] before:h-[9%] before:rounded-[50%]',
      'before:bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--sk-well)_80%,transparent),transparent)]',
    ],
    // Burst layers behind the card (legendary only, except halo + ring).
    rays: [
      'pointer-events-none absolute top-1/2 left-1/2 -mt-[145%] -ml-[145%] aspect-square w-[290%]',
      'rotate-20 rounded-full opacity-30 [mask:radial-gradient(closest-side,black_18%,transparent)]',
      'motion-reduce:animate-none',
    ],
    beams: [
      'absolute inset-0 bg-[color-mix(in_oklab,var(--sk-loot-reveal-glint)_60%,transparent)]',
      '[mask:repeating-conic-gradient(from_4deg,black_0_3deg,transparent_3deg_15deg)]',
    ],
    halo: 'pointer-events-none absolute rounded-full motion-reduce:animate-none',
    core: [
      'pointer-events-none absolute top-1/2 left-1/2 -mt-[105%] -ml-[105%] aspect-square w-[210%]',
      'scale-125 rounded-full opacity-0',
      'bg-[radial-gradient(closest-side,var(--sk-loot-reveal-glint),color-mix(in_oklab,var(--sk-loot-reveal-glint)_30%,transparent)_45%,transparent)]',
      'motion-reduce:animate-none',
    ],
    wave: [
      'pointer-events-none absolute top-1/2 left-1/2 -mt-[60%] -ml-[60%] aspect-square w-[120%]',
      'scale-230 rounded-full border-[1.5px] border-(--sk-loot-reveal-color) opacity-0',
      'motion-reduce:animate-none',
    ],
    ring: [
      'pointer-events-none absolute inset-0 rounded-md border-[1.5px] border-(--sk-loot-reveal-color)',
      'scale-x-120 scale-y-114 opacity-0 motion-reduce:animate-none',
    ],
    sparks: 'pointer-events-none absolute top-1/2 left-1/2',
    // The card: lifts (pop) while the inner flip turns it over in 3D.
    card: 'relative z-1 block h-full perspective-[640px] motion-reduce:animate-none',
    flip: 'relative block h-full transform-3d [rotate:y_180deg] motion-reduce:animate-none',
    back: [
      'absolute inset-0 grid place-items-center overflow-hidden rounded-md backface-hidden invisible',
      'border border-[color:color-mix(in_oklab,var(--sk-accent)_34%,var(--sk-line))] text-accent',
      'bg-surface-2 bg-[radial-gradient(80%_60%,color-mix(in_oklab,var(--sk-accent)_12%,transparent),transparent)]',
      '[box-shadow:var(--sk-shadow-card)] motion-reduce:animate-none',
    ],
    backFrame: [
      'absolute inset-[6%] rounded-[calc(var(--sk-radius-md)-5px)]',
      'border border-[color:color-mix(in_oklab,var(--sk-accent)_26%,transparent)]',
    ],
    backHatch: [
      'absolute inset-0 opacity-[.17] [mask:radial-gradient(circle,transparent_24%,black_52%)]',
      'bg-[repeating-linear-gradient(45deg,var(--sk-accent)_0_1px,transparent_1px_9px),repeating-linear-gradient(-45deg,var(--sk-accent)_0_1px,transparent_1px_9px)]',
    ],
    mark: [
      'relative w-2/5 drop-shadow-[0_0_7px_color-mix(in_oklab,currentColor_55%,transparent)]',
      '[&>*]:block [&>*]:h-auto [&>*]:w-full',
    ],
    face: [
      // grid-cols-1 = minmax(0,1fr): a long word can't widen the column past the card
      'absolute inset-0 grid grid-cols-1 grid-rows-[auto_1fr_auto] justify-items-center overflow-hidden rounded-md',
      'px-[8%] pt-[9%] pb-[12%] text-center text-text [rotate:y_180deg] backface-hidden',
      'border border-[color:color-mix(in_oklab,var(--sk-loot-reveal-color)_75%,transparent)] bg-surface-2',
      'bg-[radial-gradient(110%_70%_at_50%_40%,color-mix(in_oklab,var(--sk-loot-reveal-color)_30%,transparent),transparent_70%),linear-gradient(to_top,color-mix(in_oklab,var(--sk-loot-reveal-color)_16%,transparent),transparent_45%)]',
      // the rarity bar along the bottom edge
      'before:absolute before:inset-x-0 before:bottom-0 before:h-[3px] before:bg-(--sk-loot-reveal-color)',
      'motion-reduce:animate-none',
    ],
    kind: [
      'row-start-1 max-w-full truncate rounded-pill bg-(--sk-loot-reveal-color) px-[.75em] py-[.4em] text-surface',
      'font-sans text-[clamp(7px,1.8cqi,9px)] leading-none font-semibold tracking-[.14em] uppercase',
    ],
    icon: [
      'row-start-2 flex w-[46%] items-center self-center text-(--sk-loot-reveal-color)',
      'drop-shadow-[0_0_6px_color-mix(in_oklab,currentColor_60%,transparent)]',
      '[&>*]:block [&>*]:h-auto [&>*]:w-full motion-reduce:animate-none',
    ],
    name: [
      // 2.5cqi as in the prototype, but never over 10.5% of the card: at n = 3 that cap never
      // binds (the card is 28.5cqi, or 124px when the type is at its 13px max); with 4+ cards
      // the type shrinks with the cards, not only with the row.
      'row-start-3 font-display text-[length:clamp(9.5px,min(2.5cqi,calc(var(--sk-loot-reveal-card)*.105)),13px)]',
      'leading-[1.04] font-extrabold uppercase',
      'tracking-[.02em] text-balance font-stretch-condensed [word-spacing:.08em]',
      // long or unbreakable (translated) names wrap inside the card instead of clipping
      'wrap-anywhere',
    ],
    sheen: [
      'pointer-events-none absolute inset-0 translate-x-[120%]',
      'bg-[linear-gradient(110deg,transparent_35%,color-mix(in_oklab,var(--sk-loot-reveal-color)_45%,transparent)_50%,transparent_65%)]',
      'motion-reduce:animate-none',
    ],
    flare: [
      'pointer-events-none absolute inset-0 rounded-md [rotate:y_180deg] backface-hidden opacity-0',
      'loot-reveal-flare motion-reduce:animate-none',
    ],
    // Mixed 25% toward --sk-text: the card's own halo, glow and rays sit behind the label, so the
    // raw rarity color dips under 4.5:1 in light; the mix keeps AA on the rendered background.
    // -mx-[2.25cqi] undoes the slot's padding: a label wider than a small card ("Legendary" is
    // ~82px) spends that padding before it widens the slot (and wraps the row).
    rarity: [
      'relative z-1 -mx-[2.25cqi] grid min-h-2.5 font-sans text-[10px] leading-none font-semibold uppercase',
      'tracking-eyebrow text-[color-mix(in_oklab,var(--sk-loot-reveal-color)_75%,var(--sk-text))]',
    ],
    label: '[grid-area:1/1] text-center motion-reduce:animate-none',
    hint: '[grid-area:1/1] text-center text-text-faint opacity-0 motion-reduce:animate-none',
  },
  variants: {
    // DECISION(open): Q38(c) rarity tokens — rarities map onto existing tokens (text-faint,
    // chart-2, chart-5, premium) until the owner approves rarity colors; no --sk-rarity-* yet.
    rarity: {
      common: {
        slot: '[--sk-loot-reveal-color:var(--sk-text-faint)]',
        face: 'loot-reveal-glow',
        halo: '-inset-[28%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--sk-loot-reveal-color)_24%,transparent),transparent)]',
      },
      rare: {
        slot: '[--sk-loot-reveal-color:var(--sk-chart-2)]',
        face: 'loot-reveal-glow',
        halo: '-inset-[28%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--sk-loot-reveal-color)_24%,transparent),transparent)]',
      },
      epic: {
        slot: '[--sk-loot-reveal-color:var(--sk-chart-5)]',
        face: 'loot-reveal-glow',
        halo: '-inset-[28%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--sk-loot-reveal-color)_24%,transparent),transparent)]',
      },
      legendary: {
        slot: [
          '[--sk-loot-reveal-color:var(--sk-premium)]',
          '[--sk-loot-reveal-glint:color-mix(in_oklab,var(--sk-loot-reveal-color)_55%,var(--sk-on-accent))]',
        ],
        face: 'loot-reveal-glow-gilded',
        halo: '-inset-[45%] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--sk-loot-reveal-glint)_40%,transparent),transparent)]',
      },
    },
    stagger: {
      normal: { root: '[--sk-loot-reveal-step:350ms]' },
      slow: { root: '[--sk-loot-reveal-step:700ms]' },
    },
    // The only place animate-* classes live: one per slot, never two (tailwind-merge can't
    // dedupe custom animate-* names), and play={false} drops them all.
    play: {
      true: {
        card: 'animate-loot-reveal-pop',
        flip: 'animate-loot-reveal-flip',
        face: 'animate-loot-reveal-face',
        icon: 'animate-loot-reveal-glyph',
        halo: 'animate-loot-reveal-halo',
        ring: 'animate-loot-reveal-ring',
        rays: 'animate-loot-reveal-rays',
        core: 'animate-loot-reveal-core',
        wave: 'animate-loot-reveal-wave',
        flare: 'animate-loot-reveal-flare',
        sheen: 'animate-loot-reveal-sheen',
        label: 'animate-loot-reveal-label',
        hint: 'animate-loot-reveal-hint',
      },
      false: {},
    },
  },
  compoundVariants: [
    {
      play: true,
      rarity: ['common', 'rare', 'epic'],
      class: { back: 'animate-loot-reveal-back' },
    },
    { play: true, rarity: 'legendary', class: { back: 'animate-loot-reveal-charge' } },
  ],
  defaultVariants: { rarity: 'common', stagger: 'normal', play: true },
})

/**
 * One legendary spark (rendered only while the row plays). `loot-reveal-spark` places it from
 * `--sk-loot-reveal-j`; `shape` and `tint` alternate like the prototype (every 4th from 1 is a
 * dot, every 3rd is accent-colored).
 */
export const lootRevealSparkStyles = tv({
  base: 'loot-reveal-spark animate-loot-reveal-spark motion-reduce:animate-none',
  variants: {
    shape: {
      streak: [
        'h-[2.5px] w-(--sk-loot-reveal-w) -mt-[1.25px] -ml-[calc(var(--sk-loot-reveal-w)/2)] rounded-[2px]',
        'bg-[linear-gradient(90deg,transparent,var(--sk-loot-reveal-spark))]',
        'shadow-[0_0_8px_color-mix(in_oklab,var(--sk-loot-reveal-spark)_80%,transparent)]',
      ],
      dot: [
        '-mt-0.5 -ml-0.5 size-1 rounded-full bg-(--sk-loot-reveal-spark)',
        'shadow-[0_0_8px_color-mix(in_oklab,var(--sk-loot-reveal-spark)_80%,transparent)]',
      ],
    },
    tint: {
      rarity: '[--sk-loot-reveal-spark:var(--sk-loot-reveal-color)]',
      accent: '[--sk-loot-reveal-spark:var(--sk-accent)]',
    },
  },
  defaultVariants: { shape: 'streak', tint: 'rarity' },
})

export type LootRevealStyleProps = VariantProps<typeof lootRevealStyles>
