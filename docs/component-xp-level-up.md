# Component: XpLevelUp

> Follows the `docs/component-button.md` section template. **Static** component (no hooks, no
> directive): CSS keyframes and two `@property` counters only, RSC-safe. Approved in Q38/Q39
> (showpieces & FX, `@sukunagg/ui` tier).

## 1. Purpose

Celebrates an XP gain that crosses a level: the bar fills to the top, flashes once, the badge bursts
and counts up to the new level, then the bar settles at the progress into that level. It plays once
on mount with CSS only; the base styles are the settled card, so reduced motion, no JavaScript and
browsers without `@property` all show the final state. With `levelUp={false}` it plays a plain XP
gain (the bar fills from `from` to `progress`, no burst).

## 2. Files

```
packages/ui/src/components/xp-level-up/
├── xp-level-up.styles.tsx   # tv() slots (root, badge layers, headline, chip, bar layers, meta) + levelUp/long.
├── xp-level-up.logic.tsx    # forwardRef <div>; clamps numbers, sets the inline --sk-xp-level-up-* vars,
│                            # renders the levelUp-only layers. NO 'use client' (no hooks, no DOM).
├── xp-level-up.test.tsx
├── xp-level-up.stories.tsx  # the card chrome (season pass, reward tiers, Replay) lives here
└── index.tsx                # export { XpLevelUp } ; export type { XpLevelUpProps, XpLevelUpLabels }
packages/ui/scripts/motion/xp-level-up.ts   # @property / @keyframes / @utility → generated theme.css
test/browser/xp-level-up.test.ts            # Playwright: keyframes run, counters registered,
                                            # reduced motion lands on the final frame
```

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

/** Strings XpLevelUp renders; override any subset through `labels`. */
export interface XpLevelUpLabels {
  badge: string                              // default 'LV' — caption over the badge number
  target: (level: number) => ReactNode       // default n => <>To <b>LV {n}</b></> — under the bar
  level: (level: number) => string           // default n => `Level ${n}` — sr-only badge text
  bar: (next: number) => string              // default n => `XP to level ${n}` — progressbar name
}

interface XpLevelUpOwnProps {
  level: number            // the level reached; the badge counts level − 1 → level (rounded, ≤ 99,999)
  progress: number         // 0–100 into `level`, where the bar settles (clamped; NaN → 0)
  from?: number            // 0–100, where the fill starts (clamped; a plain gain caps it at progress). Default 0
  levelUp?: boolean        // default true; false = plain XP gain (fill from → progress, no burst)
  title?: ReactNode        // eyebrow over the card (the season / pass name)
  headline?: ReactNode     // default 'Level up' — wiped in at the burst
  prelude?: ReactNode      // default 'Match complete' — the line the headline replaces
  gain?: ReactNode         // the chip: '+2,450 XP · Match win' (wrap the amount in <b> to tint it)
  xp?: ReactNode           // readout under the bar's right end; a string is also aria-valuetext
  labels?: Partial<XpLevelUpLabels>
  children?: ReactNode     // under the main row: reward tiers, buttons …
}

export type XpLevelUpProps = XpLevelUpOwnProps &
  Omit<ComponentPropsWithoutRef<'div'>, 'title' | 'children'>
```

- **Plays on mount; replay by changing `key`** (`<XpLevelUp key={matchId} … />`). Mount it when it
  is on screen; it doesn't wait for visibility.
- `title` replaces the native `title` tooltip attribute (it is the eyebrow node).
- The root is a size container (`@container`): under 28rem wide the badge and headline shrink.
  A size container doesn't take its width from its content, so in a shrink-to-fit parent (a
  `w-fit`/`w-max` dialog or popover, an `items-center` column, `inline-flex`, an absolutely
  positioned toast, a grid `auto` column) it would collapse to 0. The root therefore carries an
  intrinsic width (`[contain-intrinsic-inline-size:30rem] max-w-full`): 30rem there, capped at the
  parent's width; in block flow it still stretches. Give it a width if you want another. It draws
  no surface: put it in a `Card` (or any `overflow-hidden` box) — the glow and sparks reach
  ~160px past the badge and should be clipped by your surface.
- `level` up to five digits fits the badge: the number steps down to 28px at 1,000 and 22px at
  10,000 (narrow: 22px / 18px). Six-digit levels overflow the hexagon.
- `from` > `progress` is a level-up's normal shape (62% of the old level → 8% of the new). In a
  plain gain (`levelUp={false}`) it would drain the bar, so `from` is capped at `progress` there.
- **Timeline utilities for your own chrome.** `animate-xp-level-up-swap-out` (fades out at 1.2 s)
  and `animate-xp-level-up-swap-in` (fades in at 1.36 s) are the ones the meta row uses; put them
  on your own elements (a reward tier flipping "Locked" → "Unlocked") to sync with the burst. Pair
  them with `motion-reduce:animate-none`, and with `opacity-0` on the swap-out element (base styles
  are the final frame). Swap-in rises 6px; add `[--sk-xp-level-up-shift:0_0]` to fade in place
  (the story's premium tint over the dim tier text does this).
- Refined from the Q39 sketch: `from` defaults to `0` (a full charge), not the mockup's 62;
  `levelUp`, `headline`, `prelude`, `labels` and `children` were added.

Deliberately **not** in v1: multi-level jumps (`level` − 1 → `level` only), play-on-visible
(IntersectionObserver would need a client island; remount instead), an `onComplete` callback (no
JS), a sound hook, size variants (the container query covers narrow layouts), a mono font (no
mono token exists: numbers use `font-sans tabular-nums`).

## 4. Variants → tokens

| Variant | Values → effect |
|---|---|
| levelUp | `true` (default): fill → flash → burst → count → settle (timeline below). `false`: the bar fills `from` → `progress`, chip slides in; no burst layers are rendered. |
| digits (internal) | `4` when \|level\| ≥ 1,000: badge number `text-[28px]` (narrow `text-[22px]`); `5` when ≥ 10,000: `text-[22px]` (narrow `text-xl`, 18px); otherwise 40/32px. Each restates `leading-none`, which tailwind-merge drops with the base size. |

Every color is a `--sk-*` token: badge face `--sk-accent` → `--sk-accent-deep`, rim
`--sk-premium`/`--sk-premium-dim` mixed with `--sk-on-accent`, glow/flash/ring `--sk-accent-glow` +
`--sk-accent`, track `--sk-surface-2` + `--sk-line`/`--sk-line-soft`, headline sheen
`--sk-text` → `--sk-accent` → `--sk-premium`, meta `--sk-text-faint`/`--sk-text`. No new color
token. Sparks alternate `--sk-accent` and `--sk-premium` (§11). The face's highlight sits just
above the top tip (`at 50% -4%`) so the LV caption clears 4.5:1 (§8). Forced colors: the track
gets a `CanvasText` border and the fills `Highlight` (box-shadow rings and gradients are dropped);
the LV caption is `forced-colors:relative` so it paints over the number's text backplate.

Timeline (ms from mount): chip slides in 60 · fill + shine 250–1150 (pct readout counts `from` →
100) · prelude out 960 · flash, ring, glow peak, badge pop 1000 · badge flare 1000–1400 · sparks 1000–1900 · level count
1030–1450 (the number flips at ~1260) · headline wipe 1080 + sheen to 2180 · old fill out 1060 ·
new fill 1260–2160 · meta swap 1200 / 1360.

Motion CSS lives in `packages/ui/scripts/motion/xp-level-up.ts`, emitted into the generated
`theme.css` by `bun run tokens:build`. Eight keyframes, two `@property` counters:

```css
@property --sk-xp-level-up-step { syntax: '<integer>'; inherits: false; initial-value: 0; }
@property --sk-xp-level-up-t    { syntax: '<integer>'; inherits: false; initial-value: 100; }

@keyframes sk-xp-level-up-in    { from { opacity: 0; translate: var(--sk-xp-level-up-shift, 0 6px); } }
@keyframes sk-xp-level-up-out   { from { opacity: 1; } to { translate: 0 -6px; } }
@keyframes sk-xp-level-up-fill  { from { translate: calc(var(--sk-xp-level-up-start, 0) * 1% - 100%) 0; } }
@keyframes sk-xp-level-up-burst {
  0%  { scale: var(--sk-xp-level-up-burst, 1.25); }
  10% { opacity: 1; filter: var(--sk-xp-level-up-flare, none); }
}
@keyframes sk-xp-level-up-spark {
  0% { opacity: 0; translate: 0 0; scale: 0.3 1; } 12% { opacity: 1; scale: 1 1; } 70% { opacity: 1; }
}
@keyframes sk-xp-level-up-roll {
  0%  { --sk-xp-level-up-step: -1; }
  45% { --sk-xp-level-up-step: -1; translate: 0 -50%; opacity: 0; filter: blur(2px); }
  55% { --sk-xp-level-up-step: 0;  translate: 0 50%;  opacity: 0; filter: blur(2px); }
}
@keyframes sk-xp-level-up-title { /* clip-path wipe (0–47%) + background-position sheen (9–100%) */ }
@keyframes sk-xp-level-up-count { from { --sk-xp-level-up-t: 0; } }
```

Utilities (each slot carries exactly one, so tailwind-merge never has to dedupe two):
`animate-xp-level-up-{chip,glow,ring,spark,pop,flare,roll,prelude,headline,charge,shine,refill,gain,flash,swap-out,swap-in,count}`,
plus static `xp-level-up-hex` (hexagon clip-path), `xp-level-up-spark` (trig geometry from the
inline `--sk-xp-level-up-i`), `xp-level-up-level` and `xp-level-up-pct` (the `counter()` readouts).
Every keyframe animates *from* the start state to the base styles, which are the final frame.

## 5. States

| State | Behavior |
|---|---|
| default (`levelUp`) | Plays the timeline above once on mount, settling at `progress` with "Level up", the new level in the badge and "To LV n+1" + `xp` under the bar. |
| `levelUp={false}` | Chip slides in, the bar fills `from` → `progress` with a shine; badge, `prelude` and meta are static. |
| prefers-reduced-motion | Every animated slot carries `motion-reduce:animate-none`: the settled card renders immediately (final level, final bar, headline, meta). Nothing is hidden; the burst layers rest at `opacity: 0`. |
| no `@property` support | The counters flip discretely instead of interpolating; the end state is identical. |
| server / no-JS | Same markup and CSS; it plays on first paint and needs no hydration. |
| replay | Change `key`; the remount restarts every keyframe. |

## 6. Logic (`xp-level-up.logic.tsx`)

- No `'use client'`: no hooks, no `window`/`document`. Guarded by the RSC test in `src/index.test.ts`.
- `forwardRef<HTMLDivElement, XpLevelUpProps>`; destructures every own prop so none leak to the DOM.
- Clamps `progress`/`from` to 0–100 (non-finite → 0) and rounds `level`; sets
  `--sk-xp-level-up-level`, `--sk-xp-level-up-from`, `--sk-xp-level-up-progress` inline, then
  spreads the consumer `style` last.
- 16 sparks, each with an inline `--sk-xp-level-up-i` (index-derived geometry: no `Math.random`).
- `levelUp={false}` skips the burst-only layers (ring, sparks, flash, old fill, pct, old target).
- `labels` merges over English defaults (`{ ...defaults, ...labels }`).
- Progressbar: `aria-valuenow={progress}` (0–100), `aria-valuetext` = `xp` when it's a string,
  name = `labels.bar(level + 1)`.

## 7. Styles (`xp-level-up.styles.tsx`)

```ts
export const xpLevelUpStyles = tv({
  slots: {
    root: '@container relative isolate flex min-w-0 max-w-full flex-col gap-5 font-sans text-text [contain-intrinsic-inline-size:30rem]',
    eyebrow: '… font-display font-extrabold uppercase tracking-eyebrow before:rotate-45 before:bg-accent',
    badge: 'relative h-26 w-23 flex-none … @max-md:h-21.5 @max-md:w-19',
    glow / ring / sparks / spark / hexWrap (pop) / flare (filter) / hex / face / prefix / num,
    headline: '… bg-clip-text [-webkit-text-fill-color:transparent] text-text animate-xp-level-up-headline motion-reduce:animate-none',
    chip: '… rounded-pill bg-accent/11 ring-1 ring-inset ring-accent/36 animate-xp-level-up-chip motion-reduce:animate-none',
    bar / track (+ forced-colors:border-[CanvasText]) / barGlow / clip / fillOld / fillNew
      (+ forced-colors:bg-[Highlight]) / flash, meta / targetOld / targetNew / pct / xp,
  },
  variants: {
    levelUp: { true: { glow, hexWrap, flare, num, prelude, targetNew, xp, fillNew: 'animate-xp-level-up-refill …' },
               false: { prelude: 'font-display text-[22px] leading-none … @max-md:text-xl',
                        fillNew: '… animate-xp-level-up-gain …' } },
    digits: { 4: { num: 'text-[28px] leading-none @max-md:text-[22px]' },
              5: { num: 'text-[22px] leading-none @max-md:text-xl' } },
  },
  defaultVariants: { levelUp: true },
})
```

All arbitrary values reference `--sk-*` literally (rules 7/8); spacing is the Tailwind numeric
scale; radii are `rounded-pill`.

## 8. Accessibility checklist

- [ ] Badge art, glow, ring, sparks, flash, the prelude, the old target and the pct readout are
      `aria-hidden`; the CSS-counter number is never the only source: `labels.level(level)` is in
      the DOM as `sr-only` text.
- [ ] The bar is `role="progressbar"` with `aria-valuemin=0`, `aria-valuemax=100`,
      `aria-valuenow={progress}`, a name (`labels.bar(level + 1)`) and `aria-valuetext` from `xp`.
- [ ] Reading order: title → "Level 42" → headline → gain → bar → target → xp → children.
- [ ] `prefers-reduced-motion`: every animation stops (`motion-reduce:animate-none`) and the
      settled card shows at once; verified in `test/browser/xp-level-up.test.ts`.
- [ ] WCAG 2.3.1: one flash, once (no repetition), well under 3 per second.
- [ ] Contrast at rest: headline `--sk-text`, meta `--sk-text-faint`, chip `--sk-text-dim` on
      `--sk-accent` 11% — all clear 4.5:1 in both themes. The badge number is large white text on
      the accent face (≥ 3:1). The 10px LV caption is full-strength white (no opacity) with a 1px
      `--sk-accent-deep` shadow, over a face whose highlight sits above the top tip: measured
      against the brightest pixel behind it, ≥ 4.6:1 in dark (wide and narrow) and ≥ 6:1 in light.
- [ ] Forced colors: the track keeps a `CanvasText` border and the fills paint `Highlight` (the
      ring is a box-shadow and the fills are gradients, both dropped), so the bar stays readable;
      the LV caption is positioned there so the number's text backplate doesn't cover it.
- [ ] Nothing is announced on mount (it is not a live region): apps that show it mid-session
      announce the level-up themselves (e.g. a toast or their own `role="status"`).

## 9. Tests

- Server-renders both modes; real text (`Level 42`, headline, gain, xp) is in the HTML.
- Every animated slot carries its `animate-xp-level-up-*` utility and `motion-reduce:animate-none`
  (pseudo-element shine: `motion-reduce:after:animate-none`).
- `levelUp={false}` renders no ring/sparks/flash/old fill, shows `prelude`, and uses the `gain` fill.
- Inline vars: `--sk-xp-level-up-level/from/progress` (clamped, NaN → 0, rounded level); spark
  `--sk-xp-level-up-i` 0–15; consumer `style` wins.
- Progressbar semantics (`aria-valuenow`, name, string `xp` → `aria-valuetext`, node `xp` → none).
- `labels` override; `digits` (≥ 1,000 and ≥ 10,000) shrinks the number and keeps `leading-none`
  (also on the gain prelude); `children` render.
- Plain gain caps `from` at `progress`; a level-up keeps it.
- Root carries the intrinsic width (`[contain-intrinsic-inline-size:30rem] max-w-full`); forced-colors
  classes on the track and fills; odd sparks use `--sk-premium`; the LV caption has no opacity.
- Own props don't leak; native props pass through; ref forwards; `className` wins.
- Hydrates; axe clean in both themes.
- Browser (`test/browser/xp-level-up.test.ts`): every story renders with no console errors; the
  keyframes run (`getAnimations()` names); seeked mid-timeline the registered integer counters read
  `level − 1` and a partial pct, the flash and ring are up at the burst; finished, it lands on the
  final frame (bar at 8%, "LV 43", old layers at opacity 0); `XpGain` fills 8% → 31% with no
  burst; Replay restarts the timeline; reduced motion runs no animation and shows the settled card.
  Layout: in a `max-content` parent the root keeps its intrinsic 480px; level 12,345 fits the face
  with line-height = font-size; under forced colors the track has a 1px border and the fill a
  background color.
  Passes in Chromium, Firefox and WebKit (CI runs Chromium).

## 10. Stories

`Playground` (the season-pass card from the mockup: title, level 42 from 62% → 8%, gain chip,
reward tiers as `children` whose "Tier 42" flips with the timeline utilities), `XpGain`
(`levelUp={false}`), `Narrow` (a 340px card: the container-query layout), `Replay` (a button that
changes `key`), `Themes` (dark and light side by side). Ids: `components-xplevelup--playground`,
`--xp-gain`, `--narrow`, `--replay`, `--themes`. Every story is a complete, settled card under
reduced motion.

## 11. Decisions

- Approved as one of the nine `@sukunagg/ui` showpieces in **Q38/Q39**; ported from the approved
  "Sukuna FX Lab" mockup (written from scratch), effect only — the card chrome, tiers and Replay
  live in stories.
- **Plays on mount** (brief decision 2): base styles are the final frame and each keyframe's
  start holds the initial state, so no hidden "armed" state exists. Replay = change `key`.
- **18 mockup keyframes → 8** (brief decision 4): one parameterised `burst` (ring, flash, glow,
  badge pop and, on its own inner layer so it fades linearly while the pop springs, the badge flare,
  via `--sk-xp-level-up-burst`/`-flare`), one `fill` (old fill, new fill, the
  shine, via `--sk-xp-level-up-start`), shared `in`/`out`, and the headline wipe + sheen merged into
  `title`. The mockup's glow "charge-up" during the fill is dropped (the glow rests at 42% and
  peaks at the burst); the ring keeps a fixed 2px border instead of thinning.
- **Counters** (brief decision 9): the level is `counter(level + step)` with an integer
  `@property --sk-xp-level-up-step` animated −1 → 0, so the keyframes stay constant for any level;
  the pct readout is `from + (100 − from) × t / 100` with `--sk-xp-level-up-t` 0 → 100 (integer
  rounding in `counter-reset` verified in Chromium, Firefox and WebKit). Both are `aria-hidden`;
  the real level is `sr-only` text.
- **No mono font** (brief decision 7): meta, chip and the LV caption use `font-sans tabular-nums`.
- `// DECISION(open): Q39 spark colors` (`xp-level-up.styles.tsx`) — the mockup alternates
  accent/premium sparks through `light-dark()`, which needs `color-scheme` (the theme doesn't set
  it). Odd sparks take `--sk-premium` in every theme: the mockup's cream in dark, and in light the
  gold-brown of the badge rim (the mockup's light sparks are all accent). An earlier mix of
  `--sk-accent` with 55% `--sk-text` turned near-black in light and read as soot; dropped.
- **Root intrinsic width.** The root is an `@container` (inline-size containment), which zeroes
  its content's contribution to its width; `[contain-intrinsic-inline-size:30rem] max-w-full`
  keeps it at 30rem (the wide layout, above the 28rem query) inside shrink-to-fit parents.
- **LV caption contrast.** The mockup draws the caption at 80% opacity over the face's highlight
  (~2.8:1 in dark). The opacity is gone, the caption gets the number's 1px `--sk-accent-deep`
  shadow, and the face's radial highlight moved from `at 50% 12%` to `at 50% -4%` (just above the
  top tip; visually near-identical) so the brightest pixel behind the caption clears 4.5:1.
- **Five-digit cap.** `digits` steps the number to 28px (4 digits) and 22px (5 digits); levels
  ≥ 100,000 overflow the badge and aren't handled.
- **Plain gain caps `from` at `progress`** so `levelUp={false}` never animates the bar backwards.
- `// DECISION(open): Q39 timeline` (`scripts/motion/xp-level-up.ts`) — durations/easings are the
  mockup's values, literal inside the `@utility` blocks (the `sk-shine` precedent), tunable as a
  patch pre-1.0.
- `from` defaults to `0` (not the sketch's 62); `levelUp`, `headline`, `prelude`, `labels`
  (precedent: `revealLabels`, VideoPlayer `labels`) and `children` added to the Q39 sketch.
- Not registered with tailwind-merge: each slot carries one `animate-xp-level-up-*` class, so
  nothing needs deduping.
