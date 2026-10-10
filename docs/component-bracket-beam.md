# Component: BracketBeam

> Follows the `docs/component-button.md` template. **Server component** in `@sukunagg/fx`
> (showpieces & FX wave, Q38/Q39; double elimination Q42/Q43). The bracket, its connectors and the
> champion's lit path are server-rendered HTML and CSS (the poster); a small client island
> (`bracket-beam.measure.tsx`) measures the real layout and draws the travelling SVG beams on the
> shared fx loop (`packages/fx/src/internal/loop.ts`). Builder guide: `packages/fx/BUILDERS.md`.

## 1. Purpose

Shows a tournament bracket and sends a beam of light along the champion's path, round by round,
until the trophy card ignites. Single elimination by default; `format="double"` adds an upper and a
lower bracket, a grand final and the optional bracket reset, and the beam follows the champion even
when they come back from the lower bracket. Lower-bracket rows show which upper match each team
dropped from, so no wire has to cross the bracket. Use it for a playoffs page, an event recap or a
season finale; for a plain results table use `Table`.

## 2. Files

```
packages/fx/src/components/bracket-beam/
├── bracket-beam.styles.tsx     # tv() slots: columns, bands, match rows, drop chip, poster wires, champion card, SVG layers. Pure.
├── bracket-beam.logic.tsx      # forwardRef server component: rounds/bands → columns + poster; renders the island. No hooks.
├── bracket-beam.measure.tsx    # 'use client' island: scroller + SVG beams on useFxLoop, ResizeObserver layout.
├── bracket-beam.geometry.ts    # pure maths: single-elimination model, champion path, wire paths, timeline, sparks.
├── bracket-beam.double.ts      # pure: double-elimination link validation, columns, px poster wires, champion path, drops.
├── bracket-beam.test.tsx
├── bracket-beam.geometry.test.ts
├── bracket-beam.double.test.ts
├── bracket-beam.stories.tsx
└── index.tsx                   # export { BracketBeam } ; export type { BracketBeamProps, BracketRound, … }
packages/fx/src/styles/bracket-beam.css   # @keyframes sk-bracket-beam-* + @utility (breathe, shock, glow, bloom, double, band, drop)
test/browser/bracket-beam.test.ts         # Playwright: beams run, layout follows resize, pause/still lifecycle, no overflow, double path
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
  id?: string // required in double elimination; ignored in single
  next?: BracketNext // double elimination only: where the winner and the loser go next
}

export interface BracketNext {
  winner?: string // the `id` of the match the winner plays next: a connector
  loser?: string // the `id` of the lower-bracket match the loser drops to: a drop chip, no wire
}

export interface BracketRound {
  name: string // column heading + the round list's accessible name, e.g. 'Quarter-finals'
  meta?: string // right of the heading, e.g. 'Bo3'
  matches: readonly BracketMatch[] // single elimination: match i feeds match ⌊i/2⌋ of the next round
}

export interface BracketGrandFinal {
  match: BracketMatch // give it an `id`: both finals' `next.winner` name it
  reset?: BracketMatch // the bracket reset: include it once it's scheduled or played
  name?: string // column heading, default 'Grand final'
  resetName?: string // default 'Reset'
  meta?: string // right of both headings, e.g. 'Bo5'
}

interface BracketBeamSharedProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
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

export interface BracketBeamSingleProps extends BracketBeamSharedProps {
  format?: 'single' // default
  rounds: readonly BracketRound[]
}

export interface BracketBeamDoubleProps extends BracketBeamSharedProps {
  format: 'double'
  upper: readonly BracketRound[] // round 1 first
  lower: readonly BracketRound[] // round 1 first
  grandFinal: BracketGrandFinal
  upperLabel?: string // band label + its group's name. Default 'Upper bracket'
  lowerLabel?: string // default 'Lower bracket'
  /** Chip text for a dropped team, from the upper round + match index. Default 'SF1' style. */
  dropLabel?: (round: BracketRound, matchIndex: number) => string
  /** Spoken after the team's name. Default 'dropped from Semi-final 1'. */
  dropSpokenLabel?: (roundName: string, matchIndex: number) => string
}

export type BracketBeamProps = BracketBeamSingleProps | BracketBeamDoubleProps
```

Discriminated on `format`; existing single-elimination code keeps working unchanged (no `format` =
single, and its server markup is byte-for-byte what it was before double elimination shipped).
Write `format="double"` as a literal attribute so TypeScript types the label callbacks.

```tsx
<BracketBeam format="double" champion="Sahuaros" championMeta="Desde la llave inferior"
  upperLabel="Llave superior" lowerLabel="Llave inferior"
  upper={upperRounds} lower={lowerRounds}
  grandFinal={{ match: gf, reset: gfReset, name: 'Gran final', resetName: 'Reinicio', meta: 'Bo5' }} />
// match: { id: 'ub-sf1', teams, scores, winner: 0, next: { winner: 'ub-final', loser: 'lb-r2-2' } }
```

- `aria-label` / `aria-labelledby` name the scrolling region (default `aria-label` is
  `'Tournament bracket'`); every other native prop lands on the root `<div>`.
- **Data rules (single).** Match `i` of a round feeds match `⌊i/2⌋` of the next one. A connector
  lands on the row of the next match that holds the same team name, else on the top row for even
  `i` and the bottom row for odd `i`. The champion's path is found by name: the last-round match
  `champion` won, then, round by round backwards, the feeder match they won.
- **Data rules (double).** Every upper, lower and grand-final match has a unique `id`, and links are
  explicit (owner, Q42 recommendation 4: lower-bracket seeding varies by organizer, so no position
  rule). `next.winner` / `next.loser` name the destination match. The upper final's and the lower
  final's `next.winner` are the grand final; the grand final's winner goes to `reset` when present,
  else to the trophy; the reset's winner goes to the trophy (the grand final's and the reset's own
  `next` are ignored). A connector lands on the destination's row holding the same team, else on
  its first free row (winner links before loser links, upper before lower). A missing or duplicate
  id, an unknown id, a match fed by more than two links, a winner link that doesn't move to a later
  column, or a cycle **throw in development** and render the bracket without wires, drop chips or a
  lit path in production.
- **Replay** by changing `key`; the beam loops while on screen anyway.
- Without `champion` the bracket is static: connectors, winners in bold, drop chips, no beams, no
  trophy card.

Deliberately **not** in v1: byes drawn as gaps, team logos, click handlers on matches, a play-once
mode, custom row renderers; and for double elimination: triple elimination, Swiss/round-robin
stages, a lower bracket shown as a separate scroller.

## 4. Variants → tokens

No new color token. Everything resolves through `--sk-*` tokens (`@sukunagg/ui/theme.css`).

| Part | Tokens |
|---|---|
| Match box | bg `--sk-surface-2`, border `--sk-line`, divider `--sk-line-soft`, radius `--sk-radius-sm` |
| Row text | name `--sk-font-display` 13px, `--sk-text-dim` (winner `--sk-text`, bold); seed and score `--sk-text-faint`, `font-sans tabular-nums` |
| Lit row (champion's path) | `bracket-beam-glow` wash (`--sk-accent` 28% → 6% → 10%), 2px `--sk-accent` bar, score in `--sk-bracket-beam-ink`, seed `--sk-text` at 70% |
| Heading | 10px uppercase, `--sk-tracking-eyebrow`, `--sk-text-faint` (meta `--sk-text-dim`), rule `--sk-line-soft` |
| Band label (double) | `--sk-font-display` italic 700, 11px uppercase, tracking .14em, `--sk-text-dim`, with a 1px `--sk-line-soft` rule to its right |
| Drop chip (double) | 10px bold `font-sans`, 1px `--sk-line` border, 4px radius, `--sk-text-faint` ("▼ SF1"); on the champion's lit row `--sk-bracket-beam-ink` with an `--sk-accent` border at 50% |
| Wires | `--sk-line` 1.5px; lit path `--sk-accent` (SVG 2px through a blur glow filter; CSS poster 1.5px with `drop-shadow` in `--sk-accent` / `--sk-accent-glow`) |
| Beam | trail `--sk-accent`, comet and flow dashes `--sk-bracket-beam-hot`, ripple + sparks `--sk-accent` |
| Champion card | bg `--sk-surface-2`, radius `--sk-radius-md`; lit: border `--sk-accent`, glow `--sk-accent-glow`, eyebrow `--sk-bracket-beam-ink`; pending: dashed `--sk-line`, placeholders `--sk-line-soft` |

Component-scoped colors, set on the root from tokens (no new token):

- `--sk-bracket-beam-ink: color-mix(in oklab, var(--sk-accent) 80%, var(--sk-text))`: the accent
  pushed toward the text color, so small lit text (scores, the eyebrow, the champion's drop chip)
  reaches AA in both themes. Measured in Chromium on the lit wash: score 5.7:1 dark / 5.1:1 light
  (plain accent: 4.5 / 3.7); eyebrow on the card 6.2 / 5.8. On the wash the seed uses `--sk-text`
  at 70% (6.2 / 5.3; the faint token would be 3.4 / 3.1).
- `--sk-bracket-beam-hot: color-mix(in oklab, var(--sk-accent) 62%, var(--sk-text))`: the beam's
  bright core, paler than the accent on dark themes and deeper on light ones.
- `--sk-bracket-beam-gap: clamp(36px, 6cqi, 64px)` (36px under 640px): the column gap, shared by
  the grid and the poster wires.

Layout (single): `grid-template-columns: repeat(<rounds>, minmax(min-content, 1fr)) minmax(min-content, 1.15fr)`
(`--sk-bracket-beam-rounds` inline) with `min-width: min-content`, so the bracket fills its
container, its columns shrink to their floor first, and only then does it scroll sideways. A round
column's floor is 146px or its heading, whichever is wider; the trophy column's is 184px or the
champion's name. Team names never widen a column (`contain: inline-size`): they truncate. Padding 14px 24px 16px 18px: the inline end is
wider than the shock ring's 22px outset, so the ring never widens the scroller (no scrollbar flash
on classic-scrollbar desktops). Under a 640px container (`@container bracket-beam`) the columns
are fixed (146px, trophy 176px) and the padding tightens (12px, start 14px; the end stays 24px).

Layout (double): columns = max(upper rounds, lower rounds) (`--sk-bracket-beam-band`) + grand
final + reset (if any) + trophy, the same track template (`--sk-bracket-beam-rounds` = band + 1 or
2). Each band is a subgrid row spanning the band columns: the upper band in row 1, the lower band in
row 2 (14px below it); the grand-final, reset and trophy columns span both rows, their headings
level with the upper band's, their match or card centred. Rows keep their content height
(`align-content: start`). Round columns have a 176px floor (the mockup's 178), so a name still
fits beside a drop chip; under a 640px container every track is a fixed 176px.

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
@utility bracket-beam-double { /* the two-band grid */
  grid-template-rows: auto auto;
  align-content: start;
  @container bracket-beam (width <= 640px) {
    [data-sk-fx] & { grid-template-columns: repeat(var(--sk-bracket-beam-rounds), 176px); grid-auto-columns: 176px; }
  }
}
@utility bracket-beam-band { /* a band's label, with a rule to its right */
  display: flex; align-items: center; gap: 10px; height: 18px; margin-bottom: 6px; overflow: hidden;
  font: italic 700 11px / 1 var(--sk-font-display); letter-spacing: 0.14em;
  text-transform: uppercase; white-space: nowrap; color: var(--sk-text-dim);
  &::after { content: ""; flex: 1; height: 1px; background: var(--sk-line-soft); }
}
@utility bracket-beam-drop { /* the drop chip; colors come from the row */
  flex-shrink: 0; padding: 0 4px; border-width: 1px; border-style: solid; border-radius: 4px;
  font: 700 10px / 15px var(--sk-font-sans); letter-spacing: 0.02em; white-space: nowrap;
}
```

Timeline (ms, one loop; `N` = steps on the champion's path, 3 for an 8-team single bracket, 7 for
the 8-team double story): beam `i` leaves at `420 + 900·i` and travels 560 ms (ease-in head, the
tail drains into the box); each row on the path lights as its beam lands (the first at 100); the
trophy ignites when the last beam lands (`IGN`), with a shock ring, a perimeter burst of sparks and
rising embers; flow dashes march along the lit path; everything fades at `IGN + 2520` and the loop
restarts 700 ms later (6 s for 3 steps, 9.6 s for 7). A **drop** into the lower bracket is a step
with no wire: nothing travels, and when it lands the row the champion dropped into lights, with a
ripple and a spark burst on its drop chip; the next beam leaves from there.

## 5. States

| State | Behavior |
|---|---|
| server / no-JS (poster) | Boxes, CSS connectors, the champion's rows lit (and their drop chip), trophy card lit. The final frame. |
| `data-state="paused"` | Island mounted, off-screen or hidden tab or `paused`: holds its frame. First paint after hydration is the lit frame (the poster's twin). |
| `data-state="running"` | SVG replaces the CSS connectors (crossfade). Lit path fades, then beams travel step by step (through the drop chip in double elimination); the scroller follows the beam when the bracket overflows, until the viewer scrolls it. |
| `data-state="still"` (`prefers-reduced-motion: reduce`) | One still frame: the lit path, the trophy lit, no beams, sparks, ripples or flow; the breathe and shock loops stop. An overflowing bracket scrolls to the trophy once. |
| no `champion` | Static: connectors (and drop chips) only, the loop settles and requests no frames. |
| overflowing (narrow container) | Scrolls sideways; the region becomes a tab stop (`tabindex="0"`, focus ring) only while it overflows. |
| double: reset | The reset column renders only when `grandFinal.reset` is given. |
| double: the lit path | Every match the champion won, the wires between them, and the drop chip where they fell to the lower bracket; the upper match they lost is lit too (and the grand final they lost, when they won the reset), so the path reads as one story. |
| double: broken links | Development throws (`[@sukunagg/fx] BracketBeam: …`); production renders the boxes without wires, chips or a lit path. |

`data-state` lives on the island's scroller (`[data-sk-fx="bracket-beam"] > [data-state]`), the
element `useFxLoop` observes; the root carries `data-sk-fx="bracket-beam"`.

## 6. Logic (`bracket-beam.logic.tsx`)

- **No `'use client'`**: no hooks, no DOM access. Renders the root, the round columns (in double
  elimination: the two bands, then the grand-final and reset columns), the poster wires and the
  trophy card, then `<BracketBeamMeasure>` (the island) around them. Guarded by the RSC test in
  `packages/fx/src/index.test.ts`.
- `forwardRef<HTMLDivElement, BracketBeamProps>`; destructures every own prop of both formats so
  none leaks onto the root.
- Single: `bracketModel(rounds, champion)` (geometry module) gives the links, the champion's path
  and each poster wire's direction and offsets (inline `--sk-bracket-beam-*` numbers; classes stay
  literal). Match boxes carry `data-match="<round>-<index>"`.
- Double: `doubleModel(upper, lower, grandFinal, champion)` (`bracket-beam.double.ts`) validates the
  links, assigns columns (upper round `i` → column `i`, lower round `i` → column `i`; grand final,
  reset and trophy after the wider band) and walks the champion's path forward from their first
  match: a win follows `next.winner` (the grand final: the reset, else the trophy), a loss follows
  `next.loser` (a drop) or, in the grand final, the reset. Wires are drawn only along `next.winner`
  links (and grand final → reset → trophy), from the winner's row to the destination row holding
  the same team; a champion who lost the grand final and won the reset gets the reset wire from
  their own row. Loser links never draw wires: they become drop chips on the destination row.
  Match boxes carry `data-match="u<round>-<i>"`, `"l<round>-<i>"`, `"gf"`, `"gr"`.
- Double poster wires are grid children over both bands (inline `grid-column`, px offsets from the
  model's fixed heights: band label 24px, round heading 29px, slot 78px, band gap 14px, row ±13px),
  in the gap left of the destination's column or across the columns between, so a column's width
  never moves them. Measured in Chromium: every poster wire matches its SVG twin to 0px.
- Rows on the path carry `data-trail`; the island gets them as an ordered list (`rows`), so lighting
  follows the path, not DOM order.
- Island props are serializable (links as tuples, path indices, row keys, strings, booleans). The
  island is keyed by the link/path signature, so new bracket data remounts it.
- **Island** (`bracket-beam.measure.tsx`, `'use client'`): `useFxLoop` on its scroller. In the
  effect it builds the SVG (one glow filter, base wires, per-step trail/flow/comet/ripple, a head
  and the seeded sparks), measures boxes with `getBoundingClientRect` in its own `ResizeObserver`
  (and after `document.fonts.ready`), and paints by writing SVG attributes and toggling `data-dim`
  on the path rows and the trophy card. A drop step (link flag `drop`) gets no base wire and no
  comet; its ripple and sparks play on the destination row's `[data-drop]` chip. It never touches
  React-rendered text or attributes; teardown removes everything it added (StrictMode-safe).

## 7. Styles (`bracket-beam.styles.tsx`)

`bracketBeamStyles` (`tv()` slots): `root` (component colors), `scroller` (`group/fx`,
`@container/bracket-beam`, thin scrollbar, focus ring), `grid` (variants `champion`: with or
without the trophy column; `double`: `bracket-beam-double`), `column` (variants `double`: 176px
floor; `span`: a grand-final/reset/trophy column over both bands), `band` (a subgrid band; variant
`lower`), `bandLabel` (`bracket-beam-band`), `drop` (`bracket-beam-drop`), `heading`,
`headingMeta`, `list`, `slot`, `match`, `row`, `seed`, `name`, `score` (variants `winner`, `trail`;
`trail` also lights the drop chip), `wire` (variants `dir`: down / up / flat, `lit`, `place`: end /
over for double's grid-child wires), `trophy`, `card`, `bloom`, `eyebrow`, `crown`, `title`,
`titleText`, `meta`, `metaText`, `bar`, `overlay`, `svg`.

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
    drop: 'border-accent/50 text-(--sk-bracket-beam-ink) group-data-[dim]/row:border-line …',
  },
},
wire: 'absolute left-full w-(--sk-bracket-beam-gap) top-[calc(50%+var(--sk-bracket-beam-ys)*100%+var(--sk-bracket-beam-y)*1px)] …',
place: { end: { wire: 'row-[1/3] left-auto right-full' }, over: { wire: 'row-[1/3] -left-(--sk-bracket-beam-gap) -right-(--sk-bracket-beam-gap) w-auto' } },
```

Size: 9.94 kB min+brotli with the shared loop (`.size-limit.json` budget 10.5 kB; single
elimination alone was 7.69 kB): the bracket markup and poster classes, the double-elimination model
(validation, px poster wires, drops; ≈ 1.9 kB) and the island's beam, comet and spark code.
`theme.css` stays 3.63 kB (budget 4 kB).

## 8. Accessibility checklist

- [ ] The bracket is a named region (`aria-label`, default 'Tournament bracket'); each round is an
      `<ol>` named by the round; headings are visual duplicates and `aria-hidden`.
- [ ] Double elimination: each band is a `role="group"` named by its label (`upperLabel`,
      `lowerLabel`); its visible label is `aria-hidden`; rounds stay lists named by the round name.
- [ ] Every team name, seed and score is real text, and a row reads as a sentence, not bare
      numbers: "seed 1 Crimson Vow score 2, winner" (`sr-only` words from `seedLabel`,
      `scoreLabel`, `winnerLabel`); the champion card reads "Champion, <name>, <meta>".
- [ ] A dropped team's row reads "seed 4 Sahuaros, dropped from Semi-final 1, score 2, winner": the
      chip ("▼ SF1") is `aria-hidden` (its `title` gives mouse users the long form) and the spoken
      label (`dropSpokenLabel`) follows the name.
- [ ] The reset is announced by its column name (the list's `aria-label`, `resetName`).
- [ ] Wires, beams, sparks, the bloom and the placeholders are `aria-hidden`; the SVG lives in an
      `aria-hidden` wrapper.
- [ ] The scroller is a keyboard tab stop with a visible focus ring only while it overflows
      (WCAG 2.1.1), like `Table scroll`.
- [ ] Small lit text keeps AA on the lit wash in both themes: scores, the eyebrow and the
      champion's drop chip in `--sk-bracket-beam-ink`, seeds in `--sk-text` at 70% (measured, § 4).
- [ ] Reduced motion: still frame, no loops; the final state is fully shown.
- [ ] No flashing (WCAG 2.3.1): the trophy ignites once per loop (6 s or more); nothing flashes
      more than 3 times a second.
- [ ] The beam's auto-scroll never moves the page, only the bracket's own scroller, and stops for
      good once the viewer scrolls it.

## 9. Tests

`bracket-beam.test.tsx` (happy-dom + `test/fx.ts` fakes), `bracket-beam.geometry.test.ts` and
`bracket-beam.double.test.ts` (100% of the double module):

- Server render: every round, team, seed and score; the poster wires with their inline offsets;
  path rows `data-trail` and lit; no `data-state`; `aria-hidden` decoration.
- Hydrates without warnings (reduced motion env, then `flushEffects`), both formats.
- Island: `paused` → `running` on intersect; frames advance the timeline (rows gain and lose
  `data-dim`, the trophy goes pending and ignites, trail dash offsets move); `still` under reduced
  motion with no pending frames and nothing dimmed; no champion settles; unmount leaves no frames,
  an empty SVG and no `data-dim`.
- Layout from stubbed rects: wire `d` strings, the tab stop toggles with overflow, the scroller
  follows the beam until touched.
- Forwards `ref`, merges `className`, passes native props, `aria-label` override; localized
  labels (`championLabel`, `trophyLabel`, `winnerLabel`, `seedLabel`, `scoreLabel`).
- axe in dark and light, both formats.
- Geometry: model (links, rows by name, champion path, poster directions), wire paths and lengths,
  timeline, head easing, perimeter, sparks.
- Double model: link validation errors (missing/duplicate/unknown id, a winner link that doesn't
  move right, more than two feeders, a cycle; production renders without wires), columns for 4, 8
  and 16 teams, px poster wires, destination rows and drop chips (undecided feeders, a team listed
  twice), the champion's path from the upper and from the lower bracket, with and without a reset
  (and the upper team losing the grand final, then winning the reset), paths that stop early.
- Double component: an 8-team server render (named band groups, round lists, the grand-final and
  reset lists, root custom properties), drop chips and their spoken labels, lit rows through the
  drop, poster wires as grid children, no reset column without a reset, static without a champion,
  localized bands/columns/drop labels, dev throw vs production, island wires (none for the drop, no
  comet), the reset wire from the champion's own row, rows lighting in path order with the ripple on
  the chip, reduced motion.
- Single elimination unchanged: `format="single"` renders the same markup as no format, and none of
  the double-elimination markup appears. (Byte-identity with the pre-double markup was verified by
  hashing the server HTML before and after, React 18 and 19; not committed, per `docs/testing.md`'s
  no-HTML-snapshot rule.)

Browser (`test/browser/bracket-beam.test.ts`): runs and ticks; trail and rows animate; a wire's
`d` changes after a viewport resize; hidden tab and off-screen (a 4000px spacer) report `paused`
with no frames and resume; reduced motion switched live goes `still` with no frames and back to
`running`; the scroller never widens across a full loop (shock ring) and a bracket that fits
(SixteenTeams at 1240px, Playground at 900px) neither scrolls nor becomes a tab stop; the Phone
story overflows, becomes a tab stop, follows the beam and truncates no winner name; reduced
motion on load is `still`, lit and frame-free; no console errors. Double elimination: the beam
reaches the trophy along a lower-bracket path (the trophy goes pending, the drop chip's row lights,
the beam's head then travels below the lower band's top, then the trophy ignites); under reduced
motion one still frame with all seven path rows lit and six drawn trail segments (the drop has none).

## 10. Stories

`Playground` (controls; the mockup's eight-team playoffs inside an event card), `Phone` (a 360px
device frame: the bracket scrolls and follows the beam), `SixteenTeams` (four rounds),
`InProgress` (no champion yet: static, undecided matches), `DoubleElimination` (8 teams, the Q42
mockup's Copa Otoño: the champion comes back from the lower bracket and wins the reset),
`DoubleNoReset` (the upper bracket's unbeaten team wins the grand final: no reset column),
`DoubleStatic` (mid-event, no champion: drop chips, undecided matches, TBD rows). Story ids
`fx-bracketbeam--playground`, `fx-bracketbeam--phone`, `fx-bracketbeam--sixteen-teams`,
`fx-bracketbeam--in-progress`, `fx-bracketbeam--double-elimination`,
`fx-bracketbeam--double-no-reset`, `fx-bracketbeam--double-static`. Reviewed in dark and light.

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
- No mono token: headings, seeds, scores and meta use `font-sans tabular-nums` (build brief §7).
- Winner rows are bold (700), not the mockup's 750: when Archivo isn't loaded, a fallback family
  without a 750 face resolves to its 900 face under the CSS font-matching rules (Arial Black in
  Firefox on Windows), which truncated the winners in the Phone story's 146px columns.
- Review round 1 layout fixes against the mockup: the grid's inline-end padding is 24px (the
  mockup's 18px let the 22px shock ring widen the scroller on every ignition), and the grid is
  `min-width: min-content` over min-content tracks with 146px / 184px floors. The mockup's
  `max-content` grid with a fixed `minmax(184px, 1.15fr)` trophy track held every round column
  at 160px or more (184 / 1.15), so brackets that fit still scrolled by a few px.
- **Double elimination (Q42, Q43):** explicit `id` / `next` links (owner, Q42 recommendation 4);
  single elimination keeps the position rule. Drop chips instead of cross-bracket wires. Built last
  in the Q42 wave: it pays off once Pitaya's API serves double-elimination brackets.
- Double: the props type is a union discriminated on `format`, so single-elimination callers are
  untouched; their server markup was verified byte-identical before and after.
- Double: the poster's wires are absolutely positioned grid children over both bands, placed in px
  from the model's fixed heights (§ 6), instead of the single elimination's slot fractions inside
  each match: a wire from a final into the grand final crosses bands and empty columns, and columns
  can differ in width (a long heading widens its column), so only a grid-area containing block is
  exact. The double grid's rows don't stretch (`align-content: start`) for the same reason.
- Double: a drop is a beam step with no travelling beam: its ripple and sparks play on the drop chip
  as the row lights, and the next beam leaves from the lower bracket. The chip is the only visual
  link between the brackets, as the spec asks.
- Double: when the upper bracket's team loses the grand final and wins the reset, the grand final →
  reset wire leaves the champion's row (both teams play the reset), so the lit path stays connected.
- Double: validation also rejects a missing or duplicate id and a winner link that doesn't move to a
  later column (the spec lists unknown ids, more than two feeders and cycles); each would draw a
  wrong or backwards connector. Production renders without wires, as for the spec's three.
- Double: the default chip is the round name's initials plus the match number ('Semi-final' match 0
  → 'SF1'; no number for a one-match round, e.g. 'UF'; a round name ending in a digit gets a dash,
  'R1-2'); the default spoken label is "dropped from <round name> <n>". Both are props.
- Double: the spoken drop label follows the team's name ("seed 4 Sahuaros, dropped from Semi-final
  1, score 2, winner"), keeping the existing row sentence order (the spec's example put the name
  first); the visible chip sits before the name, as in the mockup, and is `aria-hidden`.
- Double: round columns get a 176px floor (single elimination keeps 146px) and fixed 176px tracks
  under 640px, so a name still fits beside the chip; the drop chip's gap to the name is 4px.
- Double: the CSS module adds `@utility bracket-beam-double`, `bracket-beam-band` and
  `bracket-beam-drop` (the spec's `.bracket-beam--double`, `__band`, `__drop`) rather than plain
  class selectors: the fx CSS contract is `@property`/`@keyframes`/`@utility` only, and unlayered
  class rules would outrank consumers' utilities. Colors stay in `bracket-beam.styles.tsx`, so the
  lit and dimmed chip states merge with `tailwind-merge`. The chip's 4px radius is the spec's (no
  radius token is that small).
- Budget: the spec targeted ≤ 9.5 kB; measured 9.94 kB (from 7.69 kB), budget 10.5 kB. The
  double-elimination model (validation with readable errors, px poster wires, drops) is ≈ 1.9 kB
  min+brotli on its own.
