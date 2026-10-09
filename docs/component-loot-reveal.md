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
                                           #   order, reduced motion = no animation, long names fit,
                                           #   n cards share a row (72px floor wraps), no sideways
                                           #   page scroll, no console errors
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
stories do).

**Overflow.** The legendary burst and the resting rays (290% of a card) reach well past the cards.
The root clips them horizontally (`overflow-x: clip`), so they never widen the page or scroll a
phone sideways; vertically they still spill. Inside a stage that clips itself (a pack screen with
`overflow: hidden`), pass `className="overflow-x-visible"` so the rays reach the stage's edges —
the stories do:

```tsx
<div className="overflow-hidden rounded-lg bg-surface p-3.5">
  <LootReveal
    key={pack.id}
    aria-label="Crimson Vow Pack rewards"
    items={items}
    className="overflow-x-visible"
  />
</div>
```

On a phone with no stage, that clip lands in the page gutter, so the legendary's resting rays
(and the outer halos) stop at a straight edge 16–24px inside the screen. That is the deliberate
trade-off for never scrolling sideways. For edge-to-edge rays, put the reveal in a full-width
parent that clips (`overflow-x: clip` on a section that spans the screen) and pass
`className="overflow-x-visible"`.

Sizing: the root fills its container's width (`container-type: inline-size`) and the cards share
it. Each card is `clamp(72px, 99cqi / n − 4.5cqi, 124px)` for n cards. The `− 4.5cqi` is its slot's
own `2.25cqi` padding on each side, so every slot takes 99cqi / n and n cards always fit one row.
At n = 3 the card is 28.5cqi, as in the prototype. The 124px cap leaves the row narrower and
centred. Only the 72px floor wraps cards onto a new row: in one row, four cards fit a root from
~356px wide, five from ~471px and six from 600px. A 540px pack screen (a 512px root) shows four
cards at ~104px each. A rarity label wider than a small card ("Legendary" is ~82px) first uses
its slot's padding (`-mx-[2.25cqi]`) before it widens the slot. The name's type is `2.5cqi`
(9.5–13px) as in the prototype, capped at 10.5% of the card. The cap never binds at n = 3; with
4+ cards it makes the names shrink with the cards, not only with the row.

Long names wrap inside the card, breaking an unbreakable word where needed
(`overflow-wrap: anywhere`), and a long `kind` truncates with an ellipsis. For nicer breaks in
translated compound words, put soft hyphens (U+00AD, `&shy;` in HTML) in the name, or wrap it in
an element with `hyphens: auto` and the right `lang`.

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
halo and ring. The rarity label is that color mixed 25% toward `--sk-text`
(`text-[color-mix(in_oklab,var(--sk-loot-reveal-color)_75%,var(--sk-text))]`): the card's own
halo, glow and rays sit behind it, and the raw color falls under AA there in light (§8).
**No new color token** — the rarity mapping onto existing tokens is a `DECISION(open)` (Q38(c),
§11). Card backs use `--sk-accent` on `--sk-surface-2`; the face
text is `--sk-text`; the kind chip's text is `--sk-surface` (`text-surface`) on the rarity color;
the "• • •" placeholder is `--sk-text-faint`. Sizes: `aspect-[5/7]`,
`rounded-md` (`--sk-radius-md`), `shadow`s from `--sk-shadow-card`.

Per-card inline custom properties (set by the logic, never class names): `--sk-loot-reveal-i`
(index), `--sk-loot-reveal-charge` (legendaries up to and including the card), and on the root
`--sk-loot-reveal-n` (card count, sizes the cards). Sparks carry `--sk-loot-reveal-j` (0–23).
The root's class sets `--sk-loot-reveal-card` (the card width, §3). The box's width and the
name's type cap read it. Its `cqi` resolves where it is used, against the root container.

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
| `animate-loot-reveal-label` / `-hint` | rarity text / "• • •" | bloom (rise 4px in) · 350ms · +300ms, plus side (hidden until the flip, like the face) / (fade out) · 200ms · +0 |
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
| `play={false}` | The revealed row, no animation (an opened pack). The legendary's one-shot burst layers (flash, shock ring, flare, sheen, sparks) are not rendered; its rays and halo are. |
| prefers-reduced-motion | `motion-reduce:animate-none` on every animated layer → the revealed row immediately, with the resting halo and rays; nothing flashes, nothing moves. |
| replay | Change `key`; React remounts the list and CSS replays from the backs. |

## 6. Logic (`loot-reveal.logic.tsx`)

- **No `'use client'`** — no hooks, no DOM access, no timers; the stagger is CSS (`--sk-loot-reveal-i`
  and `--sk-loot-reveal-charge` inline per `<li>`, `--sk-loot-reveal-n` on the root). Guarded by the
  RSC boundary test in `packages/ui/src/index.test.ts`.
- `forwardRef<HTMLUListElement, LootRevealProps>`; destructures `items`, `stagger`, `play`,
  `rarityLabels`, `backIcon` so none reach the DOM; spreads the rest onto the `<ul>`; the consumer
  `style` is spread **after** the internal custom property.
- The `<ul>` carries an explicit `role="list"` (before the spread, so a consumer can override it):
  `list-style: none` makes Safari/VoiceOver drop the implicit list role.
- Positional keys (a pack is a fixed, ordered list); each `<li>` gets `data-rarity`.
- Spark layout is a module-level constant (24 sparks: every third in front of the card); position
  comes from a CSS trig hash of `--sk-loot-reveal-j`, so there is no `Math.random` and SSR matches
  hydration.
- The legendary's one-shot burst (core, wave, flare, sheen, 24 sparks) renders only when `play`
  is true: it ends invisible, so a still row skips ~30 dead nodes per legendary. The rays and halo
  always render (they are part of the resting frame).

## 7. Styles (`loot-reveal.styles.tsx`)

```ts
import { tv, type VariantProps } from '../../utils/tv'

export const lootRevealStyles = tv({
  slots: {
    root: [
      '@container isolate m-0 flex w-full list-none … overflow-x-clip', // never widens the page
      // card width: each slot (card + its 2 × 2.25cqi padding) is 99cqi/n, so n cards fit a row
      '[--sk-loot-reveal-card:clamp(72px,calc(99cqi/var(--sk-loot-reveal-n,3)_-_4.5cqi),124px)]',
    ],
    slot: 'loot-reveal-clock flex flex-col items-center gap-3.5 px-[2.25cqi]',
    box: 'relative aspect-[5/7] w-(--sk-loot-reveal-card) before:…floor shadow',
    card: 'relative z-1 block h-full perspective-[640px] motion-reduce:animate-none',
    flip: 'relative block h-full transform-3d [rotate:y_180deg] motion-reduce:animate-none',
    back: 'absolute inset-0 … invisible backface-hidden text-accent … motion-reduce:animate-none',
    face: 'absolute inset-0 grid grid-cols-1 grid-rows-[auto_1fr_auto] … [rotate:y_180deg] backface-hidden …',
    kind: 'row-start-1 max-w-full truncate rounded-pill bg-(--sk-loot-reveal-color) …',
    name: 'row-start-3 font-display text-[length:clamp(9.5px,min(2.5cqi,calc(var(--sk-loot-reveal-card)*.105)),13px)] … text-balance font-stretch-condensed … wrap-anywhere',
    rarity: '… -mx-[2.25cqi] … text-[10px] … text-[color-mix(in_oklab,var(--sk-loot-reveal-color)_75%,var(--sk-text))]',
    // + backFrame, backHatch, mark, icon, sheen, flare, halo, ring, rays, beams,
    //   core, wave, sparks, label, hint
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

- [ ] A real `<ul>`/`<li>` list; pass `aria-label` ("Crimson Vow Pack rewards") to name it. The
      `<ul>` has an explicit `role="list"`, since `list-style: none` makes Safari/VoiceOver drop
      list semantics ("list, 3 items" is part of the reveal).
- [ ] Each item's kind, name and rarity label are real text in the DOM from the first render —
      motion never gates the information. Screen readers get "Banner, Crimson Vow Gold Banner,
      Legendary"; rarity is never color-only (the label spells it out).
- [ ] Card backs, the icon wrapper, halo, ring, rays, flash, sparks, sheen and the "• • •"
      placeholder are `aria-hidden`.
- [ ] During its stagger delay a face **and its rarity label** are `visibility: hidden`
      (face-down), so a card joins the accessibility tree when it turns over — never a bare
      "Legendary" before its name: the last of 5 cards after ~1.7s (+0.45s per legendary
      charge-up, ~2.6s with two legendaries). Kind, name and label share one moment.
- [ ] Not interactive: no focus stops, no hover-only content.
- [ ] `prefers-reduced-motion: reduce` → no motion at all (`motion-reduce:animate-none` on every
      layer); the revealed frame shows at once.
- [ ] WCAG 2.3.1: no flashing — the legendary light flash happens once (one fade in/out over 1.1s),
      sparks fade, nothing repeats.
- [ ] Contrast at rest (Q38(c) mapping, both themes): face text `--sk-text` on `--sk-surface-2`;
      the kind chip is `--sk-surface` on the rarity color (≥ 4.73:1; light `rare` is the lowest).
      The 10px rarity label sits on the card's own halo, glow and (legendary) rays, so it is
      measured on the **rendered** background (label text hidden, Chromium): with the raw rarity
      color light fell to 3.9–4.6:1, so the label is mixed 25% toward `--sk-text`. Now light
      5.7–6.7:1 on a `--sk-surface` stage (darkest background pixel ≥ 5.0:1) and 5.7–6.0:1 straight
      on `--sk-bg`; dark 7.0–10.2:1 (was 5.0–9.8).
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
  `animate-` class at all and no one-shot burst (no sparks, flash, wave, flare, sheen), but keeps
  the rays and halo.
- Decoration is `aria-hidden`; text stays readable; `rarityLabels` and `backIcon` override defaults;
  the `<ul>` has `role="list"`.
- Long names and kinds: the face column is `grid-cols-1`, the name `wrap-anywhere`, the kind
  `max-w-full truncate`; the label keeps `text-[10px]` next to its color mix (tailwind-merge).
- The root has `overflow-x-clip`; a consumer `overflow-x-visible` replaces it.
- Card sizing: the root's `--sk-loot-reveal-card` subtracts exactly twice the slot's `px-[…cqi]`
  padding from `99cqi/n`, so the two literals cannot drift apart. The box reads it, the rarity
  label carries the matching `-mx-[…]`, and the name's type is capped by it.
- Variant props don't leak to the DOM; native props pass through; ref forwards to the `<ul>`;
  consumer `className` wins a conflict.
- Hydrates without warnings; axe: zero violations in both themes.

Browser (`test/browser/loot-reveal.test.ts`, Playwright against Storybook; the stories' Google
Fonts request is stubbed so the suite stays offline):

- motion: the flips run in stagger order (`sk-loot-reveal-flip` delays 200 / 550 / 1350ms for
  rare, epic, legendary), the legendary charges at 900ms and owns the 24 sparks; every card runs
  flip, side and bloom.
- seeking the Web Animations timeline: at 0ms every name and rarity label is hidden
  (`visibility: hidden`, face-down), backs visible, labels at opacity 0; at 1200ms card 1 and its
  label are up and the legendary still down; finished, every name and rarity label is visible and
  the backs are hidden.
- `Settled` (`play={false}`) and `prefers-reduced-motion: reduce`: no animations at all
  (`animation-name: none`), every name visible at once; `Settled` renders no sparks or flare.
- `LongNames`: every name and kind chip stays inside its face (no horizontal scroll in the name),
  and the chip stays centred.
- `Rarities` (4 cards) with the stage resized: at 540px they sit on one row (cards between 72px
  and 124px), at 680px on one row at 124px. At 320px the 72px floor wraps them 3 + 1, and the
  stage's `min-height` grows so no card is cut off.
- `Unstaged` at a 375px viewport: the document never scrolls sideways — mid-burst (1.5s, 2s) and
  at rest (rays at 30%), with and without reduced motion.
- no page or console errors in any of the above.

## 10. Stories

`Playground` (the pack screen: header, revealed counter with `aria-live`, rarity pips),
`Rarities` (common → legendary), `SlowStagger`, `Replay` (replay via `key`), `Settled`
(`play={false}` — the reduced-motion frame, for review), `Narrow` (phone width), `LongNames`
(German names, a long kind, translated `rarityLabels`, `lang="de"`), `Unstaged` (no stage, straight
on the page: the default horizontal clip). Ids: `components-lootreveal--playground`, `--rarities`,
`--slow-stagger`, `--replay`, `--settled`, `--narrow`, `--long-names`, `--unstaged`. Both themes
via the toolbar. The pack-screen chrome (stage, header, live counter, pips, Replay button) lives in
the stories, not the component. The stage's 320px height is a `min-height`, so a row that wraps
grows the stage instead of being clipped. The stage clips itself, so it passes
`className="overflow-x-visible"` to let the rays reach its edges. A story decorator loads Archivo
with its `wdth` axis from Google Fonts (as an app would; the library bundles no fonts) so the
names render condensed like the approved prototype.

## 11. Decisions

- Approved as one of the 14 showpieces in **Q38/Q39** (`docs/questions.md`); ported from the
  approved prototype (written from scratch — no third-party code).
- **Rarity colors — `DECISION(open)` (Q38(c))**: `common` → `--sk-text-faint`, `rare` →
  `--sk-chart-2`, `epic` → `--sk-chart-5`, `legendary` → `--sk-premium` (+ a lighter "glint" mixed
  toward `--sk-on-accent` for the burst). No `--sk-rarity-*` tokens until the owner approves rarity
  colors; the comment sits on the `rarity` variant in `loot-reveal.styles.tsx`. Contrast with this
  mapping: every kind chip passes (≥ 4.73:1). The rarity label sits on the card's own halo/glow,
  where the raw light colors measured 3.9–4.6:1, so the label mixes the rarity color 25% toward
  `--sk-text` (light ≥ 5.7:1, dark ≥ 7.0:1 on the rendered background, §8). An approved rarity
  palette can revisit that mix.
- **Horizontal clip by default.** The root is `overflow-x: clip`: the resting rays (290% of a
  card) used to add ~70px of sideways page scroll on a 375px phone when no ancestor clipped. The
  burst still spills vertically. Inside a stage that clips itself, `className="overflow-x-visible"`
  restores the edge-to-edge rays (the stories do; with the clip, the rays would stop 14px inside
  the stage's padding). `overflow-clip-margin` (to let the rays run a little past the root) was
  left out: WebKit doesn't support it, so the engines would clip in different places. A soft
  edge fade instead of the straight cut was left out too. A mask on the root would also clip the
  vertical spill, and a mask on the rays can't know where the root's edges are. §3 gives the
  full-bleed alternative.
- **Card sizing counts the slot padding** (round 2): the card was `85.5cqi / n`, which ignored
  each slot's `4.5cqi` padding, so 4 cards broke 3 + 1 below ~605px and 5 below ~800px. It is
  now `99cqi / n − 4.5cqi`, the same 28.5cqi card at n = 3, and only the 72px floor wraps. The
  name's type is capped at 10.5% of the card, so with 4+ cards the names shrink with the cards
  (the approved names stay on two lines at five cards on a 540px stage). The cap never binds at
  n = 3, so the approved 3-card frames are pixel-identical (Chromium screenshot diff).
- **Long names**: `grid-cols-1` + `overflow-wrap: anywhere` on the name (breaks only a word that
  can't fit), `truncate` on the kind chip. No `hyphens: auto` and no line clamp: auto-hyphenation
  would re-break the approved English names differently per engine, and a clamp's
  `overflow: hidden` would risk cutting umlauts and accents at this `leading-[1.04]`. Apps add soft
  hyphens instead.
- `role="list"` on the `<ul>`, against the repo default (breadcrumbs, pagination and stepper rely
  on the implicit role): here the list size is part of what the reveal tells a VoiceOver user.
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
