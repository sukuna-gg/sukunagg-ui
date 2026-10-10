# Component: DateRangePicker

> Follows the `docs/component-button.md` template. `'use client'`: a trigger button plus presets and
> a two-month range `Calendar` in a Base UI `popover` (Q41).

## 1. Purpose

Picks a start and end day, for filters like "games from Sep 10 to Oct 9". Common ranges are one
click away as presets ("Last 7 days", "This month"), and two months show side by side for custom
ranges. Nothing changes until the person presses Apply, so a filter doesn't reload the page halfway
through a choice.

## 2. Files

```
packages/ui/src/components/date-range-picker/
├── date-range-picker.styles.tsx   # tv() slots: trigger, popup, presets, preset, main, footer, summary.
├── date-range-picker.logic.tsx    # 'use client'; forwardRef <button>; draft vs committed range, presets.
├── date-range-picker.test.tsx
├── date-range-picker.stories.tsx
└── index.tsx                      # export { DateRangePicker }; export type { DateRangePickerProps,
                                   #   DateRangePreset, DateRangePresetKey, DateRangePickerLabels }
test/browser/date-range-picker.test.ts  # Playwright: preset → Apply; two clicks → Apply; Escape cancels
```

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import type { CalendarDate, CalendarLabels, CalendarMark, DateRange } from '../calendar'

export type DateRangePresetKey =
  | 'today' | 'yesterday' | 'last7' | 'last30' | 'last90'
  | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear'

/** A built-in key, or your own: a fixed range or one computed from today. */
export type DateRangePreset =
  | DateRangePresetKey
  | { label: string; range: DateRange | ((today: CalendarDate) => DateRange) }

export interface DateRangePickerLabels extends CalendarLabels {
  placeholder: string                                   // 'Pick dates'
  apply: string                                         // 'Apply'
  cancel: string                                        // 'Cancel'
  custom: string                                        // 'Custom'
  pickEnd: string                                       // 'Pick the last day'
  days: (count: number) => string                       // n => `${n} days`
  presets: Record<DateRangePresetKey, string>           // 'Last 7 days', …
}

interface DateRangePickerOwnProps {
  value?: DateRange | null
  defaultValue?: DateRange | null
  onValueChange?: (value: DateRange | null) => void     // on Apply (or second click, see `commit`)
  min?: CalendarDate
  max?: CalendarDate
  isDateDisabled?: (date: CalendarDate) => string | boolean | null | undefined
  marks?: (date: CalendarDate) => readonly CalendarMark[] | null | undefined
  minDays?: number
  maxDays?: number
  presets?: readonly DateRangePreset[]                  // default none
  months?: 1 | 2                                        // default 2; one below a 600px-wide popup
  /** 'apply' (default): Apply/Cancel buttons. 'select': the second click commits and closes. */
  commit?: 'apply' | 'select'
  /** Footer text for the draft range, e.g. "30 days · 87 games". Default: the day count. */
  summary?: (range: DateRange) => ReactNode
  /** Hidden inputs carrying 'YYYY-MM-DD'. */
  startName?: string
  endName?: string
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  locale?: string
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  today?: CalendarDate
  labels?: Partial<DateRangePickerLabels>
  invalid?: boolean
  variant?: 'filled' | 'outline' | 'ghost'              // default 'filled'
  size?: 'sm' | 'md' | 'lg'                             // default 'md'
}

// The trigger is a native <button>; rest props spread onto it.
export type DateRangePickerProps = DateRangePickerOwnProps &
  Omit<ComponentPropsWithoutRef<'button'>, 'value' | 'defaultValue' | 'onChange' | 'type'>
```

sukuna-gg-web's match history:

```tsx
<DateRangePicker aria-label="Games played between" defaultValue={{ start: from, end: to }}
  max={today} today={today} marks={(d) => (gamesByDay.get(d) ? [{ label: `${gamesByDay.get(d)} games` }] : null)}
  presets={['last7', 'last30', 'thisMonth', 'lastMonth', 'last90']}
  summary={(r) => `${days(r)} days · ${countGames(r)} games`}
  onValueChange={(r) => router.push(qs({ ...params, from: r?.start, to: r?.end }))} />
```

Deliberately **not** in v1: typing a range (presets cover the common cases), time of day (use two
DateTimePickers), comparing two ranges, open-ended ranges ("since Sep 10").

## 4. Variants → tokens

Trigger: the shared form-control map (`filled`/`outline`/`ghost`, `sm`/`md`/`lg`), calendar icon
`--sk-text-faint`, text `--sk-text` semibold tabular-nums (placeholder `--sk-text-faint`), chevron
that turns 180° while open.

Popup: Popover content styling, `p-0`, two columns: presets rail (≈172px, bg `--sk-surface-2` mixed
toward `--sk-surface`, right border `--sk-line-soft`) and main (calendar + footer). Below 560px the
rail becomes a horizontal, scrollable row above the calendar (container query on the popup).

Preset: `text-sm --sk-text-dim`, hover `--sk-text` on `--sk-surface-2`; active (`aria-pressed`)
`--sk-text` semibold on `--sk-surface-2` with a 6px `--sk-accent` dot. "Custom" shows as active when
the draft matches no preset.

Footer: `border-t --sk-line-soft`; summary `text-sm --sk-text-dim` with the range in `--sk-text`;
`ghost` Cancel and `primary` Apply buttons (Button styles).

## 5. States

| State | Behavior |
|---|---|
| empty | trigger shows `labels.placeholder` |
| committed | trigger shows `Intl.DateTimeFormat#formatRange` ("Sep 10 – Oct 9, 2026"; one date if start = end) |
| open | draft = committed range; calendar shows the end month and the one before it |
| preset clicked | draft = preset range, calendar jumps to it; nothing commits yet |
| half picked | summary says `labels.pickEnd`; Apply disabled |
| Apply | commits the draft, fires `onValueChange`, closes, focus to trigger |
| Cancel / `Escape` / outside press | drops the draft, closes |
| `commit="select"` | no footer buttons; the second click commits and closes |

**Motion:** Popover entrance; calendar month slide. Reduced motion: instant.

## 6. Logic (`date-range-picker.logic.tsx`)

- `'use client'`. `forwardRef<HTMLButtonElement, DateRangePickerProps>` (the trigger).
- `useControllableState` for `value` and `open`; local `draft` and `pending` (half-picked anchor).
  Uses Calendar's internal pending callback (not in Calendar's public types) to show "Pick the last
  day".
- Presets resolve against `today` (prop, else the browser's local date at click time), through
  `utils/date`. Week presets respect `weekStartsOn`/locale. Presets that fall outside `min`/`max`
  are clamped; one that can't fit at all is disabled.
- `months={2}` drops to one when the popup is narrower than 600px (ResizeObserver on the popup,
  client-only), so keyboard focus never lands in a hidden month.
- Hidden inputs (`startName`/`endName`) hold the committed range.
- Server render: the trigger only. Both sides format the same strings with `timeZone: 'UTC'`, but
  ICU versions differ in `formatRange` spacing (newer ICU puts thin spaces around the dash), so
  that one text `<span>` carries `suppressHydrationWarning` (D40), as in DateTimePicker.

## 7. Styles (`date-range-picker.styles.tsx`)

`tv()` `slots`: `trigger`, `value`, `chevron`, `popup`, `presets`, `preset`, `main`, `footer`,
`summary`. Variants `variant`, `size`, `invalid` on the trigger.

## 8. Accessibility checklist

- [ ] Trigger has a name (`aria-label` or `Field.Label`) and its text states the range.
- [ ] Popup `role="dialog"`, named; focus to the first preset when presets exist, else the calendar.
- [ ] Presets are buttons with `aria-pressed`; the group has a name ("Presets").
- [ ] Summary is a polite live region, so the chosen range is announced.
- [ ] Apply is disabled (not hidden) while half picked.
- [ ] Calendar checklist applies.

## 9. Tests

**Unit:** SSR trigger with placeholder and with a range; hydrates; presets resolve against `today`
(including `thisWeek` with Monday and Sunday starts, `lastMonth` across a year boundary);
presets clamp to `min`/`max`; draft vs committed (Cancel/Escape drop, Apply commits); half picked
disables Apply; `commit="select"`; `summary` renders; hidden inputs; `months` collapses below
600px (mock ResizeObserver); controlled `value`; ref is the trigger; className wins; axe both themes.
**Browser:** preset → Apply updates the trigger; two clicks → Apply; Escape cancels and restores.

## 10. Stories

`Default`, `WithPresets`, `MatchHistory` (marks + summary + `max` today), `OneMonth`,
`SelectToCommit`, `MinMaxDays`, `Narrow` (preset row). Both `data-theme` values.

## 11. Decisions

- Apply/Cancel by default (Q41 mockup): range filters usually trigger a navigation, and half a
  range must never reach the URL.
- `formatRange` for the trigger text: locale-correct ("10 – 16 oct 2026") with no code of ours.
- Budget target: `Popover + deps` plus Calendar and presets, measured +10% (P5).
