# Component: ParticleField

> Follows the `docs/component-button.md` section template. **Server component** in `@sukunagg/fx`
> (Q38, Q39): it renders an always-dark stage with a CSS poster, and a small client island
> (`particle-field.canvas.tsx`, `'use client'`) draws the live embers on the shared fx loop.
> Builder guide: `packages/fx/BUILDERS.md`.

## 1. Purpose

An always-dark hero stage where crimson embers rise out of a glowing haze behind your overlay
content, for season launches, event banners, landing heroes and "play now" panels. The server
renders a CSS poster (the haze and a few still embers), so the first paint, no-JS visitors and
reduced-motion users get the finished look; on the client a Canvas 2D island lifts a few hundred
embers on the shared fx loop. The effect is pure decoration: it is hidden from assistive tech, and
your copy and calls to action stay ordinary DOM above it.

## 2. Files

```
packages/fx/src/components/particle-field/
├── particle-field.styles.tsx       # tv() slots (root, haze, embers, layer, canvas, scrim, content) + `tone`. Pure.
├── particle-field.logic.tsx        # forwardRef server component: always-dark root, CSS poster, island, children. No hooks.
├── particle-field.canvas.tsx       # 'use client' — <canvas> on useFxCanvas: ember sprites, draw glue, pointer parallax.
├── particle-field.sim.ts           # pure math: ember count, spawn/respawn, per-frame pose, sprite palettes. No DOM.
├── particle-field.sim.test.ts
├── particle-field.test.tsx
├── particle-field.stories.tsx      # title 'FX/ParticleField'; the hero chrome lives here, not in the component
└── index.tsx                       # export { ParticleField } ; export type { ParticleFieldProps }
packages/fx/src/styles/particle-field.css   # @keyframes sk-particle-field-haze + 5 @utility (§4)
test/browser/particle-field.test.ts         # Playwright: draws, pauses, reduced-motion still frame, no errors
```

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

interface ParticleFieldOwnProps {
  /** How many embers rise: 'low' ≈ ½, 'high' ≈ 1.6× the default count. Default 'medium'. */
  density?: 'low' | 'medium' | 'high'
  /** Ember palette: 'accent' = crimson embers, bone-white cores (default); 'premium' = amber/bone. */
  tone?: 'accent' | 'premium'
  /** Hold the current frame (e.g. while a dialog covers the hero). Default false. */
  paused?: boolean
  /** Overlay content (hero copy, calls to action), rendered above the effect. */
  children?: ReactNode
}

export type ParticleFieldProps = ParticleFieldOwnProps &
  Omit<ComponentPropsWithoutRef<'div'>, 'children'>
```

- The root is a `<div>` that pins `data-theme="dark"` (the stage is always dark, like the
  VideoPlayer chrome), so `text-text`, `text-text-dim` and every `--sk-*` token inside resolve to
  their dark values in both themes. The ref points at it; `className` merges last (give it a
  height and a radius: `className="h-96 rounded-lg"`); native props pass through.
- The shared loop owns `data-state` on the root (`running | paused | still | off`). Never pass one.
- Composition: the plume rises on the **end** side (right in LTR, left under `dir="rtl"`) and a
  scrim darkens the **start** side, so start-aligned overlay copy stays legible.
- Changing `tone` or `density` restarts the scene (the island is keyed on them); `paused` applies
  live.

Deliberately **not** in v1: a centred composition (plume position, scrim side), custom colors
(`tone` only; app colors are not passed in), a `seed` prop (every instance renders the same seeded
scene), a speed control, the mockup's 2% film-grain overlay, touch parallax.

## 4. Variants → tokens

| Part | Spec |
|---|---|
| stage (root) | `bg-well text-text`, `data-theme="dark"`, `isolate overflow-hidden` |
| haze (poster, always shown) | three radial gradients rising from the bottom edge: `--sk-particle-field-hot` 15% / 44% under the plume, `--sk-particle-field-deep` 62% across the floor; breathes (opacity .72 → 1, 90% → 100% tall) over 9 s, alternate |
| embers (poster) | eight still embers: bone cores (`--sk-premium` 35% into `--sk-text`) with `--sk-particle-field-hot` halos; fades out once the canvas has drawn |
| canvas | fades in over 1.6 s once the loop reports `running`, `paused` or `still` |
| scrim | vignette (`--sk-well` 80% at the edges) + start-side shade (`--sk-well` 78% → 34% → clear at 62%; 70% → 30% → clear below 500 px) + a 1 px horizon line in `--sk-particle-field-hot` with a `--sk-particle-field-glow` bloom |
| content | `relative h-full`, above every layer |

| `tone` | `--sk-particle-field-hot` | `--sk-particle-field-deep` | `--sk-particle-field-glow` | canvas ramp (burn-out → just lit → spark) |
|---|---|---|---|---|
| accent (default) | `--sk-accent` | `--sk-accent-deep` | `--sk-accent-glow` | `--sk-accent-deep` → `--sk-accent` → bone (`--sk-premium` lifted to white); sparks bone with a `--sk-premium`/`--sk-chart-4` halo |
| premium | `--sk-premium` 55% into `--sk-chart-4` (warm gold) | `--sk-chart-4` 55% into `--sk-well` | `--sk-premium` 45% | dark `--sk-chart-4` → `--sk-chart-4` → bone; sparks white with a `--sk-chart-4` halo |

Canvas colors are read from the root's computed style (`cssColor`) and turned into seven
pre-rendered glow sprites; nothing is hard-coded except the dark-token fallbacks `cssColor` needs.
No new color token. The plume side is `--sk-particle-field-s` (`1`, or `-1` under `rtl:`).

Embers: `density` scales an area-based count — 140 below 500 px wide, else
`140 + (w·h − 140 000) / 2333` clamped to 140–260 — by 0.5 / 1 / 1.6. About 8% are fast sparks
and 4% slow, swelling flares; the nearest are drawn large and out of focus. Each ember rises,
cools (bone → crimson → deep), dims and burns out at its own ceiling; 40% die low in the haze so
the plume visibly rises out of it. Pointer moves (mouse/pen) shift near embers up to 28 px for
parallax.

CSS (`packages/fx/src/styles/particle-field.css`, shipped in `@sukunagg/fx/theme.css`):

```css
@keyframes sk-particle-field-haze {
  from { opacity: 0.72; translate: 0 5%; scale: 1 0.9; }
}
@utility animate-particle-field-haze {
  animation: sk-particle-field-haze 9s ease-in-out infinite alternate;
  @media (prefers-reduced-motion: reduce) { animation: none; }
}
@utility particle-field-fade {
  transition: opacity 1.6s var(--sk-ease);
  @media (prefers-reduced-motion: reduce) { transition: none; }
}
@utility particle-field-haze { background: radial-gradient(…), radial-gradient(…), radial-gradient(…); }
@utility particle-field-embers { background: radial-gradient(circle 11px at …) /* ×8 */; }
@utility particle-field-scrim {
  container-type: inline-size;
  &::before { /* vignette + start-side shade; @container (max-width: 499px) widens it */ }
  &::after { /* 1px horizon line + glow */ }
}
```

One keyframe and five utilities. `animate-particle-field-haze` is registered with tailwind-merge
(`src/utils/tw-merge-config.ts`, key `particle-field-haze`), so it dedupes against other
`animate-*` classes like the built-in ones do.

## 5. States

| State | Behavior |
|---|---|
| server / no-JS / first paint | the CSS poster: haze (breathing) + eight still embers; empty transparent canvas; no `data-state` |
| `running` | canvas faded in, poster embers faded out; the loop draws every frame; the haze breathes |
| `paused` | off-screen, hidden tab, or `paused` prop: the last frame holds, no frames are requested, the haze animation pauses too |
| `still` (`prefers-reduced-motion: reduce`) | one seeded still frame of the full field, repainted only on resize; no haze animation, no fades; follows the OS setting live |
| `off` | no 2D context (or a hook threw): the poster stays as is |
| `tone="premium"` | amber/bone haze, poster and embers |
| `dir="rtl"` | plume, poster and scrim mirror |
| narrow (< 500 px) | 140 embers (× density), plume nearer the centre, wider start-side shade |

## 6. Logic (`particle-field.logic.tsx`)

- **No `'use client'`**, no hooks, no DOM access: a server component (guarded by the RSC test in
  `packages/fx/src/index.test.ts`). It renders the root, the poster layers, the island and
  `children`.
- `forwardRef<HTMLDivElement, ParticleFieldProps>`; destructures `density`, `tone`, `paused`,
  `className`, `children` so none leak to the DOM; native props spread before `data-sk-fx` and
  `data-theme`, which are pinned.
- Renders `<ParticleFieldCanvas key={`${tone}:${density}`} … />`: only serializable props cross
  the boundary.
- `particle-field.canvas.tsx` (`'use client'`): `useFxCanvas` mounts the renderer in an effect;
  `theme()` builds the sprite set from the tokens, `resize()` lays out the embers, `draw()` steps
  and paints them with `globalCompositeOperation = 'lighter'`. The text direction is read once at
  mount (`closest('[dir]')`). A second effect listens for `pointermove`/`pointerleave` on the root
  for parallax. Every random number comes from `mulberry32(0x5ea5007)`; nothing random runs
  during render.

## 7. Styles (`particle-field.styles.tsx`)

```ts
import { tv, type VariantProps } from '../../utils/tv'

export const particleFieldStyles = tv({
  slots: {
    root: 'group/fx relative isolate overflow-hidden bg-well text-text rtl:[--sk-particle-field-s:-1]',
    haze: 'pointer-events-none absolute inset-0 origin-bottom particle-field-haze animate-particle-field-haze group-data-[state=paused]/fx:[animation-play-state:paused]',
    embers: 'pointer-events-none absolute inset-0 particle-field-embers particle-field-fade group-data-[state=running]/fx:opacity-0 group-data-[state=paused]/fx:opacity-0 group-data-[state=still]/fx:opacity-0',
    layer: 'pointer-events-none absolute inset-0',
    canvas: 'block size-full opacity-0 particle-field-fade group-data-[state=running]/fx:opacity-100 group-data-[state=paused]/fx:opacity-100 group-data-[state=still]/fx:opacity-100',
    scrim: 'pointer-events-none absolute inset-0 particle-field-scrim',
    content: 'relative h-full',
  },
  variants: {
    tone: {
      accent: { root: '[--sk-particle-field-hot:var(--sk-accent)] [--sk-particle-field-deep:var(--sk-accent-deep)] [--sk-particle-field-glow:var(--sk-accent-glow)]' },
      premium: { root: '[--sk-particle-field-hot:color-mix(in_oklab,var(--sk-premium)_55%,var(--sk-chart-4))] [--sk-particle-field-deep:color-mix(in_srgb,var(--sk-chart-4)_55%,var(--sk-well))] [--sk-particle-field-glow:color-mix(in_srgb,var(--sk-premium)_45%,transparent)]' },
    },
  },
  defaultVariants: { tone: 'accent' },
})
```

The crossfade keeps the BUILDERS.md `group-data-[state=…]/fx:` strings and swaps
`transition-opacity duration-slow ease-sukuna motion-reduce:transition-none` for
`particle-field-fade` (the mockup's 1.6 s bloom; reduced motion = instant).

## 8. Accessibility checklist

- [ ] Every effect layer (haze, poster embers, canvas wrapper, scrim) is `aria-hidden`; the canvas
      sits inside an `aria-hidden` wrapper (not on the `<canvas>` itself).
- [ ] `children` stay ordinary DOM: headings, links and buttons keep their roles and tab order.
- [ ] Contrast at rest: overlay text on the start side sits on ≥ 78% `--sk-well` shade; `text-text`
      and `text-text-dim` meet 4.5:1 against the dark stage in both page themes (the stage pins
      `data-theme="dark"`).
- [ ] Reduced motion: one still frame, no haze loop, no fades; follows the OS setting live.
- [ ] WCAG 2.3.1: no flashing. Embers twinkle at ≤ 1.2 Hz with ≤ 16% amplitude; nothing strobes.
- [ ] WCAG 2.2.2 (pause, stop, hide): decorative motion pauses off-screen and in hidden tabs, and
      apps can stop it with `paused`.
- [ ] Pointer parallax is decoration only; nothing depends on it.

## 9. Tests

`particle-field.test.tsx` (happy-dom + `test/fx.ts`):

- Server render: the always-dark root (`data-sk-fx="particle-field"`, `data-theme="dark"`), the
  poster layers, an empty canvas, the children; no `data-state`; both tones.
- `tone` maps to its literal token classes; `density`/`tone`/`paused` don't leak as attributes;
  native props pass through; consumer `className` wins; ref forwards; no content wrapper without
  children.
- Hydrates without warnings (reduced motion + `flushEffects`).
- happy-dom's null context → `data-state="off"`, nothing throws.
- With the fake env: `paused` → `running` after `intersect(true)`; frames draw sprites
  (`drawImage`); reduced motion → `still`, no pending frames, a drawn still frame; the `paused`
  prop holds and resumes; a hidden tab pauses; unmount leaves no pending frames.
- Pointer parallax moves the near embers (mouse), ignores touch, recentres on leave.
- `dir="rtl"` mirrors the plume; changing `tone`/`density` remounts the canvas.
- axe in both page themes.

`particle-field.sim.test.ts`: ember count per density and size, plume placement (LTR/RTL, in
bounds), spawn vs respawn, stepping and burn-out, pose (blur, spark, flare, crossfade, faint
skip), both palettes and the sprite stops, `mix`/`lum`.

`test/browser/particle-field.test.ts` (Playwright on Storybook): the story renders and draws
(`running`, rAF count > 0, two `toDataURL()` differ, canvas faded in, poster embers faded out,
haze animating), pauses in a hidden tab (no frames, haze paused) and resumes, stays dark under
the light theme, mirrors under `dir="rtl"` and widens the shade on the narrow story, reduced
motion → `still` with 0 frames, a non-blank canvas and no haze animation; no console errors.

## 10. Stories

`FX/ParticleField`: `Playground` (the "Crimson Ascent" season hero; controls for `density`, `tone`,
`paused`), `Tones` (accent and premium heroes), `Densities` (`low`, `medium`, `high`, no copy),
`Narrow` (a 360 px phone card), `RightToLeft` (`dir="rtl"`). Ids: `fx-particlefield--playground`,
`--tones`, `--densities`, `--narrow`, `--right-to-left`. The hero copy, CTA and labels are story
chrome built from `@sukunagg/ui`'s `Button` and plain utilities.

## 11. Decisions

- Approved as one of the five `@sukunagg/fx` effects: Q38 (scout, two tiers) and Q39 (build all
  14; fx package approved). Mockup: `fx-mockups/parts/particle-field.html` (Sukuna FX Lab).
- Always-dark stage via `data-theme="dark"` (build brief §6); stage color `bg-well` instead of the
  mockup's page-only `#050506`.
- `DECISION(open)`: fixed composition — plume on the end side, scrim on the start side, mirrored
  under `dir="rtl"`; no alignment prop in v1.
- `DECISION(open)`: `tone="premium"` palette (amber/bone) is built from `--sk-premium` and
  `--sk-chart-4`; no new token.
- `DECISION(open)`: density multipliers 0.5 / 1 / 1.6 over the mockup's area-scaled count.
- `DECISION(open)`: the 1.6 s poster→canvas crossfade is a literal in `particle-field-fade` (the
  `sk-shine` precedent), not a new `--sk-duration-*` token.
- `DECISION(open)`: one fixed seed (`0x5ea5007`, the mockup's): every instance renders the same
  scene; no `seed` prop.
- The mockup's 2% SVG film grain is omitted (barely visible, and an SVG filter needs a unique id,
  which a server component can't mint without `useId`).
- Parallax listens to mouse and pen only (a touch drag scrolls the page).
- Storybook does not load Archivo, so the story title falls back to the sans stack there; the
  showcase loads it.
