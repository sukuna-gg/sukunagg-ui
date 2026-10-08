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
├── scramble-text.scramble.tsx  # 'use client' — the glyph island: rAF painter, seeded PRNG.
├── scramble-text.test.tsx
├── scramble-text.stories.tsx
└── index.tsx                   # export { ScrambleText } ; export type { ScrambleTextProps, ScrambleTextElement }

packages/ui/scripts/motion/scramble-text.ts   # @keyframes sk-scramble-text-settle + @utility (→ theme.css)
test/browser/scramble-text.test.ts            # Playwright: decode runs, lands on the text, reduced motion
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

// `children` is omitted — `text` is the content (one string per instance).
export type ScrambleTextProps =
  ScrambleTextOwnProps & Omit<ComponentPropsWithoutRef<'span'>, 'children'>
```

**Replay** by changing `key` (`<ScrambleText key={round} text="MATCH FOUND" />`): the decode plays on
mount. A change to `text`, `delay`, `duration` or `seed` also restarts it. **Stagger** several lines
by rendering several instances with increasing `delay` (see the `MatchLobby` story).

Deliberately **not** in v1: multi-line/rich children (one string per instance), play-on-view
(`startOnView`, as Counter has) and re-scramble on hover (the story shows the `key` pattern for
both), a custom noise alphabet, per-call easing/front controls, an `onComplete` callback (functions
can't cross the server → client island boundary).

## 4. Variants → tokens

No style variants — size, weight, font and color are inherited from the context (or `className`).
Each glyph moves through four states, set by the island as `data-glyph` on the glyph's span:

| Glyph state | Real character | Noise overlay | Tokens |
|---|---|---|---|
| (none) — server, no-JS, reduced motion | visible | hidden | inherited color |
| `hidden` — before the noise front reaches it | `text-transparent` | hidden | — |
| `noise` — cycling a noise glyph every 42–80 ms | `text-transparent` | visible | `--sk-text-faint` |
| `lock` — the last 120 ms before it resolves | `text-transparent` | visible, tinted cell, glow | `--sk-accent`, `--sk-accent` 16% (`bg-accent/16`), `--sk-accent-glow` text-shadow |
| `done` — resolved | visible, accent afterglow fading to the inherited color | hidden | `--sk-accent` → inherited, `--sk-accent-glow` → none |

Each glyph keeps its **real** character in the layout (transparent while scrambling) and draws the
noise in an absolutely positioned overlay centred on it, so the line never changes width — no
layout shift and no jitter, even in proportional fonts (there is no mono token; see §11).

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

No new color token. One keyframe, one utility, no `@property`. The decode itself is JS
(`requestAnimationFrame` in the island) because it swaps characters; it is the documented Q39
exception to `docs/motion.md` rule 1, like Counter.

## 5. States

| State | Behavior |
|---|---|
| server / no-JS | the real `text`, once in an `sr-only` span (for AT) and once in the `aria-hidden` glyph layer (what sighted users see). No `data-glyph`, no `data-state`. |
| mount (motion OK) | the layer gets `data-state="running"`; every glyph is `hidden` until `delay` + its slot on the noise front (the first 30% of `duration`, left → right), then `noise`, then `lock` for its last 120 ms, then `done`. Lock times spread over the last 82% of `duration` with a seeded jitter, so the text resolves left to right with a ragged edge. The last glyph lands exactly at `delay + duration`; the layer becomes `data-state="done"`. |
| prefers-reduced-motion | **no decode** — the real text shows immediately, no rAF is scheduled, `data-state="done"`. The afterglow keyframe is also guarded (`motion-reduce:…animate-none`). |
| `duration <= 0` / empty `text` | same as reduced motion: final text, nothing scheduled. |
| prop change (`text`, `delay`, `duration`, `seed`) | the running decode is cancelled and cleaned up; a new decode starts from the new values. |
| replay | change `key` — the component remounts and plays again. |
| hidden tab | rAF stops with the tab; the decode clock advances at most 64 ms per frame, so it resumes where it left off instead of skipping to the end. |
| unmount | the frame is cancelled; nothing leaks. |

> One-frame note (Counter precedent): the server and the first client render show the final text,
> then the mount effect switches the glyphs to `hidden` before the first animation frame. We
> optimize for no-JS/SEO/AT correctness over that sub-frame flash; it never happens under reduced
> motion.

## 6. Logic (`scramble-text.logic.tsx`)

- **No `'use client'`**: no hooks, no DOM access. It renders `<Component>` (`as ?? 'span'`) with an
  `sr-only` copy of `text` and the `ScrambleGlyphs` island. Guarded by the RSC boundary test in
  `packages/ui/src/index.test.ts`.
- `forwardRef<HTMLElement, ScrambleTextProps>`; the ref points at the rendered element.
- Destructures `text`/`as`/`delay`/`duration`/`seed` so none leak to the DOM; `className` merges last
  through the `root` slot.
- Props crossing into the island are serializable (strings and numbers only).

**Island (`scramble-text.scramble.tsx`, `'use client'`, `@internal`):**

- Renders the `aria-hidden` glyph layer (`data-sk-scramble-text`). `text` is split into grapheme
  clusters (`Intl.Segmenter`, code points where it is missing — so emoji and flags stay whole);
  whitespace runs stay plain text (natural wrapping), every other grapheme becomes
  `<span>{char}<span /></span>`: the React-owned real character plus an empty noise overlay.
- Never replaces React-owned nodes: the effect only sets `data-glyph` on the glyph spans, appends one
  island-owned text node to each (empty) overlay and writes its `nodeValue`. Cleanup removes both, so
  React's view of the tree is intact for the next render.
- Effect deps `[text, delay, duration, seed]`. `window.matchMedia('(prefers-reduced-motion: reduce)')`
  is read inside the effect. Zero React re-renders per frame.
- Seeded `mulberry32` PRNG (seed = `seed ?? fnv1a(text)`): per glyph a noise start, a lock time, a
  42–80 ms change period and a hash; the glyph shown at step `k` is a pure function of (hash, k).
  No `Math.random`/`Date.now` anywhere, so runs are reproducible and testable.
- Clock: advances by the rAF delta, capped at 64 ms per frame. The first frame is painted inside
  the effect, so the pre-state lands with the mount.

## 7. Styles (`scramble-text.styles.tsx`)

```ts
import { tv, type VariantProps } from '../../utils/tv'

export const scrambleTextStyles = tv({
  slots: {
    root: '',
    label: 'sr-only select-none',
    glyphs: '[font-variant-ligatures:none]',
    glyph: [
      'group relative',
      'data-[glyph=hidden]:text-transparent data-[glyph=noise]:text-transparent',
      'data-[glyph=lock]:text-transparent',
      'data-[glyph=done]:animate-scramble-text-settle motion-reduce:data-[glyph=done]:animate-none',
    ],
    noise: [
      'pointer-events-none invisible absolute inset-0 flex items-center justify-center',
      'whitespace-pre select-none forced-colors:hidden',
      'group-data-[glyph=noise]:visible group-data-[glyph=noise]:text-text-faint',
      'group-data-[glyph=lock]:visible group-data-[glyph=lock]:text-accent',
      'group-data-[glyph=lock]:bg-accent/16',
      'group-data-[glyph=lock]:[text-shadow:0_0_.5em_var(--sk-accent-glow),0_0_.1em_var(--sk-accent-glow)]',
    ],
  },
})
export type ScrambleTextStyleProps = VariantProps<typeof scrambleTextStyles>
```

- The overlay is a flex box centred on the glyph, so the noise glyph sits on the real glyph's
  baseline whatever the line-height.
- `select-none` on the `sr-only` copy and on the overlays: a copy/paste of the visible line yields
  the real text exactly once.
- `forced-colors:hidden`: Windows High Contrast forces the transparent real glyphs visible, so the
  overlays are dropped there instead of drawing on top of them.
- Ligatures are off in the glyph layer (each glyph is its own box).

## 8. Accessibility checklist

- [ ] The real text is in the DOM once for assistive tech (`sr-only`, unsplit — VoiceOver reads it
      as a word, not letter by letter); the visible per-glyph layer is `aria-hidden`.
- [ ] Semantics via `as` (`h1`–`h6`, `p`, `strong`…): the heading's accessible name is the real text
      from the first paint, never noise.
- [ ] `prefers-reduced-motion: reduce` shows the final text with no decode and no afterglow.
- [ ] No flashing: glyphs change at most every 42 ms in a small area with faint color; there is no
      full-area luminance flash (WCAG 2.3.1 — under 3 flashes per second of the text block).
- [ ] At rest the text uses the inherited color — contrast is the context's responsibility, exactly
      like plain text. The faint noise is transient and decorative.
- [ ] No layout shift during the decode (each glyph keeps its real width).
- [ ] Copy/paste of the visible line returns the real text once.
- [ ] Windows High Contrast (`forced-colors`): overlays are hidden, the real text shows.

## 9. Tests

Harness in `docs/testing.md`; client mocks follow `counter.test.tsx`. Required cases:

- Server render (`renderServer`) contains the real text twice (sr-only + glyph layer), each `as`.
- Glyph layer is `aria-hidden`; whitespace stays text; graphemes stay whole (flag emoji), including
  the code-point fallback when `Intl.Segmenter` is missing.
- Reduced motion (`matchMedia` → `matches: true`): no rAF, no `data-glyph`, `data-state="done"`.
- With motion: the mount paints the `hidden` pre-state; stepping frames walks glyphs through
  `noise` → `lock` → `done` and lands on the real text with `data-state="done"`; `delay` holds the
  glyphs hidden; noise text never stays behind.
- Deterministic: the same `seed` gives the same frames; a different `seed` differs.
- `duration <= 0` and empty `text` settle immediately; the frame clock is capped at 64 ms.
- Zero React commits per frame (`<Profiler>`).
- Prop change and unmount cancel the frame and remove island-owned nodes/attributes.
- `as`/`text`/`delay`/`duration`/`seed` never leak to the DOM; native props pass through; `ref`
  forwards; consumer `className` wins; animated slots carry their `motion-reduce:` guard.
- `expectHydrates`; axe in both themes.
- Browser (`test/browser/scramble-text.test.ts`, Playwright): the `MatchLobby` decode runs (every
  glyph walks `hidden` → `noise` → `lock` → `done`) and settles on the real text with the
  `sk-scramble-text-settle` afterglow, then stops requesting frames; the title's width never changes
  while it decodes; hovering a roster row replays it (the `key` pattern); reduced motion renders the
  final text with no glyph state and no rAF; no console errors. Verified locally in Chromium,
  Firefox and WebKit.

## 10. Stories

`Playground` (controls), `Elements` (`as` h1/h2/p/span), `Staggered` (`delay` across lines),
`MatchLobby` (the mockup screen: title, eyebrow and a 5-player roster in a lobby card; Replay button
and hover re-scramble use the `key` pattern — all of it story chrome), `MatchLobbyNarrow` (the
same at phone width), `FinalFrame` (`duration={0}`: what no-JS and reduced-motion users see).
Both themes via the toolbar.

## 11. Decisions

- Approved in **Q38/Q39** (`docs/questions.md`) as one of the nine `@sukunagg/ui` showpieces.
- **RSC split**: logic stays a server component; only the glyph layer is a client island
  (`scramble-text.scramble.tsx`, the Table `scroll` / Input `reveal` precedent).
- **A11y pattern**: `sr-only` real text + `aria-hidden` glyph layer (not Counter's
  `role="img"` + `aria-label`, which would hide heading semantics).
- **Plays on mount**; replay = change `key`. No hidden "armed" pre-state in CSS: the base styles are
  the final frame, so no-JS and reduced motion land on the real text.
- **Overlay technique** (real glyph keeps the width, noise drawn over it) instead of the mockup's
  fixed-width cells: no jitter in any font, natural kerning-width and wrapping preserved.
- `// DECISION(open)`: timing — `duration` 800 ms default, noise front over the first 30%, 120 ms
  accent lock, 42–80 ms glyph period, 600 ms afterglow, 64 ms clock cap — ported from the approved
  mockup; tunable as a patch pre-1.0.
- `// DECISION(open)`: noise alphabet `!<>-_\/[]{}=+*^?#0123456789ABCDEF` (the mockup's) — not a
  prop in v1.
- `// DECISION(open)`: lock highlight and afterglow use `--sk-accent` / `--sk-accent-glow`; noise
  uses `--sk-text-faint`. No new token.
- **No mono token** (CLAUDE.md rule 8): the mockup's JetBrains Mono roster becomes inherited
  `font-sans tabular-nums` in the story; the overlay technique makes the decode jitter-free anyway.
- Hover re-scramble, play-on-view and multi-segment lines are story chrome in v1 (several instances
  + `key`); revisit as props if apps keep re-implementing them.
