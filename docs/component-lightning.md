# Component: Lightning

> Follows the `docs/component-button.md` template. **Server component** in `@sukunagg/fx`
> (Q38/Q39): the root, the SVG poster and `children` render on the server with no hooks; the
> WebGL bolt is a `'use client'` island (`lightning.webgl.tsx`) on the shared fx loop
> (`packages/fx/src/internal/loop.ts`). Always-dark stage. Builder guide: `packages/fx/BUILDERS.md`.

## 1. Purpose

A crackling crimson lightning bolt behind a hero banner, drawn by one WebGL shader over a
server-rendered SVG poster. It is the backdrop for a live-match or Grand Final splash: the bolt
strikes, flickers and re-routes on its own, while the banner content (`children`) stays real,
readable DOM on top. No-JS users, the first paint and browsers without WebGL see the poster (the
same bolt, frozen); reduced motion gets that frozen bolt from the shader as one still frame.

## 2. Files

```
packages/fx/src/components/lightning/
├── lightning.styles.tsx      # tv() slots: root, stage, poster, glow/bolt SVG layers, canvas. Pure. Server-safe.
├── lightning.logic.tsx       # forwardRef server component: always-dark root, SVG poster, children,
│                             # renders the island. NO 'use client', no hooks.
├── lightning.webgl.tsx       # 'use client' — <canvas> + useFxCanvas (WebGL1, shared loop). @internal
├── lightning.renderer.ts     # WebGL renderer: program, uniforms, token colors, draw, dispose + context release
├── lightning.shaders.ts      # GLSL (vertex + fragment) as TS strings (tsup has no .glsl loader)
├── lightning.storm.ts        # pure strike scheduler + flash envelopes (≤ 3 flashes/s, WCAG 2.3.1)
├── lightning.storm.test.ts   # scheduler: flash-rate ceiling per intensity, still frame, re-routing
├── lightning.test.tsx        # component + renderer (fake WebGL from test/fx.ts)
├── lightning.stories.tsx     # FX/Lightning — banner chrome lives here, not in the component
└── index.tsx                 # export { Lightning } ; export type { LightningProps }
packages/fx/src/styles/lightning.css   # @utility lightning-glow (the poster's radial sky glow)
test/browser/lightning.test.ts         # Playwright: runs, still under reduced motion, context loss → poster
```

## 3. API

```ts
import type { ComponentPropsWithoutRef } from 'react'

interface LightningOwnProps {
  intensity?: 'calm' | 'normal' | 'storm' // default 'normal' — strike cadence + brightness, live
  position?: number                        // 0–1 across the width; default responsive (see below)
  paused?: boolean                         // hold the current frame; default false, live
}

export type LightningProps = LightningOwnProps & ComponentPropsWithoutRef<'div'>
// children = the overlay (banner copy, CTAs). They render above the effect, in normal flow, so
// they also give the root its height (or size it with className, e.g. `h-96`).
```

- **`intensity`** changes apply on the next strike, without remounting the WebGL context.
- **`position`** is clamped to 0–1 and set as `--sk-lightning-x` on the stage. Omitted, the bolt sits
  at **0.66**, moving to **0.8** when the effect is narrower than 720 px (a container query on the
  root), as in the approved mockup. Changing it remounts the island (a fresh canvas), so the still
  and paused frames pick it up too.
- **`paused`** is the hook for a WCAG 2.2.2 pause control; reduced motion stops the loop on its own.
- Replay is not a concept here (the bolt loops); the root is a `@container`, so overlay chrome can
  use `@max-[720px]:` variants against the effect's own width.

Deliberately **not** in v1: measuring the overlay to keep the bolt clear of the title (the mockup's
`tight` mode; `position` covers it), a color prop (always the crimson brand bolt, Q38), a seed prop
(the scene is seeded and identical everywhere), a built-in scrim (legibility depends on where the
copy sits, so it is consumer chrome; see the `GrandFinal` story), sound, and pointer interaction.

## 4. Variants → tokens

| Prop | Value → behavior |
|---|---|
| intensity | `calm`: strikes 2.6–5.0 s apart, softer flash, fewer branches · `normal`: 1.2–2.7 s (the mockup) · `storm`: 1.0–1.7 s, brighter, more branches |
| position | inline `--sk-lightning-x` on the stage; default class `[--sk-lightning-x:0.66] @max-[720px]:[--sk-lightning-x:0.8]` |

Colors (always dark, `data-theme="dark"` pinned on the root, like VideoPlayer):

| Layer | Token |
|---|---|
| stage (root background, shader `BG`) | `--sk-bg` (`bg-bg`) |
| overlay text (inherited) | `--sk-text` (`text-text`) |
| bolt glow, flash, haze (shader `C1`) | `--sk-accent` |
| sky glow at the top, deep haze (shader `C2`, poster `lightning-glow`) | `--sk-accent-deep` |
| white-hot core (shader `C0`, poster bolt) | `--sk-text` (poster: `color-mix(--sk-text 90%, --sk-accent)`) |

The renderer reads the tokens from the root's computed style (`cssColor`), so a re-themed
`--sk-accent` re-colors the shader too. One utility in `packages/fx/src/styles/lightning.css`, no
keyframes, no `@property`:

```css
@utility lightning-glow {
  background-image: radial-gradient(42% 70% at calc(var(--sk-lightning-x, 0.66) * 100% + 3%) 0%,
    color-mix(in srgb, var(--sk-accent-deep) 34%, transparent), transparent 72%);
}
```

No new color token. The canvas crossfade uses the BUILDERS strings (`duration-slow`, `ease-sukuna`).

## 5. States

The loop owns `data-state` on the root (absent on the server).

| State | Rendering |
|---|---|
| server / no-JS | The SVG poster: a radial crimson sky glow plus the bolt traced from the shader's frozen route (glow layer + hot core). `children` on top. |
| `running` | The canvas has faded in over the poster (opaque, same route on its first frame). Strikes: a hard flash then a 150 ms echo; the route crawls and re-routes on every later strike; a branch forks off on most strikes. |
| `paused` | Off-screen, hidden tab or `paused`: the last frame holds, no rAF. |
| `still` (`prefers-reduced-motion: reduce`) | One still frame of the frozen route (lit branch, no flash), repainted only on resize. Follows the OS setting live. |
| `lost` | WebGL context lost: the canvas fades out, the poster shows; `webglcontextrestored` rebuilds the program and resumes. |
| `off` | No WebGL (or the shader failed to link): the poster stays. Never throws. |

## 6. Logic (`lightning.logic.tsx`)

- **No `'use client'`**, no hooks: renders `<div data-sk-fx="lightning" data-theme="dark">`, an
  `aria-hidden` stage (poster SVGs + the island) at `-z-10` inside the `isolate` root, then
  `children` in normal flow.
- `forwardRef<HTMLDivElement, LightningProps>`; destructures `intensity`, `position`, `paused`,
  `className`, `children`; native props spread before the pinned `data-sk-fx`/`data-theme`.
- The island (`lightning.webgl.tsx`, `'use client'`) gets serializable props only (`intensity`,
  `paused`, `className`) and `key` = the clamped position, so a new position remounts it.
- The island calls `useFxCanvas(createLightningRenderer, { context: 'webgl', maxDpr: 1.5, … })`
  with `alpha: false`, `preserveDrawingBuffer: true` (the still frame must survive re-composites in
  WebKit) and `powerPreference: 'low-power'`. Intensity is read through a ref (no remount).
- The renderer (`lightning.renderer.ts`) compiles one fragment shader on a full-screen triangle,
  reads `--sk-lightning-x` from the canvas's computed style on resize, the colors on theme, and
  drives the uniforms from `lightning.storm.ts`. `dispose` deletes the program and buffer and, once
  the canvas has really left the page (not a StrictMode remount), releases the context with
  `WEBGL_lose_context`.
- Nothing touches `window`/`document` outside effects; the scene is seeded (`mulberry32`), never
  `Math.random`.

## 7. Styles (`lightning.styles.tsx`)

```ts
export const lightningStyles = tv({
  slots: {
    root: 'group/fx @container relative isolate overflow-hidden bg-bg text-text',
    stage: 'pointer-events-none absolute inset-0 -z-10 [--sk-lightning-x:0.66] @max-[720px]:[--sk-lightning-x:0.8]',
    poster: 'absolute inset-0 lightning-glow',
    glow: [
      'absolute top-0 left-[calc(var(--sk-lightning-x)*100%)] h-full w-auto aspect-square -translate-x-1/2',
      'overflow-visible fill-none [stroke-linecap:round] [stroke-linejoin:round]',
      'stroke-accent [stroke-width:12] opacity-80 blur-[2px] drop-shadow-[0_0_5px_var(--sk-accent),0_0_12px_var(--sk-accent)]',
    ],
    glowBranch: '[stroke-width:7.2]',
    bolt: [
      'absolute top-0 left-[calc(var(--sk-lightning-x)*100%)] h-full w-auto aspect-square -translate-x-1/2',
      'overflow-visible fill-none [stroke-linecap:round] [stroke-linejoin:round]',
      'stroke-[color-mix(in_srgb,var(--sk-text)_90%,var(--sk-accent))] [stroke-width:4]',
    ],
    boltBranch: '[stroke-width:2.4]',
    canvas: 'absolute inset-0 block size-full opacity-0 transition-opacity duration-slow ease-sukuna motion-reduce:transition-none group-data-[state=running]/fx:opacity-100 group-data-[state=paused]/fx:opacity-100 group-data-[state=still]/fx:opacity-100',
  },
})
```

Stroke widths are SVG user units (the viewBox is 1000 units tall), so the poster bolt scales with
the banner's height. The poster is two HTML-level `<svg>` layers (glow, hot core) sharing one
route, blurred with CSS `filter` rather than an id-referenced SVG `<filter>`: a server component
can't mint unique ids (`useId` is a hook), and duplicate ids across two instances are fragile. The
canvas is opaque, so the poster underneath never needs fading.

## 8. Accessibility checklist

- [ ] The stage (poster SVGs + canvas wrapper) is `aria-hidden`; `pointer-events: none`; nothing
      focusable. `children` stay real DOM text, read in order.
- [ ] **WCAG 2.3.1 (three flashes):** every strike is one hard flash plus one echo 150 ms later, and
      strikes are scheduled at least 1.0 s apart (`storm`; 1.2 s `normal`, 2.6 s `calm`), so no
      one-second window holds more than three flashes. The flicker between strikes is a ±5 %
      luminance wobble, under the flash threshold. Asserted by simulation in `lightning.storm.test.ts`.
- [ ] **Reduced motion:** one still frame, no rAF (asserted in unit and browser tests); the poster
      is the same frozen bolt for no-JS/no-WebGL.
- [ ] **WCAG 2.2.2 (pause):** the loop pauses off-screen and in hidden tabs; `paused` lets the app
      offer a pause control when the banner sits beside content people read.
- [ ] Contrast: the stage is always dark (`data-theme="dark"`); overlay copy inherits `text-text`
      (#F4F1EC on #0A0A0B, 17:1). Keep copy off the bolt (`position`) or add a scrim, as the
      `GrandFinal` story does.
- [ ] axe: zero violations (unit test, both page themes).

## 9. Tests

`lightning.test.tsx` (happy-dom + `test/fx.ts` fakes) and `lightning.storm.test.ts`:

- Server render: root `data-sk-fx="lightning"`, pinned `data-theme="dark"`, no `data-state`, both
  poster SVGs with the trunk and branch routes, `children` in the HTML; hydrates without warnings.
- `position` → `--sk-lightning-x` on the stage, clamped to 0–1; omitted → no inline style.
- Ref forwards; `className` merges (consumer `bg-well` replaces `bg-bg`); native props pass through;
  `data-theme` can't be overridden.
- happy-dom's null context: `data-state="off"`, nothing throws, unmount is clean.
- Fake WebGL: program links, the full-screen triangle draws (`drawArrays`), uniforms carry the token
  colors and the position; `paused` → `running` on `intersect(true)`; frames advance the storm;
  `still` under reduced motion with no pending frames; `paused` prop holds; unmount leaves no frames
  and releases the context once the canvas is detached.
- Context loss → `lost`, restore → rebuilt program, running again; link failure → `off`.
- `intensity` change keeps the same canvas; `position` change mounts a new one.
- Storm: frozen still state; the first strike keeps the poster's route, later ones re-route; `dt = 0`
  repaints without advancing; at most 3 flashes in any 1 s window for every intensity over
  10 simulated minutes; noise time wraps.
- axe in both page themes.

Browser (`test/browser/lightning.test.ts`): the story renders and runs (`running`, rAF > 0, two
canvas reads differ), reduced motion → `still` + 0 frames, hidden tab → `paused`, context loss →
`lost` with the poster back and restore → `running`, no WebGL → `off` with the poster, no console
errors.

## 10. Stories

`FX/Lightning`: `Playground` (controls, Grand Final banner chrome), `GrandFinal` (the approved
mockup banner: Live pill, title, teams, map; scrim in the story), `Intensities` (calm / normal /
storm side by side), `Narrow` (360 px card: the bolt moves to 0.8, copy drops to the bottom).
Ids: `fx-lightning--playground`, `fx-lightning--grand-final`, `fx-lightning--intensities`,
`fx-lightning--narrow`. The banner chrome (pill, title, meta, scrim) lives only in the stories.

## 11. Decisions

- Approved as one of the five `@sukunagg/fx` effects in **Q38/Q39** (`docs/questions.md`): idea
  from React Bits Lightning (MIT + Commons Clause), so the idea only; the shader and poster are the
  from-scratch mockup's, ported.
- Always-dark stage per the build brief: `data-theme="dark"` pinned on the root; stage `bg-bg`
  (the mockup's page-only `--fx-stage` #050506 is not a token).
- `DECISION(open)`: **intensity presets** (calm 2.6–5.0 s, normal 1.2–2.7 s, storm 1.0–1.7 s between
  strikes; flash and branch strengths) are proposals, tunable as a patch pre-1.0. The 1.0 s floor is
  what keeps `storm` at ≤ 3 flashes/s; it is not tunable downwards.
- `DECISION(open)`: **default position** 0.66, 0.8 below 720 px (the mockup's values; the API sketch
  said "~0.68").
- DPR cap 1.5 (not the loop's default 2): the fragment shader is fill-rate bound, as in the mockup.
- The poster glow uses CSS `filter` (px, tuned for 300–500 px tall banners) instead of an SVG
  `<filter>` with an id (no unique ids in a server component).
- Unmount releases the WebGL context (`WEBGL_lose_context`) after a tick, only when the canvas is
  detached, so StrictMode's remount keeps a live context (browsers cap live contexts at ~16).
- Mono labels in the story use `font-sans tabular-nums` (no mono token; build brief §7).
