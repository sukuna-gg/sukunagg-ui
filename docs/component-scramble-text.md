# Component: ScrambleText

> Follows the `docs/component-button.md` section template. **Server component with one client
> island** — `scramble-text.logic.tsx` has no directive and renders the real text;
> `scramble-text.scramble.tsx` (`'use client'`) paints the decode with `requestAnimationFrame`.
> Approved in Q38/Q39 (showpieces & FX). Visual target: the "Sukuna FX Lab" ScrambleText mockup.

## 1. Purpose

Decodes a short label out of glyph noise into its real text, sweeping left to right — for match-found
titles, lobby rosters, callsigns and reveal moments. The server renders the real text (correct for
no-JS, SEO and screen readers); the decode is a one-shot enhancement that plays on mount, never
changes the layout, and is skipped entirely under `prefers-reduced-motion`.

## 2. Files

```
packages/ui/src/components/scramble-text/
├── scramble-text.styles.tsx    # tv() slot map → Tailwind utilities. Pure. Server-safe.
├── scramble-text.logic.tsx     # forwardRef, `as`, real sr-only text; NO 'use client' (RSC-safe).
├── scramble-text.scramble.tsx  # 'use client' — the visible line: unsplit real text + decode overlay.
├── scramble-text.test.tsx
├── scramble-text.stories.tsx
└── index.tsx                   # export { ScrambleText } ; export type { ScrambleTextProps, ScrambleTextElement }

packages/ui/scripts/motion/scramble-text.ts   # @keyframes sk-scramble-text-settle + @utility (→ theme.css)
test/browser/scramble-text.test.ts            # Playwright: decode, geometry, re-show, gradient, reduced motion
```

## 3. API

```ts
import type { ComponentPropsWithoutRef } from 'react'

export type ScrambleTextElement =
  'span' | 'p' | 'div' | 'strong' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

interface ScrambleTextOwnProps {
  text: string                 // the real text: server/no-JS/reduced-motion output and the AT name
  as?: ScrambleTextElement     // default 'span' — pick it for semantics (`'h1'` for a hero title)
  delay?: number               // ms before the decode starts; default 0 (negative = 0)
  duration?: number            // ms the decode lasts once started; default 800; <= 0 = no decode
  seed?: number                // noise PRNG seed; default derived from `text` (same text → same decode)
}

// `children` and `dangerouslySetInnerHTML` are omitted — `text` is the content (one string per
// instance; React would throw if both were set).
export type ScrambleTextProps = ScrambleTextOwnProps &
  Omit<ComponentPropsWithoutRef<'span'>, 'children' | 'dangerouslySetInnerHTML'>
```

**Replay** by changing `key` (`<ScrambleText key={round} text="MATCH FOUND" />`): the decode plays on
mount. A change to `text`, `delay`, `duration` or `seed` also restarts it. **Stagger** several lines
by rendering several instances with increasing `delay` (see the `MatchLobby` story).

Deliberately **not** in v1: multi-line/rich children (one string per instance), play-on-view
(`startOnView`, as Counter has), re-scramble on hover (the `MatchLobby` story shows it with the
`key` pattern), a custom noise alphabet, per-call easing/front controls, an `onComplete` callback
(functions can't cross the server → client island boundary).

## 4. Variants → tokens

No style variants — size, weight, font and color are inherited from the context (or `className`).

**At rest** — server, no-JS, reduced motion, and again once a decode has finished — the visible
line is the real `text` as **one text node** (so kerning and wrapping are exactly those of plain
text) next to an empty overlay. No `data-state` on the server; `data-state="done"` once the island
has run.

**While decoding** the island sets `data-state="running"` on the layer, which hides the real text
with `visibility: hidden` — it keeps its place, so nothing reflows, and a parent's gradient fill,
`text-shadow` or `-webkit-text-stroke` can't show it early. It then draws one **cell** per grapheme
in the overlay, placed over that glyph's measured box. Each cell moves through four island states
(`data-glyph`):

| Cell state | Draws | Tokens |
|---|---|---|
| `hidden` — before the noise front reaches it | nothing | — |
| `noise` — cycling a noise glyph every 42–80 ms | a noise glyph, centred | `--sk-text-faint` |
| `lock` — the last 120 ms before it resolves | a noise glyph, tinted cell, glow | `--sk-accent`, `--sk-accent` 16% (`bg-accent/16`), `--sk-accent-glow` text-shadow |
| `done` — resolved | the real glyph at its pen position, accent afterglow fading to the inherited color | `--sk-accent` → inherited (or `--sk-text` under a transparent `color`, see below), `--sk-accent-glow` → none |

When the last afterglow ends the island removes every cell and shows the real text again — the
cells drew each glyph exactly where the real one sits, so that hand-off is invisible, and no
animation is left on the subtree to restart when a hidden parent (Tabs, Accordion, `hidden md:block`)
is shown again.

**Noise fits its glyph.** A noise glyph is never more than 1.1× as wide as the glyph it covers
(the alphabet is measured in the line's own font — once per computed font, cached for every
instance, re-measured when a web font arrives; the four narrowest characters are always allowed,
for `i`, `.`, `1`), so in a proportional font a wide `#` never spills over a narrow `i` into its
neighbours.

Cells paint with `-webkit-text-fill-color: currentColor` and inherit everything else, so an
inherited `text-shadow` or text-stroke styles the noise too. Under a gradient fill the cells draw
in the inherited `color` and the gradient returns when the overlay is removed (positioned boxes
aren't part of a `background-clip: text` mask):

- `GradientText` and `ShinyText` keep a real fallback `color` (`text-accent`, `text-dim`) and hide
  the fill with `-webkit-text-fill-color: transparent`, so the decode draws in that color.
- A bare `bg-clip-text text-transparent` parent (the common Tailwind pattern) sets `color` itself
  to transparent, so a settled glyph would fade into nothing while the real text is still hidden.
  The island detects it (computed `color` alpha 0 and no `-webkit-text-stroke-width`), sets
  `data-clear` on the cells, and settled glyphs draw in `--sk-text` (`text-text`) instead; the
  gradient takes over when the overlay goes. A transparent-`color` parent **with** a text-stroke is
  left alone — the inherited stroke already draws the glyphs.

Motion CSS, in `packages/ui/scripts/motion/scramble-text.ts` (emitted into the generated
`theme.css` by `scripts/build-tokens.ts`):

```css
/* ScrambleText (Q39): the afterglow a glyph keeps for a beat after it locks to its real character. */
@keyframes sk-scramble-text-settle {
  from {
    color: var(--sk-accent);
    text-shadow: 0 0 0.5em var(--sk-accent-glow), 0 0 0.1em var(--sk-accent-glow);
  }
}

@utility animate-scramble-text-settle {
  animation: sk-scramble-text-settle 600ms var(--sk-ease);
}
```

No new color token. One keyframe, one utility, no `@property`. The cell geometry is four inline
custom properties (`--sk-scramble-text-x/y/w/h`) read by literal utilities. The decode itself is JS
(`requestAnimationFrame` in the island) because it swaps characters; it is the documented Q39
exception to `docs/motion.md` rule 1, like Counter.

## 5. States

| State | Behavior |
|---|---|
| server / no-JS | the real `text`, once in an `sr-only` span (for AT) and once, unsplit, in the `aria-hidden` visible line. Empty overlay, no `data-glyph`, no `data-state`. |
| mount (motion OK) | the layer gets `data-state="running"` (real text hidden, still in the layout); every cell is `hidden` until `delay` + its slot on the noise front (the first 30% of `duration`, left → right), then `noise`, then `lock` for its last 120 ms, then `done` with a 600 ms afterglow. Lock times spread over the last 82% of `duration` with a seeded ±5% jitter, so the text resolves left to right with a ragged edge; every glyph has locked by `delay + duration` (the last one within its final 5%). 600 ms after the last lock the cells are removed and the layer becomes `data-state="done"`. |
| prefers-reduced-motion | **no decode** — the real text shows immediately, no cell is made, no rAF is scheduled, `data-state="done"`. The afterglow keyframe is also guarded (`motion-reduce:…animate-none`). |
| reduced motion switched on mid-decode | the island listens to the media query's `change` while it runs: the frame is cancelled, the cells removed and the layer lands on `data-state="done"` at once. |
| `duration <= 0` / blank `text` / no layout box (a `display: none` ancestor at mount) | same as reduced motion: final text, nothing scheduled. |
| resize / web font arriving mid-decode | the cells are re-measured (window `resize`, `document.fonts` `loadingdone`), so the noise follows the reflowed line; a font arriving also empties the alphabet-width cache (once per event, however many lines are running). |
| inherited `color` is transparent (`bg-clip-text text-transparent`), no text-stroke | cells get `data-clear`; settled glyphs fade from the accent into `--sk-text` rather than into nothing, then the parent's gradient shows when the overlay goes. |
| prop change (`text`, `delay`, `duration`, `seed`) | the running decode is cancelled and its cells removed; a new decode starts from the new values. |
| replay | change `key` — the component remounts and plays again. |
| hidden tab | rAF stops with the tab; the decode clock advances at most 64 ms per frame, so it resumes where it left off instead of skipping to the end. |
| hidden → shown parent after settling | nothing replays: no cell, no `data-glyph` and no animation remain once the decode ends. |
| unmount | the frame is cancelled, cells and listeners removed; nothing leaks. |

> One-frame note (Counter precedent): the server and the first client render show the final text,
> then the mount effect switches the line to its blank pre-state before the first animation frame.
> We optimize for no-JS/SEO/AT correctness over that sub-frame flash (not observed in Chromium,
> Firefox or WebKit); it never happens under reduced motion.

## 6. Logic (`scramble-text.logic.tsx`)

- **No `'use client'`**: no hooks, no DOM access. It renders `<Component>` (`as ?? 'span'`) with an
  `sr-only` copy of `text` and the `ScrambleGlyphs` island. Guarded by the RSC boundary test in
  `packages/ui/src/index.test.ts`.
- `forwardRef<HTMLElement, ScrambleTextProps>`; the ref points at the rendered element.
- Destructures `text`/`as`/`delay`/`duration`/`seed` so none leak to the DOM; `className` merges last
  through the `root` slot.
- Props crossing into the island are serializable (strings and numbers only).

**Island (`scramble-text.scramble.tsx`, `'use client'`, `@internal`):**

- Renders the `aria-hidden` visible line (`data-sk-scramble-text`): an empty overlay `<span>` (an
  inline, positioned box at the start of the line — the cells' containing block, inside the root so
  the root's `overflow` clips them) and the real `text` as one text node in its own `<span>`. The
  server and the first client render never split the text, so a different `Intl.Segmenter`/ICU
  version on the client can't cause a hydration mismatch.
- On mount (effect deps `[text, delay, duration, seed]`) it splits `text` into grapheme clusters
  (`Intl.Segmenter`, code points where it is missing — emoji and flags stay whole; whitespace is
  never drawn), creates one cell per grapheme in the overlay, and **measures**: each grapheme's box
  with a `Range` over the real text node, relative to the overlay and divided by any ancestor
  `transform: scale` (rect ÷ `offsetWidth`), written as `--sk-scramble-text-x/y/w/h`; and the noise
  alphabet's widths with a throwaway invisible probe, giving each cell its own noise pool. Every
  read comes before any write, so a mount costs one layout. The alphabet widths are cached in a
  module-level `Map` keyed by the computed font (family, size, weight, style, stretch, caps/numeric
  variants, feature/variation settings, letter-spacing, text-transform), so the probe runs once per
  font rather than once per instance (22 lines in the lobby → one probe). A width measured while
  `document.fonts.status` is `loading` is used but never cached; the first `loadingdone` listener
  to hear an event empties the cache.
- Reads the inherited paint from the same computed style: a fully transparent `color` with no
  `-webkit-text-stroke-width` sets `data-clear` on the cells (see §4).
- Never touches React-owned nodes beyond `data-state` on the layer: cells are island-owned children
  of the (React-empty) overlay, and cleanup removes them, so React's view of the tree is intact for
  the next render.
- `window.matchMedia('(prefers-reduced-motion: reduce)')` and `getClientRects()` (no box → no
  decode) are read inside the effect; while a decode runs it listens to the query's `change` and
  stops at once if reduced motion is switched on. Zero React re-renders per frame.
- Seeded `mulberry32` PRNG (seed = `seed ?? fnv1a(text)`): per glyph a noise start, a lock time, a
  42–80 ms change period and a hash; the glyph shown at step `k` is a pure function of (hash, k,
  pool). No `Math.random`/`Date.now` anywhere, so runs are reproducible and testable.
- Clock: advances by the rAF delta, capped at 64 ms per frame, so it never runs ahead of real time
  and the last CSS afterglow has always ended when the clock reaches the last lock + 600 ms. The
  first frame is painted inside the effect, so the pre-state lands with the mount.

## 7. Styles (`scramble-text.styles.tsx`)

```ts
import { tv, type VariantProps } from '../../utils/tv'

export const scrambleTextStyles = tv({
  slots: {
    root: '',
    label: 'sr-only select-none',
    glyphs: 'group/scramble-text [font-variant-ligatures:none]',
    overlay: 'pointer-events-none relative select-none',
    text: 'group-data-[state=running]/scramble-text:invisible',
    cell: [
      'absolute top-(--sk-scramble-text-y) left-(--sk-scramble-text-x)',
      'h-(--sk-scramble-text-h) w-(--sk-scramble-text-w) leading-(--sk-scramble-text-h)',
      'flex items-center justify-center whitespace-pre [-webkit-text-fill-color:currentColor]',
      'data-[glyph=noise]:text-text-faint',
      'data-[glyph=lock]:bg-accent/16 data-[glyph=lock]:text-accent',
      'data-[glyph=lock]:[text-shadow:0_0_.5em_var(--sk-accent-glow),0_0_.1em_var(--sk-accent-glow)]',
      'data-[glyph=done]:justify-start data-[glyph=done]:animate-scramble-text-settle',
      'motion-reduce:data-[glyph=done]:animate-none',
      'data-clear:data-[glyph=done]:text-text',
    ],
    probe: 'invisible absolute whitespace-pre',
  },
})
export type ScrambleTextStyleProps = VariantProps<typeof scrambleTextStyles>
```

- The real text is hidden with `visibility` (the named group `scramble-text`, so an unrelated
  ancestor's `data-state` can't trigger it), never with `color`: a gradient fill, shadow or stroke
  would otherwise keep drawing it.
- The real text is never inside a positioned box of ours (only the empty overlay is), so a
  `background-clip: text` parent still paints it in every engine.
- A cell's line-height is its measured height, so what it draws sits on the real glyph's baseline;
  a `done` cell is left-aligned, i.e. at the real glyph's pen position (kerning included).
- `select-none` on the `sr-only` copy and on the overlay: a copy/paste of the visible line yields
  the real text exactly once.
- Ligatures are off on the visible line, so the glyphs drawn one per cell are the glyphs of the line
  at rest (kerning stays on).
- `data-clear:data-[glyph=done]:text-text` gives a settled cell a real color when the inherited one
  is transparent (§4); noise and lock cells always set their own.

## 8. Accessibility checklist

- [ ] The real text is in the DOM once for assistive tech (`sr-only`, unsplit — VoiceOver reads it
      as a word, not letter by letter); the visible line is `aria-hidden` (it is also
      `visibility: hidden` while decoding, which would drop it from the tree).
- [ ] Semantics via `as` (`h1`–`h6`, `p`, `strong`…): the heading's accessible name is the real text
      from the first paint, never noise.
- [ ] `prefers-reduced-motion: reduce` shows the final text with no decode and no afterglow;
      switching it on mid-decode ends the decode at once.
- [ ] The visible line never draws nothing: under a transparent inherited `color` (bare
      `bg-clip-text text-transparent`) settled glyphs fall back to `--sk-text` (§4). For a gradient
      title, prefer `GradientText` (real fallback `color` + `-webkit-text-fill-color: transparent`).
- [ ] Testing note for consumers: the element's `textContent`/`innerText` holds the text twice
      (sr-only + `aria-hidden` visible copy), so `getByText('MATCH FOUND')` finds two nodes. Query
      by role instead (`getByRole('heading', { name: 'MATCH FOUND' })`).
- [ ] Tuned for Latin and other non-joining text. Each grapheme is drawn alone while decoding, so
      joining or conjunct-forming scripts (Arabic, Devanagari) show unjoined forms through the
      decode and its 600 ms afterglow, then snap to the shaped run when the overlay is removed. The
      real text (and AT) is always correct.
- [ ] No flashing: glyphs change at most every 42 ms in a small area with faint color; there is no
      full-area luminance flash (WCAG 2.3.1 — under 3 flashes per second of the text block).
- [ ] At rest the text uses the inherited color — contrast is the context's responsibility, exactly
      like plain text. The faint noise is transient and decorative.
- [ ] No layout shift during the decode (the real text keeps its place while hidden).
- [ ] Copy/paste of the visible line returns the real text once.
- [ ] Windows High Contrast (`forced-colors`): nothing is hidden with color, so the decode runs in
      system colors (noise in `CanvasText`, tints dropped) and lands on the real text.

## 9. Tests

Harness in `docs/testing.md`; client mocks follow `counter.test.tsx`. Required cases:

- Server render (`renderServer`) contains the real text twice (sr-only + visible line), each as one
  unsplit text node, for each `as`; no `data-glyph`/`data-state`.
- Visible line is `aria-hidden` with an empty overlay; graphemes keep their offsets and stay whole
  (flag emoji), whitespace is skipped, including the code-point fallback without `Intl.Segmenter`.
- Reduced motion (`matchMedia` → `matches: true`): no rAF, no cells, `data-state="done"`; a
  `change` to reduce mid-decode cancels the frame, removes the cells and lands on `done`.
- Clear fill: a transparent inherited `color` sets `data-clear` on the cells; a stroked or colored
  parent doesn't; `isClearFill` tells `rgba(…, 0)` / `… / 0)` from an opaque `rgb(…, 0)`.
- Width cache: several lines in one font probe the alphabet once; a `loadingdone` event empties
  the cache once and re-probes once; a measurement taken while fonts are `loading` isn't kept.
- With motion: the mount paints the `hidden` pre-state; stepping frames walks cells through
  `noise` → `lock` → `done` (drawing the real glyphs in the tail), then removes every cell and lands
  on the real text with `data-state="done"`; `delay` holds the cells blank; settle is 600 ms after
  the last lock.
- Geometry (mocked rects): cells are placed at (glyph − overlay) ÷ ancestor scale; a narrow cell
  only draws noise from its width-filtered pool; `noisePool` itself; a `resize` or `loadingdone`
  re-measures and both listeners are gone once settled.
- Deterministic: the same `seed` gives the same frames; a different `seed` differs.
- `duration <= 0`, blank `text` and no layout box settle immediately; the frame clock is capped at
  64 ms.
- Zero React commits per frame (`<Profiler>`).
- Prop change and unmount cancel the frame and remove island-owned cells and listeners.
- `as`/`text`/`delay`/`duration`/`seed` never leak to the DOM; native props pass through;
  `children`/`dangerouslySetInnerHTML` are type errors; `ref` forwards; consumer `className` wins;
  the real text hides with `visibility`, cells fill with `currentColor`, the afterglow carries its
  `motion-reduce:` guard.
- `expectHydrates` (with emoji and Devanagari); axe in both themes.
- Browser (`test/browser/scramble-text.test.ts`, Playwright): the `MatchLobby` decode runs (every
  cell walks `hidden` → `noise` → `lock` → `done` with the `sk-scramble-text-settle` afterglow),
  then no cell, `data-glyph` or settle animation remains and frames stop; replayed on loaded fonts,
  the title's width never changes, every settled cell sits within 1 px of its real glyph and every
  line at rest is as wide as the same plain text (kerning kept); no noise glyph is wider than 1.1×
  its cell (+0.1 em); hiding and re-showing the settled card starts no animation; in the `Composed`
  story the real text under a `GradientText` fill is `visibility: hidden` while noise fills with its
  own color, and under a bare `bg-clip-text text-transparent` parent no `done` cell ever computes
  to a transparent color; hovering a roster row replays it (the `key` pattern); reduced motion
  renders the final text with no cell and no rAF; no console errors. CI runs Chromium only
  (`playwright.config.ts`); Firefox and WebKit were checked by hand with the same stories (decode,
  geometry, reduced motion, gradient/shadow/stroke composition).

## 10. Stories

`Playground` (controls), `Elements` (`as` h1/h2/p/span), `Staggered` (`delay` across lines),
`Composed` (inside `GradientText`, inside a bare `bg-clip-text text-transparent` gradient, under a
glow `text-shadow`, with a text-stroke),
`MatchLobby` (the mockup screen: title, eyebrow and a 5-player roster in a lobby card; Replay button
and hover re-scramble use the `key` pattern — all of it story chrome), `MatchLobbyNarrow` (the
same at phone width), `FinalFrame` (`duration={0}`: what no-JS and reduced-motion users see).
Both themes via the toolbar. The stories load Archivo (with its `wdth` axis) from Google Fonts like
a consumer would — the library doesn't bundle it.

## 11. Decisions

- Approved in **Q38/Q39** (`docs/questions.md`) as one of the nine `@sukunagg/ui` showpieces.
- **RSC split**: logic stays a server component; only the visible line is a client island
  (`scramble-text.scramble.tsx`, the Table `scroll` / Input `reveal` precedent).
- **A11y pattern**: `sr-only` real text + `aria-hidden` visible line (not Counter's
  `role="img"` + `aria-label`, which would hide heading semantics).
- **Plays on mount**; replay = change `key`. No hidden "armed" pre-state in CSS: the base styles are
  the final frame, so no-JS and reduced motion land on the real text.
- **Overlay technique** (the real text stays one unsplit text node, hidden with `visibility` while
  island-owned cells measured from `Range` rects draw the decode over it) instead of the mockup's
  fixed-width cells or one span per glyph: kerning, wrapping and width at rest are exactly plain
  text's, there is no jitter in any font, and server and client never disagree about grapheme
  segmentation. For Latin and other non-joining text nothing snaps when the overlay is removed;
  joining scripts (Arabic, Devanagari) show unjoined forms until it is (§8) — v1 is tuned for the
  former.
- **Noise by width**: each cell picks from alphabet characters no wider than 1.1× its glyph (never
  fewer than the four narrowest), measured in the line's own font — proportional fonts never
  overlap their neighbours. The widths are cached per computed font (one probe per font, not per
  instance) after the review measured 30–60 ms Replay commits for the 22-line lobby.
- **Gradient parents**: the cells use the inherited `color` (a positioned box can't join a
  `background-clip: text` mask), so under `GradientText` the decode is drawn in its fallback color
  and the gradient returns when the overlay goes. A bare `bg-clip-text text-transparent` parent
  has no fallback color, so the island flags it (`data-clear`) and settled glyphs draw in
  `--sk-text` rather than vanishing for the 600 ms tail (review fix; skipping the decode there was
  the alternative, rejected because the decode itself draws fine).
- `// DECISION(open)`: timing — `duration` 800 ms default, noise front over the first 30%, 120 ms
  accent lock, 42–80 ms glyph period, 600 ms afterglow, 64 ms clock cap — ported from the approved
  mockup; tunable as a patch pre-1.0.
- `// DECISION(open)`: noise alphabet `!<>-_\/[]{}=+*^?#0123456789ABCDEF` (the mockup's) — not a
  prop in v1.
- `// DECISION(open)`: lock highlight and afterglow use `--sk-accent` / `--sk-accent-glow`; noise
  uses `--sk-text-faint`. No new token.
- **No mono token** (CLAUDE.md rule 8): the mockup's JetBrains Mono roster becomes inherited
  `font-sans tabular-nums` in the story; noise-by-width keeps the decode tidy in it anyway. The
  story's title adds `tracking-[.06em]` to approximate the mockup's fixed-width title cells.
- Hover re-scramble, play-on-view and multi-segment lines are story chrome in v1 (several instances
  + `key`); revisit as props if apps keep re-implementing them.
