# Charts & stats — wave spec

Owner request "let's design components for graphs, stats" (2026-10-05). Decisions: `docs/questions.md`
Q31 (design, tokens) and Q32 (sukuna-gg-web review, revised waves, owner answers). Status board:
`docs/roadmap.md` §D8. Agent-made mechanics: `docs/ai-decisions.md` D36. Colors: `docs/tokens.md`
→ "Data visualization".

This file holds what is shared across the wave, plus the specs for **additions to existing
components** until they ship: an addition is merged into the component's own
`docs/component-<name>.md` in the PR that ships the code, so the generated agent docs
(`llms*.txt`) never advertise an unshipped prop. New components have their own specs:
`component-stat-tile.md`, `component-sparkline.md`, `component-empty-state.md`.

## 1. Where things live

| Package | Contents |
|---|---|
| `@sukunagg/ui` | tokens, `StatTile`, `Sparkline`, `EmptyState`, Input `reveal`, Badge `pulse` (wave 1); icons + Table `scroll` (wave 3) |
| `@sukunagg/charts` (new, wave 2) | `BarChart`, `LineChart`, `AreaChart`, `DataBar`, shared axis/legend/table view, `ChartTooltip` client island. Own SVG, `d3-scale` + `d3-shape` for math only. Reads `--sk-*` tokens: `@sukunagg/ui`'s `theme.css` is a peer (recommended in Q31, confirm when the package spec is written) |

## 2. Rules every component follows

These go into each spec's tests.

1. **Missing is not zero.** `null` renders "—" (or "–" in tight cells) plus a reason in the
   caption, tooltip or sr-only text. A real `0` is drawn as 0. Table views say "Not reported".
2. **Lines break at gaps.** Line/area marks stop at a `null` and resume after it; a note under the
   chart names the gap.
3. **Empty keeps the frame.** A chart with no data keeps its size and grid and shows
   `EmptyState size="sm"` in the plot area: what's missing, plus one action when one exists.
4. **Too little for a shape.** One point → a dot; an area needs `minPoints` (default 2) or shows a
   message; a Sparkline with no numbers renders "–".
5. **Loading matches the final size.** Skeleton at the finished size, `aria-busy`, pulse off under
   reduced motion.
6. **Screen readers hear the state.** The chart's summary label covers data, missing, empty and
   loading ("Placement distribution: no ranked games in the last 20").
7. **App colors are props.** Any mark color is a CSS value (`'var(--t-first)'`) set as a custom
   property and read by a literal utility. The library never builds a class name from it (rule 7).
   Text never wears a series color.

## 3. Additions to existing components

Wave 1 shipped these, so their specs moved into the component docs:

- **Badge `pulse`** → `docs/component-badge.md` (replaces sukuna-gg-web's `t-live` blink + ripple).
- **Input `reveal`** → `docs/component-input.md` (replaces sukuna-gg-web's `PasswordInput`).

Wave 3's additions (Table `scroll`) will be specced here first, then moved the same way.

## 4. Waves

See `docs/roadmap.md` §D8 for status. Wave 2 (`@sukunagg/charts`) specs: §5 below plus
`component-bar-chart.md`, `component-line-chart.md` (LineChart + AreaChart) and
`component-data-bar.md`. Wave 3 (icons, Table `scroll`) gets its specs before its code.

## 5. The `@sukunagg/charts` package (wave 2)

Owner: "Use your suggestions" (2026-10-05, Q33) → the package peers on `@sukunagg/ui`.

### 5.1 Layout and dependencies

```
packages/charts/                 # @sukunagg/charts, starts at 0.1.0
├── package.json                 # peer: react >=18, react-dom >=18, @sukunagg/ui (theme + EmptyState + Skeleton)
├── tsup.config.ts               # same per-file ESM/CJS/d.ts build as ui; d3 bundled (see below)
├── bunfig.toml                  # 90% coverage floor, like every package
├── .size-limit.json
└── src/
    ├── index.ts                 # BarChart, LineChart, AreaChart, DataBar + Props types
    ├── internal/                # shared, not exported: scale.ts, ticks.ts, frame.tsx (axes/grid/
    │                            # legend/table/empty/loading), interaction.tsx ('use client' island)
    └── components/<name>/       # the usual three files + test + stories per component
```

- **Peer on `@sukunagg/ui`**, not standalone like the video player: charts read the `--sk-*` tokens
  from `@sukunagg/ui/theme.css` and reuse `EmptyState` and `Skeleton`. An app using charts
  already uses the library.
- **Math:** `d3-shape` for line/area paths (`.defined()` gives null gaps; `curveMonotoneX`) and
  `d3-scale` for `scaleLinear` / `scaleBand` + nice ticks, as approved in Q31. Both are ESM-only
  and the packages support Node ≥ 18, which can't `require()` ESM, so the build **bundles** them
  (`noExternal: [/^d3-/]`) and the CJS output works. **Gate at scaffold time:** if tree-shaken
  `d3-scale` adds more than 4 kB brotli to BarChart (it imports d3-interpolate/format/time for
  features we don't use), stop and ask the owner before swapping it for in-house linear/band/
  nice-tick helpers (~60 lines, same algorithm).
- **CSS:** consumers add `@source "../node_modules/@sukunagg/charts/dist"` next to the ui one;
  `@sukunagg/charts/styles.css` is the precompiled fallback, as in ui.

### 5.2 Rendering model: server-rendered, sized by CSS

Every chart is a **server component**. Nothing measures the DOM, so the first paint is the final
layout at any width and there is no hydration shift. The same approach as `Sparkline`:

- The plot is a CSS grid: y-axis label column (`auto` width, sized by an invisible copy of the
  widest tick label) × plot area; x-axis label row under it.
- **Lines and areas** are one SVG per plot, `viewBox="0 0 100 100"` + `preserveAspectRatio="none"`
  with `vector-effect: non-scaling-stroke`, so lines stay 2px at any width.
- **Bars, dots, labels and gridlines are HTML**, positioned with percentages: rounded corners,
  2px gaps and text stay crisp instead of stretching with the SVG.
- **Tick thinning without measuring:** x labels beyond every other one carry
  `@max-md:hidden` (container query on the chart root), so narrow cards drop labels instead of
  overlapping them.

### 5.3 Shared props (every chart)

```ts
interface ChartSeries<Row> {
  key: keyof Row & string
  label: string
  /** Any CSS color. BarChart also takes a per-row function (one color per bar). */
  color?: string | ((row: Row, index: number) => string)
}

interface ChartBaseProps<Row> {
  data: readonly Row[]
  x: keyof Row & string                 // category / x key
  series: readonly ChartSeries<Row>[]   // colors default to --sk-chart-1…6 in order; a 7th+ is --sk-chart-other
  height?: number                       // plot height, px. Default 220
  valueFormat?: Intl.NumberFormatOptions | ((v: number) => string)
  xFormat?: (x: Row[keyof Row], index: number) => string
  locale?: string                       // default 'en-US' — same output on server and browser
  yTicks?: number                       // default 4
  legend?: 'auto' | false | readonly { label: string; color: string }[]  // auto = shown for ≥ 2 series
  empty?: { title: ReactNode; description?: ReactNode; action?: ReactNode; icon?: ReactNode }
  loading?: boolean
  interactive?: boolean                 // default true: hover/keyboard tooltip island
  table?: 'sr-only' | 'details' | 'none'  // default 'sr-only'; 'details' = native "Show as a table"
  summary?: string                      // replaces the generated screen-reader summary
  className?: string
}
// Plus exactly one of `aria-label` / `aria-labelledby` (enforced by the type).
```

### 5.4 States (rules from §2, made concrete)

| State | Rendering |
|---|---|
| data | marks + axes + legend |
| missing values | `null` → no mark; lines break (`gaps="shade"` shades the run and labels it "Not reported"); bar cap and tooltip say "–" / "Not reported" |
| empty (no numbers) | grid + x labels kept at full size, no y labels; `EmptyState size="sm"` centred in the plot from `empty` (default title "No data yet") |
| too few points | below `minPoints`, the empty state with "Not enough data for a chart" |
| loading | grid + one `Skeleton` block over the plot, `aria-busy="true"` on the figure |

### 5.5 Interaction island (`internal/interaction.tsx`, `'use client'`)

The chart computes everything on the server and passes the island only strings and numbers
(serializable across the RSC boundary): x positions (%), y positions per series (%), and each
point's tooltip title + rows (label, formatted value, color). The island renders an overlay on
the plot:

- **Pointer:** nearest index by x; line charts get a crosshair + ringed dots, bar charts a band
  highlight; the tooltip flips sides past 60% of the width.
- **Keyboard:** the overlay is one tab stop (`role="group"`, `aria-roledescription="chart"`,
  named by the chart's label + "use the arrow keys"). ←/→ (↑/↓ for horizontal bars) move,
  Home/End jump, Escape hides. A polite live region reads the focused point.
- `interactive={false}` renders no island: zero chart JS on the page.

### 5.6 Accessibility

`<figure>` named by `aria-label`/`aria-labelledby`; marks are `aria-hidden`; a generated summary
("Placement distribution: 1st 4, 2nd 3, …") is the figure's description; the table view always
exists (`sr-only` by default) and says "Not reported" for nulls. Legend whenever there are ≥ 2
series; text never wears a series color. Marks ≥ 3:1 with the default tokens.

### 5.7 Build, docs, tests

- **Docs generator:** `scripts/build-docs.ts` also reads `packages/charts/src/index.ts`, so chart
  specs generate `docs/llms/*.md` and README rows (labelled `@sukunagg/charts`). Until then the
  generator skips chart specs, as it does any unshipped spec.
- **Storybook / showcase:** stories titled `Charts/<Name>`; both pick them up from the existing
  `packages/*` globs.
- **Tests:** unit (server render, scales and ticks, gaps, every state, color props, summaries,
  axe both themes, ≥ 90% per component) + **Playwright browser tests** for the island (hover shows
  the tooltip, arrow keys, Escape, focus ring).
- **Size budgets (brotli, react + ui excluded):** BarChart ≤ 6 kB, LineChart/AreaChart ≤ 7 kB
  (with d3-shape), DataBar ≤ 1.5 kB, the island ≤ 2.5 kB.
- **Release:** a changeset for `@sukunagg/charts` (new package → 0.1.0); the owner publishes.

### 5.8 What it replaces in sukuna-gg-web (Q32 review)

| App code | Replacement |
|---|---|
| `components/tft/PlacementHistogram.tsx` (+ `t-hist*` CSS) | `BarChart` with per-bar `color` (`var(--t-first)` / `--t-top4` / `--t-bot`), `valueLabels`, `table="details"` |
| `components/lol/Timeline.tsx` `GoldGraph` (+ `l-graph*` CSS) | `AreaChart baseline={0} symmetric above="var(--l-blue)" below="var(--l-red)"` |
| Stats page `TODO(lane B)` "Placement over time" | `LineChart reverse yDomain={[1, 8]} pointColor band={{ from: 1, to: 4, label: 'Top 4' }}` |
| Scoreboard `l-dmg` bar | `DataBar value max color="var(--l-blue)"` |
