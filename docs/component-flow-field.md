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
test/browser/flow-field.test.ts         # Playwright: draws, pauses, live motion switch, resize
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
- **Layout**: the root is a centred flex column with a 320px floor (`min-h-80`). Size it with
  `className`: `h-dvh` for a full-screen queue, `aspect-video min-h-0` for a hero. Any stage
  shorter than 320px needs `min-h-0` too (`h-56 min-h-0`), or the floor wins silently.

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
| `still` (`prefers-reduced-motion: reduce`) | one frame pre-advanced 120 frames (2 s) from the seeded opening, repainted only after a resize, new token colors, or a `calm`/`density` change; no loop. Asked for the same still frame again (an OS light/dark flip, which leaves this always-dark stage's tokens alone, or a visibility re-check), it does nothing |
| `off` | no 2D context: the poster stays; nothing throws |
| resize, running or paused | particles rescale to the new box and the painted trails are scaled onto the new store: no re-simulation, no jump forward in time |
| resize, `still` | the old still frame is scaled at once; the still frame is rebuilt at the new size 150 ms after the last resize |

**Cost.** Each frame fades the whole trails store and strokes it additively, so the frame cost
follows the store's pixels: the trails keep a 1x store on any display (`maxDpr: 1`). The
synchronous rebuilds (the warm-up on first paint, a still frame) are capped at the approved
stage's work, 600 particles × 60 or 120 steps: a bigger field covers the same time in fewer,
longer steps (`rebuildSteps`). A resize rescales the painted trails (no simulation), and a still
frame is rebuilt once, 150 ms after the last resize.

Measured in headless Chromium on a GPU (RX 9070 XT, D3D11), before → after this design:

| Case | Before (2x store, re-simulated) | After |
|---|---|---|
| Frame rate, 1872 × 1032 at DPR 2, uncapped: 'medium' / 'high' | 188 / 93 fps | 265 / 215 fps (as at DPR 1) |
| Still frame at mount, 1920 × 1080 'high' (3000 particles) | 69–93 ms | about 20 ms |
| Warm-up at mount, same stage | 49–68 ms | about 10 ms |
| Each step of a resize drag, reduced motion | 71–94 ms | nothing; one 18–26 ms rebuild after it settles |
| Each step of a resize drag, running | a 60-step warm-up | nothing over 8 ms (a scaled copy) |
| Live switch to reduced motion | 118 ms | one 21 ms rebuild, then 0 frames |

Under software raster (SwiftShader, 1280 × 720 'high'), resize steps cost nothing either way, and
the one still rebuild (at mount, after a resize settles, on a live switch) takes 115–190 ms. On a
phone CPU, expect a single rebuild of that order when reduced motion is on.

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
  - `useFxCanvas` with `maxDpr: 1`: the trails store stays 1x on a 2x or 3x display (§ 5 Cost).
    The trails are soft and the glow is a third of the size anyway; on a 1x display, where the
    mockup was approved, nothing changes.
  - `setup`: grabs the glow canvas's 2D context (the trails canvas is the loop's) and observes the
    trails canvas with its own `ResizeObserver`. `setup` runs before the loop creates its observer,
    and observers are notified in creation order, so this one copies the painted trails to a
    scratch canvas just before the loop resizes (and so blanks) the store.
  - `theme`: reads `--sk-accent`, `--sk-accent-deep`, `--sk-premium`, `--sk-well` into 16 stroke
    styles (4 groups × 4 alphas) and the fade color. The colors are part of the still frame's
    key, so a still frame is redrawn only when they change: an OS light/dark flip leaves this
    always-dark stage's tokens, and its still frame, alone.
  - `resize`: rescales the particles and sizes the glow canvas to a third. With a copy of the old
    trails, scales it onto the new store and releases it; a still frame is then rebuilt 150 ms
    after the last resize. Without one (the first paint), marks the trails stale.
  - `draw`: `still` → rebuild the seeded opening pre-advanced 120 frames, unless the canvas
    already holds that still frame for this size, these props and these colors (then nothing: the
    still frame is idempotent, so a loop that keeps asking for it costs no work); `dt = 0` →
    warm up stale trails (60 frames) or hold; otherwise one step of `dt × 60` frames (≤ 3), then
    the glow.
  - Rebuilds (`rebuildSteps` in the sim): one step per frame up to the approved stage's 600
    particles, fewer and longer steps above (1800 particles: 40 steps of 3 frames for the still
    frame), so the trails look the same and a rebuild never costs more than on the approved stage.
  - Fade cadence: canvas colors are 8-bit, so a fade too faint to move a dark pixel by half a level
    rounds to nothing and trail tails stall above black, higher the fainter the fade. The renderer
    accumulates the fades and fills the stage once at least 0.75 of a 60 Hz frame is due: a 165 Hz
    display fades (and stalls) like 60 Hz instead of leaving a grey haze, and fills the store a
    third as often.
  - Residue: even at 60 Hz, WebKit's trails stall about ten levels above black (a grey haze, worst
    when `calm`). On a black stage the renderer adds a `color-burn` fill of near-white every 4
    elapsed 60 Hz frames (counted in time, not steps, so trail length doesn't depend on the refresh
    rate; at most one per step, so a rebuild's longer steps leave no backlog), which lowers dark
    pixels by about one level and leaves bright trails alone; every engine
    then fades to true black. Skipped when `--sk-well` isn't black (it would darken the stage
    below its token).
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
    glow: 'absolute inset-0 block size-full opacity-0 mix-blend-screen blur-[6px] transition-opacity duration-slow ease-sukuna motion-reduce:transition-none group-data-[state=running]/fx:opacity-100 group-data-[state=paused]/fx:opacity-100 group-data-[state=still]/fx:opacity-100',
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
  frames; a resize scales a copy of the old trails (no fills) and keeps streaming at the new size;
  under reduced motion it holds the scaled frame and rebuilds once, 150 ms after the last resize
  (fewer, longer steps for a large field); a still frame asked for again (an OS light/dark flip
  that changes no token, a visibility re-check) costs nothing, and new token colors redraw it
  once; fades run at most once per 60 Hz frame and burns every 4 frames at 165, 60 and
  20 Hz; a 1x trails store at DPR 3; `density`/`calm` changes apply live (and redraw the still
  frame); `paused` holds; StrictMode mounts once (one pending frame, none after unmount, the
  still frame redrawn on a `calm` change); unmount leaves no pending frames.
- Forwards `ref`, merges `className`, passes native props, keeps own props off the DOM.
- axe: zero violations.
- Sim: noise is seeded and bounded, counts scale and clamp, rebuild steps stay within the
  approved stage's particle-step budget, energy eases, particles respawn, segments land in the 16
  buckets, the fade stays in (0, 1].

`test/browser/flow-field.test.ts` (Playwright, 12 tests): the queue story renders and streams
(`data-state="running"`, rAF count rises, two `toDataURL()` differ, canvas faded in, poster faded
out); the stage stays dark in a light app; a hidden tab → `paused` with zero frames, then resumes;
scrolled off-screen → `paused` with zero frames, then resumes in view; reduced motion switched
live after load (`emulateMedia`) → `still` with zero frames and an unchanging canvas, then back to
`running`, and the same both ways from a reduced-motion load; Cancel (`calm`) keeps streaming on
the same canvas; all three densities run; DPR 3 → a 1× trails store and a third-size glow; reduced
motion → `still`, zero frames, a drawn and unchanging canvas, the queue timer still ticking; a
resize under reduced motion shows the scaled frame at once, then the rebuilt still frame, with zero
frames; Cancel under reduced motion redraws the still frame. No console errors anywhere. "The loop
ticks" means more than 2 rAF calls in 300 ms: headless WebKit can run this stage at about 10 fps.

## 10. Stories

`Playground` (controls: `density`, `calm`, `paused`), `MatchmakingQueue` (the approved mockup: a
pinging queue dot, "Searching for match…" with a live timer that keeps ticking under reduced
motion, a sweeping bar, Cancel ↔ Find match toggling `calm`, the region/ping HUD and corner
brackets — all story chrome), `Densities` (low, medium, high side by side on 224px stages,
`h-56 min-h-0`). Ids:
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
- **1x trails store** (`maxDpr: 1`, agent-picked after review): the per-frame fade and additive
  strokes are fill-rate bound, so a full-screen field on a 2x display ran at 31–35 fps in review
  (a 165 Hz display) with the default 2x cap. A 1x store costs what a 1x display does (§ 5 Cost:
  'high' draws about 2.3x faster, 'medium' 1.4x); on a 2x display the trails are slightly
  softer, and on a 1x display (where the mockup was approved) nothing changes.
- **Resize without re-simulating** (from the approved mockup): the old trails are scaled onto the
  new store, and the reduced-motion still frame is rebuilt 150 ms after the last resize. Copying
  the trails before the loop blanks the store relies on `ResizeObserver` notifying observers in
  creation order (the spec's order, in all three engines); if the copy ever misses, the field
  warms up again instead, which is only slower.
- **Rebuild budget** (agent-picked): warm-up and still frame cost at most the approved stage's
  600 particles × 60 / 120 steps; larger fields take fewer, longer steps over the same time.
- **Fade cadence and burn in time, not steps** (after review): at 165 Hz, Chromium's calm field
  measured 63% true-black pixels with a time-based burn alone (89% at 60 Hz); accumulating the
  fades to a 60 Hz cadence brought it to 76%, and the running look at 165 Hz matches 60 Hz.
- Story chrome uses `font-sans tabular-nums` where the mockup used JetBrains Mono (brief §7: no mono
  token), and Archivo only renders where the app loads it (Storybook falls back to the sans stack).
