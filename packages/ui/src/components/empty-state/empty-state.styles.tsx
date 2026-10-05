import { tv, type VariantProps } from '../../utils/tv'

export const emptyStateStyles = tv({
  slots: {
    root: 'flex flex-col items-center text-center',
    icon: 'grid shrink-0 place-items-center bg-surface-2 text-text-dim',
    title: 'm-0 text-balance text-text',
    description: 'm-0 text-text-dim',
    actions: 'flex flex-wrap justify-center gap-2',
  },
  variants: {
    size: {
      md: {
        root: 'gap-3 px-6 py-10',
        icon: 'size-12 rounded-lg [&_svg]:size-[22px]',
        title: 'font-display text-lg font-extrabold font-stretch-[112%]',
        description: 'max-w-[46ch] text-sm',
      },
      sm: {
        root: 'gap-1.5 px-4 py-3',
        icon: 'size-9 rounded-md [&_svg]:size-[18px]',
        title: 'font-sans text-md font-semibold',
        description: 'max-w-[34ch] text-xs',
      },
    },
    surface: {
      plain: {},
      panel: { root: 'rounded-lg border border-line bg-surface' },
    },
  },
  defaultVariants: { size: 'md', surface: 'plain' },
})

export type EmptyStateStyleProps = VariantProps<typeof emptyStateStyles>
