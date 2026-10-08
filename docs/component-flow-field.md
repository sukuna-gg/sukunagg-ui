# Component: FlowField

> Follows the `docs/component-button.md` template. **Server component** in `@sukunagg/fx` (no
> directive) that renders a `'use client'` canvas island on the shared fx loop
> (`packages/fx/src/internal/loop.ts`). Approved in Q38/Q39 (showpieces & FX). Always-dark stage.

## 1. Purpose

A matchmaking-screen backdrop where crimson particles stream along a drifting noise field and swirl
around the content you centre on it. It is the "Searching for match…" screen, a queue or lobby
hero, a loading state that should feel alive. The queue UI itself (title, timer, Cancel button,
HUD) is yours: FlowField is the stage plus a `children` slot.

## 2. Files

```
packages/fx/src/components/flow-field/
├── flow-field.styles.tsx   # tv() slots root/stage/poster/canvas/glow/scrim. Pure, server-safe.
├── flow-field.logic.tsx    # forwardRef <div> root (data-sk-fx, data-theme="dark"), poster, scrim,
│                           # children; renders the island. NO 'use client', no hooks.
├── flow-field.canvas.tsx   # 'use client' — the island: two <canvas> (trails + 1/3-res glow) on
│                           # useFxCanvas; colors from tokens; the reduced-motion still frame
├── flow-field.sim.ts       # pure math: seeded gradient noise, curl flow, particles, trail buckets
├── flow-field.sim.test.ts
├── flow-field.test.tsx
├── flow-field.stories.tsx  # title 'FX/FlowField'
└── index.tsx               # export { FlowField } ; export type { FlowFieldProps }
packages/fx/src/styles/flow-field.css   # @utility flow-field-poster, flow-field-scrim (no keyframes)
test/browser/flow-field.test.ts         # Playwright: draws, pauses, still frame, no errors
```

## 3. API

```ts
import type { ComponentPropsWithoutRef } from 'react'

export interface FlowFieldProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * How many particles ride the field, scaled by the stage's area: 'medium' is 600 on the
   * approved 540 × 320 stage. Changing it never remounts the canvas.
   * @default 'medium'
   */
  density?: 'low' | 'medium' | 'high'
  /**
   * Calm the field to a slow, dim drift (the player is not queued). Toggling eases between the two
   * looks over about a second; under reduced motion the still frame is redrawn.
   * @default false
   */
  calm?: boolean
  /**
   * Hold the current frame, on top of the automatic pause off-screen and in hidden tabs.
   * @default false
   */
  paused?: boolean
}
// children: your overlay (queue UI, hero copy). Laid out as a centred flex column over the field.
```

- **Replay/restart**: there is nothing to replay; the field is continuous. Remount with `key` to
  restart it from its seeded opening.
- The root receives `data-state` from the loop (`running | paused | still | off`); it is absent
  in the server HTML. Style on it if you need to (`data-[state=still]:…`).

Deliberately **not** in v1: a `seed` prop (the seeded opening is tuned: other seeds can open in a
flat phase), color props (the palette is the Sukuna crimson set, read from tokens), pointer
interaction, a public `onState` callback (the loop already mirrors it on `data-state`).

## 4. Variants → tokens

| `density` | Particles on a 540 × 320 stage | Clamp (any size) |
|---|---|---|
| low | 300 | 80 – 900 |
| medium (default) | 600 | 160 – 1800 |
| high | 960 | 240 – 3000 |

The count scales with the stage's area and is clamped, so a full-screen stage stays affordable.

| Layer | Token | Use |
|---|---|---|
| Stage / trail fade | `--sk-well` | `bg-well`; the canvas fades its trails toward it every frame |
| Deep streams (32%) | `--sk-accent-deep` | additive strokes, 1.5 px |
| Mid streams (33%) | mix of `--sk-accent` and `--sk-accent-deep` | 1.25 px |
| Bright streams (30%) | `--sk-accent` | 1.05 px |
| Sparks (5%) | `--sk-premium` | 1.3 px |
| Children | `--sk-text`, `--sk-text-dim` | readable on the dark stage |

Each stream group is drawn at four alpha levels (0.2 / 0.42 / 0.68 / 0.92) by particle life and
distance from the centre (particles dim inside the centre ellipse, where the content sits). A
second canvas at one third resolution, blurred 6 px with `mix-blend-mode: screen`, is the glow.
Colors are read from the root's computed style (`cssColor`), so the canvas never holds a hex value;
the stage is pinned dark, so it reads the dark palette in both themes. **No new color token.**

CSS module (`packages/fx/src/styles/flow-field.css`), no keyframes, no `@property`:

```css
/* The server-rendered still (no-JS, first paint, no 2D context): long crimson arcs sweep in from
   two far-off centres, broken into streak bundles by spot masks, on a deep-crimson glow. */
@utility flow-field-poster {
  background:
    radial-gradient(ellipse 62% 74% at 24% 34%,
      color-mix(in oklab, var(--sk-accent-deep) 30%, transparent), transparent 72%),
    radial-gradient(ellipse 56% 70% at 80% 64%,
      color-mix(in oklab, var(--sk-accent-deep) 22%, transparent), transparent 72%),
    var(--sk-well);
  &::before, &::after { content: ""; position: absolute; inset: 0; }
  &::before {
    background: repeating-radial-gradient(circle at -6% 118%, transparent 0 5px,
      var(--sk-accent) 6px, transparent 7.5px 10px, var(--sk-accent-deep) 11px,
      transparent 12.5px 15px);
    opacity: 0.55;
    mask: /* three soft spots (top-left swirl), alpha only */ radial-gradient(…), …;
  }
  &::after { /* the mirror sweep from 112% -24%, deep first, opacity 0.5, bottom-right spots */ }
}
/* Darkens the centre behind the content, the bottom edge and the corners (the approved scrim). */
@utility flow-field-scrim {
  background:
    radial-gradient(ellipse 36% 34% at 50% 50%,
      color-mix(in oklab, var(--sk-well) 66%, transparent), transparent),
    linear-gradient(to top, color-mix(in oklab, var(--sk-well) 85%, transparent), transparent 24%),
    radial-gradient(ellipse 78% 90% at 50% 50%, transparent 52%,
      color-mix(in oklab, var(--sk-well) 85%, transparent));
}
```

The arcs use plain token stops dimmed by `opacity`, never `color-mix()`: Firefox renders
`color-mix()` stops inside *repeating* gradients as speckles. Masks read alpha only, so the opaque
`--sk-well` stands for "show". About 450 B of `dist/theme.css` (brotli).

The exact values live in the CSS module; this block is the spec. The poster and canvas crossfade
with the shared `group-data-[state=…]/fx:` strings from `packages/fx/BUILDERS.md` § 3.

## 5. States

| State | Behavior |
|---|---|
| server / no-JS | `flow-field-poster` (sweeping crimson arcs) under the scrim; children rendered; no `data-state` |
| `running` | canvas fades in over the poster (`duration-slow`); trails stream at the display rate |
| `calm` | energy eases to 0.22 (time constant ≈ 0.67 s): slower streams, longer fade, dimmer strokes |
| `paused` | off-screen, hidden tab or `paused`: the last frame holds, no frames are requested |
| `still` (`prefers-reduced-motion: reduce`) | one frame pre-advanced 120 steps from the seeded opening, repainted only on resize, a theme flip, or a `calm`/`density` change; no loop |
| `off` | no 2D context: the poster stays; nothing throws |
| resize | particles rescale to the new box, the trails are rebuilt (60 steps) in the same frame |

## 6. Logic (`flow-field.logic.tsx`)

- **No `'use client'`**: no hooks, no DOM access. It renders the root `<div>` with
  `data-sk-fx="flow-field"` (the loop finds the root by it; browser specs select it) and
  `data-theme="dark"`, then one `aria-hidden` stage layer (poster, the island, scrim) and
  `children`. Guarded by the RSC test in `packages/fx/src/index.test.ts`.
- `forwardRef<HTMLDivElement, FlowFieldProps>`; destructures `density`, `calm`, `paused`, so none
  reach the DOM; the rest spread onto the root.
- The island (`flow-field.canvas.tsx`, `'use client'`, `@internal`) receives only serializable
  props (`density`, `calm`, `paused`). It reads `density`/`calm` through a ref, so changing them
  never remounts the canvas.
- Renderer, created per mount inside `useFxCanvas` (fresh state under StrictMode):
  - `setup`: grabs the glow canvas's 2D context (the trails canvas is the loop's).
  - `theme`: reads `--sk-accent`, `--sk-accent-deep`, `--sk-premium`, `--sk-well` into 16 stroke
    styles (4 groups × 4 alphas) and the fade color.
  - `resize`: rescales the particles, sizes the glow canvas to a third, marks the trails stale.
  - `draw`: `still` → rebuild the seeded opening and pre-advance 120 steps; `dt = 0` → rebuild
    stale trails (60 steps) or hold; otherwise one step of `dt × 60` frames (≤ 3), then the glow.
  - Residue: WebKit rounds each small-alpha fade to the nearest level, so its trails stall about
    ten levels above black (a grey haze, worst when `calm`). On a black stage the renderer adds a
    `color-burn` fill of near-white every 4th step, which lowers dark pixels by about one level and
    leaves bright trails alone; every engine then fades to true black. Skipped when `--sk-well`
    isn't black (it would darken the stage below its token).
- Simulation (`flow-field.sim.ts`, pure): seeded gradient noise (mulberry32 permutation), a stream
  function of two drifting octaves whose curl is the velocity, plus a gentle vortex and outward
  push around the centre. Particles live 140–380 frames and respawn when they expire or leave.
  Segments are bucketed by color group × alpha so a frame is 16 strokes, not one per particle.
- Never `Math.random`, `Date.now` or `performance.now`: every scene is reproducible.

## 7. Styles (`flow-field.styles.tsx`)

```ts
import { tv } from '../../utils/tv'

export const flowFieldStyles = tv({
  slots: {
    root: 'group/fx relative isolate flex min-h-80 flex-col items-center justify-center overflow-hidden bg-well text-text',
    stage: 'pointer-events-none absolute inset-0 -z-10',
    poster: 'absolute inset-0 flow-field-poster transition-opacity duration-slow ease-sukuna motion-reduce:transition-none group-data-[state=running]/fx:opacity-0 group-data-[state=paused]/fx:opacity-0 group-data-[state=still]/fx:opacity-0',
    canvas: 'absolute inset-0 block size-full opacity-0 transition-opacity duration-slow ease-sukuna motion-reduce:transition-none group-data-[state=running]/fx:opacity-100 group-data-[state=paused]/fx:opacity-100 group-data-[state=still]/fx:opacity-100',
    glow: 'mix-blend-screen blur-[6px]', // + the canvas fade
    scrim: 'absolute inset-0 flow-field-scrim',
  },
})
```

## 8. Accessibility checklist

- [ ] The effect layers sit in one `aria-hidden` wrapper (not on the `<canvas>`, which Biome
      counts as focusable); `children` stay readable and focusable.
- [ ] Centred text stays legible: particles dim inside the centre ellipse and the scrim darkens it.
- [ ] `prefers-reduced-motion: reduce` draws one still frame and requests no frames; the poster
      covers no-JS. Information the app renders (a queue timer) is not affected.
- [ ] No flashing: strokes fade in and out over a particle's life (WCAG 2.3.1).
- [ ] Always dark: `--sk-text` on `--sk-well` passes 4.5:1 in both app themes.
- [ ] Announcements (match found, queue cancelled) are the app's job: its own `aria-live` region.

## 9. Tests

`flow-field.test.tsx` (happy-dom + `test/fx.ts` fakes) and `flow-field.sim.test.ts`:

- Server render: root with `data-sk-fx`, `data-theme="dark"`, the poster and children, no
  `data-state`; hydrates without warnings (reduced motion, effects flushed).
- happy-dom's null context: `data-state="off"`, nothing throws, the poster stays.
- With the fakes: paints the warm-up before the first frame; fades toward `--sk-well` and only
  adds the residue burn on a black stage; `paused` → `running` after
  `intersect(true)`; frames stroke and copy the glow; `still` under reduced motion with no pending
  frames; resize rebuilds; `density`/`calm` changes apply live (and redraw the still frame);
  `paused` holds; unmount leaves no pending frames.
- Forwards `ref`, merges `className`, passes native props, keeps own props off the DOM.
- axe: zero violations.
- Sim: noise is seeded and bounded, counts scale and clamp, energy eases, particles respawn,
  segments land in the 16 buckets, the fade stays in (0, 1].

`test/browser/flow-field.test.ts` (Playwright, 8 tests): the queue story renders and streams
(`data-state="running"`, rAF count rises, two `toDataURL()` differ, canvas faded in, poster faded
out); the stage stays dark in a light app; a hidden tab → `paused` with zero frames, then resumes;
Cancel (`calm`) keeps streaming on the same canvas; all three densities run; DPR 3 → a 2× trails
store and a third-size glow; reduced motion → `still`, zero frames, a drawn and unchanging canvas,
the queue timer still ticking; Cancel under reduced motion redraws the still frame. No console
errors anywhere.

## 10. Stories

`Playground` (controls: `density`, `calm`, `paused`), `MatchmakingQueue` (the approved mockup: a
pinging queue dot, "Searching for match…" with a live timer that keeps ticking under reduced
motion, a sweeping bar, Cancel ↔ Find match toggling `calm`, the region/ping HUD and corner
brackets — all story chrome), `Densities` (low, medium, high side by side). Ids:
`fx-flowfield--playground`, `fx-flowfield--matchmaking-queue`, `fx-flowfield--densities`.

## 11. Decisions

- Approved in **Q38/Q39** (`docs/questions.md`): FlowField ships in the opt-in `@sukunagg/fx`
  package, a Canvas2D field with its own noise and no dependencies; idea from Aceternity's Vortex,
  written from scratch (no code copied).
- **Always-dark stage** (build brief §6): the root pins `data-theme="dark"`, like VideoPlayer.
- **Component vs chrome** (brief §1): the queue UI, timer, HUD and corner brackets are story chrome.
  `calm` exists so that chrome can express the mockup's idle state.
- `// DECISION(open): FlowField stage color` — the mockup's `#050506` stage has no token; the stage
  and trail fade use `--sk-well` (`#000` in dark).
- `// DECISION(open): FlowField density clamps` — 'medium' matches the mockup (600 on 540 × 320);
  the area scaling and the clamps (80–3000) are agent-picked for full-screen use.
- `// DECISION(open): FlowField poster` — the server/no-JS still is a CSS sweeping-arc gradient
  (the mockup had no poster).
- The WebKit residue burn (§ 6) is agent-picked: measured on WebKit 2336, the calm field's dark
  pixels went from 9% to 88% true black, with no visible change in Chromium or Firefox.
- `calm` and `paused` were added to the sketched API (`density` + `children`): `calm` carries the
  mockup's idle look, `paused` is the shared loop's on-demand hold.
- The shared loop has no "repaint now" call for a prop change, so the island redraws its own still
  frame when `calm`/`density` change under reduced motion (it owns the canvas; the loop is idle).
- Story chrome uses `font-sans tabular-nums` where the mockup used JetBrains Mono (brief §7: no mono
  token), and Archivo only renders where the app loads it (Storybook falls back to the sans stack).
