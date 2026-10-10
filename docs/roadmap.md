# Roadmap — `sukuna-ui` from first commit to npm

> **This file is a living status board.** Agents update it in the same commit as the work it describes: flip a box when a gate passes, never before. If this file and the code disagree, the code is the truth and this file is a bug to fix immediately.
>
> Legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[-]` dropped (say why)

Last updated: 2026-10-10 — toolkit wave A built (§D11, Q42): Kbd, Prose, Timeline shipped in code, waiting on the owner's visual pass; waves B and C and the calendars (§D10) wait on spec approval. 73 components.
Current phase: **Phase 8 (remix example left) + Phase 9 (CI enforcement jobs left).** Phases 0–7 done; the library is on npm.
Current version on npm: `@sukunagg/ui` **0.11.1**, `@sukunagg/fx` **0.1.0**, `@sukunagg/charts` **0.1.0**, `@sukunagg/video` **0.1.0** (Version Packages PR #32). Next: the Q43 release (toolkit + calendars), published through the Changesets flow on the owner's instruction.

---

## A. Phase gates (from `plan-agentic.md`)

| # | Phase | Status | Gate | Evidence (link/commit) |
|---|---|---|---|---|
| 0 | Repo bootstrap | [x] | `bun run build` + `check:pkg` pass on empty entry; `CLAUDE.md`, PR template exist | local: `build`→ESM/CJS/d.ts/d.cts; `check:pkg` (publint --strict + attw) exit 0; `check` (biome+tsc) exit 0 |
| 1 | Tokens | [x] | `tokens:build` deterministic; Tokens story shows both themes | `tokens:build` byte-identical on re-run ✓; `src/tokens.ts` → `src/styles/tokens.css` (+ reset.css, index.css); `Design/Tokens` MDX renders every `--sk-*` dark+light. Light shadow proposed — Q12 |
| 2 | Storybook + test harness | [x] | Storybook opens with theme toolbar; `bun test` runs; 90% threshold proven to fail | SB10 react-vite builds; theme toolbar + SideBySide decorators; a11y+docs addons; Sukuna manager theme. `bun test` 3 pass; scalar 90% floor proven to fail (object form silently ignored by Bun — testing.md). Tailwind/theme.css deferred to Phase 3 per plan; Intro.mdx deferred to README (Phase 9) |
| 3 | Styling primitives | [x] | `theme.css`, `cn`, `tv` wrappers; `docs/styling.md`; `css:build` emits fallback CSS | Tailwind v4 + tv installed; generator emits `theme.css` (@theme inline + gradient utility); `cn`/`tv`/`tw-merge-config` (utils 100% cov); `css:build` → `dist/{styles,theme,tokens}.css`; Storybook on Tailwind; `docs/styling.md`. RSC-safe styling test passes. Spacing kept default — D10 |
| 4 | Static components | [x] | Text, Badge, Card all `[x]` in section B | All three shipped, exported, 100% cov each, axe both themes, stories build |
| 5 | Native interactive | [x] | Button, Input, Checkbox, Switch all `[x]` in section B | All four shipped, exported, 100% cov each; keyboard + a11y in tests; React 18 matrix green (68 tests) |
| 6 | Headless-backed | [x] | Tooltip, Dialog, Select all `[x]` in section B | All three on Base UI rc.0; unit 100% cov each; 5 Playwright browser tests stable (hover/focus-trap/Escape/outside-click/select) |
| 7 | Tree-shaking + size | [x] | `Button` alone < 3 kB gz; `size-limit` in CI | `bun run size`: Button (deps external) **804 B** < 3 kB; Button+deps 11.9 kB < 14 kB proves no Base UI leak. `.size-limit.json` + `size` script. (agadoo skipped — bare rollup can't resolve extensionless imports, unlike real bundlers; D14) |
| 8 | Consumer matrix | [~] | vite-react18, vite-react19, next-app-router, remix all build with zero hydration warnings | vite-react19, vite-react18, next-app-router build via `bun link`. Next prerenders (RSC boundary validated) and the **runtime hydration smoke passes — zero hydration warnings** (`scripts/hydration-smoke.mjs`, wired into CI). **Remaining:** remix example |
| 9 | Release | [~] | CI green incl. enforcement jobs; Version Packages PR reviewed; owner said "publish" | **Done:** README.md, docs/releasing.md (breaking-change table), base CI workflow (check/test/build/check:pkg/size/react18/browser/examples), initial changeset (minor → 0.1.0). **Remaining:** CI enforcement jobs (api/visual/token/peer diff), Version Packages PR, **owner "publish"** + tag. Agents never publish. |

---

## B. Component checklist

One row block per component. A component is done only when every box is `[x]`. Order within a component is fixed: doc → styles → logic → index → tests → stories → browser tests (if applicable) → exported → coverage → reviewed.

### Column definitions

| Column | Means |
|---|---|
| Doc | `docs/component-<name>.md` exists, follows the Button template, approved by owner |
| Styles | `<name>.styles.tsx`: `tv()` map, static class strings, every color/radius via `@theme` tokens, no raw hex |
| Logic | `<name>.logic.tsx`: `forwardRef`, native props extended, `'use client'` only if stateful, no DOM at module scope |
| Index | `index.tsx` re-exports component + `Props` type |
| Tests | `<name>.test.tsx` covers the 8 required cases in `docs/testing.md` |
| Stories | `<name>.stories.tsx` has every story named in the doc's Section 10, autodocs on |
| Browser | `test/browser/<name>.test.ts` (only headless-backed components; `n/a` otherwise) |
| Export | Listed in `src/index.ts`; `check:pkg` clean |
| ≥90% | Coverage on the component's own files, verified with `bun test src/components/<name> --coverage` |
| Review | Owner reviewed the Storybook in both themes and approved |

### Static

_`*` in Review = self-approved during the non-stop build (see `docs/ai-decisions.md` D7); awaiting
owner's visual pass._

| Component | Doc | Styles | Logic | Index | Tests | Stories | Browser | Export | ≥90% | Review |
|---|---|---|---|---|---|---|---|---|---|---|
| Text | [x] | [x] | [x] | [x] | [x] | [x] | n/a | [x] | [x] | [x]* |
| Badge | [x] | [x] | [x] | [x] | [x] | [x] | n/a | [x] | [x] | [x]* |
| Card | [x] | [x] | [x] | [x] | [x] | [x] | n/a | [x] | [x] | [x]* |

### Native interactive

| Component | Doc | Styles | Logic | Index | Tests | Stories | Browser | Export | ≥90% | Review |
|---|---|---|---|---|---|---|---|---|---|---|
| Button | [x] | [x] | [x] | [x] | [x] | [x] | n/a | [x] | [x] | [x]* |
| Input | [x] | [x] | [x] | [x] | [x] | [x] | n/a | [x] | [x] | [x]* |
| Checkbox | [x] | [x] | [x] | [x] | [x] | [x] | n/a | [x] | [x] | [x]* |
| Switch | [x] | [x] | [x] | [x] | [x] | [x] | n/a | [x] | [x] | [x]* |

### Headless-backed

| Component | Doc | Styles | Logic | Index | Tests | Stories | Browser | Export | ≥90% | Review |
|---|---|---|---|---|---|---|---|---|---|---|
| Tooltip | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x]* |
| Dialog | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x]* |
| Select | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x]* |

### Shared internals

| Item | Status | Notes |
|---|---|---|
| `src/hooks/useControllableState` | [x] | `src/hooks/use-controllable-state.ts`, 100% cov (Phase 5) |
| `src/utils/cn.ts` | [x] | `extendTailwindMerge` via shared `tw-merge-config` (Phase 3) |
| `src/utils/tv.ts` | [x] | `createTV` with same merge config (Phase 3) |
| `src/styles/theme.css` | [x] | Generated `@theme inline` + `[data-theme]` palettes + gradient utility (Phase 3) |
| `src/styles/fallback.css` → `dist/styles.css` | [x] | `css:build` compiles it; also copies theme.css/tokens.css (Phase 3) |
| `test/setup.ts`, `test/ssr.ts`, `test/axe.ts` | [x] | Phase 2; happy-dom + jest-dom/axe + SSR/hydration helpers |
| `playwright.config.ts` + `scripts/serve-storybook.ts` | [x] | Browser suite under @playwright/test/Node (D16) — Phase 6 |
| `scripts/with-react.ts` | [x] | `test:react18` swaps React, runs tests, restores (Phase 5) |
| `CLAUDE.md` / `AGENTS.md` | [x] | Rules §3 + breaking-change table + docs map (Phase 0) |
| `.github/PULL_REQUEST_TEMPLATE.md` | [x] | Changeset/bump/docs/roadmap checklist (Phase 0) |

---

## C. Release checklist (`0.1.0`)

> Historical: the first publish shipped as `@sukunagg/ui` 0.10.0 + `@sukunagg/video` 0.1.0 from
> the owner's machine (Q29). The open boxes are still the gate for CI-driven (Changesets) releases.

- [x] All ten components `[x]` in section B
- [x] `bun run check && bun run test:coverage && bun run build && bun run check:pkg && bun run size` green locally
- [x] `bun run test:react18` green
- [x] `bun run storybook:build && bun run test:browser` green
- [~] Consumer matrix (Phase 8) green — vite-react19 builds; 3 frameworks + hydration smoke remain
- [ ] CI enforcement jobs live: `changeset-bot`, `api-diff`, `visual-diff`, `token-diff`, `peer-diff` — base CI live; enforcement jobs remain
- [x] `docs/releasing.md` exists with the breaking-change table
- [x] `README.md`: install, two-line Tailwind setup, fallback CSS, `data-theme`, RSC notes, React 18/19 support
- [ ] `CHANGELOG.md` generated by Changesets (on first `changeset version`)
- [ ] `npm publish --dry-run` output reviewed: only `dist/`, `README.md`, `LICENSE`, `package.json`, `CHANGELOG.md`
- [ ] Owner has explicitly said **"publish"** in writing
- [ ] Tag `v0.1.0` created by owner
- [ ] Published; Storybook deployed to GitHub Pages

---

## D. v1.1 — new components (scheduled)

Gap analysis vs. Material UI (2026-09-16). Same contract as v1: docs-first, three-file split,
≥90% coverage, axe, stories, `bun link` example still builds. Base UI (already a dep) backs the
interactive ones. Each shipped component is a **minor** bump (adds API); pre-1.0 that's still `0.x`.

Order within a component: doc → styles → logic → index → tests → stories → (browser if headless) →
export → ≥90% → review.

**Status: v1.1 COMPLETE — Tier 1 (8/8), Tier 2 (4/4), Tier 3 (7/7). 29 components total. 187 unit + 13 browser tests, 100% coverage. `0.2.0` published; the rest queued for the next release.**

### Tier 1 — high-value, common

| Component | Kind | Backing | Status |
|---|---|---|---|
| Divider | static | — | [x] 100% cov |
| Alert | static | — | [x] 100% cov |
| Chip | static (+ optional dismiss) | — | [x] 100% cov |
| Avatar | static/img fallback | Base UI `avatar` | [x] 100% cov |
| Spinner | static (CSS) | — | [x] 100% cov |
| RadioGroup | interactive | Base UI `radio-group` | [x] 100% cov + browser |
| Tabs | interactive | Base UI `tabs` | [x] 100% cov + browser |
| Accordion | interactive | Base UI `accordion` | [x] 100% cov + browser |

### Tier 2 — common, a bit heavier

| Component | Kind | Backing | Status |
|---|---|---|---|
| Menu (dropdown) | interactive | Base UI `menu` | [x] 100% cov + browser |
| Toast | interactive (provider/queue) | Base UI `toast` | [x] 100% cov + browser |
| Progress (bar) | static/indeterminate | Base UI `progress` | [x] 100% cov |
| Skeleton | static | — | [x] 100% cov |

### Tier 3 — niche / later

| Component | Kind | Backing | Status |
|---|---|---|---|
| Breadcrumbs | static | — | [x] 100% cov |
| Slider | interactive | Base UI `slider` | [x] 100% cov + browser |
| Pagination | static (controlled) | — | [x] 100% cov |
| Drawer | interactive | Base UI `dialog` (side) | [x] 100% cov + browser |
| Stepper | static/interactive | — | [x] 100% cov |
| Combobox | interactive | Base UI `autocomplete` | [x] 100% cov + browser |
| Table | static | — | [x] 100% cov |

Out of scope for now: layout primitives (Box/Grid/Stack), an icon set, low-level utils
(Modal/Popover/Popper — used internally via Base UI).

## D2. Post-1.0 backlog (not scheduled)

- [ ] Polymorphic `as` / `asChild` for Button → Link
- [ ] Monorepo split (`@sukuna/tokens`, `@sukuna/icons`) if demand appears
- [ ] `premium` surface variants on Card
- [ ] RTL audit

## D3. v1.2 — Base UI coverage wave (design docs first)

Gap analysis vs. shadcn/ui, Radix, MUI, Mantine, Chakra (2026-09-21). Five components Base UI
(already a dep) ships but we hadn't wrapped — zero new dependencies, same contract as v1/v1.1
(docs-first, three-file split, ≥90% cov, axe, stories, browser test where headless). No new tokens
(all reuse existing surface/line/text tokens). Each is a **minor** bump; pre-1.0 that's still `0.x`.

Order within a component: doc → styles → logic → index → tests → stories → (browser if headless) →
export → ≥90% → review.

**Status: v1.2 SHIPPED (code) — 5/5 built, exported, 100% cov each, `check`/`build`/`check:pkg`
green. 313 unit tests total. Browser tests added (run under built Storybook). 39 components total.**

| Component | Kind | Backing | Doc | Code |
|---|---|---|---|---|
| NumberField | interactive | Base UI `number-field` | [x] | [x] 100% cov + browser |
| ToggleGroup (+ Toggle) | interactive | Base UI `toggle-group` + `toggle` | [x] | [x] 100% cov + browser |
| HoverCard | interactive | Base UI `preview-card` | [x] | [x] 100% cov + browser |
| ScrollArea | interactive | Base UI `scroll-area` | [x] | [x] 100% cov + browser |
| ContextMenu | interactive | Base UI `context-menu` (reuses `MenuItemOption`) | [x] | [x] 100% cov + browser |

Considered and held for owner: **Popover** (biggest cross-library gap, but roadmap §D lists
Modal/Popover/Popper as out of scope — needs an explicit decision to reverse). Cheaper alternates
if breadth is preferred over these: Collapsible, Meter, Kbd, AspectRatio.

## D4. v1.3 — components, variants & performance wave

Owner analysis request + "document these and go for it" (2026-09-27, `docs/questions.md` Q15).
Popover is brought **into scope** by that approval (reverses the §D "out of scope" note).
All four headless components are Base UI parts we already ship; Textarea is native. No new tokens
(`danger`/`warning` tones stay out — Q10 still stands, see D33).

### Performance (land first, so the new components build on them)

| # | Item | Status | Evidence |
|---|---|---|---|
| P1 | Base UI `@base-ui-components/react@1.0.0-rc.0` → stable renamed `@base-ui/react@^1.8.0` | [x] | 313 unit + 30 browser green; ScrollArea `keepMounted` keeps rc layout; Select+deps 48.4→45.7 kB |
| P2 | Button → server component (no hooks → drop `'use client'`) + RSC-boundary guard test | [x] | `src/index.test.ts` "RSC boundary" (hook-free file may not be client; hook-using must be) |
| P3 | Counter: paint frames via ref (zero re-renders) + `startOnView` | [x] | Profiler test asserts 0 commits during animation; 100% cov |
| P4 | Virtualize Select/Combobox/Table | [-] | Deferred by owner (Q17): no slow-list reports, Combobox already caps results; revisit for a real large Table (hand-rolled fixed-height first, then `@tanstack/react-virtual`) |
| P5 | `size-limit` budget for every component | [x] | 40 entries; statics ≤2 kB (no Base UI leak), headless = measured +10% |

### New components

Order within a component: doc → styles → logic → index → tests → stories → (browser if headless) →
export → ≥90% → review.

| Component | Kind | Backing | Doc | Code |
|---|---|---|---|---|
| Popover | interactive | Base UI `popover` | [x] | [x] 100% cov + browser |
| AlertDialog | interactive | Base UI `alert-dialog` | [x] | [x] 100% cov + browser |
| Textarea | native (server) | `<textarea>` | [x] | [x] 100% cov |
| Collapsible | interactive | Base UI `collapsible` | [x] | [x] 100% cov + browser |
| Meter | static | Base UI `meter` | [x] | [x] 100% cov |

### Variants on existing components (no new tokens)

| Component | Addition | Status |
|---|---|---|
| Button | `variant: 'outline' \| 'link'`, `iconOnly` (square) | [x] |
| Badge | `dot` (leading status dot) | [-] already shipped (analysis missed it) |
| Alert | `onDismiss` (renders a close button; stays a server component) | [x] |
| Card | `interactive` (hover lift + focus ring for clickable cards) | [x] |
| Progress / Spinner | `tone: 'accent' \| 'success' \| 'premium'` (+ `current` on Spinner) | [x] |
| Avatar | `shape: 'circle' \| 'square'` | [x] |
| Menu / ContextMenu | `MenuItemOption.icon` (leading, aria-hidden) | [x] |
| Table + new RowActions | actions column: `Table.ActionsHeaderCell`/`ActionsCell` + `RowActions` (⋯ menu, icon options) — owner request 2026-09-27 (Q18) | [x] 100% cov + browser; Table still 0.56 kB static |
| Tabs | `orientation: 'vertical'` — navigation column beside the panel (owner request, Q19) | [x] |
| Accordion | fix: disabled items were never dimmed (`data-[disabled]`, found building Collapsible) | [x] |

## D5. v1.3 motion wave

Spec: `docs/motion.md` (owner request Q20). CSS-only, zero bundle cost, reduced-motion fallbacks.

| # | Item | Status |
|---|---|---|
| M0 | Tokens `--sk-duration-slow`, `--sk-ease-spring` + `animate-indeterminate` keyframe | [x] |
| M1 | Tabs sliding indicator (horizontal + vertical) | [x] |
| M2 | Accordion height animation | [x] |
| M3 | Directional popup entrance (Menu, ContextMenu, Select, Combobox, Popover, Tooltip, HoverCard) | [x] |
| M4 | Toast stacked deck + expand on hover + swipe to dismiss | [x] |
| M5 | Meter/Progress grow-in + indeterminate sliding bar | [x] |
| M6 | Fix: scale/translate never transitioned (`transition-[…transform]`) in 11 components | [x] |
| M7 | Fix: indeterminate Progress kept animating under reduced motion (`data-[…]` outranked `motion-reduce:`) | [x] |

## D6. VideoPlayer (Q21–Q23)

Spec: `docs/component-video-player.md` (Nuevo parity in three tiers, waves W1–W4 in Appendix B).
Client component over native `<video>`, in-house seek/volume/menu, no new dependencies. Approved in
Q23; Review column waits on the owner's visual pass.

| Component | Doc | Styles | Logic | Index | Tests | Stories | Browser | Export | ≥90% | Review |
|---|---|---|---|---|---|---|---|---|---|---|
| VideoPlayer (W1 core) | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [ ] |

| Wave | Scope (spec Appendix B) | Status |
|---|---|---|
| W1 | Core + chapters + thumbnails + settings (quality/speed/captions/style) + touch + context menu + hotkeys + `useVideoPlayer` | [x] |
| W2 | Panel (chapters/playlist/transcript), Playlist, UpNext, EndScreen, Share, Skip, resume, startTime, syncGroup, theater, floating | [x] |
| W3 | Picture tools, snapshot, download, loop section, sleep timer, watch limit, live UI, overlays, audio + visualizer | [x] (ticker overlay waits on Q25) |
| W4 | Adapters, one dependency approval each: hls.js → dash.js → IMA/VAST → Cast → VR | [~] engine seam + hls.js done; rest wait on Q26 |

## D7. Theming — multiple themes + app config (designed, not built)

Spec: `docs/theming.md` (owner request Q24: Midnight + Paper, TS config + CLI, `system` mode).

| # | Item | Status |
|---|---|---|
| T1 | `src/themes/*` registry (dark, light, midnight, paper) + resolver + shared contrast module | [ ] |
| T2 | Generator: resolved block per theme + `color-scheme` + `system` media block | [ ] |
| T3 | Contrast gate over every built-in theme | [ ] |
| T4 | `sukuna-ui/themes` subpath: `defineThemes` + types + built-in data | [ ] |
| T5 | `sukuna-ui` bin: `themes init` (create-if-missing) + `themes build` (CSS + AA warnings, `--strict`) | [ ] |
| T6 | Storybook toolbar + showcase picker + docs (tokens.md, README) | [ ] |
| T7 | Browser tests: midnight/paper render; `system` follows emulated color scheme | [ ] |

## D8. Charts & stats (Q31, Q32)

Owner request "let's design components for graphs, stats" (2026-10-05). Designed from a mockup the
owner approved, then revised against sukuna-gg-web's real screens (Q32). Tokens approved in
`docs/tokens.md` → "Data visualization" + `--sk-danger`. Charts take app colors as props; every
component follows the missing-data rules (null = "—" + reason, lines break at gaps, empty keeps
the frame, loading matches the final size; full list in `docs/charts-and-stats.md`). Same contract as v1: docs-first, three-file split,
≥90% cov, axe, stories.

### Wave 1 — `@sukunagg/ui`

Specs approved by the owner ("lets start working on it", 2026-10-05). Review = owner's visual pass
in Storybook: "lgtm ship it" (2026-10-05, Q34).

| Item | Kind | Doc | Code | Review |
|---|---|---|---|---|
| Tokens: `--sk-chart-1…6`, `--sk-chart-other`, `--sk-heat-1…4`, `--sk-danger` (+ theme.css utilities, contrast test) | tokens | [x] tokens.md | [x] `tokens.ts` → `tokens.css`/`theme.css`; contrast gate +3 tests (all themes pass); kept out of the video bridge | n/a |
| StatTile | static (server) | [x] | [x] 15 tests, 100% cov, 2.67 kB (budget 3 kB, includes Sparkline) | [x] |
| Sparkline | static (server, CSS-sized SVG) | [x] | [x] 21 tests, 100% cov, 1.68 kB | [x] |
| EmptyState | static (server) | [x] | [x] 10 tests, 100% cov, 0.60 kB | [x] |
| Input `reveal` (client file `input.reveal.tsx`) | variant | [x] component-input.md | [x] +6 tests, 100% cov; plain Input still server-only, 0.86 kB | [x] |
| Badge `pulse` | variant | [x] component-badge.md | [x] +1 test, 100% cov | [x] |

### Wave 2 — new `@sukunagg/charts` package

| Item | Replaces in sukuna-gg-web | Doc | Code |
|---|---|---|---|
| Package scaffold (workspace, tsup, size-limit, docs:build, peer `@sukunagg/ui` theme) | — | [x] `charts-and-stats.md` §5 | [x] `packages/charts`, publint + attw green, `styles.css` fallback, generator + showcase know it |
| Shared parts: axis, grid, legend, table view, `ChartTooltip` client island, plot-area EmptyState | — | [x] §5.2–5.6 | [x] frame + island 100% cov; island 1.18 kB |
| BarChart (grouped/stacked/horizontal, per-bar `color`, value labels) | `PlacementHistogram` | [x] | [x] 19 tests + 2 browser, 100% cov, 4.6 kB |
| LineChart / AreaChart (`baseline` + above/below fill, `reverse`, `band`, `null` gaps, `minPoints`) | `GoldGraph`, TODO "Placement over time" | [x] (+ `yTickValues`, D37) | [x] 13 tests + 1 browser, 100% lines, 5.7 kB |
| DataBar (bar in a table cell) | Scoreboard damage bar | [x] | [x] 8 tests, 100% cov, 0.78 kB |

### Wave 3 — `@sukunagg/ui`

| Item | Doc | Code |
|---|---|---|
| Icon set (17 icons from the main entry, per-icon tree-shaking — spec §11 explains no subpath) | [x] component-icon.md | [x] 11 tests, 100% cov, one icon 481 B |
| Table `scroll` (sideways scroll, focusable only while overflowing) | [x] component-table.md | [x] client file `table.scroll.tsx`, +2 tests, 100% cov; Table 949 B |

### Later trio — built on request (Q33 "build the rest non-stop")

| Item | Doc | Code |
|---|---|---|
| DonutChart (3 colors + Other, native `<title>` tooltips, no JS) | [x] component-donut-chart.md | [x] 7 tests, 100% cov, 3.02 kB |
| RadialGauge (270° meter; `null` is a described image, never a meter at 0) | [x] component-radial-gauge.md | [x] 6 tests, 100% cov, 1.23 kB |
| Heatmap (UTC calendar, "not tracked" ≠ 0, month labels skip crowded partial months) | [x] component-heatmap.md | [x] 7 tests, 100% cov, 3.19 kB |

---

## D9. Showpieces & FX (Q38, Q39)

Owner request "really cool thing with animations / particles" (2026-10-07, Q38); 14 prototypes
approved with "holy shit, let's build the components" (Q39). Same contract as v1: docs-first,
three-file split, ≥90% cov, axe, stories, a browser spec each; every motion has a reduced-motion
state. Motion carve-out: `docs/motion.md` "Showpieces"; agent calls: D38.

### Wave 1 — CSS-only showpieces in `@sukunagg/ui` (branch `feat/ui-showpieces`)

| Item | Kind | Doc | Code | Review |
|---|---|---|---|---|
| Motion layer: one `scripts/motion/<name>.ts` module per component → `theme.css` (44 keyframes; 57 kB, 12.8 kB gzip) | motion | [x] motion.md | [x] | n/a |
| RetroGrid | static (server, CSS) | [x] | [x] 13 tests, 100% cov, 1.04 kB | [x] |
| BorderBeam | static (server, CSS) | [x] | [x] 16 tests, 100% cov, 0.84 kB | [x] |
| RankReveal | static (server, CSS) | [x] | [x] 18 tests, 100% cov, 2.69 kB; 30/30 browser (3 engines) | [x] |
| MatchFound | static (server, CSS countdown) | [x] | [x] 22 tests, 100% cov, 3.34 kB | [x] |
| LootReveal | static (server, CSS) | [x] | [x] 22 tests, 100% cov, 2.79 kB | [x] |
| XpLevelUp | static (server, CSS counter) | [x] | [x] 25 tests, 100% cov, 2.57 kB | [x] |
| AvatarFrame | static (server, CSS) | [x] | [x] 21 tests, 100% cov, 1.46 kB | [x] |
| ScrambleText (client file `scramble-text.scramble.tsx`) | static + client island | [x] | [x] 30 tests, 100% cov, 2.33 kB (budget 2.5 kB) | [x] |
| GlitchText | static (server, CSS) | [x] | [x] 9 tests, 100% cov, 0.69 kB | [x] |

### Wave 2 — new `@sukunagg/fx` package (branch `feat/fx-package`, stacked on wave 1)

| Item | Engine | Doc | Code | Review |
|---|---|---|---|---|
| Package scaffold (workspace, tsup, size-limit, docs:build, Storybook `FX` section, showcase) | — | [x] `packages/fx/README.md`, `BUILDERS.md` | [x] publint + attw green, generator + showcase know it | n/a |
| Shared loop (CSS poster, IO + visibilitychange pause, DPR cap, context loss, StrictMode, reduced-motion still frame) | — | [x] D39 | [x] 100% cov; 1.59 kB canvas / 1.08 kB DOM; Chromium live-reduce fix verified | n/a |
| ParticleField | Canvas2D | [x] | [x] 47 tests, 100% cov, 4.51 kB | [x] |
| HoloCard | pointer + CSS | [x] | [x] 24 tests, 100% cov, 2.65 kB | [x] flat at rest: DECISION(open) |
| FlowField | Canvas2D | [x] | [x] 41 tests, 100% cov, 4.61 kB (budget 4.75 kB, D39) | [x] |
| Lightning | WebGL1 | [x] | [x] 27 tests, 100% cov, 5.44 kB | [x] |
| BracketBeam | SVG + layout | [x] | [x] 49 tests, 100% cov, 7.69 kB | [x] |

## D10. Calendars & date pickers (Q41)

Owner request "calendars can we design somes" (2026-10-09); live mockup
(https://claude.ai/artifact/U3NkqPTW8GUzAnKRhcxTBE) approved with "lgtm", with its four
recommendations: everything in `@sukunagg/ui`, one typed text box (segmented `DateField` later),
Intl time-zone math (no Temporal polyfill), waves below. No new dependencies, no new tokens (three
motion keyframes only). Same contract as v1: docs-first, three-file split, ≥90% cov, axe, stories,
a browser spec for each client component. Agent calls: D40.

Specs approved with the rest of the backlog in Q43 ("keep going non stop until its published").

### Shared internals

| Item | Status |
|---|---|
| `utils/date/calendar-date.ts` — `'YYYY-MM-DD'` math + `monthMatrix` | [ ] |
| `utils/date/locale.ts` — CLDR week start, names, typed-date parse/format | [ ] |
| `utils/date/zone.ts` — IANA wall ⇄ instant via Intl (DST gap/overlap) | [ ] |
| `scripts/motion/calendar.ts` — `sk-cal-next` / `sk-cal-prev` / `sk-cal-zoom` | [ ] |

### Wave 1 — pickers

| Item | Kind | Doc | Code | Review |
|---|---|---|---|---|
| Calendar | client, in-house grid | [x] component-calendar.md | [ ] | [ ] |
| DatePicker | client, Base UI `popover` | [x] component-date-picker.md | [ ] | [ ] |
| DateRangePicker | client, Base UI `popover` | [x] component-date-range-picker.md | [ ] | [ ] |

### Wave 1b — date and time

| Item | Kind | Doc | Code | Review |
|---|---|---|---|---|
| DateTimePicker | client, Base UI `popover` | [x] component-date-time-picker.md | [ ] | [ ] |

### Wave 2 — schedules

| Item | Kind | Doc | Code | Review |
|---|---|---|---|---|
| MonthView | server component | [x] component-month-view.md | [ ] | [ ] |
| Agenda | server component | [x] component-agenda.md | [ ] | [ ] |

### Later (not specced)

WeekView (hour grid for tournament days) and a segmented `DateField`, when a page needs them.

## D11. Toolkit wave (Q42)

Owner asked "what other components can we add?", picked seven from the shortlist ("I like these
ideas"), and approved the mockup's recommendations (https://claude.ai/artifact/At75qRavdfveJfo7x3vPPb):
palette filtering built in + optional `onSearch`; Prose styles only; an opt-in `resizeImage`;
double elimination with explicit match links; waves A → B → C. No new dependencies, no new color
tokens. Agent calls: D41. Waves B and C approved in Q43.
Wave A approved and built ("lgtm", 2026-10-10); Review = the owner's visual pass in Storybook.

### Shared additions

| Item | Status |
|---|---|
| Icons `CameraIcon`, `UploadIcon`, `ImageIcon` (component-icon.md) | [x] 20 icons, one icon 481 B |
| Motion: `sk-poll-bar` (`scripts/motion/poll.ts`). Timeline needed none: its halo uses Tailwind's built-in `animate-pulse` | [x] |

### Wave A — read and scan (`@sukunagg/ui`, server)

| Item | Kind | Doc | Code | Review |
|---|---|---|---|---|
| Kbd | server + platform island | [x] component-kbd.md | [x] 14 tests, 100% cov, 1.27 kB (budget 1.5 kB) | [ ] |
| Prose | server, CSS only | [x] component-prose.md | [x] 8 tests, 100% cov, 1.07 kB (budget 1.5 kB) | [ ] |
| Timeline | server | [x] component-timeline.md | [x] 13 tests, 100% cov, 1.23 kB (budget 1.5 kB) | [ ] |

### Wave B — find, upload, vote (`@sukunagg/ui`, client islands)

| Item | Kind | Doc | Code | Review |
|---|---|---|---|---|
| CommandPalette | client, Base UI `dialog` + `autocomplete` (inline) | [x] component-command-palette.md | [ ] | [ ] |
| FileUpload + `resizeImage` | client over a native file input | [x] component-file-upload.md | [x] 46 tests, 100% cov, 4 browser specs; 5.24 kB incl. Button/Spinner/icons (budget 5.8 kB; spec 3.5 kB missed), `resizeImage` 362 B | [ ] |
| Poll | server form + write-in island | [x] component-poll.md | [x] 50 tests, 100% cov, 3.56 kB (budget 3.9 kB; spec target 1.5 kB missed: four states + form + results) | [ ] |

### Wave C — double elimination (`@sukunagg/fx`)

| Item | Kind | Doc | Code | Review |
|---|---|---|---|---|
| BracketBeam `format="double"` | addition to a shipped component | [x] bracket-beam-double-elimination.md (merged into component-bracket-beam.md when built) | [ ] | [ ] |

### Still suggestions (Q42, not designed)

Countdown, OtpField, Banner, CopyButton, ThemeToggle, LockedPanel, MatchCard; Base UI
NavigationMenu, Menubar, Toolbar, CheckboxGroup, Fieldset, Form.

## E. Update log

Agents append one line per meaningful status change: `YYYY-MM-DD · <what flipped> · <commit or PR>`.

- 2026-09-16 · File created during design; Button doc approved · (design session)
- 2026-09-16 · Phase 0 bootstrap: package.json (sukuna-ui, exports, peer react>=18), tsconfig strict, Biome, tsup (esm/cjs/dts + preserveDirectives), Changesets, CLAUDE.md/AGENTS.md, PR template; build + check:pkg green · (bootstrap commit)
- 2026-09-16 · Phase 1 tokens: src/tokens.ts (typed source of truth) → scripts/build-tokens.ts → src/styles/tokens.css (deterministic), + reset.css, index.css; tokens:build script. Light shadow proposed pending Q12. Storybook Tokens page deferred to Phase 2 · (tokens commit)
- 2026-09-16 · Phase 2 harness: bunfig.toml (90% scalar floor — object form is a Bun no-op), test/setup.ts+ssr.ts+axe.ts, smoke test (3 pass); fixed two testing.md spec bugs · (harness commit)
- 2026-09-16 · Phase 2 Storybook: SB10 react-vite, .storybook/{main,preview,manager,theme}, theme toolbar + SideBySide, Design/Tokens MDX (both themes), telemetry off. Closes Phase 1 Tokens-story gate · (storybook commit)
- 2026-09-16 · Phase 3 styling: Tailwind v4 + tailwind-variants; generator emits theme.css; cn/tv/tw-merge-config utils (100% cov); css:build → dist CSS; theme.css/styles.css/tokens.css exports (attw excludes CSS); Storybook on Tailwind; docs/styling.md + ai-decisions.md · (styling commit)
- 2026-09-16 · Phase 4 Text: docs/component-text.md + styles/logic/index/test/stories, exported; 100% cov, axe both themes. Fixed happy-dom preload ordering (D12) + added bun:test matcher types · (text commit)
- 2026-09-16 · Phase 4 Badge: docs/component-badge.md + full set, exported; tones/sizes/dot; 100% cov, axe both themes · (badge commit)
- 2026-09-16 · Phase 4 Card + gate: docs/component-card.md + full set, exported; elevation/padding/radius; 100% cov, axe both themes. Phase 4 gate closed (Text+Badge+Card). Static APIs logged D13 · (card commit)
- 2026-09-16 · Phase 5 Button: implemented per approved doc ('use client', loading/spinner, TS-enforced icon-only label); 100% cov, 12 tests incl keyboard. Build reworked to per-file output + fix-directives so 'use client' is preserved for RSC (D14) · (button commit)
- 2026-09-16 · Phase 5 Input (static, native size dropped, invalid) · (input commit)
- 2026-09-16 · Phase 5 Checkbox + useControllableState hook (native accent-color, indeterminate, onCheckedChange); 100% cov · (checkbox commit)
- 2026-09-16 · Phase 5 Switch + gate: role=switch button, tv slots track/thumb; scripts/with-react.ts + test:react18 (68 tests pass on React 18). Phase 5 gate closed. APIs logged D15 · (switch commit)
- 2026-09-16 · Phase 6 Tooltip: Base UI wrapper (rc.0), styled popup; unit (trigger+SSR) + Playwright browser test (hover shows / Escape hides). Browser suite moved to @playwright/test/Node — Bun hangs Playwright (D16). Base UI installed, Chromium installed · (tooltip commit)
- 2026-09-16 · Phase 6 Dialog: compound Dialog.* (Trigger/Content/Title/Description/Close) over Base UI; unit 100% cov (defaultOpen renders portal content) + Playwright (focus trap / Escape / outside-click). Compound API logged D17 · (dialog commit)
- 2026-09-16 · Phase 6 Select + gate: prop-driven items (string values), open/defaultOpen; unit 100% cov (open list click) + Playwright (choose/keyboard). Phase 6 closed — all 10 v1 components ship. Logged D18 · (select commit)
- 2026-09-16 · Phase 7 size: size-limit — Button tree-shaken 804 B < 3 kB (deps external); Button+deps 11.9 kB < 14 kB (no Base UI leak). `size` script + .size-limit.json · (size commit)
- 2026-09-16 · Phase 8 (partial): examples/vite-react19 builds & consumes sukuna-ui via bun link (all 10 components + styles.css). file: dep skipped gitignored dist → use bun link (D19). 3 more frameworks + hydration smoke remain · (example commit)
- 2026-09-16 · Phase 9 (docs/CI, no publish): README.md, docs/releasing.md (breaking-change table), .github/workflows/ci.yml (check/test/build/pkg/size/react18/browser/examples), initial changeset (minor→0.1.0). Publish gated on owner · (release-prep commit)
- 2026-09-16 · Pushed main to github.com/arielplas/sukuna-components (owner instruction) · (push)
- 2026-09-16 · Phase 8: added vite-react18 + next-app-router examples; both build via bun link. Next build prerenders — validates RSC 'use client' boundary. Remix + hydration smoke remain · (examples commit)
- 2026-09-16 · Phase 8: runtime hydration smoke (scripts/hydration-smoke.mjs) on the Next SSR app — zero hydration warnings; wired into CI examples job. Remix example remains · (hydration commit)
- 2026-09-16 · Phase 9 CD: .github/workflows/release.yml — Changesets action opens Version Packages PR on push to main; publishes to npm (provenance) only after owner merges it. Needs NPM_TOKEN secret. docs/releasing.md updated · (release-workflow commit)
- 2026-09-16 · Enabled repo setting "Actions can create PRs"; Version Packages PR #1 opened + merged (0.1.0). First publish 404'd: `@sukuna/ui` needs an npm org that isn't owned. Renamed package → `sukuna-ui` (unscoped, D20); re-publishing on next push · (rename commit)
- 2026-09-16 · Published `sukuna-ui@0.1.0` to npm with provenance (Automation token + repository field). CI + CD green · (publish)
- 2026-09-16 · v1.1 gap analysis vs MUI added to roadmap §D. Built Tier-1 static components: Divider, Alert, Chip, Spinner (100% cov each, axe both themes) · (v1.1 static wave)
- 2026-09-16 · Tier-1 complete: Avatar, RadioGroup, Tabs, Accordion (Base UI). 100% cov each; RadioGroup/Tabs/Accordion have Playwright browser tests (arrow-key/manual-activation/expand). 131 unit tests, 8 browser tests green · (v1.1 interactive wave)
- 2026-09-16 · Tier-2 (3/4): Skeleton (static), Progress (Base UI), Menu (Base UI + browser test). 145 unit + 9 browser tests green. Toast remains · (v1.1 tier-2 wave)
- 2026-09-16 · Tier-2 complete: Toast (Base UI Provider + useToast hook + viewport). 147 unit + 10 browser tests green. v1.1 Tier 1 + Tier 2 all shipped (12 new components; 22 total) · (toast commit)
- 2026-09-17 · Published sukuna-ui@0.2.0 (merged Version Packages PR #2; 12 v1.1 components) · (release)
- 2026-09-17 · Tier-3 (3/7): Breadcrumbs (static), Slider (Base UI + browser), Pagination (static, range helper). 167 unit + 11 browser tests green. Remaining: Drawer, Stepper, Combobox, Table · (v1.1 tier-3 wave)
- 2026-09-17 · Tier-3 complete + v1.1 DONE: Drawer (Base UI dialog, side variant), Stepper (static), Combobox (Base UI autocomplete), Table (static compound). 187 unit + 13 browser tests green. 29 components total · (v1.1 tier-3 wave 2)
- 2026-09-17 · Fix: dropdowns (Select/Menu/Combobox) + Tooltip rendered behind Dialog/Drawer — z-index was on the popup, not the portalled positioner. Added overlay z token scale (dialog 50 < popover 60 < toast 70 < tooltip 80); z-index on positioner. New Playwright stacking guard. 187 unit + 14 browser tests green. minor → 0.4.0 (D21) · (z-index fix commit)
- 2026-09-17 · A11y wave 1 (audit backlog P0#1/P1#4,6/P2#9,11): retuned text-faint + light premium/premium-dim/success to WCAG AA; new --sk-focus-ring (solid) replaces translucent ring on all focus; Menu/Select/Combobox highlight → crimson inset ring (≥3:1); Avatar alt="" default, Progress default name, Toast close 24→32px. 189 unit tests green. minor (D22) · (a11y wave 1 commit)
- 2026-09-17 · A11y P1#5 (owner-approved): Button primary label now AA — new --sk-on-accent (white) label + darkened dark gradient start #FF3B4E→#D8253A (white 4.95:1). Verified dark+light in browser. 189 tests green. minor (D23) · (button contrast commit)
- 2026-09-17 · Perf wave (audit P0#2/#3, #8/#10/#12; owner Option 2 = no-dep): content-visibility on Combobox/Menu items (not Select — breaks its popup alignment; not Table <tr>); Combobox maxRenderedItems→Base UI limit; Select.Value O(1) memo; Menu optional stable id key; size-limit entries Table(498B)/Select(48.4kB). Docs: README perf section. 190 unit + 14 browser green. minor (D24) · (perf wave commit)
- 2026-09-17 · A11y P1#7: prefers-reduced-motion honored via motion-reduce:* on 17 motion slots across 13 components (spin/pulse→none, overlay slide/scale→instant, Button press-scale off). Playwright reduced-motion test added. 190 unit + 16 browser green. minor (D25) · (reduced-motion commit)
- 2026-09-17 · RadioGroup: label-text click now selects the option (whole row is the Radio.Root; aria-labelledby kept so axe stays green). Browser test added. 190 unit + 17 browser green. patch (D26) · (radiogroup label-click commit)
- 2026-09-17 · Tabs: selected tab was invisibly styled — data-[selected] never matched (Base UI Tab uses aria-selected/data-active, no data-selected). Now aria-selected:text-accent + underline (crimson). Browser guard added. 190 unit + 18 browser green. patch (D27) · (tabs selected-state commit)
- 2026-09-17 · Tabs: disabled tab now visibly dimmed (data-[disabled] added — Base UI keeps a disabled tab focusable with data-disabled, no native disabled attr, so disabled: never fired). Verified other components unaffected. Browser guard added. 190 unit + 19 browser green. patch (D27) · (tabs disabled-state commit)
- 2026-09-17 · Added examples/showcase (all 29 components, dark/light toggle). Building it surfaced 2 bugs: Tabs was never exported from src/index.ts (fixed + guard test src/index.test.ts); Breadcrumbs keyed by href → dup keys (now index). 191 unit tests green. minor+patch (D28) · (showcase + export fix commit)
- 2026-09-17 · Improvements batch (6 parallel agents, D29): new Field component (Base UI Field, form wrapper); Accordion headingLevel; Button as="a" polymorphic; Alert tone→role; contrast CI gate (src/tokens.contrast.test.ts, 38 assertions); Storybook token contrast badges. Now 30 components. 221 unit tests, 100% cov, check/build/check:pkg green. 4 minor changesets · (improvements batch commit)
- 2026-09-18 · Agent-friendly docs + SEO (D30, 7 parallel agents): TSDoc on all 30 components (shipped in .d.ts); scripts/build-docs.ts generates llms.txt / llms-full.txt / docs/llms/*.md / README table (docs:build in build, docs:check in CI); README rewritten agent-first; package.json keywords/author; update-readme skill; showcase prerendered + full SEO (JSON-LD, OG/og.png, robots, sitemap) + root vercel.json. Stale specs fixed (Button as, Menu id, Alert role). 221 tests / 100% cov, tsc + biome clean. minor · (agent-friendly docs commit)
- 2026-09-18 · Checkbox (D32): `label` prop (real <label>, text click toggles, names the box; showcase now uses it) + Enter toggles with preventDefault (never submits a form). 5 unit tests + 2 Playwright guards. minor · (checkbox label/enter commit)
- 2026-09-18 · Select popup (D31): alignItemWithTrigger off (wheel scrolled the list but grew/moved the popup in Base UI's aligned mode), popup min-width = trigger width (--anchor-width), max-height capped by --available-height (4th stacked Select overflowed the viewport). ManyItems story (100 numeric options, 4 stacked). 2 Playwright guards. patch · (select popup commit)
- 2026-09-21 · Button: `cursor-pointer` on hover — it was the only interactive component without a pointer cursor (switch/tabs/accordion/menu/etc. already set it); disabled/aria-disabled/aria-busy cursors still override. Doc snippet + states table + generated llms docs updated. Verified live in Storybook. patch · (button cursor-pointer commit)
- 2026-09-21 · React Bits-inspired wave — DESIGN DOCS ONLY (docs-first, no code yet): authored `docs/component-{counter,gradient-text,shiny-text,carousel}.md` per the Button template. Scouted reactbits.dev (~205 components) and rejected the WebGL backgrounds / cursor effects as off-identity (violate SSR / zero-runtime / a11y / 90%-cov); kept 4 that fit. New tokens/utilities (gradient-premium, sk-shine keyframe) logged as owner Q13/Q14 · (design-docs, code pending)
- 2026-09-21 · Counter shipped (React Bits wave 1/4): `'use client'` count-up over a server-rendered final value; `role="img"`+`aria-label` (announced once, not per frame); `motion-reduce` → final value instantly; `from`/`duration`/`decimals`/`prefix`/`suffix`/`format`/`once`. `startOnView` deferred (needs IntersectionObserver). 9 tests, 100% cov (rAF/matchMedia mocked). Also hardened `scripts/build-docs.ts` to skip specs with no `src/index.ts` export, so docs-first specs don't advertise phantom components. minor · (counter commit)
- 2026-09-21 · GradientText shipped (wave 2/4): static/RSC-safe `background-clip:text` fill; `-webkit-text-fill-color:transparent` reveals the gradient while a real `text-accent` stays as the a11y/axe fallback; `as` span/p/h1–h6. Ships `accent`; `premium` gated on the `--sk-gradient-premium` token (Q13). 7 tests, 100% cov. minor · (gradient-text commit)
- 2026-09-21 · ShinyText shipped (wave 3/4): static/RSC-safe CSS sweep (dim→bright→dim gradient, no transparent stop, legible base); `sk-shine` keyframe + `animate-shine*` utilities added to the generated theme layer (build-tokens.ts); `motion-reduce` freezes it; `speed` slow/normal/fast. `disabled` deferred (tailwind-merge can't dedupe the custom animate utility). 7 tests, 100% cov. minor · (shiny-text commit)
- 2026-09-21 · Carousel shipped (wave 4/4): root-managed WAI-ARIA carousel (labelled region, per-slide role=group + "n of total", live-region off during autoplay, arrows/Home/End, loop, autoplay with WCAG-2.2.2 pause control that never starts under reduced-motion — tri-state `reduced` avoids a transient start, pause-on-hover/focus, dots, controlled/uncontrolled). Swipe + `inert` on off-screen slides deferred to v1.1. 14 tests, 100% cov (setInterval/matchMedia mocked). Now 34 components. minor · (carousel commit)
- 2026-09-21 · v1.2 Base UI coverage wave — DESIGN DOCS ONLY (docs-first, no code): authored `docs/component-{number-field,toggle-group,hover-card,scroll-area,context-menu}.md` per the Button template. Gap analysis vs shadcn/Radix/MUI/Mantine/Chakra picked 5 components Base UI (already a dep) ships but we hadn't wrapped — zero new deps, no new tokens. Roadmap §D3 added. Popover held out for an explicit owner decision (currently out-of-scope per §D). code pending owner doc approval · (v1.2 design-docs)
- 2026-09-21 · v1.2 SHIPPED (code): built NumberField (text input + hidden number mirror; steppers, largeStep, Intl format, clamp), ToggleGroup + standalone Toggle (segmented/multiple, `multiple` not `toggleMultiple`; onValueChange always an array), HoverCard (Base preview-card; delay/closeDelay on the Trigger not root; no arrow — matches Tooltip/Menu), ScrollArea (native-scroll viewport + themed thumbs, orientation vertical/horizontal/both), ContextMenu (right-click, reuses Menu's `MenuItemOption`, style parity with Menu). All exported, 100% cov each; `check`/`build`/`check:pkg` green; 313 unit tests. 5 browser specs added. 39 components. Doc fixes from real Base UI rc API: NumberField readOnly doesn't disable steppers; HoverCard arrow dropped. minor ×5 · (v1.2 code)
- 2026-09-21 · v1.2 polish: (1) halved default open delay to 300ms on Tooltip (was Base 600) and HoverCard.Trigger — snappier hover reveal; Tooltip default change = minor (breaking on 0.x), HoverCard folded in pre-release. (2) ContextMenu iOS long-press fix: children now wrapped in Base UI's `display:contents` trigger with `user-select:none` + `-webkit-touch-callout:none` (Base only sets the callout; without user-select:none an iOS long-press starts text selection and the menu never opens). Verified desktop right-click still opens; child inherits user-select:none. 313 tests green · (v1.2 polish)
- 2026-09-21 · Showcase rebuilt as an auto-driven component explorer (examples/showcase): left-nav routing (hash) over all 39 components, right pane renders every Storybook story per component (examples/showcase/src/stories.tsx globs src/components/*/*.stories.tsx and renders meta+story args / render fns, like Storybook). Added Tailwind v4 to the showcase build (mirrors .storybook: @tailwindcss/vite + a styles.css that @imports theme.css and @sources the components+stories) so story-only utilities render; imports library+stories from source so context components (Toast) share one instance. Overview page kept as the default route (SEO + prerender <h1>). Component count is now dynamic (components.length) — no more hard-coded/stale count. Prerender build green; verified dark+light, story rendering, Toast context. `update-showcase` skill rewritten (showcase is auto-driven now; no manual demo/count upkeep) · (showcase explorer)
- 2026-09-21 · Showcase: every example gets a Show code toggle (import line + the story's own JSX). The snippet is lifted from the stories source via a second `?raw` glob — `{...args}` is inlined as the literal props written in `args: { … }` (so `items={items}` stays a reference and its helper `const` is included above), explicit tag props beat expanded args, a `react` import is added when a story uses hooks, and the `import { … } from 'sukuna-ui'` line comes from the real exports in src/index.ts. Closed on the server (prerender unchanged); Copy uses the clipboard in a click handler. · (showcase-code-toggle branch)
- 2026-09-27 · v1.3 wave (§D4, Q15/D33): Base UI rc.0 → stable `@base-ui/react@1.8` (ScrollArea keepMounted); Button → server component + RSC-boundary guard test; Counter paints via ref (0 re-renders/frame) + `startOnView`; size-limit budget per component (40 entries). New Popover, AlertDialog, Textarea, Collapsible, Meter (docs-first, 100% cov, browser specs). Variants: Button outline/link/iconOnly, Alert onDismiss, Card interactive, Avatar shape, Progress/Spinner tone. Fix: Accordion disabled items never dimmed. `danger` kept out (Q10). Virtualization waits on Q16 · (feat/v1.3-wave)
- 2026-09-27 · Perf P4 (virtualization) → [-] deferred by owner (Q17); Q16 closed, no new dependency · (feat/v1.3-wave)
- 2026-09-27 · Table actions column (Q18/D34): `MenuItemOption.icon` (Menu + ContextMenu), new `RowActions` (⋯ ghost icon Button + Menu, row-specific aria-label, align end), static `Table.ActionsHeaderCell` (sr-only "Actions") / `Table.ActionsCell`. Table stays server-only at 0.56 kB. 379 unit (100% cov) + 39 browser green. 45 components · (feat/v1.3-wave)
- 2026-09-27 · Tabs `orientation="vertical"` (Q19): navigation column (flex-col list, right-edge crimson bar + surface fill), ArrowUp/Down + aria-orientation via Base UI; Vertical story with icon labels; unit + Playwright guards · (feat/v1.3-wave)
- 2026-09-27 · Motion wave (§D5, Q20, `docs/motion.md`): tokens `--sk-duration-slow`/`--sk-ease-spring` + `animate-indeterminate`; Tabs sliding indicator (both orientations, SSR fallback border); Accordion height; directional popup entrance ×7; Toast stacked deck + expand + swipe; Meter/Progress grow-in + sliding indeterminate. Fixes: scale/translate never transitioned in 11 components (Tailwind v4 props ≠ `transform`); indeterminate Progress ignored reduced motion. New `test/browser/motion.test.ts`; Tabs budget 22→25 kB (Indicator). 381 unit / 100% cov, 46 browser ×3 stable · (feat/v1.3-wave)
- 2026-09-27 · VideoPlayer design (Q21, §D6): `docs/component-video-player.md` + interactive mockup; Doc [~] awaiting owner approval, no code · (feat/v1.3-wave)
- 2026-09-27 · VideoPlayer scope → Nuevo parity (Q22): scouted nuevodevel.com; parity map + three tiers + waves in the spec; mockup v2 (chapters, thumbnails, settings, panel, playlist, ads, live, 29 states). Doc still [~] · (feat/v1.3-wave)
- 2026-09-27 · Theming DESIGN ONLY (§D7, Q24): `docs/theming.md` — Midnight + Paper palettes (AA-verified), theme registry + resolver, `system` mode (opt-in, no-attribute stays dark), `sukuna.themes.ts` + `sukuna-ui themes init|build` CLI. Code pending · (feat/v1.3-wave)
- 2026-09-27 · VideoPlayer W1 (§D6, Q23 approval): core player on native `<video>` — chapter-segmented seek + sprite thumbnails, quality/speed/captions/caption-style settings, player-rendered captions, touch + double-tap, context menu, hotkeys + `?` sheet, `labels`, `useVideoPlayer`. In-house seek/volume/menu (Base UI Slider can't host segments + preview). 12.1 kB brotli (budget 13 kB), no new deps. 30s WebM fixture in `.storybook/public/video`; 42 unit (≥91% funcs / 100% lines per file) + 5 Playwright. 46 components · (feat/v1.3-wave)
- 2026-09-27 · VideoPlayer W2 (§D6): parts `VideoPlayerPlaylist` (item media drives the player, prev/next, Shift+N/P, auto-advance, repeat, rememberKey), `VideoPlayerPanel` (chapters / playlist / transcript, in-house tablist, stops above the bar), `VideoPlayerUpNext`, `VideoPlayerEndScreen`, `VideoPlayerShare`, `VideoPlayerSkip`; core `resume`, `syncGroup`, `floating` mini player, `theater`. Context registry for parts. Core 14.4 kB (budget 15), all parts 17.4 kB (budget 19). 65 unit (100% on every part file, core 93.6% funcs) + 8 Playwright · (feat/v1.3-wave)
- 2026-09-27 · VideoPlayer W3 (§D6): gear rows picture (zoom/mirror/brightness/contrast/saturation chips), sleep timer, loop (video / chapter / A–B, champagne range on the bar), snapshot (callback or PNG, blocked-media toast), download; props `watchLimit`, `live` (DVR window, LIVE pill), `download`, `onSnapshot`; parts `VideoPlayerOverlay` (card/banner/plain, on pause, dismissible) and `VideoPlayerAudio` (art + Web Audio visualizer). Ticker variant → Q25. Core 16.6 kB (budget 17; the gear-row tools live in core and can't tree-shake — a later split is possible), all parts 20.7 kB (budget 23). 83 unit (100% on every part, core ≥94% funcs) + 12 Playwright · (feat/v1.3-wave)
- 2026-09-27 · VideoPlayer W4 (§D6, Q23 approved hls.js): `engine` seam (`VideoEngine` claims URLs at render, attaches in an effect, reports levels → Quality menu; Retry re-attaches) + `sukuna-ui/video/hls` (`hlsEngine()`, hls.js `>=1.5` optional peer, `typesVersions` for node10; 434 B). HLS fixture (VP9/Opus fMP4) + `HlsStream` story. Core 17.05 kB (budget 18). 93 unit + 13 Playwright. Remaining adapters → Q26 · (feat/v1.3-wave)
- 2026-09-28 · VideoPlayer UX (owner request): settings menu stays open on a choice (returns to the main list, YouTube-style; gear / outside / Escape close it); ±10s and every tap restart the inactivity timer instead of hiding the controls (touch `pointerleave` ignored; only keyboard focus pins them). 476 unit + 60 Playwright · (feat/video-player-ux)
- 2026-09-28 · VideoPlayer (owner bug report): a settings choice (e.g. speed 2×) now stays on its page with the value ticked, instead of jumping back to the main list; Back returns. Removes the loop-only `stay` exception · (fix/video-player-menu-stay)
- 2026-09-28 · VideoPlayer split plan (Q27): standalone `@sukuna-ui/video` (no `sukuna-ui` dep, own `--vp-*` vars, prebuilt prefixed CSS, dark default), `sukuna-ui` re-exports; four-phase plan logged, `--vp-*` set awaiting approval (Q28). Docs only, no code · (docs/video-standalone-plan)
- 2026-09-28 · Q27 phase 1 — workspace: Bun workspaces, `sukuna-ui` moved to `packages/ui` (src, tsup, bunfig, size-limit, CHANGELOG, token/css scripts); root keeps docs, Storybook, shared `test/` + `scripts/`, examples. Root scripts fan out with `bun run --filter`; README copied into the package at build. No API change (empty changeset). 476 unit + 60 Playwright, showcase + Vite example build · (docs/video-standalone-plan)
- 2026-09-28 · Q27 phase 2 — detach: VideoPlayer + parts + hls adapter moved to `packages/video` (`@sukuna-ui/video`, `/hls`) with its own `tv`/merge config/`useControllableState` copies and an inline loading ring (no Spinner); a guard test fails on any `sukuna-ui` or out-of-package import. `sukuna-ui` depends on it and re-exports every name + `sukuna-ui/video/hls` (no API change); docs generator maps the re-export. Root `paths` + per-package `tsconfig.build.json` keep dev on source and d.ts on the package. 97 + 381 unit, 60 Playwright; video 16.87 / 20.97 kB · (docs/video-standalone-plan)
- 2026-09-28 · Q27 phase 3 — standalone stylesheet: player classes `vp:`-prefixed (AST codemod, 284 literals) + `tv` merge `prefix: 'vp'`; `packages/video/src/styles/video.css` → `dist/video.css` (Tailwind `prefix(vp)`, `@theme static` Sukuna-dark → `--vp-*` vars, unlayered, Preflight-style reset in `@scope ([data-vp-root]) to ([data-vp-content])`; 7.22 kB brotli, budget 8). App content wrapped in `display: contents` `[data-vp-content]`. `sukuna-ui` `theme.css` `@import`s it + `styles.css` appends it + generated `[data-vp-root]` `--vp-*`←`--sk-*` bridge. Parity: computed styles of 29 stories × 2 states match the pre-split Storybook (only baseline noise + the new wrapper); new `examples/video-standalone` (hostile host CSS) + `scripts/video-standalone-smoke.mjs` in CI. Q28 names built as `--vp-color-*` behind `DECISION(open)`. 104 + 381 unit, 60 Playwright · (docs/video-standalone-plan)
- 2026-09-28 · Q27 phase 4 — re-export + docs: `sukuna-ui` re-exports (since phase 2); `packages/video/README.md` (npm), root README "Just the video player", llms page gets a Standalone line, spec/theming/ai-decisions (D35) updated; changesets `@sukuna-ui/video` minor (→ 0.1.0) + `sukuna-ui` minor (className-override note), dry-run verified the `^0.1.0` range bump · (docs/video-standalone-plan)
- 2026-09-29 · Q29 — repo transferred to `sukuna-gg/sukuna-ui`; packages renamed `sukuna-ui` → `@sukunagg/ui` (0.10.0) and `@sukuna-ui/video` → `@sukunagg/video` (0.1.0) across code, CSS paths, TSDoc, docs, examples, CI; first publish of both from the owner's machine. 104 + 381 unit, 60 Playwright, examples + standalone smoke green · (docs/video-standalone-plan)
- 2026-09-29 · Q30 — variants wave (#12) ported onto the workspace layout: sm/md/lg size scale on Checkbox/Switch/Progress/Select/RadioGroup; Toast `tone`; Card `tone` premium + `glow` (v1.3 `interactive` kept); Tabs `variant` underline/pill + `size` + `fitted` beside `orientation` (pill/fitted horizontal-only); form `variant` filled/outline/ghost on Input/Select/Combobox/NumberField; Badge/Chip `variant` + Chip `selected`; Skeleton shimmer; Table density/striped/hoverable. Fixed the rename's docs regression (VideoPlayer back in README/llms, 46 components; generator now fails on a missing re-export). 104 + 397 unit · (feat/variants-wave-v2)
- 2026-09-29 · Q30 — brand kit (#13) ported: brand/ = source of truth (Ember Gate mark, wordmark, lockups, favicon set, social/OG, Storybook logos, textures; excluded from Biome + npm). Showcase: full favicon set + site.webmanifest + og.svg/og.png (1200×630) and og:image:alt; Storybook manager brandImage via staticDirs → brand/storybook; README hero banner (raw GitHub URL so npm renders it too). Manual steps left for the owner: GitHub → Settings → Social preview (brand/social/github-social-preview.png) and the npm/GitHub avatar (brand/social/avatar-512.png) · (feat/brand-assets-v2)
- 2026-10-05 · Q31/Q32 — charts & stats designed (mockup approved, revised after a sukuna-gg-web review); §D8 added; tokens approved in tokens.md; wave 1 specs written: component-stat-tile.md, component-sparkline.md, component-empty-state.md, Input `reveal` + Badge `pulse` in docs/charts-and-stats.md (merged into their component docs with the code); owner review pending, no code yet · (feat/charts-wave1-specs)
- 2026-10-05 · Q32 — charts & stats wave 1 built: chart/heat/danger tokens (+ contrast gate), StatTile, Sparkline, EmptyState (new, exported, stories), Input `reveal` (client file `input.reveal.tsx`) and Badge `pulse` (specs merged into their component docs). 456 ui + 104 video unit tests, React 18 green, every new file 100% cov, size budgets added. Owner visual review pending · (feat/charts-wave1-specs)
- 2026-10-05 · Owner request — Storybook + showcase split into sections: Components (46), Charts (StatTile, Sparkline), Video (VideoPlayer). Story titles carry the section (`Charts/…`, `Video/…`), `storySort` pins Design → Components → Charts → Video, showcase sidebar/mobile picker/overview group by it; video browser-test ids → `video-videoplayer--*` (all 40 test ids resolve) · (feat/charts-wave1-specs)
- 2026-10-05 · Q33 — wave 2 specs written: `charts-and-stats.md` §5 (package, server-rendered CSS-sized model, shared props/states, client island, d3 bundling + d3-scale size gate), `component-bar-chart.md`, `component-line-chart.md` (Line + Area), `component-data-bar.md`; roadmap header corrected (0.10.0 is published, Q29) · (feat/charts-wave2-specs)
- 2026-10-05 · Q33 "build the rest non-stop" — wave 2 built: new `@sukunagg/charts` package (BarChart, LineChart, AreaChart, DataBar; server-rendered, CSS-sized; ~1.2 kB client island), no runtime deps (in-house d3-equivalent math, D37); 65 unit tests (~100% cov), 4 Playwright tests; docs generator, README, showcase snippets and Storybook/showcase aliases updated (old `@sukuna-ui/video` alias fixed); changeset → `@sukunagg/charts` 0.1.0 · (feat/charts-wave2-specs)
- 2026-10-05 · Q33 — wave 3 built: 17 icons (server components, `/* @__PURE__ */` factory calls so one icon is 481 B, not all 17) and Table `scroll` (a named `<section>` that is a tab stop only while overflowing; client file like Input `reveal`); specs in component-icon.md / component-table.md; changeset @sukunagg/ui minor · (feat/charts-wave2-specs)
- 2026-10-05 · Q33 — later trio built in @sukunagg/charts: DonutChart, RadialGauge, Heatmap (server components, no client JS); shared summary/table extracted to `ChartTail`; axe caught a meter without a value → a null gauge is now a described `role="img"`; 85 charts tests (~100% cov) · (feat/charts-wave2-specs)
- 2026-10-05 · Q34 "lgtm ship it" — owner review + D37 sign-off; wave 1 Review boxes flipped; branches pushed and PRs opened (wave 1 → main, waves 2/3/trio stacked on it, lockfile → main). Merge/publish stay with the owner · (feat/charts-wave2-specs)
- 2026-10-05 · Q35 "Published failed… check ci" — versions were right; Release fails creating the Version Packages PR (org setting off since the move to `sukuna-gg`, #22) and npm provenance would reject the stale `sukuna-gg/sukuna-ui` repo URLs → URLs moved to `sukuna-gg/sukunagg-ui`, owner setup added to releasing.md · (fix/release-repo-rename)
- 2026-10-07 · Q36 — ScrollArea `tone: 'neutral' | 'accent'` (owner asked for a "crimson variant"; named `accent` like Badge/Chip). Accent thumb = crimson 80% idle / solid hover (≥3:1 both themes); `Accent` + `Tones` stories; spec §4 drift fixed (track hover is `surface-2`, orientation is not a tv variant). patch · (feat/scroll-area-tone)
- 2026-10-07 · Q37 "i like it... ship it" — owner approved ScrollArea `tone="accent"` as built; `feat/scroll-area-tone` pushed and PR opened. Merge/publish stay with the owner · (feat/scroll-area-tone)
- 2026-10-09 · Q39 — showpieces wave 1 built and reviewed: RetroGrid, BorderBeam, RankReveal, MatchFound, LootReveal, XpLevelUp, AvatarFrame, ScrambleText, GlitchText (new, exported, stories, browser specs); 643 ui unit tests, 100% cov; cross-browser review rounds; 212/213 browser tests in Chromium/Firefox/WebKit (the 1 a Firefox timing flake under load, 3/3 alone); motion.md carve-out, D38, changeset patch. Owner visual review pending · (feat/ui-showpieces)
- 2026-10-09 · Q39 — new package `@sukunagg/fx` built and reviewed: shared loop + ParticleField, HoloCard, FlowField, Lightning, BracketBeam (Storybook `FX` section, showcase, docs generator); 258 fx unit tests, 100% cov; Chromium live reduced-motion bug found in review and fixed in the loop; D39; changeset → 0.1.0 · (feat/fx-package)
- 2026-10-09 · Q40 — owner chose the split size-limit entries, approved push, and asked to merge: #29 (ScrollArea tone), #30 (ui showpieces) and #31 (`@sukunagg/fx`) merged to main, all CI green. Release (Version Packages PR, npm) stays with the owner · (main 141681e)
- 2026-10-09 · Q41 — calendars designed: live mockup approved ("lgtm") with all four recommendations; specs written for Calendar, DatePicker, DateRangePicker, DateTimePicker, MonthView, Agenda (§D10, D40). Code waits on spec approval · (docs/q41-calendars)
- 2026-10-10 · Q42 — toolkit wave designed: mockup + recommendations approved; specs written for Kbd, Prose, Timeline, CommandPalette, FileUpload, Poll and BracketBeam double elimination (§D11, D41). Code waits on spec approval · (docs/q41-calendars)
- 2026-10-10 · Q42 — toolkit wave A built: Kbd (server + platform island), Prose (CSS only), Timeline; exported, stories, 35 tests, 100% cov each; sizes 1.27 / 1.07 / 1.23 kB (budgets 1.5 kB); 678 ui tests green; check, test:coverage, build, check:pkg, size all pass; changeset patch. Owner visual review pending · (docs/q41-calendars)
- 2026-10-10 · Q43 — Poll built (parallel builder, reviewed): server `<form>` + write-in island, 50 tests, 100% cov, 5 browser specs, 3.56 kB; React 18 matrix green; changeset patch · (feat/poll)
- 2026-10-10 · Q43 — FileUpload + resizeImage + Camera/Upload/Image icons built (parallel builder, reviewed): 46 tests, 100% cov, 4 browser specs (a real 4000×3000 JPEG reaches FormData at 2000×1500); changeset patch · (feat/file-upload)
