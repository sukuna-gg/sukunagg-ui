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

## Deferred (listed so they aren't forgotten)

Checkbox tick draw, Switch overshoot, Stepper connector fill, Button spinner cross-fade, Tooltip
`Provider` grouping, Skeleton shimmer. Skipped: staggered menu items, View Transitions, scroll/page
effects.
