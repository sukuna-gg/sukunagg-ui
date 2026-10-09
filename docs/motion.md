# Motion — sukuna-ui

How components animate. Owner request "add animations" (2026-09-27, `docs/questions.md` Q20).
This is the spec for the v1.3 motion wave; every component doc links here for its motion.

## Rules

1. **CSS only.** Transitions, `data-[starting-style]` / `data-[ending-style]` (Base UI's mount/unmount
   hooks), Tailwind `starting:` (`@starting-style`) and `@utility` keyframes in `theme.css`. No
   animation library, no JS timers, nothing that changes server HTML — zero bundle cost, SSR-safe.
2. **Compositor-friendly properties only:** `opacity`, `translate`, `scale`, `rotate`. Height is
   allowed only where Base UI measures it (`--accordion-panel-height`, `--collapsible-panel-height`).
3. **Name the real property.** Tailwind v4 compiles `scale-*` / `translate-*` to the standalone CSS
   `scale` / `translate` properties, **not** `transform`. A `transition-[…,transform]` list never
   animates them (this silently broke popup/dialog scale-in, Button press and Card lift before
   v1.3). Always list `scale` / `translate` explicitly.
4. **Every animation has a `motion-reduce:` fallback** (instant state change, no loops) and is
   covered by the reduced-motion Playwright spec.
5. **Motion carries meaning:** feedback (it responded), continuity (where it came from / went),
   or state (what changed). No idle decoration.

## Tokens

| Token | Value | Utility | Use |
|---|---|---|---|
| `--sk-duration-fast` | 120ms | `duration-fast` | hover, press, small popups |
| `--sk-duration-base` | 200ms | `duration-base` | dialogs, panels, indicators |
| `--sk-duration-slow` | 320ms | `duration-slow` | **new** — toast stack, large moves |
| `--sk-ease` | `cubic-bezier(.2,.8,.2,1)` | `ease-sukuna` | default deceleration |
| `--sk-ease-spring` | `linear(…)` (≈2% overshoot) | `ease-spring` | **new** — sliding indicators, switch thumb |

New keyframe utility: `animate-indeterminate` (`sk-indeterminate`: a 40%-wide bar sliding across
the track, 1.4s, infinite) for indeterminate Progress. Both new tokens need no theme split.

## What animates (v1.3 motion wave)

| # | Component | Motion | Hook |
|---|---|---|---|
| 1 | Tabs | the selected underline (horizontal) / right bar (vertical) **slides** to the new tab | Base UI `Tabs.Indicator` → `--active-tab-left/width/top/height`, `ease-spring` |
| 2 | Accordion | panels **animate height** open/closed (was an instant snap) | `--accordion-panel-height` + `data-[starting/ending-style]:h-0` |
| 3 | Menu, ContextMenu, Select, Combobox, Popover, Tooltip, HoverCard, RowActions | **directional entrance**: fade + scale + 4px slide *from the trigger side* | popup `data-side` × `data-[starting-style]` |
| 4 | Toast | **stacked deck**: older toasts peek behind the newest (scaled, offset); hover/focus **expands** the stack; **swipe** right/down to dismiss | Base UI `--toast-index`, `--toast-offset-y`, `--toast-swipe-movement-*`, `data-expanded` |
| 5 | Meter, Progress | determinate bar **grows in** on mount; indeterminate becomes a **sliding bar** (was a pulse) | `starting:scale-x-0` (origin-left), `animate-indeterminate` |
| — | Dialog, AlertDialog, Popover, menus, Button, Card | **fix**: scale/translate now actually transition | rule 3 |
| 6 | Badge (`pulse`, charts & stats wave 1, Q32) | the live dot **blinks** and a ring **ripples** out of it | Tailwind built-ins `motion-safe:animate-pulse` + `motion-safe:after:animate-ping` (no new keyframes) |

Reduced motion: indicators jump, panels snap, popups/toasts appear without slide/scale, bars
render at their value, indeterminate shows a static partial bar, the Badge live dot is still.

## Showpieces (Q38, Q39): a deliberate carve-out

The nine showpiece components exist to be decoration, so they bend three of the rules above. They
are opt-in components; nothing here is added to an existing component.

| Rule | How showpieces bend it | Bound |
|---|---|---|
| 1. CSS only | ScrambleText decodes in a `'use client'` island driven by `requestAnimationFrame`. | One island; the server and no-JS render the real text, reduced motion shows it at once. |
| 2. Compositor-only properties | `background-position` (RetroGrid floor), registered `@property` angles and integers (BorderBeam, AvatarFrame rings, MatchFound and XpLevelUp counters), `offset-distance` (AvatarFrame sparks), `clip-path` (GlitchText slices). | Small painted areas only; never a full-page layer. |
| 5. No idle decoration | RetroGrid, BorderBeam, AvatarFrame and GlitchText loop while visible. | Reduced motion stops every loop on a designed rest frame; GlitchText stays under 3 flashes a second (WCAG 2.3.1). |

What every showpiece still guarantees:
- **The base style is the final frame.** Each keyframe's `from` holds the hidden or initial state, so
  reduced motion, no `@property` support and no JS all land on the finished look. One-shot reveals
  (RankReveal, MatchFound, LootReveal, XpLevelUp, ScrambleText) play on mount; replay by changing `key`.
- **Information keeps going under reduced motion.** MatchFound's countdown steps once a second instead
  of sweeping; only the decorative pulse stops.
- **Numbers drawn by CSS counters are `aria-hidden`**, with the real value in `sr-only` text.
- **Names:** `@property --sk-<component>-*`, `@keyframes sk-<component>-*`, `@utility animate-<component>-*`,
  one module per component in `packages/ui/scripts/motion/` (emitted into `theme.css` by `build-tokens.ts`).

Canvas, WebGL and pointer effects are not allowed in `@sukunagg/ui` at all; they live in the opt-in
`@sukunagg/fx` package (Q39), which has its own loop rules.

## Deferred (listed so they aren't forgotten)

Checkbox tick draw, Switch overshoot, Stepper connector fill, Button spinner cross-fade, Tooltip
`Provider` grouping, Skeleton shimmer. Skipped: staggered menu items, View Transitions, scroll/page
effects.
