# Component: GlitchText

> Follows the `docs/component-button.md` section template. **Static** component — no `'use client'`.
> CSS keyframes + `@property` only; no hooks, no DOM access, RSC-safe. Showpiece approved in
> Q38/Q39 (`docs/questions.md`); motion rules in `docs/motion.md`.

## 1. Purpose

Hits real text with short RGB-split glitch bursts, for elimination banners, match results and
error or offline headings. The text renders once as real, selectable text; a red/blue fringe and a
displaced slice flicker over it for about 0.4s every 3.5s, and reduced motion shows the clean text.

## 2. Files

```
packages/ui/src/components/glitch-text/
├── glitch-text.styles.tsx   # tv() slots: root, frame, text, fringe, fringeLate, scanline, shard, edge. Pure. Server-safe.
├── glitch-text.logic.tsx    # forwardRef, polymorphic `as`; NO 'use client' (CSS-only motion, RSC-safe).
├── glitch-text.test.tsx
├── glitch-text.stories.tsx  # the killfeed screen chrome lives here, not in the component
└── index.tsx                # export { GlitchText } ; export type { GlitchTextElement, GlitchTextProps }
packages/ui/scripts/motion/glitch-text.ts  # @property / @keyframes / @utility → generated theme.css
test/browser/glitch-text.test.ts           # Playwright: bursts run, @property registered, reduced motion = clean text
```

## 3. API

```ts
import type { ComponentPropsWithoutRef } from 'react'

export type GlitchTextElement =
  | 'span' | 'p' | 'div' | 'strong' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

interface GlitchTextOwnProps {
  as?: GlitchTextElement   // default 'span' — pick it for semantics ('h1' for a result banner)
  children: string         // the text; rendered once for AT, copied into aria-hidden layers
  intro?: boolean          // default true — wipe-in reveal on mount (replay: change `key`)
  scanline?: boolean       // default false — static CRT line texture over the glyphs
}

export type GlitchTextProps =
  GlitchTextOwnProps & Omit<ComponentPropsWithoutRef<'span'>, 'children'>
```

- Typography comes from the consumer (`className`, or the surrounding text): the effect works at
  any size because every offset is in `em`. The look in the stories is
  `font-display font-black uppercase leading-none`.
- The intro plays **on mount**. To replay it, remount with a new `key`
  (`<GlitchText key={round}>Eliminated</GlitchText>`). The burst loop runs for as long as the
  element is mounted.
- The root is `inline-block` (transforms don't apply to inline boxes); pass `block` when it should
  fill its row. Its `transform` is animated, so position it with `translate`/`rotate`/`scale`
  (separate properties in Tailwind v4), not `skew-*`.

Deliberately **not** in v1: `ReactNode` children (the text is copied into three or four layers, so
markup or ids would be duplicated), a configurable burst interval or intensity (the fixed 3.5s
period is what keeps it under the WCAG 2.3.1 flash limit), custom fringe colors (the accent and
`chart-2` tokens give the red/blue split in both themes), hover-only or paused modes, a mono font
(no mono token exists).

## 4. Variants → tokens

| Prop / slot | Values → utilities |
|---|---|
| `intro` | `true` → root `animate-glitch-text-burst-intro`, text `animate-glitch-text-reveal` · `false` → root `animate-glitch-text-burst` |
| `scanline` | `true` → renders the `scanline` layer (`glitch-text-scanlines`, clipped to the glyphs) |
| fringe | `text-accent` (`--sk-accent`), late copy `text-chart-2` (`--sk-chart-2`) |
| text / shard glow | `color-mix(in oklab, var(--sk-accent-glow) 45%, transparent)` |
| edge streak | `linear-gradient(90deg, transparent, --sk-accent, --sk-text, --sk-accent, transparent)` |
| scanlines | `color-mix(in oklab, var(--sk-bg) 30%, transparent)`, 1px every 3px |

How it is built (no `content: attr()` pseudo-elements — real spans, so happy-dom can test them and
each layer has its own `motion-reduce:`):

- **root** (`as`): runs `sk-glitch-text-burst` — a 3.5s `steps(1, end)` loop that is clean for 3.1s,
  then jitters for ~0.37s in 52.5ms steps. It drives the inherited `--sk-glitch-text-y0`/`-y1` (the
  slice band) and `--sk-glitch-text-dx` (its displacement) and a small skew/translate. It takes the
  consumer's `className`, padding and border included.
- **frame**: a plain `relative isolate` box inside the root that the layers are positioned
  against, so they stay on the glyphs whatever padding or border the root gets.
- **text**: the real text, glowing, with the slice band cut out (`glitch-text-cut`). With `intro` it
  wipes in left→right in steps and settles from a skew.
- **fringe** ×2 (`aria-hidden`, behind the text): accent and `chart-2` copies, hidden at rest
  (`inset(50% 0 50% 0)`), flashing thin offset slices during a burst, the second 105ms later.
- **scanline** (`aria-hidden`, optional): a copy whose glyphs are filled with a line texture.
- **shard** (`aria-hidden`, on top): the cut band, displaced by `--sk-glitch-text-dx`, with an
  accent/`chart-2` text-shadow split.
- **edge** (`aria-hidden`): a bright streak under the shard (`max(1px, 0.04em)` tall), 0px tall
  at rest.

The CSS lives in `packages/ui/scripts/motion/glitch-text.ts` and is emitted into the generated
`theme.css` by `bun run tokens:build`:

```css
@property --sk-glitch-text-y0 { syntax: '<percentage>'; inherits: true; initial-value: 0%; }
@property --sk-glitch-text-y1 { syntax: '<percentage>'; inherits: true; initial-value: 0%; }
@property --sk-glitch-text-dx { syntax: '<length>'; inherits: true; initial-value: 0px; }
@property --sk-glitch-text-k { syntax: '<number>'; inherits: true; initial-value: 1; }
@property --sk-glitch-text-m { syntax: '<number>'; inherits: false; initial-value: 1; }

@keyframes sk-glitch-text-burst  { /* 0–88.5% clean, 88.6–99.1% seven 52.5ms steps of band + jitter */ }
@keyframes sk-glitch-text-split  { /* fringe slices + offset multiplier on the same 3.5s clock */ }
@keyframes sk-glitch-text-k      { from { --sk-glitch-text-k: 2.2; } }   /* intro: stronger split */
@keyframes sk-glitch-text-wipe   { /* stepped clip-path reveal, left → right */ }
@keyframes sk-glitch-text-settle { from { transform: translateX(-0.14em) skewX(-14deg); } }

@utility animate-glitch-text-burst       { animation: sk-glitch-text-burst 3.5s steps(1, end) -3.08s infinite; }
@utility animate-glitch-text-burst-intro { animation: sk-glitch-text-burst 3.5s steps(1, end) -3.08s infinite,
                                                      sk-glitch-text-k 700ms ease-out backwards; }
@utility animate-glitch-text-reveal      { animation: sk-glitch-text-wipe 420ms steps(1, end) backwards,
                                                      sk-glitch-text-settle 600ms var(--sk-ease-spring) backwards; }
@utility animate-glitch-text-split       { animation: sk-glitch-text-split 3.5s steps(1, end) -3.08s infinite; }
@utility animate-glitch-text-split-late  { animation: sk-glitch-text-split 3.5s steps(1, end) -2.975s infinite; }
@utility glitch-text-cut       { clip-path: polygon(/* everything except the y0..y1 band */); }
@utility glitch-text-glow      { text-shadow: 0 0 0.45em <glow>; }
@utility glitch-text-fringe    { clip-path: inset(50% 0 50% 0); text-shadow: none; translate: ±0.06em × m × k; }
@utility glitch-text-shard     { clip-path: inset(y0 -0.5em calc(100% - y1) -0.5em); translate: dx × k; text-shadow: split + glow; }
@utility glitch-text-edge      { top: y1; height: min(max(1px, 0.04em), (y1 - y0) × 99); gradient streak; }
@utility glitch-text-scanlines { background-image: repeating-linear-gradient(…); }
```

The `-3.08s` delay puts the first burst ~20ms after mount, so it lands on the intro. Five
keyframes, five `@property`, ten utilities (utilities are tree-shaken; keyframes and `@property`
ship with `theme.css`). **No new color token** — accent, `chart-2`, accent-glow, text and bg only.

## 5. States

| State | Behavior |
|---|---|
| default (mount) | `intro`: the text wipes in left→right (420ms, stepped) and settles from a skew (600ms spring) while the first burst fires with a doubled split (`--sk-glitch-text-k` 2.2 → 1 over 700ms). |
| loop | clean text for 3.1s, then a ~0.37s burst: a band of the text jumps sideways with a red/blue edge, thin red and blue slices flick out behind it, the whole word jitters. Repeats every 3.5s. |
| `intro={false}` | no wipe; the loop starts at once (first burst ~20ms after mount). |
| `scanline` | a static 1px/3px line texture over the glyphs (not motion; also shown under reduced motion). |
| prefers-reduced-motion | `motion-reduce:animate-none` on root and text, `motion-reduce:hidden` on every decorative layer: clean, glowing, static text. Nothing is hidden at rest, so there is no "armed" state to get stuck in. |
| no `@property` support | Tailwind's `@layer properties` fallback seeds the resting values (`0%`, `1`), so the text rests clean; the stepped keyframes still switch the unregistered variables discretely, which `steps(1, end)` makes look the same. |
| server / no JS | identical to the client render (pure CSS); the animation starts when the CSS loads. |

## 6. Logic (`glitch-text.logic.tsx`)

- No `'use client'`: no hooks, no `window`/`document`; the motion is CSS. Guarded by the RSC
  boundary test in `packages/ui/src/index.test.ts`.
- `forwardRef<HTMLElement, GlitchTextProps>`; `const Component = (as ?? 'span') as ElementType`.
- Destructures `as`, `intro`, `scanline`, `children` and `className` so none leak to the DOM;
  spreads the rest (native attributes) on the root.
- Renders the real text once inside the `text` span; the fringe, scanline and shard copies are
  `aria-hidden` and `select-none`, so assistive tech and copy/paste get the text once.
- Root carries `data-sk-glitch-text` (a stable hook for tests and consumer CSS).
- No `Math.random`/`Date.now` in render: every value is a literal class, so server and client
  HTML match.

## 7. Styles (`glitch-text.styles.tsx`)

```ts
import { tv } from '../../utils/tv'

const layer = 'pointer-events-none absolute inset-0 select-none motion-reduce:hidden'

export const glitchTextStyles = tv({
  slots: {
    root: 'inline-block motion-reduce:animate-none',
    frame: 'relative isolate block',
    text: 'relative isolate block glitch-text-cut glitch-text-glow motion-reduce:animate-none',
    fringe: [layer, '-z-1 glitch-text-fringe text-accent animate-glitch-text-split'],
    fringeLate: [
      layer,
      '-z-1 glitch-text-fringe text-chart-2 animate-glitch-text-split-late',
      '[--sk-glitch-text-side:-1]',
    ],
    scanline: [
      'pointer-events-none absolute inset-0 select-none [text-shadow:none]',
      'bg-clip-text [-webkit-background-clip:text] [-webkit-text-fill-color:transparent]',
      'glitch-text-scanlines',
    ],
    shard: [layer, 'z-1 glitch-text-shard'],
    edge: 'pointer-events-none absolute z-2 glitch-text-edge motion-reduce:hidden',
  },
  variants: {
    intro: {
      true: { root: 'animate-glitch-text-burst-intro', text: 'animate-glitch-text-reveal' },
      false: { root: 'animate-glitch-text-burst' },
    },
  },
  defaultVariants: { intro: true },
})
```

Every class is a literal string (rule 7); colors are `--sk-*` tokens (rule 8). The animation lives
in the `intro` variant so the root and text never carry two custom `animate-*` classes at once.

## 8. Accessibility checklist

- [ ] The text is real DOM text, present once in the accessibility tree; every copy is
      `aria-hidden="true"` and `select-none`. Use `as="h1"`…`"h6"` for headings.
- [ ] WCAG 2.3.1 (three flashes): the effect is **positional** jitter, not a luminance flash. The
      word's lit area stays constant (the shard is the same glyphs moved, the cut-out it fills is
      the same band). Inside a burst only the thin colored fringe slices change from step to step,
      and they are a small fraction of the glyph box, far under the WCAG "small safe area" at
      headline sizes. The burst as a whole switches on and off **once per 3.5s** (0.29/s), well
      under 3/s. The period is fixed on purpose (§3). Keep it to headline sizes; don't set
      full-viewport type.
- [ ] `prefers-reduced-motion: reduce` → no intro, no bursts, no layers (`motion-reduce:` on every
      animated span); the clean text is the resting state, so nothing is hidden.
- [ ] Contrast at rest is the consumer's text color on its surface; the glow only adds light
      around the glyphs and never replaces the fill.
- [ ] No focus or keyboard behavior (not interactive).
- [ ] axe: zero violations in both themes.

## 9. Tests

- `renderServer` of every `as` × `intro` × `scanline`; the HTML has the tag, the text and the
  `aria-hidden` copies.
- The accessible text is the text once: the root's `aria-hidden` descendants carry the copies and
  `getByText` finds exactly one non-hidden match; heading role/name works with `as="h2"`.
- `intro` maps to `animate-glitch-text-burst-intro` + `animate-glitch-text-reveal` (default) or
  `animate-glitch-text-burst` (and no reveal) when `false`; fringe/shard carry their utilities.
- Every animated slot guards reduced motion (`motion-reduce:animate-none` / `motion-reduce:hidden`).
- `scanline` adds the clipped texture layer only when set.
- Variant props don't leak (`intro`, `scanline`, `as` are not attributes); native props pass
  through (`id`, `data-testid`, `aria-label`); `className` merges onto the root and wins.
- Forwards `ref` to the rendered element.
- Hydrates without warnings; axe clean in dark and light.
- Browser (`test/browser/glitch-text.test.ts`): the story renders with one heading and no console
  errors; the burst, split and intro keyframes are declared and the loops run; the `@property`
  registrations shipped (typed `0%`/`1` values in the clean phase) and seeking into a burst opens
  the band (`18%`–`27%`) and grows the edge; a new `key` (the story's Replay) restarts the loop;
  `intro={false}` runs only the burst; reduced motion has no animations and every layer is
  `display: none`. Animations are paused and seeked, never timed.

## 10. Stories

`Playground` (controls), `Killfeed` (the approved mockup: an "Eliminated" banner on a game HUD with
a killfeed line and a spectating tag — all story chrome, with a Replay button that remounts it via
`key`), `Headings` (`h1`/`h2`/`h3` sizes and an inline `span`), `Scanline`, `NoIntro` (a status
label in a server list). Story ids: `components-glitchtext--playground`, `--killfeed`, `--headings`,
`--scanline`, `--no-intro`. The chrome's own entrance uses `starting:` transitions with
`motion-reduce:transition-none`, so every story renders complete under reduced motion.

## 11. Decisions

- Approved in **Q38/Q39** (`docs/questions.md`): one of the nine CSS-only showpieces in
  `@sukunagg/ui`. Ported from the approved "Sukuna FX Lab" mockup, written from scratch.
- **Spans, not `content: attr()` pseudo-elements** (build brief): testable in happy-dom, each layer
  gets its own `motion-reduce:`, and generated content is not read twice by some screen readers.
  Trade-off: the root's `textContent` contains the text four or five times (the accessible name
  does not), so crawlers and the browser's find-in-page can see the copies. Recorded for the owner.
- **Offsets in `em`** instead of the mockup's px (3px → 0.06em, 8px → 0.16em, at the mockup's
  ~50px headline), so the effect scales with the font. **Typography stays with the consumer** (like
  `GradientText`); the stories use the mockup's `font-display font-black uppercase`.
- **`intro` prop** (default `true`): the mockup's wipe-in reveal plays on mount; replay = change
  `key` (build brief §2). `false` is for always-on labels.
- **`scanline` prop** (default `false`): cheap — one more `aria-hidden` copy with a clipped line
  texture, no animation.
- No tailwind-merge registration: the slots never carry two custom `animate-*` classes, so nothing
  needs deduping. There is deliberately no "paused" switch in v1; reduced motion is the off state.
- Storybook does not load Archivo (the library doesn't bundle it), so stories fall back to the
  system sans; the showcase loads it.

Open decisions (both `// DECISION(open)` comments sit at the top of
`packages/ui/scripts/motion/glitch-text.ts`):

- **motion.md carve-out** — `clip-path` and `@property` animation (rule 2), the idle burst loop
  (rule 5) and `transform` skew in keyframes go beyond the v1.3 motion rules; the integrator
  records the Q39 showpiece carve-out in `docs/motion.md`.
- **Burst timing** — 3.5s period, ~0.37s burst, 52.5ms steps, 420ms wipe, 600ms settle are the
  mockup's values, proposed for owner confirmation (tunable as a patch pre-1.0).
