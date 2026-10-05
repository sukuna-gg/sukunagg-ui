'use client'

import { type ReactNode, useEffect, useRef } from 'react'

interface TableScrollProps {
  className: string
  /** The table's own name, reused for the scroll region. */
  label?: string
  labelledBy?: string
  children: ReactNode
}

// Visible focus ring for the region; only reachable while it overflows.
const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-sm'

/**
 * The client half of `Table scroll`: the sideways-scrolling wrapper becomes a keyboard tab stop
 * only while the table overflows, so keyboard users can scroll it (WCAG 2.1.1) without an extra
 * tab stop when it fits. Rendered by `Table` only when `scroll` is set.
 * @internal
 */
export function TableScroll({ className, label, labelledBy, children }: TableScrollProps) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current as HTMLElement
    const check = () => {
      if (el.scrollWidth > el.clientWidth + 1) el.tabIndex = 0
      else el.removeAttribute('tabindex')
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // A named <section> is a region landmark: the table's name says what scrolls.
  return (
    <section
      ref={ref}
      aria-label={label}
      aria-labelledby={labelledBy}
      className={`${className} ${focusRing}`}
    >
      {children}
    </section>
  )
}
