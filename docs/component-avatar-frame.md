# Component: AvatarFrame

> Follows the `docs/component-button.md` template. **Server component** (no hooks, no directive) —
> CSS-only motion (`docs/motion.md`). Approved in Q38/Q39 (showpieces & FX, `@sukunagg/ui` tier).

## 1. Purpose

Decorates a circular avatar with an animated frame: a crimson comet ring that circles it, a bone
"premium" ring with a passing sheen and orbiting sparks, a live-broadcast halo with a LIVE pill, and
an online/offline status dot cut cleanly out of the ring. It wraps any round child (usually
`<Avatar>`), scales with that child's size, and is pure CSS, so it renders in Server Components and
holds a still, finished frame under `prefers-reduced-motion`.

## 2. Files

```
packages/ui/src/components/avatar-frame/
├── avatar-frame.styles.tsx   # tv() slots root/back/cut/layers/halo/ripple/glow/glowRing/track/hair/
│                             #   ring/head/sheen/avatar/front/orbit/spark/status/pill/pillDot + tone/
│                             #   live/status variants, and the three literal spark orbits. Pure.
│                             #   Server-safe.
├── avatar-frame.logic.tsx    # forwardRef <span>; renders the decorative layers around `children`.
│                             #   NO 'use client' (no hooks, no DOM access).
├── avatar-frame.test.tsx     # bun test + happy-dom: classes, a11y, SSR, hydration, axe
├── avatar-frame.stories.tsx  # Components/AvatarFrame: the frame inside story-only screen chrome
└── index.tsx                 # export { AvatarFrame } ; export type { AvatarFrameProps, AvatarFrameStatus, AvatarFrameTone }
packages/ui/scripts/motion/avatar-frame.ts  # its @keyframes / @utility CSS → generated theme.css
test/browser/avatar-frame.test.ts           # Playwright: loops run and turn; cut-out applied and
                                            #   sized for large avatars; reduced motion = still
                                            #   frame; no console errors
```

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

export type AvatarFrameTone = 'accent' | 'premium'
export type AvatarFrameStatus = 'online' | 'offline'

interface AvatarFrameOwnProps {
  /** The round thing being framed — usually an <Avatar>. Phrasing content (the root is a <span>). */
  children: ReactNode
  tone?: AvatarFrameTone        // default 'accent' — crimson comet ring | bone metal ring + sheen
  live?: boolean                // default false — breathing halo, ripple, LIVE pill; accent ring goes solid
  liveLabel?: ReactNode         // default 'Live' — visible pill text (real text, read by AT)
  sparks?: boolean              // default false — three bone sparks orbiting the ring
  status?: AvatarFrameStatus    // default undefined — no dot. Dot is cut out of ring + avatar
  statusLabel?: string          // default 'Online' | 'Offline' — visually hidden; '' renders none
}

export type AvatarFrameProps =
  AvatarFrameOwnProps & Omit<ComponentPropsWithoutRef<'span'>, 'children'>
```

- **Size comes from the child.** The frame adds a 3px ring + 3px gap around whatever it wraps
  (`<Avatar size="sm">` → 44px frame, an 88px avatar → 100px frame). Every effect is measured in
  container units of the frame (`cqw`), so the glow, halo, sparks, comet head, status dot, pill and
  the status cut-out scale with it (the 3px ring itself stays 3px).
- **The 6px pad is load-bearing; don't override the root's padding.** The status dot and its cut-out
  find the avatar's edge from the frame box as `100cqw - 12px` (the avatar's width) and
  `50cqw - 7px` (the dot's centre, 1px inside the avatar's edge). A different padding (`p-[10px]`)
  shrinks the avatar inside the frame while the dot and the hole through the ring layers stay put,
  ≈ 3px off the avatar's edge and out of line with the avatar's own cut-out. Spacing and alignment
  overrides (`ml-2`, `align-top`) are fine.
- **Effects paint outside the layout box; leave room around it.** Only the frame box takes layout
  space. The live halo reaches ≈ 23% of the frame's width past each edge at its widest, the outer
  spark orbit ≈ 20%, the glow less; the LIVE pill (11px type at line-height 1 on a 100px frame,
  8px below ~73px) hangs half its height below the bottom edge: ≈ 8.5px on a 100px frame, ≈ 6px on
  small ones. Neighbours and captions closer than that get painted over, so space frames (and their
  captions) by at least ~20% of the frame plus the pill. In a tight grid, give the avatar a smaller
  size rather than letting frames overlap (the Showcase story does this with a container query).
- **Plays on mount, loops forever** (they are ambient decorations, not one-shot reveals). There is
  nothing to replay. Pause it by not rendering the variant (e.g. `live={false}`).
- **`--sk-avatar-frame-backdrop`** (optional CSS variable, default `var(--sk-surface)`): the colour of
  the 3px separator ring around the LIVE pill. Set it when the frame sits on another surface, e.g.
  `className="[--sk-avatar-frame-backdrop:var(--sk-bg)]"`. The status dot needs no backdrop — its gap
  is a transparent cut-out.
- **`--sk-avatar-frame-delay`** (optional CSS variable, default `0s`): shifts every loop of one frame.
  Frames mount together, so a list of comets would turn in lockstep; give each a different negative
  delay to start it mid-cycle, e.g. `className="[--sk-avatar-frame-delay:-1.1s]"`, or per item
  ``style={{ '--sk-avatar-frame-delay': `${-i * 0.7}s` } as CSSProperties}``. Reduced motion ignores
  it (no loops run).
- **Put the link or button around the frame, not inside it.** With `status`, the avatar slot carries
  the cut-out mask, which clips everything painted outside the child's own box, including a focus
  outline. `<a href><AvatarFrame>…</AvatarFrame></a>` keeps the focus ring visible;
  `<AvatarFrame><a href><Avatar /></a></AvatarFrame>` would clip it.
- `data-sk-avatar-frame`, `data-tone`, `data-live` and `data-status` are set on the root for styling
  hooks and tests.

Deliberately **not** in v1: a `size` prop (the child sets it), a `color` prop or arbitrary ring
colours (two tones on brand tokens), `away`/`busy`/`in-game` statuses (only online/offline have a
token-backed colour + shape pair today), a configurable spark count or speed, a viewer count inside
the pill (put it in the caption next to the avatar), and pausing offscreen (CSS animations of
`rotate`/`scale`/`opacity` are compositor work; the browser already skips offscreen paint).

## 4. Variants → tokens

| Prop | Layer | Tokens |
|---|---|---|
| `tone="accent"` | comet ring (conic, turns 3.2s), 8% track, blurred glow, white-hot head dot (6px with a 7px + 18px glow on a 100px frame; smaller on smaller frames, never larger) | `--sk-accent`, `--sk-accent-deep`, `--sk-accent-glow`, hot = `color-mix(accent 55%, --sk-text)` |
| `tone="premium"` | metal ring (static conic), sheen sweep (5.5s, eased), 1px hairline, soft glow | `--sk-premium`, `--sk-premium-dim`, `--sk-on-accent` (highlights) |
| `live` | breathing halo (2.8s), ripple ring (3.2s), LIVE pill with blinking dot (1.4s); accent ring turns solid | `--sk-accent`, `bg-gradient-accent` + `--sk-on-accent` (pill), `--sk-surface` (pill separator) |
| `sparks` | three four-point stars with tails orbiting at 3.7s / 6.1s (reverse) / 9.3s | `--sk-premium` (star, tail, `drop-shadow` at 60%); core = `color-mix(premium 55%, --sk-text)` (light core on dark, dark core on light) |
| `status="online"` | filled dot with a soft highlight, cut out of ring + glow + avatar | `--sk-success`, `--sk-on-accent` |
| `status="offline"` | hollow ring dot (shape differs, not just colour) | `--sk-text-faint` |

No new colour token. Masks use `black`/`transparent` (alpha only, not a colour). Motion CSS lives in
`packages/ui/scripts/motion/avatar-frame.ts` and is emitted into the generated `theme.css`:

```css
/* One turn keyframe for every rotating layer; it starts from the layer's rest angle
   (--sk-avatar-frame-phase), so t=0 IS the reduced-motion still frame. */
@keyframes sk-avatar-frame-turn {
  from { rotate: var(--sk-avatar-frame-phase, 0deg); }
  to   { rotate: calc(var(--sk-avatar-frame-phase, 0deg) + 360deg); }
}
@keyframes sk-avatar-frame-breathe { from { scale: 0.94; opacity: 0.4; } to { scale: 1.04; opacity: 1; } }
@keyframes sk-avatar-frame-ripple  { from { scale: 1; opacity: 0.7; } to { scale: 1.42; opacity: 0; } }
@keyframes sk-avatar-frame-blink   { to { opacity: 0.3; } }

/* Every loop takes var(--sk-avatar-frame-delay, 0s) as its delay (written $delay below). */
@utility animate-avatar-frame-spin    { rotate: var(--sk-avatar-frame-phase, 0deg); animation: sk-avatar-frame-turn 3.2s linear $delay infinite; }
@utility animate-avatar-frame-sheen   { rotate: var(--sk-avatar-frame-phase, 0deg); animation: sk-avatar-frame-turn 5.5s cubic-bezier(0.45, 0, 0.55, 1) $delay infinite; }
@utility animate-avatar-frame-orbit   { rotate: var(--sk-avatar-frame-phase, 0deg); animation: sk-avatar-frame-turn var(--sk-avatar-frame-t, 6s) linear $delay infinite var(--sk-avatar-frame-dir, normal); }
@utility animate-avatar-frame-breathe { animation: sk-avatar-frame-breathe 2.8s cubic-bezier(0.45, 0, 0.55, 1) $delay infinite alternate; }
@utility animate-avatar-frame-ripple  { animation: sk-avatar-frame-ripple 3.2s cubic-bezier(0.2, 0.6, 0.3, 1) $delay infinite; }
@utility animate-avatar-frame-blink   { animation: sk-avatar-frame-blink 1.4s ease-in-out $delay infinite alternate; }

/* Paint + geometry that can't be a plain utility (gradients, masks, pseudo-element shapes):
   avatar-frame-band (ring-shaped mask, width --sk-avatar-frame-bw, default 3px),
   avatar-frame-comet / -comet-glow / -metal / -sheen / -halo (conic + radial fills),
   avatar-frame-head (the comet's head dot: clamp(4px, 6cqw, 7px), glow min(18px, 18cqw)),
   avatar-frame-spark (star + tail),
   avatar-frame-status / -online / -offline (dot size, 45° position, fill),
   avatar-frame-cutout / -cutout-avatar (the status hole through the ring layers and through the
   avatar itself). */
```

Every animated property is `rotate`, `scale` or `opacity` (compositor-only, `docs/motion.md` rule 2):
the ring turns as an element (its status hole lives on a static parent), and sparks ride a rotating
orbit instead of an `offset-path`. Four keyframes, no `@property`.

## 5. States

| State | Behavior |
|---|---|
| default (`accent`) | comet ring + glow + head dot circle the avatar clockwise every 3.2s. |
| `premium` | metal ring is still; a white sheen sweeps around it every 5.5s (eased). |
| `sparks` | three sparks orbit at three radii and speeds, one counter-clockwise. |
| `live` | halo breathes, a ripple ring expands and fades, the pill dot blinks (≤ 1 blink/s). Accent ring is solid. |
| `status` | dot at the avatar's 45° bottom-right edge; ring, glow and avatar are cut around it (transparent gap). |
| hover | the glow brightens (`opacity` transition, `--sk-duration-slow`). |
| `prefers-reduced-motion` | every loop stops on its rest frame: ring + head at 40°, sheen at −20°, sparks parked at three points, halo at 70%, ripple hidden, pill dot solid. Nothing is hidden. |
| no `@property` / old engines | nothing depends on `@property`; container units (`cqw`) need Chrome 105 / Safari 16 / Firefox 110. |

## 6. Logic (`avatar-frame.logic.tsx`)

- **No `'use client'`**: no hooks, no DOM access, no ids; RSC-safe (guarded by the RSC boundary test
  in `packages/ui/src/index.test.ts`).
- `forwardRef<HTMLSpanElement, AvatarFrameProps>`; the ref is the root `<span>`.
- Destructures `tone`, `live`, `liveLabel`, `sparks`, `status`, `statusLabel`, `className`,
  `children` so none leak to the DOM; the rest spreads onto the root.
- Structure: root `<span>` (inline-grid, sized by the child + a 6px pad: 3px ring + 3px gap; the
  status geometry assumes that pad, see §3) →
  **back** (`aria-hidden`, covers the frame box, a size container) → **cut** (bleeds
  `max(24px, 30cqw)` past the frame: it scales with the frame, so the glow's blur and the halo at
  its widest fade out inside the mask box at any size; carries the status cut-out) → **layers** (back
  on the frame box: halo, ripple, glow, track/hair, ring, head/sheen). Then the **avatar** slot (`children`, the
  only part that takes the pointer; masked by the status hole) and the **front** layers (sparks,
  status dot, sr-only status, LIVE pill) on top, unmasked. Front renders only when one of
  `sparks`/`status`/`live` is set.
- Status text: `<span class="sr-only">{statusLabel}</span>` after the child (default 'Online' /
  'Offline'; `''` renders nothing). The dot itself is `aria-hidden`.
- The three spark orbits are fixed literal slots (radius, speed, direction, rest angle) — no
  randomness, so server and client markup match.

## 7. Styles (`avatar-frame.styles.tsx`)

```ts
export const avatarFrameStyles = tv({
  slots: {
    root: 'group/avatar-frame relative isolate inline-grid shrink-0 place-items-center p-[6px] align-middle',
    back: 'pointer-events-none absolute inset-0 @container-[size]',
    cut: 'absolute -inset-[max(24px,30cqw)]',
    layers: 'absolute inset-[max(24px,30cqw)]',
    halo: 'absolute -inset-[20cqw] rounded-full opacity-70 avatar-frame-halo animate-avatar-frame-breathe motion-reduce:animate-none',
    ripple: 'absolute inset-0 rounded-full border-[1.5px] border-accent opacity-0 animate-avatar-frame-ripple motion-reduce:animate-none',
    glow: 'absolute inset-0 rounded-full blur-[max(4px,7cqw)] opacity-75 transition-opacity duration-slow ease-sukuna group-hover/avatar-frame:opacity-100 motion-reduce:transition-none',
    glowRing: 'absolute inset-0 rounded-full avatar-frame-band [--sk-avatar-frame-bw:5px]',
    track: 'absolute inset-0 rounded-full bg-accent/8 avatar-frame-band',
    hair: 'absolute -inset-[6cqw] rounded-full border border-premium/28',
    ring: 'absolute inset-0 rounded-full avatar-frame-band',
    head: 'absolute inset-0 avatar-frame-head [--sk-avatar-frame-phase:33deg] animate-avatar-frame-spin motion-reduce:animate-none',
    sheen: 'absolute inset-0 rounded-full avatar-frame-band avatar-frame-sheen [--sk-avatar-frame-phase:-20deg] animate-avatar-frame-sheen motion-reduce:animate-none',
    avatar: 'pointer-events-auto relative grid place-items-center rounded-full',
    front: 'pointer-events-none absolute inset-0 @container-[size]',
    orbit: 'absolute rounded-full animate-avatar-frame-orbit motion-reduce:animate-none',
    spark: 'avatar-frame-spark',
    status: 'avatar-frame-status',
    pill: [
      'absolute top-full left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center …',
      // leading-none after the size: tailwind-merge drops a leading-* that precedes a text-* size
      'font-display font-bold uppercase tracking-[.14em] text-[length:clamp(8px,11cqw,11px)] leading-none',
      'bg-gradient-accent text-on-accent',
      'shadow-[0_0_0_3px_var(--sk-avatar-frame-backdrop,var(--sk-surface)),0_6px_16px_-4px_var(--sk-accent-glow)]',
    ],
    pillDot: 'size-[.45em] shrink-0 rounded-full bg-current animate-avatar-frame-blink motion-reduce:animate-none',
  },
  variants: {
    tone: {
      accent: {},
      premium: { glow: 'opacity-45', glowRing: 'bg-premium', ring: 'avatar-frame-metal' },
    },
    live: { true: {}, false: {} },
    status: {
      online: { cut: 'avatar-frame-cutout', avatar: 'avatar-frame-cutout-avatar', status: 'avatar-frame-online' },
      offline: { cut: 'avatar-frame-cutout', avatar: 'avatar-frame-cutout-avatar', status: 'avatar-frame-offline' },
    },
  },
  compoundVariants: [
    // accent × !live → the comet: ring + glow ring turn together, resting at 40deg
    {
      tone: 'accent',
      live: false,
      class: {
        glow: 'opacity-90 blur-[max(4px,9cqw)]',
        glowRing: 'avatar-frame-comet-glow [--sk-avatar-frame-phase:40deg] animate-avatar-frame-spin motion-reduce:animate-none',
        ring: 'avatar-frame-comet [--sk-avatar-frame-phase:40deg] animate-avatar-frame-spin motion-reduce:animate-none',
      },
    },
    // accent × live → the halo carries the motion; the ring holds solid
    { tone: 'accent', live: true, class: { glowRing: 'bg-accent', ring: 'bg-accent' } },
  ],
  defaultVariants: { tone: 'accent', live: false },
})

// The three spark orbits: literal per-orbit classes (rule 7), fixed so SSR and client match.
export const avatarFrameOrbits = [
  { orbit: '-inset-[2cqw] [--sk-avatar-frame-t:3.7s] [--sk-avatar-frame-phase:140deg]', spark: '' },
  {
    orbit: '-inset-[8cqw] [--sk-avatar-frame-t:6.1s] [--sk-avatar-frame-phase:259deg] [--sk-avatar-frame-dir:reverse]',
    spark: '-scale-x-100',
  },
  { orbit: '-inset-[13cqw] [--sk-avatar-frame-t:9.3s] [--sk-avatar-frame-phase:11deg]', spark: '' },
] as const
```

Every animated slot carries its `motion-reduce:animate-none`; the rest angle sits in the same
`animate-*` utility (`rotate: var(--sk-avatar-frame-phase)`), so removing the animation lands on it.
Per-layer rest angles, orbit radii and speeds are literal arbitrary-property classes
(`[--sk-avatar-frame-phase:40deg]`, `-inset-[13cqw]`, `[--sk-avatar-frame-t:9.3s]`).

## 8. Accessibility checklist

- [ ] Every decorative layer (rings, glow, head, sheen, halo, ripple, sparks, status dot, pill dot) is
      `aria-hidden`; the child keeps its own semantics (`<Avatar alt>` / fallback text).
- [ ] Status is never colour-only: online is a filled dot, offline a hollow ring, and the visually
      hidden `statusLabel` says it in words (pass `''` when visible text next to the avatar already does).
- [ ] The LIVE pill is real text (`liveLabel`), `--sk-on-accent` on `bg-gradient-accent` — ≥ 4.5:1 in
      both themes (the flat dark `--sk-accent` would be ≈ 3.5:1, so the pill does not use it).
- [ ] Status dot and offline ring are ≥ 3:1 against `--sk-surface`/`--sk-bg` in both themes (non-text).
- [ ] `prefers-reduced-motion`: all six loops stop on a still frame (`motion-reduce:animate-none`);
      covered by `test/browser/avatar-frame.test.ts`.
- [ ] No flashing (WCAG 2.3.1): the fastest change is the pill dot fading to 30% once per 2.8s cycle;
      nothing flashes more than 3×/s.
- [ ] Not focusable and no pointer capture of its own: the decorative layers are
      `pointer-events: none`, so a framed avatar inside a button/link stays fully clickable.
- [ ] The focusable element wraps the frame (as in the `FriendsList` story), never sits inside it:
      with `status` the avatar slot is masked to the child's box, which would clip a focus outline
      drawn outside it.

## 9. Tests

Unit (`avatar-frame.test.tsx`): server render of every tone × live × sparks × status combination;
real child + sr-only status text in the HTML; default/custom/empty `statusLabel`; `liveLabel`
renders as visible text; each tone/live/status maps to its literal utilities; the LIVE pill keeps
`leading-none` next to its font size in every live combination; every animated slot
carries `motion-reduce:animate-none`; decorative layers `aria-hidden`; front layers only when
needed; prop names never leak as attributes (`data-*` hooks do); native props pass through; `ref`
→ `HTMLSpanElement`; consumer `className` wins (a non-geometric override: the 6px pad stays);
hydrates; axe clean in both themes.

Browser (`test/browser/avatar-frame.test.ts`; CI runs Chromium, the spec also passes in Firefox
and WebKit): the Showcase story renders the three framed avatars and the pill text; ring, glow ring,
head, sheen, the three orbits, halo, ripple and pill dot run their `sk-avatar-frame-*` keyframes;
seeking the animations moves the comet from its 40° rest (130° at 800ms) and an orbit on its own
clock; the status cut-out masks are applied and the dot sits on the avatar's 45° edge; the LIVE
pill is set at line-height 1 even under a 28px inherited line-height (1.54em tall, hanging half of
it below the frame); on the
`Large` story (200px avatars with status) the cut-out box bleeds 30% of the frame, more than 3× the
glow's blur, and holds the live halo at its widest; under
`reducedMotion: 'reduce'` no animation runs and every layer rests on its designed angle (ring 40°,
head 33°, sheen −20°, orbits 140°/259°/11°, halo 70%) with all text visible; no console errors.

## 10. Stories

The frame always sits in story chrome (a surface card, captions, a roster). The chrome is never
part of the component.

- `Playground`: controls, in a surface card.
- `Showcase`: the approved mockup. Crimson / Bone / Live profiles with captions on a lit stage. The
  stage is a size container with the mockup's narrow rules: at ≤ 420px the avatars drop to 72px
  (64px / 56px on narrower phones), the captions shrink, and the 'RY · ' prefixes and the online dot
  are visually hidden.
- `Tones`: accent and premium profiles.
- `Live`: a "Live now" rail (accent live; premium live + sparks).
- `Sparks`: supporters (premium and accent with sparks).
- `Status`: a party panel (online, offline, premium online; default sr-only labels).
- `Sizes`: Avatar sm/md/lg and an 88px disc in both tones, plus live at lg.
- `Large`: profile-header scale, 200px avatars with status (comet; live): the glow, halo and
  cut-out scale with the child.
- `FriendsList`: a sidebar roster of buttons at `md`, each frame with its own
  `--sk-avatar-frame-delay` so the comets don't turn in lockstep.
- `Still`: the Showcase with every animation removed, i.e. the exact reduced-motion frame, for review.

Story ids are `components-avatarframe--<story>` (e.g. `components-avatarframe--showcase`,
`components-avatarframe--friends-list`). Both themes via the toolbar.

## 11. Decisions

- Approved as one of the nine `@sukunagg/ui` CSS showpieces: [Q38](questions.md#q38-what-other-impressive-components-can-we-add-can-you-scout-more-component-libraries-not-basic-stuff-but-really-cool-thing-with-animations--particles-etc-idk)
  (the scout) and [Q39](questions.md#q39-show-me-mock-ups--show-me-whats-done--holy-shit-lets-build-the-components)
  (the build go-ahead) in `docs/questions.md`. Visual target: the approved "Sukuna FX Lab"
  AvatarFrame mockup (both themes, reduced motion).
- **Wraps, never imports, `Avatar`**: Avatar pulls `@base-ui/react/avatar`; AvatarFrame stays a
  ~2 kB static component and frames any round child.
- **Compositor-only motion instead of the sketch's `@property` angle / `offset-path`**: rotating the
  ring element (with the status hole on a static parent) and rotating spark orbits look identical,
  repaint nothing, and drop the `@property` / motion-path engine requirements (`docs/motion.md`
  rule 2). Four keyframes total.
- **Loops are ambient decoration** — a Q39 carve-out from `docs/motion.md` rule 5 ("no idle
  decoration"), like the other showpieces; reduced motion stops them all.
- `// DECISION(open): live overrides the accent comet` — under `live` the accent ring turns solid
  (the mockup's live look: halo + ripple + pill already carry the motion); `premium` keeps its metal
  ring and sheen under `live`.
- `// DECISION(open): hot colour without light-dark()` — the mockup's white-hot comet head used
  `light-dark()`, which needs `color-scheme` per theme (not shipped; Q36). The ported head mixes
  `--sk-accent` with `--sk-text` instead (white-hot on dark, deep red on light) — one formula that
  follows any theme.
- `// DECISION(open): pill fill` — `bg-gradient-accent` + `--sk-on-accent` instead of the mockup's
  flat `--sk-accent`, for ≥ 4.5:1 text contrast in dark.
- `// DECISION(open): pill separator` — `--sk-avatar-frame-backdrop`, default `--sk-surface` (the
  mockup's stage); the status dot uses a true transparent cut-out instead.
- `// DECISION(open): status labels` — English defaults 'Online' / 'Offline', overridable via
  `statusLabel`; only these two statuses until there are tokens for away/busy.
- `sparks` is independent of `tone` (default off); the mockup pairs it with `premium`.
- **Desync is opt-in** (`--sk-avatar-frame-delay`, default `0s`): the component has no randomness
  (server and client markup must match), so frames that mount together start in phase; a list sets
  a per-item negative delay.
- No mono token exists (Q39 build brief): the pill uses `font-display` bold, uppercase, tracked.
- Every `DECISION(open)` above also sits as a `// DECISION(open):` comment at its touch point
  (`avatar-frame.styles.tsx`, `avatar-frame.logic.tsx`, `scripts/motion/avatar-frame.ts`).
