import { tv, type VariantProps } from '../../utils/tv'

/*
 * One question, then either the form (option rows with native radios) or the results (rows with
 * a bar behind the text). A result's bar width comes in through `--sk-poll-share` (an inline
 * custom property, the way charts take data); the bar grows from 0 via `animate-poll-bar`
 * (scripts/motion/poll.ts) and is drawn at full width under reduced motion.
 */
export const pollStyles = tv({
  slots: {
    root: 'grid min-w-0 gap-4 text-text',
    header: 'grid gap-1.5',
    title:
      'm-0 font-display text-[22px] leading-[1.1] font-extrabold font-stretch-[108%] text-balance text-text',
    meta: 'm-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-text-dim',
    sep: 'text-text-faint',
    form: 'm-0 grid gap-3.5',
    fieldset: 'm-0 grid min-w-0 gap-2 border-0 p-0',
    options: 'grid gap-2',
    option: [
      'flex min-h-12 items-center gap-3 rounded-md border border-line bg-surface-2 px-3.5',
      'transition-[border-color,background-color] duration-fast ease-sukuna hover:border-text-faint',
      'has-checked:border-accent has-checked:bg-[color-mix(in_oklab,var(--sk-accent)_8%,var(--sk-surface-2))]',
      'has-[[type=radio]:focus-visible]:ring-2 has-[[type=radio]:focus-visible]:ring-focus-ring',
      'has-[[type=radio]:focus-visible]:ring-offset-2 has-[[type=radio]:focus-visible]:ring-offset-bg',
    ],
    // The part of a row that selects it: the whole row for a plain option, the radio + "Other"
    // for the write-in row (the text field beside it is a separate control).
    choice: 'flex min-w-0 cursor-pointer items-center gap-3 self-stretch',
    radio: [
      'm-0 grid size-[18px] shrink-0 cursor-pointer appearance-none place-content-center rounded-full',
      'border-[1.5px] border-text-faint bg-transparent focus-visible:outline-none checked:border-accent',
      'before:size-2 before:rounded-full before:bg-accent before:scale-0 checked:before:scale-100',
      'before:transition-[scale] before:duration-fast before:ease-sukuna motion-reduce:before:transition-none',
    ],
    label: 'min-w-0 flex-1 font-semibold break-words',
    // Input `sm` look on --sk-surface.
    writeIn: [
      'h-8 min-w-0 flex-1 rounded-sm border border-line bg-surface px-3 text-sm text-text',
      'placeholder:text-text-faint transition-[border-color,box-shadow] duration-fast ease-sukuna',
      'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
    ],
    actions: 'flex flex-wrap items-center gap-x-3.5 gap-y-2.5',
    results: 'm-0 grid list-none gap-2 p-0',
    result: [
      'relative grid min-h-[46px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden',
      'rounded-md bg-surface-2 px-3.5',
    ],
    bar: [
      'absolute inset-y-0 start-0 w-(--sk-poll-share) ltr:origin-left rtl:origin-right',
      'animate-poll-bar motion-reduce:animate-none',
    ],
    name: 'relative flex min-w-0 items-center gap-2 font-semibold',
    nameText: 'min-w-0 truncate',
    percent: 'relative flex items-baseline gap-2 font-bold tabular-nums',
    count: 'text-sm font-medium text-text-faint',
    you: 'shrink-0 rounded-pill bg-gradient-accent px-[7px] py-0.5 text-xs font-bold text-on-accent',
    winner: [
      'm-0 flex items-center gap-2.5 rounded-md px-3.5 py-2.5 font-semibold text-text',
      'bg-[color-mix(in_oklab,var(--sk-premium)_12%,var(--sk-surface-2))]',
      '[&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-premium',
    ],
    note: 'm-0 text-sm text-text-dim',
    link: [
      'rounded-sm font-semibold text-accent underline underline-offset-4 hover:decoration-2',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
    ],
  },
  variants: {
    leader: {
      true: { bar: 'bg-accent/20' },
      false: { bar: 'bg-text/8' },
    },
  },
  defaultVariants: { leader: false },
})

export type PollStyleProps = VariantProps<typeof pollStyles>
