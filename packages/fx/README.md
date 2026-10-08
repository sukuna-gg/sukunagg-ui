# @sukunagg/fx

Canvas, WebGL and SVG effects for [sukuna-ui](https://github.com/sukuna-gg/sukunagg-ui), for
hero sections, match screens and player cards.

- **Server-rendered poster first.** Every effect renders a CSS poster on the server. That poster
  is what no-JS users, the first paint and screenshots see. A small client island then draws
  over it.
- **One shared frame loop.** Every effect on the page shares a single `requestAnimationFrame`.
  It is cancelled when nothing is running, so an idle page schedules no frames.
- **Pauses when nobody can see it.** Effects stop while off-screen (`IntersectionObserver`) and
  in hidden tabs. They resume where they left off.
- **Reduced motion is a still frame.** Under `prefers-reduced-motion: reduce` an effect draws one
  frame and stops. It follows the OS setting live.
- **Cheap on dense screens.** The backing store is capped at 2× the device pixel ratio.
- **Themed by tokens.** Colors come from the `--sk-*` tokens of `@sukunagg/ui/theme.css` and are
  re-read when `data-theme` changes. Seeded randomness keeps every scene reproducible.
- **Observable.** Each effect's root reports `data-state`: `running`, `paused`, `still`, `lost`
  (WebGL context lost) or `off` (no canvas support; the poster stays).

## Install

```bash
bun add @sukunagg/fx @sukunagg/ui
```

`@sukunagg/ui` is a peer dependency, because the effects use its `--sk-*` tokens.

**Tailwind v4**: add these next to the `@sukunagg/ui` setup in your global CSS:

```css
@import "tailwindcss";
@import "@sukunagg/ui/theme.css";
@import "@sukunagg/fx/theme.css";
@source "../node_modules/@sukunagg/ui/dist";
@source "../node_modules/@sukunagg/fx/dist";
```

`@sukunagg/fx/theme.css` brings the effects' `@property`, `@keyframes` and `@utility` rules.
`@source` scans class names only, so the import is required.

**No Tailwind**: import the precompiled stylesheet after the library's own:

```ts
import '@sukunagg/ui/styles.css'
import '@sukunagg/fx/styles.css'
```

## Effects

| Effect | Engine |
|---|---|
| `ParticleField`: rising embers behind hero content | Canvas 2D |
| `FlowField`: a drifting flow field for waiting screens | Canvas 2D |
| `Lightning`: arcing bolts | WebGL |
| `HoloCard`: a holographic tilt card (pointer and arrow keys) | CSS plus a pointer island |
| `BracketBeam`: a tournament bracket with travelling winner beams | SVG plus a measuring island |

Each effect has a full API page under
[docs/llms](https://github.com/sukuna-gg/sukunagg-ui/tree/main/docs/llms) once it ships.

## License

MIT
