import { tv, type VariantProps } from '../../utils/tv'

const HATCH =
  'bg-[image:repeating-linear-gradient(135deg,var(--sk-line-soft)_0_2px,transparent_2px_8px)] shadow-[inset_0_0_0_1px_var(--sk-line)]'
const RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'

/*
 * A week row is a grid of seven day columns over a decorative `background` layer (column lines,
 * today, outside and untracked days). Each column is a subgrid: the heading row lines up across
 * the week, then an `<ol>` of 22px lanes. A multi-day bar sits in the lane list of the day it
 * starts on and is `--sk-span` columns wide, drawn over the following days' empty lane. Event
 * colors come in through `--sk-event`; lanes are placed with inline `gridRow` (layout data).
 */
export const monthViewStyles = tv({
  slots: {
    root: '@container grid gap-3 text-text',
    header: 'flex flex-wrap items-center justify-between gap-x-4 gap-y-2',
    caption: 'm-0 font-display text-lg font-black tracking-[.06em] text-text uppercase italic',
    nav: 'flex items-center gap-1.5',
    navLink: [
      'grid size-8 place-items-center rounded-sm border border-line bg-surface-2 text-text-dim',
      'transition-colors duration-fast ease-sukuna motion-reduce:transition-none hover:text-text [&_svg]:size-4',
      RING,
      'focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
    ],
    frame: 'relative overflow-hidden rounded-md border border-line bg-surface',
    weekdays:
      'grid grid-cols-7 border-b border-line-soft bg-[color-mix(in_oklab,var(--sk-surface-2)_50%,var(--sk-surface))]',
    weekday:
      'truncate px-2 py-1.5 text-xs font-semibold tracking-[.08em] text-text-faint uppercase',
    week: 'relative grid min-h-[112px] grid-cols-[repeat(7,minmax(0,1fr))] grid-rows-[auto_1fr] border-b border-line-soft last:border-b-0',
    background: 'pointer-events-none absolute inset-0 grid grid-cols-7',
    dayBg: 'border-l border-line-soft first:border-l-0',
    day: 'relative row-span-2 grid min-w-0 grid-rows-subgrid',
    dayHead: 'grid content-start justify-items-start gap-1 px-1.5 pt-1.5 pb-1',
    heading: 'm-0 text-sm leading-none font-semibold',
    dayLink: ['rounded-pill', RING],
    dayNumber:
      'inline-grid h-[22px] min-w-[22px] place-items-center rounded-pill px-1 tabular-nums',
    custom: 'min-w-0 text-xs text-text-dim',
    lanes:
      'm-0 grid list-none grid-cols-[minmax(0,1fr)] auto-rows-[22px] content-start gap-y-0.5 p-0 pb-1.5',
    event: [
      'mx-1 flex h-[22px] min-w-0 items-center gap-1.5 rounded-sm px-1 text-xs',
      'hover:bg-surface-2 focus-visible:ring-inset',
      RING,
    ],
    eventDot: 'size-[7px] shrink-0 rounded-full bg-[var(--sk-event,var(--sk-chart-1))]',
    eventTime: 'shrink-0 text-text-dim tabular-nums',
    eventTitle: 'truncate',
    barItem: 'relative z-[1] ml-1 flex w-[calc(var(--sk-span)*100%-4px)]',
    bar: [
      'flex h-[22px] w-full min-w-0 items-center rounded-sm px-1.5 text-xs font-semibold text-text',
      'bg-[color-mix(in_oklab,var(--sk-event,var(--sk-chart-1))_22%,var(--sk-surface))]',
      'shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--sk-event,var(--sk-chart-1))_40%,transparent)]',
      'focus-visible:ring-inset',
      RING,
    ],
    more: [
      'mx-1 flex h-[22px] w-[calc(100%-8px)] cursor-pointer items-center rounded-sm border-0 bg-transparent px-1',
      'text-left text-xs font-semibold text-text-dim hover:bg-surface-2 hover:text-text focus-visible:ring-inset',
      RING,
    ],
    // The native popover sits in the top layer, centred by the UA styles; it fades in.
    morePopover: [
      'm-auto max-h-[min(420px,calc(100vh-32px))] w-[min(320px,calc(100vw-32px))] overflow-y-auto',
      'rounded-md border border-line bg-surface p-3 text-text shadow-card',
      'transition-opacity duration-fast ease-sukuna motion-reduce:transition-none starting:open:opacity-0',
    ],
    moreTitle: 'm-0 mb-2 text-sm font-semibold text-text',
    moreList: 'm-0 grid list-none gap-0.5 p-0',
    moreRow: [
      'flex min-w-0 items-center gap-2 rounded-sm px-1.5 py-1 text-sm hover:bg-surface-2',
      RING,
    ],
    tile: 'grid min-h-16 content-start gap-1 rounded-sm bg-surface-2 p-1.5',
    skeleton: 'mx-1 h-[18px] self-center',
    empty: 'pointer-events-none absolute inset-0 z-[2] grid place-items-center p-4',
    emptyCard: 'pointer-events-auto shadow-card',
    list: '',
  },
  variants: {
    variant: {
      grid: {},
      tiles: {
        frame: 'overflow-visible rounded-none border-0 bg-transparent',
        weekdays: 'border-b-0 bg-transparent',
        week: 'min-h-0 grid-rows-none gap-1 border-b-0 pt-1',
        dayNumber: 'h-auto min-w-0 px-0 text-xs text-text-faint',
      },
    },
    tone: {
      in: { dayNumber: 'text-text' },
      out: { dayNumber: 'text-text-faint' },
      today: { dayNumber: 'bg-gradient-accent px-1 text-on-accent', dayBg: 'bg-accent/7' },
    },
    outside: { true: { dayBg: 'bg-well/35' }, false: {} },
    untracked: { true: { dayBg: HATCH, tile: ['bg-transparent', HATCH] }, false: {} },
    // Tiles only: a tracked day without content is lighter, a future day only outlined.
    fill: {
      content: {},
      none: { tile: 'bg-surface-2/45' },
      future: { tile: 'bg-transparent shadow-[inset_0_0_0_1px_var(--sk-line)]' },
    },
    continuesStart: {
      true: { barItem: 'ml-0', bar: 'rounded-l-none' },
      false: {},
    },
    continuesEnd: { true: { bar: 'rounded-r-none' }, false: {} },
    list: {
      // Both layouts render; the container query shows one. No resize script.
      auto: { frame: '@max-[600px]:hidden', list: 'hidden @max-[600px]:grid' },
      always: {},
      never: {},
    },
  },
  compoundVariants: [
    // Tiles keep every day number faint; only today's pill stands out.
    { variant: 'tiles', tone: 'in', class: { dayNumber: 'text-text-faint' } },
    {
      continuesStart: false,
      continuesEnd: false,
      class: { barItem: 'w-[calc(var(--sk-span)*100%-8px)]' },
    },
    {
      continuesStart: true,
      continuesEnd: true,
      class: { barItem: 'w-[calc(var(--sk-span)*100%)]' },
    },
  ],
  defaultVariants: {
    variant: 'grid',
    tone: 'in',
    outside: false,
    untracked: false,
    fill: 'content',
    continuesStart: false,
    continuesEnd: false,
    list: 'auto',
  },
})

export type MonthViewStyleProps = VariantProps<typeof monthViewStyles>
