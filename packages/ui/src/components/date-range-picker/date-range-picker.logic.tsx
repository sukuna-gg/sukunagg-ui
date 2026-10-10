'use client'

import { Popover as Base } from '@base-ui/react/popover'
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useControllableState } from '../../hooks/use-controllable-state'
import {
  addDays,
  addMonths,
  type CalendarDate,
  type DateRange,
  daysBetween,
  endOfMonth,
  fromParts,
  startOfMonth,
  startOfWeek,
  todayLocal,
  toParts,
  toUtcDate,
} from '../../utils/date/calendar-date'
import { utcFormatter, weekStartFor } from '../../utils/date/locale'
import { Button } from '../button'
import {
  type CalendarLabels,
  type CalendarMark,
  CalendarWithInternals,
} from '../calendar/calendar.logic'
import { popoverStyles } from '../popover/popover.styles'
import { dateRangePickerStyles } from './date-range-picker.styles'

/** Built-in presets, resolved against `today`. */
export type DateRangePresetKey =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'last90'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'

/** A built-in key, or your own: a fixed range or one computed from today. */
export type DateRangePreset =
  | DateRangePresetKey
  | { label: string; range: DateRange | ((today: CalendarDate) => DateRange) }

/** Words a DateRangePicker says, for translation (English by default). Includes the Calendar's. */
export interface DateRangePickerLabels extends CalendarLabels {
  placeholder: string
  apply: string
  cancel: string
  /** Shown as pressed when the draft matches no preset. */
  custom: string
  /** Name of the presets group. */
  presetsGroup: string
  /** Summary while only the first day is picked. */
  pickEnd: string
  /** Popup name. */
  dialog: string
  days: (count: number) => string
  presets: Record<DateRangePresetKey, string>
}

const DEFAULT_LABELS: Omit<DateRangePickerLabels, keyof CalendarLabels> = {
  placeholder: 'Pick dates',
  apply: 'Apply',
  cancel: 'Cancel',
  custom: 'Custom',
  presetsGroup: 'Presets',
  pickEnd: 'Pick the last day',
  dialog: 'Choose dates',
  days: (n) => (n === 1 ? '1 day' : `${n} days`),
  presets: {
    today: 'Today',
    yesterday: 'Yesterday',
    last7: 'Last 7 days',
    last30: 'Last 30 days',
    last90: 'Last 90 days',
    thisWeek: 'This week',
    lastWeek: 'Last week',
    thisMonth: 'This month',
    lastMonth: 'Last month',
    thisYear: 'This year',
  },
}

export interface DateRangePickerOwnProps {
  /** Committed range, controlled. `null` = empty. */
  value?: DateRange | null
  /** Committed range on first render when uncontrolled. */
  defaultValue?: DateRange | null
  /** Called on Apply (or on the second click with `commit="select"`). */
  onValueChange?: (value: DateRange | null) => void
  /** First selectable day. */
  min?: CalendarDate
  /** Last selectable day (e.g. today, for history filters). */
  max?: CalendarDate
  /** Turns days off; a returned string is the reason read out. */
  isDateDisabled?: (date: CalendarDate) => string | boolean | null | undefined
  /** Dots under days (e.g. days with games). */
  marks?: (date: CalendarDate) => readonly CalendarMark[] | null | undefined
  /** Shortest range in days (inclusive). */
  minDays?: number
  /** Longest range in days (inclusive). */
  maxDays?: number
  /** One-click ranges shown beside the calendar. Default: none. */
  presets?: readonly DateRangePreset[]
  /**
   * Months shown side by side; two drop to one on screens narrower than 640px.
   * @default 2
   */
  months?: 1 | 2
  /**
   * `'apply'`: Apply and Cancel buttons, nothing changes until Apply. `'select'`: the second click
   * commits and closes.
   * @default 'apply'
   */
  commit?: 'apply' | 'select'
  /** Footer text for the draft range, e.g. "30 days · 87 games". Default: the range and its days. */
  summary?: (range: DateRange) => ReactNode
  /** Name of a hidden input with the start, `'YYYY-MM-DD'`. */
  startName?: string
  /** Name of a hidden input with the end, `'YYYY-MM-DD'`. */
  endName?: string
  /** Popup open state, controlled. */
  open?: boolean
  /**
   * Popup open on first render when uncontrolled.
   * @default false
   */
  defaultOpen?: boolean
  /** Called when the popup opens or closes. */
  onOpenChange?: (open: boolean) => void
  /**
   * Names, range format and week start.
   * @default 'en-US'
   */
  locale?: string
  /** First day of the week, 0 = Sunday. Default: from `locale`. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** Today in the viewer's zone: presets and the today ring use it. Default: the browser's date. */
  today?: CalendarDate
  /** Words, for translation. */
  labels?: Partial<DateRangePickerLabels>
  /**
   * The invalid look.
   * @default false
   */
  invalid?: boolean
  /**
   * Trigger look, the same map as Input.
   * @default 'filled'
   */
  variant?: 'filled' | 'outline' | 'ghost'
  /**
   * Trigger height: 32 / 40 / 48px.
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
}

/** Props for {@link DateRangePicker}: its options plus the native `<button>` (trigger) attributes. */
export type DateRangePickerProps = DateRangePickerOwnProps &
  Omit<ComponentPropsWithoutRef<'button'>, 'value' | 'defaultValue' | 'onChange' | 'type'>

const resolvePreset = (
  preset: DateRangePreset,
  today: CalendarDate,
  weekStart: number,
): DateRange => {
  if (typeof preset !== 'string')
    return typeof preset.range === 'function' ? preset.range(today) : preset.range
  const week = startOfWeek(today, weekStart)
  const lastMonth = addMonths(startOfMonth(today), -1)
  const ranges: Record<DateRangePresetKey, DateRange> = {
    today: { start: today, end: today },
    yesterday: { start: addDays(today, -1), end: addDays(today, -1) },
    last7: { start: addDays(today, -6), end: today },
    last30: { start: addDays(today, -29), end: today },
    last90: { start: addDays(today, -89), end: today },
    thisWeek: { start: week, end: today },
    lastWeek: { start: addDays(week, -7), end: addDays(week, -1) },
    thisMonth: { start: startOfMonth(today), end: today },
    lastMonth: { start: lastMonth, end: endOfMonth(lastMonth) },
    thisYear: { start: fromParts(toParts(today).year, 1, 1), end: today },
  }
  return ranges[preset]
}

/** A preset pulled into [min, max], or null when it can't fit at all. */
const clampRange = (range: DateRange, min?: CalendarDate, max?: CalendarDate): DateRange | null => {
  const start = min !== undefined && range.start < min ? min : range.start
  const end = max !== undefined && range.end > max ? max : range.end
  return start <= end ? { start, end } : null
}

const sameRange = (a: DateRange | null, b: DateRange | null) =>
  !!a && !!b && a.start === b.start && a.end === b.end

const CalendarGlyph = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
    <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
  </svg>
)
const ChevronGlyph = () => (
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

/** "Sep 10 – Oct 9, 2026" (one date when start = end). */
const formatRange = (range: DateRange, locale: string) => {
  const f = utcFormatter(locale, { month: 'short', day: 'numeric', year: 'numeric' })
  return range.start === range.end
    ? f.format(toUtcDate(range.start))
    : f.formatRange(toUtcDate(range.start), toUtcDate(range.end))
}

/**
 * Picks a start and end day, for filters like "games from Sep 10 to Oct 9". Presets make common
 * ranges one click; two months sit side by side for custom ones. Nothing changes until Apply, so
 * a filter never reloads halfway through a choice.
 *
 * @remarks
 * - SSR: a client component. The server renders only the trigger (its formatted range text
 *   suppresses hydration warnings, because ICU versions space `formatRange` differently).
 * - Accessibility: the trigger is a button with the range as its text (name it with `aria-label`
 *   or `Field.Label`); the popup is a named dialog with a "Presets" group of pressed-state
 *   buttons, the calendar grid and a live summary. Apply stays disabled while only the first day
 *   is picked. Escape, Cancel or an outside click drop the draft.
 * - Variants: `variant` 'filled' | 'outline' | 'ghost', `size` 'sm' | 'md' | 'lg'; `commit`
 *   'apply' (default) | 'select'.
 *
 * @example
 * ```tsx
 * import { DateRangePicker } from '@sukunagg/ui'
 *
 * <DateRangePicker
 *   aria-label="Games played between"
 *   defaultValue={{ start: from, end: to }}
 *   max={today}
 *   presets={['last7', 'last30', 'thisMonth', 'lastMonth']}
 *   onValueChange={(r) => router.push(`?from=${r?.start}&to=${r?.end}`)}
 * />
 * ```
 */
export const DateRangePicker = forwardRef<HTMLButtonElement, DateRangePickerProps>(
  function DateRangePicker(
    {
      value: valueProp,
      defaultValue,
      onValueChange,
      min,
      max,
      isDateDisabled,
      marks,
      minDays,
      maxDays,
      presets = [],
      months = 2,
      commit = 'apply',
      summary,
      startName,
      endName,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      locale = 'en-US',
      weekStartsOn,
      today: todayProp,
      labels: labelsProp,
      invalid = false,
      variant,
      size,
      className,
      disabled,
      ...buttonProps
    },
    ref,
  ) {
    const labels = {
      ...DEFAULT_LABELS,
      ...labelsProp,
      presets: { ...DEFAULT_LABELS.presets, ...labelsProp?.presets },
    }
    const weekStart = weekStartsOn ?? weekStartFor(locale)

    const [value, setValue] = useControllableState<DateRange | null>({
      value: valueProp,
      defaultValue: defaultValue ?? null,
      onChange: onValueChange,
    })
    const [open, setOpen] = useControllableState<boolean>({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    })
    const [draft, setDraft] = useState<DateRange | null>(value)
    const [pending, setPending] = useState<CalendarDate | null>(null)
    const [resetKey, setResetKey] = useState(0)
    const [wide, setWide] = useState(true)
    const popupRef = useRef<HTMLDivElement | null>(null)

    // Two months need room: below 640px wide, show one (measured on the client only).
    useEffect(() => {
      if (typeof window === 'undefined' || !window.matchMedia) return
      const query = window.matchMedia('(min-width: 640px)')
      const update = () => setWide(query.matches)
      update()
      query.addEventListener?.('change', update)
      return () => query.removeEventListener?.('change', update)
    }, [])
    const shown: 1 | 2 = months === 2 && wide ? 2 : 1

    const today = todayProp ?? todayLocal()
    const monthFor = (range: DateRange | null) => {
      const end = startOfMonth(range?.end ?? (max !== undefined && today > max ? max : today))
      return shown === 2 ? addMonths(end, -1) : end
    }
    const [calMonth, setCalMonth] = useState<CalendarDate>(() => monthFor(value))

    const changeOpen = (next: boolean) => {
      if (next) {
        // Every open starts from the committed range.
        setDraft(value)
        setPending(null)
        setCalMonth(monthFor(value))
        setResetKey((k) => k + 1)
      }
      setOpen(next)
    }

    const commitRange = (range: DateRange | null) => {
      setValue(range)
      setOpen(false)
    }

    const choosePreset = (range: DateRange) => {
      setDraft(range)
      setPending(null)
      setCalMonth(monthFor(range))
      setResetKey((k) => k + 1)
      if (commit === 'select') commitRange(range)
    }

    const resolved = presets.map((p) => {
      const range = clampRange(resolvePreset(p, today, weekStart), min, max)
      const label = typeof p === 'string' ? labels.presets[p] : p.label
      return { label, range }
    })
    const activePreset = pending ? -1 : resolved.findIndex((p) => sameRange(p.range, draft))

    const s = dateRangePickerStyles({ variant, size, invalid })
    const pop = popoverStyles()
    const draftSummary = pending ? (
      <>
        <span className={s.summaryRange()}>
          {formatRange({ start: pending, end: pending }, locale)}
        </span>
        {` · ${labels.pickEnd}`}
      </>
    ) : draft ? (
      (summary?.(draft) ?? (
        <>
          <span className={s.summaryRange()}>{formatRange(draft, locale)}</span>
          {` · ${labels.days(daysBetween(draft.start, draft.end) + 1)}`}
        </>
      ))
    ) : null

    return (
      <>
        <Base.Root open={open} onOpenChange={(next) => changeOpen(next)} modal={false}>
          <Base.Trigger
            render={
              <button
                ref={ref}
                type="button"
                disabled={disabled}
                aria-invalid={invalid || undefined}
                className={s.trigger({ className })}
                {...buttonProps}
              />
            }
          >
            <span className={s.icon()}>
              <CalendarGlyph />
            </span>
            {value ? (
              <span className={s.value()} suppressHydrationWarning>
                {formatRange(value, locale)}
              </span>
            ) : (
              <span className={s.placeholder()}>{labels.placeholder}</span>
            )}
            <span className={s.chevron()}>
              <ChevronGlyph />
            </span>
          </Base.Trigger>
          <Base.Portal>
            <Base.Positioner
              side="bottom"
              align="start"
              sideOffset={6}
              className={pop.positioner()}
            >
              <Base.Popup
                ref={popupRef}
                aria-label={labels.dialog}
                className={pop.popup({ className: s.popup() })}
                initialFocus={() =>
                  popupRef.current?.querySelector<HTMLElement>(
                    '[data-preset][aria-pressed="true"], [data-preset]:not(:disabled), [data-roving="true"]',
                  ) ?? true
                }
              >
                <div
                  className={s.layout({ className: presets.length ? undefined : 'grid-cols-1' })}
                >
                  {presets.length ? (
                    // biome-ignore lint/a11y/useSemanticElements: a labelled set of buttons, not a form fieldset
                    <div role="group" aria-label={labels.presetsGroup} className={s.presets()}>
                      {resolved.map((p, i) => (
                        <button
                          key={p.label}
                          type="button"
                          data-preset=""
                          aria-pressed={i === activePreset}
                          disabled={!p.range}
                          className={s.preset()}
                          onClick={() => p.range && choosePreset(p.range)}
                        >
                          {p.label}
                          {i === activePreset ? (
                            <span aria-hidden="true" className={s.presetDot()} />
                          ) : null}
                        </button>
                      ))}
                      <button
                        type="button"
                        aria-pressed={activePreset === -1}
                        disabled
                        className={s.preset()}
                      >
                        {labels.custom}
                        {activePreset === -1 ? (
                          <span aria-hidden="true" className={s.presetDot()} />
                        ) : null}
                      </button>
                    </div>
                  ) : null}
                  <div className={s.main()}>
                    <CalendarWithInternals
                      key={resetKey}
                      aria-label={labels.dialog}
                      mode="range"
                      months={shown}
                      month={calMonth}
                      onMonthChange={setCalMonth}
                      value={draft}
                      onValueChange={(range) => {
                        setDraft(range)
                        if (commit === 'select') commitRange(range)
                      }}
                      onPendingChange={setPending}
                      min={min}
                      max={max}
                      minDays={minDays}
                      maxDays={maxDays}
                      isDateDisabled={isDateDisabled}
                      marks={marks}
                      locale={locale}
                      weekStartsOn={weekStartsOn}
                      today={today}
                      labels={labelsProp}
                    />
                    {commit === 'apply' ? (
                      <div className={s.footer()}>
                        <span aria-live="polite" className={s.summary()}>
                          {draftSummary}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                          {labels.cancel}
                        </Button>
                        <Button
                          size="sm"
                          disabled={!draft || pending !== null}
                          onClick={() => commitRange(draft)}
                        >
                          {labels.apply}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Base.Popup>
            </Base.Positioner>
          </Base.Portal>
        </Base.Root>
        {startName ? <input type="hidden" name={startName} value={value?.start ?? ''} /> : null}
        {endName ? <input type="hidden" name={endName} value={value?.end ?? ''} /> : null}
      </>
    )
  },
)
