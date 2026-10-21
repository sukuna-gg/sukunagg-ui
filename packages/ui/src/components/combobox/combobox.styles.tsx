import { tv, type VariantProps } from '../../utils/tv'

export const comboboxStyles = tv({
  slots: {
    input: [
      'w-full text-text border placeholder:text-text-faint',
      'transition-[border-color,box-shadow] duration-fast ease-sukuna',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:border-accent',
      'disabled:opacity-45 disabled:cursor-not-allowed',
    ],
    // z-index on the Positioner (body-level portalled element), above the dialog layer — see Select.
    positioner: 'z-[var(--sk-z-popover)]',
    popup: [
      // At least as wide as the input it hangs from (Base UI's --anchor-width), like Select (Q44).
      'max-h-72 min-w-[var(--anchor-width,12rem)] overflow-y-auto rounded-md border border-line bg-surface p-1 shadow-card outline-none',
      'origin-[var(--transform-origin)]',
      // Directional entrance (docs/motion.md): slide 4px in from the trigger's side. Tailwind v4
      // scale-*/translate-* compile to the `scale`/`translate` properties, so list those.
      'transition-[opacity,scale,translate] motion-reduce:transition-none duration-fast ease-sukuna',
      'data-[side=bottom]:data-[starting-style]:-translate-y-1 data-[side=top]:data-[starting-style]:translate-y-1',
      'data-[side=left]:data-[starting-style]:translate-x-1 data-[side=right]:data-[starting-style]:-translate-x-1',
      'data-[starting-style]:opacity-0 data-[starting-style]:scale-95',
      'data-[ending-style]:opacity-0 data-[ending-style]:scale-95',
    ],
    item: [
      'flex h-9 items-center gap-2 px-2.5 rounded-sm text-sm text-text cursor-pointer select-none outline-none',
      // Skip layout/paint of off-screen suggestions in long lists.
      '[content-visibility:auto] [contain-intrinsic-size:auto_36px]',
      // Keyboard highlight at ≥3:1 (WCAG 1.4.11) via a crimson inset ring — see Menu.
      'data-[highlighted]:bg-surface-2 data-[highlighted]:ring-1 data-[highlighted]:ring-inset data-[highlighted]:ring-focus-ring data-[selected]:text-accent',
    ],
    // The optional leading visual (itemIcon): kept at its own size, never squeezed by the text.
    itemIcon: 'inline-flex shrink-0 items-center',
    empty: 'px-2.5 py-2 text-sm text-text-dim',
  },
  variants: {
    // Shared form-control surface map (see Input). `filled` + `md` reproduce the original input.
    variant: {
      filled: { input: 'bg-surface-2 border-line' },
      outline: { input: 'bg-transparent border-line' },
      ghost: { input: 'bg-transparent border-transparent hover:bg-surface-2' },
    },
    size: {
      sm: { input: 'h-8 px-3 text-sm rounded-sm' },
      md: { input: 'h-10 px-3 text-md rounded-md' },
      lg: { input: 'h-12 px-4 text-lg rounded-lg' },
    },
  },
  defaultVariants: { variant: 'filled', size: 'md' },
})

export type ComboboxStyleProps = VariantProps<typeof comboboxStyles>
