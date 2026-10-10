import { tv, type VariantProps } from '../../utils/tv'

/*
 * One block per day: a heading, then a list of rows. A row is a 4-column grid
 * (time 64px · 10px dot · text · status); below 420px of container width the status drops under
 * the title. Event colors come in through `--sk-event`.
 */
export const agendaStyles = tv({
  slots: {
    root: '@container grid content-start gap-1 text-text',
    day: 'grid',
    heading: 'm-0 px-2 py-2 text-xs font-bold uppercase tracking-[.12em] text-text-faint',
    list: 'm-0 grid list-none gap-0.5 p-0',
    row: [
      'grid grid-cols-[64px_10px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-sm px-2 py-2',
      '@max-[420px]:grid-cols-[64px_10px_minmax(0,1fr)]',
    ],
    time: 'text-sm leading-tight font-semibold text-text-dim tabular-nums',
    dot: 'size-2.5 rounded-full bg-[var(--sk-event,var(--sk-chart-1))]',
    text: 'grid min-w-0',
    title: 'truncate text-sm font-semibold text-text',
    meta: 'truncate text-xs text-text-faint',
    status: 'flex justify-self-end @max-[420px]:col-start-3 @max-[420px]:justify-self-start',
  },
  variants: {
    sticky: {
      // The heading pins on the agenda's own surface; rows scroll clear of it when focused.
      true: { heading: 'sticky top-0 z-[1] bg-surface', row: 'scroll-mt-9' },
      false: {},
    },
    today: { true: { heading: 'text-accent' }, false: {} },
    link: {
      true: {
        row: [
          'transition-colors duration-fast ease-sukuna motion-reduce:transition-none hover:bg-surface-2',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
        ],
      },
      false: {},
    },
  },
  defaultVariants: { sticky: true, today: false, link: false },
})

export type AgendaStyleProps = VariantProps<typeof agendaStyles>
