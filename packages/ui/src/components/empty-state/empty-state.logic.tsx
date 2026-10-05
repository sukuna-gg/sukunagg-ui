import { type ComponentPropsWithoutRef, forwardRef, type ReactNode } from 'react'
import { emptyStateStyles } from './empty-state.styles'

/** Props for {@link EmptyState}. Extends the native `<div>` except `title`. */
export interface EmptyStateProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  /** What happened, as a short heading: "No games in Set 18 yet". */
  title: ReactNode
  /** Decorative glyph shown in a rounded square. Hidden from screen readers. */
  icon?: ReactNode
  /** Body text: the reason, then what to do. */
  children?: ReactNode
  /** Buttons or links that move the person forward. Give one whenever there is a fix. */
  actions?: ReactNode
  /**
   * Heading element used for `title`, to fit the page outline.
   * @default 'h3'
   */
  headingLevel?: 'h2' | 'h3' | 'h4'
  /**
   * `md` for a page section; `sm` inside a chart plot or a card.
   * @default 'md'
   */
  size?: 'sm' | 'md'
  /**
   * `plain` sits inside an existing card; `panel` draws its own surface and border.
   * @default 'plain'
   */
  surface?: 'plain' | 'panel'
}

/**
 * Takes the place of content that isn't there: no results, nothing yet, not found, or a service
 * that isn't answering. Say what happened, then what to do — no error codes, no blame.
 *
 * @remarks
 * - SSR/RSC: a server component (no `'use client'`).
 * - Accessibility: `title` is a real heading (`headingLevel`); the icon is `aria-hidden`.
 *   When the state appears after an action (a search, a retry), pass `role="status"` so it is
 *   announced; for a problem the person must act on, `role="alert"`.
 * - Variants: `size` 'md' (default) | 'sm' (inside charts); `surface` 'plain' (default) | 'panel'.
 * - Parts you don't pass (`icon`, `children`, `actions`) render nothing.
 *
 * @example
 * ```tsx
 * import { Button, EmptyState } from '@sukunagg/ui'
 *
 * <EmptyState
 *   title="No games in Set 18 yet"
 *   actions={<Button as="a" href="?set=17" variant="secondary">Show Set 17</Button>}
 * >
 *   kairo hasn't played this set yet. Their latest games are from Set 17.
 * </EmptyState>
 * ```
 */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  {
    title,
    icon,
    children,
    actions,
    headingLevel: Heading = 'h3',
    size,
    surface,
    className,
    ...rest
  },
  ref,
) {
  const s = emptyStateStyles({ size, surface })
  return (
    <div ref={ref} className={s.root({ className })} {...rest}>
      {icon ? (
        <div aria-hidden="true" className={s.icon()}>
          {icon}
        </div>
      ) : null}
      <Heading className={s.title()}>{title}</Heading>
      {children ? <div className={s.description()}>{children}</div> : null}
      {actions ? <div className={s.actions()}>{actions}</div> : null}
    </div>
  )
})
