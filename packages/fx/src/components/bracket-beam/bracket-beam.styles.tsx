import { tv, type VariantProps } from '../../utils/tv'

/**
 * Slot class map for {@link BracketBeam}. Pure and server-safe: no hooks, no DOM, no
 * 'use client'. `animate-bracket-beam-*`, `bracket-beam-glow` and `bracket-beam-bloom` come from
 * `src/styles/bracket-beam.css`. The base styles are the final frame (the champion's path lit,
 * the trophy lit); the island adds `data-dim` to animate toward it, and `data-state` on the
 * scroller (`group/fx`) swaps the CSS poster wires for its SVG.
 */
export const bracketBeamStyles = tv({
  slots: {
    // Component colors from the theme tokens (docs/component-bracket-beam.md § 4).
    // DECISION(open): bracket-beam hot/ink colors — color-mix(accent, text) until theme blocks set
    // `color-scheme` (docs/theming.md T2); then light-dark() can match the mockup's per-scheme mix.
    root: [
      'relative isolate min-w-0 font-sans text-text',
      '[--sk-bracket-beam-ink:color-mix(in_oklab,var(--sk-accent)_80%,var(--sk-text))]',
      '[--sk-bracket-beam-hot:color-mix(in_oklab,var(--sk-accent)_62%,var(--sk-text))]',
    ],
    // The island's element: owns data-state (group/fx), scrolls sideways when the bracket is wider.
    scroller: [
      'group/fx relative h-full overflow-x-auto overflow-y-hidden rounded-md @container/bracket-beam',
      '[scrollbar-color:var(--sk-line)_transparent] [scrollbar-width:thin]',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
    ],
    grid: [
      'relative isolate grid min-h-full min-w-max gap-x-(--sk-bracket-beam-gap) px-4.5 pt-3.5 pb-4',
      '[--sk-bracket-beam-gap:clamp(36px,6cqi,64px)]',
      '@max-[640px]/bracket-beam:w-max @max-[640px]/bracket-beam:px-3.5 @max-[640px]/bracket-beam:py-3',
      '@max-[640px]/bracket-beam:[--sk-bracket-beam-gap:36px]',
    ],
    column: 'flex min-w-0 flex-col',
    heading: [
      'mb-2 box-border flex h-[21px] shrink-0 justify-between gap-1.5 overflow-hidden',
      'border-b border-line-soft pb-1.5 font-sans text-[10px] leading-[14px] font-medium',
      'tracking-eyebrow whitespace-nowrap text-text-faint uppercase tabular-nums',
      '@max-[640px]/bracket-beam:tracking-[0.14em]',
    ],
    headingMeta: 'font-medium text-text-dim',
    list: 'm-0 flex flex-1 list-none flex-col p-0',
    slot: 'relative flex flex-1 items-center py-3',
    match:
      'relative w-full divide-y divide-line-soft overflow-hidden rounded-sm border border-line bg-surface-2',
    row: [
      'group/row relative isolate flex h-[26px] items-center gap-2 pr-2.5 pl-[9px]',
      'font-display text-[13px] leading-none font-medium [font-stretch:94%] text-text-dim',
    ],
    seed: 'w-3 shrink-0 font-sans text-[10px] leading-none font-medium tabular-nums text-text-faint',
    name: 'min-w-0 flex-1 truncate',
    score: [
      'font-sans text-[13px] leading-none font-semibold tabular-nums text-text-faint',
      'transition-colors duration-slow motion-reduce:transition-none',
    ],
    // The server-drawn connector to the next round (two bordered halves: ::before and ::after).
    // Geometry: inline --sk-bracket-beam-{ys,y,hs,h} (slots and px, from the data). Hidden once the
    // island has drawn its SVG wires (the BUILDERS.md § 3 poster-layer strings).
    wire: [
      'pointer-events-none absolute left-full w-(--sk-bracket-beam-gap)',
      'top-[calc(50%+var(--sk-bracket-beam-ys)*100%+var(--sk-bracket-beam-y)*1px)]',
      'h-[calc(var(--sk-bracket-beam-hs)*100%+var(--sk-bracket-beam-h)*1px)]',
      'before:absolute after:absolute',
      'transition-opacity duration-slow ease-sukuna motion-reduce:transition-none group-data-[state=running]/fx:opacity-0 group-data-[state=paused]/fx:opacity-0 group-data-[state=still]/fx:opacity-0',
    ],
    // A column flexbox, so the card stretches to the trophy column's width (centred vertically).
    trophy: 'relative flex flex-1 flex-col justify-center py-3',
    card: [
      'group/card relative rounded-md border border-accent bg-surface-2 px-4 py-3.5',
      'shadow-[0_0_0_1px_color-mix(in_oklab,var(--sk-accent)_35%,transparent),0_0_40px_-8px_var(--sk-accent-glow),inset_0_0_28px_-14px_var(--sk-accent-glow)]',
      'transition-[border-color,box-shadow] duration-[500ms,600ms] motion-reduce:transition-none',
      'data-[dim]:border-dashed data-[dim]:border-line data-[dim]:shadow-none',
      // The shock ring bursts off the card as it ignites (replays whenever data-dim goes away).
      'after:pointer-events-none after:absolute after:-inset-px after:rounded-[inherit] after:border-[1.5px] after:border-accent after:opacity-0',
      'after:animate-bracket-beam-shock data-[dim]:after:animate-none',
      '@max-[640px]/bracket-beam:p-3',
    ],
    bloom: [
      'pointer-events-none absolute -inset-x-3.5 -inset-y-14 -z-10 rounded-full bracket-beam-bloom',
      'animate-bracket-beam-breathe transition-opacity duration-[600ms] motion-reduce:transition-none',
      'group-data-[dim]/card:animate-none group-data-[dim]/card:opacity-0',
    ],
    eyebrow: [
      'm-0 flex items-center gap-2 font-sans text-[10px] leading-none font-semibold tracking-eyebrow',
      'text-(--sk-bracket-beam-ink) uppercase',
      'transition-[color,letter-spacing] duration-[300ms,800ms] ease-sukuna motion-reduce:transition-none',
      'group-data-[dim]/card:tracking-[0.5em] group-data-[dim]/card:text-text-faint',
    ],
    crown:
      'h-[13px] w-[18px] shrink-0 fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]',
    title: [
      'm-0 mt-2.5 grid font-display text-[clamp(18px,2.2cqi,22px)] leading-[1.05] font-extrabold',
      '[font-stretch:118%] whitespace-nowrap',
    ],
    titleText: [
      'col-start-1 row-start-1 [clip-path:inset(-30px)] [text-shadow:0_0_22px_var(--sk-accent-glow)]',
      'transition-[clip-path,text-shadow] delay-100 duration-[800ms,600ms] ease-sukuna motion-reduce:transition-none',
      'group-data-[dim]/card:[clip-path:inset(-30px_100%_-30px_0)] group-data-[dim]/card:[text-shadow:none]',
      'group-data-[dim]/card:delay-0 group-data-[dim]/card:duration-[350ms]',
    ],
    meta: [
      'm-0 mt-1.5 grid font-sans text-[10.5px] leading-[1.3] font-medium whitespace-nowrap text-text-dim tabular-nums',
      '[&_b]:font-semibold [&_b]:text-text @max-[640px]/bracket-beam:text-[9.5px]',
    ],
    metaText: [
      'col-start-1 row-start-1 transition-[opacity,translate] delay-[450ms] duration-500 ease-sukuna motion-reduce:transition-none',
      'group-data-[dim]/card:translate-y-[5px] group-data-[dim]/card:opacity-0',
      'group-data-[dim]/card:delay-0 group-data-[dim]/card:duration-[250ms]',
    ],
    // Pending placeholders (name, meta): only shown while the trophy waits for the last beam.
    bar: [
      'col-start-1 row-start-1 h-[0.4em] w-[72%] self-center rounded-pill bg-line-soft opacity-0',
      'transition-opacity duration-[250ms] motion-reduce:transition-none',
      'group-data-[dim]/card:opacity-100 group-data-[dim]/card:delay-200',
    ],
    // The island's SVG layer (the BUILDERS.md § 3 canvas strings: shown once it has drawn).
    overlay:
      'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-slow ease-sukuna motion-reduce:transition-none group-data-[state=running]/fx:opacity-100 group-data-[state=paused]/fx:opacity-100 group-data-[state=still]/fx:opacity-100',
    svg: 'absolute inset-0 size-full overflow-visible fill-none',
  },
  variants: {
    champion: {
      true: {
        grid: [
          'grid-cols-[repeat(var(--sk-bracket-beam-rounds),minmax(146px,1fr))_minmax(184px,1.15fr)]',
          '@max-[640px]/bracket-beam:grid-cols-[repeat(var(--sk-bracket-beam-rounds),146px)_176px]',
        ],
      },
      false: {
        grid: [
          'grid-cols-[repeat(var(--sk-bracket-beam-rounds),minmax(146px,1fr))]',
          '@max-[640px]/bracket-beam:grid-cols-[repeat(var(--sk-bracket-beam-rounds),146px)]',
        ],
      },
    },
    winner: {
      true: { row: 'font-[750] text-text', score: 'text-text' },
    },
    // A row on the champion's path: lit by default (the poster), dimmed by the island's data-dim.
    // DECISION(open): bracket-beam lit row contrast — ink score, lifted seed and a 10% wash end
    // (the mockup's accent score, faint seed and 18% end miss AA on the wash; spec § 4).
    trail: {
      true: {
        row: [
          'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:origin-left before:bracket-beam-glow',
          'after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:-z-10 after:w-0.5 after:bg-accent',
          'before:[transition:opacity_0s,scale_320ms_var(--sk-ease)] after:[transition:opacity_0s,scale_320ms_var(--sk-ease)]',
          'data-[dim]:before:scale-x-0 data-[dim]:before:opacity-0 data-[dim]:after:scale-y-0 data-[dim]:after:opacity-0',
          'data-[dim]:before:[transition:opacity_500ms,scale_0s_500ms] data-[dim]:after:[transition:opacity_500ms,scale_0s_500ms]',
          'motion-reduce:before:transition-none motion-reduce:after:transition-none',
        ],
        // On the lit wash the faint seed would drop under AA: lift it while lit.
        seed: 'text-text/70 group-data-[dim]/row:text-text-faint',
        score: 'text-(--sk-bracket-beam-ink) group-data-[dim]/row:text-text',
      },
    },
    dir: {
      down: {
        wire: [
          'before:top-[-0.75px] before:left-0 before:h-[calc(50%+0.75px)] before:w-[calc(50%+0.75px)] before:rounded-tr-[7px] before:border-t-[1.5px] before:border-r-[1.5px]',
          'after:top-1/2 after:left-[calc(50%-0.75px)] after:h-[calc(50%+0.75px)] after:w-[calc(50%+0.75px)] after:rounded-bl-[7px] after:border-b-[1.5px] after:border-l-[1.5px]',
        ],
      },
      up: {
        wire: [
          'before:top-1/2 before:left-0 before:h-[calc(50%+0.75px)] before:w-[calc(50%+0.75px)] before:rounded-br-[7px] before:border-r-[1.5px] before:border-b-[1.5px]',
          'after:top-[-0.75px] after:left-[calc(50%-0.75px)] after:h-[calc(50%+0.75px)] after:w-[calc(50%+0.75px)] after:rounded-tl-[7px] after:border-t-[1.5px] after:border-l-[1.5px]',
        ],
      },
      flat: { wire: 'before:top-[-0.75px] before:left-0 before:w-full before:border-t-[1.5px]' },
    },
    lit: {
      false: { wire: 'before:border-line after:border-line' },
      true: {
        wire: [
          'before:border-accent after:border-accent',
          '[filter:drop-shadow(0_0_1px_var(--sk-accent))_drop-shadow(0_0_3px_var(--sk-accent))_drop-shadow(0_0_6px_var(--sk-accent-glow))]',
        ],
      },
    },
  },
  defaultVariants: { champion: true, winner: false, trail: false, dir: 'flat', lit: false },
})

export type BracketBeamStyleProps = VariantProps<typeof bracketBeamStyles>

/**
 * Classes for the SVG layers the island creates (it sets them with `setAttribute('class', …)`,
 * so they live here as literal strings for Tailwind to find). Dash arrays, offsets, opacities and
 * positions are attributes the island writes each frame; nothing here sets them.
 */
export const bracketBeamLayers = {
  /** Every connector. */
  base: 'stroke-line stroke-[1.5]',
  /** The lit path, revealed by its dash offset. */
  trail: 'stroke-accent stroke-2',
  /** Dashes marching along the lit path after the trophy ignites. */
  flow: 'stroke-(--sk-bracket-beam-hot) stroke-[1.5] [stroke-dasharray:2_10]',
  /** The comet: a wide faint tail, a mid stroke and a hot core. */
  tail: 'stroke-accent stroke-[6] opacity-30 [stroke-linecap:round]',
  comet: 'stroke-accent stroke-[2.5]',
  core: 'stroke-(--sk-bracket-beam-hot) stroke-[3] [stroke-linecap:round]',
  /** The ripple where a beam lands. */
  ring: 'stroke-accent stroke-[1.5]',
  /** The beam's head: a soft halo and a hot dot. */
  halo: 'fill-accent [fill-opacity:0.35]',
  head: 'fill-(--sk-bracket-beam-hot)',
  /** Sparks and embers. */
  spark: 'fill-accent',
  sparkHot: 'fill-(--sk-bracket-beam-hot)',
} as const
