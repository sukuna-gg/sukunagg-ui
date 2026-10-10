'use client'

import { Popover as Base } from '@base-ui/react/popover'
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { useControllableState } from '../../hooks/use-controllable-state'
import { type CalendarDate, clampDate } from '../../utils/date/calendar-date'
import { formatDate, utcFormatter } from '../../utils/date/locale'
import {
  zoneLabel as describeZone,
  instantToWall,
  minutesToTime,
  timeToMinutes,
  todayIn,
  wallToInstant,
} from '../../utils/date/zone'
import { Button } from '../button'
import {
  type CalendarLabels,
  type CalendarMark,
  CalendarWithInternals,
} from '../calendar/calendar.logic'
import { popoverStyles } from '../popover/popover.styles'
import { dateTimePickerStyles } from './date-time-picker.styles'

/** Words a DateTimePicker says, for translation (English by default). Includes the Calendar's. */
export interface DateTimePickerLabels extends CalendarLabels {
  placeholder: string
  /** Name of the time list. */
  time: string
  done: string
  /** Popup name. */
  dialog: string
  /** The footer line with the same moment in the browser's zone. */
  yourTime: (zone: string) => string
  /** Reason on wall times a daylight-saving jump skips. */
  skipped: string
}

const DEFAULT_LABELS: Omit<DateTimePickerLabels, keyof CalendarLabels> = {
  placeholder: 'Pick a date and time',
  time: 'Start time',
  done: 'Done',
  dialog: 'Choose date and time',
  yourTime: (zone) => `Your time (${zone})`,
  skipped: 'Skipped by daylight saving',
}

/** The wall date and time a value was picked as, in `timeZone`. */
export interface DateTimeWall {
  date: CalendarDate
  /** 24-hour `'HH:mm'`. */
  time: string
}

export interface DateTimePickerOwnProps {
  /** IANA zone the wall time is in, e.g. `'America/Hermosillo'`. Required: no silent default. */
  timeZone: string
  /** The moment, controlled: an ISO instant such as `'2026-11-15T01:00:00.000Z'`. */
  value?: string | null
  /** The moment on first render when uncontrolled. */
  defaultValue?: string | null
  /** Called with the instant and the wall date/time it was picked as. */
  onValueChange?: (value: string | null, wall: DateTimeWall | null) => void
  /** Name of a hidden input carrying the ISO instant. */
  name?: string
  /** First selectable wall date in `timeZone`. */
  min?: CalendarDate
  /** Last selectable wall date in `timeZone`. */
  max?: CalendarDate
  /** Turns days off; a returned string is the reason read out. */
  isDateDisabled?: (date: CalendarDate) => string | boolean | null | undefined
  /** Dots under days (e.g. days that already have an event). */
  marks?: (date: CalendarDate) => readonly CalendarMark[] | null | undefined
  /**
   * Minutes between time options.
   * @default 30
   */
  step?: 5 | 10 | 15 | 20 | 30 | 60
  /**
   * Earliest wall time offered, `'HH:mm'`.
   * @default '00:00'
   */
  minTime?: string
  /**
   * Latest wall time offered, `'HH:mm'`.
   * @default '23:59'
   */
  maxTime?: string
  /** Turns times off on a given day; a returned string is the reason read out. */
  isTimeDisabled?: (date: CalendarDate, time: string) => string | boolean | null | undefined
  /** Zone line text. Default: the city and its offset, e.g. "Hermosillo · GMT-7". */
  zoneLabel?: string
  /**
   * Show the zone under the trigger and in the popup.
   * @default true
   */
  showZone?: boolean
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
   * Names, 12/24-hour clock, week start.
   * @default 'en-US'
   */
  locale?: string
  /** First day of the week, 0 = Sunday. Default: from `locale`. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** Today in `timeZone`. Default: computed in the browser. */
  today?: CalendarDate
  /** Words, for translation. */
  labels?: Partial<DateTimePickerLabels>
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

/** Props for {@link DateTimePicker}: its options plus the native `<button>` (trigger) attributes. */
export type DateTimePickerProps = DateTimePickerOwnProps &
  Omit<ComponentPropsWithoutRef<'button'>, 'value' | 'defaultValue' | 'onChange' | 'type' | 'name'>

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
const GlobeGlyph = () => (
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
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.4 2.5 3.5 5.3 3.5 8.5s-1.1 6-3.5 8.5c-2.4-2.5-3.5-5.3-3.5-8.5s1.1-6 3.5-8.5z" />
  </svg>
)

/** "6:00 PM" / "18:00": the locale picks the clock. */
const timeText = (time: string, locale: string) => {
  const minutes = timeToMinutes(time)
  return utcFormatter(locale, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(Date.UTC(2026, 0, 1, Math.floor(minutes / 60), minutes % 60)),
  )
}

/**
 * Picks a day and a start time in a given time zone (a tournament at 6:00 PM Hermosillo time)
 * and hands back the exact moment as an ISO instant. People see and pick the venue's wall time;
 * the app stores `'2026-11-15T01:00:00.000Z'` and never converts zones by hand.
 *
 * @remarks
 * - SSR: a client component. The server renders the trigger and the zone line; their formatted
 *   text suppresses hydration warnings (ICU versions differ, e.g. "6:00 p.m." / "6:00 p. m.").
 *   The "your time" line renders only in the browser.
 * - Daylight saving: wall times a spring-forward jump skips are off (`labels.skipped`); a time that
 *   happens twice resolves to the earlier moment (Temporal's 'compatible'). Zone math uses `Intl`.
 * - Accessibility: the popup is a named dialog with the calendar grid and a named listbox
 *   (↑/↓ move and select, Home/End, digits jump to the hour). The zone is always visible text.
 * - Variants: `variant` 'filled' | 'outline' | 'ghost', `size` 'sm' | 'md' | 'lg'.
 *
 * @example
 * ```tsx
 * import { DateTimePicker } from '@sukunagg/ui'
 *
 * <DateTimePicker
 *   aria-label="Start"
 *   name="startsAt"
 *   timeZone="America/Hermosillo"
 *   step={30}
 *   min={today}
 *   defaultValue={tournament.startsAt}
 *   onValueChange={(instant) => setStartsAt(instant)}
 * />
 * ```
 */
export const DateTimePicker = forwardRef<HTMLButtonElement, DateTimePickerProps>(
  function DateTimePicker(
    {
      timeZone,
      value: valueProp,
      defaultValue,
      onValueChange,
      name,
      min,
      max,
      isDateDisabled,
      marks,
      step = 30,
      minTime = '00:00',
      maxTime = '23:59',
      isTimeDisabled,
      zoneLabel,
      showZone = true,
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
      'aria-describedby': describedBy,
      ...buttonProps
    },
    ref,
  ) {
    const labels = { ...DEFAULT_LABELS, ...labelsProp }
    const baseId = useId()
    const zoneId = `${baseId}-zone`
    const listId = `${baseId}-times`

    const [value, setValue] = useControllableState<string | null>({
      value: valueProp,
      defaultValue: defaultValue ?? null,
      onChange: (v) => onValueChange?.(v, v ? instantToWall(v, timeZone) : null),
    })
    const [open, setOpen] = useControllableState<boolean>({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    })
    const wall = value ? instantToWall(value, timeZone) : null
    // A day picked before any time: held until a time is chosen.
    const [draftDate, setDraftDate] = useState<CalendarDate | null>(null)
    const date = draftDate ?? wall?.date ?? null
    const [activeTime, setActiveTime] = useState<string | null>(wall?.time ?? null)
    const listRef = useRef<HTMLDivElement | null>(null)
    const popupRef = useRef<HTMLDivElement | null>(null)
    const typed = useRef('')

    const options: string[] = []
    for (let m = timeToMinutes(minTime); m <= timeToMinutes(maxTime); m += step)
      options.push(minutesToTime(m))
    const reasonFor = (time: string): string | null => {
      if (!date) return null
      if (!wallToInstant(date, time, timeZone).exists) return labels.skipped
      const r = isTimeDisabled?.(date, time)
      if (typeof r === 'string' && r) return r
      return r === true ? (labels.unavailable ?? 'unavailable') : null
    }

    const commit = (day: CalendarDate, time: string) => {
      setDraftDate(null)
      setValue(wallToInstant(day, time, timeZone).instant)
    }

    const pickDate = (day: CalendarDate | null) => {
      if (!day) return
      if (wall) {
        commit(day, wall.time)
        return
      }
      setDraftDate(day)
      // No time yet: the time list is next.
      requestAnimationFrame(() => listRef.current?.focus())
    }

    const pickTime = (time: string) => {
      if (!date || reasonFor(time)) return
      setActiveTime(time)
      commit(date, time)
    }

    // Keep the selected (or active) option in view, without scrolling the page.
    const scrollTo = (time: string | null) => {
      const list = listRef.current
      const option = time ? list?.querySelector<HTMLElement>(`[data-time="${time}"]`) : null
      if (list && option)
        list.scrollTop = option.offsetTop - list.clientHeight / 2 + option.offsetHeight / 2
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: scroll once per open, not on every selection
    useEffect(() => {
      if (open) requestAnimationFrame(() => scrollTo(wall?.time ?? activeTime))
    }, [open])

    const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (!date) return
      const enabled = options.filter((t) => !reasonFor(t))
      if (!enabled.length) return
      const current = activeTime && enabled.includes(activeTime) ? enabled.indexOf(activeTime) : -1
      let next: string | undefined
      if (event.key === 'ArrowDown') next = enabled[Math.min(enabled.length - 1, current + 1)]
      else if (event.key === 'ArrowUp') next = enabled[Math.max(0, current - 1)]
      else if (event.key === 'Home') next = enabled[0]
      else if (event.key === 'End') next = enabled[enabled.length - 1]
      else if (/^\d$/.test(event.key)) {
        // Type-ahead on the hour: "1" then "8" → 18:00.
        typed.current = (typed.current + event.key).slice(-2)
        const hour = Number(typed.current)
        next =
          enabled.find((t) => Number(t.slice(0, 2)) === hour) ??
          enabled.find((t) => Number(t.slice(0, 2)) === Number(event.key))
      } else return
      event.preventDefault()
      if (!next) return
      pickTime(next)
      scrollTo(next)
    }

    const today = todayProp ?? (open ? todayIn(timeZone) : undefined)
    const zoneText =
      zoneLabel ?? describeZone(timeZone, locale, value ? Date.parse(value) : undefined)
    const s = dateTimePickerStyles({ variant, size, invalid })
    const pop = popoverStyles()

    // The same moment in the browser's own zone, when it differs (popup only: browser-side).
    let viewerLine: string | null = null
    if (open && value) {
      const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const fmt = (zone: string) =>
        new Intl.DateTimeFormat(locale, {
          timeZone: zone,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }).format(new Date(value))
      if (browserZone && fmt(browserZone) !== fmt(timeZone))
        viewerLine = `${labels.yourTime(browserZone.replace(/_/g, ' '))}: ${fmt(browserZone)}`
    }

    const triggerText = wall
      ? `${formatDate(wall.date, locale, { weekday: 'short', month: 'short', day: 'numeric' })} · ${timeText(wall.time, locale)}`
      : null

    return (
      <div className={s.root()}>
        <Base.Root
          open={open}
          onOpenChange={(next) => {
            if (next) {
              setDraftDate(null)
              setActiveTime(wall?.time ?? null)
            }
            setOpen(next)
          }}
          modal={false}
        >
          <Base.Trigger
            render={
              <button
                ref={ref}
                type="button"
                disabled={disabled}
                aria-invalid={invalid || undefined}
                aria-describedby={
                  [describedBy, showZone ? zoneId : undefined].filter(Boolean).join(' ') ||
                  undefined
                }
                className={s.trigger({ className })}
                {...buttonProps}
              />
            }
          >
            <span className={s.icon()}>
              <CalendarGlyph />
            </span>
            {triggerText ? (
              <span className={s.value()} suppressHydrationWarning>
                {triggerText}
              </span>
            ) : (
              <span className={s.placeholder()}>{labels.placeholder}</span>
            )}
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
                  popupRef.current?.querySelector<HTMLElement>('[data-roving="true"]') ?? true
                }
              >
                <div className={s.body()}>
                  <CalendarWithInternals
                    aria-label={labels.dialog}
                    value={date}
                    onValueChange={pickDate}
                    defaultMonth={date ?? clampDate(today ?? todayIn(timeZone), min, max)}
                    min={min}
                    max={max}
                    isDateDisabled={isDateDisabled}
                    marks={marks}
                    locale={locale}
                    weekStartsOn={weekStartsOn}
                    today={today}
                    labels={labelsProp}
                  />
                  <div className={s.timeColumn()}>
                    <span id={`${listId}-label`} className={s.timeLabel()}>
                      {labels.time}
                    </span>
                    <div
                      ref={listRef}
                      id={listId}
                      role="listbox"
                      tabIndex={date ? 0 : -1}
                      aria-labelledby={`${listId}-label`}
                      aria-disabled={date ? undefined : true}
                      aria-activedescendant={
                        activeTime && options.includes(activeTime)
                          ? `${listId}-${activeTime}`
                          : undefined
                      }
                      className={s.times()}
                      onKeyDown={onListKeyDown}
                    >
                      {options.map((time) => {
                        const reason = reasonFor(time)
                        const selected = !!wall && !draftDate && wall.time === time
                        return (
                          // biome-ignore lint/a11y/useKeyWithClickEvents: the listbox handles the keys (aria-activedescendant)
                          // biome-ignore lint/a11y/useFocusableInteractive: options of an aria-activedescendant listbox are not focusable themselves
                          <div
                            key={time}
                            id={`${listId}-${time}`}
                            role="option"
                            data-time={time}
                            aria-selected={selected}
                            aria-disabled={reason || !date ? true : undefined}
                            aria-label={reason ? `${timeText(time, locale)}, ${reason}` : undefined}
                            title={reason ?? undefined}
                            className={s.time({ selected, active: time === activeTime })}
                            onClick={() => pickTime(time)}
                          >
                            {timeText(time, locale)}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <div className={s.footer()}>
                  <span className={s.footerText()}>
                    {showZone ? (
                      <span className={s.zone()}>
                        <GlobeGlyph />
                        {zoneText}
                      </span>
                    ) : null}
                    {viewerLine ? <span className={s.viewerTime()}>{viewerLine}</span> : null}
                  </span>
                  <Button size="sm" onClick={() => setOpen(false)}>
                    {labels.done}
                  </Button>
                </div>
              </Base.Popup>
            </Base.Positioner>
          </Base.Portal>
        </Base.Root>
        {showZone ? (
          <span id={zoneId} className={s.zone()} suppressHydrationWarning>
            <GlobeGlyph />
            {zoneText}
          </span>
        ) : null}
        {name ? <input type="hidden" name={name} value={value ?? ''} /> : null}
      </div>
    )
  },
)
