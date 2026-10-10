import { tv, type VariantProps } from '../../utils/tv'

export const dateTimePickerStyles = tv({
  slots: {
    root: 'grid justify-items-start gap-1.5',
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
    zone: 'inline-flex items-center gap-1.5 text-sm text-text-dim [&_svg]:shrink-0 [&_svg]:text-text-faint',
    // No @container here: size containment would collapse a shrink-to-fit popup to zero width.
    popup: 'w-auto p-3.5',
    body: 'grid grid-cols-[auto_132px] items-start gap-5 max-[480px]:grid-cols-1',
    timeColumn: 'grid min-w-0 gap-2',
    timeLabel: 'text-sm font-semibold text-text',
    times: [
      'group/times relative grid h-[276px] content-start gap-0.5 overflow-y-auto rounded-sm p-0.5 [scrollbar-width:thin]',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
      'max-[480px]:h-[200px]',
    ],
    time: [
      'flex h-[34px] shrink-0 cursor-pointer items-center justify-center rounded-sm text-[13px] font-medium text-text tabular-nums',
      'hover:bg-surface-2',
      'aria-disabled:cursor-not-allowed aria-disabled:opacity-45 aria-disabled:hover:bg-transparent',
    ],
    footer: 'mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line-soft pt-3',
    footerText: 'grid min-w-0 flex-1 gap-0.5 text-sm text-text-dim',
    viewerTime: 'text-text-faint',
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
    selected: {
      true: {
        time: 'bg-gradient-accent font-bold text-on-accent hover:bg-gradient-accent hover:brightness-110',
      },
      false: {},
    },
    // The keyboard's position in the list while it has focus.
    active: {
      true: { time: 'group-focus-visible/times:shadow-[inset_0_0_0_2px_var(--sk-focus-ring)]' },
      false: {},
    },
  },
  defaultVariants: {
    variant: 'filled',
    size: 'md',
    invalid: false,
    selected: false,
    active: false,
  },
})

export type DateTimePickerStyleProps = VariantProps<typeof dateTimePickerStyles>
