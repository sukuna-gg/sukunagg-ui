# AI decisions log

Decisions the AI agent made on its own while building `sukuna-ui`, because the plan left
them open, a spec was wrong, or a value was missing. Each entry: what was decided, why, and
how to reverse it. Owner-made decisions live in `docs/questions.md`; this file is only the
agent's own calls. Newest first.

> If you disagree with any entry, say so — most are cheap to change (noted per entry).

---

## D41 — Toolkit wave: how the seven specs keep the library's rules

> **Poll as built (Q43):** the write-in island checks "Other" on pointer-down and typing, not on
> focus (tabbing through the field on the way to Vote silently changed a keyboard user's vote);
> results keep the app's option order instead of sorting (hidden results never leak a ranking);
> bars animate `scale` (compositor-only) rather than width; 3.56 kB against a 1.5 kB target, since
> four states, twelve labels and the form + results don't fit lower. Arbitrary values use `--sk-*`:
> `--color-*` resolves at `:root` and ignores a nested `data-theme` (found by the Poll builder; the
> same fix went into Timeline in #35).

- **Decision:** (1) **Kbd takes a `platform` prop** (`'mac' | 'other' | 'auto'`). `auto` renders the
  non-Mac keys on the server and swaps ⌘/⌥ in a tiny island after mount (`useSyncExternalStore`
  with a non-Mac server snapshot), so a Mac never gets a hydration warning; apps that read the
  user-agent header pass the platform and get an exact first paint. (2) **Prose uses `:where()`
  descendant selectors**, so a component inside an article (Table, Kbd, Alert) keeps its own styles
  without `!important`. (3) **FileUpload writes prepared files back into the real input** with a
  `DataTransfer`, so a plain form submit sends the resized JPEG, not the 12 MB original; the input
  stays a real `type="file"` and works before JS. (4) **Poll is a server-rendered `<form>`** with a
  one-job island (focusing the write-in selects its radio); percentages use largest-remainder
  rounding so they add to 100. (5) **CommandPalette uses Base UI Autocomplete's `inline open` mode**
  inside Base UI Dialog (verified in `@base-ui/react` 1.8 types) instead of a hand-rolled listbox,
  with accent-insensitive fuzzy matching ("bahia" finds "Bahía"). (6) **Double elimination is
  specced in `docs/bracket-beam-double-elimination.md`**, not in `component-bracket-beam.md`, because
  that doc feeds the generated `llms.txt`/README and must not advertise an unshipped API; the PR that
  builds it merges the two. (7) **Three new icons** (Camera, Upload, Image) for FileUpload, added to
  the icon set rather than inlined. (8) **Built (wave A):** Timeline's halo uses Tailwind's built-in
  `animate-pulse` instead of a new keyframe, so `theme.css` doesn't change; Prose sizes sit on the
  14/16/18px text tokens instead of the mockup's 13.5/15/17px.
- **Why:** the mockup could ignore SSR, forms without JS and generated docs; the specs can't.
- **Reverse:** (1) always render the island, or drop `auto`; (3) leave the original file in the
  input and require `onUpload` for resizing; (4) a client widget; (6) write it straight into
  `component-bracket-beam.md` and accept that the generated docs list it early.

## D40 — Calendars: how the six specs meet the SSR and contrast rules

- **Decision:** (1) **Selected days use `bg-gradient-accent`, not flat `--sk-accent`.** White on dark
  `#FF3B4E` is 3.5:1 and fails AA for 13px text; the gradient's lightest stop `#D8253A` is 4.95:1
  and matches Button `primary`. The approved mockup used the flat color. (2) **An inline Calendar
  with no date to anchor on renders an empty frame first** (`aria-busy`) and fills the month after
  mount, instead of reading the server clock: a cached server render days older than the hydration
  would mismatch. Pickers never hit this (their popovers mount after hydration). (3) **Week start
  from a CLDR table**, not `Intl.Locale#getWeekInfo` (missing in some engines), so server and
  browser agree. (4) **`suppressHydrationWarning` on exactly two text spans** (DateTimePicker's
  trigger time, DateRangePicker's `formatRange` text): ICU versions differ between Node and browsers
  ("p.m." vs "p. m.", thin spaces around the dash). Nothing else suppresses. (5) **MonthView's "+N
  more" uses the native `popover` attribute** (lowercase attributes so React 18 passes them through)
  when there is no `dayHref`, keeping MonthView a zero-JS server component. (6) **Utilities in
  `packages/ui/src/utils/date/`**, not a fourth file per component, because the server components
  reuse them. (7) **DateTimePicker's `timeZone` is required**: a silent browser-zone default would
  recreate the bug it replaces. (8) **Built (Q43):** the year and month pickers are labelled groups
  of `aria-pressed` buttons instead of `role="grid"` divs (simpler, lint-clean, same keyboard); the
  day grid keeps the APG `<table role="grid">` with a justified Biome suppression. DateRangePicker
  collapses to one month on screens under 640px (`matchMedia`), because the popup's own width comes
  from its months. Calendar measured 5.55 kB (target was 5 kB) with the pickers; budget 6.2 kB.
  `.claude/worktrees` (local agent worktrees) is excluded from Biome so local checks pass while
  builders run.
- **Why:** the specs have to hold the library's rules (AA contrast, zero hydration warnings, server
  components stay JS-free) where the mockup could ignore them.
- **Reverse:** (1) swap the selected-day class to `bg-accent` (fails AA in dark); (2) require
  `today` or `defaultMonth` instead; (4) drop the attribute and accept rare warnings; (5) a small
  client island; (7) default to `'UTC'`.

## D39 — @sukunagg/fx: one shared loop under five client islands

- **Decision:** (1) **One loop for every effect** (`packages/fx/src/internal/loop.ts`): a CSS poster
  renders on the server; the island pauses offscreen (IntersectionObserver) and in hidden tabs,
  caps the pixel ratio, survives a lost GPU context and a StrictMode double mount, tolerates a null
  context (happy-dom), and draws one still frame under reduced motion, switching live both ways.
  (2) **The motion setting is never read inside a frame.** Reading `matchMedia(...).matches` per
  frame made Chromium swallow the `change` event, so a running effect never reached `still`; the
  loop now reads it only when it re-evaluates its state (regression test: zero reads per frame).
  (3) **Always-dark stages** (ParticleField, FlowField, Lightning) pin `data-theme="dark"` like
  VideoPlayer; HoloCard and BracketBeam follow the theme. (4) **No effect engines:** hand-written
  Canvas2D, one WebGL1 shader and measured SVG; deps match `@sukunagg/charts` (clsx, tailwind-merge,
  tailwind-variants). (5) **One CSS module per component** in `packages/fx/src/styles/`, assembled into
  `styles.css`. (6) **FlowField budget 4.5 → 4.75 kB:** the review's perf fixes (cached still frame,
  debounced rebuild, rescaled trails, 1x store) cost 107 B and cut a live reduce switch from 118 ms to
  21 ms. (7) **HoloCard is flat at rest** instead of the mockup's idle sway: any sway blurs the card in
  Firefox at DPR 2. `DECISION(open)` for the owner.
- **Why:** the package exists for effects the CSS-only rules can't do, so its loop must carry the
  guarantees those rules gave for free (no work offscreen, reduced motion, SSR).
- **Reverse:** (6) lower the budget once FlowField is trimmed; (7) re-add the sway wrapper and its two
  keyframes in `holo-card.css` (see `docs/component-holo-card.md` §11).

## D38 — Showpieces wave (ui): how nine animated components fit the library

- **Decision:** (1) **One motion module per component** in `packages/ui/scripts/motion/<name>.ts`,
  stitched into the generated `theme.css` by `build-tokens.ts` in a fixed order, so builders never
  shared a file. (2) **Top-level keyframes, like `animate-shine`:** `theme.css` grows from 8.6 kB to
  about 57 kB (12.8 kB gzip) for every consumer, whether or not they use a showpiece. (3) **The base
  style is the final frame;** one-shot reveals play on mount and replay by changing `key` (no hidden
  "armed" state, no IntersectionObserver). (4) **MatchFound is presentational:** the app owns the
  timer and the `aria-live` announcement; the component draws the ring, the CSS countdown and the
  slots. (5) **LootReveal rarities map onto existing tokens** (`text-faint`, `chart-2`, `chart-5`,
  `premium`) as a `DECISION(open)` until Q38(c) is answered. (6) **GlitchText uses `aria-hidden`
  duplicate spans**, not `content: attr()`, so happy-dom can test it and each layer gets its own
  `motion-reduce:`. (7) **ScrambleText is one `text` per instance** in a `'use client'` island; the
  roster is several instances with staggered `delay`. (8) **No mono font token exists**, so labels
  use `font-sans tabular-nums` (rule 8). (9) **Changeset is a patch:** on `0.x`, adding components is
  "everything else" (`docs/releasing.md`).
- **Why:** parallel builders, SSR and reduced motion without JS, and no new tokens without the owner.
- **Trade-off:** (2) is the cost. Tailwind v4 can tree-shake keyframes declared inside `@theme`
  (emitted only when an `animate-*` that uses them appears); the library doesn't use that form yet.
- **Reverse:** (2) move each module's keyframes into an `@theme` block (`--animate-*` + `@keyframes`);
  (5) swap the four classes in `loot-reveal.styles.tsx` once rarity tokens exist; (9) change the
  changeset bump.

## D37 — @sukunagg/charts: in-house scale and path math instead of d3

- **Decision:** Build the charts with no runtime dependencies: `src/internal/scale.ts` (d3's
  `tickStep`, `nice` and tick algorithm; linear, band and point positions, rounded to 3 decimals)
  and `src/internal/path.ts` (line/area paths split at `null`, d3's `curveMonotoneX` tangents),
  instead of `d3-scale` + `d3-shape` as approved in Q31. Also while building: charts take
  `xLabel` and `id`, LineChart takes `yTickValues` / `yTickFormat`, and the Storybook/showcase
  aliases now resolve `@sukunagg/ui` (and the renamed `@sukunagg/video`, whose old `@sukuna-ui/video`
  alias had silently stopped matching) to source.
- **Why:** the build is per-file (`bundle: false`) so `'use client'` stays on the island's own file
  (RSC rule), which means dependencies can't be inlined — and d3 ships ESM only, so the CommonJS
  output would `require()` an ES module, which Node 18 (still in `engines`) can't do. The wave spec
  planned to bundle d3 (`noExternal`), which doesn't work with `bundle: false`. The math is ~150
  lines, follows d3's algorithms (same ticks), and is 100% covered. The owner's "build the rest
  non-stop" (Q33) made this an agent call instead of a stop-and-ask (Q33b).
- **Reverse:** add `d3-scale`/`d3-shape` as dependencies and raise `engines.node` to ≥ 20.19 (where
  `require(esm)` works), or ship the charts package ESM-only.

## D36 — Charts & stats wave 1: how the specs meet the SSR rules

- **Decision:** (1) **Sparkline** stays a server component and sizes itself with CSS: SVG
  `viewBox` + `preserveAspectRatio="none"` + `vector-effect: non-scaling-stroke`, with dots as
  absolutely positioned HTML spans so they stay round. No client measuring. (2) **Input `reveal`**
  lives in a fourth, `'use client'` file (`input.reveal.tsx`) that Input renders only for
  `type="password" reveal`, so every other Input stays zero-JS. (3) **Badge `pulse`** uses
  Tailwind's built-in `animate-pulse` / `animate-ping` instead of new keyframes, so no motion-token
  approval is needed. (4) **App colors** (StatTile `valueColor`, Sparkline `color`, chart `color`)
  reach the markup as CSS custom properties read by literal utilities (`text-(--sk-stat-value)`),
  never as built class names (rule 7). (5) **`--sk-danger`** is used only for data (deltas,
  "worse" values). Button/Badge `danger` variants stay out (D33) until the owner asks.
  **Found while building:** (6) Sparkline `bar`/`winloss` are HTML spans, not SVG — a stretched
  SVG distorts rounded corners and the 2px gap. (7) StatTile gets a `locale` prop (default
  `'en-US'`): `Intl` options can't carry a locale, and an unpinned locale prints differently on
  server and browser (hydration mismatch). (8) The new color tokens are kept out of the generated
  `[data-vp-root]` VideoPlayer bridge — the player reads none of them. (9) Input `reveal` does not
  restore the caret after the type flip (restoring a selection can steal focus in WebKit; the value
  is untouched anyway), and Badge `pulse` without `dot` silently does nothing (TSDoc says so)
  instead of a dev warning.
- **Why:** the owner approved the design (Q31/Q32) but not these mechanics. Each one keeps
  "SSR is mandatory / `'use client'` only if stateful / never interpolate class names" intact
  without changing the approved look.
- **Reverse:** (1) client-measured Sparkline = a `'use client'` wrapper with ResizeObserver;
  (2) make Input itself client, or ship a separate `PasswordInput`; (3) custom keyframes in
  `theme.css` + motion.md; (5) one-line `danger` variants once asked; (7) drop the default to
  follow the runtime locale (accepting mismatches); (8) delete the filter in `build-tokens.ts`.

## D35 — Standalone VideoPlayer: workspace layout, prefixed unlayered CSS, scoped reset

- **Decision:** For Q27 (owner: share the player without sukuna-ui) the agent chose:
  (1) **Layout** — Bun workspaces with publishable code only in `packages/*` (`ui` = `sukuna-ui`,
  `video` = `@sukuna-ui/video`); docs, Storybook, shared `test/` + `scripts/`, examples stay at the
  root. Changesets ignores a non-private workspace root, so the library had to move into
  `packages/ui`. (2) `sukuna-ui` depends on `@sukuna-ui/video` with a plain range (`^0.0.0`,
  bumped by Changesets), not `workspace:*`, because `changeset publish` runs `npm publish`, which
  would ship `workspace:*` verbatim. (3) Dev resolves the package to source through root
  `tsconfig` `paths` (+ Vite aliases in Storybook/showcase); each package's `tsconfig.build.json`
  clears them so `.d.ts` keeps `@sukuna-ui/video` as an import. (4) Styling: every player class
  is `vp:`-prefixed and compiled into a prebuilt `video.css` (Tailwind `prefix(vp)`), **unlayered**
  so a host's global element CSS can't restyle the chrome, with a Preflight-style reset in
  `@scope ([data-vp-root]) to ([data-vp-content])` at ≤ one-element specificity (utilities always
  win; scope proximity beats a host's `button {}`). App content (overlay children, `info`,
  watch-limit card) is wrapped in `display: contents` `[data-vp-content]` so it keeps host styles.
  (5) `sukuna-ui` bundles `video.css` into its `theme.css` (`@import`) and `styles.css` (appended)
  and bridges `--vp-*` from `--sk-*` on `[data-vp-root]`, so its consumers change nothing.
  (6) The loading ring is inlined (no `Spinner` import) and the story-only `Button` became a local
  `StoryButton`, to keep the package free of `sukuna-ui` (a test enforces it).
- **Why:** The owner wanted the player in apps that don't use Sukuna. Verified by diffing every
  element's computed style (29 stories × 2 states) against the pre-split Storybook — only baseline
  timing noise and the new `contents` wrapper differ — and by `scripts/video-standalone-smoke.mjs`
  (CI) on a page with hostile global CSS.
- **Trade-off:** an app's own layered Tailwind class in the player's `className` no longer beats a
  conflicting player utility (it used to, via tailwind-merge); overrides go through `--vp-*` or an
  important modifier. Documented in the package README and the spec.
- **Reverse:** Put the utilities back in `@layer utilities` (hosts regain `className` overrides but
  global element CSS can leak in), or drop the prefix and ship source for consumers' Tailwind to
  scan (needs Tailwind in every host again).

## D34 — Table actions column = static cells + a separate `RowActions`

- **Decision:** Owner asked for "an actions column … options + icons in the options" (Q18). Built as
  `MenuItemOption.icon` + new `RowActions` (client; Button + Menu) + static
  `Table.ActionsHeaderCell`/`Table.ActionsCell`, rather than `Table.ActionsCell items={…}`.
- **Why:** `Table` is a server component with a 2 kB "no Base UI" size budget. Putting Menu inside
  it would make every Table import ship ~48 kB of Base UI and a `'use client'` boundary. As a
  separate component, only tables that use row actions pay for them.
- **Reverse:** Fold `RowActions` into `Table.ActionsCell` if the ergonomics matter more than the
  budget (then raise the Table size limit and mark table.logic `'use client'`).

## D33 — v1.3 wave: Base UI stable, danger kept out, scope trims

- **Decision:** (1) Migrate to `@base-ui/react@^1.8.0` (the rc package was renamed at 1.0) and
  keep ScrollArea scrollbars `keepMounted` — 1.x unmounts them when nothing overflows, which would
  shift layout vs. rc. (2) Do **not** add Button `danger` / Badge `danger`+`warning` from the
  approved analysis: Q10 (owner) dropped danger because Sukuna has a single red, and rule 8 forbids
  inventing `--sk-danger`. (3) Build variants that need no tokens: Button `outline`/`link`/
  `iconOnly`, Badge `dot`, Alert `onDismiss`, Card `interactive`, Progress/Spinner `tone`,
  Avatar `shape`. (4) Defer Input slots (DOM/`className` target change needs its own spec),
  Skeleton `wave` (new keyframe = token-level approval) and virtualization (new dep, Q16; owner then deferred it, Q17).
- **Why:** "go for it" approved the list, but an earlier explicit owner decision (Q10) and a
  standing rule (8) outrank a list the agent proposed. Everything else ships as proposed.
- **Reverse:** Approve a `--sk-danger` token (and a hue) → `danger` becomes a one-line variant on
  Button/Badge. Input slots/Skeleton wave/virtualization each have a spec-sized follow-up.

## D32 — Checkbox: `label` prop and Enter-to-toggle

- **Decision:** `Checkbox` gains `label?: ReactNode` (wraps input + text in a `<label>`; the text
  click toggles and names the box) and toggles on **Enter** as well as Space, via `onKeyDown`
  with `preventDefault()`. A consumer `onKeyDown` runs first and can prevent it.
- **Why:** Owner request while reviewing Storybook: "pressing enter should check the box… also
  clicking on its text should check the box". Text clicks already worked when consumers used
  `<label htmlFor>`, but the showcase (and most quick usages) put a `<Text>` next to the box,
  which is not a label — a `label` prop makes the correct thing the easy thing, matching
  `RadioGroup` items. Enter is *not* native checkbox behaviour (only Space is, and Enter inside
  a form normally means "submit"); the owner explicitly wants it, so it's handled component-side
  and the default is prevented so a stray Enter can never submit a form from a checkbox. Logged
  as a deliberate deviation in `docs/component-checkbox.md` §11. Classified **minor** (new prop).
- **Reverse:** Remove the `Enter` branch in `handleKeyDown` (patch) — the `label` prop is
  independent of it. `Switch` (a Base UI button) already toggles on Enter natively.

## D31 — Select popup: standard placement, trigger-matched width, available-height cap

- **Decision:** `Select.Positioner` gets `alignItemWithTrigger={false}`; the popup slot uses
  `min-w-[var(--anchor-width,10rem)]` and `max-h-[min(24rem,var(--available-height,24rem))]`.
- **Why:** Reported while reviewing a 100-item Select stacked among others: (1) wheel-scrolling
  the open list "moved the whole box" — Base UI's default aligned mode pins a viewport-tall
  positioner (`data-side="none"`) and grows the popup as you wheel, which reads as the popup
  drifting instead of the list scrolling; (2) the popup was 160px wide under a 240px trigger;
  (3) a Select near the bottom of the viewport opened a fixed 24rem-tall popup off the page.
  Standard `side="bottom"` placement with Floating UI flip + the `--anchor-width` /
  `--available-height` CSS vars Base UI already sets on the Positioner fix all three with no new
  API. Classified **patch**: a fix toward the documented "dropdown" behaviour, no prop/token/
  trigger-layout change. Two Playwright guards added (`test/browser/select.test.ts`).
- **Reverse:** Drop the prop to return to aligned mode; keep the width/height vars regardless.
- **Note:** The in-app browser tool's synthetic wheel can't drive native overflow scrolling, so
  the wheel behaviour is verified by Playwright (`page.mouse.wheel`), not by the pane.

## D30 — Agent-friendly docs, SEO and discoverability (validated plan, 7 parallel agents)

- **What:** Executed the approved plan to make the library discoverable and usable by AI agents and
  search. Two research passes validated it first (internal survey of the doc/metadata gaps; external
  brief on `llms.txt`, Mantine/shadcn/HeroUI's agent-adoption stack, JSON-LD, npm keywords).
  - **TSDoc convention** (`docs/tsdoc.md`, CLAUDE.md rule 9): every exported component and prop now
    carries purpose, `@remarks` (SSR/RSC, a11y + keyboard, every variant with default), `@default`
    and copy-pasteable `@example`s. Applied to all 30 components by six agents on disjoint dirs;
    verified comment-only (221 tests / 100% coverage unchanged, `tsc` clean). Ships in the `.d.ts`.
  - **One generator, every channel** (`scripts/build-docs.ts`, mirrors `build-tokens.ts`): emits
    `docs/llms/<name>.md`, spec-shaped `llms.txt`, `llms-full.txt`, the README component table +
    count, and copies into the showcase `public/`. `bun run docs:build` is part of `build`;
    `bun run docs:check` diffs in CI so nothing drifts. Deployed URL is one constant (`SITE_URL`,
    env-overridable).
  - **Decision — pages derive from `docs/component-*.md`, not TypeDoc:** zero new dependency and
    the specs already have the 11 fixed sections. Trade-off surfaced immediately: specs can lag the
    code (Button still said `as`/`href` were "not in v1"; Menu lacked `id`; Alert said role
    defaults to `status`) — fixed by hand this batch. **Follow-up:** generate the API section from
    the exported types + TSDoc (TypeDoc JSON) so the spec can't lie; until then, a prop change must
    update both the TSDoc and the spec (the `update-readme` skill checks for missing docs/exports).
  - **README** rewritten code-first with badges, a "For AI agents" section and the generated table;
    `package.json` gains `keywords` (25, incl. `llms-txt`, `ai-agents`), `author`, a sharper
    `description`. New `.claude/skills/update-readme` keeps it current.
  - **Showcase → indexable site:** prerendered via `entry-server.tsx` + `scripts/prerender.ts`
    (SSR build → inject into `dist/index.html` → `hydrateRoot`), full SEO head, JSON-LD
    `SoftwareApplication` + `BreadcrumbList`, `robots.txt` (AI crawlers allowed), generated
    `sitemap.xml`, `favicon.svg`, `og.png` (rasterized by a one-off Node script, per the D16
    Bun/Playwright precedent), hero + "Built for AI agents" section, section anchors. Root
    `vercel.json` carries the build chain. Caveat kept: React is external in the SSR bundle because
    Bun's parser rejects Vite's re-bundled `react-dom/server`.
- **Review findings applied (humane-reviewer, pre-merge):** (1) the Vercel URL isn't deployed
  yet, so generated docs and the README now link the **raw GitHub** copies (live today, stable
  source); the deployed showcase serves the same files at its own origin. (2) `docs:check` moved
  to `scripts/check-docs.ts` using `git status --porcelain`, because `git diff --exit-code`
  ignores untracked files and would have let a never-generated page for a new component pass CI.
- **Post-release fix (CI red on the 0.6.0 merge):** the generated docs embedded
  `package.json`'s version, but the Changesets release commit bumps the version *without* running
  `docs:build`, so the embedded value drifted (64 files, all `0.5.0 → 0.6.0`) and `docs:check`
  failed. Generated docs now carry no version at all — the version is authoritative in
  `package.json`/npm — so release bumps can never drift them. Rule of thumb recorded in the
  generator header: never embed a value in generated output that changes outside `docs:build`.
- **Deferred (per research):** own MCP server and a shadcn-compatible registry — after traction;
  `llms.txt` + a Context7 listing cover agents now. Custom domain for the showcase: its
  `SITE_URL` (prerender/sitemap/canonical) is one env var.
- **Bump:** minor (enriched published `.d.ts`, metadata; no runtime change).
- **Reverse:** each piece is independent; the generated files are reproducible from the specs.

## D29 — Improvements batch (6 parallel agents): Field, a11y, contrast gate

- **What:** Implemented six `docs/improvements.md` items in parallel (one agent each), then integrated:
  - **#26 `Field`** (new component, minor) — compound wrapper on Base UI Field. Decision by the agent,
    kept: `Field.Error`'s `match` defaults to the root's `invalid`, so controlled errors "just work"
    while leaving `invalid` unset preserves Base UI's native-validity behavior. It requires
    `'use client'` (Base UI Field parts are client). Now 30 components.
  - **#4 Accordion `headingLevel`** (minor) — 1–6, default 3, via Base UI Header's `render` prop
    (there is no numeric level prop; `render={<hN/>}` swaps the tag).
  - **#24 Button `as="a"`** (minor) — polymorphic anchor variant (discriminated-union props). Chose
    to accept `disabled` on the anchor variant and map it to `aria-disabled` + `tabindex={-1}` +
    `pointer-events-none` (ergonomic; anchors have no native `disabled`).
  - **#3 Alert tone→role** (minor) — `alert` for danger/warning, `status` otherwise; explicit
    override wins.
  - **#36 contrast gate** — `src/tokens.contrast.test.ts` asserts every token pair clears AA in both
    themes (38 assertions); runs with the normal test gate. Locks the D22 contrast fixes.
  - **#34 token gallery** — live WCAG badges in the Storybook token reference.
- **Note (#15 already done):** `package.json` already has `sideEffects: ["**/*.css"]`.
- **Integration:** agents worked on disjoint files (no shared-file edits, no commits); the
  orchestrator wired `src/index.ts` (Field exports), fixed strict-`tsc` issues the agents couldn't
  see whole-repo (accordion `createElement` cast, Button anchor `disabled` type, TokenGallery
  `noUncheckedIndexedAccess`), and ran the full gate. 221 unit tests, 100% coverage, all green.
- **Reverse:** each item is independent; revert per changeset.

## D28 — Showcase example app; found Tabs was never exported

- **What:** Added `examples/showcase` — a single-page Vite + React 19 app (zero-config
  `sukuna-ui/styles.css` path, `bun link`) that renders all 29 components with a live dark/light
  toggle. Building it surfaced two real bugs:
  1. **`Tabs` was never re-exported from `src/index.ts`** — the component shipped, was documented,
     tested, and listed in the README, but `import { Tabs } from "sukuna-ui"` failed (through 0.5.0).
     Fixed the export and added `src/index.test.ts` asserting every component directory is
     re-exported, so this class of gap can't recur. (minor — new public API.)
  2. **Breadcrumbs keyed by `href`** → duplicate React keys when two crumbs share an href. Keyed by
     index (a trail is a fixed ordered list). (patch.)
- **Why an example, given Storybook exists:** Storybook is per-component; a showcase app exercises
  the real consumer path (published package + one CSS import) end to end and catches integration
  gaps like the missing export that per-component tools miss.
- **Reverse:** delete `examples/showcase`; the two library fixes stand on their own.

## D27 — Tabs: fix invisible selected state; active tab reads crimson

- **Decision:** The selected Tab now renders crimson text + a crimson underline
  (`aria-selected:text-accent aria-selected:border-accent`), so the active tab is obvious.
- **Root cause:** the styles keyed the selected state off `data-[selected]:` but **Base UI's
  `Tabs.Tab` never sets `data-selected`** — it exposes `data-active` and `aria-selected="true"`
  (confirmed in `TabsTabDataAttributes`). So the old selectors matched nothing and the active tab
  had *no* distinct styling at all (it computed to `text-dim` with a transparent border — verified
  in-browser). Keyed off `aria-selected` (the unambiguous "which panel is shown" state; `data-active`
  can follow focus). Base UI **Select/Combobox** items *do* use `data-selected`, so those were left
  as-is.
- **Contrast:** `accent` as text clears AA on the page `bg` (5.64/4.70) and `surface` (5.25/4.95) —
  the backgrounds tabs sit on. (Avoid placing tabs directly on `surface-2` in light, where accent is
  4.30.)
- **Bump:** patch (fixes broken selected styling; no API/layout change). Guarded by a browser test
  asserting the selected tab's computed color is the accent.
- **Also (same gotcha):** a **disabled** tab wasn't dimmed either — `disabled:opacity-45` relies on
  the native `:disabled` pseudo-class, but a disabled `Tabs.Tab` inside the list is
  `focusableWhenDisabled`, so Base UI marks it with `data-disabled` and no native `disabled` attr.
  Added `data-[disabled]:opacity-45 data-[disabled]:cursor-not-allowed`. Verified the other
  disable-able components are fine (Checkbox/Input native; Switch/Select/Combobox set native
  `disabled`; Accordion sets native `disabled`) — only the composite Tab needed it. Guarded by a
  browser test.
- **Reverse:** revert the two `aria-selected:` utilities and the `data-[disabled]:` pair.

## D26 — RadioGroup: clicking the label text selects the option

- **Decision:** The whole option row is now the `Radio.Root` (role=radio) with the circle and label
  as children, so a click on the label text selects the option (previously the label was a sibling
  `<span>` that did nothing). The explicit `aria-labelledby` → label span is **kept**, so the
  accessible name is unchanged and axe still passes — this does not reintroduce the D-era
  "toggle-field needs name" problem (that came from a native `<label>` wrapper naming the hidden
  input, not from naming the role=radio element).
- **Styling:** the circle became a child `<span>`, so its checked/focus styles read the root via
  `group-data-[checked]:` / `group-focus-visible:` (the ring still renders around the circle).
- **Bump:** patch (behavior/a11y fix, no API or visual change). Guarded by a browser test that clicks
  the label text.
- **Reverse:** move the label span back outside `Radio.Root`.

## D25 — Reduced-motion support (audit P1 #7)

- **Decision:** Honor `prefers-reduced-motion: reduce` via Tailwind's `motion-reduce:` variant on the
  motion-bearing slots across the library (17 spots in 13 components): `motion-reduce:animate-none`
  on `animate-spin`/`animate-pulse` (Spinner, Skeleton, Progress), `motion-reduce:transition-none` on
  the enter/exit transform+opacity transitions (Dialog, Drawer, Toast, Menu, Select, Combobox,
  Tooltip, Accordion, Switch, Progress width), and `motion-reduce:active:scale-100` on the Button
  press-scale. Color-only transitions (borders, hovers) are left as-is — they aren't movement.
- **Why per-utility, not a global `@media` reset:** the library has no shared root class to scope a
  global rule to, and a blanket `* { animation: none }` in the shipped CSS would override the
  consumer's own animations. `motion-reduce:` variants are scoped to our elements only.
- **Convention:** new components with movement/animation must add the matching `motion-reduce:*`
  variant. Verified end-to-end by a Playwright test that emulates `reducedMotion: 'reduce'` and
  asserts the Spinner's `animationName` is `none` (and animates without the preference).
- **Bump:** minor (a11y fix toward spec; WCAG 2.3.3 / 2.2.2). No API change.
- **Reverse:** strip the `motion-reduce:*` classes.

## D24 — Performance at scale: no-dep stopgap (owner-approved Option 2)

- **Decision:** Address the large-list perf findings (audit P0 #2/#3, #8/#10/#12) **without** adding a
  virtualization dependency — the owner picked the no-dep option over `@tanstack/react-virtual`:
  - `content-visibility: auto` + `contain-intrinsic-size` on **Combobox and Menu** item slots (via
    inline Tailwind arbitrary properties) so the browser skips layout/paint of off-screen options.
    **Not** applied to **Select** (its popup aligns the selected option over the trigger, and
    deferring off-screen layout breaks that positioning — caught by the Select browser test) nor to
    Table `<tr>` (unreliable on table rows, can jitter column widths). Table/Select large-data
    guidance is docs-only (use a Combobox or paginate).
  - Combobox `maxRenderedItems` prop → Base UI Autocomplete's `limit`. Search still spans every item;
    only the top N filtered results render. No dependency (Base UI already provides it).
  - `Select.Value` now uses a memoized `Map<value,label>` (O(1)) instead of `items.find` (O(n)) per
    value render. Menu items accept an optional stable `id` (`key={item.id ?? index}`).
  - size-limit budgets added for Table (498 B — proves it never pulls Base UI) and Select (48.5 kB,
    limit 60 kB — the "stateful pays for Base UI once" contract).
- **Limitation (documented):** content-visibility speeds client paint but does **not** reduce DOM
  node count or SSR bytes/memory; true virtualization (Option 1) remains the real fix for extreme
  sizes and can be added later as an opt-in `virtualized` variant (Base UI Autocomplete/Select
  already accept a `virtualized` flag).
- **Bump:** minor (adds a prop + tokens-free perf/CSS; `maxRenderedItems` is additive).
- **Reverse:** drop the arbitrary-property classes, the `maxRenderedItems` prop, and the size entries.

## D23 — Button primary contrast: darken the gradient + white `on-accent` label (owner-approved)

- **Decision:** Fix the primary Button's failing label contrast (P1 #5, was 3.11:1 dark / 3.73:1 light,
  below AA 4.5:1) by **(a)** adding an `--sk-on-accent` foreground token (`#FFFFFF`, both themes) so the
  label no longer flips to dark text in light mode, and **(b)** darkening the dark-theme gradient's
  light stop `#FF3B4E → #D8253A`. White on the resulting gradient is 4.95:1 (light stop) / 7.11:1
  (deep stop). The light-theme gradient was already fine with a white label (4.95/8.56) and is
  unchanged. Owner picked "darken gradient stop" over a solid `accent-deep` fill.
- **Why `#D8253A`:** it is an existing brand crimson (the light-theme `accent`), so the dark button
  stays clearly crimson — a straight HSL-darken of `#FF3B4E` drifts toward a pure fire-red. Trade-off:
  the shared `gradient-accent` also backs the wordmark/hero, so those darken slightly too (still
  large-text/decorative, so within spec). If the neon wordmark must be preserved, split a
  button-specific gradient — flag it.
- **Bump:** minor (visual change toward the spec; a11y fix). Batches with D22.
- **Reverse:** restore `gradient-accent.dark` start to `#FF3B4E` and the primary label to `text-text`.

## D22 — Accessibility wave 1: contrast token retune + solid focus ring

- **Decision:** Retuned color tokens to clear WCAG AA and made the focus ring a solid color, from the
  `docs/known-issues-and-audit.md` backlog (P0 #1, P1 #4/#6, P2 #9/#11):
  - `text-faint` → `#8C8479` (dark) / `#6F6B63` (light) — was `#6C665D`/`#8C877D` (~3:1, failed 4.5:1
    as placeholder text in both themes).
  - light-theme `premium` `#786A4A`, `premium-dim` `#776A48`, `success` `#177B46` — the old light
    values failed 4.5:1 as text in Badge/Chip/Alert (dark theme was already fine, unchanged).
  - New `--sk-focus-ring` token (= `accent`, solid) replaces `ring-accent-glow` on every focus ring;
    the translucent glow failed WCAG 1.4.11 3:1 (1.7–2.6:1) as the sole indicator. `accent-glow` is
    kept for decorative shadow only.
  - Menu/Select/Combobox keyboard highlight → a crimson inset ring (`data-[highlighted]:ring-…`)
    instead of a 6%-opacity fill that was <3:1; the ring doesn't collide with a selected item's color.
  - Avatar defaults `alt=""` (decorative) when omitted; Progress defaults `aria-label="Progress"`
    when unlabeled; Toast close bumped 24→32px.
- **How chosen:** new hex values were computed by a scratchpad script (WCAG 2.1 sRGB luminance),
  keeping each token's hue/saturation and nudging only lightness to ~4.6:1 (small margin over 4.5).
  Faithful to the palette; dark brand colors are unchanged except `text-faint`.
- **Bump:** minor (a11y fix toward spec; token *values* change but no API/layout change). Deferred to
  the owner: the **Button primary-label-on-gradient** contrast (needs a design call — darken the
  crimson gradient vs. change the label) and **virtualization** (adds a dependency + API).
- **Reverse:** revert the token values in `src/tokens.ts`; every change is a value/class swap.

## D21 — Overlay z-index scale; z-index moves to the positioner

- **Decision:** Overlay stacking is a monotonic `--sk-*` token scale — `dialog: 50` < `popover: 60`
  < `toast: 70` < `tooltip: 80` — and dropdown/tooltip components set their z-index on the Base UI
  **positioner**, not the inner popup. Added tokens `--sk-z-popover`, `--sk-z-toast`; moved
  `--sk-z-tooltip` from `40` → `80`. Dialog/Drawer/Toast now use `z-[var(--sk-z-*)]` instead of a
  literal `z-50`.
- **Why:** a Select/Menu/Combobox opened *inside* a Dialog rendered **behind** it. The `z-50` sat on
  `Base.Popup`, but the element portalled to `<body>` is `Base.Positioner`, which Floating UI gives
  a `transform` → its own stacking context, so the popup's z-index was trapped and `auto` (0) won at
  the body level, losing to the dialog's `z-50`. On a plain page nothing else has a positive
  z-index, so it only broke against a modal. Fix: z-index on the positioner, and a scale where
  popovers/tooltips sit above the dialog layer. Guarded by a Playwright test
  (`test/browser/dialog.test.ts`) that opens a Select inside a Dialog and asserts both the stacking
  order and that the option is clickable (not obscured).
- **Bump:** minor (adds tokens; pre-1.0 minor). `--sk-z-tooltip`'s value change is a stacking fix,
  not a layout change.
- **Reverse:** re-layer by overriding any `--sk-z-*`; the positioner is the correct anchor, don't
  move it back.

## D20 — Package renamed `@sukuna/ui` → `sukuna-ui` (unscoped)

- **Decision:** The npm package is **`sukuna-ui`** (unscoped), not `@sukuna/ui`. Owner's choice
  (2026-09-16) after the first publish 404'd.
- **Why:** Publishing `@sukuna/ui` needs an npm **org `sukuna`** that the account owns; it doesn't
  exist, so npm returned `E404 PUT @sukuna/ui`. The unscoped name `sukuna-ui` was free and needs no
  org. The design language stays "Sukuna" and tokens stay `--sk-*` — only the package specifier
  changed (all imports/docs updated).
- **Token note:** an unscoped publish needs `NPM_TOKEN` to allow it — a granular token must have
  **read/write on _all packages_** (a token restricted to the `@sukuna` scope will NOT publish an
  unscoped package), or use a classic **Automation** token.
- **Reverse:** to use a scope later, create the npm org and rename back (major-ish, pre-1.0 fine).

## D19 — Examples consume the library via `bun link`, not `file:`

- **Decision:** `examples/*` depend on `sukuna-ui` via `bun link` (`"sukuna-ui": "link:sukuna-ui"`),
  matching the plan.
- **Why:** a `file:../..` dependency copies the package honoring `.gitignore`, which **excludes the
  gitignored `dist/`** — so `sukuna-ui/styles.css` (and the JS) won't resolve. `bun link` symlinks
  the real repo directory, exposing the freshly built `dist/`. CI must `bun run build` then
  `bun link` before building examples.
- **Reverse:** publish a real version and depend on it once released.

## D18 — Select is prop-driven with string values (v1)

- **Decision:** Select takes an `items: {value: string; label; disabled?}[]` array with **string**
  values (single-select), plus `value`/`defaultValue`/`onValueChange` and `open`/`defaultOpen`/
  `onOpenChange`. Not compound; not arbitrary value types; not multiple-select. The `Value` renders
  the selected label or the placeholder via a render function.
- **Why:** covers the common case with the simplest API and avoids Base UI's `Value`/`Multiple`
  generics leaking to consumers. `open`/`defaultOpen` added so the open list is testable in
  happy-dom (and it's a useful control).
- **Reverse:** non-string values and multiple-select are additive (minor) post-1.0.
- **Icons inlined** (not sub-components) so their element creation is covered even while the popup
  is closed.

## D17 — Dialog is a compound component (`Dialog.*`)

- **Decision:** Dialog ships as `Dialog` (root) + `Dialog.Trigger/Content/Title/Description/Close`
  rather than a single prop-driven component. Wraps Base UI dialog parts and applies slot styles.
- **Why:** dialogs vary in content structure; a compound API composes naturally and lets Base UI
  wire `aria-labelledby`/`describedby` from the Title/Description parts. `Dialog.Close` accepts Base
  UI's `render` prop for a custom button.
- **Reverse:** additive.

## D16 — Browser tests run under `@playwright/test` (Node), not `bun test`

- **Decision:** The real-browser suite (`test/browser/*.test.ts`) runs under `@playwright/test` via
  Node (`playwright.config.ts`, served by `scripts/serve-storybook.ts`), not Playwright's library
  API inside `bun test` as `docs/questions.md` Q11 planned. `test:browser` = `storybook:build` then
  `playwright test`. Unit suite stays on `bun test src`.
- **Why:** Playwright's browser transport **hangs under Bun** on this platform (verified: full
  Chromium launches fine under Node, `chromium.launch()` never resolves under Bun — Bun's stdio-pipe
  handling for Playwright's driver). It's not a config issue. The unit-vs-e2e runner split is the
  conventional setup and keeps the browser gate actually executable.
- **Trade-off:** two test tools instead of one (Q11's "single runner" holds for the unit suite,
  which is what coverage measures). Browser specs use `@playwright/test`'s `test`/`expect`.
- **Reverse:** move back into `bun test` if/when Bun supports Playwright's transport.

## D15 — Native interactive component APIs (Input, Checkbox, Switch)

- **Input:** variant `size` (sm/md/lg) shadows and drops the native numeric `size` attribute
  (`Omit<…, 'size'>`); `invalid` sets `aria-invalid` + crimson border (Sukuna's one red, Q10); full
  width by default; no icon slots in v1 (plain `<input>`).
- **Checkbox:** native `<input type="checkbox">` tinted with `accent-color: var(--sk-accent)`
  (`accent-accent`) rather than fully custom `appearance-none` art — accessible, keyboard +
  indeterminate come from the platform, minimal CSS. Boolean API `onCheckedChange(checked)` +
  `indeterminate` (set as the DOM property via a merged ref callback, no `useEffect`).
- **Switch:** a `<button role="switch" aria-checked>` with a `tv()`-slots track + sliding thumb
  (thumb moves via `group-aria-checked:translate-x-*`), NOT a checkbox — so the thumb is fully
  custom while switch semantics/keyboard stay native to the button.
- Controlled/uncontrolled for Checkbox and Switch go through the shared `useControllableState`.
- **Why:** accessible-by-default, smallest CSS, consistent with the "extend native, add what's
  missing" rule. Custom checkbox art can come post-1.0.
- **Reverse:** custom `appearance-none` checkbox art, icon slots, etc. are additive (minor).

## D14 — Build emits per-file output (`bundle: false`) + `fix-directives` for `'use client'`

- **Decision:** tsup runs with `bundle: false`, transpiling each `src/` file to its own `dist/`
  output (mirroring structure), then `scripts/fix-directives.ts` re-adds `'use client'`/`'use server'`
  banners to the exact outputs whose source declared one. `build` = tokens → tsup → fix-directives → css.
- **Why:** RSC support requires each client component's `'use client'` to sit atop ITS OWN output
  file. Bundling everything into one `index.js` (the original single-entry config) merged client +
  server code and dropped the directive, which would force every consumer client-side and break RSC.
  `esbuild-plugin-preserve-directives` did not preserve directives in this tsup/esbuild version
  (verified: dropped in both bundled and unbundled modes), so it was removed. Per-file output also
  gives natural tree-shaking (Phase 7). esbuild keeps the directive in ESM output on its own; the
  script covers the CJS output and fails loudly if a client source produces no output.
- **Trade-off:** `dist/` has many small files and internal relative imports are **extensionless**.
  `check:pkg` (publint + attw, all resolution modes) passes, and the target consumers are bundlers
  (Vite/Next/Remix) that resolve extensionless fine. Revisit if native-Node-ESM consumers appear.
- **Reverse:** Return to a bundled single entry only if RSC support is dropped.

## D13 — Static component APIs (Text, Badge, Card) designed by the agent

The plan only named these three as "static"; the agent designed each API (self-approved per D7).

- **Text:** polymorphic over a fixed `as` allowlist of intrinsic tags (default `p`) rather than
  `asChild`; variants font/size/weight/tone/align/leading/tracking/truncate/numeric; native `color`
  omitted in favor of `tone`.
- **Badge:** `tone` (neutral/accent/success/premium) × `size` (sm/md), fixed pill radius, optional
  decorative `dot` in `currentColor`. No `count` helper.
- **Card:** `elevation` (flat/raised/sunken) × `padding` (none/sm/md/lg) × `radius` (md/lg). **No**
  clickable/`interactive` Card and **no** `Card.Header/Body/Footer` sub-components in v1 — wrap in a
  Button/Link for clicks; compose content with Text + layout utilities.
- **Why:** Smallest APIs that cover real use, consistent with the Button doc's "extend the native
  element, add only what's missing" and "a clickable X is a Link" rules.
- **Reverse:** Adding props/variants/sub-components later is a minor bump; changing defaults is major.

## D12 — happy-dom registration split into its own preload

- **Decision:** Two preloads in `bunfig.toml`: `test/register-dom.ts` (registers happy-dom) then
  `test/setup.ts` (imports Testing Library, registers matchers). Was one `setup.ts`.
- **Why:** `@testing-library/dom` binds `screen` to `document.body` at import/eval time. ES imports
  hoist above the module body, so `GlobalRegistrator.register()` in the same file ran *after* the
  Testing Library import — `screen` bound before `document` existed and every `screen.*` query threw
  "a global document has to be available". `render` (attaches at call time) hid the bug until the
  first `screen` test. Separate preloads evaluate fully in order, so registration completes first.
- **Reverse:** n/a (correctness fix).

## D11 — `attw` excludes the CSS entrypoints

- **Decision:** `check:pkg` runs `attw --pack . --exclude-entrypoints theme.css styles.css tokens.css`.
- **Why:** `sukuna-ui/theme.css` / `styles.css` / `tokens.css` are stylesheets with no type
  declarations, so attw's "resolves to types or JS" check fails on them (NoResolution). Excluding
  the CSS-only entrypoints is correct — they aren't importable JS. publint still validates the
  files exist.
- **Reverse:** n/a — CSS exports never have types.

## D10 — Tailwind spacing namespace NOT remapped to `--sk-space`

- **Decision:** The `@theme inline` mapping maps colors, font family/size, leading, tracking,
  radius, shadow, duration, ease — but **not** spacing. Tailwind's default numeric spacing scale
  stays (`h-10`, `px-5`, `gap-2`).
- **Why:** The Button doc (the concrete contract) sizes with `h-8/h-10/h-12` (= 32/40/48px) and
  `px-3/px-5/px-6`, i.e. Tailwind defaults, which already hit the Sukuna pixel targets. Remapping
  `--spacing` to the 1–8 token scale would break those utilities. `--sk-space-*` remain available
  as raw CSS vars. The plan listed "spacing" in the mapping generically; the component contract wins.
- **Reverse:** Add a spacing block to the `@theme` mapping in `scripts/build-tokens.ts` and update
  component size utilities. Would be a visual/major change.

## D9 — `create-variants.ts` folded into `tv.ts`

- **Decision:** No separate `src/utils/create-variants.ts`. `src/utils/tv.ts` is the single
  variant wrapper (exports `tv` + `VariantProps`), which is exactly what `docs/component-button.md`
  imports (`from '../../utils/tv'`).
- **Why:** The plan listed both `tv.ts` and `create-variants.ts`, but the Button contract only uses
  `tv.ts`. Two files doing the same thing invites drift. `tw-merge-config.ts` holds the shared merge
  config used by both `tv` and `cn`.
- **Reverse:** Add `create-variants.ts` re-exporting from `tv.ts` if a distinct helper is wanted.

## D8 — Fallback and Storybook CSS both use `@source "../components"`

- **Decision:** `fallback.css` (→ `dist/styles.css`) and `storybook.css` both do
  `@import "tailwindcss"; @import "./theme.css"; @source "../components";`.
- **Why:** Both need Tailwind to emit the utilities the components actually use. `@source` points
  the scanner at the component source. Until components exist (Phase 4+), `dist/styles.css` is just
  the Tailwind base + theme layer, growing as components land.
- **Reverse:** n/a.

---

## D7 — Component docs are self-approved during the non-stop build

- **Decision:** Per the owner's "build non-stop" instruction (2026-09-16), each
  `docs/component-<name>.md` is written first (docs-first rule intact) and self-approved by the
  agent instead of blocking for owner sign-off. Design choices inside each doc are logged here.
- **Why:** Owner explicitly asked for a continuous build and for agent decisions to be recorded
  here rather than gated.
- **Reverse:** Owner reviews any component doc/Storybook and requests changes; treated as a
  normal patch/minor per the breaking-change table.

## D6 — Storybook loads raw tokens until Phase 3

- **Decision:** In Phase 2, `.storybook/preview.tsx` imports `src/styles/index.css` (tokens +
  reset). Tailwind (`@tailwindcss/vite`) and `theme.css` are added in Phase 3 as the plan
  sequences them.
- **Why:** `theme.css` (the `@theme` mapping) doesn't exist until Phase 3; wiring Tailwind
  earlier would reference a missing file.
- **Reverse:** n/a — Phase 3 switches preview to the Tailwind-aware `storybook.css`.

## D5 — Storybook telemetry disabled

- **Decision:** `core.disableTelemetry: true` in `.storybook/main.ts`.
- **Why:** Privacy-preserving default; avoids build/dev phoning home. No downside for this repo.
- **Reverse:** Remove the flag.

## D4 — `Intro.mdx` deferred to the README (Phase 9)

- **Decision:** Only `Tokens.mdx` ships in Phase 2; `Intro.mdx` (which `docs/storybook.md` says
  "mirrors README") is written in Phase 9 when the README exists.
- **Why:** Avoid duplicating a not-yet-written README.
- **Reverse:** Add `src/stories/Intro.mdx` earlier if desired.

## D3 — Coverage floor uses the scalar `coverageThreshold`, not the object form

- **Decision:** `bunfig.toml` uses `coverageThreshold = 0.9` (scalar).
- **Why:** Bun 1.3.12 **silently ignores** the per-metric object form
  `{ line, function, statement }` that `docs/testing.md` originally specified — it parses but
  never fails the run (verified: funcs 100% / lines 50% passed with the object form, failed with
  the scalar). The scalar form checks both functions and lines. A silently-disabled gate is worse
  than none. Documented in `bunfig.toml` and `docs/testing.md`.
- **Reverse:** If Bun fixes the object form, switch back for per-metric granularity.

## D2 — `jest-axe` matcher must be spread in `test/setup.ts`

- **Decision:** `expect.extend({ ...jestDom, ...toHaveNoViolations })`.
- **Why:** `jest-axe` exports `toHaveNoViolations` as `{ toHaveNoViolations: fn }`. The plan's
  snippet nested it, which Bun rejects as "not a valid matcher". Corrected in code + doc.
- **Reverse:** n/a (bug fix).

## D1 — `exports` for CSS deferred; `@types/bun` added; `engines.node` set

- **Decision:** The Phase 0 `exports` map ships only `.` and `./package.json`; `./styles.css`
  and `./theme.css` are added in Phases 1/3 when those files exist. Added `@types/bun` (dts build
  needs it) and `engines.node: ">=18"` (publint suggestion).
- **Why:** publint errors on `exports` pointing at non-existent files, which would fail the
  Phase 0 gate. The later phases add the CSS exports anyway.
- **Reverse:** n/a — follows the plan's own later phases.
