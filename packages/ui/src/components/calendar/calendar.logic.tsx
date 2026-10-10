'use client'

import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ForwardRefExoticComponent,
  forwardRef,
  type KeyboardEvent,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { useControllableState } from '../../hooks/use-controllable-state'
import {
  addDays,
  addMonths,
  type CalendarDate,
  clampDate,
  type DateRange,
  daysBetween,
  endOfMonth,
  fromParts,
  isWithin,
  monthMatrix,
  sameMonth,
  startOfMonth,
  startOfWeek,
  todayLocal,
  toParts,
} from '../../utils/date/calendar-date'
import {
  fullDateLabel,
  monthNames,
  monthYearLabel,
  weekdayNames,
  weekStartFor,
} from '../../utils/date/locale'
import { calendarStyles } from './calendar.styles'

export type { CalendarDate, DateRange }

/** Which grid a calendar shows: days of a month, the months of a year, or a page of years. */
export type CalendarView = 'day' | 'month' | 'year'

/** A small dot under a day number. `label` is read by screen readers and shown on hover. */
export interface CalendarMark {
  /** What the dot means, e.g. "Copa Pitaya · Valorant". */
  label: string
  /** CSS color, e.g. a game color. Default `var(--sk-text-faint)`. */
  color?: string
}

/** Every word a calendar says, for translation (English by default). */
export interface CalendarLabels {
  previousMonth: string
  nextMonth: string
  previousYear: string
  nextYear: string
  previousYears: string
  nextYears: string
  /** Appended to the caption button's name: "October 2026, Choose year". */
  chooseYear: string
  selected: string
  rangeStart: string
  rangeEnd: string
  /** Read for days outside `min`/`max`, or when `isDateDisabled` returns `true`. */
  unavailable: string
}

const DEFAULT_LABELS: CalendarLabels = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  previousYears: 'Earlier years',
  nextYears: 'Later years',
  chooseYear: 'Choose year',
  selected: 'selected',
  rangeStart: 'range start',
  rangeEnd: 'range end',
  unavailable: 'unavailable',
}

export interface CalendarOwnProps {
  /** Visible month, controlled. Any day in the month; reported back as `'YYYY-MM-01'`. */
  month?: CalendarDate
  /** Visible month on first render when uncontrolled. Default: the value's month, else `today`'s. */
  defaultMonth?: CalendarDate
  /** Called with `'YYYY-MM-01'` when the visible month changes. */
  onMonthChange?: (month: CalendarDate) => void
  /** Which grid is shown, controlled. */
  view?: CalendarView
  /**
   * Grid shown first when uncontrolled. `'year'` suits a birth date.
   * @default 'day'
   */
  defaultView?: CalendarView
  /** Called when the grid switches between days, months and years. */
  onViewChange?: (view: CalendarView) => void
  /** First selectable day. Focus never moves before it. */
  min?: CalendarDate
  /** Last selectable day. Focus never moves after it. */
  max?: CalendarDate
  /**
   * Turns days off. Return a reason (`'Full'`, `'In the past'`) to have it read out and shown on
   * hover, or `true` for the generic `labels.unavailable`. Disabled days stay focusable.
   */
  isDateDisabled?: (date: CalendarDate) => string | boolean | null | undefined
  /** Dots under a day (first three drawn); their labels join the day's accessible name. */
  marks?: (date: CalendarDate) => readonly CalendarMark[] | null | undefined
  /**
   * One month, or two side by side (two months hide outside days).
   * @default 1
   */
  months?: 1 | 2
  /**
   * Always six rows, so the height never changes between months.
   * @default true
   */
  fixedWeeks?: boolean
  /**
   * Show the faint days of the previous and next month that fill the first and last rows.
   * Ignored (off) with two months.
   * @default true
   */
  showOutsideDays?: boolean
  /** First day of the week, 0 = Sunday. Default: from `locale` (CLDR). */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /**
   * Language and region for names, label dates and the week start.
   * @default 'en-US'
   */
  locale?: string
  /**
   * Today in the viewer's zone. Pass it from the server for an exact first paint; without it the
   * today ring appears after hydration (the server and the browser may disagree on the date).
   */
  today?: CalendarDate
  /** Words, for translation. English by default. */
  labels?: Partial<CalendarLabels>
  /** Move focus to the focused day on mount (used by the date pickers' popovers). */
  autoFocus?: boolean
}

type CalendarSingleProps = {
  /**
   * Pick one day (default) or a range.
   * @default 'single'
   */
  mode?: 'single'
  /** Selected day, controlled. `null` = nothing selected. */
  value?: CalendarDate | null
  /** Selected day on first render when uncontrolled. */
  defaultValue?: CalendarDate | null
  /** Called with the picked day. */
  onValueChange?: (value: CalendarDate | null) => void
}

type CalendarRangeProps = {
  mode: 'range'
  /** Selected range, controlled. */
  value?: DateRange | null
  /** Selected range on first render when uncontrolled. */
  defaultValue?: DateRange | null
  /** Called with a complete range; the first click of a range is held inside the calendar. */
  onValueChange?: (value: DateRange | null) => void
  /** Shortest range in days (inclusive); days that would be shorter turn off while half picked. */
  minDays?: number
  /** Longest range in days (inclusive); days that would be longer turn off while half picked. */
  maxDays?: number
}

/** Props for {@link Calendar}: native `<div>` attributes plus the date, view and locale options. */
export type CalendarProps = CalendarOwnProps &
  (CalendarSingleProps | CalendarRangeProps) &
  Omit<ComponentPropsWithoutRef<'div'>, 'defaultValue' | 'onChange' | 'autoFocus'>

/**
 * Not part of the public API: lets DateRangePicker show "Pick the last day" while a range is half
 * picked.
 * @internal
 */
export interface CalendarInternalProps {
  onPendingChange?: (anchor: CalendarDate | null) => void
}

type Slide = 'none' | 'next' | 'prev' | 'zoom'

const ChevronLeft = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 6l-6 6 6 6" />
  </svg>
)
const ChevronRight = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 6l6 6-6 6" />
  </svg>
)
const ChevronDown = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
)

const yearOf = (date: CalendarDate) => toParts(date).year

/** First year of the 20-year page holding `year`: pages end on `max`'s year when there is one. */
const pageStartFor = (year: number, maxYear: number | undefined) =>
  maxYear !== undefined
    ? maxYear - 19 - 20 * Math.floor((maxYear - year) / 20)
    : year - (((year % 20) + 20) % 20)

const CalendarImpl = forwardRef<HTMLDivElement, CalendarProps & CalendarInternalProps>(
  function Calendar(props, ref) {
    const {
      mode,
      value: valueProp,
      defaultValue,
      onValueChange,
      month: monthProp,
      defaultMonth,
      onMonthChange,
      view: viewProp,
      defaultView = 'day',
      onViewChange,
      min,
      max,
      isDateDisabled,
      marks,
      months = 1,
      fixedWeeks = true,
      showOutsideDays = true,
      weekStartsOn,
      locale = 'en-US',
      today: todayProp,
      labels: labelsProp,
      autoFocus = false,
      onPendingChange,
      minDays,
      maxDays,
      className,
      ...divProps
    } = props as CalendarProps & CalendarInternalProps & { minDays?: number; maxDays?: number }
    const isRange = mode === 'range'
    const labels = { ...DEFAULT_LABELS, ...labelsProp }
    const weekStart = weekStartsOn ?? weekStartFor(locale)
    const baseId = useId()

    const [value, setValue] = useControllableState<CalendarDate | DateRange | null>({
      value: valueProp,
      defaultValue: defaultValue ?? null,
      onChange: onValueChange as ((v: CalendarDate | DateRange | null) => void) | undefined,
    })
    const first =
      (isRange ? (value as DateRange | null)?.start : (value as CalendarDate | null)) ?? undefined

    // Today: the prop, else the browser's own date after mount (never guessed on the server).
    const [clientToday, setClientToday] = useState<CalendarDate | undefined>(undefined)
    useEffect(() => {
      if (todayProp === undefined) setClientToday(todayLocal())
    }, [todayProp])
    const today = todayProp ?? clientToday

    // Visible month: controlled, else defaultMonth → value → today. With none of them the first
    // render is an empty frame and the month comes from the browser after mount.
    const anchorDate = defaultMonth ?? first ?? todayProp
    const [monthState, setMonthState] = useControllableState<CalendarDate | null>({
      value: monthProp,
      defaultValue: anchorDate ? startOfMonth(anchorDate) : null,
      onChange: (m) => {
        if (m) onMonthChange?.(startOfMonth(m))
      },
    })
    const visibleMonth = monthState
      ? startOfMonth(monthState)
      : clientToday
        ? startOfMonth(clientToday)
        : null
    const visibleMonths = visibleMonth
      ? months === 2
        ? [visibleMonth, addMonths(visibleMonth, 1)]
        : [visibleMonth]
      : []
    const lastVisible = visibleMonths[visibleMonths.length - 1]

    const [view, setView] = useControllableState<CalendarView>({
      value: viewProp,
      defaultValue: defaultView,
      onChange: onViewChange,
    })
    const minYear = min ? yearOf(min) : undefined
    const maxYear = max ? yearOf(max) : undefined
    const [yearFocus, setYearFocus] = useState<number | null>(() => {
      const from = first ?? anchorDate
      return from ? yearOf(from) : (maxYear ?? null)
    })
    const [pickYear, setPickYear] = useState<number | null>(() =>
      anchorDate ? yearOf(anchorDate) : null,
    )
    const [monthFocus, setMonthFocus] = useState<number>(() =>
      anchorDate ? toParts(anchorDate).month : 1,
    )

    const [focused, setFocused] = useState<CalendarDate | null>(() =>
      anchorDate ? clampDate(first ?? anchorDate, min, max) : null,
    )
    const [anchor, setAnchor] = useState<CalendarDate | null>(null)
    const [hover, setHover] = useState<CalendarDate | null>(null)
    const [slide, setSlide] = useState<Slide>('none')
    const [live, setLive] = useState('')

    const rootRef = useRef<HTMLDivElement | null>(null)
    const wantFocus = useRef(autoFocus)
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        rootRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      },
      [ref],
    )

    // Move focus to the roving item after keyboard moves and view switches (never on hover).
    useEffect(() => {
      if (!wantFocus.current) return
      const target = rootRef.current?.querySelector<HTMLElement>('[data-roving="true"]')
      if (target) {
        wantFocus.current = false
        target.focus({ preventScroll: true })
      }
    })

    const caption = visibleMonths.map((m) => monthYearLabel(m, locale)).join(' – ')
    const announce = (next: CalendarDate) => {
      const list = months === 2 ? [next, addMonths(next, 1)] : [next]
      setLive(list.map((m) => monthYearLabel(m, locale)).join(' – '))
    }

    const showMonth = (next: CalendarDate, direction: Slide) => {
      setMonthState(next)
      setSlide(direction)
      announce(next)
    }

    const reasonFor = (date: CalendarDate): string | null => {
      if (!isWithin(date, min, max)) return labels.unavailable
      if (isRange && anchor && (minDays !== undefined || maxDays !== undefined)) {
        const length = Math.abs(daysBetween(anchor, date)) + 1
        if (
          (minDays !== undefined && length < minDays) ||
          (maxDays !== undefined && length > maxDays)
        )
          return labels.unavailable
      }
      const r = isDateDisabled?.(date)
      if (typeof r === 'string' && r) return r
      return r === true ? labels.unavailable : null
    }

    const moveFocus = (target: CalendarDate) => {
      if (!visibleMonth || !lastVisible) return
      const date = clampDate(target, min, max)
      if (date < visibleMonth) showMonth(startOfMonth(date), 'prev')
      else if (date > endOfMonth(lastVisible))
        showMonth(addMonths(startOfMonth(date), -(months - 1)), 'next')
      setFocused(date)
      if (anchor) setHover(date)
      wantFocus.current = true
    }

    const choose = (date: CalendarDate) => {
      if (reasonFor(date)) return
      if (visibleMonth && months === 1 && !sameMonth(date, visibleMonth))
        showMonth(startOfMonth(date), date < visibleMonth ? 'prev' : 'next')
      setFocused(date)
      if (!isRange) {
        setValue(date)
        return
      }
      if (!anchor) {
        setAnchor(date)
        setHover(date)
        onPendingChange?.(date)
        return
      }
      const range = date < anchor ? { start: date, end: anchor } : { start: anchor, end: date }
      setAnchor(null)
      setHover(null)
      onPendingChange?.(null)
      setValue(range)
    }

    const goMonths = (delta: number) => {
      if (!visibleMonth) return
      showMonth(addMonths(visibleMonth, delta), delta < 0 ? 'prev' : 'next')
      setFocused((f) => clampDate(addMonths(f ?? visibleMonth, delta), min, max))
    }

    const openYears = () => {
      setYearFocus(null)
      setView('year')
      setSlide('zoom')
      wantFocus.current = true
    }

    const openDays = () => {
      setView('day')
      setSlide('zoom')
      wantFocus.current = true
    }

    const pickYearCell = (year: number) => {
      setPickYear(year)
      const selectedMonth = first && yearOf(first) === year ? toParts(first).month : undefined
      setMonthFocus(selectedMonth ?? (visibleMonth ? toParts(visibleMonth).month : 1))
      setView('month')
      setSlide('zoom')
      wantFocus.current = true
    }

    const pickMonthCell = (year: number, month: number) => {
      const target = fromParts(year, month, 1)
      setMonthState(target)
      announce(target)
      setFocused(clampDate(first && sameMonth(first, target) ? first : target, min, max))
      setView('day')
      setSlide('zoom')
      wantFocus.current = true
    }

    // ---------- keyboard ----------
    const onDayKeyDown = (event: KeyboardEvent<HTMLElement>) => {
      const date = (event.target as HTMLElement).dataset.date
      if (!date) return
      const moves: Record<string, () => CalendarDate> = {
        ArrowLeft: () => addDays(date, -1),
        ArrowRight: () => addDays(date, 1),
        ArrowUp: () => addDays(date, -7),
        ArrowDown: () => addDays(date, 7),
        Home: () => startOfWeek(date, weekStart),
        End: () => addDays(startOfWeek(date, weekStart), 6),
        PageUp: () => addMonths(date, event.shiftKey ? -12 : -1),
        PageDown: () => addMonths(date, event.shiftKey ? 12 : 1),
      }
      const move = moves[event.key]
      if (!move) return
      event.preventDefault()
      moveFocus(move())
    }

    const yearInRange = (y: number) =>
      (minYear === undefined || y >= minYear) && (maxYear === undefined || y <= maxYear)
    const clampYear = (y: number) =>
      Math.min(
        maxYear ?? Number.POSITIVE_INFINITY,
        Math.max(minYear ?? Number.NEGATIVE_INFINITY, y),
      )
    // The focused year, never outside min/max (a birth-date grid opens on pickable years).
    const fallbackYear = first ?? visibleMonth
    const focusYear =
      yearFocus !== null
        ? clampYear(yearFocus)
        : fallbackYear
          ? clampYear(yearOf(fallbackYear))
          : (maxYear ?? null)
    const yearPage = focusYear !== null ? pageStartFor(focusYear, maxYear) : null
    const shownYear = pickYear ?? (visibleMonth ? yearOf(visibleMonth) : null)

    const onPickKeyDown = (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        openDays()
        return
      }
      if (view === 'year' && focusYear !== null) {
        const steps: Record<string, number> = {
          ArrowLeft: -1,
          ArrowRight: 1,
          ArrowUp: -4,
          ArrowDown: 4,
          PageUp: -20,
          PageDown: 20,
        }
        const step = steps[event.key]
        if (step === undefined) return
        event.preventDefault()
        const next = clampYear(focusYear + step)
        if (yearPage !== null && next !== focusYear) {
          const nextPage = pageStartFor(next, maxYear)
          if (nextPage !== yearPage) setSlide(nextPage < yearPage ? 'prev' : 'next')
        }
        setYearFocus(next)
        wantFocus.current = true
        return
      }
      const steps: Record<string, number> = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -3,
        ArrowDown: 3,
      }
      const step = steps[event.key]
      if (step === undefined) return
      event.preventDefault()
      setMonthFocus((m) => Math.min(12, Math.max(1, m + step)))
      wantFocus.current = true
    }

    useEffect(() => {
      if (autoFocus) wantFocus.current = true
    }, [autoFocus])

    // ---------- render ----------
    const s = calendarStyles({ slide })
    const captionId = `${baseId}-caption`

    let band: [CalendarDate, CalendarDate, boolean] | null = null
    if (isRange) {
      if (anchor) {
        const h = hover ?? anchor
        band = h < anchor ? [h, anchor, true] : [anchor, h, true]
      } else if (value) {
        const r = value as DateRange
        band = [r.start, r.end, false]
      }
    }

    // The one day in the tab order.
    const inView = (d: CalendarDate | null | undefined): d is CalendarDate =>
      !!d && visibleMonths.some((m) => sameMonth(d, m))
    const firstEnabled = visibleMonth
      ? monthMatrix(visibleMonth, weekStart, false)
          .flat()
          .find((d) => sameMonth(d, visibleMonth) && !reasonFor(d))
      : undefined
    const roving = inView(focused)
      ? focused
      : inView(first)
        ? first
        : inView(today)
          ? today
          : (firstEnabled ?? visibleMonth)

    const renderMonth = (m: CalendarDate, index: number) => {
      const monthCaptionId = `${baseId}-m${index}`
      const outsideVisible = showOutsideDays && months === 1
      return (
        <div key={m} className={s.month()}>
          {months === 2 ? (
            <span id={monthCaptionId} className={s.monthCaption()}>
              {monthYearLabel(m, locale)}
            </span>
          ) : null}
          <table
            // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: WAI-ARIA APG date grid (a table with role=grid)
            role="grid"
            aria-labelledby={months === 2 ? monthCaptionId : captionId}
            className={s.grid()}
          >
            <thead>
              <tr>
                {weekdayNames(locale, weekStart).map((w) => (
                  <th key={w.long} scope="col" abbr={w.long} className={s.weekday()}>
                    {w.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthMatrix(m, weekStart, fixedWeeks).map((week) => (
                <tr key={week[0]}>
                  {week.map((date, col) => {
                    const inMonth = sameMonth(date, m)
                    if (!inMonth && !outsideVisible)
                      return <td key={date} role="presentation" className={s.cell()} />
                    const reason = reasonFor(date)
                    const dayMarks = marks?.(date)?.slice(0, 3) ?? []
                    let bandKind: 'none' | 'single' | 'full' | 'start' | 'end' = 'none'
                    let selected = !isRange && value === date
                    const extra: string[] = []
                    if (band && inMonth && date >= band[0] && date <= band[1]) {
                      const [a, b, pending] = band
                      bandKind =
                        a === b ? 'single' : date === a ? 'start' : date === b ? 'end' : 'full'
                      if (!pending && (date === a || date === b)) selected = true
                      if (!pending && date === a) extra.push(labels.rangeStart)
                      if (!pending && date === b) extra.push(labels.rangeEnd)
                    }
                    if (isRange && anchor === date) selected = true
                    if (selected && !isRange) extra.push(labels.selected)
                    const name = [
                      fullDateLabel(date, locale),
                      ...dayMarks.map((mk) => mk.label),
                      ...extra,
                      ...(reason ? [reason] : []),
                    ].join(', ')
                    const ariaSelected = isRange
                      ? band !== null && !band[2] && inMonth && date >= band[0] && date <= band[1]
                      : value === date
                    return (
                      // biome-ignore lint/a11y/useFocusableInteractive: APG date grid cell; its day button is the focusable item
                      <td
                        key={date}
                        // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: APG date grid cell; its day button is the focusable item
                        role="gridcell"
                        aria-selected={ariaSelected}
                        className={s.cell({
                          band: bandKind,
                          pending: band?.[2] ?? false,
                          rowStart: col === 0 || date === startOfMonth(date),
                          rowEnd: col === 6 || date === endOfMonth(date),
                        })}
                      >
                        <button
                          type="button"
                          data-date={date}
                          data-roving={date === roving && inMonth ? 'true' : undefined}
                          tabIndex={date === roving && inMonth ? 0 : -1}
                          aria-label={name}
                          aria-disabled={reason ? true : undefined}
                          aria-current={date === today ? 'date' : undefined}
                          title={reason ?? undefined}
                          className={s.day({
                            outside: !inMonth,
                            today: date === today,
                            selected,
                          })}
                          onClick={() => choose(date)}
                          onPointerEnter={anchor ? () => setHover(date) : undefined}
                        >
                          {toParts(date).day}
                          {dayMarks.length > 0 ? (
                            <span className={s.marks()}>
                              {dayMarks.map((mk, i) => (
                                <span
                                  // biome-ignore lint/suspicious/noArrayIndexKey: two marks may share a label
                                  key={`${i}-${mk.label}`}
                                  className={s.mark({ selected })}
                                  style={
                                    mk.color
                                      ? ({ '--sk-mark': mk.color } as CSSProperties)
                                      : undefined
                                  }
                                />
                              ))}
                            </span>
                          ) : null}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    // Empty frame: no date to anchor on yet (filled after mount).
    const emptyFrame = (
      <table
        // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: WAI-ARIA APG date grid (a table with role=grid)
        role="grid"
        aria-labelledby={captionId}
        className={s.grid()}
      >
        <thead>
          <tr>
            {weekdayNames(locale, weekStart).map((w) => (
              <th key={w.long} scope="col" abbr={w.long} className={s.weekday()}>
                {w.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }, (_, r) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: six fixed placeholder rows
            <tr key={r}>
              {Array.from({ length: 7 }, (_, c) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: seven fixed placeholder cells
                <td key={c} className={s.cell()}>
                  <span className="block aspect-square" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )

    let header: ReactNode
    let body: ReactNode
    let bodyKey: string
    if (view === 'year' && yearPage !== null) {
      const yearCaption = `${yearPage} – ${yearPage + 19}`
      header = (
        <>
          <button
            type="button"
            id={captionId}
            aria-expanded={true}
            className={s.caption({ interactiveCaption: true })}
            onClick={openDays}
          >
            {yearCaption}
            <span className={s.captionIcon({ expanded: true })}>
              <ChevronDown />
            </span>
          </button>
          <div className={s.nav()}>
            <button
              type="button"
              aria-label={labels.previousYears}
              className={s.navButton()}
              disabled={minYear !== undefined && yearPage <= minYear}
              onClick={() => {
                setYearFocus(clampYear((focusYear ?? yearPage) - 20))
                setSlide('prev')
              }}
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              aria-label={labels.nextYears}
              className={s.navButton()}
              disabled={maxYear !== undefined && yearPage + 19 >= maxYear}
              onClick={() => {
                setYearFocus(clampYear((focusYear ?? yearPage) + 20))
                setSlide('next')
              }}
            >
              <ChevronRight />
            </button>
          </div>
        </>
      )
      const selectedYear = first ? yearOf(first) : undefined
      const currentYear = today ? yearOf(today) : undefined
      body = (
        // biome-ignore lint/a11y/useSemanticElements: a labelled set of buttons, not a form fieldset
        <div role="group" aria-labelledby={captionId} className={s.pickGrid({ kind: 'years' })}>
          {Array.from({ length: 20 }, (_, i) => yearPage + i).map((y) => {
            const off = !yearInRange(y)
            return (
              <button
                key={y}
                type="button"
                aria-pressed={y === selectedYear}
                aria-disabled={off ? true : undefined}
                data-roving={y === focusYear ? 'true' : undefined}
                tabIndex={y === focusYear ? 0 : -1}
                className={s.pick({ selected: y === selectedYear, current: y === currentYear })}
                onClick={() => {
                  if (!off) pickYearCell(y)
                }}
              >
                {y}
              </button>
            )
          })}
        </div>
      )
      bodyKey = `y${yearPage}`
    } else if (view === 'month' && shownYear !== null) {
      const pickYear = shownYear
      header = (
        <>
          <button
            type="button"
            id={captionId}
            aria-expanded={true}
            aria-label={`${pickYear}, ${labels.chooseYear}`}
            className={s.caption({ interactiveCaption: true })}
            onClick={() => {
              setYearFocus(pickYear)
              setView('year')
              setSlide('zoom')
              wantFocus.current = true
            }}
          >
            {pickYear}
            <span className={s.captionIcon({ expanded: true })}>
              <ChevronDown />
            </span>
          </button>
          <div className={s.nav()}>
            <button
              type="button"
              aria-label={labels.previousYear}
              className={s.navButton()}
              disabled={minYear !== undefined && pickYear <= minYear}
              onClick={() => {
                setPickYear(pickYear - 1)
                setSlide('prev')
              }}
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              aria-label={labels.nextYear}
              className={s.navButton()}
              disabled={maxYear !== undefined && pickYear >= maxYear}
              onClick={() => {
                setPickYear(pickYear + 1)
                setSlide('next')
              }}
            >
              <ChevronRight />
            </button>
          </div>
        </>
      )
      const names = monthNames(locale)
      body = (
        // biome-ignore lint/a11y/useSemanticElements: a labelled set of buttons, not a form fieldset
        <div role="group" aria-labelledby={captionId} className={s.pickGrid({ kind: 'months' })}>
          {names.map((name, i) => {
            const m = i + 1
            const start = fromParts(pickYear, m, 1)
            const off =
              (min !== undefined && endOfMonth(start) < min) || (max !== undefined && start > max)
            const isSelected = !!first && sameMonth(first, start)
            return (
              <button
                key={name}
                type="button"
                aria-pressed={isSelected}
                aria-disabled={off ? true : undefined}
                aria-label={monthYearLabel(start, locale)}
                data-roving={m === monthFocus ? 'true' : undefined}
                tabIndex={m === monthFocus ? 0 : -1}
                className={s.pick({
                  selected: isSelected,
                  current: !!today && sameMonth(today, start),
                })}
                onClick={() => {
                  if (!off) pickMonthCell(pickYear, m)
                }}
              >
                {name}
              </button>
            )
          })}
        </div>
      )
      bodyKey = `m${pickYear}`
    } else {
      const prevDisabled =
        !visibleMonth || (min !== undefined && endOfMonth(addMonths(visibleMonth, -1)) < min)
      const nextDisabled = !lastVisible || (max !== undefined && addMonths(lastVisible, 1) > max)
      header = (
        <>
          {months === 1 ? (
            <button
              type="button"
              id={captionId}
              aria-expanded={false}
              aria-label={visibleMonth ? `${caption}, ${labels.chooseYear}` : labels.chooseYear}
              disabled={!visibleMonth}
              className={s.caption({ interactiveCaption: !!visibleMonth })}
              onClick={openYears}
            >
              {caption}
              <span className={s.captionIcon()}>
                <ChevronDown />
              </span>
            </button>
          ) : (
            <span id={captionId} className="sr-only">
              {caption}
            </span>
          )}
          <div className={s.nav()}>
            <button
              type="button"
              aria-label={labels.previousMonth}
              className={s.navButton()}
              disabled={prevDisabled}
              onClick={() => goMonths(-1)}
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              aria-label={labels.nextMonth}
              className={s.navButton()}
              disabled={nextDisabled}
              onClick={() => goMonths(1)}
            >
              <ChevronRight />
            </button>
          </div>
        </>
      )
      body = visibleMonth ? (
        <div className={s.months()}>{visibleMonths.map(renderMonth)}</div>
      ) : (
        emptyFrame
      )
      bodyKey = `d${visibleMonth ?? 'empty'}`
    }

    return (
      // biome-ignore lint/a11y/useSemanticElements: the calendar widget's wrapper, not a form fieldset
      <div
        ref={setRefs}
        role="group"
        aria-busy={visibleMonth ? undefined : true}
        className={s.root({ className })}
        {...divProps}
      >
        <div className={s.header()}>{header}</div>
        {/* Re-keyed on every change so the slide/zoom plays once. Keys bubble up from the buttons. */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: keyboard events delegated from the day/year/month buttons inside */}
        <div
          key={bodyKey}
          className={s.body()}
          onKeyDown={view === 'day' ? onDayKeyDown : onPickKeyDown}
        >
          {body}
        </div>
        <div aria-live="polite" className="sr-only">
          {live}
        </div>
      </div>
    )
  },
)

/**
 * A month grid to pick a day or a range with a mouse, touch or the keyboard. It is the grid inside
 * DatePicker, DateRangePicker and DateTimePicker, and works on its own inline (e.g. choosing a
 * tournament day). Dates go in and come out as `'YYYY-MM-DD'` strings, so a picked day never
 * shifts with the viewer's time zone.
 *
 * @remarks
 * - SSR: a client component (`'use client'`). The server renders the visible month from `month`,
 *   `defaultMonth`, the value or `today`; with none of them it renders an empty frame
 *   (`aria-busy`) and fills it after mount. Without `today`, the today ring appears after
 *   hydration, so server and client HTML always match.
 * - Accessibility: the WAI-ARIA date grid. One tab stop; ←/→ day, ↑/↓ week, Home/End week
 *   start/end, PageUp/PageDown month, Shift+PageUp/PageDown year, Enter/Space pick. Days read
 *   their full date, marks, state and disabled reason; today has `aria-current="date"`; a month
 *   change is announced once. Click the month name for a year grid (Escape returns).
 * - Variants: `mode` 'single' | 'range'; `months` 1 | 2. Selected days use the accent gradient.
 * - Motion: months slide, views zoom (CSS); instant under reduced motion.
 *
 * @example
 * ```tsx
 * import { Calendar } from '@sukunagg/ui'
 *
 * <Calendar
 *   aria-label="Tournament day"
 *   defaultValue="2026-10-17"
 *   min={today}
 *   today={today}
 *   marks={(d) => (tournamentDays.has(d) ? [{ label: tournamentDays.get(d), color: 'var(--sk-chart-1)' }] : null)}
 *   onValueChange={setDay}
 * />
 * ```
 */
export const Calendar = CalendarImpl as ForwardRefExoticComponent<
  CalendarProps & RefAttributes<HTMLDivElement>
>

/** Calendar with the internal props, for the date pickers. @internal */
export const CalendarWithInternals = CalendarImpl
