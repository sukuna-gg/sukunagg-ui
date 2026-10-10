import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  forwardRef,
  type ReactNode,
} from 'react'
import { timelineStyles } from './timeline.styles'

/** One entry on a {@link Timeline}. */
export interface TimelineItem {
  /** Stable key for the entry. */
  id: string
  /** Left column: a clock time ('20:31'), a date, a version badge… */
  time?: ReactNode
  /** Machine-readable value for `<time dateTime>` when `time` is a date or a clock time. */
  dateTime?: string
  /** What happened: "Baron Nashor", "Semifinal". */
  title: ReactNode
  /** One line of detail under the title. */
  description?: ReactNode
  /** A small icon inside the dot. Without it the dot is a plain 12px circle. */
  icon?: ReactNode
  /**
   * Dot color as a CSS color, e.g. a side or game color (`'var(--l-blue)'`). Never the only
   * signal: say the side or result in `title` / `description` too.
   */
  color?: string
  /**
   * `done` is solid, `current` pulses, `upcoming` is dashed.
   * @default 'done'
   */
  status?: 'done' | 'current' | 'upcoming'
  /** Shown at the end of the title line, e.g. `<Badge>Victoria</Badge>`. */
  badge?: ReactNode
  /** Anything else under the description: a list of changes, a link. */
  children?: ReactNode
}

/** Props for {@link Timeline}: the native `<ol>` attributes plus the items and layout. */
export interface TimelineProps extends Omit<ComponentPropsWithoutRef<'ol'>, 'children'> {
  /** The entries, in order. */
  items: readonly TimelineItem[]
  /**
   * Space between entries: 18px, or 10px for long lists such as match events.
   * @default 'default'
   */
  density?: 'default' | 'compact'
  /**
   * Width of the time column: 52, 64 or 84px (`lg` fits a version badge).
   * @default 'sm'
   */
  timeWidth?: 'sm' | 'md' | 'lg'
  /**
   * Screen-reader words after the current entry's title, for translation.
   * @default 'current step'
   */
  currentLabel?: string
  /**
   * Screen-reader word after each upcoming entry's title, for translation.
   * @default 'upcoming'
   */
  upcomingLabel?: string
}

/**
 * Things in order along a rail, with a time or label on the left: a match's objectives, a team's
 * night at a tournament, an audit log, a changelog. Done entries are solid, the current one
 * pulses, and upcoming ones are dashed.
 *
 * @remarks
 * - SSR/RSC: a server component (no `'use client'`); the pulse is CSS.
 * - Accessibility: an ordered list. The current entry has `aria-current="step"` and both current
 *   and upcoming entries carry a spoken state (`currentLabel`, `upcomingLabel`). Icons and dots
 *   are hidden from screen readers, so color must never be the only signal.
 * - Motion: only the current dot's halo pulses; it stays still under `prefers-reduced-motion`.
 * - Variants: `density` 'default' | 'compact'; `timeWidth` 'sm' | 'md' | 'lg'.
 *
 * @example
 * ```tsx
 * import { CheckIcon, Timeline } from '@sukunagg/ui'
 *
 * <Timeline
 *   aria-label="Tu noche en Copa Otoño"
 *   items={[
 *     { id: 'ci', time: '17:30', title: 'Check-in', description: '5 de 5 jugadores', icon: <CheckIcon /> },
 *     { id: 'sf', time: '20:30', title: 'Semifinal', status: 'current' },
 *     { id: 'f', time: '~21:45', title: 'Final', status: 'upcoming' },
 *   ]}
 * />
 * ```
 */
export const Timeline = forwardRef<HTMLOListElement, TimelineProps>(function Timeline(
  {
    items,
    density,
    timeWidth,
    currentLabel = 'current step',
    upcomingLabel = 'upcoming',
    className,
    ...rest
  },
  ref,
) {
  const s = timelineStyles({ density, timeWidth })
  return (
    <ol ref={ref} className={s.root({ className })} {...rest}>
      {items.map((item) => {
        const status = item.status ?? 'done'
        const withIcon = item.icon !== undefined && item.icon !== null
        const dotStyle = item.color
          ? ({ '--sk-timeline-dot': item.color } as CSSProperties)
          : undefined
        return (
          <li
            key={item.id}
            className={s.item()}
            aria-current={status === 'current' ? 'step' : undefined}
          >
            <span className={s.time()}>
              {item.dateTime ? <time dateTime={item.dateTime}>{item.time}</time> : item.time}
            </span>
            <span aria-hidden="true" className={s.rail({ withIcon, status })}>
              {status === 'current' ? <span className={s.halo({ withIcon })} /> : null}
              <span className={s.dot({ withIcon, status })} style={dotStyle}>
                {item.icon}
              </span>
            </span>
            <div className={s.body()}>
              <span className={s.title({ status })}>
                <span>
                  {item.title}
                  {status === 'done' ? null : (
                    <span className="sr-only">
                      , {status === 'current' ? currentLabel : upcomingLabel}
                    </span>
                  )}
                </span>
                {item.badge}
              </span>
              {item.description ? (
                <span className={s.description()}>{item.description}</span>
              ) : null}
              {item.children ? <div className={s.extra()}>{item.children}</div> : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
})
