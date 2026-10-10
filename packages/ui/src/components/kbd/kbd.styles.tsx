import { tv, type VariantProps } from '../../utils/tv'

export const kbdStyles = tv({
  slots: {
    // The outer <kbd>: a row of key caps. not-italic undoes UA/Prose italics on <kbd>.
    root: 'inline-flex items-center gap-[3px] align-middle font-sans not-italic whitespace-nowrap',
    // One key cap: a 2px bottom border is the key's edge.
    key: [
      'inline-flex items-center justify-center border border-b-2 border-line bg-surface-2',
      'font-sans font-semibold leading-none text-text tabular-nums',
    ],
    join: 'text-text-faint',
    thenWord: 'px-0.5 font-sans text-text-faint',
  },
  variants: {
    size: {
      sm: {
        key: 'h-[18px] min-w-[18px] px-1 text-[10.5px] rounded-[calc(var(--sk-radius-sm)*0.625)]',
        join: 'text-[10px]',
        thenWord: 'text-[10px]',
      },
      md: {
        key: 'h-[22px] min-w-[22px] px-1.5 text-[11.5px] rounded-[calc(var(--sk-radius-sm)*0.75)]',
        join: 'text-xs',
        thenWord: 'text-xs',
      },
      lg: {
        key: 'h-7 min-w-7 px-2 text-[13px] rounded-sm',
        join: 'text-sm',
        thenWord: 'text-sm',
      },
    },
  },
  defaultVariants: { size: 'md' },
})

export type KbdStyleProps = VariantProps<typeof kbdStyles>
