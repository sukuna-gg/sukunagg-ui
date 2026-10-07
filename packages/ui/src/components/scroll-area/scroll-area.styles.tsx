import { tv, type VariantProps } from '../../utils/tv'

export const scrollAreaStyles = tv({
  slots: {
    root: 'relative overflow-hidden',
    viewport: [
      'h-full w-full rounded-[inherit] overscroll-contain',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
    ],
    scrollbar: [
      'flex touch-none select-none p-0.5 bg-transparent',
      'transition-colors duration-fast ease-sukuna',
      'data-[orientation=vertical]:w-2.5',
      'data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:flex-col',
    ],
    thumb: 'flex-1 rounded-pill',
    corner: 'bg-transparent',
  },
  variants: {
    // Same names as Badge/Chip `tone`; `accent` is the Sukuna crimson. The idle accent thumb sits at
    // 80% so it still clears 3:1 on `surface` in both themes (≈3.7:1 dark, ≈3.8:1 light).
    tone: {
      neutral: { scrollbar: 'hover:bg-surface-2', thumb: 'bg-line hover:bg-text-faint' },
      accent: { scrollbar: 'hover:bg-accent/10', thumb: 'bg-accent/80 hover:bg-accent' },
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export type ScrollAreaStyleProps = VariantProps<typeof scrollAreaStyles>
