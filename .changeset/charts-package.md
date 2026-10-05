---
"@sukunagg/charts": minor
---

New package: `@sukunagg/charts` — `BarChart` (grouped / stacked / horizontal, per-bar colors, value
labels), `LineChart` and `AreaChart` (gaps for missing data, reversed axes, bands, reference lines,
per-point colors, diverging fills around a baseline) and `DataBar` (a bar in a table cell). Server
components sized by CSS, with a ~1 kB client island for hover and keyboard tooltips; plus
`DonutChart` (3 parts + Other), `RadialGauge` (a 270° meter) and `Heatmap` (a calendar that tells
"not tracked" from 0), all three with no client JS; empty,
loading and table views built in. Peers on `@sukunagg/ui` (0.11+) for tokens, `EmptyState` and
`Skeleton`. First release = 0.1.0.
