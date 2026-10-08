# Component: RankReveal

> Follows the `docs/component-button.md` section template. **Static** component — no `'use client'`.
> CSS keyframes only (no hooks, no DOM access), so it is RSC-safe. Approved in Q38/Q39 (showpieces
> wave 1, `@sukunagg/ui`). Ported from the approved "Sukuna FX Lab" mockup (`rank-reveal`).

## 1. Purpose

Celebrates a new rank with a crest that bursts in over a ray field while an orbit draws around it and
the rank name rises into place. Use it on a post-match or season-reward screen, once per promotion.
It plays once on mount (CSS only); change its `key` to replay it. The finished frame is the resting
state, so reduced motion, no JS and a server render all show the complete reveal.

## 2. Files

```
packages/ui/src/components/rank-reveal/
├── rank-reveal.styles.tsx   # tv() slots: root, fx, anchor, rays, halo, waves, sparks, orbit, pips,
│                            #   crest (+ built-in crest layers), glints, copy, eyebrow, title,
│                            #   description (each line a clip slot + a rising span).
│                            #   `tone` variant sets the --sk-rank-reveal-* colors. Pure. Server-safe.
├── rank-reveal.logic.tsx    # forwardRef <div>; renders the aria-hidden effect layer + the copy.
│                            #   NO 'use client' (CSS keyframes only, RSC-safe).
├── rank-reveal.test.tsx
├── rank-reveal.stories.tsx  # stage chrome (vignetted card, Replay, post-match screen) lives here only
└── index.tsx                # export { RankReveal } ; export type { RankRevealProps }

packages/ui/scripts/motion/rank-reveal.ts   # @keyframes sk-rank-reveal-* + @utility → theme.css
test/browser/rank-reveal.test.ts            # plays, starts hidden, settles on the final frame,
                                            #   replay via key, reduced motion, no console errors
```

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

interface RankRevealOwnProps {
  /** The new rank, e.g. "Master". Rendered in a real heading (`headingLevel`). */
  title: ReactNode
  /** Division or tier numeral after the title, in the tone color: "I", "III", "2". */
  division?: ReactNode
  /** Small uppercase line above the title. Pass `null` to drop it. Default 'Rank up'. */
  eyebrow?: ReactNode
  /** One line under the title: the change. `<strong>` → full text color, `<em>` → premium. */
  description?: ReactNode
  /** The centerpiece (~96–120px). Default: the built-in crest. Rendered aria-hidden. */
  emblem?: ReactNode
  /** Burst color. Default 'accent' (crimson); 'premium' is the bone/gold top-tier treatment. */
  tone?: 'accent' | 'premium'
  /** Element for `title`, to fit the page outline. Default 'h2'. */
  headingLevel?: 'h2' | 'h3' | 'h4' | 'p'
}

export type RankRevealProps = RankRevealOwnProps &
  Omit<ComponentPropsWithoutRef<'div'>, 'title' | 'children'>
```

- **Plays on mount, once.** There is no `play` prop and no hidden "armed" state. To replay, remount
  it: `<RankReveal key={replayCount} … />`.
- The root fills its container's width (`w-full`, and it is a size container for the narrow title
  step at ≤ 420px) and clips the ray field (`overflow-hidden`). Give it a stage — a card, a dialog,
  a hero — around 320px tall; it centers its content vertically if the stage is taller.
- It has no background of its own, only a soft tone glow behind the crest that fades out well inside
  its box, so it sits seamlessly inside a bigger card (see the `PostMatch` story). The darker
  vignette in the gallery card is stage chrome (the stories), not the component.
- The root carries `data-sk-rank-reveal` (a stable hook for tests and app CSS).

Deliberately **not** in v1: a `play`/`paused` prop or play-on-view (needs JS; replay is `key`),
`children`/actions (put the Continue button in your screen), rarity/tier colors (Q38(c) is open —
`tone` covers crimson vs premium), a `size` prop (one tuned size; the title steps down below 420px),
sound, and configurable timings (the choreography is one literal timeline, §4).

## 4. Variants → tokens

| Part | accent (default) | premium |
|---|---|---|
| Ray field, halo, glows | `--sk-accent-glow` | `--sk-premium` @ 55% |
| Crest face (outer hex) | `--sk-accent` → `--sk-accent-deep` | `--sk-premium` → `--sk-premium-dim` |
| Tone glow (root, `rank-reveal-glow`) | `--sk-accent` @ 10% | `--sk-premium` @ 10% |
| Eyebrow | `--sk-accent` 82% + `--sk-text` | `--sk-premium` 82% + `--sk-text` |
| Title sheen, division numeral | `--sk-accent` | `--sk-premium` |

Shared by both tones:

| Part | Token(s) |
|---|---|
| Crest core (dark in both themes) | the built-in crest pins `data-theme="dark"` (like VideoPlayer) and mixes the tone's deep color with `--sk-bg`; facets use `--sk-text` / `--sk-bg` there |
| "Bone" (pips, orbit ring, wave, spark tips, glints) | `color-mix(--sk-premium 72%, --sk-on-accent)` |
| Crest outline + flame | `color-mix(--sk-on-accent 75%, --sk-premium)` |
| Tick arc | `--sk-text` @ 16% |
| Pip knock-out ring | `--sk-surface` (the stage it is designed to sit on) |
| Title | `--sk-text`, `font-display` black, expanded, 42px (34px = `text-3xl` ≤ 420px) |
| Description | `--sk-text-dim` 13px; `<strong>` `--sk-text`; `<em>` `--sk-premium`, `tabular-nums` |

**No new color token.** Colors are captured on the root as `--sk-rank-reveal-hue|deep|glow|bone|cb`
(component-local custom properties, like `--sk-stat-value`) so the dark-pinned crest still gets the
page theme's accent. No mono token exists, so the `+32 RR` style uses `font-sans tabular-nums`.

### Motion CSS (`packages/ui/scripts/motion/rank-reveal.ts` → generated `theme.css`)

Eight keyframes (no `@property`). Each one only states its *start* (and peak); the element's own
utilities are the final frame, so `motion-reduce:animate-none` lands on the finished reveal.
Per-element shape values come from component-local variables set by literal classes
(`[--sk-rank-reveal-s:.4]`) — one keyframe serves many elements instead of near-duplicates. The
waves' final frame is invisible (`opacity-0`, scale 2.9 / 4.4), so they reuse `enter` too.

```css
@keyframes sk-rank-reveal-enter {          /* fade / scale-in / rise / draw */
  from {
    opacity: var(--sk-rank-reveal-o, 0);
    scale: var(--sk-rank-reveal-s, 1);
    translate: var(--sk-rank-reveal-y, 0);
    stroke-dashoffset: var(--sk-rank-reveal-dash, 0);
  }
}
@keyframes sk-rank-reveal-pop {            /* overshoot in: halo, pips, glints */
  0% { opacity: 0; scale: var(--sk-rank-reveal-from, 0); rotate: var(--sk-rank-reveal-r0, 0deg); }
  45% { opacity: 1; scale: var(--sk-rank-reveal-peak, 1); }
}
@keyframes sk-rank-reveal-burst {          /* flash in, travel, vanish: sparks */
  0% { opacity: 0; transform: var(--sk-rank-reveal-t0, none); }
  12% { opacity: 1; }
  100% { opacity: 0; transform: var(--sk-rank-reveal-t1, none); }
}
@keyframes sk-rank-reveal-flash { 0% { filter: brightness(1.5); } 30% { filter: brightness(2.8) saturate(.7); } }
@keyframes sk-rank-reveal-sheen { from { background-position: 100% 0; } }
@keyframes sk-rank-reveal-spin { to { rotate: 360deg; } }
@keyframes sk-rank-reveal-breathe { to { opacity: .62; } }
@keyframes sk-rank-reveal-slot {           /* a copy line clips at its bottom edge, then releases */
  0%, 85% { clip-path: inset(-40px -60px 0); }
  to { clip-path: inset(-40px -60px -40px); }
}
```

Static image layers (too long for one arbitrary class; none is named `bg-*`, which tailwind-merge
would pair with `bg-<color>`): `rank-reveal-glow` (the root's tone glow), `rank-reveal-rays` /
`rank-reveal-rays-alt` (two `repeating-conic-gradient(in srgb, …)` ray fields with a radial mask —
`in srgb` because Firefox draws a repeating conic gradient with `color-mix()` stops as dotted
hairlines under the default oklab interpolation), `rank-reveal-halo`, `rank-reveal-glint` (a
four-point cross) and `rank-reveal-flame` (the crest's flame as an SVG `mask`).

The timeline (one `@utility animate-rank-reveal-<part>` per part, literal durations, `both` fill
unless noted):

| Part | Animation |
|---|---|
| rays / rays-alt | enter 1s / 1.3s (+.1s) from scale .55, then spin 90s / 140s reverse (loop) |
| halo | pop 1.2s (.4 → 1.2), then breathe 3.6s from 1.4s (loop, alternate) |
| crest | enter .9s spring from scale .4 at .12s; its emblem flashes .8s at .12s |
| wave / wave-alt | enter .9s / 1.25s at .32s / .42s from opacity 1, scale .55 → 2.9 / 4.4 and gone (no fill: unseen during the delay) |
| spark ×10 | burst .75s at .34s, radial streaks to 150px / 116px |
| orbit / ticks | draw .9s at .45s / fade 1s at .5s |
| pip ×8 | pop .5s at .52s + i × 65ms (0 → 1.7) |
| glint / glint-alt | pop .8s at 1.35s / 1.6s, rotating −45° → 45°, ends hidden |
| eyebrow / title / line | rise .6s / .7s / .6s at .82s / .94s / 1.08s; title sheen 1s at 1.3s |
| slot (each copy line) | slot 2s linear, no fill: clipped at its bottom edge until 1.7s, released by 2s |

Settles by ~2.3s; after that only the two decorative loops (ray spin, halo breathe) run.

## 5. States

| State | Behavior |
|---|---|
| default (on mount) | plays the ~2.3s timeline in §4 once, then rests on the final frame; the rays keep a slow spin and the halo breathes. |
| settled | crest, ray field, orbit, pips and copy fully visible; waves, sparks and glints are gone (transient). |
| replay | change `key`: React remounts the root and the CSS animations start over. |
| prefers-reduced-motion | every part carries `motion-reduce:animate-none` → the settled frame immediately, no loops. Nothing is hidden. |
| server / no-JS | same markup; the CSS animations run without JS. |
| older browsers | needs `color-mix()`, CSS trig (`cos()`/`sin()`) and gradient interpolation hints (`in srgb`), all Baseline 2023. Where they are missing those declarations drop (tints vanish, the pips collapse onto the crest, the ray fields disappear); the crest, title and description stay legible. |
| `tone="premium"` | bone/gold burst instead of crimson (§4). |

## 6. Logic (`rank-reveal.logic.tsx`)

- **No `'use client'`**: no hooks, no DOM access; pure props → markup. Guarded by the RSC boundary
  test in `packages/ui/src/index.test.ts`.
- `forwardRef<HTMLDivElement, RankRevealProps>`; destructures `title`, `division`, `eyebrow`
  (default `'Rank up'`), `description`, `emblem`, `tone`, `headingLevel` (default `'h2'`),
  `className`; spreads the rest onto the root `<div>`.
- Effect layer: one `aria-hidden` `<div>`; ten sparks and eight pips are index-mapped spans with an
  inline `--sk-rank-reveal-i` (no `Math.random`, so server and client markup match).
- The orbit is an id-free inline SVG (circle + tick arc, `pathLength`). The built-in crest is
  **CSS layers** (`clip-path` polygons + a `mask` for the flame), not an SVG with gradient `<defs>`:
  gradient ids would collide between instances (two themes or tones on one page) and a static
  component cannot call `useId`.
- Copy: eyebrow `<p>`, title in `headingLevel`, description `<p>`. Each line is a **slot**: the
  block clips at its own bottom edge while the timeline runs (`animate-rank-reveal-slot`), and an
  inline-block `<span>` inside it rises from 110% below into place, so the text comes up out of a
  slot as in the mockup. Parts you don't pass render nothing.

## 7. Styles (`rank-reveal.styles.tsx`)

`tv({ slots })` with one variant:

```ts
tone: {
  accent: { root: '[--sk-rank-reveal-hue:var(--sk-accent)] [--sk-rank-reveal-deep:var(--sk-accent-deep)] [--sk-rank-reveal-glow:var(--sk-accent-glow)]' },
  premium: { root: '[--sk-rank-reveal-hue:var(--sk-premium)] [--sk-rank-reveal-deep:var(--sk-premium-dim)] [--sk-rank-reveal-glow:color-mix(in_oklab,var(--sk-premium)_55%,transparent)]' },
},
defaultVariants: { tone: 'accent' },
```

Every animated slot pairs its `animate-rank-reveal-*` utility with `motion-reduce:animate-none`
(no animated slot sits behind a data-/state variant, so the bare `motion-reduce:` wins). Geometry is
literal (`size-180` ray field, `size-75` halo, crest 106×117px, pip radius 74px via `cos()`/`sin()`
of `--sk-rank-reveal-i`). Static image layers that are too long for one arbitrary class
(tone glow, ray fields, halo, glint cross, flame mask) are `@utility rank-reveal-*` in the motion
module (§4); none is named `bg-*` (tailwind-merge would pair it with `bg-<color>`). Exactly one
`animate-*` class per slot, since tailwind-merge 3.7 cannot dedupe custom `animate-*` names.

## 8. Accessibility checklist

- [ ] The whole effect layer (rays, crest, orbit, pips, sparks, glints) is one `aria-hidden` subtree;
      a custom `emblem` is hidden too (the title carries the meaning).
- [ ] Real text in reading order: eyebrow → title (a heading, `headingLevel`) → description. The
      rank is never only in the crest.
- [ ] Every keyframe has a `motion-reduce:animate-none` fallback and the base styles are the final
      frame, so reduced motion shows the complete reveal with no loops (asserted in unit + browser).
- [ ] Contrast at rest: title `--sk-text`, eyebrow (accent 82% + text) and description
      `--sk-text-dim` clear 4.5:1 on `--sk-surface` in both themes; the ray field is masked out
      under the copy.
- [ ] WCAG 2.3.1: the only flash is one crest brighten (.8s) and two small glints — no more than 3
      flashes in any second, and none full-screen.
- [ ] Not a live region by default: the app decides whether to announce the promotion (pass
      `role="status"` on a reveal that appears after an action, as with EmptyState).
- [ ] Arrows in `description` should be `aria-hidden` with sr-only words ("to"), as in the stories.

## 9. Tests

- Server render (`renderServer`): heading tag per `headingLevel`, real eyebrow/title/description
  text, the `data-sk-rank-reveal` hook, no `'use client'`-only APIs.
- `tone` maps to its literal custom-property classes; the default is `accent`.
- Every animated slot carries its `animate-rank-reveal-*` class **and** `motion-reduce:animate-none`.
- Effect layer is `aria-hidden`; ten sparks and eight pips with `--sk-rank-reveal-i` 0…n−1.
- Built-in crest pins `data-theme="dark"`; a custom `emblem` replaces it (still hidden from AT).
- Optional parts (`eyebrow={null}`, no `description`, no `division`) render nothing.
- Props don't leak (`tone`, `headingLevel`, `emblem`…); native props pass through; ref forwards;
  consumer `className` merges last (`py-12` beats the root padding).
- `expectHydrates` with the default story props; axe clean in both themes and both tones.
- Every utility the component uses is emitted into `theme.css`, and there are exactly eight
  `sk-rank-reveal-*` keyframes.
- Browser (`test/browser/rank-reveal.test.ts`, Web Animations state, never wall-clock): the story
  renders and runs all eight keyframes; seeking to t=0 shows the hidden start (crest at scale .4,
  copy transparent, orbit undrawn, waves unseen during their delay); mid-rise the title's slot is
  clipped at its bottom edge and released after; finishing the timeline lands on the final frame;
  only the ray spin and halo breathe keep running; Replay (a new `key`) restarts the timeline;
  under reduced motion there are no animations at all and the frame equals the settled one; every
  story renders without console errors (Google Fonts are stubbed). Passes in Chromium, Firefox and
  WebKit.

## 10. Stories

`Playground` (the gallery stage — a surface card with a soft `--sk-well` vignette — plus Replay
and controls), `PostMatch` (realistic post-match screen chrome:
header, reveal, RR bar, Continue), `Tones` (accent vs premium), `CustomEmblem` (an app glyph in the
`emblem` slot), `Phone` (340px stage, title step-down), `Settled` (the final frame with motion
stopped — what reduced-motion users see; stable for review screenshots), `BothThemes` (dark + light
side by side). Ids: `components-rankreveal--playground`, `--post-match`, `--tones`,
`--custom-emblem`, `--phone`, `--settled`, `--both-themes`. The stories load Archivo (with its
`wdth` axis) from Google Fonts, as a consumer would; the library does not bundle the font.

## 11. Decisions

- Approved as one of the nine `@sukunagg/ui` showpieces in **Q38/Q39** (CSS-only tier): see
  [`docs/questions.md`](questions.md) Q38 (the scout, the two-tier plan; Q38(c) rarity colors still
  open) and Q39 (the build go-ahead for all fourteen).
- **Plays on mount, replay via `key`** (build brief): no hidden armed state; base styles are the
  final frame; the mockup's IntersectionObserver play-on-view and offscreen pause are gallery
  plumbing and were not ported (a CSS-only component cannot observe visibility).
- **Crest built from CSS layers**, not SVG `<defs>`: per-instance gradient ids would need `useId`
  (forces `'use client'`) or collide between instances.
- **Crest core pinned dark** (`data-theme="dark"` on the built-in crest only): the mockup's
  `--fx-stage` is a page-only token; pinning reuses `--sk-bg`/`--sk-text` instead of inventing one.
  The tone colors are captured on the root first, so the crest still follows the page theme's accent.
- **Bone/cream** mixes `--sk-premium` with `--sk-on-accent` (white in both themes) instead of the
  mockup's page-only `--fx-stage-text`.
- **Eight keyframes** (the mockup had fifteen): enter/pop/burst take per-element variables (the
  waves reuse `enter`, since their final frame is invisible); `slot` is the mockup's `clip`
  keyframe, kept separate because it holds and then releases rather than easing from a start.
- **No vignette in the component**: the mockup's demo background had a tone glow over a `--sk-well`
  vignette. The vignette darkens the edges of whatever box it fills, which showed as a seam when the
  reveal sits inside a bigger card (the `PostMatch` story), so it is stage chrome in the stories; the
  component keeps only the tone glow (`rank-reveal-glow`), which fades out inside its box.
- **Ray fields interpolate `in srgb`**: Firefox (153) renders a `repeating-conic-gradient` whose
  stops are non-legacy colors (any `color-mix()`, e.g. the premium glow and the alt rays) as dotted
  hairlines under the default oklab interpolation. sRGB interpolation is what legacy `rgba()` stops
  already use, so Chromium/WebKit output is unchanged.
- **WebKit on Windows** (the local Playwright build) does not apply Archivo's variable `wdth` axis:
  any `font-stretch` above 100% comes out letter-spaced instead of wide, so the expanded title looks
  thin and tracked there. The approved mockup renders the same way in that build (a standalone
  probe reproduces it); it is an engine/font issue, not the component's.
- `// DECISION(open): Q38(c) rarity tokens` — tier colors (Iron…Radiant) are not modelled; `tone`
  offers crimson vs premium only until the owner approves rarity tokens.
- `// DECISION(open): pip knock-out ring` — the 3px ring that cuts the orbit line behind each pip is
  `--sk-surface`, the stage it is designed on; on another background it shows as a faint ring.
- Title size 42px is literal (no token between `text-3xl` 34px and the hero sizes), like StatTile's
  52px hero value; below 420px it steps to `text-3xl`. The description's 13px is the mockup's size
  (between `text-sm` 12px and `text-md` 14px).
- No mono token: the mockup's JetBrains Mono eyebrow and `+32 RR` use `font-sans` (+ `tabular-nums`).
