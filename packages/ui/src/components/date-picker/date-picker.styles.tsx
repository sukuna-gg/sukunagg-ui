import { tv, type VariantProps } from '../../utils/tv'

export const datePickerStyles = tv({
  slots: {
    root: 'grid w-full gap-1.5',
    // The field looks like Input (same variant/size map) and holds the text input + the trigger.
    field: [
      'flex w-full items-center gap-1 border text-text',
      'transition-[border-color,box-shadow] duration-fast ease-sukuna',
      'focus-within:border-accent focus-within:ring-2 focus-within:ring-focus-ring',
      'has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-45',
    ],
    input: [
      'h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-text tabular-nums tracking-[0.02em]',
      'placeholder:text-text-faint focus-visible:outline-none disabled:cursor-not-allowed',
    ],
    trigger: [
      'grid shrink-0 cursor-pointer place-items-center rounded-sm border-0 bg-transparent p-0 text-text-dim',
      'transition-colors duration-fast ease-sukuna hover:bg-surface hover:text-text data-[popup-open]:bg-surface data-[popup-open]:text-text',
      'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring',
      'disabled:cursor-not-allowed disabled:hover:bg-transparent',
    ],
    popup: 'w-auto p-3',
    footer: 'mt-2 flex items-center justify-end gap-2 border-t border-line-soft pt-2',
    error: 'm-0 text-sm font-semibold text-accent',
  },
  variants: {
    variant: {
      filled: { field: 'border-line bg-surface-2' },
      outline: { field: 'border-line bg-transparent' },
      ghost: { field: 'border-transparent bg-transparent hover:bg-surface-2' },
    },
    size: {
      sm: { field: 'h-8 rounded-sm pr-0.5 pl-3 text-sm', trigger: 'size-7' },
      md: { field: 'h-10 rounded-md pr-1 pl-3 text-md', trigger: 'size-8' },
      lg: { field: 'h-12 rounded-lg pr-1.5 pl-4 text-lg', trigger: 'size-9' },
    },
    // Declared after `variant` so the crimson border wins, like Input.
    invalid: {
      true: { field: 'border-accent' },
      false: {},
    },
  },
  defaultVariants: { variant: 'filled', size: 'md', invalid: false },
})

export type DatePickerStyleProps = VariantProps<typeof datePickerStyles>
