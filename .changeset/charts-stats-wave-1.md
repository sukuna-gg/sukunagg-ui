---
"@sukunagg/ui": minor
---

Charts & stats wave 1. New components: `StatTile` (label, value, caption, threshold `tone` or any
`valueColor`, optional ▲▼ `delta` and `trend`; `null` shows "—", never 0), `Sparkline` (`line`,
`area`, `bar`, `winloss`; server-rendered, stretches to its container with no client JS, `null`
breaks the line) and `EmptyState` (title, icon, body, actions; `size="sm"` for inside charts).
New props: `Input` `reveal` + `revealLabels` (Show/Hide toggle on password fields; only these load
client JS) and `Badge` `pulse` (animated live dot, still under reduced motion). New tokens:
`--sk-danger`, `--sk-chart-1…6`, `--sk-chart-other`, `--sk-heat-1…4` (+ Tailwind utilities such as
`bg-chart-1`, `text-danger`). Adds components, props and tokens = minor.
