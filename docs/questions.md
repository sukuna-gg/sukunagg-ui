# Design Q&A log

Questions asked by the project owner during the design phase, with the answers given. Append to this file as new questions come up.

---

## Q1. Show me the trade-offs between different styling approaches (Tailwind, Panda, etc.) for a published, SSR-capable library.

**Answer.** For a public npm package the deciding factors are: does it work with zero consumer config, does it SSR without a runtime, and can tokens be overridden.

| Approach | Runtime | SSR / RSC | Consumer must do | Verdict |
|---|---|---|---|---|
| Plain CSS + custom properties + `cva` | 0 | ✅ | Import one CSS file | Safest, was the initial recommendation |
| Vanilla Extract | 0 | ✅ | Import one CSS file | Typed tokens; files must be `*.css.ts` |
| Tailwind v4 + `tailwind-variants` | 0 | ✅ | Have Tailwind, add `@import` + `@source`; or use precompiled fallback | **Chosen** |
| Panda CSS | 0 | ✅ | Panda in their build if we ship recipes | Poor library story |
| StyleX | 0 | ✅ | Compiler plugin in their build | Poor library story |
| Linaria / Pigment | 0 | ✅ | Import one CSS file | Viable, small ecosystem |
| styled-components / Emotion | JS runtime | ⚠️ style registry, forces `'use client'`, hydration risk | Per-framework setup | Rejected |

Full table with the "fits `.styles.tsx`" and "runtime override" columns is in `plan-agentic.md` §1.

---

## Q2. Which behavior base for interactive components? Explain this a little more.

**Answer.** A Button is easy: native `<button>` gives focus, keyboard, and screen-reader semantics for free. Dialog, Tooltip, Select, Combobox, Menu are not: focus trapping, arrow-key navigation, `aria-*` wiring, portals, click-outside, escape, typeahead, scroll lock, iOS Safari quirks.

- **Hand-rolled**: write all of that yourself. Full control, zero deps, months of edge cases you own.
- **Headless library** (Base UI, React Aria, Radix): behavior with no styles; you only write `.styles.tsx`. This is how shadcn/ui works. Cost: a dependency and an API shaped by theirs.
- **Hybrid** (recommended, adopted as default): native for Button/Input/Checkbox/Switch/Badge/Card/Text; headless for Dialog/Tooltip/Select. Maps cleanly to the `logic.tsx` / `styles.tsx` split.

Default base: Base UI. Radix is in maintenance; React Aria is the fallback.

---

## Q3. Single package or monorepo — what do you mean?

**Answer.** A **monorepo** splits the project into several npm packages (`@sukuna/tokens`, `sukuna-ui`, `@sukuna/icons`) in one repo using Bun workspaces. A **single package** is one `sukuna-ui` that ships everything.

Monorepo pays off when someone wants tokens without React, or icons get heavy. For v1 with ten components it is only extra config. Decision: single package, with the split noted as a later migration path.

---

## Q4. Why do props extend the native element (`ComponentPropsWithoutRef<'button'>`) and add only what native lacks?

**Answer.** Extending the native element means `onClick`, `type`, `disabled`, `form`, `aria-*`, `data-*`, `id`, `tabIndex` all work with correct types without declaring them one by one. Consumers can do anything they could with a raw `<button>`, so "your Button doesn't support X" never happens. We add only what native lacks (`variant`, `size`, `loading`). `WithoutRef` because the ref is typed separately by `forwardRef`. Same rule for every component: Input → `'input'`, Card → `'div'`, etc.

---

## Q5. Let's use Tailwind. (Decision, not a question, but it changed the answers above.)

**Consequences.** Tailwind consumers add two lines to their CSS (`@import "sukuna-ui/theme.css"` and `@source "../node_modules/sukuna-ui/dist"`). Non-Tailwind consumers import a precompiled `styles.css` (second-class: not purged, override only via `--sk-*` vars). `.styles.tsx` uses `tv()` from `tailwind-variants`; `cn` uses `tailwind-merge`. Theming stays `data-theme` via `@theme inline` so no `dark:` variant is needed. Details in `plan-agentic.md` §1 and `tokens.md`.

---

## Q6. Thoughts on how to handle versioning?

**Answer.** Changesets + semver, plus three things semver leaves open for a UI library.

**What counts as breaking:**

| Change | Bump |
|---|---|
| Removing/renaming a prop, variant, export, or CSS entry (`theme.css`, `styles.css`) | major |
| Changing a default value of a prop | major |
| Visual change that alters layout (height, padding, token value) | major, or minor with a note if it is a fix toward the design spec |
| Renaming a `--sk-*` token | major |
| Adding a prop, variant, component, or token | minor |
| Bug fix with no API or layout change, a11y fix | patch |
| Raising minimum React or Tailwind peer version | major |
| Internal Base UI bump with no API change | patch |

**Pre-1.0:** stay on `0.x` until all ten v1 components ship and are used in one real app. On `0.x`, minor = breaking, patch = everything else. `1.0.0` means the props API and token names are stable.

**Channels:** `latest` from `main` via the Changesets GitHub Action (Version Packages PR; merge publishes, still gated on explicit owner approval). `next` for pre-releases during breaking work (`bunx changeset pre enter next`). Every PR needs a changeset (empty allowed for docs/CI).

**Also:** deprecation window of one minor (`@deprecated` JSDoc + dev-only console warning) before removal in the next major; visual regression in CI (Storybook + Chromatic or Playwright screenshots) to catch patches that are really majors.

---

## Q7. This versioning works — how do we make sure our agents follow it?

**Answer.** Don't rely on agents reading the doc; make the wrong bump fail mechanically. Three layers:

1. **Context the agent can't miss.** `CLAUDE.md` (and `AGENTS.md`) at repo root with the core rules and the breaking-change table, linking to `docs/`.
2. **CI that classifies independently of the agent.**
   - API surface diff (`api-extractor` or committed `.d.ts` snapshot): removed/renamed export or prop + non-major changeset → fail.
   - Visual regression (Chromatic / Playwright): pixel diff + `patch` changeset → fail.
   - Token diff script: removed/renamed `--sk-*` in `dist/theme.css` + non-major → fail.
   - Peer-range diff: `peerDependencies` changed + non-major → fail.
   - `changeset-bot` requires a changeset on every PR (`no-release` label for empty).
   - `publint`, `attw`, `size-limit`.
3. **Human gates.** Agents open PRs, never push to `main`; the "Version Packages" PR is reviewed by the owner; `npm publish` runs only from an owner-created tag. PR template asks the agent to state the bump and why.

---

## Q8. Add `component.test.tsx` — any libraries you recommend?

**Answer.** The file was already in the contract; the spec now lives in `docs/testing.md`. Stack for the unit layer, all under `bun test`: `@happy-dom/global-registrator` (DOM), `@testing-library/react` + `user-event` + `jest-dom` (render, real interactions, matchers), `axe-core` + `jest-axe` (a11y), `react-dom/server` + `hydrateRoot` (SSR + hydration checks). Browser-only behavior (focus traps, portals) stays in Storybook `play` tests with Playwright. Avoid Enzyme and HTML snapshot tests; assert roles/attributes/behavior, not class strings.

---

## Q9. Make sure we add tests and have at least 90% coverage.

**Answer.** Enforced, not aspirational: `coverageThreshold = { line = 0.9, function = 0.9, statement = 0.9 }` in `bunfig.toml` makes `bun test` fail below the floor, locally and in CI. Measured on logic, styles, hooks, and utils; stories, barrel files, tokens, and test helpers are excluded so the number stays honest. Per-component floor of 90% on its own files before merge. Coverage may never be raised by excluding component code. Details in `docs/testing.md` § Coverage policy; every phase gate in `plan-agentic.md` now includes it.

---

## Q10. "wdym?" on the `danger` question → resolved: forget about danger.

**Answer given.** Sukuna has one red (crimson, the primary action). A `danger` button sharing it would look identical to `primary` on the same screen; alternatives were an outline red, a second red token, or dropping it. **Decision: drop `danger` from v1.** Also decided in the same message: no `premium` Button variant; light palette approved.

---

## Q11. Collapse to one test runner → `bun test` only.

**Decision.** `bun test` is the single runner. Storybook's vitest addon is dropped; stories are fixtures. Real-browser behavior (Dialog focus trap, Select typeahead, Tooltip positioning) is still tested, but as `bun test` files in `test/browser/` that use Playwright's library API against `storybook-static`. Visual regression is Chromatic on the Storybook build. Coverage is measured on the unit suite only. Details in `docs/testing.md`.

---

## Q12. (Agent → owner) Light-mode `--sk-shadow-card` value?

**Context.** `docs/tokens.md` gives the dark card shadow exactly
(`0 30px 60px -24px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.06)`) but describes light only
as "softer" — no value. Phase 1 needs a concrete light value.

**Proposed (in use, pending approval).** `0 20px 40px -24px rgba(0,0,0,.25), 0 0 0 1px rgba(0,0,0,.06)`
— same geometry, shallower spread, a dark hairline instead of a white one. Implemented in
`src/tokens.ts` (`shadows.card.light`) and generated into `src/styles/tokens.css`; a
`// see Q12` marker points here. Tune or replace on review; changing it pre-1.0 is a patch.

**Status:** waiting on owner.

---

## Q13. (Agent → owner) React Bits-inspired wave — new tokens/utilities for GradientText & ShinyText?

**Context.** Scouted reactbits.dev and designed 4 component specs
(`docs/component-{counter,carousel,gradient-text,shiny-text}.md`) that fit sukuna's SSR/a11y/token
rules (the WebGL backgrounds and cursor effects were rejected as off-identity). Two of them need CSS
additions that rule #8 says not to invent without you:

1. **`--sk-gradient-premium`** + `@utility bg-gradient-premium` — for `GradientText gradient="premium"`.
   Proposed value: `linear-gradient(135deg, var(--sk-premium), var(--sk-premium-dim))` (both themes,
   reuses existing tokens). `GradientText` ships `accent` (existing utility) regardless; `premium`
   variant is gated on this.
2. **`@keyframes sk-shine` + `animate-shine` / `animate-shine-slow` / `animate-shine-fast`** utilities —
   for `ShinyText`. Pure CSS, `motion-reduce:animate-none`, no new color token (band built from
   `--sk-text-dim`/`--sk-text`). Durations 6s / 3s / 1.6s proposed.

Both would be emitted by `scripts/build-tokens.ts` into the generated `theme.css` (like the existing
`bg-gradient-accent`), keeping a single source of truth.

**Status:** waiting on owner (blocks only the `premium` gradient variant and ShinyText; Counter,
Carousel, and GradientText `accent` need nothing new).

## Q14. (Agent → owner) Counter defaults & SSR strategy — confirm?

**Context.** `Counter` (`docs/component-counter.md`) server-renders the **final** value (no-JS/SEO
correct) and treats the count-up as a mount enhancement; reduced-motion shows the final value. Default
`duration` 1200ms, `easeOutCubic`. Flagged as `// DECISION(open)` in the spec.

**Status:** waiting on owner (non-blocking; defaults are sensible, changeable pre-1.0).

---

## Q15. "Make repo up to date" → "In main, look for new 5 components to add and variations for some components, let's analyze them and see what can offer us — 5 things to improve performance, etc" → "document these and go for it"

**Answer given (analysis).** Five components, four of them Base UI parts we already depend on:
**Popover**, **AlertDialog**, **Textarea** (native), **Collapsible**, **Meter**. Variants:
Button `outline`/`link`/icon-only, Badge dot, Alert dismiss, Card `interactive`, Input slots,
Avatar shape, Progress/Spinner tone, Skeleton animation. Performance: (1) Base UI rc.0 → stable
`@base-ui/react@1.8`, (2) Button off `'use client'`, (3) Counter re-rendering every frame,
(4) virtualization, (5) per-component size budgets.

**Decisions.**
- Owner approved the whole list ("go for it") → roadmap §D4. **Popover is now in scope**
  (reverses the §D "out of scope" note).
- **Button `danger` + Badge `danger`/`warning` NOT built** — they conflict with Q10 ("forget about
  danger": Sukuna has one red) and need tokens that don't exist. Kept Q10; AlertDialog confirms with
  the primary Button. Re-open with a `--sk-danger` token if wanted (D33).
- Switch stays `'use client'` (the analysis mis-flagged it; it holds state via
  `useControllableState`). Only Button moved to the server.
- Deferred inside the wave: Input start/end slots (changes the rendered DOM + where `className`
  lands — needs its own spec), Skeleton `wave` (needs a new keyframe utility → token approval like
  Q13), virtualization (new dependency → approval, Q16).

---

## Q16. (Agent → owner) Add `@tanstack/react-virtual` for virtualized Select/Combobox/Table?

**Context.** Backlog #11 / perf P4. Base UI exposes a `virtualized` flag but needs an external
virtualizer. It is the only perf item that adds a dependency (~5 kB gz, only paid by consumers who
import the virtualized parts).

**Status:** answered in Q17: **no, deferred.**

---

## Q17. "what do we need '@tanstack/react-virtual' for?" → "lets go with recommendations"

**Answer given.** Select, Combobox, Menu and Table mount every item, so thousands of options or
rows cost thousands of DOM nodes on open, filter and re-render. The `content-visibility` stopgap
only skips paint. Virtualization renders only the visible rows (~20) and recycles them, so cost
stays flat at any N. Base UI's `virtualized` flag only coordinates keyboard/highlight with an
*external* virtualizer; it doesn't virtualize by itself. `@tanstack/react-virtual` is that
virtualizer (~5 kB gz, headless, SSR-safe).

Options offered: (1) skip for now (recommended): no reported slow lists, Combobox already caps
rendered results with `maxRenderedItems`, a 1,000-option Select is a UX smell (use Combobox), and
Table is the only real case; (2) hand-roll a ~50-line fixed-row-height virtualizer for Table only;
(3) add the dependency and ship `Table.Virtualized` plus `virtualized` on Select/Combobox.

**Decision.** Option 1: **virtualization deferred**, no new dependency. Roadmap §D4 P4 → `[-]`.
Revisit when a real app has a large Table: option 2 first (no dep), option 3 if rows vary in height.

---

## Q18. "add an actions column to columns that supports options + icons in the options"

**Interpretation.** Table has no `columns` config (it is compositional), so "actions column" =
a per-row ⋯ menu column. **Decision (agent, D34):** `MenuItemOption` gains `icon`; a new
`RowActions` component (ghost icon `Button` + `Menu`) is the cell content; `Table` gains static
`ActionsHeaderCell` (visually hidden "Actions" name) and `ActionsCell`. The menu is NOT built
into `Table` so Table stays a zero-JS server component within its 2 kB size budget.

---

## Q19. "add a vertical tabs too for navigation"

**Answer / decision.** `Tabs` gains `orientation?: 'horizontal' | 'vertical'` (default horizontal,
so nothing changes for existing users). Vertical renders the tab list as a left-hand navigation
column beside the panel, with a crimson bar on the list's right border plus a `surface-2` fill for
the selected row; Base UI provides ArrowUp/ArrowDown and `aria-orientation="vertical"`. Labels
can carry an icon + text. Same component, not a new one, so the API and a11y stay shared.

---

## Q20. "thoughts on adding animations withing components? - think of ideas" → "commit what we already have and next commit add animations"

**Answer given.** Yes, CSS-only (SSR-safe, zero bundle cost) with reduced-motion fallbacks and
motion that carries meaning. Ranked ideas: (1) Tabs sliding indicator, (2) Accordion height,
(3) directional popup entrance, (4) Toast stack + swipe, (5) Meter/Progress grow-in +
indeterminate slide; polish: Checkbox tick draw, Switch overshoot, Stepper fill, Button spinner
cross-fade, Tooltip grouping, Skeleton shimmer; skip: staggered menus, View Transitions, page
effects. Proposed tokens `--sk-duration-slow` + `--sk-ease-spring`.

**Decision.** Owner: build it as the next commit → items 1–5 + both tokens (taken as approval of
the two tokens asked about in the same answer). Spec: `docs/motion.md`, roadmap §D5. While
speccing, found that Tailwind v4 `scale-*`/`translate-*` compile to the `scale`/`translate`
properties, so our `transition-[…,transform]` lists never animated them (11 components) — fixed
in the same wave.

## Q21. "let's design a 'video player' with our branding that supports basic features let's design it first"

**Answer given.** Design only, no code. Spec `docs/component-video-player.md` (Button template) +
an interactive mockup (artifact https://claude.ai/artifact/YEbDARw4mUAPviuEnRDBzv) showing the
player, every state, anatomy → tokens, hotkeys. Proposal: `VideoPlayer`, client component over the
native `<video>` (no player library, no new dependency, no new tokens); reuses Base UI `Slider`
(seek, volume) and our `Menu` (speed). v1 scope: play/pause, seek with buffered + hover time,
time, mute/volume, speed, captions (when a track exists), PiP, fullscreen (root, so controls
survive), 2.5s auto-hide, YouTube-style hotkeys scoped to the player, buffering + error states,
compact layout via container query. Out: HLS/DASH, quality, thumbnails, chapters, playlists, live,
Cast.

**Waiting on owner** (recommendation in brackets): (1) always-dark chrome via `data-theme="dark"`
on the root [yes]; (2) native `<video>`, no library [yes]; (3) the v1 scope above [as listed];
(4) `className` → frame, `ref` → `<video>` [as listed]. Also proposes a `@utility video-cues`
(`::cue` styling) in `theme.css`.

---

## Q22. "Let's also support chapters and everything in here - no need - scout and design frist https://www.nuevodevel.com/"

**Answer given.** Scouted nuevodevel.com (Nuevo plugin for Video.js: home, docs, ~80-demo
showcase, playlist, chapters + chapters-list demos). Design only, no code. Every Nuevo feature is
mapped in `docs/component-video-player.md` Appendix A and sorted into three tiers: **Tier 1 core**
(chapters as bar segments + current-chapter label, sprite/VTT thumbnail preview, quality from
`sources[].res`, captions languages + caption style, ±10s, frame step, context menu, touch
controls, AirPlay, i18n `labels`, `useVideoPlayer` hook); **Tier 2 opt-in parts** as separate
named exports (Panel with chapters/playlist/transcript, Playlist, UpNext, EndScreen, Share, Skip,
Overlay, Audio; plus resume, watch limit, sync group, floating, theater, live, picture tools,
snapshot, download, loop section, sleep timer); **Tier 3 adapters** behind `sukuna-ui/video/*`
with the vendor SDK as an optional peer (hls.js, dash.js, DRM, VAST/IMA/DAI ads, Chromecast,
VR/360, analytics). Mockup v2 updated in place (same artifact URL): interactive hero with all Tier
1 + panel/playlist/up-next/end/share/skip/context menu, and 29 state cards.

**Waiting on owner** (recommendation in brackets): (1) the three tiers [yes]; (2) Tier 3 SDKs as
optional peers behind subpaths, each approved separately [yes, hls.js first]; (3) parts as named
exports, not `VideoPlayer.Panel` [named]; (4) drop VPAID, YouTube tech, subtitle auto-translation
[drop]; (5) four delivery waves (Appendix B) [yes]; plus the open Q21 items.

## Q23. "let's go for it"

**Decision.** Owner approves every recommendation in Q21 and Q22: always-dark chrome
(`data-theme="dark"` on the root); native `<video>`, no player library; `className` → frame,
`ref` → `<video>`; three tiers; Tier 3 SDKs as optional peers behind `sukuna-ui/video/*`
subpaths, hls.js first; parts as named exports; drop VPAID, YouTube tech and subtitle
auto-translation; four delivery waves. Build starts at W1 on `feat/v1.3-wave`.

---

## Q24. "Let's think of ways to add a theme file to support various themes: add 2 more and a configurable file (if does not exist) — we currently have light/dark — let's add 2 more examples that look similar — lets design first"

**Answer given (design).** Keep the Sukuna identity (crimson, shape, type) and vary surfaces only:
**Midnight** (dark, cool blue-black) and **Paper** (light, warm cream), both AA-verified before
proposing. One file per theme (`extends` a built-in, override a few colors), a resolved CSS block
per theme with `color-scheme`, the contrast gate over every theme, and an app-side
`sukuna.themes.ts` created on demand by a CLI that compiles it to CSS with contrast warnings.
Spec: `docs/theming.md`.

**Owner decisions (asked in session):**
- Themes: **Midnight + Paper** (over two dark variants / other names).
- App config: **TS file + CLI** — `defineThemes()` in `sukuna.themes.ts`; `themes init` creates it
  if missing, `themes build` emits CSS and warns below AA (over a CSS-only template or JSON).
- **Add `system` mode** following `prefers-color-scheme`. Agent refinement: opt-in via
  `data-theme="system"`; a page with no attribute stays dark (changing it would be a visible default
  change → major).

## Q25. (Agent → owner) Add a `sk-ticker` keyframe + `animate-ticker` utility for the VideoPlayer news ticker?

**Context.** Nuevo's "news ticker" overlay scrolls text across the bottom of the video. CSS-only
motion (motion.md rule 1) needs a new keyframe in the generated `theme.css` (via
`scripts/build-tokens.ts`), e.g. `@keyframes sk-ticker { to { translate: -100% 0 } }` +
`@utility animate-ticker { animation: sk-ticker 24s linear infinite }`, with a `motion-reduce:`
fallback that stops and wraps the text. Like the shine keyframes (Q13) that's a token-level
addition, so it waits for approval. `VideoPlayerOverlay` shipped `card` / `banner` / `plain`
without it.

**Status:** waiting on owner (blocks only `VideoPlayerOverlay variant="ticker"`).

## Q26. (Agent → owner) Which VideoPlayer SDK adapter next, if any?

**Context.** W4 shipped the `engine` seam and the hls.js adapter (`sukuna-ui/video/hls`, hls.js as
an optional peer), the first SDK approved in Q23. Each remaining Tier 3 adapter adds its own
optional peer and needs its own yes:

| Adapter | Peer dependency | What you get |
|---|---|---|
| DASH | `dash.js` | MPEG-DASH streams + levels via the same `engine` seam |
| Ads | Google IMA SDK (script) / a VAST parser | pre/mid/post-rolls, skip, VMAP, with our champagne ad chrome |
| Cast | Google Cast SDK (script) | Chromecast button + "Playing on …" state |
| VR / 360° | `three` | WebGL renderer with drag / arrow-key look-around |
| Analytics | none | one normalized `onAnalytics` event stream (no SDK — could ship without approval) |

**Status:** waiting on owner. Nothing blocks the shipped waves.

---

## Q27. "thoughts on separating video player as its own dependency? but keeping same branding + configurable" → "I wanna share the video player to other projects, but not necessarily use sukuna's components — sometimes I just need the videoplayer"

**Answer.** Bundle size is not the reason: consumers already tree-shake, and size-limit budgets
each export. The real reasons are reuse in apps that don't use Sukuna, plus release churn (each
player wave bumps `sukuna-ui`). The player's coupling is small: `Button`, `Spinner`, `tv`,
`useControllableState` and 13 `--sk-*` tokens. So it can stand alone with **no dependency on
`sukuna-ui`**:

- Small copies of the icon button, spinner, `tv` and `useControllableState` move into the player
  package.
- It has its own `--vp-*` CSS variables. Each defaults to today's Sukuna dark value, so the
  player looks the same out of the box. Other apps override a few of them (the proposed set is
  in Q28).
- It ships a **precompiled, prefixed `video.css`** (Tailwind `prefix(vp)`), so the host app needs
  neither Tailwind nor Sukuna, and the player's classes can't clash with the host's.
- A `classNames` prop takes one class per part of the player, for one-off overrides. `labels`
  and `engine` move over unchanged.
- `sukuna-ui` re-exports `VideoPlayer` from the new package, so today's imports keep working
  (no breaking change).

**Owner answers:**

1. Package name `@sukuna-ui/video`: **yes**.
2. New `--vp-*` variables need approval: **sure**. The exact list and values are in Q28.
3. Default look: **dark** (Sukuna dark values, same as today's always-dark chrome).

**Decision.** Move to a Bun-workspaces monorepo: `packages/ui` (`sukuna-ui`) and
`packages/video` (`@sukuna-ui/video`, with hls moving to `@sukuna-ui/video/hls`). This reverses
Q3's single-package decision for the player only. Phased plan (each phase is its own PR, ends
green, no code until approved):

1. **Workspace:** set up Bun workspaces, move the library into `packages/ui` unchanged, make
   Changesets, size-limit, api-diff, coverage, `docs:build` and the showcase run per package.
   No API change.
2. **Detach:** give the player its own copies of the icon button, spinner, `tv` and
   `useControllableState`, with no imports from `sukuna-ui`, and move it plus the hls adapter
   into `packages/video`.
3. **Theme layer:** swap the `--sk-*` utilities in the player for `--vp-*` (Q28), build the
   prefixed `video.css`, and add the `classNames` slots. Keep the `sk-video:` / `sk-playlist:`
   localStorage keys so saved resume points survive.
4. **Re-export:** `sukuna-ui` depends on `@sukuna-ui/video`. It keeps exporting `VideoPlayer`,
   its parts and `sukuna-ui/video/hls` as aliases. Docs, llms and the README get a "use it
   standalone" section.

Semver: phases 1, 2 and 4 are no-change for `sukuna-ui` consumers (patch). `@sukuna-ui/video`
starts at `0.1.0`. Standalone consumers must import `@sukuna-ui/video/video.css`, which goes in
its README.

**Progress (2026-09-28, owner: "go start working non-stop").** Phases 1–4 are built on branch
`docs/video-standalone-plan` (see the roadmap log). Before the first publish, two owner-only steps:
approve or rename the `--vp-*` names (Q28), and create the `@sukuna-ui` scope on npm (org
`sukuna-ui`) so `@sukuna-ui/video` can be published; `sukuna-ui` then depends on it.

---

## Q28. (Agent → owner) Approve the `--vp-*` variable set for `@sukuna-ui/video`?

**Context.** These replace the 13 `--sk-*` colors, plus the fonts, radii and shadow the player
uses today. The defaults are the current Sukuna **dark** values, so nothing changes visually.
`--vp-*` is the player's own public theming surface (it is not a `--sk-*` token). Renaming one
later is a major bump for `@sukuna-ui/video`.

| Variable | Default (Sukuna dark) | Used for |
|---|---|---|
| `--vp-color-accent` | `#FF3B4E` | progress, active items, focus ring |
| `--vp-color-accent-deep` | `#B01221` | audio-mode backdrop + visualizer |
| `--vp-color-accent-glow` | `rgba(255, 59, 78, 0.6)` | play-button, seek-thumb and edge glows |
| `--vp-color-on-accent` | `#FFFFFF` | text/icons on accent |
| `--vp-gradient-accent` | `linear-gradient(135deg, #D8253A, #B01221)` | big play button, action buttons, audio art |
| `--vp-color-premium` | `#E8DCC4` | loop A–B range, "champagne" caption colour |
| `--vp-color-well` | `#000000` | player background, thumbnails, scrims |
| `--vp-color-surface` | `#141416` | menus, toasts, panels (at 95%) |
| `--vp-color-surface-2` | `#1C1C20` | inputs, audio art frame |
| `--vp-color-line` | `rgba(255, 255, 255, 0.1)` | borders |
| `--vp-color-line-soft` | `rgba(255, 255, 255, 0.06)` | dividers, rail tracks |
| `--vp-color-text` | `#F4F1EC` | primary text/icons |
| `--vp-color-text-dim` | `#9A948A` | time, secondary labels |
| `--vp-font-sans` | system stack (`-apple-system, …, sans-serif`) | UI text |
| `--vp-font-display` | `"Archivo"` + the sans stack | titles, big numbers |
| `--vp-font-mono` | Tailwind default mono stack (`ui-monospace, SFMono-Regular, …`); Sukuna has no mono token today | embed-code box, hotkey keys |
| `--vp-radius-sm` / `-md` / `-lg` / `-pill` | `8px` / `12px` / `16px` / `999px` | controls / menus / player / pills |
| `--vp-shadow-card` | `0 30px 60px -24px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.06)` | player, menus, tooltips (compiled in; not runtime-overridable) |
| `--vp-color-focus-ring`, `--vp-color-text-faint`, `--vp-color-bg` | `#FF3B4E`, `#8C8479`, `#0A0A0B` | focus ring, faint text, end-screen backdrop |
| `--vp-text-xs` … `--vp-text-3xl` | `11px` … `34px` | type scale |
| `--vp-leading-*`, `--vp-tracking-*`, `--vp-duration-*`, `--vp-ease-sukuna` | Sukuna values | line height, letter spacing, motion |

Inside `sukuna-ui`, `theme.css` sets these from the dark `--sk-*` tokens, scoped to the player
root and not `:root`, so the player stays on the dark palette in light apps, as now. A custom
Sukuna accent then flows into the player automatically.

**Update (phase 3 built, 2026-09-28).** Colours are named `--vp-color-*` rather than the first
proposal's `--vp-accent`: the stylesheet is built with Tailwind `prefix(vp)`, which emits every theme
value as `--vp-<namespace>-<name>` (`--color-accent` → `--vp-color-accent`, `--radius-lg` →
`--vp-radius-lg`). Using those names directly needs no glue layer and can't collide. Values are
unchanged (Sukuna dark). Implemented with a `// DECISION(open): Q28` note in
`packages/video/src/styles/video.css`; renaming before the first publish is free.

**Status:** waiting on owner — approve these names/values (or rename) before `@sukuna-ui/video`
is first published.

---

## Q29. "can you publish it to npm" → "can you do it if i give you npm access?" → "move sukuna-ui repo to sukunagg org — you will re-publish the ui repo under @sukunagg/ui & @sukunagg/video packages... they will be public that's fine" → GitHub target "this org: https://github.com/sukuna-gg" → "sukunagg was created in npm"

**Answer / what was done (2026-09-29).**

- **Repo:** transferred `arielplas/sukuna-ui` → **`sukuna-gg/sukuna-ui`** (GitHub redirects the old
  URL; the `NPM_TOKEN` secret moved with it). Local `origin` points at the new URL. (`github.com/SukunaGG`
  is a user account, so the org `sukuna-gg` was confirmed with the owner first.)
- **Packages renamed:** `sukuna-ui` → **`@sukunagg/ui`**, `@sukuna-ui/video` → **`@sukunagg/video`**
  (npm org `sukunagg`, public). Every package-specifier use was renamed — imports, CSS paths
  (`@sukunagg/ui/theme.css`), install lines, TSDoc examples, README/badges, generated llms docs,
  examples, CI, repo links. "sukuna-ui" stays as the project/brand name in prose and as the repo
  name; historical logs (this file's older entries, the roadmap log, ai-decisions, CHANGELOG) keep
  the old names as written.
- **Versions:** `@sukunagg/video` **0.1.0** (first release) and `@sukunagg/ui` **0.10.0**, continuing
  `sukuna-ui` 0.9.2's line so the changelog history carries over.
- **Published from the owner's machine** (`bun publish`, owner logged in to npm themselves; no
  credentials passed to the agent). Local publishes skip `publishConfig.provenance` (provenance
  needs CI's OIDC); later releases go through the Changesets workflow, which needs `NPM_TOKEN` to
  have publish rights on the `@sukunagg` scope.
- **Old `sukuna-ui` on npm:** left as is (0.9.2), not deprecated — waiting on the owner.
- **Q28 variable names** shipped as built (`--vp-color-*` …); renaming now is a breaking release.

**Decision.** Package names are `@sukunagg/ui` and `@sukunagg/video`; the repo lives at
`sukuna-gg/sukuna-ui`.

---

## Q30. "what are the states of pull requests?" → "merge #21 - what about #13 & #12?" → "1"

**Answer.** #21 (standalone `@sukunagg/video` + rename) was green and got merged. #12 (variants
wave) and #13 (Ember Gate brand kit, stacked on #12) were still open from 2026-09-22, 38 commits
behind `main`, none of their work in `main`; a trial merge hit 20 conflicts (the move to
`packages/ui/src/` and the v1.3 wave's rewrites of Card, Tabs, Toast, Table, Combobox). Options:
(1) port both onto today's `main` as fresh PRs, (2) port only the brand kit, (3) close both.

**Decision (owner: "1").** Port both. The variants wave is re-applied commit by commit on
`feat/variants-wave-v2` (paths rewritten, conflicts reconciled with v1.3: Card keeps v1.3's
`interactive` and gains `tone` + `glow`; Tabs `variant`/`size`/`fitted` sit alongside
`orientation`, with `pill`/`fitted` horizontal-only and vertical `md` rows kept at 36px; Toast
`tone` on top of the stacked-deck motion; Table density/striped/hoverable beside the actions
column). The brand kit follows as a PR stacked on it; #12 and #13 are closed as superseded. While
porting, found and fixed a docs regression from the rename (VideoPlayer missing from the generated
docs).

## Q31. "Let's design components for graphs, stats, etc... can you help me with that? ask me more questions if needed"

**Answer.** Asked eight scoping questions in two rounds; the owner picked every recommended option
and the widest scope:

- Use cases: gaming/player stats, product/SaaS dashboards, marketing pages, generic, all four.
- First-wave components: StatTile, Sparkline, Bar + Line/Area charts, Donut / RadialGauge / Heatmap.
- Interaction: **SSR + hover tooltips**: server-rendered SVG readable with JS off; a small
  `'use client'` layer adds crosshair, tooltips and arrow-key focus. No zoom/brush.
- Colors: **new categorical chart tokens** (crimson first), validated for CVD + contrast in both themes.
- Package: **new `@sukunagg/charts`** workspace package (like `@sukunagg/video`); StatTile and
  Sparkline stay in `@sukunagg/ui`.
- Engine: **own SVG + `d3-scale` / `d3-shape`** (pure math only, no d3 DOM code).
- Deltas: up = `--sk-success`, down = a **new `--sk-danger`** distinct from the accent; `invert`
  prop for metrics where down is good.
- Deliverable: **visual mockup first, then docs**.

**Decision.** Mockup published (private artifact
https://claude.ai/artifact/Ta95RMu8WwVn6cJHjv49A6). Proposed tokens (dark / light), all run through
the dataviz palette validator against `surface`, `surface-2` and `bg`:
`--sk-chart-1..6` = crimson `#FF3B4E`/`#D8253A`, blue `#4C8EEF`/`#3072D0`, teal `#00A699`/`#008A7E`,
amber `#C98000`/`#A96100`, violet `#A072E6`/`#8557C8`, lime `#749F2B`/`#5A8400`;
`--sk-chart-other` `#6F6B63`/`#B5B0A6`; `--sk-danger` `#FF7A59`/`#B4380A`;
`--sk-heat-1..4` dark `#941424 #B3363D #D25456 #F17070`, light `#FF908E #E66E6D #C04B4E #9A282F`.
The order is fixed: neighbouring slots pass CVD ΔE ≥ 13.4 and normal-vision ΔE ≥ 16.4, and
slots 1-3 pass all-pairs. Crimson beside amber fails under deuteranopia, so donuts cap at three
colored segments + Other. No docs or code until the owner approves the mockup (see waiting table).

## Q32. "ask the agent that is developing sukuna-gg-web more context about the project to know what else we need" → "Ok, you make the review for sukuna-gg-web project and see what else we could use..."

**Answer.** Questions sent to the two sukuna-gg-web sessions expired unapproved, so the agent reviewed
`Documents/Yo/sukuna-gg-web` (branch `feat/live-tab`, @sukunagg/ui 0.10.0, Next 16 App Router)
read-only. Findings that change Q31's plan:

- Hand-built charts to replace: `PlacementHistogram` (8 bars colored per bar by placement bucket,
  value on each cap, "Show as a table"), `GoldGraph` (gold difference around 0, blue above / red
  below), and the Scoreboard damage bar (a bar inside a table cell, scaled to the lobby max). A
  "Placement over time" chart is a `TODO(lane B)` (needs an inverted 1-8 y axis).
- Charts must take **caller colors** per series and per datum: the app owns game palettes
  (`--t-first/top4/bot`, `--l-blue/red`, `--l-win/loss`, unit-cost `--t-c1..5`).
- StatTile as used today: label, value, a **caption** line (W/L record, K/D/A) and a **value tone**
  from thresholds; values in Archivo 900 italic (`t-tile-val`), not plain sans. No deltas yet.
- No live charts: Riot policy limits live views to loading-screen data; pages refresh with
  `router.refresh()` polling, so charts only need to survive a server re-render.
- No current use for Donut, RadialGauge or Heatmap.
- Non-chart gaps: empty/error state panel (`StatePanel`), password reveal on Input, a pulsing
  "live" Badge dot, a small icon set (chevron, clock, lock, sun/moon drawn inline), Table that
  scrolls sideways and is focusable only while it overflows (`Scrollable`).

**Follow-up.** "show proposal with examples of empty data too" → mockup v4: every example switches
between data / missing values / empty / loading, plus six missing-data rules. Open questions on
the page and the owner's answers (2026-10-05): (1) StatTile values in the display face by
default? **"yes"**; (2) game colors stay in the app and are passed to charts? **"passed to
charts"**; (3) approve the token values? **"yes"**. Then **"lgtm"**.

**Decision.** Revised plan approved: wave 1 (tokens, StatTile with caption/tone, Sparkline,
EmptyState, Input `reveal`, Badge `pulse`), wave 2 (`@sukunagg/charts`: BarChart with per-bar
colors, Line/Area with baseline/reverse/gaps, DataBar), wave 3 (icons, Table `scroll`); Donut,
RadialGauge, Heatmap later. Tokens recorded in `tokens.md`; roadmap §D8; mechanics in D36.

**Then** "lets start working on it bb" (2026-10-05) → wave 1 specs approved and built (roadmap §D8).

## Q33. "what's left?" → "Use your suggestions"

**Answer.** The suggested order was: owner reviews and pushes the wave 1 branch, then wave 2 specs;
plus a stale roadmap header and the `bun.lock` drift on `main` (`@sukunagg/video ^0.0.0` vs
`package.json`'s `^0.1.0`). Also recommended earlier: `@sukunagg/charts` peers on
`@sukunagg/ui` instead of being standalone.

**Decision.** Adopted the recommendations: the charts package **peers on `@sukunagg/ui`**. Wave 2
specs written (`charts-and-stats.md` §5, `component-bar-chart.md`, `component-line-chart.md`,
`component-data-bar.md`) on `feat/charts-wave2-specs` (stacked on the wave 1 branch); roadmap
header fixed; lockfile fixed on its own branch. **Not done:** pushing — CLAUDE.md requires the
owner's literal "push"; the visual review is the owner's.

**Then** "Build the rest of the components non-stop" (2026-10-05) → treated as approval of the wave 2
specs and of building waves 2, 3 and the later trio without stopping. The scale-math gate (Q33b)
became an agent decision: in-house math instead of d3 (D37), because the per-file build can't
bundle ESM-only d3 for Node 18 CommonJS consumers.

## Q34. "lgtm ship it"

**Answer.** Read as the owner's sign-off on the open Q33 items: the visual review of the charts &
stats components, the in-house scale/path math instead of d3 (D37), and pushing. Pushed
`feat/charts-wave1-specs`, `feat/charts-wave2-specs` (stacked on it) and
`chore/bun-lock-video-range`, and opened their PRs. Merging, the Version Packages PR, release tags
and npm publishing stay with the owner (CLAUDE.md non-negotiable 2).

**Decision.** Charts & stats waves 1–3 + the later trio approved as built; D37 accepted.

## Q35. "Published failed... i think we forgot to update the npm version ... check ci"

**Answer.** The versions were right: the Release run bumped `@sukunagg/ui` 0.10.0 → 0.11.0 and
`@sukunagg/charts` 0.0.0 → 0.1.0 on the `changeset-release/main` branch (the "must depend on the
current version" lines are warnings, gone once ui is 0.11.0). It failed at the step after:
**"GitHub Actions is not permitted to create or approve pull requests"** — every Release run since
the repo moved to the `sukuna-gg` org (#22, 2026-09-29) has failed there, because the org/repo
setting is off by default. A second blocker was waiting behind it: the repo was renamed to
`sukuna-gg/sukunagg-ui`, but every `package.json` still said `sukuna-gg/sukuna-ui`, and npm
provenance rejects a publish whose `repository.url` doesn't match the repo that built it.

**Decision.** Repo URLs moved to `sukuna-gg/sukunagg-ui` everywhere except the history logs
(`fix/release-repo-rename`). The owner turns on **Allow GitHub Actions to create and approve pull
requests** (org → Settings → Actions → General → Workflow permissions, then the same box on the
repo); the next push to `main` then opens the Version Packages PR. Added both to
`docs/releasing.md` one-time setup.

## Q36. "Thoughts on styling the scrollbar ?" → "Can you add variants? - Add a crimsom variant - run storybook with them"

**Answer.** Two layers. (1) Native scrollbars: nothing in `packages/ui/src/styles` sets
`color-scheme`, so on Windows Chrome/Edge every native scrollbar under the dark theme (Select/Combobox
popups, Table `scroll`, chart frames, the page) is the OS light-grey bar; `color-scheme: dark|light`
per theme fixes it with zero JS, and an opt-in `@utility` using the standard `scrollbar-width` /
`scrollbar-color` properties (not `::-webkit-scrollbar`) would theme them further. The page
scrollbar stays the app's call. (2) `ScrollArea` stays the opt-in custom scrollbar; its idle
neutral thumb (`bg-line`) is ≈1.3:1 on `surface`, below its own ≥3:1 checklist item. Then built
the crimson variant as ScrollArea `tone="accent"` with `Accent` and `Tones` stories.

**Decision.** ScrollArea gets `tone: 'neutral' | 'accent'` (default `neutral`, unchanged look).
Named `accent`, not `crimson`, to match Badge/Chip `tone` — the library calls its one red `accent`
in every color prop. `color-scheme` + the scrollbar utility and the neutral-thumb contrast are
proposed, not built (see waiting table).

## Q37. "i like it... ship it"

**Answer.** Read as the owner's sign-off on ScrollArea `tone="accent"` as built (name included) and
on pushing, as in Q34. Pushed `feat/scroll-area-tone` and opened its PR; merging, the Version
Packages PR and publishing stay with the owner (CLAUDE.md non-negotiable 2). The Q36 proposals
(`color-scheme`, the native-scrollbar utility, the neutral-thumb contrast) stay open.

**Decision.** ScrollArea `tone: 'neutral' | 'accent'` approved as built.

## Q38. "What other impressive components can we add? can you scout more component libraries? not basic stuff but really cool thing with animations / particles, etc... idk"

**Answer (scouting, 2026-10-07).** Scouted Magic UI, Aceternity, Motion Primitives, Cult UI, Skiper UI,
React Bits (re-scout), Animata, Eldora UI, Fancy Components, Hover.dev, tsParticles, plus modern
CSS (`@property`, `offset-path`, `@starting-style`, scroll-driven, View Transitions, anchor
positioning, trig/`sibling-index()`) and game-client/esports patterns. Findings:

- **Licenses.** Adaptable with attribution (MIT): Magic UI, Motion Primitives, Cult UI, Animata,
  Eldora, Fancy. **Ideas only, clean-room rewrite:** React Bits (MIT + Commons Clause — bans
  redistributing the components in a package), Aceternity (no redistribution "regardless of
  modifications"), Hover.dev and Skiper (proprietary), pokemon-cards-css (GPL-3.0); Shadertoy-sourced
  shaders are often CC BY-NC-SA.
- **Industry gap.** Almost none of them honor `prefers-reduced-motion`, pause offscreen, or free
  their WebGL context; several break hydration (`Math.random` in render) or hide text from AT.
  Magic UI's Floating 3D Particles and Retro Grid are the only good lifecycle templates.
- **CSS-only reach.** Component-scale wow (border beam, rank reveal, loot reveal, ready-check ring,
  XP burst, glitch, avatar frame, retro grid) fits today's `docs/motion.md` rules. Ambient particle
  fields (hundreds of particles), shader backgrounds and pointer-driven holo tilt do not.
- **Engines.** A hand-rolled Canvas2D field (~2–4 kB, no deps) beats tsParticles v4 (15–30 kB, its
  reduced-motion plugin isn't in `slim`/`basic`). Skip three.js/postprocessing (~300 kB) and matter-js.

**Proposal.** Two tiers: CSS-only showpieces in `@sukunagg/ui` under the current motion rules, and a
new opt-in **`@sukunagg/fx`** package (precedent: `@sukunagg/video`, Q27) for canvas/WebGL client
islands, all on one shared loop hook (reduced motion → static frame, IntersectionObserver +
`visibilitychange` pause, DPR cap, context loss, SSR CSS poster). Waiting on the owner (table below).

## Q39. "Show me mock ups" → "show me whats done" → "holy shit, let's build the components"

**Answer.** Built 14 live prototypes (the "Sukuna FX Lab" artifact: every candidate in both themes,
with a reduced-motion toggle), each written from scratch and reviewed in Chromium, Firefox and
WebKit. The owner's reaction is read as approval of the set and of the Q38 two-tier plan.

**Decision.** Build all 14. **Q38(a) approved:** new opt-in package `@sukunagg/fx` for ParticleField,
HoloCard, FlowField, Lightning and BracketBeam; `@sukunagg/ui` stays CSS-only and gains RetroGrid,
BorderBeam, RankReveal, MatchFound, LootReveal, XpLevelUp, AvatarFrame, ScrambleText and GlitchText.
**Q38(b):** all 14, shipped as two PRs (ui showpieces; fx package). **Q38(c) still open:** LootReveal
maps rarities onto existing tokens (`text-faint`, `chart-2`, `chart-5`, `premium`) as a
`DECISION(open)` default — no new tokens until the owner approves rarity colors.

---

## Decisions recorded so far

| Topic | Decision |
|---|---|
| Design source | Pomo Design System (Sukuna language) as base |
| Package name | `sukuna-ui` → **`@sukunagg/ui`** (+ `@sukunagg/video`, `@sukunagg/charts`, `@sukunagg/fx` (Q39)), repo `sukuna-gg/sukunagg-ui` (Q29, renamed Q35) |
| v1 components | Text, Badge, Card, Button, Input, Checkbox, Switch, Tooltip, Dialog, Select |
| Docs language | English |
| Package layout | Single package; **except** the VideoPlayer, which becomes standalone `@sukuna-ui/video` in a Bun-workspaces monorepo (no `sukuna-ui` dependency, `--vp-*` vars, dark default; `sukuna-ui` re-exports it) (Q3, Q27) |
| Theming | `data-theme="dark"` (default) / `"light"` via CSS vars |
| Consumer target | Any React 18+ app (Vite, Remix, Next) |
| Styling engine | Tailwind v4 + `tailwind-variants` |
| Dev environment | Storybook 10 (`docs/storybook.md`) |
| Versioning | Changesets + semver, `0.x` until v1 components ship, `latest`/`next` channels, breaking-change table in Q6 |
| Testing | Single runner `bun test`: Testing Library + jest-axe + SSR helpers for unit; Playwright library inside `bun test` for browser (Q8, Q11, `docs/testing.md`) |
| Coverage | ≥ 90% lines/functions/statements, enforced by `bunfig.toml` threshold and CI (Q9) |
| Button variants | `primary`, `secondary`, `ghost` (+ `outline`, `link` in v1.3, Q15); no `premium`, no `danger` (Q10, reaffirmed Q15) |
| Popover | In scope from v1.3 (Q15) — reverses roadmap §D |
| Headless base | `@base-ui/react` stable (1.8+) since v1.3 (Q15, D33) |
| Theming | Built-ins dark/light + **midnight**/**paper**; opt-in `system`; apps extend via `sukuna.themes.ts` + `sukuna-ui themes init\|build` (Q24, `docs/theming.md`) |
| Motion | CSS-only, reduced-motion fallbacks, `docs/motion.md`; new tokens `--sk-duration-slow`, `--sk-ease-spring` (Q20) |
| Virtualization | Deferred, no `@tanstack/react-virtual` for now; revisit on a real large-Table need (Q17) |
| VideoPlayer | Native `<video>`, always-dark chrome, Nuevo parity in three tiers, parts as named exports, SDKs as optional peers (hls.js first), four waves (Q21-Q23) |
| Light palette | Approved as proposed in `tokens.md` (Q10) |
| Charts & stats | `@sukunagg/charts` (peers on `@sukunagg/ui`; server-rendered SVG/HTML sized by CSS, in-house scale/path math (D37), client tooltip island); StatTile, Sparkline, EmptyState in `@sukunagg/ui`; chart/heat/danger tokens **approved**; app colors passed as props; StatTile display face by default; waves in roadmap §D8 (Q31, Q32) |
| Showpieces & FX | Nine CSS-only showpieces join `@sukunagg/ui`; canvas/WebGL/pointer effects live in a new opt-in `@sukunagg/fx` (one shared loop: reduced-motion still frame, offscreen/hidden pause, DPR cap, SSR CSS poster, no runtime deps). Ideas from React Bits/Aceternity/Hover.dev/Skiper/pokemon-cards-css are reimplemented from scratch, never copied (Q38, Q39) |
| Status tracking | `docs/roadmap.md` living board; agents update it in the same commit as the work (rule 9) |
| Versioning enforcement | CLAUDE.md + CI classifiers (API diff, visual, token, peer) + human-only merge/publish (Q7) |

## Questions still waiting on the owner

| # | Question | Status |
|---|---|---|
| Q12 | Light-mode `--sk-shadow-card` value — approve the proposed softer shadow or supply one? | Proposed value in use; awaiting approval. Non-blocking (patch to change pre-1.0). |
| Q13 | Approve `--sk-gradient-premium` token + `bg-gradient-premium` and the `sk-shine` keyframe + `animate-shine*` utilities for the React Bits-inspired wave? | Specs written; blocks only GradientText `premium` + ShinyText. Proposed values in Q13. |
| Q14 | Confirm Counter's SSR-final-value strategy and defaults (1200ms, easeOutCubic)? | Spec written; non-blocking, sensible defaults. |
| Q25 | `sk-ticker` keyframe + `animate-ticker` utility for the VideoPlayer news-ticker overlay? | Proposed; blocks only the ticker variant. |
| Q26 | Next VideoPlayer SDK adapter (dash.js, IMA/VAST ads, Cast, three.js VR) — each a separate optional peer? | Waiting; hls.js shipped. |
| Q28 | Approve the `--vp-*` variable set (names + Sukuna-dark defaults) for `@sukuna-ui/video`? | Shipped as built with the first `@sukunagg/video` publish (Q29); renaming now = breaking release. |
| Q36 | Ship `color-scheme` per theme + an opt-in themed native-scrollbar `@utility`? Raise ScrollArea's neutral idle thumb (≈1.3:1) to ≥3:1 or relax that checklist item? | Proposed; `tone="accent"` built. Neutral-thumb change is visual (patch on `0.x`). |
| Q38 | (a) Approve an opt-in `@sukunagg/fx` package for canvas/WebGL effects (`@sukunagg/ui` stays CSS-only)? (b) Which showpieces first? (c) Rarity-tier tokens for Loot/Rank reveals? | (a) and (b) answered in Q39 (fx approved; build all 14). (c) open: rarity tokens — LootReveal uses existing tokens meanwhile. |
| Q39 | HoloCard: keep the card flat at rest (crisp in Firefox), or restore the mockup's idle sway (soft in Firefox while it moves)? | Built flat at rest, `DECISION(open)` (D39). Non-blocking; reversing is two keyframes. |
