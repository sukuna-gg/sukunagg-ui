---
"@sukunagg/ui": patch
---

Calendars (Q41): six new components and the date utilities under them. `Calendar` is a WAI-ARIA
date grid for one day or a range, in one or two months, with year and month pickers, marks, reasons
on disabled days, CLDR week starts and Intl names; values are `'YYYY-MM-DD'` strings, so a day
never shifts with the time zone, and the server renders without guessing today. `DatePicker` is a
typed date field (the locale's order, ISO, or 8 digits) with the calendar in a popover and a hidden
ISO input for forms. `DateRangePicker` adds presets ("Last 7 days"…), two months and Apply/Cancel.
`DateTimePicker` picks a day and a time in a fixed IANA time zone and returns the ISO instant,
handling daylight-saving gaps and overlaps with `Intl` (no Temporal polyfill). `MonthView` (server
component) shows a month of events with multi-day bars, "+N more" (native popover), custom day
cells (`renderDay`), "not tracked" days, and links for navigation; below 600px it becomes an
`Agenda`, the list of upcoming events grouped by day, also exported on its own. New CSS in
`theme.css`: the `sk-calendar-next/-prev/-zoom` keyframes and `animate-calendar-*` utilities. No new
tokens and no new dependencies. Adding components is a patch on `0.x` (`docs/releasing.md`).
