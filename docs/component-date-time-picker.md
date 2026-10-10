# Component: DateTimePicker

> Follows the `docs/component-button.md` template. `'use client'`: a trigger button plus a
> `Calendar` and a time list in a Base UI `popover`, in a fixed IANA time zone (Q41). Replaces
> native `datetime-local` plus hand-written zone conversion.

## 1. Purpose

Picks a day and a start time in a given time zone, such as a tournament at 6:00 PM Hermosillo
time, and hands back the exact moment as an ISO string. The person sees and picks the venue's wall
time; the app stores `2026-11-15T01:00:00.000Z` and never converts zones by hand.

## 2. Files

```
packages/ui/src/components/date-time-picker/
├── date-time-picker.styles.tsx   # tv() slots: trigger, zone, popup, body, times, time, footer.
├── date-time-picker.logic.tsx    # 'use client'; forwardRef <button>; wall ⇄ instant, time listbox.
├── date-time-picker.test.tsx
├── date-time-picker.stories.tsx
└── index.tsx                     # export { DateTimePicker }; export type { DateTimePickerProps,
                                  #   DateTimePickerLabels }
test/browser/date-time-picker.test.ts  # Playwright: pick day + time; listbox keys; Escape
```

Zone math lives in `utils/date/zone.ts` (shared with MonthView and Agenda).

## 3. API

```ts
import type { ComponentPropsWithoutRef } from 'react'
import type { CalendarDate, CalendarLabels, CalendarMark } from '../calendar'

export interface DateTimePickerLabels extends CalendarLabels {
  placeholder: string                      // 'Pick a date and time'
  time: string                             // 'Start time' (listbox name)
  done: string                             // 'Done'
  yourTime: (zone: string) => string       // z => `Your time (${z})`
  skipped: string                          // 'Skipped by daylight saving'
  dialog: string                           // 'Choose date and time' (popup name)
}

interface DateTimePickerOwnProps {
  /** IANA zone the wall time is in, e.g. 'America/Hermosillo'. Required: no silent default. */
  timeZone: string
  /** ISO instant, e.g. '2026-11-15T01:00:00.000Z'. */
  value?: string | null
  defaultValue?: string | null
  /** The instant plus the wall date/time it was picked as. */
  onValueChange?: (value: string | null, wall: DateTimeWall | null) => void   // DateTimeWall = { date, time }
  name?: string                            // hidden input: the ISO instant
  min?: CalendarDate                       // wall dates in `timeZone`
  max?: CalendarDate
  isDateDisabled?: (date: CalendarDate) => string | boolean | null | undefined
  marks?: (date: CalendarDate) => readonly CalendarMark[] | null | undefined
  step?: 5 | 10 | 15 | 20 | 30 | 60        // minutes, default 30
  minTime?: string                         // 'HH:mm' wall window, default '00:00'
  maxTime?: string                         // default '23:59'
  isTimeDisabled?: (date: CalendarDate, time: string) => string | boolean | null | undefined
  /** Zone line under the trigger and in the popup. Default: city + offset, e.g. 'Hermosillo · GMT−7'. */
  zoneLabel?: string
  showZone?: boolean                       // default true
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  locale?: string
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  today?: CalendarDate                     // today in `timeZone`
  labels?: Partial<DateTimePickerLabels>
  invalid?: boolean
  variant?: 'filled' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export type DateTimePickerProps = DateTimePickerOwnProps &
  Omit<ComponentPropsWithoutRef<'button'>, 'value' | 'defaultValue' | 'onChange' | 'type' | 'name'>
```

Pitaya's tournament form:

```tsx
<Field>
  <Field.Label htmlFor="starts">Inicio</Field.Label>
  <DateTimePicker id="starts" name="startsAt" timeZone="America/Hermosillo" zoneLabel="Hora de Hermosillo"
    locale="es-MX" labels={esLabels} step={30} min={today} defaultValue={t.startsAt} />
</Field>
```

Deliberately **not** in v1: typing a time, seconds, a duration/end time, letting the person change
the zone, a 12/24-hour switch (the locale decides).

## 4. Variants → tokens

Trigger: the shared form-control map; text "Sat, Nov 14 · 6:00 PM" (`--sk-text`, semibold,
tabular-nums), calendar icon `--sk-text-faint`. Zone line under it: `text-sm --sk-text-dim` with a
globe icon.

Popup: Popover content styling. Body: Calendar (left) + time column (132px, right), stacked below
480px. Time column: a listbox, 276px tall (= the six-row grid), scrolls; option 34px,
`rounded-sm`, `text-sm` tabular-nums; hover `--sk-surface-2`; selected `bg-gradient-accent
--sk-on-accent` bold (same as a selected day); disabled `--sk-text-faint` 45%. Footer: zone line,
"your time" line, `primary sm` Done.

## 5. States

| State | Behavior |
|---|---|
| empty | placeholder; zone line still shows (people need to know the zone before picking) |
| open, empty | calendar on today's month (in `timeZone`); time list disabled until a day is picked |
| pick a day | keeps the time if one exists, else moves focus to the time list |
| pick a time | value = the instant for (day, time) in `timeZone`; fires `onValueChange`; popup stays open |
| Done / `Escape` / outside | closes; focus to the trigger (Escape doesn't undo picks: each pick already committed) |
| your time | footer line with the same instant in the browser's zone, only when it differs; client-only |
| DST gap | wall times that don't exist that day (spring forward) are disabled with `labels.skipped` |
| DST overlap | a repeated wall time resolves to the earlier instant (Temporal's `'compatible'`) |

**Motion:** Popover entrance; calendar month slide; the time list scrolls the selected option to
the middle (instant under reduced motion).

## 6. Logic (`date-time-picker.logic.tsx`)

- `'use client'`. `forwardRef<HTMLButtonElement, DateTimePickerProps>` (the trigger).
- `useControllableState` for `value` and `open`. The wall date/time is derived from the value with
  `instantToWall(value, timeZone)`.
- `utils/date/zone.ts`: `instantToWall` reads `Intl.DateTimeFormat('en-US', { timeZone, hourCycle:
  'h23', year, month, day, hour, minute })#formatToParts`; `wallToInstant` guesses with `Date.UTC`,
  corrects by the zone offset at the guess, re-checks once (offsets differ across a DST change),
  and applies `'compatible'` disambiguation. About 40 lines, no Temporal polyfill (Q41,
  recommendation 3).
- Time list: `role="listbox"` with `aria-activedescendant`; options generated from `minTime`,
  `maxTime` and `step`; labels from `Intl.DateTimeFormat(locale, { hour: 'numeric', minute:
  '2-digit', timeZone: 'UTC' })` so the locale picks 12- or 24-hour. Scroll via `scrollTop` on the
  list (never `scrollIntoView`, which can scroll the page).
- Default `zoneLabel`: the IANA city (`America/Hermosillo` → "Hermosillo") plus Intl's
  `timeZoneName: 'shortOffset'` for the shown date.
- Hidden input `name` holds the ISO instant.
- **Server render:** the trigger shows the wall time formatted in `timeZone`. ICU data can differ
  between Node and the browser ("6:00 p.m." vs "6:00 p. m."), so that one text `<span>` carries
  `suppressHydrationWarning`; nothing else does. The "your time" line renders only after mount.

## 7. Styles (`date-time-picker.styles.tsx`)

`tv()` `slots`: `trigger`, `value`, `zone`, `popup`, `body`, `times`, `time`, `footer`,
`viewerTime`. Variants `variant`, `size`, `invalid`.

## 8. Accessibility checklist

- [ ] Trigger name includes the value and the zone ("Saturday, November 14, 2026, 6:00 PM,
      Hermosillo time"), via the visible text plus `aria-describedby` on the zone line.
- [ ] Popup `role="dialog"`; Calendar grid + a named `listbox`; Tab moves grid → list → Done.
- [ ] Listbox: `↑/↓` move and select, `Home/End`, type-ahead on the hour digits.
- [ ] Disabled times use `aria-disabled` with the reason in the option's name.
- [ ] Zone is always visible and announced; it is never only in a tooltip.

## 9. Tests

**Unit:** `zone.ts` (100%): Hermosillo (fixed −7), Mexico City (no DST since 2022), New York across
both 2026 DST changes (gap at 02:30 disabled, overlap 01:30 → earlier instant), Lord Howe (30-minute
DST), Kathmandu (+5:45). Component: SSR trigger + zone; hydrates; pick day then time fires the
instant + wall parts; time kept when the day changes; `step`/`minTime`/`maxTime` options;
`isTimeDisabled`; listbox keys; Done/Escape; hidden input; controlled `value`; "your time" only
after mount and only when different; ref is the trigger; className wins; axe both themes.
**Browser:** pick Nov 14 + 6:00 PM in `America/Hermosillo` → hidden input
`2026-11-15T01:00:00.000Z`; listbox keyboard; Escape returns focus.

## 10. Stories

`Default` (Hermosillo), `TournamentForm` (es-MX, marks on days with events), `DstGap`
(America/New_York, March 8 2026), `Window` (`minTime` 10:00, `maxTime` 23:30), `Step15`,
`Disabled`. Both `data-theme` values.

## 11. Decisions

- Value is an ISO instant, not a wall string: the moment is what apps store and compare (Q41).
- `timeZone` is required: a picker that silently used the browser's zone would recreate the bug it
  replaces.
- Intl zone math in-house, swap to Temporal later as a patch (Q41, recommendation 3).
- `suppressHydrationWarning` on the trigger's formatted-time `<span>` and the zone line only (D40):
  both are Intl output the server and the browser may print differently.
- Size: 50.4 kB brotli with Base UI (Popover + deps alone is 42.6 kB), budget 56 kB (P5).
