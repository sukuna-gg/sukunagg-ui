import { tv } from '../../utils/tv'

/*
 * One dialog, top-anchored at 12vh so the list grows downward without moving the input. The
 * highlighted row is Base UI's `data-highlighted`; `group` on the item lets the icon tile, the
 * matched letters and the ↵ react to it.
 */
export const commandPaletteStyles = tv({
  slots: {
    // A button that looks like a search field.
    trigger: [
      'inline-flex h-10 w-full max-w-[340px] min-w-0 items-center gap-2.5 pl-3 pr-2 cursor-pointer',
      'rounded-md border border-line bg-surface-2 text-md text-text-faint',
      'transition-colors duration-fast ease-sukuna hover:border-text-faint',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
    ],
    triggerIcon: 'shrink-0',
    triggerLabel: 'min-w-0 flex-1 truncate text-left',
    backdrop: [
      'fixed inset-0 z-[var(--sk-z-dialog)] bg-black/60 backdrop-blur-sm',
      'transition-opacity motion-reduce:transition-none duration-base ease-sukuna',
      'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
    ],
    popup: [
      'fixed left-1/2 top-[12vh] z-[var(--sk-z-dialog)] -translate-x-1/2',
      'flex w-[min(580px,calc(100vw-2rem))] max-h-[calc(88vh-1rem)] flex-col overflow-hidden',
      'rounded-lg border border-line bg-surface text-text shadow-card outline-none',
      // `scale` (not `transform`): Tailwind v4 scale-* compiles to the standalone property.
      'transition-[opacity,scale] motion-reduce:transition-none duration-base ease-sukuna',
      'data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.98]',
      'data-[ending-style]:opacity-0 data-[ending-style]:scale-[0.98]',
    ],
    inputRow:
      'flex h-[54px] shrink-0 items-center gap-2.5 border-b border-line-soft pl-4 pr-3 text-text-faint',
    inputIcon: 'shrink-0',
    input: [
      'h-full min-w-0 flex-1 bg-transparent text-[15.5px] text-text outline-none',
      'placeholder:text-text-faint',
    ],
    // The hint, status and empty slots style the *content* of always-mounted live regions, so an
    // empty region takes no room and is never display:none (which would stop announcements).
    hint: [
      'mx-2.5 mt-1.5 flex items-start gap-2 rounded-sm px-2.5 py-2',
      'bg-[color-mix(in_oklab,var(--sk-accent)_9%,transparent)] text-[12.5px] text-text',
    ],
    hintIcon: 'mt-px shrink-0 text-accent',
    scroller:
      'max-h-[324px] min-h-0 overflow-y-auto overscroll-contain p-1.5 [scrollbar-width:thin]',
    list: 'grid gap-px',
    group: 'grid gap-px',
    groupHeading: 'px-2.5 pb-1 pt-2.5 text-xs font-bold uppercase tracking-[.1em] text-text-faint',
    item: [
      'group flex items-center gap-2.5 rounded-sm px-2.5 py-1.5',
      'cursor-pointer select-none text-text no-underline outline-none',
      'data-[highlighted]:bg-surface-2',
      'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45',
    ],
    itemIcon: [
      'grid size-[30px] shrink-0 place-items-center rounded-sm bg-surface-2 text-text-dim [&_svg]:size-[15px]',
      'group-data-[highlighted]:bg-surface group-data-[highlighted]:text-accent',
    ],
    itemText: 'grid min-w-0 flex-1',
    itemLabel: 'truncate text-md font-semibold',
    itemDescription: 'truncate text-sm text-text-faint',
    // Matched letters. On the highlighted row (surface-2) plain accent is 4.30:1 in light, so it is
    // mixed a fifth of the way toward the text color there (≥ 5.5:1 in both themes).
    match: [
      'font-extrabold text-accent',
      'group-data-[highlighted]:text-[color:color-mix(in_oklab,var(--sk-accent)_80%,var(--sk-text))]',
    ],
    itemEnd: 'inline-flex shrink-0 items-center gap-1.5 text-sm text-text-faint',
    enter: 'text-md leading-none opacity-0 group-data-[highlighted]:opacity-100',
    statusRow: 'flex h-10 items-center px-2.5 text-md text-text-dim',
    emptyMessage:
      'grid justify-items-center gap-1.5 px-4 py-9 text-center text-md font-semibold text-text',
    footer: [
      'flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line-soft px-3.5 py-[9px]',
      'bg-[color-mix(in_oklab,var(--sk-surface-2)_40%,var(--sk-surface))] text-sm text-text-faint',
    ],
    footerHint: 'inline-flex items-center gap-1.5',
  },
})
