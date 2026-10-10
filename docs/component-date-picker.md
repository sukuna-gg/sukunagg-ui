# Component: DatePicker

> Follows the `docs/component-button.md` template. `'use client'`: a typed date field plus a
> `Calendar` in a Base UI `popover` (Q41). Replaces native `<input type="date">`.

## 1. Purpose

Lets people type a date or pick it from a calendar, for forms like a birth date or a deadline.
Typing follows the locale's order (04/12/1998 in the US, 12/04/1998 in Mexico) and also accepts
ISO, and the field submits a plain `'YYYY-MM-DD'`. With no value it can open on the year grid, so
nobody clicks back through 18 years of months to reach a birth year.

## 2. Files

```
packages/ui/src/components/date-picker/
├── date-picker.styles.tsx   # tv() slots: field, input, trigger, popup, error. Shares the form-control
│                            #   variant/size map with Input/Select/NumberField.
├── date-picker.logic.tsx    # 'use client'; forwardRef <input>; text ⇄ value, validation, popover.
├── date-picker.test.tsx
├── date-picker.stories.tsx
└── index.tsx                # export { DatePicker }; export type { DatePickerProps, DatePickerLabels,
                             #   DatePickerMessages }
test/browser/date-picker.test.ts  # Playwright: type + blur commits; open, pick, focus returns; Escape
```

Reuses `Calendar` (component) and `utils/date/locale.ts` (`parseTypedDate`, `formatTypedDate`).

## 3. API

```ts
import type { ComponentPropsWithoutRef } from 'react'
import type { CalendarDate, CalendarLabels, CalendarMark, CalendarView } from '../calendar'

export interface DatePickerLabels extends CalendarLabels {
  chooseDate: string        // 'Choose date' (trigger button + dialog name)
  clear: string             // 'Clear'
  placeholderParts: { day: string; month: string; year: string }   // { 'DD', 'MM', 'YYYY' }
}

export interface DatePickerMessages {
  /** Text that isn't a date. Receives an example in the locale's format. */
  invalid?: string | ((example: string) => string)   // 'Enter a date like 04/12/1998.'
  min?: string              // 'Pick a date on or after Oct 9, 2026.'
  max?: string              // 'Pick a date on or before Oct 9, 2008.'
  disabled?: string         // default: the isDateDisabled reason
}

interface DatePickerOwnProps {
  value?: CalendarDate | null
  defaultValue?: CalendarDate | null
  onValueChange?: (value: CalendarDate | null) => void
  /** Hidden input carrying 'YYYY-MM-DD' (or '' when empty). The visible text has no name. */
  name?: string
  min?: CalendarDate
  max?: CalendarDate
  isDateDisabled?: (date: CalendarDate) => string | boolean | null | undefined
  marks?: (date: CalendarDate) => readonly CalendarMark[] | null | undefined
  /** View the calendar opens on when there is no value. Default 'day'. */
  openTo?: CalendarView
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  locale?: string                    // default 'en-US': typed order, separator, names
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  today?: CalendarDate
  labels?: Partial<DatePickerLabels>
  messages?: DatePickerMessages
  /** Forces the invalid look (e.g. a server error). Typed-text errors set it on their own. */
  invalid?: boolean
  variant?: 'filled' | 'outline' | 'ghost'   // default 'filled' — shared form-control map
  size?: 'sm' | 'md' | 'lg'                  // default 'md'
}

// The visible field is a native <input type="text">; own props are consumed, the rest spread onto
// it (id, required, disabled, readOnly, aria-*, autoComplete, onBlur…).
export type DatePickerProps = DatePickerOwnProps &
  Omit<ComponentPropsWithoutRef<'input'>, 'value' | 'defaultValue' | 'onChange' | 'type' | 'min' |
    'max' | 'size' | 'name'>
```

Pitaya's identity form:

```tsx
<Field>
  <Field.Label htmlFor="birth">Fecha de nacimiento</Field.Label>
  <DatePicker id="birth" name="birthDate" locale="es-MX" labels={esLabels} max={maxBirthDate}
    openTo="year" autoComplete="bday" messages={{ max: 'Pitaya es solo para mayores de 18 años.' }} />
</Field>
```

Deliberately **not** in v1: segmented day/month/year boxes (later `DateField`, Q41), two-digit
years, relative text ("tomorrow"), an inline (always-open) mode (use `Calendar`).

## 4. Variants → tokens

Field: the shared form-control map (Input §4): `filled` `bg-surface-2 border-line` / `outline` /
`ghost`; sizes `sm` 32px / `md` 40px / `lg` 48px; `rounded-md`; focus `ring-2 ring-focus-ring
border-accent`; invalid `border-accent`. The input is borderless inside the field; placeholder
`--sk-text-faint`; tabular-nums.

Trigger: icon button inside the field's end (calendar icon from the icon set), 30px square,
`--sk-text-dim`, hover/open bg `--sk-surface`.

Popup: same as `Popover` content (`bg-surface border-line rounded-md shadow-card p-3`,
`z-[var(--sk-z-popover)]`), width fits the 280px grid, `max-w-[calc(100vw-2rem)]`. Footer: a
`ghost sm` "Clear" button, only when there is a value and the input isn't `required`.

Error line: `text-sm text-accent` under the field (Field's error style), `role="alert"`.

## 5. States

| State | Behavior |
|---|---|
| empty | placeholder in the locale's order (`MM/DD/YYYY`, `DD/MM/AAAA` with Spanish `placeholderParts`) |
| typing | nothing commits while typing |
| commit | on blur and on `Enter`: parse → validate → set value, reformat the text in the locale's order |
| invalid text | value unchanged, text kept so it can be fixed, `aria-invalid`, error line (`messages.invalid`) |
| out of range / off day | same, with `messages.min`/`max`/the disabled reason |
| cleared text | value becomes `null` (or the field reports `required` through native validation) |
| open | Calendar on the value's month, else `openTo` view, else today's month; focus on the selected day (or today) |
| pick | sets the value, closes, focus back on the input |
| `Escape` in the popup | closes without change, focus back on the trigger |
| disabled / readOnly | field dimmed (disabled) or text-only (readOnly); trigger disabled |

**Motion:** popup uses Popover's directional entrance; the calendar's own month slide inside.
Reduced motion: instant.

## 6. Logic (`date-picker.logic.tsx`)

- `'use client'`. `forwardRef<HTMLInputElement, DatePickerProps>`: the ref is the visible input.
- `useControllableState` for `value` and `open`. Local `text` and `error` state; `text` is
  re-derived from `value` whenever the value or locale changes and the input isn't focused.
- Parsing (`parseTypedDate(text, locale)`): reads the locale's day/month/year order from
  `Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
  .formatToParts`; accepts any non-digit separators, ISO `YYYY-MM-DD`, and 8 digits in the
  locale's order (`04121998`), so `inputMode="numeric"` keypads without `/` still work. Rejects
  two-digit years and impossible dates (Feb 30).
- Base UI `Popover.Root` (open state) → `Popover.Trigger` (the icon button) → `Positioner` anchored
  to the whole field (`anchor` = field wrapper), `side="bottom" align="start"` → `Popup` with
  `role="dialog"` named `labels.chooseDate` → `Calendar` with `autoFocus` on its day.
- `Alt+ArrowDown` in the input opens the popup (combobox convention).
- The hidden `<input type="hidden" name={name}>` always holds the committed ISO value, so plain
  `FormData` and server actions get `'1998-04-12'`.
- Server render: the field and the formatted text only; the popover renders nothing while closed.
  The text is digits and the locale separator (stable across ICU versions), so it hydrates cleanly.
- No module-scope DOM access.

## 7. Styles (`date-picker.styles.tsx`)

`tv()` `slots`: `field` (wrapper with the variant/size map), `input`, `trigger`, `popup`, `footer`,
`error`. Variants `variant`, `size`, `invalid` (declared last so the crimson border wins, like
Input).

## 8. Accessibility checklist

- [ ] Label through `Field.Label htmlFor` (or `aria-label`); the input keeps its name when the
      popover opens.
- [ ] Trigger: `aria-label={labels.chooseDate}`, `aria-haspopup="dialog"`, `aria-expanded`,
      `aria-controls`.
- [ ] Popup is `role="dialog"` with a name; focus moves to the calendar and returns on close.
- [ ] Error line linked through `aria-describedby`, announced (`role="alert"`) once per commit.
- [ ] `aria-invalid` on the input while an error shows.
- [ ] Placeholder shows the expected order; the description (via `Field.Description`) can repeat it.
- [ ] Everything in Calendar's checklist applies inside the popup.

## 9. Tests

**Unit:** SSR renders field + text, no popup; hydrates cleanly; typing + blur and `Enter` commit
in en-US / es-MX / en-GB orders, ISO and 8-digit input; invalid text keeps the text and shows the
message; `min`/`max`/`isDateDisabled` errors use `messages`; hidden input holds ISO; trigger opens
on `openTo` view when empty and on the value's month otherwise; picking closes and focuses the
input; `Escape` closes and focuses the trigger; `Alt+ArrowDown` opens; Clear empties; controlled
`value`; ref is the input; native props pass through; consumer `className` wins; axe both themes,
open and closed.
**Browser:** type + Tab commits; open → arrow keys → Enter picks and focus returns; outside click
closes.

## 10. Stories

`Default`, `BirthDate` (`max` 18 years ago, `openTo="year"`, es-MX labels), `WithField`
(label + description + server error via `invalid`), `MinMax`, `Variants`, `Sizes`, `Disabled`,
`ReadOnly`. Both `data-theme` values.

## 11. Decisions

- One text box that reads the locale's order, not segmented boxes, for v1 (Q41, recommendation 2).
- The visible input has no `name`; a hidden input submits ISO, so servers never parse locale text.
- The error line is built in: the component owns parsing, so it owns the message. Apps still use
  `Field` for the label and description.
- Budget target: `Popover + deps` (46 kB) plus Calendar and the field, measured +10% (P5).
