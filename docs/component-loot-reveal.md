# Component: LootReveal

> Follows the `docs/component-button.md` section template. **Static** component — no `'use client'`.
> CSS keyframes only (no hooks, no DOM access), RSC-safe. Approved in Q38/Q39 (showpieces, `@sukunagg/ui`
> wave). Visual target: the "Sukuna FX Lab" LootReveal prototype.

## 1. Purpose

Flips a row of face-down item cards to reveal what a player won, one after another, with a rarity
glow per card and a spark burst for legendaries. Use it for pack openings, match rewards and drops.
It plays once on mount with CSS only; every card's name, kind and rarity are real text in the DOM
from the first server render, and reduced motion shows the revealed row at once.

## 2. Files

```
packages/ui/src/components/loot-reveal/
├── loot-reveal.styles.tsx   # tv() slots (root, slot, box, back, face, burst layers, rarity label)
│                            #   + rarity/stagger/play variants, and the spark tv(). Pure. Server-safe.
├── loot-reveal.logic.tsx    # forwardRef <ul>; per-card stagger vars; NO 'use client' (no hooks).
├── loot-reveal.test.tsx
├── loot-reveal.stories.tsx  # the pack screen chrome (header, pips, counter, replay) lives here
└── index.tsx                # export { LootReveal } ; export type { LootRevealProps, LootRevealItem, LootRarity }
packages/ui/scripts/motion/loot-reveal.ts  # @keyframes sk-loot-reveal-* + @utility blocks → theme.css
test/browser/loot-reveal.test.ts           # Playwright: plays + settles on the reveal, stagger
                                           #   order, reduced motion = no animation, no console errors
```

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

export type LootRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface LootRevealItem {
  name: ReactNode        // item name on the card face (real text)
  rarity: LootRarity     // colors the card; 'legendary' adds the charge-up and spark burst
  icon?: ReactNode       // art in the middle of the face; decorative (aria-hidden), name carries meaning
  kind?: ReactNode       // small chip at the top of the face: "Spray", "Mask", "Banner"
}

interface LootRevealOwnProps {
  items: readonly LootRevealItem[]   // one card per item, revealed left → right
  stagger?: 'normal' | 'slow'        // default 'normal' — 350ms vs 700ms between flips
  play?: boolean                     // default true — false renders the revealed row with no motion
  rarityLabels?: Partial<Record<LootRarity, ReactNode>> // default Common / Rare / Epic / Legendary
  backIcon?: ReactNode               // emblem on the card backs; default the Sukuna flame mark
}

export type LootRevealProps = LootRevealOwnProps & Omit<ComponentPropsWithoutRef<'ul'>, 'children'>
```

**Playback.** It plays once, on mount. To replay, change its `key` (`<LootReveal key={packId} …/>`);
to show a pack the player already opened, pass `play={false}`. Card `i` (0-based) starts flipping at
`200ms + i × step + 450ms × (legendary cards up to and including i)` (step = 350ms, or 700ms for
`stagger="slow"`): a legendary card first charges up for 450ms, and the cards after it wait for it.
Apps can use that formula to time their own sound or `aria-live` "3/3 revealed" counter (the
stories do). The legendary burst spills past the root on purpose; put it in a container with
`overflow: hidden` if it must stay inside.

Sizing: the root fills its container's width (`container-type: inline-size`) and the cards scale
with it — up to 124px wide each, never under 72px; extra cards wrap to a new row.

Deliberately **not** in v1: click-to-flip / interactive cards (the prototype's buttons; reveals are
automatic, so the cards are not focus stops), an `onRevealed` callback (it would need a client
timer — use the formula above), per-item colors (rarity owns color, Q38(c)), hover lift, a
"skip" control (the app can re-render with `play={false}`).

## 4. Variants → tokens

| Prop | Value → classes |
|---|---|
| rarity (per item) | common → `[--sk-loot-reveal-color:var(--sk-text-faint)]` · rare → `[--sk-loot-reveal-color:var(--sk-chart-2)]` · epic → `[--sk-loot-reveal-color:var(--sk-chart-5)]` · legendary → `[--sk-loot-reveal-color:var(--sk-premium)]` + `[--sk-loot-reveal-glint:color-mix(in_oklab,var(--sk-loot-reveal-color)_55%,var(--sk-on-accent))]` |
| stagger | normal → `[--sk-loot-reveal-step:350ms]` · slow → `[--sk-loot-reveal-step:700ms]` |
| play | true → the `animate-loot-reveal-*` classes below · false → none (revealed frame) |

`--sk-loot-reveal-color` paints the face border, gradient wash, bottom bar, kind chip, icon, glow,
halo, ring and the rarity label. **No new color token** — the rarity mapping onto existing tokens
is a `DECISION(open)` (Q38(c), §11). Card backs use `--sk-accent` on `--sk-surface-2`; the face
text is `--sk-text`; the kind chip's text is `--sk-surface` (`text-surface`) on the rarity color;
the "• • •" placeholder is `--sk-text-faint`. Sizes: `aspect-[5/7]`,
`rounded-md` (`--sk-radius-md`), `shadow`s from `--sk-shadow-card`.

Per-card inline custom properties (set by the logic, never class names): `--sk-loot-reveal-i`
(index), `--sk-loot-reveal-charge` (legendaries up to and including the card), and on the root
`--sk-loot-reveal-n` (card count, sizes the cards). Sparks carry `--sk-loot-reveal-j` (0–23).

The motion CSS lives in `packages/ui/scripts/motion/loot-reveal.ts` and is emitted into the
generated `theme.css` by `scripts/build-tokens.ts`. **6 keyframes**; one shared `bloom` keyframe
reads its start values from variables, so each layer's end state is simply its own (final) style.
A layer whose resting `rotate`/`scale`/`translate` is not the default must start the bloom there
too (the flare rests at `y 180deg`, so its utility sets `--sk-loot-reveal-r0: y 180deg`).

```css
@keyframes sk-loot-reveal-flip { from { rotate: y 0deg; } }               /* .flip rests at y 180deg */
@keyframes sk-loot-reveal-pop {                                           /* the card lifts + settles */
  28% { translate: 0 -3.2cqi; scale: 1.07; }
  70% { translate: 0 0.4cqi; scale: 0.99; }
}
@keyframes sk-loot-reveal-side {                                          /* visibility swap at mid-flip */
  0%, 11% { visibility: var(--sk-loot-reveal-pre); animation-timing-function: step-start; }
}
@keyframes sk-loot-reveal-bloom {                                         /* shared appear/fade curve */
  0% {
    opacity: var(--sk-loot-reveal-o0, 0);
    scale: var(--sk-loot-reveal-s0, 1);
    rotate: var(--sk-loot-reveal-r0, 0deg);
    translate: var(--sk-loot-reveal-y0, 0 0);
  }
  20% { opacity: var(--sk-loot-reveal-o1, 1); }
}
@keyframes sk-loot-reveal-charge {                                        /* legendary back: shake + glow */
  20%, 60% { translate: -1.6px 0; rotate: -1deg; scale: 1.02; }
  40%, 80% { translate: 1.6px 0; rotate: 1deg; scale: 1.03; }
  100% { color: var(--sk-loot-reveal-color); border-color: var(--sk-loot-reveal-color);
         box-shadow: var(--sk-shadow-card), 0 0 28px <color 60%>, inset 0 0 22px <color 35%>; }
}
@keyframes sk-loot-reveal-spark {                                         /* one spark flies out + fades */
  0% { opacity: 0; scale: 1.6 1; translate: <45% of the way along --sk-loot-reveal-a>; }
  8%, 55% { opacity: 1; }
  100% { opacity: 0; scale: 0.2 1; translate: <full distance --sk-loot-reveal-d, +12px fall>; }
}
```

| Utility | On | Keyframe · duration · easing · start (relative to the card's flip) |
|---|---|---|
| `loot-reveal-clock` | `<li>` | sets `--sk-loot-reveal-at` from `-i`, `-charge` and `--sk-loot-reveal-step` |
| `animate-loot-reveal-flip` | flip | flip · 900ms · spring `linear(…)` (overshoots to ~197°) · +0 |
| `animate-loot-reveal-pop` | card | pop · 900ms · ease-in-out · +0 |
| `animate-loot-reveal-back` / `-face` | back / face | side · 900ms · +0 (back shown until 11%, face after) |
| `animate-loot-reveal-charge` | legendary back | charge · 450ms · −450ms, then side |
| `animate-loot-reveal-glyph` | icon | bloom (0 → 1, scale .55, −8°) · 700ms · `--sk-ease-spring` · +120ms |
| `animate-loot-reveal-halo` | halo | bloom (fade in) · 800ms · ease · +0 |
| `animate-loot-reveal-ring` | ring | bloom (.9 → 0, grows to 1.2 × 1.14) · 700ms · `--sk-ease` · +550ms |
| `animate-loot-reveal-label` / `-hint` | rarity text / "• • •" | bloom (rise 4px in) · 350ms · +300ms / (fade out) · 200ms · +0 |
| `animate-loot-reveal-rays` | legendary rays | bloom (spin −40° → 20°, rest at .3) · 2.4s · +100ms |
| `animate-loot-reveal-core` / `-wave` | legendary flash / shock ring | bloom · 1.1s · +80ms / 900ms · +100ms |
| `animate-loot-reveal-flare` / `-sheen` | legendary face glow / light sweep | bloom (fade in/out, held at `y 180deg`) · 1.3s · +100ms / (−120% → 120%) · 1.1s · +350ms |
| `animate-loot-reveal-spark` | 24 legendary sparks | spark · 700–1300ms · +100–190ms (CSS `sin()`/`pow()` hash of `-j`) |
| `loot-reveal-spark` | each spark | angle/distance/length variables from `--sk-loot-reveal-j` |
| `loot-reveal-glow` / `-glow-gilded` | face | resting rarity glow (gilded = legendary double inner ring) |
| `loot-reveal-flare` | legendary flare layer | the flare's box-shadow (opacity animated) |

Every animated slot also carries `motion-reduce:animate-none`. Durations and easings are literals
inside the utilities (the `sk-shine` precedent), tunable as a patch pre-1.0.

## 5. States

| State | Behavior |
|---|---|
| server / no-JS | Same HTML and CSS as the client — the animation is pure CSS, so it plays without JS. |
| default (`play`) | Backs show, then each card lifts and flips (spring) in order; the face's icon pops, the rarity label rises in, a halo and an expanding ring glow in the rarity color. |
| legendary | Its back shakes and charges to the rarity color for 450ms, then it flips with a light flash, shock ring, rotating rays (they stay at 30%), 24 sparks (16 behind, 8 in front of the card) and a sheen across the face. |
| `play={false}` | The revealed row, no animation (an opened pack). |
| prefers-reduced-motion | `motion-reduce:animate-none` on every animated layer → the revealed row immediately, with the resting halo and rays; nothing flashes, nothing moves. |
| replay | Change `key`; React remounts the list and CSS replays from the backs. |

## 6. Logic (`loot-reveal.logic.tsx`)

- **No `'use client'`** — no hooks, no DOM access, no timers; the stagger is CSS (`--sk-loot-reveal-i`
  and `--sk-loot-reveal-charge` inline per `<li>`, `--sk-loot-reveal-n` on the root). Guarded by the
  RSC boundary test in `packages/ui/src/index.test.ts`.
- `forwardRef<HTMLUListElement, LootRevealProps>`; destructures `items`, `stagger`, `play`,
  `rarityLabels`, `backIcon` so none reach the DOM; spreads the rest onto the `<ul>`; the consumer
  `style` is spread **after** the internal custom property.
- Positional keys (a pack is a fixed, ordered list); each `<li>` gets `data-rarity`.
- Spark layout is a module-level constant (24 sparks: every third in front of the card); position
  comes from a CSS trig hash of `--sk-loot-reveal-j`, so there is no `Math.random` and SSR matches
  hydration.

## 7. Styles (`loot-reveal.styles.tsx`)

```ts
import { tv, type VariantProps } from '../../utils/tv'

export const lootRevealStyles = tv({
  slots: {
    root: '@container isolate m-0 flex w-full list-none flex-wrap items-start justify-center gap-y-6 p-0',
    slot: 'loot-reveal-clock flex flex-col items-center gap-3.5 px-[2.25cqi]',
    box: 'relative aspect-[5/7] w-[clamp(72px,calc(85.5cqi/var(--sk-loot-reveal-n,3)),124px)] before:…floor shadow',
    card: 'relative z-1 block h-full perspective-[640px] motion-reduce:animate-none',
    flip: 'relative block h-full transform-3d [rotate:y_180deg] motion-reduce:animate-none',
    back: 'absolute inset-0 … invisible backface-hidden text-accent … motion-reduce:animate-none',
    face: 'absolute inset-0 grid grid-rows-[auto_1fr_auto] … [rotate:y_180deg] backface-hidden …',
    // + backFrame, backHatch, mark, kind, icon, name, sheen, flare, halo, ring, rays, beams,
    //   core, wave, sparks, rarity, label, hint
  },
  variants: {
    // DECISION(open): Q38(c) rarity tokens
    rarity: { common: { slot: '[--sk-loot-reveal-color:var(--sk-text-faint)]', face: 'loot-reveal-glow', … }, … },
    stagger: { normal: { root: '[--sk-loot-reveal-step:350ms]' }, slow: { root: '[--sk-loot-reveal-step:700ms]' } },
    play: { true: { flip: 'animate-loot-reveal-flip', card: 'animate-loot-reveal-pop', … }, false: {} },
  },
  compoundVariants: [
    { play: true, rarity: ['common', 'rare', 'epic'], class: { back: 'animate-loot-reveal-back' } },
    { play: true, rarity: 'legendary', class: { back: 'animate-loot-reveal-charge' } },
  ],
  defaultVariants: { rarity: 'common', stagger: 'normal', play: true },
})
```

The `animate-*` classes sit only in the `play` variant (never two on one slot: tailwind-merge does
not know custom `animate-*` names). Gradients use Tailwind's arbitrary `bg-[…]` (never a custom
`bg-*` utility name); every arbitrary value is a literal string referencing `--sk-*` (rules #7/#8).
A second `lootRevealSparkStyles` tv() maps spark `shape` (streak | dot) and `tint` (rarity | accent).

## 8. Accessibility checklist

- [ ] A real `<ul>`/`<li>` list; pass `aria-label` ("Crimson Vow Pack rewards") to name it.
- [ ] Each item's kind, name and rarity label are real text in the DOM from the first render —
      motion never gates the information. Screen readers get "Banner, Crimson Vow Gold Banner,
      Legendary"; rarity is never color-only (the label spells it out).
- [ ] Card backs, the icon wrapper, halo, ring, rays, flash, sparks, sheen and the "• • •"
      placeholder are `aria-hidden`.
- [ ] During its stagger delay a face is `visibility: hidden` (face-down), so it joins the
      accessibility tree when it turns over: the last of 5 cards after ~1.7s (+0.45s per
      legendary charge-up, ~2.6s with two legendaries).
- [ ] Not interactive: no focus stops, no hover-only content.
- [ ] `prefers-reduced-motion: reduce` → no motion at all (`motion-reduce:animate-none` on every
      layer); the revealed frame shows at once.
- [ ] WCAG 2.3.1: no flashing — the legendary light flash happens once (one fade in/out over 1.1s),
      sparks fade, nothing repeats.
- [ ] Contrast at rest (Q38(c) mapping, both themes): face text `--sk-text` on `--sk-surface-2`;
      the kind chip is `--sk-surface` on the rarity color (≥ 4.73:1; light `rare` is the lowest);
      the rarity label is the rarity color on `--sk-surface` (≥ 4.73:1). On a `--sk-bg` page,
      light `rare` (`--sk-chart-2` #3072D0 on #FAF9F5) measures 4.49:1 — just under AA for this
      10px label; tracked with Q38(c) (§11).
- [ ] Apps that want an announcement own it (an `aria-live="polite"` "3/3 revealed" counter, as in
      the stories); the component does not announce.

## 9. Tests

`loot-reveal.test.tsx` (bun + happy-dom):

- Server render: a `<ul>` with one `<li>` per item; names, kinds and rarity labels are in the HTML.
- Each rarity maps to its literal `--sk-loot-reveal-color` class and glow utility; only legendary
  renders the burst (rays, flash, wave, flare, sheen, 24 sparks split 16 behind / 8 in front).
- Inline vars: `--sk-loot-reveal-i` per card, `--sk-loot-reveal-charge` counts legendaries,
  `--sk-loot-reveal-n` on the root; consumer `style` merges after.
- `stagger` maps to the step class; `play` (default) puts the `animate-loot-reveal-*` classes on
  every animated layer, each with `motion-reduce:animate-none`; `play={false}` renders no
  `animate-` class at all.
- Decoration is `aria-hidden`; text stays readable; `rarityLabels` and `backIcon` override defaults.
- Variant props don't leak to the DOM; native props pass through; ref forwards to the `<ul>`;
  consumer `className` wins a conflict.
- Hydrates without warnings; axe: zero violations in both themes.

Browser (`test/browser/loot-reveal.test.ts`, Playwright against Storybook; the stories' Google
Fonts request is stubbed so the suite stays offline):

- motion: the flips run in stagger order (`sk-loot-reveal-flip` delays 200 / 550 / 1350ms for
  rare, epic, legendary), the legendary charges at 900ms and owns the 24 sparks; every card runs
  flip, side and bloom.
- seeking the Web Animations timeline: at 0ms every name is hidden (face-down), backs visible,
  labels at opacity 0; at 1200ms card 1 is up and the legendary still down; finished, every name
  and rarity label is visible and the backs are hidden.
- `Settled` (`play={false}`) and `prefers-reduced-motion: reduce`: no animations at all
  (`animation-name: none`), every name visible at once.
- no page or console errors in any of the above.

## 10. Stories

`Playground` (the pack screen: header, revealed counter with `aria-live`, rarity pips),
`Rarities` (common → legendary), `SlowStagger`, `Replay` (replay via `key`), `Settled`
(`play={false}` — the reduced-motion frame, for review), `Narrow` (phone width). Ids:
`components-lootreveal--playground`, `--rarities`, `--slow-stagger`, `--replay`, `--settled`,
`--narrow`. Both themes via the toolbar. The pack-screen chrome (stage, header, live counter,
pips, Replay button) lives in the stories, not the component. A story decorator loads Archivo
with its `wdth` axis from Google Fonts (as an app would; the library bundles no fonts) so the
names render condensed like the approved prototype.

## 11. Decisions

- Approved as one of the 14 showpieces in **Q38/Q39** (`docs/questions.md`); ported from the
  approved prototype (written from scratch — no third-party code).
- **Rarity colors — `DECISION(open)` (Q38(c))**: `common` → `--sk-text-faint`, `rare` →
  `--sk-chart-2`, `epic` → `--sk-chart-5`, `legendary` → `--sk-premium` (+ a lighter "glint" mixed
  toward `--sk-on-accent` for the burst). No `--sk-rarity-*` tokens until the owner approves rarity
  colors; the comment sits on the `rarity` variant in `loot-reveal.styles.tsx`. Contrast with this
  mapping: every chip and label passes on `--sk-surface`, but light `rare` on `--sk-bg` is 4.49:1,
  so an approved rarity palette should darken light `rare` slightly.
- The kind chip's text is `--sk-surface` rather than the prototype's `--sk-bg`: the same look, and
  it lifts the light `rare` chip from 4.49:1 to 4.73:1.
- **Plays on mount, CSS only** (build brief decisions 2 and 14): the prototype's click-to-flip and
  `setTimeout` sequence became CSS delays from `--sk-loot-reveal-i` (+ a legendary charge offset).
  The base styles are the revealed frame and each keyframe's start holds the face-down state, so
  no-JS, reduced motion and `play={false}` all show the reveal. Replay = change `key`.
- `play` and `rarityLabels`/`backIcon`/`kind` refine the brief's sketch (`items`, `stagger`):
  `play={false}` covers "show an opened pack", the rest cover i18n and pack branding.
- **6 keyframes** (budget 8): one shared `sk-loot-reveal-bloom` driven by per-utility start
  variables replaces the prototype's ring/core/wave/rays/glyph/flare/sheen/label keyframes; the
  shake + back recolor merge into `sk-loot-reveal-charge`; the spark move + fade merge into one
  `sk-loot-reveal-spark` with per-keyframe easing.
- The visibility swap at mid-flip (`sk-loot-reveal-side`) is kept from the prototype: Firefox and
  WebKit otherwise leak the mirrored face through `backface-visibility`.
- Mono type in the prototype → `font-sans` (no mono token, brief decision 7); the name keeps
  Archivo condensed (`font-display font-stretch-condensed`, load Archivo with its `wdth` axis).
- Motion rules (`docs/motion.md`): animates `opacity`/`translate`/`scale`/`rotate` plus `color`,
  `border-color`, `box-shadow` and `visibility` on the legendary back for 450ms, and a one-shot
  burst — part of the Q39 showpiece carve-out the integrator records.
