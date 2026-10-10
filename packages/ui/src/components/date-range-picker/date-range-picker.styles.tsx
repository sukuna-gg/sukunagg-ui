import { tv, type VariantProps } from '../../utils/tv'

export const dateRangePickerStyles = tv({
  slots: {
    // The trigger looks like a form field (the Input variant/size map) but is a button.
    trigger: [
      'group/trigger inline-flex max-w-full cursor-pointer items-center gap-2.5 border text-left font-semibold text-text tabular-nums',
      'transition-[border-color,box-shadow] duration-fast ease-sukuna hover:border-text-faint',
      'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
      'data-[popup-open]:border-accent',
      'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-line',
    ],
    icon: 'shrink-0 text-text-faint',
    value: 'min-w-0 flex-1 truncate',
    placeholder: 'min-w-0 flex-1 truncate font-normal text-text-faint',
    chevron:
      'shrink-0 text-text-faint transition-transform duration-fast ease-sukuna group-data-[popup-open]/trigger:rotate-180',
    // No @container here: size containment would collapse a shrink-to-fit popup to zero width.
    popup: 'w-auto overflow-hidden p-0',
    layout: 'grid grid-cols-[172px_minmax(0,1fr)] max-sm:grid-cols-1',
    presets: [
      'grid content-start gap-0.5 border-r border-line-soft bg-[color-mix(in_oklab,var(--sk-surface-2)_45%,var(--sk-surface))] p-2.5',
      'max-sm:flex max-sm:overflow-x-auto max-sm:border-r-0 max-sm:border-b',
    ],
    preset: [
      'flex cursor-pointer items-center justify-between gap-2 rounded-sm border-0 bg-transparent px-2.5 py-1.5 text-left text-sm font-medium whitespace-nowrap text-text-dim',
      'transition-colors duration-fast ease-sukuna hover:bg-surface-2 hover:text-text',
      'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring',
      'aria-pressed:bg-surface-2 aria-pressed:font-semibold aria-pressed:text-text',
      'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
    ],
    presetDot: 'size-1.5 shrink-0 rounded-full bg-accent max-sm:hidden',
    main: 'grid min-w-0 gap-3 p-3.5',
    footer: 'flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line-soft pt-3',
    summary: 'min-w-0 flex-1 text-sm text-text-dim tabular-nums',
    summaryRange: 'font-semibold text-text',
  },
  variants: {
    variant: {
      filled: { trigger: 'border-line bg-surface-2' },
      outline: { trigger: 'border-line bg-transparent' },
      ghost: { trigger: 'border-transparent bg-transparent hover:bg-surface-2' },
    },
    size: {
      sm: { trigger: 'h-8 rounded-sm px-2.5 text-sm' },
      md: { trigger: 'h-10 rounded-md px-3 text-md' },
      lg: { trigger: 'h-12 rounded-lg px-4 text-lg' },
    },
    invalid: {
      true: { trigger: 'border-accent' },
      false: {},
    },
  },
  defaultVariants: { variant: 'filled', size: 'md', invalid: false },
})

export type DateRangePickerStyleProps = VariantProps<typeof dateRangePickerStyles>
