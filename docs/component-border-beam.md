# Component: BorderBeam

> Follows the `docs/component-button.md` section template. **Static** component — no `'use client'`.
> CSS-only motion (an `@property` angle + one keyframe); no hooks, no DOM access, RSC-safe.
> Approved in Q38/Q39 (showpieces & FX, wave 1).

## 1. Purpose

Sends a short light around the border of a card, a featured match, a season pass or a plan
tile, to mark the one thing on a screen that deserves attention. The beam is decoration on a
wrapper element: the consumer's own border, radius and surface stay the resting look, and under
`prefers-reduced-motion` the orbit is replaced by a still tint of the same color.

## 2. Files

```
packages/ui/src/components/border-beam/
├── border-beam.styles.tsx   # tv() slots root/glow/sheen/ring + tone/speed. Pure. Server-safe.
├── border-beam.logic.tsx    # forwardRef; NO 'use client' (CSS-only motion, RSC-safe).
├── border-beam.test.tsx
├── border-beam.stories.tsx  # Components/BorderBeam — the screen chrome lives here, not in the component
└── index.tsx                # export { BorderBeam } ; export type { BorderBeamProps, BorderBeamElement }
packages/ui/scripts/motion/border-beam.ts  # @property / @keyframes / @utility → generated theme.css
test/browser/border-beam.test.ts           # Playwright: orbit, @property, phase, hover, tail, reduced motion
```

## 3. API

```ts
import type { ComponentPropsWithoutRef } from 'react'

export type BorderBeamElement = 'div' | 'article' | 'section' | 'li'

interface BorderBeamOwnProps {
  as?: BorderBeamElement               // default 'div'
  tone?: 'accent' | 'premium'          // default 'accent' — crimson, or the bone/gold premium color
  speed?: 'slow' | 'normal' | 'fast'   // default 'normal' — one lap per 6.5s / 4s / 2.5s
  phase?: number                       // default 0 — where the head starts, as a fraction of a lap
}

export type BorderBeamProps = BorderBeamOwnProps & ComponentPropsWithoutRef<'div'>
```

Usage — the BorderBeam **is** the card (the beam then rides the card's own border), or it wraps one:

```tsx
<BorderBeam as="article" aria-label="Featured match" className="border border-line bg-surface p-5">
  …
</BorderBeam>

<BorderBeam tone="premium" speed="slow">
  <Card tone="premium" className="h-full">…</Card>
</BorderBeam>
```

- The root defaults to `rounded-lg` so wrapping a default `Card` lines up; pass another
  `rounded-*` in `className` to match a different radius. Every layer is `rounded-[inherit]`.
- When wrapping, let the card fill the wrapper (`h-full`): a stretched flex/grid row makes the
  wrapper taller than an auto-height card, and the beam follows the wrapper. An opaque wrapped card
  also covers the inner sheen (§4) — only the ring and the outer glow show.
- `phase` offsets the start of the lap (`0.5` = half a lap ahead), so several beams on one screen
  don't orbit in lockstep. Non-finite values are ignored. Changing `key` is not needed: the orbit
  is a loop, not a one-shot.
- Don't put `overflow-hidden` on the root: the glow and the stroke's drop-shadow sit just outside
  the border box. Clip media inside the card instead.

Deliberately **not** in v1: arbitrary colors or durations (enums keep the class strings literal,
rule 7), a `paused`/`disabled` switch (`animate-border-beam-orbit` is a custom utility tailwind-merge
can't dedupe against `animate-none`, same reason as ShinyText; reduced motion already stops it), a
tail-length prop (the ring shortens its tail on its own on wide or tall cards, §4), more than one
beam per element, and a pause-when-offscreen observer (that would need a client island; the
browser already throttles hidden tabs).

## 4. Variants → tokens

| Variant | Values → variables on the root (literal arbitrary properties) |
|---|---|
| tone | **accent** → color `var(--sk-accent)`; head `light-dark(var(--sk-accent), color-mix(in oklab, var(--sk-accent), var(--sk-on-accent) 62%))`; glow `light-dark(color-mix(in oklab, var(--sk-accent) 20%, transparent), var(--sk-accent-glow))`; bloom `light-dark(color-mix(… var(--sk-accent) 40%, transparent), var(--sk-accent))` · **premium** → color `--sk-premium` warmed toward `--sk-chart-4` (50% light / 22% dark); head 78% toward `--sk-chart-4` (light) / 70% toward `--sk-on-accent` (dark); glow and bloom faint `--sk-chart-4` (light) / `--sk-premium` at 55% and the beam color (dark) |
| speed | slow → `[--sk-border-beam-duration:6.5s]` · normal → `4s` · fast → `2.5s` |
| phase | inline `--sk-border-beam-phase: <n>` (unitless), read by `animate-border-beam-orbit` as a negative delay |

Each `light-dark(<light theme>, <dark theme>)` pair gives the dark theme a white-hot head and an
emissive bloom, and the light theme a flat head and a faint tint — the approved mockup's per-theme
tuning. `light-dark()` follows `color-scheme`, which the theme blocks don't set yet (roadmap T2),
so every layer derives it from the nearest `data-theme`:
`scheme-dark in-data-[theme=light]:scheme-light [[data-theme=light]_[data-theme=dark]_&]:scheme-dark`
(a dark island inside a light page stays dark).

Three `aria-hidden` layers, all `absolute`, `rounded-[inherit]` and `pointer-events-none`:

| Layer | Paint | Stacking |
|---|---|---|
| glow | a 6px conic ring blurred 9px (`-inset-1`), `opacity-75`, 100 on hover / focus-within | under the content (`-z-10`) |
| sheen | a faint conic wash inside the edge, radially masked (`opacity-70`, 100 on hover / focus-within) | under the content (`-z-10`) |
| ring | the 1.5px stroke (`-inset-px`): long fading tail → full color → the hot head, plus a 1.5px drop-shadow | over the content (rendered last) |

The root is `relative isolate`, so the under-content layers paint above the root's own background
and border but below its children; the ring paints over everything, so it also covers the border of
a wrapped `Card`.

Motion CSS lives in `packages/ui/scripts/motion/border-beam.ts` and is emitted into the generated
`theme.css` by `bun run tokens:build`:

```css
@property --sk-border-beam-angle {
  syntax: '<angle>';
  inherits: true;
  initial-value: 0deg;
}

@keyframes sk-border-beam-orbit {
  to {
    --sk-border-beam-angle: 360deg;
  }
}

/* One lap per --sk-border-beam-duration; --sk-border-beam-phase (0-1) starts it part-way round. */
@utility animate-border-beam-orbit {
  animation: sk-border-beam-orbit var(--sk-border-beam-duration, 4s) linear
    calc(var(--sk-border-beam-phase, 0) * var(--sk-border-beam-duration, 4s) * -1) infinite;
}

@utility border-beam-ring {
  container-type: size; /* absolutely inset, so containment never changes the card's layout */
  filter: drop-shadow(0 0 1.5px var(--sk-border-beam-color));
  &::before {
    /* conic-gradient(from var(--sk-border-beam-angle), transparent 0 58%, color 14% @72%,
       color 62% @88%, color @95%, var(--sk-border-beam-head) @99%, transparent),
       masked to a 1.5px ring (content-box XOR border-box) */
  }
  @container (aspect-ratio > 3 / 2) or (aspect-ratio < 2 / 3) {
    &::before { /* same sweep, tail shortened to 74% / 84% / 92% / 96.5% */ }
  }
  @media (prefers-reduced-motion: reduce) {
    &::before { background: color-mix(in oklab, var(--sk-border-beam-color) 34%, transparent); }
  }
}

@utility border-beam-glow {
  filter: blur(9px) drop-shadow(0 0 1.5px var(--sk-border-beam-color));
  &::before { /* 6px conic ring: transparent 0 80%, glow @93%, bloom @99% — masked like the ring */ }
}

@utility border-beam-sheen {
  filter: drop-shadow(0 0 1.5px var(--sk-border-beam-color));
  /* conic wash: transparent 0 76%, light-dark(color 5%, color 11%) @96.5%, transparent;
     mask: radial-gradient(farthest-side, transparent 45%, black) */
}
```

(The full bodies are in the motion module; they only reference `--sk-*` tokens and the
`--sk-border-beam-*` variables above. The masks use `black` as an alpha mask, never as a color.)

Why the tail changes with shape: the sweep is a constant angle, so on a wide, short card (or a
tall, narrow one) the same angle covers most of a long edge and the head appears to race. The ring
layer is its own size container and its `::before` shortens the tail past a 3:2 aspect ratio — the
approved mockup did the same in its stacked phone layout.

No new **color** token: every color is `--sk-accent`, `--sk-accent-glow`, `--sk-on-accent`,
`--sk-premium` or `--sk-chart-4`, mixed with `color-mix(in oklab, …)`.

## 5. States

| State | Behavior |
|---|---|
| default | the beam orbits clockwise forever, one lap per `speed`; the glow and sheen ride with the head. |
| hover / focus-within | glow and sheen brighten to full opacity (`duration-slow`, `ease-sukuna`). |
| wide or tall card (aspect ratio past 3:2) | the ring's tail is shorter, so the head doesn't race along the long edges. |
| prefers-reduced-motion | no orbit (`motion-reduce:animate-none` on every layer); glow and sheen are hidden; the ring becomes a still full-border tint of the beam color (34%). Nothing is hidden that carries meaning. |
| server / no-JS | identical to default — the component is pure CSS, there is nothing to hydrate. |
| no `@property` support | the angle can't interpolate, so the beam rests at its start angle (a still beam on the border). |
| no `light-dark()` support (pre-2024 engines) | the beam declarations are invalid at computed time, so no beam paints; the card keeps its own border and content. |
| no container queries | the long tail on every shape. |

## 6. Logic (`border-beam.logic.tsx`)

- No `'use client'` — the motion is CSS; the component is a pure render (RSC guard in
  `src/index.test.ts`).
- `forwardRef<HTMLElement, BorderBeamProps>`; `const Component = as ?? 'div'`.
- Destructure `as`, `tone`, `speed`, `phase`, `className`, `style`, `children`; spread the rest.
- `phase` is written to `--sk-border-beam-phase` only when it is a finite number; the consumer
  `style` is spread last so it can override. No `style` attribute is rendered when neither is set.
- Renders `glow` and `sheen` spans before `children` and the `ring` span after them, all
  `aria-hidden="true"`, each tagged `data-sk-border-beam="glow|sheen|ring"` for tests and devtools.
- No hooks, no `window`/`document`, no `Math.random`.

## 7. Styles (`border-beam.styles.tsx`)

```ts
import { tv, type VariantProps } from '../../utils/tv'

// DECISION(open): drop these three scheme classes once every theme block sets `color-scheme` (T2).
const layer = [
  'pointer-events-none absolute rounded-[inherit]',
  'animate-border-beam-orbit motion-reduce:animate-none',
  'scheme-dark in-data-[theme=light]:scheme-light [[data-theme=light]_[data-theme=dark]_&]:scheme-dark',
]
const brighten = [
  'transition-opacity duration-slow ease-sukuna motion-reduce:transition-none',
  'group-hover/border-beam:opacity-100 group-focus-within/border-beam:opacity-100',
]

export const borderBeamStyles = tv({
  slots: {
    root: 'group/border-beam relative isolate rounded-lg',
    glow: [layer, '-inset-1 -z-10 border-beam-glow opacity-75 motion-reduce:hidden', brighten],
    sheen: [layer, 'inset-0 -z-10 border-beam-sheen opacity-70 motion-reduce:hidden', brighten],
    ring: [layer, '-inset-px border-beam-ring'],
  },
  variants: {
    tone: {
      accent: { root: ['[--sk-border-beam-color:var(--sk-accent)]', /* head, glow, bloom (§4) */] },
      // DECISION(open): premium beam color — `--sk-premium` warmed toward `--sk-chart-4`.
      premium: { root: [/* color, head, glow, bloom (§4) */] },
    },
    // DECISION(open): durations — seconds per lap (mockup: 4s accent, 6.5s premium); tunable.
    speed: {
      slow: { root: '[--sk-border-beam-duration:6.5s]' },
      normal: { root: '[--sk-border-beam-duration:4s]' },
      fast: { root: '[--sk-border-beam-duration:2.5s]' },
    },
  },
  defaultVariants: { tone: 'accent', speed: 'normal' },
})
```

Every class is a literal string (rule 7). The `border-beam-*` paint utilities sit alone on their
internal spans: tailwind-merge reads any unknown `border-<x>` as a border **color**, so they must
never share a slot with a `border-<color>` class (the root carries none of them, so a consumer
`border-line` is safe). Consumers can't reach the layer slots, so the utilities need no
tailwind-merge registration.

## 8. Accessibility checklist

- [ ] Every beam layer is `aria-hidden="true"` and `pointer-events-none`; the accessible content
      is the consumer's `children` only (the component adds no role, name or focus stop).
- [ ] `prefers-reduced-motion: reduce` stops the orbit on every layer and swaps it for a still tint —
      covered by `test/browser/border-beam.test.ts`.
- [ ] No flashing (WCAG 2.3.1): a single moving highlight passes any point at most once per lap
      (≥ 2.5s), far below 3 per second; no luminance strobe.
- [ ] Contrast at rest is the consumer's: the beam never sits under text (glow and sheen are
      faint and confined to the edge; the 1.5px ring is outside the content padding), so text
      contrast is unchanged in both themes (axe, both themes).
- [ ] The beam is not a focus indicator; interactive children keep their own focus rings
      (hover / focus-within only brighten the glow).

## 9. Tests

- Server render (`renderServer`) of every tone × speed; the three layers and the children are in
  the HTML; `as` renders `article` / `section` / `li`.
- Each tone maps to its `--sk-border-beam-*` variables (no raw hex) and each speed to its
  duration; defaults are accent + normal.
- Every layer carries `animate-border-beam-orbit` + `motion-reduce:animate-none`,
  `pointer-events-none`, `rounded-[inherit]` and the three `scheme-*` classes; glow/sheen carry
  `motion-reduce:hidden`; the paint utilities survive tailwind-merge.
- Layer order: glow, sheen, children, ring; every layer `aria-hidden`; glow/sheen `-z-10`.
- `phase` sets `--sk-border-beam-phase`; `NaN`/`Infinity` don't; consumer `style` merges last.
- `as`/`tone`/`speed`/`phase` don't leak to the DOM; native props pass through.
- Forwards `ref` (div and `as`); consumer `className` wins (`rounded-md` over `rounded-lg`).
- Hydrates without warnings; axe zero violations in both themes.
- Browser (`test/browser/border-beam.test.ts`, on `FeaturedCards`): every layer runs
  `sk-border-beam-orbit`; the registered `--sk-border-beam-angle` is a typed `deg` that advances,
  and the three layers stay in lockstep; slow speed = 6.5s and `phase={0.45}` = a −2.925s delay;
  tones paint different colors; hover brightens the glow; at phone width the stacked, wide cards
  switch to the short tail; reduced motion → no animations, glow and sheen hidden, the ring a still
  tint; no console errors. Verified in Chromium, Firefox and WebKit.

## 10. Stories

`Playground`, `Tones`, `Speeds`, `Phase`, `FeaturedCards` (the approved mockup screen: a live
featured match and a premium season pass — that chrome lives in the story; it stacks into wide,
short cards below 420px), `WrapsACard`, `SideBySide` (dark + light at once). Ids:
`components-borderbeam--playground`, `--tones`, `--speeds`, `--phase`, `--featured-cards`,
`--wraps-a-card`, `--side-by-side`. Every story is reduced-motion friendly: under
`prefers-reduced-motion: reduce` each beam rests as a still tint, which the browser spec checks on
`FeaturedCards`.

## 11. Decisions

- Approved as a showpiece in **Q38** (scout) and **Q39** (build go-ahead); the visual target is
  the approved `border-beam` mockup.
- **CSS-only, no `'use client'`** — an `@property`-registered angle animated by one keyframe drives
  a conic gradient; no observers or timers ship. The mockup's pause-offscreen script was gallery
  plumbing ("the shipped component is pure CSS").
- **`inherits: true`** on `--sk-border-beam-angle`: each layer animates the angle on itself and its
  `::before` paint inherits it. Each layer runs its own copy of the animation; they start in the
  same style pass, so they stay in lockstep (browser-tested).
- **Layering** (§4): glow + sheen under the content like the mockup; the ring is rendered after the
  children so it also covers a wrapped `Card`'s border.
- **Default `rounded-lg`** on the root so `<BorderBeam><Card/></BorderBeam>` lines up out of the box.
- **Automatic short tail** on wide or tall cards (a size container on the ring layer) instead of a
  tail prop: the mockup shortened the tail in its phone layout for the same reason, and an
  automatic rule keeps the API to the sketch's `tone` / `speed` (+ `phase`).
- `// DECISION(open): beam colors per theme` — the per-theme head/glow tuning uses `light-dark()`,
  which follows `color-scheme`; the theme blocks don't set it yet (roadmap T2), so each layer
  derives it from the nearest `data-theme` with three `scheme-*` classes. Drop them when T2 ships.
  Alternative the owner may prefer: dedicated per-theme tokens (e.g. a `--sk-premium-glow`) —
  rule 8, not invented here.
- `// DECISION(open): premium beam color` — `--sk-premium` warmed toward `--sk-chart-4` (amber), as
  in the approved mockup, whose own note flags it: "shipped = `--sk-premium` alone or a new
  `--sk-premium-glow` token". Kept to match the approved look; owner call.
- `// DECISION(open): durations` — 6.5s / 4s / 2.5s per lap (mockup: 4s accent, 6.5s premium);
  literal values in the class map, tunable as a patch pre-1.0 like ShinyText's (Q13).
- Motion-rule carve-out (motion.md rules 2 and 5: a repainting `@property` angle, an idle loop) is
  covered by Q39's approval; recorded centrally by the integrator.
