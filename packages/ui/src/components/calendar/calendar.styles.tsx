import { tv, type VariantProps } from '../../utils/tv'

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring'

export const calendarStyles = tv({
  slots: {
    root: 'inline-grid max-w-full gap-2.5 select-none',
    header: 'flex min-h-8 items-center justify-between gap-2',
    // The month name: the display face in the HUD treatment (italic, uppercase, black weight).
    caption: [
      '-ml-2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border-0 bg-transparent px-2 py-1.5',
      'font-display text-[13px] leading-5 font-black tracking-[0.06em] text-text uppercase italic',
    ],
    captionIcon: 'text-text-faint transition-transform duration-fast ease-sukuna',
    // ml-auto: with two months the caption is visually hidden, so the arrows still sit right.
    nav: 'ml-auto flex gap-1',
    navButton: [
      'grid size-8 cursor-pointer place-items-center rounded-sm border border-line bg-surface-2 p-0 text-text-dim',
      'transition-colors duration-fast ease-sukuna hover:text-text',
      'disabled:cursor-default disabled:opacity-40 disabled:hover:text-text-dim',
      focusRing,
    ],
    body: 'min-w-0',
    months: 'flex items-start gap-6',
    month: 'grid min-w-0 gap-1',
    monthCaption:
      'pb-1 font-display text-[13px] leading-5 font-black tracking-[0.06em] text-text uppercase italic',
    grid: 'w-[280px] max-w-full table-fixed border-separate border-spacing-x-0 border-spacing-y-0.5',
    weekday:
      'h-6 p-0 text-center text-xs font-semibold tracking-[0.08em] text-text-faint uppercase',
    // The range band lives on the cell's ::before, behind the day button.
    cell: 'relative p-0',
    day: [
      'relative z-[1] grid aspect-square w-full cursor-pointer place-items-center rounded-sm border-0 bg-transparent p-0',
      'text-[13px] font-medium text-text tabular-nums',
      'transition-colors duration-fast ease-sukuna hover:bg-surface-2',
      'focus-visible:z-[2]',
      focusRing,
      'aria-disabled:cursor-not-allowed aria-disabled:text-text-faint aria-disabled:opacity-45 aria-disabled:hover:bg-transparent',
    ],
    marks: 'pointer-events-none absolute bottom-[5px] left-1/2 flex -translate-x-1/2 gap-0.5',
    mark: 'size-1 rounded-full bg-[var(--sk-mark,var(--sk-text-faint))]',
    pickGrid: 'grid aspect-[280/276] w-[280px] max-w-full gap-1.5',
    pick: [
      'cursor-pointer rounded-sm border-0 bg-transparent p-0 text-[13px] font-medium text-text capitalize tabular-nums',
      'transition-colors duration-fast ease-sukuna hover:bg-surface-2',
      focusRing,
      'aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent',
    ],
  },
  variants: {
    interactiveCaption: {
      true: { caption: `cursor-pointer hover:bg-surface-2 ${focusRing}` },
      false: { caption: 'cursor-default' },
    },
    expanded: {
      true: { captionIcon: 'rotate-180' },
      false: {},
    },
    slide: {
      none: {},
      next: { body: 'motion-safe:animate-calendar-next' },
      prev: { body: 'motion-safe:animate-calendar-prev' },
      zoom: { body: 'motion-safe:animate-calendar-zoom' },
    },
    band: {
      none: {},
      single: {},
      full: { cell: 'before:absolute before:inset-x-0 before:inset-y-[3px]' },
      start: { cell: 'before:absolute before:inset-y-[3px] before:right-0 before:left-1/2' },
      end: { cell: 'before:absolute before:inset-y-[3px] before:right-1/2 before:left-0' },
    },
    // Half-picked ranges preview at half strength.
    pending: {
      true: {},
      false: {},
    },
    rowStart: { true: {}, false: {} },
    rowEnd: { true: {}, false: {} },
    outside: {
      true: { day: 'text-text-faint' },
      false: {},
    },
    today: {
      true: { day: 'font-bold shadow-[inset_0_0_0_1px_var(--sk-text-faint)]' },
      false: {},
    },
    // Selected days and range ends: the accent gradient (its lightest stop keeps white text AA).
    selected: {
      true: {
        day: 'bg-gradient-accent font-bold text-on-accent shadow-none hover:bg-gradient-accent hover:brightness-110 focus-visible:outline-text',
        mark: 'bg-on-accent',
        pick: 'bg-gradient-accent font-bold text-on-accent shadow-none hover:bg-gradient-accent hover:brightness-110 focus-visible:outline-text',
      },
      false: {},
    },
    current: {
      true: { pick: 'shadow-[inset_0_0_0_1px_var(--sk-text-faint)]' },
      false: {},
    },
    kind: {
      years: { pickGrid: 'grid-cols-4 grid-rows-5' },
      months: { pickGrid: 'grid-cols-3 grid-rows-4' },
    },
  },
  compoundVariants: [
    { band: ['full', 'start', 'end'], pending: false, class: { cell: 'before:bg-accent/18' } },
    { band: ['full', 'start', 'end'], pending: true, class: { cell: 'before:bg-accent/9' } },
    { band: ['full', 'end'], rowStart: true, class: { cell: 'before:rounded-l-sm' } },
    { band: ['full', 'start'], rowEnd: true, class: { cell: 'before:rounded-r-sm' } },
  ],
  defaultVariants: {
    interactiveCaption: false,
    expanded: false,
    slide: 'none',
    band: 'none',
    pending: false,
    rowStart: false,
    rowEnd: false,
    outside: false,
    today: false,
    selected: false,
    current: false,
    kind: 'years',
  },
})

export type CalendarStyleProps = VariantProps<typeof calendarStyles>
