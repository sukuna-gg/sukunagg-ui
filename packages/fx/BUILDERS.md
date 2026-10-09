# Building an `@sukunagg/fx` effect

This guide is for the five effect builders (Q39). The scaffold is done: the package, the CSS
pipeline, the shared frame loop, and the Storybook, showcase and docs wiring. You add **one
effect** and touch only the lines this guide names.

The build brief and recipes win over this file where they disagree. That includes
`docs/component-button.md` for the doc template and CLAUDE.md for the non-negotiables. The
approved look and timing come from `scratchpad/fx-mockups/parts/<dir>.html`. Port the effect,
not the demo plumbing.

## 1. Your effect

| Effect | `<dir>` | Client sub-file | Engine | Hook | Stage |
|---|---|---|---|---|---|
| ParticleField | `particle-field` | `particle-field.canvas.tsx` | Canvas 2D | `useFxCanvas` | always dark |
| FlowField | `flow-field` | `flow-field.canvas.tsx` | Canvas 2D | `useFxCanvas` | always dark |
| Lightning | `lightning` | `lightning.webgl.tsx` | WebGL 1 | `useFxCanvas` (`context: 'webgl'`) | always dark |
| HoloCard | `holo-card` | `holo-card.tilt.tsx` | CSS + spring | `useFxLoop` | theme-aware |
| BracketBeam | `bracket-beam` | `bracket-beam.measure.tsx` | SVG | `useFxLoop` (+ `ResizeObserver` for layout) | theme-aware |

"Always dark" means you pin `data-theme="dark"` on the effect root, the way VideoPlayer does. The
palette then resolves dark in both themes. Inside it, use `bg-bg`/`bg-well`, `text-text` and
`text-text-dim`. Theme-aware effects are designed for both themes.

## 2. Files you create

Write the doc first (CLAUDE.md rule 4).

```
docs/component-<dir>.md                     # button template, sections 1–11; H1 "# Component: <Name>"
packages/fx/src/components/<dir>/
├── <dir>.styles.tsx      # tv() maps from ../../utils/tv. Pure, server-safe, no hooks
├── <dir>.logic.tsx       # forwardRef component. NO 'use client', no hooks: renders the root,
│                         # the CSS poster and children, then <ClientSubFile /> (the island)
├── <client sub-file>     # 'use client' as the literal first line; the loop lives here
├── index.tsx             # export { Name } from './<dir>.logic'; export type { NameProps } …
├── <dir>.test.tsx
└── <dir>.stories.tsx     # title: 'FX/<Name>'
packages/fx/src/styles/<dir>.css            # already exists: fill it in (§ 4)
test/browser/<dir>.test.ts                  # real-browser spec (§ 8), listed in the doc's §2
```

The server/client split follows the ui precedent: `input.logic.tsx` renders `input.reveal.tsx`,
and `table.logic.tsx` renders `table.scroll.tsx`. `src/index.test.ts` enforces it. Any module
that calls a hook must be `'use client'`, and the set of client modules is pinned (§ 5).

Pure math goes in your own files under `components/<dir>/`, for example
`particle-field.sim.ts` or `lightning.shaders.ts`. That includes noise, bolt generation, shaders
as TS template strings, and bracket geometry. Keep it unit-tested at 90% or more, and keep the
canvas/WebGL glue thin. `src/internal/` is shared: don't add to it. If you need a shared helper,
say so in your return value.

## 3. Root contract and the shared loop

### The root element (rendered by `<dir>.logic.tsx`)

```tsx
<div
  ref={ref}
  data-sk-fx="particle-field"          // the hook finds the root by this; browser specs select it
  data-theme="dark"                    // always-dark stages only
  className={styles.root({ className })} // include `group/fx relative isolate overflow-hidden`
  {...props}
>
  <div aria-hidden="true" className={styles.poster()} />  {/* the server-rendered CSS poster */}
  <ParticleFieldCanvas … />                                {/* the island: <canvas> + hook */}
  {children}                                               {/* consumer content, above the effect */}
</div>
```

- **The loop owns `data-state`** on the root: `running | paused | still | lost | off`. It is
  absent on the server. Never render `data-state` yourself.
- **Poster and canvas crossfade** (the mockup's `data-fx="on"`). The canvas starts transparent.
  When the loop has drawn (`running`, `paused` or `still`), fade the canvas in and fade out any
  poster layer the canvas replaces. Put these strings in your `.styles.tsx` exactly as written:
  - canvas:
    `opacity-0 transition-opacity duration-slow ease-sukuna motion-reduce:transition-none group-data-[state=running]/fx:opacity-100 group-data-[state=paused]/fx:opacity-100 group-data-[state=still]/fx:opacity-100`
  - poster layer to hide:
    `transition-opacity duration-slow ease-sukuna motion-reduce:transition-none group-data-[state=running]/fx:opacity-0 group-data-[state=paused]/fx:opacity-0 group-data-[state=still]/fx:opacity-0`

  With `off` (no canvas support) or `lost` (WebGL context lost), the poster shows again.
  No-JS users and the first paint get the poster. Use a slower duration from your CSS module if
  the mockup's 1.6 s fade matters.
- **Hide the effect from assistive tech** by wrapping the canvas or SVG in
  `<div aria-hidden="true">`. Put `aria-hidden` on that wrapper, not on the `<canvas>`, because
  Biome's a11y rule counts a canvas as focusable. Real content (children, HoloCard's art,
  BracketBeam's team names and scores) stays in the DOM, readable.
- The base styles are the **final frame**. No-JS, reduced motion and browsers without `@property`
  all land on the finished look.

### Canvas effects: `useFxCanvas` (`src/internal/use-fx-canvas.ts`)

```tsx
'use client'

import { useRef } from 'react'
import { cssColor, type Rgb } from '../../internal/color'
import { mulberry32 } from '../../internal/random'
import { useFxCanvas } from '../../internal/use-fx-canvas'
import { particleFieldStyles } from './particle-field.styles'

export function ParticleFieldCanvas({ density, paused }: { density: number; paused?: boolean }) {
  const live = useRef({ density })
  live.current = { density } // props that change are read through a ref: no remount
  const canvas = useFxCanvas(
    () => {
      // Runs once per mount, in an effect (twice under StrictMode: return FRESH state each time).
      const rand = mulberry32(0x5ea5007) // seeded: never Math.random
      let accent: Rgb = [255, 59, 78]
      return {
        theme(style) {
          accent = cssColor(style, '--sk-accent', accent) // re-read on [data-theme] change
        },
        resize({ width, height }) {
          /* re-layout; a draw(dt = 0) follows */
        },
        draw(ctx, { width, height, dt, still }) {
          // dt = 0: repaint without advancing. still: the reduced-motion still frame.
          ctx.clearRect(0, 0, width, height) // 2D: already scaled to CSS px (DPR capped at 2)
        },
        dispose() {
          /* free GPU resources (WebGL) */
        },
      }
    },
    { paused }, // WebGL: { context: 'webgl', attributes: { preserveDrawingBuffer: true, … } }
  )
  return (
    <div aria-hidden="true" className={particleFieldStyles().layer()}>
      <canvas ref={canvas} className={particleFieldStyles().canvas()} />
    </div>
  )
}
```

The loop gives you all of this for free, so don't re-implement any of it:

- one page-wide `requestAnimationFrame`, cancelled when idle;
- pausing off-screen (`IntersectionObserver`) and in hidden tabs;
- the reduced-motion still frame, following the OS setting live;
- the 2× DPR cap and `ResizeObserver` sizing;
- the theme re-read on `[data-theme]` change and on OS color-scheme flips;
- WebGL context loss and restore, which calls `setup` again;
- `off`, with the poster kept, when `getContext` returns null or any hook throws.

Under happy-dom, `getContext` returns null, so your component reports `off` and never throws.
The full contract is in the TSDoc of `src/internal/loop.ts`.

### DOM/SVG effects: `useFxLoop` (`src/internal/use-fx-loop.ts`)

```tsx
'use client'

import { type ReactNode, useRef } from 'react'
import { useFxLoop } from '../../internal/use-fx-loop'

export function HoloCardTilt({ children }: { children: ReactNode }) {
  const target = useRef({ x: 0, y: 0 })
  const { ref, wake } = useFxLoop<HTMLDivElement>((root) => {
    let x = 0
    let v = 0
    return {
      tick({ dt, still }) {
        if (still) x = 0 // reduced motion: flat card, no tilt
        else {
          v += (196 * (target.current.x - x) - 28 * v) * dt // critically damped spring
          x += v * dt
        }
        root.style.setProperty('--sk-holo-card-x', x.toFixed(4)) // write CSS vars, never React text
        return Math.abs(target.current.x - x) > 6e-4 || Math.abs(v) > 4e-3 // false = settled
      },
    }
  })
  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        target.current.x = …
        wake() // a settled effect sleeps (no frames) until woken
      }}
    >
      {children}
    </div>
  )
}
```

The root that `useFxLoop` observes is the element you attach `ref` to, and it receives
`data-state`. For a client sub-file that renders inside the server root, attach `ref` to the
island's own outer element. `tick` runs once at mount with `dt = 0`, then every frame while
running. Return `false` once settled. BracketBeam does its layout measuring in its own
`ResizeObserver`, inside the same island. Measure in `useEffect`, never `useLayoutEffect`
(React 18 SSR warns on it).

### Helpers

- `cssColor(style, '--sk-…', fallback)` and `parseColor()` in `internal/color.ts` read tokens as
  `[r, g, b]`. They handle hex, `rgb()`, and anything else through a 1×1 canvas.
- `mulberry32(seed)` in `internal/random.ts` is a seeded PRNG. Use it for everything random:
  scenes must be reproducible and hydration-safe.
- `cn` and `tv` live in `src/utils/` and use fx's own merge config. ui does not export them.

## 4. CSS: `packages/fx/src/styles/<dir>.css`

Your module already exists and `src/styles/theme.css` already imports it. Nothing else needs
wiring. The build inlines it into `dist/theme.css`, the file Tailwind apps `@import`. It also
compiles into `dist/styles.css`, the precompiled fallback. Storybook and the showcase import the
source directly. The file's header comment is authoring notes, and the build drops it.

- Put these at the top level: `@property --sk-<dir>-<thing>`, `@keyframes sk-<dir>-<phase>`,
  `@utility animate-<dir>-<phase>`, and `@utility <dir>-<plane|glow|…>` for gradients that no
  utility can express. Never name a utility `bg-*`.
- Handle reduced motion inside each animated utility with
  `@media (prefers-reduced-motion: reduce) { animation: none; }`. In TSX, use `motion-reduce:`
  variants. Decorative loops stop. Information keeps going.
- Use at most 8 keyframes. Each `from` holds the initial state, and the base style is the final
  frame. Take colors only through `var(--sk-*)`.
- Register every `animate-*` key you add in `src/utils/tw-merge-config.ts`, on the lines directly
  under your `// <dir>` comment in `animateKeys`. For example, `'particle-field-haze',` without
  the `animate-` prefix. This lets a consumer's `animate-none` win.

## 5. Registering the effect (shared lines: add them, then list them in your return value)

Each shared file has a `// <dir>` comment line for you. Add your lines directly under it and
never edit another effect's lines. The integrator re-applies them centrally (brief §20).

1. `packages/fx/src/index.ts`, under `// <dir>`:
   ```ts
   export type { ParticleFieldProps } from './components/particle-field'
   export { ParticleField } from './components/particle-field'
   ```
2. `packages/fx/src/index.test.ts`:
   - in `EXPORTS`, under `// <dir>`: `'particle-field': ['ParticleField'],`
   - in `CLIENT_FILES`, under `// <dir>`:
     `'./components/particle-field/particle-field.canvas.tsx',`
3. `packages/fx/src/utils/tw-merge-config.ts`: your `animateKeys`, as described in § 4.
4. `packages/fx/.size-limit.json`: one entry, appended at the end of the array:
   ```json
   {
     "name": "ParticleField (our code + shared loop; react, @sukunagg/ui excluded)",
     "path": "dist/index.js",
     "import": "{ ParticleField }",
     "limit": "4 kB",
     "ignore": ["react", "react-dom", "react/jsx-runtime", "@sukunagg/ui", "tailwind-merge", "tailwind-variants", "clsx"]
   }
   ```
   Proposed budgets: ParticleField and FlowField 4 kB, Lightning 5 kB, HoloCard and BracketBeam
   3 kB. Run `bun run build && bun run size` in `packages/fx` and set the limit to what you
   measure, rounded up a little. The loop alone is about 1.6 kB.

`src/index.test.ts` then checks the following:

- every component directory is exported, and listed in `EXPORTS`;
- the runtime exports match exactly;
- each component has its three files plus a test and stories;
- the stories are titled `FX/<Name>`;
- every hook-using module is `'use client'`, and the client set equals `CLIENT_FILES`.

## 6. Stories: `<dir>.stories.tsx`

- Use `title: 'FX/<Name>'` with single quotes, for example `title: 'FX/ParticleField'`. Story ids
  are then `fx-particlefield--<story>`, which is a contract your browser spec depends on.
- Screen chrome goes in stories, not the component: hero copy, CTAs, queue UI, HUDs, Replay
  buttons. The component is the effect layer plus `children` or data props.
- Include `Playground` (controls) plus whatever the doc's §10 lists. Review every story in dark
  and light.
- The showcase picks your stories up automatically, with snippets importing from
  `@sukunagg/fx`. Storybook sorts `FX` between Charts and Video.

## 7. Unit tests: `<dir>.test.tsx`

```tsx
import { afterEach, describe, expect, it } from 'bun:test'
import { render } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { type FxEnv, flushEffects, installFxEnv } from '../../../../../test/fx'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { ParticleField } from './index'
```

Import only what you use: `noUnusedLocals` fails `tsc`.

`installFxEnv(options)` from `test/fx.ts` fakes every browser API the loop uses. It returns:

- `env.intersect(true)`, `env.frame(ms)` and `env.pendingFrames()`;
- `env.hide(bool)`, `env.reduceMotion(bool)`, `env.colorScheme('light')` and `env.setDpr(n)`;
- `env.resize(el, w, h)`;
- `env.callsTo('fillRect')`, which records every 2D/WebGL call on a fake context.

Call `env.restore()` in `afterEach`.

Required cases:

- Server render and hydrate. For the hydrate case, use
  `env = installFxEnv({ reducedMotion: true }); await expectHydrates(<X />); await flushEffects()`.
  `expectHydrates` never unmounts, so without this the island mounts in the next test and keeps
  ticking.
- With happy-dom's null context and no env, the root reports `data-state="off"` and nothing
  throws.
- With the env:
  - the canvas draws: `env.callsTo(...)`;
  - the state is `paused`, then `running` after `intersect(true)`;
  - the state is `still` under `reducedMotion: true`, with no pending frames;
  - unmounting leaves no pending frames.
- Forwards `ref`, merges `className`, and passes native props through.
- axe: `await expectAccessible(container)` passes.
- Your pure math modules have their own tests.
- HoloCard: keyboard tilt (arrow keys, Escape/Home), `tabIndex=0`, `role="group"` and
  `aria-roledescription`.
- BracketBeam: the server renders every match, plus the CSS-only winner path.

Coverage must be at least 90% per file on lines and functions. Never exclude component code.
Delete branches that can't be reached.

## 8. Browser spec: `test/browser/<dir>.test.ts`

Copy the helpers from `test/browser/fx-loop.test.ts`: `countFrames`, `framesIn`, `setHidden` and
`watchErrors`. Then select your root with `[data-sk-fx="<dir>"]` and assert `data-state`.

Cover these:

- the story renders;
- the effect runs: `data-state="running"`, the rAF count is above 0, and two canvas
  `toDataURL()` calls differ (Canvas 2D only);
- reduced motion: `test.use({ reducedMotion: 'reduce' })` gives `still` and 0 frames;
- no console errors.

Per-effect checks:

- HoloCard: the pointer and arrow keys change the tilt custom property.
- BracketBeam: a path's `d` changes after `page.setViewportSize`.
- Lightning: `WEBGL_lose_context` gives `lost`, and the poster is back.

Never pixel-compare WebGL unless the context uses `preserveDrawingBuffer: true`.

To run your spec against your own dev server, without touching port 6007 or `storybook-static`,
start Storybook in the background first:

```
bunx storybook dev -p <PORT> --no-open --ci
```

Then put this config in your scratchpad, not the repo. Its imports are absolute because the
scratchpad has no `node_modules`:

```js
// <scratchpad>/pw-<dir>.config.mjs
import { defineConfig, devices } from 'file:///<worktree>/node_modules/@playwright/test/index.mjs'
export default defineConfig({
  testDir: '<worktree>/test/browser',
  testMatch: /<dir>\.test\.ts/,
  reporter: 'list',
  use: { baseURL: 'http://localhost:<PORT>' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
```

Run it from the worktree root:

```
bunx playwright test -c <scratchpad>/pw-<dir>.config.mjs --output <scratchpad>/pw-results
```

`test/browser/fx-loop.test.ts` passes this way: 7 tests.

## 9. Verify, then return

```
bun install                                   # worktree root (fresh worktrees have no node_modules)
cd packages/fx && bun test src --coverage     # every file ≥ 90%
bunx tsc --noEmit -p .                        # root
bunx biome check packages/fx docs test        # root
cd packages/fx && bun run build && bun run size
```

Then look at your stories in both themes and under reduced motion, and compare them with
`scratchpad/fx-mockups/shots/`. Return `sharedLines` with the exact lines you added to
`src/index.ts`, `src/index.test.ts`, `src/utils/tw-merge-config.ts` and `.size-limit.json`.

## 10. Don't touch

- `src/internal/*`, `src/styles/theme.css`, `src/styles/fallback.css` and `scripts/build-css.ts`.
- `package.json`, `tsup.config.ts`, `tsconfig*.json`, `bunfig.toml`, `README.md` and this file.
- Another effect's files or lines.
- The root wiring: Storybook, the showcase, `biome.json`, `scripts/build-docs.ts` and
  `docs/releasing.md`.
- The integrator-only docs (brief §21): the roadmap, questions, ai-decisions, motion, styling,
  storybook and testing docs; README and the llms files; changesets; versions; CLAUDE.md.
- Don't commit `bun run docs:build` output.

If the loop is missing something you need, don't patch it. Say so in `openDecisions`.
