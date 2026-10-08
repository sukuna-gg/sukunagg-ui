# Component: RetroGrid

> Follows the `docs/component-button.md` section template. **Server component** (no hooks, no
> directive): CSS-only motion, RSC-safe. Approved in Q38/Q39 (showpieces & FX, wave 1). Visual and
> behavioural target: the RetroGrid prototype in the "Sukuna FX Lab" artifact.

## 1. Purpose

A synthwave arena backdrop for hero sections: a crimson perspective grid scrolls toward the viewer
under a glowing horizon, two spotlights sway in the sky and a light wave rolls out of the horizon
every few seconds. The effect is pure CSS (no JS, no canvas) and theme-aware: a night arena in dark,
a pale dawn sky with crimson ink on a bone floor in light. Your content (`children`) sits centred
in the sky above the horizon; reduced motion stops every loop and keeps a still grid.

## 2. Files

```
packages/ui/src/components/retro-grid/
├── retro-grid.styles.tsx   # tv() slots root/scene/sky/beam/floor/plane/near/nearPlane/sweep/
│                           #   horizon/glow/line/vignette/content + `speed`. Pure. Server-safe.
├── retro-grid.logic.tsx    # forwardRef <div>; static layer markup + children slot. NO 'use client'.
├── retro-grid.test.tsx
├── retro-grid.stories.tsx  # ARENA hero, landing page, speeds, phone, backdrop, themes (chrome only)
└── index.tsx               # export { RetroGrid } ; export type { RetroGridProps }

packages/ui/scripts/motion/retro-grid.ts   # @keyframes sk-retro-grid-* + @utility retro-grid-* /
                                           #   animate-retro-grid-* → generated theme.css
test/browser/retro-grid.test.ts            # Playwright: renders, loops run, reduced motion = still
```

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

interface RetroGridOwnProps {
  /**
   * How fast the floor scrolls toward the viewer (one grid cell per 2.4s / 1.2s / 0.6s).
   * The spotlights and the horizon wave keep their own tempo.
   */
  speed?: 'slow' | 'normal' | 'fast'   // default 'normal'
  /** Overlay content (hero copy, CTAs), centred in the sky above the horizon. */
  children?: ReactNode
}

export type RetroGridProps = RetroGridOwnProps & ComponentPropsWithoutRef<'div'>
```

- The root is a block `<div>` that fills its container's width (`w-full`) with a default
  `min-h-96`; size it with a `min-h-*` class (`min-h-[420px]`, `min-h-svh`), which merges last and
  replaces the default (an `h-*` below 384px alone can't undercut `min-h-96`). The horizon always
  sits at 62% of the height; content taller than the sky grows the whole grid and keeps that ratio.
- The root is an inline-size container (`@container`), so `children` can size type with `cqi`
  units or `@md:`-style container variants. Below 560px of width the grid cells shrink (72px →
  56px) and the spotlights move outward.
- It is a backdrop, not a landmark: wrap it in your own `<section>`/`<header>` or pass `role` and
  `aria-label` through the native props.

Deliberately **not** in v1: a configurable horizon height, cell size or color (the palette is the
approved Sukuna one, built from tokens), a `paused` prop (reduced motion covers the a11y need; the
custom `animate-*` utilities don't dedupe in tailwind-merge, so a freeze variant would be an
unresolved cascade fight, as with ShinyText `disabled`), separate tempos for the spotlights and the
wave, an `as` prop.

## 4. Variants → tokens

| Variant | Values → utility (on both floor planes) |
|---|---|
| speed | slow → `animate-retro-grid-scroll-slow` (2.4s/cell) · normal → `animate-retro-grid-scroll` (1.2s/cell) · fast → `animate-retro-grid-scroll-fast` (0.6s/cell) |

**No new color token.** Every color is a `color-mix()` of existing tokens, held in component-private
custom properties set by `retro-grid-stage` on the root:

| Property | Dark (default) | Light |
|---|---|---|
| `--sk-retro-grid-line` (crisp near lines) | `--sk-accent` 54% | same |
| `--sk-retro-grid-sub` (mid-cell depth grid) | `--sk-accent` 13% | same |
| `--sk-retro-grid-soft` (far-plane line glow) | `--sk-accent` 36% | `--sk-accent` 28% |
| `--sk-retro-grid-halo` (wave tail) | `--sk-accent` 20% | `--sk-accent` 11% |
| `--sk-retro-grid-beam` (spotlights) | `--sk-accent` 20% | `--sk-accent` 8% |
| `--sk-retro-grid-sky` (sky at the horizon) | `--sk-accent-deep` 38% in `--sk-bg` | `--sk-accent` 15% in `--sk-bg` |
| `--sk-retro-grid-ground` (floor fill) | `--sk-well` 65% in `--sk-bg` | same |
| `--sk-retro-grid-core` (hot line / wave crest) | `--sk-accent` 35% in `--sk-text` | `--sk-accent` |
| `--sk-retro-grid-vignette` (edge falloff) | `--sk-well` | `--sk-bg` |

Glow and horizon line use `--sk-accent` / `--sk-accent-glow` directly. Masks use plain alpha stops
(`black`, `transparent`, `rgb(0 0 0 / n%)`); only their alpha matters. Emitted into the generated `theme.css` from
`packages/ui/scripts/motion/retro-grid.ts` (`bun run tokens:build`), all with literal class names:

```css
/* 4 keyframes */
@keyframes sk-retro-grid-scroll {           /* floor: one cell toward the viewer, then loop */
  from { transform: rotateX(75deg) translate3d(0, 0, 0); }
  to   { transform: rotateX(75deg) translate3d(0, var(--sk-retro-grid-cell), 0); }
}
@keyframes sk-retro-grid-sweep {            /* the light wave the horizon emits */
  0%       { transform: rotateX(75deg) translate3d(0, -1300px, 0); opacity: 0; }
  12%      { opacity: 1; }
  58%      { transform: rotateX(75deg) translate3d(0, 40px, 0); opacity: 1; }
  64%, 100% { transform: rotateX(75deg) translate3d(0, 40px, 0); opacity: 0; }
}
@keyframes sk-retro-grid-beam { to { rotate: var(--sk-retro-grid-to); } }       /* spotlight sway */
@keyframes sk-retro-grid-emit { 0%, 60%, 100% { opacity: 0.78; } 7% { opacity: 1; } } /* flare */

@utility animate-retro-grid-scroll      { animation: sk-retro-grid-scroll 1.2s linear infinite; }
@utility animate-retro-grid-scroll-slow { animation: sk-retro-grid-scroll 2.4s linear infinite; }
@utility animate-retro-grid-scroll-fast { animation: sk-retro-grid-scroll 0.6s linear infinite; }
@utility animate-retro-grid-sweep { animation: sk-retro-grid-sweep 6s linear 1s infinite; }
@utility animate-retro-grid-emit  { animation: sk-retro-grid-emit 6s ease-out 1s infinite; }
@utility animate-retro-grid-beam {
  animation: sk-retro-grid-beam 9s ease-in-out var(--sk-retro-grid-delay, 0s) infinite alternate;
}
```

Paint utilities (no `bg-` prefix, so tailwind-merge never pairs them with `bg-<color>`):
`retro-grid-stage` (palette properties + light-scheme overrides + the sky→floor gradient),
`retro-grid-beam` (conic spotlight + fade mask), `retro-grid-floor` / `retro-grid-near` (perspective
150px, vanishing line on the horizon, depth masks), `retro-grid-plane` (soft wide lines, far plane),
`retro-grid-plane-near` (crisp lines + depth grid), `retro-grid-tilt` (the shared `rotateX(75deg)`),
`retro-grid-sweep`, `retro-grid-glow`, `retro-grid-line`, `retro-grid-vignette`. The exact CSS lives
in `scripts/motion/retro-grid.ts`.

## 5. States

| State | Behavior |
|---|---|
| default | floor scrolls one cell per 1.2s; spotlights sway (9s, alternate, right one offset 4s); every 6s the horizon flares and a light wave rolls toward the viewer. |
| `speed` slow / fast | floor at 2.4s / 0.6s per cell; everything else unchanged. |
| light theme (`data-theme="light"` on an ancestor or the root) | pale dawn sky, softer line glow and spotlights, crimson hot line, bone floor (deliberate, not an inversion). A dark region nested inside a light page stays dark. |
| container < 560px wide | cells shrink to 56px; spotlights move out to 18% / 82%. |
| prefers-reduced-motion | `motion-reduce:` stops the floor, spotlights and flare at their resting frame and removes the wave (`motion-reduce:hidden`): a still lit grid. |
| no children | a pure backdrop at the default `min-h-96`. |
| server / no-JS | identical (CSS only). |

## 6. Logic (`retro-grid.logic.tsx`)

- **No `'use client'`**: no hooks, no DOM access; the motion is CSS keyframes. Guarded by the RSC
  boundary test in `packages/ui/src/index.test.ts`.
- `forwardRef<HTMLDivElement, RetroGridProps>`; destructures `speed`, `className`, `children` so the
  variant never reaches the DOM; spreads the remaining native props on the root.
- Root carries `data-sk-retro-grid` (a stable hook for browser tests and consumer CSS).
- One `aria-hidden` scene wrapper holds every decorative layer; `children` render in the content
  slot after it (`relative z-10`), so they stack above the vignette.
- No `Math.random`/`Date.now`: the markup is deterministic, so it hydrates cleanly.

## 7. Styles (`retro-grid.styles.tsx`)

```ts
import { tv, type VariantProps } from '../../utils/tv'

export const retroGridStyles = tv({
  slots: {
    root: [
      'retro-grid-stage @container relative isolate grid w-full min-h-96 grid-rows-[62fr_38fr]',
      'overflow-hidden text-text',
    ],
    scene: 'pointer-events-none absolute inset-0',
    sky: 'absolute inset-x-0 top-0 bottom-[calc(100%-var(--sk-retro-grid-horizon))]',
    beam: [
      'retro-grid-beam absolute bottom-0 h-[120%] w-[520px] origin-bottom -translate-x-1/2',
      'rotate-(--sk-retro-grid-from) animate-retro-grid-beam motion-reduce:animate-none',
    ],
    beamLeft:
      'left-[28%] @max-[560px]:left-[18%] [--sk-retro-grid-from:-28deg] [--sk-retro-grid-to:12deg]',
    beamRight: [
      'left-[72%] @max-[560px]:left-[82%] [--sk-retro-grid-from:24deg] [--sk-retro-grid-to:-16deg]',
      '[--sk-retro-grid-delay:-4s]',
    ],
    floor: [
      'retro-grid-floor absolute inset-x-0 top-(--sk-retro-grid-horizon) bottom-0 overflow-hidden',
      '[--sk-retro-grid-cell:72px] @max-[560px]:[--sk-retro-grid-cell:56px]',
    ],
    plane: [
      'retro-grid-plane retro-grid-tilt absolute bottom-0 left-1/2 -ml-[3000px] h-[1500px] w-[6000px]',
      'motion-reduce:animate-none',
    ],
    near: 'retro-grid-near absolute inset-0',
    nearPlane: [
      'retro-grid-plane-near retro-grid-tilt absolute bottom-0 left-1/2 -ml-[3000px] w-[6000px]',
      'h-[calc(var(--sk-retro-grid-cell)*10)] motion-reduce:animate-none',
    ],
    sweep: [
      'retro-grid-sweep retro-grid-tilt absolute bottom-0 left-1/2 -ml-[3000px] h-[260px] w-[6000px]',
      'opacity-0 animate-retro-grid-sweep motion-reduce:hidden',
    ],
    horizon: 'absolute inset-x-0 top-(--sk-retro-grid-horizon) h-0',
    glow: [
      'retro-grid-glow absolute top-0 left-1/2 h-[200px] w-[130%] -translate-x-1/2 -translate-y-1/2',
      'opacity-78 animate-retro-grid-emit motion-reduce:animate-none',
    ],
    line: 'retro-grid-line absolute inset-x-0 -top-px h-0.5',
    vignette: 'retro-grid-vignette absolute inset-0',
    content: [
      'relative z-10 row-start-1 flex min-w-0 flex-col items-center justify-center',
      'px-4 pb-1.5 text-center',
    ],
  },
  variants: {
    // DECISION(open): speed tempos (§11)
    speed: {
      slow: {
        plane: 'animate-retro-grid-scroll-slow',
        nearPlane: 'animate-retro-grid-scroll-slow',
      },
      normal: { plane: 'animate-retro-grid-scroll', nearPlane: 'animate-retro-grid-scroll' },
      fast: {
        plane: 'animate-retro-grid-scroll-fast',
        nearPlane: 'animate-retro-grid-scroll-fast',
      },
    },
  },
  defaultVariants: { speed: 'normal' },
})
export type RetroGridStyleProps = VariantProps<typeof retroGridStyles>
```

Each animated slot carries exactly one custom `animate-*` class (the scroll one comes from the
`speed` variant), so tailwind-merge never has to dedupe two of them. `motion-reduce:` rules are
emitted in a later `@media` block, so they beat the bare `animate-*` at equal specificity. The
horizon height (62%) lives in `--sk-retro-grid-horizon` (set by `retro-grid-stage`); the root's
`62fr/38fr` rows mirror it.

## 8. Accessibility checklist

- [ ] Every decorative layer is inside one `aria-hidden` scene; only `children` are exposed.
- [ ] No semantics imposed: the root is a plain `<div>`; native `role`/`aria-*` pass through.
- [ ] `prefers-reduced-motion: reduce` stops all four loops (`motion-reduce:animate-none`) and
      removes the wave (`motion-reduce:hidden`); covered by `test/browser/retro-grid.test.ts`.
- [ ] Contrast at rest (measured on rendered pixels, 380px-tall hero): `text-text` clears 8:1
      everywhere in the sky in both themes. `text-text-dim` clears 4.5:1 only in the upper sky
      (5.2:1 about 75px above the horizon); inside the horizon glow it drops to 4.3:1 (dark, ~50px
      above) and 3.1:1 (right on the line). Set small secondary text there in `text-text/70` or
      stronger (6.3:1 dark, 5.7:1 light at ~50px), as the stories do.
- [ ] No flashing (WCAG 2.3.1): the only brightness change is the horizon flare, once per 6s
      (0.78 → 1 opacity over ~0.4s), far below 3 per second.
- [ ] `pointer-events-none` on the scene: the backdrop never steals clicks from `children`.

## 9. Tests

`retro-grid.test.tsx` (happy-dom + SSR helpers):

- Server render of each `speed`: a `<div data-sk-retro-grid>` with the children's real text.
- Each `speed` maps to its literal `animate-retro-grid-scroll*` utility on both planes; every
  animated slot carries its `motion-reduce:` guard (`animate-none`, or `hidden` for the wave), and
  no slot carries two custom `animate-*` classes.
- Decoration: exactly one `aria-hidden` scene holding both beams, both planes, the wave, glow, line
  and vignette; the content slot is outside it.
- `speed` never leaks to the DOM; native props (`id`, `data-testid`, `role`, `aria-label`, `style`)
  pass through; consumer `className` wins (`min-h-[480px]` replaces `min-h-96`).
- Forwards `ref` to the root `<div>`; renders with no children.
- `expectHydrates` without warnings; axe zero violations in both themes.

`test/browser/retro-grid.test.ts` (Playwright on Storybook; the story's Google Fonts request is
answered with an empty stylesheet so the spec never needs the network):

- motion: the hero renders with its copy above a horizon at 62% of the height; all six
  animations (`sk-retro-grid-beam` ×2, `-scroll` ×2, `-sweep`, `-emit`) are running; no console
  errors.
- `speed`: the Speeds story's planes run at `2.4s` / `1.2s` / `0.6s`.
- theming: the light frame resolves `--sk-retro-grid-core` to the light accent, the dark frame to
  the mix; re-parenting the light grid under a `data-theme="dark"` region restores the dark value.
- reduced motion: no animation at all; planes `animation-name: none` and resting on
  `rotateX(75deg)`; spotlights at `-28deg`; flare at `0.78`; the wave `display: none`; every story
  is a complete still frame; no console errors.

## 10. Stories

Title `Components/RetroGrid` (ids `components-retrogrid--<story>`):

- `Playground`: the approved ARENA hero (eyebrow, display title, date line) in a rounded stage card.
  The copy is story chrome.
- `LandingHero`: the grid behind a tournament landing page: top bar, hero copy and two `Button`s.
- `Speeds`: slow / normal / fast side by side.
- `Phone`: a 360px-wide card (container < 560px: smaller cells, spotlights moved out).
- `Backdrop`: no children, a plain backdrop.
- `Themes`: dark and light side by side (`parameters.sideBySide`), the review shot for the light
  palette.

Every story is a complete still frame under reduced motion (nothing waits for an animation); the
browser spec and the review screenshots run each one with `reducedMotion: 'reduce'` as well.

## 11. Decisions

- **Approved in Q38/Q39** (`docs/questions.md`): one of the nine CSS-only showpieces in
  `@sukunagg/ui`; the prototype (Sukuna FX Lab) is the visual target. Ported from the prototype,
  not copied from Magic UI (idea only).
- **Component = effect layer + `children` slot**; the ARENA copy, cards and nav are story chrome.
- **CSS-only, RSC-safe**, no `'use client'`. Paint and motion live in
  `packages/ui/scripts/motion/retro-grid.ts` (4 keyframes; 11 paint + 6 `animate-*` utilities,
  only emitted when used), layout in `retro-grid.styles.tsx`. No tailwind-merge registration is
  needed: no utility starts with `bg-`, and consumer `className` only reaches the root, which has
  no `animate-*` class.
- **Sizing by `min-h-*`.** The default `min-h-96` keeps an empty backdrop visible; the 62fr/38fr
  rows grow with tall content instead of letting it push the horizon off its 62% line.
- **One deliberate departure from the prototype (story chrome only):** the date line is
  `text-text/70`, not `text-text-dim`. The prototype's dim date measured 4.28:1 on the glow in
  dark (below AA for 14px text); 70% text reads nearly the same and measures 6.3:1.
- **Story chrome loads Archivo** (with its `wdth` axis) through a story decorator, because
  Storybook loads no web fonts and the approved hero is set in expanded Archivo. A global
  `.storybook/preview-head.html` font link would serve every display-font story; that is a shared
  file, left to the integrator.
- **`transform` on the 3D planes.** The floor is a `rotateX(75deg)` plane translated along its own
  axis; the standalone `translate` property applies in screen space before `rotate`, so the planes
  keep `transform` (still compositor-only). The spotlights animate `rotate`, the flare and wave
  `opacity`.
- **Idle decoration by design.** RetroGrid loops forever as a backdrop, which `docs/motion.md` rule
  5 ("no idle decoration") forbids for ordinary components; Q39 approved it as a showpiece. The
  integrator records the showpiece carve-out in `docs/motion.md`.
- `// DECISION(open): theme-aware palette via a light-scheme rule.` The light values are a nested
  rule in `retro-grid-stage`: `:where([data-theme='light']) &` (or the root itself), excluding a
  dark region nested inside a light one (exact for one nested region each way; a light region
  inside a dark region inside a light page resolves dark). The tokens give no scheme switch to
  derive the percentages from. Future built-in themes (`paper`, `midnight`) need adding to that selector, or
  a move to `light-dark()` once theme blocks set `color-scheme` (`docs/theming.md`).
- `// DECISION(open): speed tempos.` 2.4s / 1.2s / 0.6s per cell (the prototype's 1.2s, then ×2 and
  ×½, like ShinyText's speeds). The wave (6s), flare (6s) and spotlights (9s) keep the prototype's
  timing. Tunable as a patch pre-1.0.
- **Custom property names** follow `--sk-<component>-<thing>` (`--sk-retro-grid-*`). They are
  component-private, set on the root by `retro-grid-stage` (not tokens, not in `docs/tokens.md`).
  No `@property` is needed.
- **Mask stops use `black`/`transparent`/`rgb(0 0 0 / n%)`**: a mask reads only alpha, so these
  aren't colors (rule 8 is about painted color).
