# Component: MonthView

> Follows the `docs/component-button.md` template. **Server component**, no client JS: a month of
> events or custom day cells that moves between months with links (Q41). Uses `Agenda` for its
> narrow layout.

## 1. Purpose

Shows a whole month at once: a tournament schedule, a release calendar, or days played with a
result in each cell. Events that last several days draw as bars across the week, and a busy day
collapses into "+2 more". It renders on the server, so the URL (`?month=2026-11`) is the whole
navigation and the page works with JavaScript off. Below 600px wide the grid turns into an agenda
list.

## 2. Files

```
packages/ui/src/components/month-view/
├── month-view.styles.tsx   # tv() slots (see §7). Pure. Server-safe.
├── month-view.logic.tsx    # server component; forwardRef <section>; week rows, event lanes, links.
├── month-view.test.tsx
├── month-view.stories.tsx
└── index.tsx               # export { MonthView }; export type { MonthViewProps, CalendarEvent,
                            #   MonthViewDayInfo, MonthViewLabels }
```

`CalendarEvent` is shared with `Agenda` (declared in `utils/date`, re-exported by both). Lane layout
is a pure function in this component's logic file; `monthMatrix` comes from `utils/date`.

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import type { CalendarDate } from '../calendar'
import type { EmptyStateProps } from '../empty-state'

export interface CalendarEvent {
  id: string
  title: string
  /** 'YYYY-MM-DD' for an all-day event, or an ISO instant for a timed one. */
  start: string
  /** Same forms. All-day `end` is inclusive. Omit for a one-day / zero-length event. */
  end?: string
  color?: string            // CSS color for the dot / bar, e.g. a game color. Default var(--sk-chart-1)
  href?: string             // the event becomes a link
  meta?: string             // second line in the list layout: 'Valorant · In person'
  status?: ReactNode        // trailing badge in the list layout, e.g. <Badge>Full</Badge>
}

export interface MonthViewDayInfo {
  inMonth: boolean
  isToday: boolean
  events: readonly CalendarEvent[]   // events touching this day
}

export interface MonthViewLabels {
  previousMonth: string     // 'Previous month'
  nextMonth: string         // 'Next month'
  today: string             // 'Today'
  more: (count: number) => string   // n => `+${n} more`
  untracked: string         // 'Not tracked'
  allDay: string            // 'All day'
}

interface MonthViewOwnProps {
  month: CalendarDate                       // any day in the month to show
  events?: readonly CalendarEvent[]
  /** Zone for timed events and for today. Default 'UTC', the same on every server. */
  timeZone?: string
  today?: CalendarDate                      // default: today in `timeZone` at render
  locale?: string                           // default 'en-US'
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** Prev / next / today links. Omit to show the caption without navigation. */
  monthHref?: (month: CalendarDate) => string
  /** Day numbers become links; "+N more" goes here when set. */
  dayHref?: (date: CalendarDate) => string | undefined
  /** Custom content under the day number (e.g. average placement). */
  renderDay?: (date: CalendarDate, info: MonthViewDayInfo) => ReactNode
  /** Days with no data source yet: hatched and named "Not tracked", never shown as empty/zero. */
  isDateUntracked?: (date: CalendarDate) => boolean
  variant?: 'grid' | 'tiles'                // default 'grid'; 'tiles' = rounded day tiles for renderDay
  maxLanes?: number                         // event rows per day before "+N more"; default 3
  /** 'auto' (default): agenda list below 600px container width. */
  list?: 'auto' | 'always' | 'never'
  /** Shown over the grid when the month has no events. `false` turns it off. */
  empty?: Pick<EmptyStateProps, 'title' | 'children' | 'actions' | 'icon'> | false
  loading?: boolean
  labels?: Partial<MonthViewLabels>
  /** Prefix for ids ("+N more" popovers, caption). Default derived from the month. */
  id?: string
}

export type MonthViewProps = MonthViewOwnProps & Omit<ComponentPropsWithoutRef<'section'>, 'children'>
```

Pitaya's `/torneos` page:

```tsx
<MonthView month={month} today={today} locale="es-MX" labels={esLabels} timeZone="America/Hermosillo"
  events={tournaments.map((t) => ({ id: t.slug, title: t.name, start: t.startsAt, end: t.endsAt,
    color: gameColor[t.game.slug], href: `/torneos/${t.slug}`, meta: `${t.game.name} · ${venue(t)}` }))}
  monthHref={(m) => `?month=${m.slice(0, 7)}`}
  empty={{ title: 'No hay torneos este mes', children: 'Anunciamos fechas primero en nuestras redes.' }} />
```

Deliberately **not** in v1: week and day views with hour rows (later `WeekView`), drag to move or
resize, a click-to-create callback (it's a server component), recurring-event expansion (pass
concrete events).

## 4. Variants → tokens

`grid` (default):

| Part | Treatment |
|---|---|
| frame | `border --sk-line rounded-md overflow-hidden`; weekday row `bg` `--sk-surface-2` mixed toward `--sk-surface`, `text-xs` uppercase `--sk-text-faint` |
| week row | `min-h` 112px, bottom `--sk-line-soft`; day columns split by `--sk-line-soft` |
| outside day | bg `--sk-well` at 35%, number `--sk-text-faint` |
| today | column bg `--sk-accent` at 7%; number in a 22px `bg-gradient-accent` pill, `--sk-on-accent` |
| timed event | 22px row: 7px dot in the event color, short time (`6 PM` / `18:00`) `--sk-text-dim`, title `--sk-text`, ellipsis; hover `--sk-surface-2` |
| multi-day bar | event color at 22% over `--sk-surface`, inset 1px ring at 40%, semibold title; square ends where the bar continues into the next/previous week |
| "+N more" | `--sk-text-dim` semibold, same row height |
| untracked day | 135° hatch in `--sk-line-soft`, 1px `--sk-line` inset |

`tiles`: no frame lines; each in-month day is a rounded tile (`--sk-radius-sm`, `--sk-surface-2`,
4px gaps), number top-left `text-xs --sk-text-faint`, `renderDay` content below; tracked days with
no content are lighter; future days are outlined only; untracked days hatched.

Caption: the Calendar caption treatment at `text-lg`. Nav: Calendar nav buttons as links; "Today"
as a `secondary sm` Button link (`aria-disabled` on the current month).

## 5. States

| State | Behavior |
|---|---|
| data | events laid out in lanes (§6) |
| busy day | `maxLanes − 1` events + "+N more" in the last lane |
| empty month | the grid stays, `EmptyState` (`size="sm"`) centred over it (charts rule "empty keeps the frame") |
| loading | the grid with skeleton bars in some cells, `aria-busy="true"`, pulse stops under reduced motion |
| narrow (`list="auto"`, < 600px) | the grid hides and the `Agenda` list of the month's events shows (CSS container query, both rendered) |
| untracked days | hatched + "Not tracked" in the day's name; `renderDay` isn't called for them |

**Motion:** none of its own (server component). The "+N more" popover uses the native `popover`
entrance (`@starting-style` fade, instant under reduced motion).

## 6. Logic (`month-view.logic.tsx`)

- **No `'use client'`, no hooks.** `forwardRef<HTMLElement, MonthViewProps>` on the `<section>`.
  Guarded by the RSC boundary test.
- Timed events are bucketed by their wall date in `timeZone` (`instantToWall`); all-day dates are
  used as is. An event whose end falls on a later day is multi-day.
- **Lanes, per week row:** multi-day events first (earlier start, then longer), each in the lowest
  lane free across its span; then each day's timed events by start time fill that day's free lanes;
  overflow becomes "+N more" in the last free lane. Pure function, unit-tested on its own.
- **"+N more"** links to `dayHref(date)` when given. Otherwise it is a `<button popovertarget>`
  opening a native `popover` that lists the whole day: zero JS, works in every evergreen browser.
  Attributes are written in lowercase so React 18 passes them through (checked by the React 18
  matrix, `bun run test:react18`).
- **Today:** the `today` prop, else today in `timeZone` at render. Fine in a server component (it
  doesn't hydrate). Pass `today` if the page is statically cached or MonthView sits inside a client
  component (then it renders on both sides).
- **Narrow layout:** with `list="auto"` both the grid and an `Agenda` of the month render; a
  container query (`@container (max-width: 600px)`) shows one. No resize script.
- Formatting through `Intl.DateTimeFormat(locale, { timeZone })`; short times drop `:00` in
  12-hour locales.

## 7. Styles (`month-view.styles.tsx`)

`tv()` `slots`: `root` (`@container`), `header`, `caption`, `nav`, `frame`, `weekdays`, `weekday`,
`week`, `background`, `dayBg`, `dayNumber`, `event`, `eventDot`, `eventTime`, `bar`, `more`,
`morePopover`, `tile`, `skeleton`, `list`. Variants: `variant` (`grid`/`tiles`), `bar.continuesStart`
/ `continuesEnd`, `dayBg.outside` / `today` / `untracked`. Grid placement uses inline
`gridColumn`/`gridRow` styles (layout data, not class names); event colors go through `--sk-event`
custom properties.

## 8. Accessibility checklist

- [ ] `<section>` named by the caption (`aria-labelledby`); nav links named "Previous month" /
      "Next month"; current-month "Today" link `aria-disabled`.
- [ ] Each day is a list (`<ol>` in reading order) with a visually hidden full-date heading, so
      screen readers hear "Saturday, October 10: Relámpago TFT, 4 PM; …" in order. The visual grid
      is CSS on top of that order.
- [ ] Multi-day bars are announced once per week row, with their date range.
- [ ] Events with `href` are links whose name includes time and title; others are text.
- [ ] "+N more" names the count and the day ("2 more events on October 10").
- [ ] Today: `aria-current="date"` on its heading. Untracked days say "Not tracked".
- [ ] Event colors are never the only signal (title is always text); text ≥ 4.5:1 on bars in both
      themes.
- [ ] Loading: `aria-busy`; empty: the EmptyState is a `status`.

## 9. Tests

Server-rendered (`renderServer`) plus the client harness for hydration-free markup checks:
lane layout (multi-day across two weeks, three events + bar → "+2 more", `maxLanes`), timed events
bucketed by `timeZone` (an event at 23:30 Hermosillo lands on the right day; the same instant in
UTC lands on the next), week start per locale, `monthHref`/`dayHref` links, native popover markup
when no `dayHref`, `renderDay` + `isDateUntracked` (untracked never calls `renderDay`), `tiles`
variant, empty and loading states, `list` modes, RSC boundary (no `'use client'`), ref forwards,
className wins, axe both themes.

## 10. Stories

`TournamentSchedule` (Pitaya-style, es-MX), `DaysPlayed` (`tiles` + `renderDay` + untracked),
`BusyDay` (+N more popover), `MultiWeekBar`, `Empty`, `Loading`, `Narrow` (agenda list). Both
`data-theme` values.

## 11. Decisions

- Server component that navigates by links (Q41): schedules are read far more than they're
  navigated, and pages stay cacheable per month.
- Both layouts rendered and switched by a container query instead of measuring in JS.
- Native `popover` for "+N more" instead of a client island (D40).
- Budget target ≤ 4 kB gzip (it includes Agenda), measured +10% (P5).
