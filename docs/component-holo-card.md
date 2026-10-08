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
├── holo-card.styles.tsx   # tv() slots root/scene/aura/floor/card/face/foil/glare + `intensity`. Pure.
├── holo-card.logic.tsx    # forwardRef focusable root (role="group") + layers; renders the island.
│                          # NO 'use client', no hooks.
├── holo-card.tilt.tsx     # 'use client' island: useFxLoop spring (pointer + arrow keys), writes
│                          # --sk-holo-card-x/-y/-a on its own element. Never re-renders per frame.
├── holo-card.test.tsx
├── holo-card.stories.tsx  # title 'FX/HoloCard': the example player card inside screen chrome
└── index.tsx              # export { HoloCard }; export type { HoloCardProps }
packages/fx/src/styles/holo-card.css       # @property, @keyframes sk-holo-card-drift, @utility (§4)
test/browser/holo-card.test.ts             # Playwright spec: drift, pointer + keyboard tilt, reduced
                                           # motion, no console errors
```

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

export interface HoloCardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'aria-label'> {
  /** Required: the card's accessible name, e.g. "ryomen, Duelist, rating 94, legendary card". */
  'aria-label': string
  /** How far it tilts and how bright the foil and glare get. Default 'normal'. */
  intensity?: 'subtle' | 'normal'
  /** The card art, painted on the card face under the foil and glare. */
  children?: ReactNode
}
```

- The root is a `<div>` with `role="group"`, `aria-roledescription="player card"` and
  `tabIndex={0}`, so keyboard users can focus it and tilt it with the arrow keys. All three can be
  overridden with your own native props (e.g. `aria-roledescription="reward card"`).
- `ref` points at that root. `className` merges last (tailwind-merge), so `className="w-64"`
  resizes the card; the default box is `w-50 aspect-[5/7]` (200 × 280 px).
- The aura and floor shadow paint up to 80 px outside the box (`pointer-events: none`); leave room
  around the card or clip it in your layout.
- **Theme.** The card itself is a dark collectible in both themes (its face pins
  `data-theme="dark"`, so the foil's `color-dodge` and the glare's `overlay` have a dark base to
  work on, as in the approved light mockup). The accent hue, the aura, and the focus ring follow
  the page theme. Art inside the card therefore resolves the **dark** `--sk-*` tokens.
- **CSS custom properties your art can read** (set on the card's scene, inherited by the art):

  | Property | Range | Meaning |
  |---|---|---|
  | `--sk-holo-card-x`, `--sk-holo-card-y` | −1 … 1 | Spring-smoothed tilt (pointer or keys); 0 at rest. Use for parallax: `translate: calc(var(--sk-holo-card-x) * 8px) 0`. |
  | `--sk-holo-card-a` | 0 … 1 | How "active" the card is (1 while hovered or key-tilted). |
  | `--sk-holo-card-hue`, `--sk-holo-card-deep` | color | The page-theme accent and accent-deep. |
  | `--sk-holo-card-ink`, `--sk-holo-card-base` | color | The card's bright ink and dark base. |

Deliberately **not** in v1: a `paused` prop (the loop already pauses off-screen and in hidden
tabs), gyroscope tilt (`deviceorientation` needs a permission prompt on iOS), rarity tiers or
custom foil patterns (Q38(c) rarity tokens are still open), `as` polymorphism, naming by
`aria-labelledby` alone, and a built-in frame, rating or name plate (that is art: see the stories).

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

No new color token. Durations are literal (the 14 s drift, the spring constants in §6), like
`sk-shine`; tunable as a patch pre-1.0.

The CSS module `packages/fx/src/styles/holo-card.css` (one `@property`, one keyframe, five
utilities; colors only through `var(--sk-*)`):

```css
@property --sk-holo-card-t {
  syntax: '<number>';
  inherits: false;
  initial-value: 0;
}

@keyframes sk-holo-card-drift {
  from { --sk-holo-card-t: 0; }
  to { --sk-holo-card-t: 1; }
}

/* One lap of the idle drift: it moves the foil and glare, never the card. */
@utility animate-holo-card-drift {
  animation: sk-holo-card-drift 14s linear infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
}

/* Tilt state, drift offsets (fading out while active), the light position, captured colors. */
@utility holo-card-scene {
  --sk-holo-card-x: 0;
  --sk-holo-card-y: 0;
  --sk-holo-card-a: 0;
  --sk-holo-card-hue: var(--sk-accent);
  --sk-holo-card-deep: var(--sk-accent-deep);
  --sk-holo-card-glow: var(--sk-accent-glow);
  --sk-holo-card-ring: var(--sk-focus-ring);
  --sk-holo-card-ex: calc(
    var(--sk-holo-card-x) + sin(var(--sk-holo-card-t) * 1turn) * 0.75 * (1 - var(--sk-holo-card-a))
  );
  --sk-holo-card-ey: calc(
    var(--sk-holo-card-y) + sin(var(--sk-holo-card-t) * 2turn) * 0.5 * (1 - var(--sk-holo-card-a))
  );
  --sk-holo-card-mx: calc(50% + var(--sk-holo-card-ex) * 50%);
  --sk-holo-card-my: calc(50% + var(--sk-holo-card-ey) * 50%);
  perspective: 900px;
  touch-action: pan-y;
  @media (prefers-reduced-motion: reduce) {
    --sk-holo-card-ex: -0.5;
    --sk-holo-card-ey: -0.55;
  }
}

/* The card: gradient rim, shadow, spring tilt (flat under reduced motion). */
@utility holo-card-edge { /* background radial-gradient at (mx, my); box-shadow; transform:
  translateZ(a·16px·tilt) rotateX(y·−14°·tilt) rotateY(x·17°·tilt) */ }
@utility holo-card-foil { /* color-dodge dot screen + rainbow band, masked around (mx, my) */ }
@utility holo-card-glare { /* overlay radial highlight at (mx, my); reduced motion: a fixed
  diagonal sheen */ }
```

The full bodies are in the CSS module; every value above is a `var(--sk-*)` or a number.

## 5. States

| State | Behavior |
|---|---|
| server / no-JS | The card renders flat with its foil and glare; the drift still runs (pure CSS) and the focus ring still shows. No tilt. `data-state` is absent. |
| default (rest) | Flat card. The foil and glare drift one lap every 14 s (`--sk-holo-card-t`, a registered `<number>`). The loop is `running` but settled: no frames are requested. |
| hover | The card springs toward the pointer (ω = 14 rad/s, critically damped), lifts 16 px, and the foil and glare follow the pointer and brighten. The drift fades out while active. |
| focus-visible | A 2 px page-theme ring on the card (it tilts with the card); the root's own outline is suppressed. |
| arrow keys | Each press nudges the target by 0.34 on that axis (clamped to ±1) and lights the card. `Escape` or `Home` (and blur) let it spring back. Only keys pressed on the card itself count; keys typed inside interactive art are ignored. |
| pointer leave / blur | Springs back to flat (ω = 7.5 rad/s, softer) and settles; no frames once settled. |
| off-screen / hidden tab | The loop reports `paused` and stops; the CSS drift pauses too (`data-[state=paused]`). |
| prefers-reduced-motion | `data-state="still"`: flat card, no drift, a fixed diagonal sheen instead of the moving glare. Pointer and arrow keys don't tilt (arrows keep their default scrolling). Follows the OS setting live. |
| no `@property` | The drift can't interpolate a custom property; `sin(0)` and `sin(1turn)` are both 0, so the sheen simply rests. Tilt still works. |

## 6. Logic (`holo-card.logic.tsx`)

- **No `'use client'`**, no hooks, no DOM access: guarded by the RSC test in
  `packages/fx/src/index.test.ts`, which pins `holo-card.tilt.tsx` as the only client module here.
- `forwardRef<HTMLDivElement, HoloCardProps>`; destructures `intensity`, `className`, `children`.
- Renders the root `<div data-sk-fx="holo-card" role="group" aria-roledescription="player card"
  tabIndex={0}>` (defaults first, then `...rest`, so native props override), then
  `<HoloCardTilt>` (the scene) with: the aura, the floor (`data-theme="dark"`), and the card
  (`data-theme="dark"`) holding the face (children), the foil and the glare. Every decorative layer
  is `aria-hidden="true"`.
- Only serializable props cross into the island: a class string and `children`.

**The island (`holo-card.tilt.tsx`, `'use client'`):**

- `useFxLoop` on the scene element (which receives `data-state`). The ticker keeps `x`, `y`, `a`
  and their velocities, integrates a critically damped spring per axis
  (`v += (ω²·d − 2ω·v)·h; x += v·h`, `h = min(dt, 0.034)`), snaps an axis once
  `|d| < 6e-4` and `|v| < 4e-3`, writes `--sk-holo-card-x/-y/-a` with `style.setProperty`, and
  returns `false` when every axis has settled, so the page schedules no frames at rest.
- `still` (reduced motion): resets the targets and paints the flat state once.
- Pointer: `pointerenter`/`pointermove`/`pointerdown` aim at the pointer (relative to the scene's
  box; a zero-size box is ignored); `pointerleave`/`pointercancel` let go. Every input calls the
  stable `wake()`.
- Keyboard: `keydown` and `blur` listeners on the focusable root (`scene.parentElement`), added in
  `useEffect` and removed on unmount. Arrow keys `preventDefault()` only when they tilt; `Home`
  is prevented (it would scroll the page); `Escape` is not (a surrounding dialog may close).
- No `Math.random`, no React state, no re-render per frame. The first client render equals the
  server HTML, so hydration matches.

## 7. Styles (`holo-card.styles.tsx`)

```ts
import { tv, type VariantProps } from '../../utils/tv'

export const holoCardStyles = tv({
  slots: {
    root: 'group/holo relative isolate block aspect-[5/7] w-50 shrink-0 outline-none',
    scene: [
      'holo-card-scene absolute inset-0',
      'animate-holo-card-drift motion-reduce:animate-none',
      'data-[state=paused]:[animation-play-state:paused]',
    ],
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
    glare: 'holo-card-glare pointer-events-none absolute inset-0',
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

- `animate-holo-card-drift` is registered in `packages/fx/src/utils/tw-merge-config.ts`
  (`animateKeys`), so a consumer's `animate-none` wins. No utility is named `bg-*` (the aura and
  floor use arbitrary `bg-[radial-gradient(…)]`, which tailwind-merge reads as an image).
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
      is decorative, so no announcement is needed.
- [ ] Reduced motion: no drift, no tilt, a static sheen; arrow keys fall back to page scrolling.
- [ ] WCAG 2.3.1: no flashing. The glare brightens smoothly over a spring, far below 3 flashes/s.
- [ ] Touch: `touch-action: pan-y`, so vertical scrolling over the card still scrolls the page.
- [ ] axe: zero violations in both themes (unit) and in the stories (Storybook a11y addon).

## 9. Tests

`holo-card.test.tsx` (bun test + happy-dom + `test/fx.ts` `installFxEnv`):

- Server render: the root's role, roledescription, tabindex, label and `data-sk-fx`; the art's
  text; every decorative layer `aria-hidden`; no `data-state`; both intensities map to their
  literal classes; the drift carries `motion-reduce:animate-none`.
- Native props pass through, `intensity` doesn't leak, `className` merges (`w-64` replaces
  `w-50`), `ref` forwards, `aria-roledescription` and `tabIndex` can be overridden.
- Hydrates without warnings (`reducedMotion: true` + `flushEffects()`).
- Loop: `paused` until on screen, then `running`; settled at rest (no pending frames); unmount
  leaves no pending frames and removes the key listeners.
- Pointer: aims at the pointer (`--sk-holo-card-x/-y/-a` move toward the target over frames and
  settle there), springs back to 0 on leave, ignores a zero-size box.
- Keyboard: arrows tilt and `preventDefault`, repeated presses clamp at ±1, `Escape`/`Home` and
  blur reset, other keys and keys from inside the art are ignored.
- Reduced motion: `still`, flat, pointer and arrows ignored (arrows not prevented); switching it on
  live flattens a tilted card.
- axe in both themes.

`test/browser/holo-card.test.ts` (Playwright, `fx-holocard--*`): the story renders and settles with
0 frames; the drift animates `--sk-holo-card-t`; the pointer and arrow keys change the tilt
properties and the card's transform, and it settles back; reduced motion gives `still`, no drift,
a flat card, and no frames; no console errors.

## 10. Stories

`FX/HoloCard` (ids `fx-holocard--<story>`): `Playground` (controls: `intensity`, `aria-label`),
`PlayerCard` (the mockup screen: grid stage, the example card, an eyebrow, the hint that switches
under reduced motion, and arrow-key caps that light up as you press them), `Intensities` (subtle
and normal side by side), `Roster` (three cards in a row: tab between them). The example card art
(rating, tier, emblem, slash lines, name plate, inner frame) lives in the story file and shows how
art reads `--sk-holo-card-*` for parallax.

## 11. Decisions

- Approved in **Q38/Q39** (owner: "holy shit, let's build the components"): HoloCard ships in the
  new opt-in `@sukunagg/fx`, as a server component plus one client island on the shared loop.
- **Card flat at rest** (build brief): the idle drift moves only the foil and glare; the mockup's
  35% drift tilt was dropped, so a resting card never moves and the loop schedules no frames.
- **`DECISION(open)`: the card is dark in both themes.** The face pins `data-theme="dark"` (the
  approved light mockup keeps the card on the always-dark stage color; `color-dodge` foil washes
  out on a light base). The accent hue, aura and focus ring follow the page theme. Revisit if the
  owner wants a light card variant.
- **`DECISION(open)`: `aria-roledescription="player card"` by default**, overridable by the native
  prop, rather than a dedicated prop.
- **`DECISION(open)`: idle drift is a CSS `@property` animation** (`--sk-holo-card-t`, 14 s,
  main-thread style recalc of the card subtree), not a loop frame, so it runs without JS and costs
  no rAF. It pauses with the loop off-screen. This is one of the Q39 carve-outs from
  `docs/motion.md` rules 2 and 5 (custom-property animation, idle decoration) that the integrator
  records.
- `--sk-holo-card-t` is `inherits: false`: every value derived from it is computed on the scene
  element that animates it, and children inherit the substituted results.
- Mono labels in the mockup (JetBrains Mono) become `font-sans tabular-nums` in the story art: no
  mono token exists (brief §7).
- The spring constants (ω 14 / 7.5, key step 0.34, 0.034 s step cap) and the tilt angles are the
  mockup's.
