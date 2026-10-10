'use client'

import { Popover as Base } from '@base-ui/react/popover'
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { useControllableState } from '../../hooks/use-controllable-state'
import { type CalendarDate, clampDate, todayLocal } from '../../utils/date/calendar-date'
import {
  formatDate,
  formatTypedDate,
  parseTypedDate,
  typedDatePlaceholder,
} from '../../utils/date/locale'
import {
  type CalendarLabels,
  type CalendarMark,
  type CalendarView,
  CalendarWithInternals,
} from '../calendar/calendar.logic'
import { popoverStyles } from '../popover/popover.styles'
import { datePickerStyles } from './date-picker.styles'

/** Words a DatePicker says, for translation (English by default). Includes the Calendar's. */
export interface DatePickerLabels extends CalendarLabels {
  /** Trigger button and popup name. */
  chooseDate: string
  /** Footer button that empties the field. */
  clear: string
  /** Placeholder per part, joined in the locale's order: `{ day: 'DD', month: 'MM', year: 'AAAA' }`. */
  placeholderParts: { day: string; month: string; year: string }
}

/** Error messages for typed text, for translation. */
export interface DatePickerMessages {
  /** Text that isn't a date. A function receives an example in the locale's format. */
  invalid?: string | ((example: string) => string)
  /** A date before `min`. */
  min?: string
  /** A date after `max`. */
  max?: string
  /** A day `isDateDisabled` turns off. Default: its reason. */
  disabled?: string
}

const DEFAULT_LABELS = {
  chooseDate: 'Choose date',
  clear: 'Clear',
  placeholderParts: { day: 'DD', month: 'MM', year: 'YYYY' },
}

export interface DatePickerOwnProps {
  /** Committed date, controlled. `null` = empty. */
  value?: CalendarDate | null
  /** Committed date on first render when uncontrolled. */
  defaultValue?: CalendarDate | null
  /** Called when a typed or picked date is committed (or the field is cleared: `null`). */
  onValueChange?: (value: CalendarDate | null) => void
  /** Name of a hidden input carrying `'YYYY-MM-DD'` (or `''`). The visible text has no name. */
  name?: string
  /** First allowed date. */
  min?: CalendarDate
  /** Last allowed date (e.g. 18 years ago for a birth date). */
  max?: CalendarDate
  /** Turns days off; a returned string is the reason shown and read out. */
  isDateDisabled?: (date: CalendarDate) => string | boolean | null | undefined
  /** Dots under days in the calendar. */
  marks?: (date: CalendarDate) => readonly CalendarMark[] | null | undefined
  /**
   * Grid the calendar opens on when there is no value. `'year'` suits a birth date.
   * @default 'day'
   */
  openTo?: CalendarView
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
   * Typed order and separator, month and day names, week start.
   * @default 'en-US'
   */
  locale?: string
  /** First day of the week, 0 = Sunday. Default: from `locale`. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** Today in the viewer's zone, for the calendar's today ring. */
  today?: CalendarDate
  /** Words, for translation. */
  labels?: Partial<DatePickerLabels>
  /** Error messages, for translation. */
  messages?: DatePickerMessages
  /**
   * Force the invalid look (e.g. a server error). Typed-text errors set it on their own.
   * @default false
   */
  invalid?: boolean
  /**
   * Field look, the same map as Input.
   * @default 'filled'
   */
  variant?: 'filled' | 'outline' | 'ghost'
  /**
   * Field height: 32 / 40 / 48px.
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Props for {@link DatePicker}: its own options plus the native `<input>` attributes, which land
 * on the visible text field (`id`, `required`, `disabled`, `readOnly`, `aria-*`, `autoComplete`…).
 * `className` styles the outer wrapper.
 */
export type DatePickerProps = DatePickerOwnProps &
  Omit<
    ComponentPropsWithoutRef<'input'>,
    'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max' | 'size' | 'name'
  >

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

const shortDate = { month: 'short', day: 'numeric', year: 'numeric' } as const

/**
 * A date field: type the date in the locale's order (04/12/1998 in the US, 12/04/1998 in Mexico,
 * ISO always works) or pick it from a calendar. The form gets a plain `'YYYY-MM-DD'`.
 *
 * @remarks
 * - SSR: a client component. The server renders the field with the formatted date (digits and
 *   the locale's separator, the same on every ICU version); the popup renders nothing while closed.
 * - Typing commits on blur and on Enter (Enter doesn't submit the form). Invalid text keeps what
 *   was typed, sets `aria-invalid` and shows a message (`messages`); the value is unchanged.
 * - Accessibility: label it with `Field.Label htmlFor` or `aria-label`. The calendar button is
 *   named (`labels.chooseDate`) and opens a dialog; focus moves to the selected day (or today) and
 *   returns to the field after a pick. `Alt+ArrowDown` opens it from the field. Errors are
 *   announced (`role="alert"`) and linked with `aria-describedby`.
 * - Variants: `variant` 'filled' | 'outline' | 'ghost', `size` 'sm' | 'md' | 'lg' (as Input).
 *
 * @example
 * ```tsx
 * import { DatePicker, Field } from '@sukunagg/ui'
 *
 * <Field>
 *   <Field.Label htmlFor="birth">Birth date</Field.Label>
 *   <DatePicker id="birth" name="birthDate" max={maxBirthDate} openTo="year" autoComplete="bday" />
 * </Field>
 * ```
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  {
    value: valueProp,
    defaultValue,
    onValueChange,
    name,
    min,
    max,
    isDateDisabled,
    marks,
    openTo = 'day',
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    locale = 'en-US',
    weekStartsOn,
    today,
    labels: labelsProp,
    messages,
    invalid = false,
    variant,
    size,
    className,
    id: idProp,
    disabled,
    readOnly,
    required,
    placeholder,
    onBlur,
    onKeyDown,
    'aria-describedby': describedBy,
    ...inputProps
  },
  ref,
) {
  const labels = {
    ...DEFAULT_LABELS,
    ...labelsProp,
    placeholderParts: { ...DEFAULT_LABELS.placeholderParts, ...labelsProp?.placeholderParts },
  }
  const autoId = useId()
  const id = idProp ?? autoId
  const errorId = `${id}-error`

  const [value, setValue] = useControllableState<CalendarDate | null>({
    value: valueProp,
    defaultValue: defaultValue ?? null,
    onChange: onValueChange,
  })
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  })
  const [text, setText] = useState(() => (value ? formatTypedDate(value, locale) : ''))
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const fieldRef = useRef<HTMLDivElement | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)
  const pickedRef = useRef(false)
  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  // A new value (or locale) re-formats the text, unless someone is typing in it.
  useEffect(() => {
    if (typeof document !== 'undefined' && document.activeElement === inputRef.current) return
    setText(value ? formatTypedDate(value, locale) : '')
  }, [value, locale])

  const fail = (message: string) => setError(message)

  const commit = () => {
    const typed = text.trim()
    if (!typed) {
      setError(null)
      if (value !== null) setValue(null)
      return
    }
    const parsed = parseTypedDate(typed, locale)
    if (!parsed) {
      const example = formatTypedDate(clampDate('2026-04-12', min, max), locale)
      const m = messages?.invalid
      fail(typeof m === 'function' ? m(example) : (m ?? `Enter a date like ${example}.`))
      return
    }
    if (min && parsed < min) {
      fail(messages?.min ?? `Pick a date on or after ${formatDate(min, locale, shortDate)}.`)
      return
    }
    if (max && parsed > max) {
      fail(messages?.max ?? `Pick a date on or before ${formatDate(max, locale, shortDate)}.`)
      return
    }
    const off = isDateDisabled?.(parsed)
    if (off) {
      fail(messages?.disabled ?? (typeof off === 'string' ? off : "That date isn't available."))
      return
    }
    setError(null)
    setText(formatTypedDate(parsed, locale))
    if (parsed !== value) setValue(parsed)
  }

  const pick = (date: CalendarDate | null) => {
    if (!date) return
    setError(null)
    setText(formatTypedDate(date, locale))
    setValue(date)
    pickedRef.current = true
    setOpen(false)
  }

  const onFieldKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
    } else if (event.key === 'ArrowDown' && event.altKey) {
      event.preventDefault()
      setOpen(true)
    }
  }

  const s = datePickerStyles({ variant, size, invalid: invalid || error !== null })
  const pop = popoverStyles()
  const describedByIds = [describedBy, error ? errorId : undefined].filter(Boolean).join(' ')

  return (
    <div className={s.root({ className })}>
      <div ref={fieldRef} className={s.field()}>
        <input
          ref={setInputRef}
          id={id}
          type="text"
          inputMode="numeric"
          value={text}
          placeholder={placeholder ?? typedDatePlaceholder(locale, labels.placeholderParts)}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-invalid={invalid || error !== null || undefined}
          aria-describedby={describedByIds || undefined}
          className={s.input()}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => {
            onBlur?.(e)
            commit()
          }}
          onKeyDown={onFieldKeyDown}
          {...inputProps}
        />
        <Base.Root open={open} onOpenChange={(next) => setOpen(next)} modal={false}>
          <Base.Trigger
            render={
              <button
                type="button"
                aria-label={labels.chooseDate}
                disabled={disabled || readOnly}
                className={s.trigger()}
              />
            }
          >
            <CalendarGlyph />
          </Base.Trigger>
          <Base.Portal>
            <Base.Positioner
              anchor={fieldRef}
              side="bottom"
              align="start"
              sideOffset={6}
              className={pop.positioner()}
            >
              <Base.Popup
                ref={popupRef}
                aria-label={labels.chooseDate}
                className={pop.popup({ className: s.popup() })}
                initialFocus={() =>
                  popupRef.current?.querySelector<HTMLElement>('[data-roving="true"]') ?? true
                }
                finalFocus={() => {
                  if (!pickedRef.current) return true
                  pickedRef.current = false
                  return inputRef.current
                }}
              >
                <CalendarWithInternals
                  aria-label={labels.chooseDate}
                  value={value}
                  onValueChange={pick}
                  defaultMonth={value ?? clampDate(today ?? todayLocal(), min, max)}
                  defaultView={value ? 'day' : openTo}
                  min={min}
                  max={max}
                  isDateDisabled={isDateDisabled}
                  marks={marks}
                  locale={locale}
                  weekStartsOn={weekStartsOn}
                  today={today}
                  labels={labelsProp}
                  autoFocus
                />
                {value && !required ? (
                  <div className={s.footer()}>
                    <button
                      type="button"
                      className={pop.close()}
                      onClick={() => {
                        setError(null)
                        setText('')
                        setValue(null)
                      }}
                    >
                      {labels.clear}
                    </button>
                  </div>
                ) : null}
              </Base.Popup>
            </Base.Positioner>
          </Base.Portal>
        </Base.Root>
      </div>
      {name ? <input type="hidden" name={name} value={value ?? ''} /> : null}
      {error ? (
        <p id={errorId} role="alert" className={s.error()}>
          {error}
        </p>
      ) : null}
    </div>
  )
})
