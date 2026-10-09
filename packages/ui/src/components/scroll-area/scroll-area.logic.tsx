'use client'

import { ScrollArea as Base } from '@base-ui/react/scroll-area'
import { type ComponentPropsWithoutRef, forwardRef, type ReactNode } from 'react'
import { scrollAreaStyles } from './scroll-area.styles'

/**
 * Props for {@link ScrollArea}: the own props below plus native `<div>` attributes. Size the region
 * (height / max-height / width) with `className` on the root.
 */
export interface ScrollAreaProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * Which scrollbars to render.
   * @default 'vertical'
   */
  orientation?: 'vertical' | 'horizontal' | 'both'
  /**
   * Scrollbar color. `neutral` is a dim line-colored thumb that brightens on hover; `accent` is the
   * Sukuna crimson (same palette name as Badge/Chip `tone`).
   * @default 'neutral'
   */
  tone?: 'neutral' | 'accent'
  /** The scrollable content. */
  children: ReactNode
}

/**
 * A scrollable region with consistent, themed scrollbars across browsers and OSes. The content is
 * real, server-rendered DOM inside a native-scrolling viewport — only the visible scrollbar is
 * custom — so wheel, keyboard scrolling, text selection and find-in-page all behave natively.
 *
 * @remarks
 * - SSR/RSC: a client component (`'use client'`) because Base UI measures the content to size and
 *   position the thumb. The children still render on the server inside the viewport.
 * - Accessibility: scrolling works with wheel, arrow keys, `PageUp`/`PageDown`, `Home`/`End`; the
 *   custom scrollbar is decorative and never the only way to reach content. A focusable viewport
 *   shows a visible ring. The thumb clears 3:1 against its track.
 * - Sizing: the component does not guess a size — give the root a height/`max-h`/width via
 *   `className` (e.g. `className="h-64"`), otherwise there is nothing to scroll.
 * - Variants:
 *   - `orientation`: 'vertical' (default) | 'horizontal' | 'both' (adds a corner).
 *   - `tone`: 'neutral' (default) | 'accent' — the crimson thumb sits at 80% and goes solid on
 *     hover, clearing 3:1 on `surface` in both themes.
 * - The ref points at the root element.
 *
 * @example
 * ```tsx
 * import { ScrollArea } from '@sukunagg/ui'
 *
 * <ScrollArea className="h-64 w-full rounded-md border border-line">
 *   <div className="p-4">…long content…</div>
 * </ScrollArea>
 * ```
 *
 * @example
 * ```tsx
 * import { ScrollArea } from '@sukunagg/ui'
 *
 * <ScrollArea orientation="both" className="h-72 w-96">
 *   <div className="w-[1200px] p-4">…wide content…</div>
 * </ScrollArea>
 * ```
 *
 * @example
 * ```tsx
 * import { ScrollArea } from '@sukunagg/ui'
 *
 * <ScrollArea tone="accent" className="h-64">
 *   <div className="p-4">…long content…</div>
 * </ScrollArea>
 * ```
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  { orientation = 'vertical', tone, className, children, ...rest },
  ref,
) {
  const styles = scrollAreaStyles({ tone })
  const showVertical = orientation !== 'horizontal'
  const showHorizontal = orientation !== 'vertical'
  return (
    <Base.Root ref={ref} className={styles.root({ className })} {...rest}>
      <Base.Viewport className={styles.viewport()}>
        <Base.Content>{children}</Base.Content>
      </Base.Viewport>
      {/* keepMounted: Base UI ≥1.0 unmounts a scrollbar while the viewport can't scroll; we keep
          the rc.0 behavior (always mounted, hidden by the thumb size) so layout never shifts. */}
      {showVertical && (
        <Base.Scrollbar orientation="vertical" keepMounted className={styles.scrollbar()}>
          <Base.Thumb className={styles.thumb()} />
        </Base.Scrollbar>
      )}
      {showHorizontal && (
        <Base.Scrollbar orientation="horizontal" keepMounted className={styles.scrollbar()}>
          <Base.Thumb className={styles.thumb()} />
        </Base.Scrollbar>
      )}
      {orientation === 'both' && <Base.Corner className={styles.corner()} />}
    </Base.Root>
  )
})
