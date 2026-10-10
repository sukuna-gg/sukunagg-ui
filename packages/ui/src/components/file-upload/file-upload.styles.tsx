import { tv, type VariantProps } from '../../utils/tv'

/*
 * The zone is a <label> around the visually hidden <input type="file">, so the whole zone opens
 * the picker and keyboard focus on the input shows as an outline around the zone. `zone` layout:
 * a tall zone that gives way to a one-file preview card; `compact`: a short zone over a list.
 */
export const fileUploadStyles = tv({
  slots: {
    root: 'grid min-w-0 gap-2',
    zone: [
      'relative grid cursor-pointer content-center items-center justify-items-center',
      'rounded-md p-4.5',
      'border-[1.5px] border-dashed border-line hover:border-text-faint',
      'bg-[color-mix(in_oklab,var(--sk-surface-2)_45%,var(--sk-surface))]',
      'transition-[border-color,background-color] duration-fast ease-sukuna',
      'motion-reduce:transition-none',
      'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring',
    ],
    icon: [
      'grid size-11 shrink-0 place-items-center rounded-md border border-line-soft bg-surface',
      'text-text-dim transition-colors duration-fast ease-sukuna motion-reduce:transition-none',
    ],
    title: 'font-semibold text-text',
    hint: 'text-sm text-text-faint',
    // Coarse pointers only: the link to a second input without `capture` (the photo library).
    gallery: [
      'hidden cursor-pointer justify-self-start py-1 text-sm font-semibold text-accent underline',
      'underline-offset-4 pointer-coarse:inline-flex',
      'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring',
      'has-disabled:cursor-not-allowed has-disabled:opacity-45',
    ],
    // `zone` layout with a file: replaces the zone at the same height.
    preview: [
      'grid min-h-[172px] grid-cols-[112px_minmax(0,1fr)] content-center items-center gap-3',
      'rounded-md border border-line bg-surface-2 p-2.5 outline-none',
      'focus-visible:ring-2 focus-visible:ring-focus-ring',
    ],
    thumb: [
      'grid shrink-0 place-items-center overflow-hidden rounded-sm bg-surface text-text-faint',
      'font-display text-xs font-bold [&>img]:size-full [&>img]:object-cover',
    ],
    info: 'grid min-w-0 gap-1',
    status: 'inline-flex items-center gap-1.5 text-sm font-semibold',
    meta: 'text-xs text-text-faint tabular-nums [overflow-wrap:anywhere]',
    progress: 'block h-1 overflow-hidden rounded-pill bg-surface',
    bar: [
      'block h-full rounded-pill bg-gradient-accent',
      'transition-[width] duration-base ease-sukuna motion-reduce:transition-none',
    ],
    error: 'm-0 text-sm font-semibold text-accent',
    actions: 'flex flex-wrap items-center gap-1.5',
    list: 'm-0 grid list-none gap-1.5 p-0',
    row: [
      'grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-sm border',
      'border-line-soft bg-surface-2 py-2 pr-2 pl-2.5',
    ],
    body: 'grid min-w-0 gap-1',
    name: 'truncate text-sm font-semibold text-text',
  },
  variants: {
    layout: {
      zone: {
        zone: 'min-h-[172px] gap-1.5 text-center',
        icon: 'mb-1',
        thumb: 'h-[76px] w-[112px]',
      },
      compact: {
        zone: [
          'min-h-[92px] grid-cols-[auto_auto] justify-center justify-items-start gap-x-3.5 gap-y-1',
          'text-left',
        ],
        icon: 'row-span-2',
        title: 'self-end',
        hint: 'self-start',
        thumb: 'size-10',
      },
    },
    dragging: {
      true: {
        zone: 'border-solid border-accent bg-accent/9 hover:border-accent',
        icon: 'text-accent',
      },
    },
    // Declared after `dragging` so an error keeps the crimson border.
    invalid: {
      true: { zone: 'border-accent hover:border-accent' },
    },
    disabled: {
      true: { zone: 'cursor-not-allowed opacity-45 hover:border-line' },
    },
    status: {
      preparing: { status: 'text-text-dim' },
      ready: { status: 'text-success' },
      uploading: { status: 'text-text-dim' },
      uploaded: { status: 'text-success' },
      error: {
        status: 'text-accent',
        meta: 'font-semibold text-accent',
        row: 'border-accent/45',
        preview: 'border-accent/45',
      },
    },
  },
  defaultVariants: { layout: 'zone' },
})

export type FileUploadStyleProps = VariantProps<typeof fileUploadStyles>
