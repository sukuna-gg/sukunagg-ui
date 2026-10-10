import { tv, type VariantProps } from '../../utils/tv'

/*
 * One row per item: time | rail (dot + line down to the next dot) | body. The line is the rail's
 * ::after, from under the dot to just above the next item's dot (the item's bottom padding is
 * the gap, so the line reaches 2px short of it). Dot colors come in through `--sk-timeline-dot`.
 */
export const timelineStyles = tv({
  slots: {
    root: 'm-0 grid list-none p-0',
    item: 'group/item grid gap-x-3 last:pb-0',
    time: 'pt-0.5 text-right text-xs leading-[1.35] font-semibold text-text-faint tabular-nums',
    rail: [
      'relative flex justify-center',
      'after:absolute after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:rounded-full after:bg-line',
      'group-last/item:after:hidden',
    ],
    // The pulsing halo behind the current dot.
    halo: 'pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full bg-accent/20 motion-safe:animate-pulse',
    dot: 'relative z-[1] grid shrink-0 place-items-center rounded-full [&_svg]:size-3',
    body: 'grid min-w-0 content-start gap-0.5 pt-px',
    title: 'flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-text',
    description: 'text-sm text-text-dim',
    extra: 'mt-1 text-sm text-text-dim',
  },
  variants: {
    density: {
      default: { item: 'pb-4.5', rail: 'after:-bottom-4' },
      compact: { item: 'pb-2.5', rail: 'after:-bottom-2' },
    },
    timeWidth: {
      sm: { item: 'grid-cols-[52px_22px_minmax(0,1fr)]' },
      md: { item: 'grid-cols-[64px_22px_minmax(0,1fr)]' },
      lg: { item: 'grid-cols-[84px_22px_minmax(0,1fr)]' },
    },
    withIcon: {
      true: {
        rail: 'after:top-6',
        halo: '-top-1 size-[30px]',
        dot: 'size-[22px] border border-line bg-surface-2 text-[color:var(--sk-timeline-dot,var(--color-text-dim))]',
      },
      false: {
        rail: 'after:top-5',
        halo: 'top-0 size-5',
        dot: 'mt-1 size-3 bg-[var(--sk-timeline-dot,var(--color-text-faint))] shadow-[0_0_0_3px_var(--color-surface)]',
      },
    },
    status: {
      done: {},
      current: {
        // From here on the line is dashed: what follows hasn't happened yet.
        rail: 'after:bg-transparent after:bg-[image:repeating-linear-gradient(to_bottom,var(--color-line)_0_4px,transparent_4px_8px)]',
        dot: 'border-transparent bg-gradient-accent text-on-accent',
      },
      upcoming: {
        rail: 'after:bg-transparent after:bg-[image:repeating-linear-gradient(to_bottom,var(--color-line)_0_4px,transparent_4px_8px)]',
        dot: 'border-[1.5px] border-dashed border-text-faint bg-surface text-text-faint shadow-none',
        title: 'text-text-dim',
      },
    },
  },
  defaultVariants: { density: 'default', timeWidth: 'sm', withIcon: false, status: 'done' },
})

export type TimelineStyleProps = VariantProps<typeof timelineStyles>
