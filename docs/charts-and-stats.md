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

See `docs/roadmap.md` §D8 for status. Wave 2 (`@sukunagg/charts`) and wave 3 get their own specs
before code: `component-bar-chart.md`, `component-line-chart.md` (Line + Area),
`component-data-bar.md`, plus icons and Table `scroll` amendments in the same style as above.
