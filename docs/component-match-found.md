# Component: MatchFound

> Follows the `docs/component-button.md` section template. **Server component** (no hooks, no
> directive) — CSS-only motion, RSC-safe. Approved in Q38/Q39 (showpieces & FX); port of the
> "Match found" mockup in the Sukuna FX Lab.

## 1. Purpose

The ready-check prompt a game client shows when the queue pops: a draining countdown ring, who on
the team has accepted, and the Accept / Decline actions. It is presentational: the app owns the
timer, the accept/decline requests and the screen-reader announcement, and passes the result back
in as `state` and `accepted`. The countdown runs in CSS from mount, so it works in Server
Components and before hydration.

## 2. Files

```
packages/ui/src/components/match-found/
├── match-found.styles.tsx   # tv() slots root/decor/panel/head/…/ring/dial/arc/slot/dot/actions + phase/state/fill. Pure. Server-safe.
├── match-found.logic.tsx    # forwardRef <section>; derives slots, status and phase from props. NO 'use client', no hooks.
├── match-found.test.tsx
├── match-found.stories.tsx
└── index.tsx                # export { MatchFound } ; export type { MatchFoundProps, MatchFoundState }
packages/ui/scripts/motion/match-found.ts   # @property/@keyframes/@utility → generated theme.css
test/browser/match-found.test.ts            # Playwright: countdown runs, steps under reduced motion, final frame
```

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

export type MatchFoundState = 'pending' | 'accepted' | 'declined' | 'expired'

export interface MatchFoundProps extends Omit<ComponentPropsWithoutRef<'section'>, 'title'> {
  title?: ReactNode          // default 'Match found'; a string is split into words for the title wipe and sized to fit its longest word
  eyebrow?: ReactNode        // small accent line over the title, with a live dot: "Ranked · 5v5"
  meta?: ReactNode           // one line under the title: map · region · average MMR
  headingLevel?: 'h2' | 'h3' | 'h4'   // default 'h2'
  seconds?: number           // default 12 — the accept window; the ring counts down from it (whole seconds, 1–3600)
  players?: number           // default 5 — one slot per player; the last slot is you
  accepted?: number          // default 0 — players ready so far, including you once state is 'accepted'
  state?: MatchFoundState    // default 'pending' — your answer, or 'expired' when the app's timer ran out
  status?: ReactNode         // overrides the status line ("2/5 ready", "All ready", "Declined", "Expired")
  timerLabel?: ReactNode     // default `Accept within ${seconds} seconds` — screen-reader text while pending
  unitLabel?: ReactNode      // default 'sec' — under the number
  youLabel?: ReactNode       // default 'You' — in your slot while pending
  children?: ReactNode       // the actions: put Accept first, then Decline
}
```

- **Plays on mount.** The countdown and the entrance run from the moment the element mounts. To
  restart (a new queue pop), change the React `key`. Changing `seconds` on a mounted instance
  re-times the running countdown instead of restarting it.
- **The app owns time.** `seconds` only drives the picture. Run your own timer, set
  `state="expired"` when it ends, and announce changes in your own `aria-live` region. On
  `expired` the countdown animations are removed, so the ring shows its final frame (0, drained)
  even if your timer and the CSS drifted apart.
- **Phases.** `accepted >= players` with `state="accepted"` is *all ready*: the ring freezes
  where it was and turns success green. `declined` freezes it grey. `accepted` alone keeps it
  running (others still have to accept).
- **Actions.** `children` is laid out as a row (Accept 1.5× wider on narrow widths, 150px minimum
  on wide). While `state="pending"`, the **first** action gets a decorative glow pulse and a light
  sheen (`::before` / `::after`, motion-safe only) — put the primary Accept first. The component
  never renders or disables buttons itself; disable yours once the player has answered.
- **Layout.** Fills its container's width and switches from stacked (narrow) to ring-left (from a
  460px container) with a container query. Bring the frame: a Card, a Dialog popup with `p-0`, or
  your own surface — the decoration (corner hatch, top accent line) sits on the component's edges.
- `id`: when set, the title gets `${id}-title` and the section is labelled by it (a named region).

Deliberately **not** in v1: a built-in timer or `onExpire` callback (the app owns time; a JS timer
would make it a client component), built-in Accept/Decline buttons (`children` keeps the app's own
Button, loading and disabled states), per-player avatars or names in the slots, a team-vs-team
layout (10 slots for 5v5 both sides), configurable urgency window (fixed to the last 3 seconds),
sound.

## 4. Variants → tokens

| Part | State | Tokens |
|---|---|---|
| eyebrow + live dot | always | `text-accent`, dot glow `--sk-accent-glow` |
| title | always | `font-display` 900, expanded, `text-text`; wipe bar `bg-accent` |
| meta | always | `text-text-dim` (consumer can color spans) |
| ring | running | arc + comet `currentColor` = `--sk-accent`, then `--sk-danger` for the last 3 s |
| ring | all ready | `--sk-success` (forced, frozen) |
| ring | declined | `--sk-text-faint` ring, `--sk-text-dim` number (forced, frozen) |
| ring | expired | `--sk-danger`, 0, drained, comet hidden |
| ring dial | always | disc `--sk-well`/40 + `--sk-line-soft`, ticks `--sk-line` / `--sk-text-faint`, track `--sk-line` |
| number | running | `--sk-text`, then `--sk-danger` for the last 3 s; `unit` `--sk-text-faint` |
| slot | waiting | `--sk-surface-2`, ring `--sk-line`, dashed spinner `--sk-text-faint` |
| slot | ready | `--sk-success` fill + glow, check `--sk-bg` |
| your slot | pending | ring + "You" `--sk-accent` |
| your slot | declined / expired | ring + ✕ `--sk-danger` |
| status | running / ready / lost | `--sk-text-dim` / `--sk-success` / `--sk-danger` |
| first action | pending | glow pulse `--sk-accent-glow`, sheen `--sk-on-accent`/40 |

No new color token. No mono token exists, so the eyebrow, status, unit and "You" label use
`font-sans` with tracking and `tabular-nums` (the mockup's JetBrains Mono is page-only). The ring
glow mixes `currentColor` at the mockup's per-theme strengths (halo 22% / drop-shadow 55% on dark,
9% / 30% on light) through the `match-found-glow` utility, keyed on the closest `data-theme` (the
mockup's `light-dark()` needs `color-scheme`, which the themes don't set).

Motion CSS, from `packages/ui/scripts/motion/match-found.ts` (emitted into the generated
`theme.css` by `scripts/build-tokens.ts`). Base styles are the **final frame**; every keyframe's
`from` holds the start, so seven keyframes cover the whole choreography by reading per-element
custom properties that each utility sets:

```css
@property --sk-match-found-n { syntax: '<integer>'; inherits: false; initial-value: 0; }

@keyframes sk-match-found-enter {   /* entrances and pulses: from a fade / offset / scale */
  from {
    opacity: var(--sk-match-found-o, 0);
    translate: var(--sk-match-found-t, 0 0);
    scale: var(--sk-match-found-s, 1);
  }
}
@keyframes sk-match-found-wipe {    /* title bar: grows from the left, leaves to the right */
  0% { scale: 0 1; transform-origin: left; }
  50% { scale: 1 1; transform-origin: left; }
  50.1% { scale: 1 1; transform-origin: right; }
  100% { scale: 0 1; transform-origin: right; }
}
@keyframes sk-match-found-count { from { --sk-match-found-n: 3600; } }   /* literal: see below */
@keyframes sk-match-found-sweep { from { stroke-dashoffset: 0; rotate: 0deg; } }
@keyframes sk-match-found-tint { from { color: var(--sk-match-found-from); } }
@keyframes sk-match-found-ping {
  from { opacity: var(--sk-match-found-o, 0.75); scale: var(--sk-match-found-s, 0.94); }
  to { opacity: 0; scale: var(--sk-match-found-s2, 1.55); }
}
@keyframes sk-match-found-glow {
  from { box-shadow: 0 0 0 0 var(--sk-accent-glow); }
  to { box-shadow: 0 0 var(--sk-match-found-blur, 0px) var(--sk-match-found-spread, 6px) transparent; }
}
```

| Utility | Element | Animation |
|---|---|---|
| `match-found-number` | number | `counter-reset` from `--sk-match-found-n`, drawn by `::after { content: counter() }` |
| `animate-match-found-count` | number | count 3600 → 0 over 3600 s, `steps(3600, end)`, delay `seconds − 3600` (so it shows `seconds` at mount and 0 at the end) + tint to danger at `seconds − 3` |
| `match-found-glow` | dial | sets `--sk-match-found-halo` / `--sk-match-found-shadow` per theme (not an animation) |
| `animate-match-found-urgent` | dial | tint accent → danger at `seconds − 3` |
| `animate-match-found-drain` | arc, comet | sweep over `seconds`, `var(--sk-match-found-ease, linear)` |
| `animate-match-found-spin` | waiting slot spinner | sweep 7 s linear infinite |
| `animate-match-found-scan` | top accent line | enter `scale: 0 1`, 900 ms |
| `animate-match-found-slide` | eyebrow | enter from −12px x, 420 ms |
| `animate-match-found-rise` | meta, slots, status, actions | enter from +10px y, 480 ms, delay `--sk-match-found-d` |
| `animate-match-found-show` / `-wipe` | title words / their bar | tint from transparent at `d + 310ms`; wipe 620 ms |
| `animate-match-found-pop-in` | ring | enter from `scale .82`, 700 ms overshoot |
| `animate-match-found-breathe` | ring halo | enter from `opacity .5`, 2.6 s alternate infinite |
| `animate-match-found-ping` / `-ping-urgent` / `-ping-ready` | ripple rings | ping ×2 on mount / ×3 in the last 3 s / ×2 when all ready |
| `animate-match-found-beat` | number | enter from `scale 1.14`, 1 s ×3 in the last 3 s |
| `animate-match-found-lock` | ring svg | enter from `scale 1.07` when all ready |
| `animate-match-found-pop` / `-burst` | a slot that fills | enter from `scale .7` overshoot / ping to `scale 2.2` |
| `animate-match-found-live` / `-pulse` | eyebrow dot / first action | glow 1.4 s / 1.6 s infinite |
| `animate-match-found-sheen` | first action `::after` | the existing `sk-shine` keyframe, 4.8 s linear infinite |

Every count/drain/tint animation ends its shorthand with `var(--sk-match-found-play, running)`, so
the root freezes them by setting `--sk-match-found-play: paused`.

The count keyframe is literal because Firefox doesn't interpolate a registered custom property
whose keyframe value uses `var()` (it stayed on the start value; Chromium and WebKit were fine).
Running 3600 → 0 over an hour with a negative delay of `seconds − 3600` gives the same one-step-a-
second countdown from `seconds` in all three engines, which is why `seconds` is capped at 3600.

## 5. States

| State | Behavior |
|---|---|
| mount | scan line, eyebrow, title wipe, ring pop-in + ripple, meta / slots / status / actions rise in a stagger (60 → 860 ms). |
| pending | ring drains and counts down once a second; the last 3 s turn danger with a ripple and a number beat each second. Your slot shows "You" with a dashed spinner; the first action pulses. |
| accepted | your slot fills (pop + burst); the countdown keeps running; the action emphasis stops. |
| all ready | `state="accepted"` and `accepted >= players`: ring + number + status turn success, the ring freezes where it was, one lock thump + ripple. Status "All ready". |
| declined | ring freezes grey; your slot shows ✕ in danger; status "Declined" in danger. |
| expired | countdown animations removed → final frame: 0, drained, danger, comet hidden; your slot ✕; status "Expired". |
| a teammate accepts (`accepted` +1) | that slot transitions to success with a pop and a burst ring (class change → the animation starts then). |
| prefers-reduced-motion | entrances, ripples, pulses, beat, sheen, spinner and pop/burst are off (`motion-safe:`); slot fills are instant. **The countdown keeps running** — the number and the ring step once per second (`steps(seconds, end)`), because the remaining time is information. |
| server / no-JS | identical: everything is CSS and starts when the HTML is parsed. |
| no `@property` support | the number can't interpolate, so it shows its final 0 while the ring still drains. |

## 6. Logic (`match-found.logic.tsx`)

- **No `'use client'`** — no hooks and no DOM access; the countdown is CSS. Guarded by the RSC
  boundary test in `packages/ui/src/index.test.ts`.
- `forwardRef<HTMLElement, MatchFoundProps>`; root `<section>`.
- Normalizes numbers: `seconds` and `players` round to whole numbers ≥ 1; `accepted` clamps to
  `[1, players]` once you accepted and to `[0, players − 1]` otherwise (you can't be ready before
  you answer). Teammate slots filled = `accepted − (you accepted ? 1 : 0)`.
- Derives `phase`: `ready` (accepted and everyone ready) | `declined` | `expired` | `running`.
- Sets `--sk-match-found-seconds` inline (unitless), then spreads the consumer `style`.
- A string `title` is split on whitespace into word spans with a 110 ms stagger
  (`--sk-match-found-d`); a node title is one span. For a string, the heading also gets
  `--sk-match-found-fit` = the longest word's length in characters, and the title's font size is
  `clamp(min, (head column width) / (fit × .95em), 27px | 46px)` in container units, so a long
  translated word ("Encontrada") shrinks the title instead of clipping. A node title keeps the full
  size.
- Slot `i` gets `--sk-match-found-d: 540 + 60·i ms`. The all-ready ripple is a separate element
  rendered only in that phase, so its animation starts when the phase starts.
- `data-state` and (when everyone is ready) `data-ready` on the root for app styling and tests.
- `id` → title `${id}-title` + `aria-labelledby` (a consumer `aria-labelledby` wins).

## 7. Styles (`match-found.styles.tsx`)

```ts
export const matchFoundStyles = tv({
  slots: {
    root: 'relative isolate grid w-full content-center overflow-hidden font-sans text-text @container motion-reduce:[--sk-match-found-ease:steps(var(--sk-match-found-seconds),end)]',
    decor: 'pointer-events-none absolute inset-0 before:… (corner hatch, radial mask) after:… (top accent line) motion-safe:after:animate-match-found-scan',
    panel: 'relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3.5 p-4.5 @min-[460px]:gap-x-7.5 @min-[460px]:gap-y-4 @min-[460px]:px-7.5 @min-[460px]:py-6',
    // head / eyebrow / title / word / meta / ring / dial / svg / disc / ticks / track / arc /
    // comet / ping / num / number / unit / side / slots / slot / dot / check / cross / you /
    // status / actions — see the source
  },
  variants: {
    actions: { true: { panel: "[grid-template-areas:'head_head'_'ring_side'_'act_act'] …" }, false: { … } },
    phase: { running: { … }, ready: { root: '[--sk-match-found-play:paused]', dial: 'text-success!', … }, declined: { … }, expired: { … } },
    pending: { true: { dial: 'motion-safe:before:animate-match-found-breathe', actions: '[&>:first-child]:… pulse + sheen' } },
  },
})

export const matchFoundSlotStyles = tv({
  slots: { slot, dot, check },
  variants: { fill: { waiting, ready, you, lost } },
})
```

Every class string is literal (rule 7). The countdown classes live in `phase` variants, never in
a base string, so `expired` can drop them without fighting a second `animate-*` class
(tailwind-merge doesn't know custom `animate-*` names).

## 8. Accessibility checklist

- [ ] Real heading (`headingLevel`, default `h2`) carries the title; `id` makes the section a named
      region.
- [ ] The ring, number, slots and ripples are `aria-hidden` decoration. Screen readers get the
      `sr-only` "Accept within N seconds" (while pending) and the visible status line
      ("2/5 ready", "All ready", "Declined", "Expired"), which never relies on color alone.
- [ ] No `aria-live` inside: the app announces changes in its own live region (documented, shown
      in the `InLobby` story) so announcements follow the app's real timer and requests.
- [ ] Actions are the consumer's real buttons; the pulse and sheen are pointer-transparent
      pseudo-elements that never cover the focus ring (box-shadow on `::before`, not the button).
- [ ] Reduced motion: decorative motion off; the countdown keeps stepping once per second.
- [ ] Contrast at rest: title `--sk-text`, meta/status `--sk-text-dim`, eyebrow `--sk-accent`,
      unit/waiting `--sk-text-faint` — all ≥ 4.5:1 on `--sk-surface` in both themes.
- [ ] No flashing (WCAG 2.3.1): the last-3-seconds ripple and beat are one per second, and
      ripples are thin rings, not full-area luminance flashes.

## 9. Tests

- Server-renders (`renderServer`) every `state` × all-ready, with the title, status and timer text.
- Root carries `data-state`, `data-ready` only when everyone is ready, and the inline
  `--sk-match-found-seconds` (rounded, 1–3600); consumer `style` merges after it.
- Status text per state; `status` / `timerLabel` / `unitLabel` / `youLabel` overrides.
- Slots: `players` slots, `accepted` fills teammates (clamped), your slot per `state`; slot rise
  delays set inline.
- Phase classes: running has count/urgent/drain; ready and declined keep them and pause
  (`--sk-match-found-play`) with forced colors; expired drops them; the ready ripple renders only
  when ready.
- Reduced motion: decorative animations are `motion-safe:`; the root carries the
  `motion-reduce:` steps timing; the countdown classes are unconditional.
- String title splits into word spans (accessible name intact) and sets `--sk-match-found-fit`;
  node title is one span without it; `headingLevel`; `id` → `aria-labelledby`.
- Actions: rendered in the row; the pending-only emphasis classes; no actions → no row.
- Native props pass through; ref forwards to the `<section>`; consumer `className` wins.
- `expectHydrates`; axe in both themes.
- Browser (`test/browser/match-found.test.ts`, passes in Chromium, Firefox and WebKit): story
  renders; count/drain run (`animation-name`, `--sk-match-found-n` registered as an integer,
  seeking the animations to 3.5 s shows 9); finishing lands on 0 and a drained ring; declined and
  all-ready pause the ring; expired has no countdown animation and shows 0; reduced motion keeps the
  count, steps the ring (`steps(12, end)`, a quarter drained at 3.5 s) and turns the entrances off
  at their final frame; the lobby story accepts; no console errors.

## 10. Stories

`Playground` (controls, in a 540px card), `InLobby` (a game-client lobby with the prompt as a
dialog over it: the story owns the timer, the teammates' accepts, Accept/Decline and an `aria-live`
region; Replay remounts with `key`), `States` (pending / accepted / all ready / declined /
expired side by side, also the reduced-motion review set), `Narrow` (a 340px phone-width card),
`CustomLabels` (another language through `title`, `status`, `timerLabel`, `unitLabel`,
`youLabel`; its long word shrinks the title). Ids: `components-matchfound--playground`,
`--in-lobby`, `--states`, `--narrow`, `--custom-labels`. Both themes via the toolbar.

## 11. Decisions

- Approved in `docs/questions.md` Q38 (the showpiece/FX scout) and Q39 (the build go-ahead).
- **CSS-only, presentational** (Q38/Q39, build brief §13): `seconds`, `players`, `accepted`,
  `state`, title/meta slots and `children` actions; the app owns the timer, the requests and the
  `aria-live` announcement. Plays on mount; replay with `key`.
- **Seven keyframes** (budget ≤ 8) instead of the mockup's 26: per-element custom properties feed
  one generic `enter`, one `ping`, one `tint`, one `glow` and one `sweep`; the sheen reuses the
  existing `sk-shine`. Slot fills use transitions (colour, check stroke) plus `enter`/`ping` on a
  class change.
- **Reduced motion keeps the countdown** (brief §3, critic W5): `--sk-match-found-ease` becomes
  `steps(seconds, end)` under `motion-reduce:`; everything decorative is `motion-safe:`.
- **Base styles are the final frame** (brief §2, §9): the number's base is 0, the arc is drained,
  the ring is danger red; `expired` removes the animations to show it.
- `// DECISION(open): first-action emphasis` — the pulse and sheen style the consumer's first
  action through `[&>:first-child]` pseudo-elements while pending. Alternative: a dedicated
  `MatchFound.Accept` part. Kept as children-only for v1.
- `// DECISION(open): urgency window` — the danger tint, ripple and beat start at
  `seconds − 3` (the mockup's 9 s of 12), fixed rather than a prop.
- **Ring glow per theme**: the mockup's `light-dark()` strengths come from the `match-found-glow`
  utility, which reads the closest `data-theme` (one level of nesting) because the themes don't set
  `color-scheme`.
- **Literal count keyframe** (Firefox, see §4): `seconds` is capped at 3600.
- No mono font token (brief §7): `font-sans` + tracking + `tabular-nums` where the mockup used
  JetBrains Mono.
- Storybook does not load Archivo; the stories load it from Google Fonts in a decorator (as
  `examples/showcase` does) so the review matches the mockup. A global `preview-head.html` is an
  integrator call.
