# Component: Calendar

> Follows the `docs/component-button.md` template. `'use client'`, built in-house (Base UI 1.8 has
> no calendar). The month grid that DatePicker, DateRangePicker and DateTimePicker are built on
> (Q41, mockup https://claude.ai/artifact/U3NkqPTW8GUzAnKRhcxTBE).

## 1. Purpose

Shows one or two months and lets people pick a day or a range with a mouse, touch or the keyboard.
It is the grid inside every date picker, and it also works on its own, inline on a page, for example
to choose a tournament day. Dates go in and come out as `'YYYY-MM-DD'` strings, so a picked day
never shifts with the viewer's time zone.

## 2. Files

```
packages/ui/src/components/calendar/
├── calendar.styles.tsx   # tv() slots (see §7). Pure. Server-safe.
├── calendar.logic.tsx    # 'use client'; forwardRef <div>; month/view/focus/range state, keyboard map.
├── calendar.test.tsx
├── calendar.stories.tsx
└── index.tsx             # export { Calendar }; export type { CalendarProps, CalendarDate, DateRange,
                          #   CalendarMark, CalendarLabels, CalendarView }
packages/ui/src/utils/date/          # shared by every calendar component; pure, server-safe, not exported
├── calendar-date.ts      # 'YYYY-MM-DD' math: isCalendarDate, parts, addDays, addMonths (day clamped),
│                         #   compare, startOfMonth, endOfMonth, dayOfWeek, daysBetween, monthMatrix
├── locale.ts             # weekStartFor(locale) (CLDR table), month/weekday names, typed-date order,
│                         #   parseTypedDate, formatTypedDate
└── zone.ts               # IANA zone math via Intl: wallToInstant, instantToWall, todayIn(timeZone)
packages/ui/scripts/motion/calendar.ts   # sk-calendar-next / -prev / -zoom keyframes → theme.css
test/browser/calendar.test.ts            # Playwright: keyboard across months, range hover preview
```

`monthMatrix` lives in `utils/date` (not a fourth component file) because MonthView reuses it on
the server.

## 3. API

```ts
import type { ComponentPropsWithoutRef } from 'react'

/** A calendar date, 'YYYY-MM-DD'. Never a Date: no time zone, no drift. */
export type CalendarDate = string
export interface DateRange { start: CalendarDate; end: CalendarDate }   // inclusive, start <= end
export type CalendarView = 'day' | 'month' | 'year'

/** A small dot under the day number. `label` is read by screen readers and shown on hover. */
export interface CalendarMark { label: string; color?: string }        // CSS color; default var(--sk-text-faint)

export interface CalendarLabels {
  previousMonth: string     // 'Previous month'
  nextMonth: string         // 'Next month'
  previousYear: string      // 'Previous year'   (month view)
  nextYear: string          // 'Next year'
  previousYears: string     // 'Earlier years'   (year view)
  nextYears: string         // 'Later years'
  chooseYear: string        // 'Choose year'     (appended to the caption button's name)
  selected: string          // 'selected'
  rangeStart: string        // 'range start'
  rangeEnd: string          // 'range end'
  unavailable: string       // 'unavailable'     (used when isDateDisabled returns true, not a reason)
}

interface CalendarOwnProps {
  /** Visible month, controlled. Any day in the month; reported back as 'YYYY-MM-01'. */
  month?: CalendarDate
  defaultMonth?: CalendarDate
  onMonthChange?: (month: CalendarDate) => void
  view?: CalendarView
  defaultView?: CalendarView               // default 'day'
  onViewChange?: (view: CalendarView) => void
  min?: CalendarDate
  max?: CalendarDate
  /** Return a reason ('Full', 'In the past') or true to turn a day off. The reason is announced. */
  isDateDisabled?: (date: CalendarDate) => string | boolean | null | undefined
  marks?: (date: CalendarDate) => readonly CalendarMark[] | null | undefined   // first 3 drawn
  months?: 1 | 2                           // default 1; two months hide outside days
  fixedWeeks?: boolean                     // default true: always six rows, so height never jumps
  showOutsideDays?: boolean                // default true (forced false when months={2})
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday; default from `locale` (CLDR)
  locale?: string                          // default 'en-US'; names, week start, label dates
  /** Today in the viewer's zone. Pass it from the server for an exact first paint (see §6). */
  today?: CalendarDate
  labels?: Partial<CalendarLabels>         // English defaults
  autoFocus?: boolean                      // focus the focused day on mount (the pickers' popovers)
}

type CalendarSingleProps = {
  mode?: 'single'
  value?: CalendarDate | null
  defaultValue?: CalendarDate | null
  onValueChange?: (value: CalendarDate | null) => void
}
type CalendarRangeProps = {
  mode: 'range'
  value?: DateRange | null
  defaultValue?: DateRange | null
  /** Fires with a complete range only. The first click is held inside the calendar. */
  onValueChange?: (value: DateRange | null) => void
  minDays?: number                         // inclusive length limits; days outside turn off
  maxDays?: number                         //   while the range is half picked
}

export type CalendarProps = CalendarOwnProps &
  (CalendarSingleProps | CalendarRangeProps) &
  Omit<ComponentPropsWithoutRef<'div'>, 'defaultValue' | 'onChange'>
```

Discriminated on `mode`, so a range calendar can't receive a single date. Clicking the selected day
again keeps it (no toggle-off); clearing is the app's call (`value={null}`). Clicking an outside day
moves to its month and picks it.

Deliberately **not** in v1: `mode="multiple"`, week numbers, a per-day render prop (that is
MonthView's `renderDay`), right-to-left key mirroring (RTL audit is backlog §D2), non-Gregorian
calendars.

## 4. Variants → tokens

No visual variants. Every state maps to an existing token (no new tokens, Q41):

| Part / state | Treatment |
|---|---|
| caption | `--sk-font-display`, `--sk-weight-black`, italic, uppercase, `text-sm`, tracking `.06em` (the HUD treatment StatTile uses) |
| weekday header | `text-xs` (11px), `--sk-weight-semibold`, uppercase, tracking `.08em`, `--sk-text-faint` |
| day (default) | `--sk-text`, `text-sm` tabular-nums, `--sk-radius-sm`, square cell |
| hover | bg `--sk-surface-2` |
| today | 1px inset ring `--sk-text-faint`, bold; `aria-current="date"` |
| selected / range ends | `bg-gradient-accent` + `--sk-on-accent`, bold (see §11: not flat `--sk-accent`) |
| in range | band behind the days: `--sk-accent` at 18% (`bg-accent/18`), rounded at row and month edges; the band starts and ends at the centre of the end cells |
| range preview (half picked) | same band at 9% |
| marked | up to three 4px dots under the number, `color` per mark; dots turn `--sk-on-accent` on selected days |
| disabled | `--sk-text-faint` at 45% opacity, `cursor-not-allowed`, still focusable |
| outside month | `--sk-text-faint` |
| focus-visible | 2px `--sk-focus-ring`, offset 1px (on selected days the ring is `--sk-text`) |
| nav button | 32px square, `--sk-surface-2`, `--sk-line` border, `--sk-text-dim` → `--sk-text` on hover |
| month / year pickers | a labelled group of buttons with `aria-pressed`, same day states, filling the six-row height (3×4 months, 4×5 years) |

Sizing: cells are square and fluid, `max-width` 40px each, so the grid is 280px wide at most and
shrinks inside a 320px phone popover instead of overflowing. Two months sit side by side with a
`--sk-space-7` gap.

## 5. States

| State | Behavior |
|---|---|
| day view | default. Caption button opens the year view. |
| year view | 20 years per page (4×5); pages end at `max`'s year, or align to multiples of 20 without `max`; the focused year never leaves `min`/`max`, and years outside them are off. Picking a year opens the month view. |
| month view | the 12 months of that year (3×4). Picking a month returns to the day view on that month. |
| range, half picked | first click sets the anchor; hover or keyboard focus previews the band; second click completes it (ends swap if needed) and fires `onValueChange` |
| `minDays`/`maxDays` | while half picked, days that would make the range too short or long turn off with a reason |
| disabled day | not selectable; reason in its accessible name and `title` |
| no anchor date | no `value`, `defaultMonth`, `month` or `today`: the server and the hydration render draw the frame with empty cells and `aria-busy`, and the month fills in after mount (see §6) |

**Motion (`docs/motion.md`):** a month change slides the grid 12px in the direction of travel with a
fade, `--sk-duration-base`, `--sk-ease`; switching between day, month and year views scales from
97%. Keyframes `sk-calendar-next`, `sk-calendar-prev`, `sk-calendar-zoom` and their
`animate-calendar-*` utilities (new, `scripts/motion/calendar.ts`).
Reduced motion: instant.

## 6. Logic (`calendar.logic.tsx`)

- `'use client'` (state, keyboard, focus). `forwardRef<HTMLDivElement, CalendarProps>`; the ref and
  rest props land on the root `<div role="group">`.
- State through `useControllableState`: `value`, `month`, `view`. Internal only: `focusedDate`,
  range `anchor`, `hoverDate`.
- **Starting month:** `month` → `defaultMonth` → the selected value (range: its start) → `today`. If
  none exist the component can't know the month without reading the clock, and a server render days
  older than the hydration (ISR, caches) would mismatch. So it renders the empty frame, then sets
  the month in `useEffect` from the browser's local date. Pickers never hit this: their popovers
  mount after hydration.
- **Today:** the `today` prop, else the browser's local date set in `useEffect` (the ring appears
  after hydration). Server and client HTML always match.
- **Roving tabindex:** exactly one day has `tabIndex=0`: the focused date when it is visible, else
  the selected day, else today, else the first enabled day of the month. Focus never leaves
  `[min, max]`.
- **Keyboard** (on the focused day; WAI-ARIA APG date grid):
  `←/→` ±1 day · `↑/↓` ±7 days · `Home/End` start/end of the week (respects `weekStartsOn`) ·
  `PageUp/PageDown` ±1 month (day clamped) · `Shift+PageUp/PageDown` ±1 year · `Enter/Space` pick.
  Moving past the visible months changes the month first, then focuses. Year/month pickers: arrows
  move by cell/row (PageUp/PageDown by 20 years), `Enter/Space` pick, `Escape` back to the day view
  (it stops there, so a picker's popover stays open).
- **Focus after a change** moves only when the change came from the keyboard or a view switch,
  never on hover re-renders.
- **Live region:** one visually hidden `aria-live="polite"` node, outside the re-rendered grid,
  announces the caption when the visible month changes (not on mount, not on every arrow).
- **Week start:** `weekStartsOn`, else `weekStartFor(locale)`: a CLDR weekData table (Sunday,
  Saturday and Friday regions; everything else Monday) keyed by
  `new Intl.Locale(locale).maximize().region`. Not `Intl.Locale#getWeekInfo`, which isn't in every
  engine, so the server and the browser always agree.
- **Names:** `Intl.DateTimeFormat(locale, { timeZone: 'UTC', … })` on a `Date.UTC` built from the
  string, so formatting can't shift the day. Weekday headers use `weekday: 'short'` with a trailing
  `.` stripped (`dom.` → `dom`); `abbr` carries the long name.
- No DOM access at module scope; nothing touches `window`/`document` outside effects and handlers.

## 7. Styles (`calendar.styles.tsx`)

`tv()` with `slots`: `root`, `header`, `caption` (button or text), `nav`, `navButton`, `months`,
`month`, `grid` (`<table>`), `weekday` (`<th>`), `cell` (`<td>`: the range band lives on
`before:`), `day` (`<button>`), `marks`, `mark`, `pickGrid`, `pick`, `live`. Variants:
`cell.band: none | full | start | end | single` plus `rowStart`/`rowEnd` booleans for the rounded
band ends, and `pending: true` for the 9% preview. Every class string appears literally (no
interpolation); mark colors go through an inline custom property (`style={{ '--sk-mark': color }}`
+ `bg-[var(--sk-mark)]`), the same way charts take caller colors.

## 8. Accessibility checklist

- [ ] Each month is a `<table role="grid">` labelled by its caption; `<th scope="col" abbr>` headers.
- [ ] The year and month pickers are labelled groups of buttons with `aria-pressed` (one tab stop,
      arrow keys inside).
- [ ] Days are `<button>`s inside `role="gridcell"` cells; `aria-selected` on the cell; the button's
      name is the full date plus marks, state and reason ("Saturday, November 14, 2026, Copa
      Pitaya, selected").
- [ ] `aria-current="date"` on today; `aria-disabled="true"` (not `disabled`) on off days, which
      stay focusable.
- [ ] One tab stop for the whole grid (roving tabindex); the APG key map in §6.
- [ ] Month changes announced once through the persistent live region.
- [ ] Nav buttons have names ("Previous month"); the caption button's name includes "Choose year"
      and it carries `aria-expanded` while the year/month grid is open.
- [ ] Selected day text ≥ 4.5:1 on the gradient's lightest stop (4.95:1) in both themes; range band
      text ≥ 4.5:1; today ring and focus ring ≥ 3:1.
- [ ] Marks are never the only signal: their labels are in the day's name.
- [ ] `prefers-reduced-motion` honored.

## 9. Tests

Harness in `docs/testing.md`. Unit (`calendar.test.tsx`):

- SSR: renders with `value`, with `defaultMonth`, and with no anchor (empty frame + `aria-busy`);
  hydrates without warnings in all three.
- Six rows by default; `fixedWeeks={false}` drops the empty row; `months={2}` hides outside days.
- `weekStartsOn` and locale week start: `en-US` Sunday, `en-GB` Monday, `es-MX` Sunday, `ar-EG`
  Saturday; Spanish names for `es-MX`.
- Single: click picks and fires `onValueChange`; controlled `value` wins; outside day moves month.
- Range: first click doesn't fire; second fires `{ start, end }` with swapped ends; `minDays` /
  `maxDays` turn days off while half picked; hover preview classes.
- `min`/`max`: nav buttons disable; focus clamps; `isDateDisabled` reason lands in the name.
- Keyboard: every key in §6, including `Shift+PageUp` and a month change from `ArrowDown`.
- Year and month views: open from the caption, pick, return; paging respects `min`/`max`.
- `today` prop sets `aria-current`; without it the ring appears after mount.
- `marks` render up to three dots and add labels to the name.
- Native props pass through; ref forwards to the root; consumer `className` wins; axe both themes.

Utilities (`utils/date/*.test.ts`, 100%): month/leap edges (Feb 29, Dec→Jan), `addMonths` clamping
(Jan 31 + 1 month = Feb 28), CLDR table spot checks, typed parse in three orders + ISO + 8-digit
compact, rejection of 2-digit years and impossible dates.

**Browser:** arrow keys cross a month boundary and focus follows; `PageDown` keeps the weekday;
range hover preview paints and the second click commits.

## 10. Stories

`Default`, `Range`, `TwoMonths` (range), `WithMarks` (tournament days), `MinMax`
(past days off), `DisabledWithReasons`, `YearView` (birth date), `Locales` (en-US / es-MX / en-GB
side by side), `NoAnchor` (empty first frame). Both `data-theme` values.

## 11. Decisions

- In-house grid, approved with the mockup (Q41): Base UI 1.8 has none, and the grid is small
  (target was ≤ 5 kB; measured 5.55 kB brotli with the year/month pickers, budget 6.2 kB, P5).
- Strings, not `Date`: `new Date('2026-11-14')` is midnight UTC, which is November 13 in
  Hermosillo. Strings also cross the RSC boundary unchanged.
- **Selected day uses `bg-gradient-accent`, not flat `--sk-accent`** (agent call, D40): white on dark
  `#FF3B4E` is 3.5:1 and fails AA for 13px text; the gradient's lightest stop `#D8253A` gives 4.95:1
  and matches Button `primary`. The mockup used the flat color.
- No-anchor inline calendars render an empty frame first instead of guessing the month from the
  server clock (D40).
- English labels by default; apps pass `labels` for Spanish (Q41). No bundled translations.
