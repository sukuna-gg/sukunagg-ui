# Component: BracketBeam

> Follows the `docs/component-button.md` template. **Server component** in `@sukunagg/fx`
> (showpieces & FX wave, Q38/Q39). The bracket, its connectors and the champion's lit path are
> server-rendered HTML and CSS (the poster); a small client island
> (`bracket-beam.measure.tsx`) measures the real layout and draws the travelling SVG beams on the
> shared fx loop (`packages/fx/src/internal/loop.ts`). Builder guide: `packages/fx/BUILDERS.md`.

## 1. Purpose

Shows a single-elimination tournament bracket and sends a beam of light along the champion's path,
round by round, until the trophy card ignites. Use it for a playoffs page, an event recap or a
season finale; for a plain results table use `Table`.

## 2. Files

```
packages/fx/src/components/bracket-beam/
├── bracket-beam.styles.tsx     # tv() slots: columns, match rows, poster wires, champion card, SVG layers. Pure.
├── bracket-beam.logic.tsx      # forwardRef server component: rounds → columns + poster; renders the island. No hooks.
├── bracket-beam.measure.tsx    # 'use client' island: scroller + SVG beams on useFxLoop, ResizeObserver layout.
├── bracket-beam.geometry.ts    # pure maths: bracket model, champion path, wire paths, timeline, sparks.
├── bracket-beam.test.tsx
├── bracket-beam.geometry.test.ts
├── bracket-beam.stories.tsx
└── index.tsx                   # export { BracketBeam } ; export type { BracketBeamProps, BracketRound, … }
packages/fx/src/styles/bracket-beam.css   # @keyframes sk-bracket-beam-* + @utility (breathe, shock, glow, bloom)
test/browser/bracket-beam.test.ts         # Playwright: beams run, layout follows resize, pause/still lifecycle, no overflow
```

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

/** A team: its name, or its name plus a seed. */
export type BracketTeam = string | BracketTeamInfo
export interface BracketTeamInfo {
  name: string // also how the champion is followed from round to round
  seed?: number | string // shown before the name
}

export interface BracketMatch {
  teams: readonly [BracketTeam, BracketTeam] // top row first
  scores?: readonly [number | string, number | string] // omit while unplayed
  winner?: 0 | 1 // omit while undecided
}

export interface BracketRound {
  name: string // column heading + the round list's accessible name, e.g. 'Quarter-finals'
  meta?: string // right of the heading, e.g. 'Bo3'
  matches: readonly BracketMatch[] // match i feeds match ⌊i/2⌋ of the next round
}

interface BracketBeamOwnProps {
  rounds: readonly BracketRound[]
  champion?: string // the winning team's name: lights its path + renders the trophy card
  championMeta?: ReactNode // line under the champion's name, e.g. <><b>3–1</b> grand final</>
  championLabel?: string // card eyebrow. Default 'Champion'
  trophyLabel?: string // trophy column heading. Default 'Trophy'
  trophyMeta?: string // right of the trophy heading, e.g. 'S04'
  winnerLabel?: string // screen-reader suffix on winning rows. Default 'winner'
  seedLabel?: string // screen-reader word before each seed ("seed 1"). Default 'seed'
  scoreLabel?: string // screen-reader word before each score ("score 2"). Default 'score'
  paused?: boolean // hold the current frame. Default false
}

export type BracketBeamProps = BracketBeamOwnProps &
  Omit<ComponentPropsWithoutRef<'div'>, 'children'>
```

- `aria-label` / `aria-labelledby` name the scrolling region (default `aria-label` is
  `'Tournament bracket'`); every other native prop lands on the root `<div>`.
- **Data rules.** Match `i` of a round feeds match `⌊i/2⌋` of the next one. A connector lands on
  the row of the next match that holds the same team name, else on the top row for even `i` and
  the bottom row for odd `i`. The champion's path is found by name: the last-round match
  `champion` won, then, round by round backwards, the feeder match they won.
- **Replay** by changing `key`; the beam loops while on screen anyway.
- Without `champion` the bracket is static: connectors, winners in bold, no beams, no trophy card.

Deliberately **not** in v1: double elimination, byes drawn as gaps, team logos, click handlers
on matches, a play-once mode, custom row renderers.

## 4. Variants → tokens

No new color token. Everything resolves through `--sk-*` tokens (`@sukunagg/ui/theme.css`).

| Part | Tokens |
|---|---|
| Match box | bg `--sk-surface-2`, border `--sk-line`, divider `--sk-line-soft`, radius `--sk-radius-sm` |
| Row text | name `--sk-font-display` 13px, `--sk-text-dim` (winner `--sk-text`, bold); seed and score `--sk-text-faint`, `font-sans tabular-nums` |
| Lit row (champion's path) | `bracket-beam-glow` wash (`--sk-accent` 28% → 6% → 10%), 2px `--sk-accent` bar, score in `--sk-bracket-beam-ink`, seed `--sk-text` at 70% |
| Heading | 10px uppercase, `--sk-tracking-eyebrow`, `--sk-text-faint` (meta `--sk-text-dim`), rule `--sk-line-soft` |
| Wires | `--sk-line` 1.5px; lit path `--sk-accent` (SVG 2px through a blur glow filter; CSS poster 1.5px with `drop-shadow` in `--sk-accent` / `--sk-accent-glow`) |
| Beam | trail `--sk-accent`, comet and flow dashes `--sk-bracket-beam-hot`, ripple + sparks `--sk-accent` |
| Champion card | bg `--sk-surface-2`, radius `--sk-radius-md`; lit: border `--sk-accent`, glow `--sk-accent-glow`, eyebrow `--sk-bracket-beam-ink`; pending: dashed `--sk-line`, placeholders `--sk-line-soft` |

Component-scoped colors, set on the root from tokens (no new token):

- `--sk-bracket-beam-ink: color-mix(in oklab, var(--sk-accent) 80%, var(--sk-text))`: the accent
  pushed toward the text color, so small lit text (scores, the eyebrow) reaches AA in both
  themes. Measured in Chromium on the lit wash: score 5.7:1 dark / 5.1:1 light (plain accent:
  4.5 / 3.7); eyebrow on the card 6.2 / 5.8. On the wash the seed uses `--sk-text` at 70%
  (6.2 / 5.3; the faint token would be 3.4 / 3.1).
- `--sk-bracket-beam-hot: color-mix(in oklab, var(--sk-accent) 62%, var(--sk-text))`: the beam's
  bright core, paler than the accent on dark themes and deeper on light ones.
- `--sk-bracket-beam-gap: clamp(36px, 6cqi, 64px)` (36px under 640px): the column gap, shared by
  the grid and the poster wires.

Layout: `grid-template-columns: repeat(<rounds>, minmax(min-content, 1fr)) minmax(min-content, 1.15fr)`
(`--sk-bracket-beam-rounds` inline) with `min-width: min-content`, so the bracket fills its
container, its columns shrink to their floor first, and only then does it scroll sideways. A round
column's floor is 146px or its heading, whichever is wider; the trophy column's is 184px or the
champion's name. Team names never widen a column (`contain: inline-size`): they truncate. Padding 14px 24px 16px 18px: the inline end is
wider than the shock ring's 22px outset, so the ring never widens the scroller (no scrollbar flash
on classic-scrollbar desktops). Under a 640px container (`@container bracket-beam`) the columns
are fixed (146px, trophy 176px) and the padding tightens (12px, start 14px; the end stays 24px).

CSS module `packages/fx/src/styles/bracket-beam.css` (two keyframes):

```css
@keyframes sk-bracket-beam-breathe {
  to { opacity: 0.55; scale: 0.92; }
}
@keyframes sk-bracket-beam-shock {
  from { opacity: 1; }
  to { opacity: 0; inset: -22px; border-radius: 32px; }
}
@utility animate-bracket-beam-breathe {
  animation: sk-bracket-beam-breathe 2.4s ease-in-out 0.6s infinite alternate;
  @media (prefers-reduced-motion: reduce) { animation: none; }
}
@utility animate-bracket-beam-shock {
  animation: sk-bracket-beam-shock 0.9s var(--sk-ease);
  @media (prefers-reduced-motion: reduce) { animation: none; }
}
@utility bracket-beam-glow { /* lit row wash */
  background-image: linear-gradient(90deg,
    color-mix(in oklab, var(--sk-accent) 28%, transparent),
    color-mix(in oklab, var(--sk-accent) 6%, transparent) 72%,
    color-mix(in oklab, var(--sk-accent) 10%, transparent));
}
@utility bracket-beam-bloom { /* the trophy card's breathing halo */
  background-image: radial-gradient(closest-side,
    color-mix(in oklab, var(--sk-accent) 30%, transparent), transparent);
}
```

Timeline (ms, one loop; `N` = segments on the champion's path, 3 for 8 teams): beam `i` leaves
at `420 + 900·i` and travels 560 ms (ease-in head, the tail drains into the box); each row on the
path lights as its beam lands (the first at 100); the trophy ignites when the last beam lands
(`IGN`), with a shock ring, a perimeter burst of sparks and rising embers; flow dashes march
along the lit path; everything fades at `IGN + 2520` and the loop restarts 700 ms later (6 s for
8 teams).

## 5. States

| State | Behavior |
|---|---|
| server / no-JS (poster) | Boxes, CSS connectors, the champion's rows lit, trophy card lit. The final frame. |
| `data-state="paused"` | Island mounted, off-screen or hidden tab or `paused`: holds its frame. First paint after hydration is the lit frame (the poster's twin). |
| `data-state="running"` | SVG replaces the CSS connectors (crossfade). Lit path fades, then beams travel round by round; the scroller follows the beam when the bracket overflows, until the viewer scrolls it. |
| `data-state="still"` (`prefers-reduced-motion: reduce`) | One still frame: the lit path, the trophy lit, no beams, sparks, ripples or flow; the breathe and shock loops stop. An overflowing bracket scrolls to the trophy once. |
| no `champion` | Static: connectors only, the loop settles and requests no frames. |
| overflowing (narrow container) | Scrolls sideways; the region becomes a tab stop (`tabindex="0"`, focus ring) only while it overflows. |

`data-state` lives on the island's scroller (`[data-sk-fx="bracket-beam"] > [data-state]`), the
element `useFxLoop` observes; the root carries `data-sk-fx="bracket-beam"`.

## 6. Logic (`bracket-beam.logic.tsx`)

- **No `'use client'`**: no hooks, no DOM access. Renders the root, the round columns, the poster
  wires and the trophy card, then `<BracketBeamMeasure>` (the island) around the columns. Guarded
  by the RSC test in `packages/fx/src/index.test.ts`.
- `forwardRef<HTMLDivElement, BracketBeamProps>`; destructures every own prop so none leaks.
- `bracketModel(rounds, champion)` (geometry module) gives the links, the champion's path and
  each poster wire's direction and offsets (inline `--sk-bracket-beam-*` numbers; classes stay
  literal). Rows on the path carry `data-trail`; match boxes carry `data-match="<round>-<index>"`.
- Island props are serializable (links as tuples, path indices, strings, booleans). The island is
  keyed by the link signature, so new bracket data remounts it.
- **Island** (`bracket-beam.measure.tsx`, `'use client'`): `useFxLoop` on its scroller. In the
  effect it builds the SVG (one glow filter, base wires, per-segment trail/flow/comet/ripple, a
  head and 49 seeded sparks), measures boxes with `getBoundingClientRect` in its own
  `ResizeObserver` (and after `document.fonts.ready`), and paints by writing SVG attributes and
  toggling `data-dim` on the path rows and the trophy card. It never touches React-rendered text
  or attributes; teardown removes everything it added (StrictMode-safe).

## 7. Styles (`bracket-beam.styles.tsx`)

`bracketBeamStyles` (`tv()` slots): `root` (component colors), `scroller` (`group/fx`,
`@container/bracket-beam`, thin scrollbar, focus ring), `grid` (variant `champion`: with or
without the trophy column), `column`, `heading`, `headingMeta`, `list`, `slot`, `match`, `row`,
`seed`, `name`, `score` (variants `winner`, `trail`), `wire` (variants `dir`: down / up / flat,
`lit`), `trophy`, `card`, `bloom`, `eyebrow`, `crown`, `title`, `titleText`, `meta`, `metaText`,
`bar`, `overlay`, `svg`.

`bracketBeamLayers`: the SVG classes the island sets on what it creates (`base`, `trail`, `flow`,
`tail`, `comet`, `core`, `ring`, `halo`, `head`, `spark`, `sparkHot`), kept here so Tailwind finds
them. Every class is a literal string; the poster/SVG crossfade uses the
`group-data-[state=…]/fx` strings from `BUILDERS.md` §3.

```ts
// excerpt
row: 'group/row relative isolate flex h-[26px] items-center gap-2 pr-2.5 pl-[9px] font-display …',
trail: {
  true: {
    row: 'before:bracket-beam-glow … data-[dim]:before:scale-x-0 data-[dim]:before:opacity-0 …',
    seed: 'text-text/70 group-data-[dim]/row:text-text-faint',
    score: 'text-(--sk-bracket-beam-ink) group-data-[dim]/row:text-text',
  },
},
wire: 'absolute left-full w-(--sk-bracket-beam-gap) top-[calc(50%+var(--sk-bracket-beam-ys)*100%+var(--sk-bracket-beam-y)*1px)] …',
```

Size: 7.6 kB min+brotli with the shared loop (`.size-limit.json` budget 8 kB): the bracket markup
and poster classes plus the island's beam, comet and spark code.

## 8. Accessibility checklist

- [ ] The bracket is a named region (`aria-label`, default 'Tournament bracket'); each round is an
      `<ol>` named by the round; headings are visual duplicates and `aria-hidden`.
- [ ] Every team name, seed and score is real text, and a row reads as a sentence, not bare
      numbers: "seed 1 Crimson Vow score 2, winner" (`sr-only` words from `seedLabel`,
      `scoreLabel`, `winnerLabel`); the champion card reads "Champion, <name>, <meta>".
- [ ] Wires, beams, sparks, the bloom and the placeholders are `aria-hidden`; the SVG lives in an
      `aria-hidden` wrapper.
- [ ] The scroller is a keyboard tab stop with a visible focus ring only while it overflows
      (WCAG 2.1.1), like `Table scroll`.
- [ ] Small lit text keeps AA on the lit wash in both themes: scores and the eyebrow in
      `--sk-bracket-beam-ink`, seeds in `--sk-text` at 70% (measured, § 4).
- [ ] Reduced motion: still frame, no loops; the final state is fully shown.
- [ ] No flashing (WCAG 2.3.1): the trophy ignites once per 6 s loop; nothing flashes more than
      3 times a second.
- [ ] The beam's auto-scroll never moves the page, only the bracket's own scroller, and stops for
      good once the viewer scrolls it.

## 9. Tests

`bracket-beam.test.tsx` (happy-dom + `test/fx.ts` fakes) and `bracket-beam.geometry.test.ts`:

- Server render: every round, team, seed and score; the poster wires with their inline offsets;
  path rows `data-trail` and lit; no `data-state`; `aria-hidden` decoration.
- Hydrates without warnings (reduced motion env, then `flushEffects`).
- Island: `paused` → `running` on intersect; frames advance the timeline (rows gain and lose
  `data-dim`, the trophy goes pending and ignites, trail dash offsets move); `still` under reduced
  motion with no pending frames and nothing dimmed; no champion settles; unmount leaves no frames,
  an empty SVG and no `data-dim`.
- Layout from stubbed rects: wire `d` strings, the tab stop toggles with overflow, the scroller
  follows the beam until touched.
- Forwards `ref`, merges `className`, passes native props, `aria-label` override; localized
  labels (`championLabel`, `trophyLabel`, `winnerLabel`, `seedLabel`, `scoreLabel`).
- axe in dark and light.
- Geometry: model (links, rows by name, champion path, poster directions), wire paths and lengths,
  timeline, head easing, perimeter, sparks.

Browser (`test/browser/bracket-beam.test.ts`): runs and ticks; trail and rows animate; a wire's
`d` changes after a viewport resize; hidden tab and off-screen (a 4000px spacer) report `paused`
with no frames and resume; reduced motion switched live goes `still` with no frames and back to
`running`; the scroller never widens across a full loop (shock ring) and a bracket that fits
(SixteenTeams at 1240px, Playground at 900px) neither scrolls nor becomes a tab stop; the Phone
story overflows, becomes a tab stop, follows the beam and truncates no winner name; reduced
motion on load is `still`, lit and frame-free; no console errors.

## 10. Stories

`Playground` (controls; the mockup's eight-team playoffs inside an event card), `Phone` (a 360px
device frame: the bracket scrolls and follows the beam), `SixteenTeams` (four rounds),
`InProgress` (no champion yet: static, undecided matches). Story ids `fx-bracketbeam--playground`,
`fx-bracketbeam--phone`, `fx-bracketbeam--sixteen-teams`, `fx-bracketbeam--in-progress`.

## 11. Decisions

- Approved as one of the five `@sukunagg/fx` effects (Q38 scout, Q39 build go-ahead); mockup
  `fx-mockups/parts/bracket-beam.html` is the visual target.
- Data-driven (`rounds` → matches → `{ teams, scores, winner }`), not consumer-rendered boxes:
  the island must find every box and row to measure (build brief §16).
- Poster connectors are CSS (two bordered halves per wire, offsets from the data), so no-JS and
  the first paint show a complete bracket; the island crossfades to measured SVG.
- The island starts on the lit frame (the poster's twin), holds ~1 s, fades and then loops, so
  hydration never jumps.
- `// DECISION(open): bracket-beam hot/ink colors` — `light-dark()` would match the mockup's
  per-scheme mix exactly, but theme blocks don't set `color-scheme` yet (`docs/theming.md` T2).
  Until then both colors are `color-mix(accent, text)`, which moves the right way in every theme.
- `// DECISION(open): bracket-beam pending placeholder` — the mockup's "Awaiting grand final"
  pending line is a bar here, so the component ships no extra English string.
- `// DECISION(open): bracket-beam lit row contrast` — the lit-row wash ends at 10% accent (the
  mockup's 18%), lit scores and the eyebrow use `--sk-bracket-beam-ink` instead of the plain
  accent, and lit seeds use `--sk-text` at 70% instead of faint, so small text keeps AA (§ 4).
- Size budget 8 kB (measured 7.6 kB) against the 3 kB proposed in `BUILDERS.md`: BracketBeam
  ships a whole data-driven bracket (markup, CSS poster wires, trophy card) besides the island.
- No mono token: headings, seeds, scores and meta use `font-sans tabular-nums` (build brief §7).
- Winner rows are bold (700), not the mockup's 750: when Archivo isn't loaded, a fallback family
  without a 750 face resolves to its 900 face under the CSS font-matching rules (Arial Black in
  Firefox on Windows), which truncated the winners in the Phone story's 146px columns.
- Review round 1 layout fixes against the mockup: the grid's inline-end padding is 24px (the
  mockup's 18px let the 22px shock ring widen the scroller on every ignition), and the grid is
  `min-width: min-content` over min-content tracks with 146px / 184px floors. The mockup's
  `max-content` grid with a fixed `minmax(184px, 1.15fr)` trophy track held every round column
  at 160px or more (184 / 1.15), so brackets that fit still scrolled by a few px.
