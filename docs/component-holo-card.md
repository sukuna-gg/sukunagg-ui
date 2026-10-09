# Component: HoloCard

> Follows the `docs/component-button.md` template. **Server component** in `@sukunagg/fx` (no hooks,
> no directive) that renders one `'use client'` island, `holo-card.tilt.tsx`, on the shared fx
> loop (`useFxLoop`, `packages/fx/src/internal/use-fx-loop.ts`). Approved in Q38/Q39 (showpieces &
> FX); the visual and behavioural target is the "HoloCard" mockup in the Sukuna FX Lab.

## 1. Purpose

A holographic foil card that wraps your card art and tilts toward the pointer or the arrow keys.
A foil layer (a rainbow band plus a fine dot screen) and a glare layer follow the tilt on a spring,
and drift slowly on their own while the card rests flat. Use it for the one collectible on a
screen: a player card, a season reward, a profile highlight. It is decoration around real content:
the card's name comes from your `aria-label`, and the art's text stays in the DOM.

## 2. Files

```
docs/component-holo-card.md                # this spec
packages/fx/src/components/holo-card/
├── holo-card.styles.tsx   # tv() slots root/scene/aura/floor/card/face/foil/band/dots/glare +
│                          # `intensity`. Pure.
├── holo-card.logic.tsx    # forwardRef focusable root (role="group") + layers; renders the island.
│                          # NO 'use client', no hooks.
├── holo-card.tilt.tsx     # 'use client' island: useFxLoop spring (pointer + arrow keys), writes
│                          # --sk-holo-card-x/-y/-a on its own element. Never re-renders per frame.
├── holo-card.test.tsx
├── holo-card.stories.tsx  # title 'FX/HoloCard': the example player card inside screen chrome
└── index.tsx              # export { HoloCard }; export type { HoloCardProps }
packages/fx/src/styles/holo-card.css       # @keyframes sk-holo-card-drift-x/-y, @utility (§4)
test/browser/holo-card.test.ts             # Playwright spec: flat card + compositor drift, pointer
                                           # and keyboard tilt, hidden tab, off-screen, `paused`,
                                           # live and loaded reduced motion, no console errors
```

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

export interface HoloCardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'aria-label'> {
  /** Required: the card's accessible name, e.g. "ryomen, Duelist, rating 94, legendary card". */
  'aria-label': string
  /** How far it tilts and how bright the foil and glare get. Default 'normal'. */
  intensity?: 'subtle' | 'normal'
  /** Freeze the drift and any tilt, and ignore input (an app's pause control). Default false. */
  paused?: boolean
  /** The card art, painted on the card face under the foil and glare. */
  children?: ReactNode
}
```

- The root is a `<div>` with `role="group"`, `aria-roledescription="player card"` and
  `tabIndex={0}`, so keyboard users can focus it and tilt it with the arrow keys. All three can be
  overridden with your own native props (e.g. `aria-roledescription="reward card"`).
- `ref` points at that root. `className` merges last (tailwind-merge), so `className="w-64"`
  resizes the card; the default box is `w-50 aspect-[5/7]` (200 × 280 px).
- **`paused`** is the hook for a WCAG 2.2.2 pause control: the light's drift stops where it is, a
  tilt holds, and the pointer and arrow keys stop tilting (arrows scroll again). Toggling it never
  remounts the card; resumed, the card springs to whatever the input then asks for. The card
  already pauses on its own off-screen, in hidden tabs and under reduced motion. A root
  `className` cannot stop the drift (`animate-none` would land on the root, not on the light
  layers): use `paused`.
- **`data-state`** (`running | paused | still | off`, written by the shared loop) lives on the
  scene, the root's first child, not on the root: select it with
  `[data-sk-fx="holo-card"] > [data-state]`. Never pass a `data-state` of your own.
- The aura and floor shadow paint up to 80 px outside the box (`pointer-events: none`); leave room
  around the card or clip it in your layout.
- **Theme.** The card itself is a dark collectible in both themes (its face pins
  `data-theme="dark"`, so the foil's `color-dodge` and the glare's `overlay` have a dark base to
  work on, as in the approved light mockup). The accent hue, the aura, and the focus ring follow
  the page theme. Art inside the card therefore resolves the **dark** `--sk-*` tokens.
- **CSS custom properties your art can read** (set on the card's scene, inherited by the art):

  | Property | Range | Meaning |
  |---|---|---|
  | `--sk-holo-card-x`, `--sk-holo-card-y` | −1 … 1 | Spring-smoothed tilt (pointer or keys); 0 at rest (the card doesn't sway). Use for parallax: `translate: calc(var(--sk-holo-card-x) * 8px) 0`. |
  | `--sk-holo-card-a` | 0 … 1 | How "active" the card is (1 while hovered or key-tilted). |
  | `--sk-holo-card-hue`, `--sk-holo-card-deep` | color | The page-theme accent and accent-deep. |
  | `--sk-holo-card-ink`, `--sk-holo-card-base` | color | The card's bright ink and dark base. |

Deliberately **not** in v1: the mockup's idle card sway (§11), gyroscope tilt
(`deviceorientation` needs a permission prompt on iOS), rarity tiers or custom foil patterns
(Q38(c) rarity tokens are still open), `as` polymorphism, naming by `aria-labelledby` alone, and a
built-in frame, rating or name plate (that is art: see the stories).

## 4. Variants → tokens

| `intensity` | Max tilt (Y / X) | Lift | Foil opacity (rest → active) | Glare opacity (rest → active) |
|---|---|---|---|---|
| normal (default) | 17° / 14° | 16 px | .20 → .48 | .40 → .90 |
| subtle | 8.5° / 7° | 8 px | .12 → .29 | .24 → .54 |

`intensity` sets two scale factors on the root as literal classes:
`[--sk-holo-card-tilt:1] [--sk-holo-card-shine:1]` (normal) and
`[--sk-holo-card-tilt:0.5] [--sk-holo-card-shine:0.6]` (subtle).

| Layer | Tokens |
|---|---|
| Edge (the 1.5 px gradient rim) | `--sk-holo-card-ink` = dark `--sk-text` 82% + `--sk-chart-4`; `--sk-holo-card-hue` = page `--sk-accent`; `--sk-holo-card-base` = dark `--sk-bg` |
| Card shadow | dark `--sk-well` at 90%, plus the page `--sk-accent-glow` |
| Foil (`color-dodge`) | ink dots; a 118° band of hue, dark `--sk-text`, `--sk-chart-5`, `--sk-chart-2` |
| Glare (`overlay`) | dark `--sk-text` at 85% → 22% → transparent |
| Aura | page `--sk-accent-glow` |
| Floor shadow | dark `--sk-well` at 55% |
| Focus ring | page `--sk-focus-ring` (captured as `--sk-holo-card-ring`) |

No new color token. Durations are literal (the drift's 14 s / 7 s periods, the spring constants in
§6), like `sk-shine`; tunable as a patch pre-1.0.

The CSS module `packages/fx/src/styles/holo-card.css` (two keyframes, seven utilities, no
`@property`; colors only through `var(--sk-*)`):

```css
/* The light's drift: whole layers move, so nothing repaints. x and y use two properties
   (`translate`, `transform`) so the two periods compose. Amplitudes come from each layer. */
@keyframes sk-holo-card-drift-x {
  from { translate: calc(var(--sk-holo-card-dx, 0px) * -1) 0; }
  to { translate: var(--sk-holo-card-dx, 0px) 0; }
}
@keyframes sk-holo-card-drift-y {
  from { transform: translateY(calc(var(--sk-holo-card-dy, 0px) * -1)); }
  to { transform: translateY(var(--sk-holo-card-dy, 0px)); }
}

/* Sine-eased sweeps (7 s along x, 3.5 s along y, alternating: the mockup's 14 s figure-eight),
   started mid-swing so the light is centred and moving at mount. Paused with the loop. */
@utility animate-holo-card-drift {
  animation:
    sk-holo-card-drift-x 7s cubic-bezier(0.37, 0, 0.63, 1) -3.5s infinite alternate,
    sk-holo-card-drift-y 3.5s cubic-bezier(0.37, 0, 0.63, 1) -1.75s infinite alternate;
  animation-play-state: var(--sk-holo-card-play, running);
  @media (prefers-reduced-motion: reduce) { animation: none; }
}

/* Tilt state, the light position and size, captured page-theme colors. */
@utility holo-card-scene {
  --sk-holo-card-x: 0;
  --sk-holo-card-y: 0;
  --sk-holo-card-a: 0;
  --sk-holo-card-calm: calc(1 - var(--sk-holo-card-a)); /* the drift fades out while active */
  --sk-holo-card-lx: var(--sk-holo-card-x);             /* the light sits at the tilt */
  --sk-holo-card-ly: var(--sk-holo-card-y);
  --sk-holo-card-spread: calc(1 + 0.37 * var(--sk-holo-card-calm)); /* the drift's average reach */
  --sk-holo-card-hue: var(--sk-accent);
  --sk-holo-card-deep: var(--sk-accent-deep);
  --sk-holo-card-glow: var(--sk-accent-glow);
  --sk-holo-card-ring: var(--sk-focus-ring);
  perspective: 900px;
  touch-action: pan-y;
  @media (prefers-reduced-motion: reduce) {
    --sk-holo-card-lx: -0.5; /* a fixed top-left light: the static sheen */
    --sk-holo-card-ly: -0.55;
    --sk-holo-card-spread: 1;
  }
}

@utility holo-card-edge { /* rim radial-gradient at the light; box-shadow; transform:
  translateZ(a·16px·tilt) rotateX(y·−14°·tilt) rotateY(x·17°·tilt); none under reduced motion */ }
@utility holo-card-foil { /* color-dodge, opacity (.2 + .28a)·shine, masked around the light */ }
@utility holo-card-band { /* the 118° rainbow band, oversized by its travel (±0.24 × ±0.16 card) */ }
@utility holo-card-dots { /* the dot screen, oversized by its travel (±13.5 × ±9 px) */ }
@utility holo-card-glare { /* overlay highlight at the light, in a square box that holds its
  travel (±0.75 × ±0.5 half card); reduced motion: a fixed diagonal sheen */ }
```

The full bodies are in the CSS module; every value above is a `var(--sk-*)` or a number.

## 5. States

| State | Behavior |
|---|---|
| server / no-JS | The card renders flat with its foil and glare; the drift still runs (pure CSS) and the focus ring still shows. No tilt. `data-state` is absent. |
| default (rest) | A flat, still card. Its foil band, dot screen and glare drift (14 s figure-eight) as compositor-only transforms: no frames, no repaint. The loop is `running` but settled: no frames are requested. |
| hover | The card springs toward the pointer (ω = 14 rad/s, critically damped), lifts 16 px, and the foil and glare follow the pointer and brighten. The drift fades out while active. |
| focus-visible | A 2 px page-theme ring on the card (it tilts with the card); the root's own outline is suppressed. |
| arrow keys | Each press nudges the card by 0.34 on that axis (clamped to ±1) from where it aims now, and lights it. `Escape` or `Home` (and blur) undo the key tilt; `Home` is only claimed (`preventDefault`) when there is one to undo. Arrows or `Home` with Alt/Ctrl/Meta/Shift are left to the browser. Only keys pressed on the card itself count; keys typed inside interactive art are ignored. |
| pointer and keys together | The input used last wins. Letting go of one falls back to the other: a pointer leaving a key-tilted card returns to the key tilt, `Escape` under a hovering pointer returns to the pointer's aim. |
| pointer leave / blur (nothing else holds it) | Springs back to flat (ω = 7.5 rad/s, softer) and settles; no frames once settled. |
| `paused` prop | `data-state="paused"`: the drift and any tilt hold where they are, no frames, and the pointer and arrow keys are ignored (arrows scroll). Letting go (leave, blur, `Escape`) still counts, so the resumed card springs to the current input. |
| off-screen / hidden tab | The loop reports `paused` and stops; the drift pauses too (`data-[state=paused]` sets `--sk-holo-card-play`). |
| prefers-reduced-motion | `data-state="still"`: flat card, no drift, a fixed diagonal sheen instead of the moving glare. Pointer and arrow keys don't tilt, and the keys keep their defaults (arrows scroll, `Home` jumps). Follows the OS setting live, flattening a tilted card. |

## 6. Logic (`holo-card.logic.tsx`)

- **No `'use client'`**, no hooks, no DOM access: guarded by the RSC test in
  `packages/fx/src/index.test.ts`, which pins `holo-card.tilt.tsx` as the only client module here.
- `forwardRef<HTMLDivElement, HoloCardProps>`; destructures `intensity`, `paused` (default
  `false`), `className`, `children`.
- Renders the root `<div data-sk-fx="holo-card" role="group" aria-roledescription="player card"
  tabIndex={0}>` (defaults first, then `...rest`, so native props override), then
  `<HoloCardTilt>` (the scene) with: the aura, the floor (`data-theme="dark"`), and the card
  (`data-theme="dark"`) holding the face (children), the foil (band + dots) and the glare. Every
  decorative layer is `aria-hidden="true"`.
- Only serializable props cross into the island: a class string, the `paused` boolean and
  `children`.

**The island (`holo-card.tilt.tsx`, `'use client'`):**

- `useFxLoop(create, { paused })` on the scene element (which receives `data-state`). The ticker
  keeps `x`, `y`, `a` and their velocities, integrates a critically damped spring per axis
  (`v += (ω²·d − 2ω·v)·h; x += v·h`, a frame's `dt` split into equal sub-steps of at most
  0.034 s, so the spring keeps real time on slow frames), snaps an axis once `|d| < 6e-4` and
  `|v| < 4e-3`, writes `--sk-holo-card-x/-y/-a` with `style.setProperty`, and returns `false`
  when every axis has settled, so the page schedules no frames at rest.
- Input is two targets, `pointer` and `key` (each `null` when not held), plus which was used
  last; the spring chases the last one used, else the other, else flat.
- `still` (reduced motion): forgets both targets and paints the flat state once.
- Input is taken only while `data-state` is `running` (not `paused`, `still` or `off`).
- Pointer: `pointerenter`/`pointermove`/`pointerdown` aim at the pointer (relative to the scene's
  box; a zero-size box is ignored); `pointerleave`/`pointercancel` let go. Every input calls the
  stable `wake()`.
- Keyboard: `keydown` and `blur` listeners on the focusable root (`scene.parentElement`), added in
  `useEffect` and removed on unmount. Keys with Alt/Ctrl/Meta/Shift are ignored. Arrow keys
  `preventDefault()` only when they tilt; `Home` only when it undoes a key tilt; `Escape` never (a
  surrounding dialog may close).
- No `Math.random`, no React state, no re-render per frame. The first client render equals the
  server HTML, so hydration matches.

## 7. Styles (`holo-card.styles.tsx`)

```ts
import { tv, type VariantProps } from '../../utils/tv'

export const holoCardStyles = tv({
  slots: {
    root: 'group/holo relative isolate block aspect-[5/7] w-50 shrink-0 outline-none',
    scene: ['holo-card-scene absolute inset-0', 'data-[state=paused]:[--sk-holo-card-play:paused]'],
    aura: [
      'pointer-events-none absolute -inset-x-20 -inset-y-12.5',
      'bg-[radial-gradient(closest-side,var(--sk-accent-glow),transparent)]',
      'opacity-[calc(.3+.3*var(--sk-holo-card-a))]',
      '[translate:calc(var(--sk-holo-card-x)*14px)_calc(var(--sk-holo-card-y)*10px)]',
    ],
    floor: [
      'pointer-events-none absolute inset-x-[6%] -bottom-6 h-7',
      'bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--sk-well)_55%,transparent),transparent)]',
      '[translate:calc(var(--sk-holo-card-x)*-16px)_0]',
    ],
    card: [
      'holo-card-edge absolute inset-0 rounded-lg',
      'group-focus-visible/holo:outline-2 group-focus-visible/holo:outline-offset-2',
      'group-focus-visible/holo:outline-(--sk-holo-card-ring)',
    ],
    face: [
      'absolute inset-[1.5px] isolate overflow-hidden rounded-[calc(var(--sk-radius-lg)-1.5px)]',
      'bg-(--sk-holo-card-base) text-(--sk-holo-card-ink)',
    ],
    foil: 'holo-card-foil pointer-events-none absolute inset-0',
    band: 'holo-card-band absolute animate-holo-card-drift motion-reduce:animate-none',
    dots: 'holo-card-dots absolute animate-holo-card-drift motion-reduce:animate-none',
    glare:
      'holo-card-glare pointer-events-none absolute animate-holo-card-drift motion-reduce:animate-none',
  },
  variants: {
    intensity: {
      normal: { root: '[--sk-holo-card-tilt:1] [--sk-holo-card-shine:1]' },
      subtle: { root: '[--sk-holo-card-tilt:0.5] [--sk-holo-card-shine:0.6]' },
    },
  },
  defaultVariants: { intensity: 'normal' },
})
export type HoloCardStyleProps = VariantProps<typeof holoCardStyles>
```

- The drift sits on the band, dots and glare, not on the root, so a consumer `className` never
  reaches it (`animate-none` on the root changes nothing); `paused` is the API for stopping it.
  `animate-holo-card-drift` is still registered in `packages/fx/src/utils/tw-merge-config.ts`
  (`animateKeys`), as every fx animation is. No utility is named `bg-*` (the aura and floor use
  arbitrary `bg-[radial-gradient(…)]`, which tailwind-merge reads as an image).
- The floor and the card carry `data-theme="dark"` in the markup (§6), so `--sk-well`,
  `--sk-bg` and `--sk-text` resolve dark inside them; the aura stays on the page theme.
- Every class string is literal; the only runtime values are the three custom properties the
  island writes with `style.setProperty` (no inline `style` prop, no class interpolation).

## 8. Accessibility checklist

- [ ] Focusable (`tabIndex=0`), `role="group"` with `aria-roledescription="player card"` and a
      required `aria-label`; the art's text stays in the DOM, in reading order.
- [ ] Every decorative layer (aura, floor, foil, glare) is `aria-hidden="true"`; nothing decorative
      is focusable.
- [ ] Visible focus: a 2 px page-theme `--sk-focus-ring` ring on the card, ≥ 3:1 against the page
      in both themes.
- [ ] Keyboard parity with the pointer: arrow keys tilt, `Escape`/`Home` reset, blur resets. Tilt
      is decorative, so no announcement is needed. Modified keys (Alt+← is Back) stay the
      browser's, and `Home` is only claimed to undo a key tilt.
- [ ] **WCAG 2.2.2 (pause, stop, hide):** the drift runs longer than 5 s, so it pauses off-screen
      and in hidden tabs, stops under reduced motion, and apps can stop it with `paused` (bind a
      Pause/Play control to it, as in the Lightning `WithPauseControl` story).
- [ ] Reduced motion: no drift, no tilt, a static sheen; arrow keys fall back to page scrolling.
- [ ] WCAG 2.3.1: no flashing. The glare brightens smoothly over a spring, far below 3 flashes/s.
- [ ] Touch: `touch-action: pan-y`, so vertical scrolling over the card still scrolls the page.
- [ ] axe: zero violations in both themes (unit) and in the stories (Storybook a11y addon).

## 9. Tests

`holo-card.test.tsx` (bun test + happy-dom + `test/fx.ts` `installFxEnv`):

- Server render: the root's role, roledescription, tabindex, label and `data-sk-fx`; the art's
  text; every decorative layer `aria-hidden`; no `data-state`; both intensities map to their
  literal classes; only the band, dots and glare carry the drift, each with
  `motion-reduce:animate-none`, the scene hands them the pause, and the card is a direct child of
  the scene (no sway wrapper).
- Native props pass through, `intensity` and `paused` don't leak, `className` merges (`w-64`
  replaces `w-50`), `ref` forwards, `aria-roledescription` and `tabIndex` can be overridden.
- Hydrates without warnings (`reducedMotion: true` + `flushEffects()`).
- Loop: `paused` until on screen, then `running`; settled at rest (no pending frames); no React
  commits while it animates; unmount leaves no pending frames and removes the key listeners;
  StrictMode doesn't double the listeners.
- Pointer: aims at the pointer (`--sk-holo-card-x/-y/-a` move toward the target over frames and
  settle there), clamps, springs back on leave and cancel, ignores a zero-size box.
- Keyboard: arrows tilt and `preventDefault`, repeated presses clamp at ±1, `Escape` (not
  prevented) and `Home` (prevented) reset, blur resets but a hovering pointer keeps its tilt;
  modified arrows and an unneeded `Home` (or `Ctrl+Home`) are not prevented; other keys and keys
  from inside the art are ignored.
- Mixed input: key → hover → leave falls back to the key tilt; an arrow under the pointer nudges
  from the pointer's aim; `Escape` then returns to the pointer.
- `paused`: stays `paused` on screen, ignores the pointer and arrows (not prevented), resumes to
  `running` without remounting; pausing mid-spring holds the tilt with no frames, and a blur while
  paused springs back once resumed.
- Reduced motion: `still`, flat, pointer, arrows and `Home` ignored (not prevented); switching it
  on live flattens a tilted card and forgets the input.
- axe in both themes.

`test/browser/holo-card.test.ts` (Playwright, `fx-holocard--*`): the story renders flat and
settles with 0 frames; only the glare/foil layers animate (`sk-holo-card-drift-x/-y`, the glare's
transform moves) while the card's transform stays the identity; the pointer and arrow keys
(whole-tuple polling) change the tilt and the card's transform, and it settles back; a hidden tab
and scrolling off-screen give `paused`, a paused drift and 0 frames, then `running` again; the
Playground with `paused` holds the drift and ignores input; reduced motion switched on live
flattens a tilted card (`still`, no drift, 0 frames) and back; loaded under reduced motion it is
`still`, flat, with a linear static sheen, and ignores input; the light theme renders; no console
errors.

## 10. Stories

`FX/HoloCard` (ids `fx-holocard--<story>`): `Playground` (controls: `intensity`, `paused`,
`aria-label`), `PlayerCard` (the mockup screen: grid stage, the example card, an eyebrow, the hint
that switches under reduced motion, and arrow-key caps that light up as you press them),
`Intensities` (subtle and normal side by side), `Roster` (three cards in a row: tab between them).
The example card art (rating, tier, emblem, slash lines, name plate, inner frame) lives in the
story file and shows how art reads `--sk-holo-card-*` for parallax.

## 11. Decisions

- Approved in **Q38/Q39** (owner: "holy shit, let's build the components"): HoloCard ships in the
  new opt-in `@sukunagg/fx`, as a server component plus one client island on the shared loop.
- **`DECISION(open)`: the card is flat at rest; the mockup's idle sway is not ported.** In the
  mockup the resting card sways with the drift (35% of it: ±4.5° rotateY, ±2.5° rotateX, with the
  aura, floor and art parallax following). This is our call, not the build brief's (an earlier
  version of this doc said it was). The reason is the goal of a crisp card at rest in Firefox: a
  card whose 3D transform animates is rasterized soft there. Measured in Firefox at DPR 2 on
  PlayerCard: the name plate is visibly blurred while the card sways, whether the sway is driven
  by the mockup's `@property` or by a compositor `rotate` animation, and crisp when the card is
  flat. A tilted card (while hovered) is soft in Firefox too, as in the mockup. Restoring the sway
  would be a CSS-only `rotate` keyframe on a wrapper around the card (no loop frames). Needs the
  owner's sign-off either way.
- **`DECISION(open)`: the idle drift is an infinite, compositor-only transform animation**
  (`translate` + `transform` keyframes on the foil band, dot screen and glare; §4), not the
  mockup's `@property` animation. It runs without JS, costs no rAF, and pauses with the loop
  (off-screen, hidden tab, `paused`). This is a Q39 carve-out from `docs/motion.md` rule 5 (idle
  decoration) for the integrator to record. Rule 2's property list is `translate`/`rotate`/`scale`;
  the y sweep animates `transform` (also compositor-only) so it composes with the x sweep. The
  mockup's `@property` drift restyled and repainted the card on the main thread every frame.
  Measured at rest with no input (headless, same machine; before = the `@property` drift):

  | Engine | Before | After |
  |---|---|---|
  | Chromium (CDP metrics, 3 s, PlayerCard / Roster) | ≈ 85–100 ms/s of main-thread task time, 180 style recalcs | 2–3 ms/s, 8–9 recalcs (style recalc ≈ 0–1 ms/s), 60 fps |
  | Firefox headless (software compositing, uncapped fps; blank page 166) | 112 fps (1 card) / 39 (Roster) | 76–80 / 26–27 |
  | WebKit, Windows build, DPR 2 (software; blank page 63) | 20 / 9 | 19 / 9 |

  "Before" is review round 1's measurement. In the software compositors every frame
  re-composites the card's blended layers. Moving them costs as much as repainting them (in
  Firefox, more). The cost hardly depends on layer size: shrinking the moving layers to the
  face changed nothing, and in WebKit a single animated layer costs as much as three. GPU
  compositing (desktop Chromium, Firefox with hardware WebRender, Safari) takes the work off the
  CPU. The available lever, if the owner wants it:
  `steps()` timing at about 10 updates/s. In headless Firefox it brings the drift back to about
  165 fps (1 card) / 114 (Roster), but it makes the slow drift visibly stepped and doesn't help
  this WebKit build. It is not applied.
- **`DECISION(open)`: the card is dark in both themes.** The face pins `data-theme="dark"` (the
  approved light mockup keeps the card on the always-dark stage color; `color-dodge` foil washes
  out on a light base). The accent hue, aura and focus ring follow the page theme. Revisit if the
  owner wants a light card variant.
- **`DECISION(open)`: `aria-roledescription="player card"` by default**, overridable by the native
  prop, rather than a dedicated prop.
- **`paused` prop** (review round 1): like BracketBeam, FlowField, Lightning and ParticleField. It
  is the app-level WCAG 2.2.2 control; the loop's own off-screen pause doesn't cover a page where
  the card stays in view. It is also the only way to stop the drift, because a root `className`
  can't reach the light layers.
- **Mixed input** (review round 1): the pointer and the keys keep separate targets. The mockup
  shared one target, so a pointer leaving a key-tilted card left it stuck at the pointer's aim
  until blur.
- Mono labels in the mockup (JetBrains Mono) become `font-sans tabular-nums` in the story art: no
  mono token exists (brief §7).
- The spring constants (ω 14 / 7.5, key step 0.34, 0.034 s step) and the tilt angles are the
  mockup's.
