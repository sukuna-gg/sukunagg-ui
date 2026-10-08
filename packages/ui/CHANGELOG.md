# @sukunagg/ui (formerly `sukuna-ui`)

## 0.11.0

### Minor Changes

- 01d2456: Add `variant: 'soft' | 'solid' | 'outline'` to `Badge` and `Chip` (one shared tone × variant map),
  plus `selected` on `Chip` for filter lists (accent border + text via `data-selected`; visual only —
  the toggle lives on a wrapping Button/Link, or use `ToggleGroup`). `variant` has no public
  default: unset keeps each tone's original look (`accent` solid, the rest soft), so nothing changes
  without opting in. Solid fills label with the page-background token so they stay legible in both
  themes. Adds variants = minor.
- 3903386: Add two additive variants to `Card`. `tone: 'premium'` is the bone/gold surface treatment
  (`--sk-premium-dim` border + a 6% premium tint mixed into the surface — the "premium is a surface
  treatment" ruling made concrete). `glow` adds the crimson `--sk-accent-glow` halo on hover and pairs
  with the existing `interactive` affordance. Motion respects `prefers-reduced-motion`; defaults are
  unchanged. Adds variants = minor.
- fcf09de: Charts & stats wave 1. New components: `StatTile` (label, value, caption, threshold `tone` or any
  `valueColor`, optional ▲▼ `delta` and `trend`; `null` shows "—", never 0), `Sparkline` (`line`,
  `area`, `bar`, `winloss`; server-rendered, stretches to its container with no client JS, `null`
  breaks the line) and `EmptyState` (title, icon, body, actions; `size="sm"` for inside charts).
  New props: `Input` `reveal` + `revealLabels` (Show/Hide toggle on password fields; only these load
  client JS) and `Badge` `pulse` (animated live dot, still under reduced motion). New tokens:
  `--sk-danger`, `--sk-chart-1…6`, `--sk-chart-other`, `--sk-heat-1…4` (+ Tailwind utilities such as
  `bg-chart-1`, `text-danger`). Adds components, props and tokens = minor.
- d953f4f: Add a shared `variant: 'filled' | 'outline' | 'ghost'` to the form controls — `Input`, `Select`,
  `Combobox` and `NumberField` — using one map so the form layer reads as one. `filled` (default)
  is the original `surface-2` fill + `line` border, so nothing changes without opting in; `outline`
  is transparent with the line border; `ghost` is borderless and transparent until hover/focus (the
  inline-edit field), and `invalid` still wins with the crimson border. `Combobox` also gains the
  shared `size: 'sm' | 'md' | 'lg'` scale (default `md`, the previous fixed height). Adds variants =
  minor.
- 881abc1: Add 17 line icons (`AlertIcon`, `ChartIcon`, `CheckIcon`, `ChevronDownIcon`/`Left`/`Right`/`Up`, `ClockIcon`,
  `CloseIcon`, `ExternalIcon`, `InfoIcon`, `LockIcon`, `MoonIcon`, `RefreshIcon`, `SearchIcon`, `SunIcon`,
  `UserIcon`): server components on one 24px / 2px grid in `currentColor`, decorative unless given a
  `title`, tree-shaken per icon. Add `Table` `scroll`: the sideways-scrolling wrapper becomes a keyboard
  tab stop while the table overflows (a region named like the table); a plain Table still ships no
  JS. Adds components and a prop = minor.
- 9860fb3: Standardize the `size` scale to `sm | md | lg` across controls: add `lg` to `Checkbox` (24px box),
  `Switch` (28×52px), `Progress` (12px track), `Select` (48px trigger) and `RadioGroup` (24px circle).
  Button, Input, NumberField and ToggleGroup already had `lg`, so mixed forms no longer hit a missing
  size. Defaults are unchanged (`md`). Adds a variant = minor.
- b6efb6e: `Skeleton` gains `animation: 'pulse' | 'shimmer'` — `shimmer` is a light band sweeping across the
  block, reusing the `sk-shine` keyframe shipped with ShinyText; `pulse` stays the default. `Table`
  gains root options `density: 'comfortable' | 'compact'`, `striped` and `hoverable`, applied through
  descendant selectors so the sub-parts stay context-free; `comfortable` is the unchanged default.
  Adds variants = minor.
- b330c10: Add style variants to `Tabs` alongside `orientation`. `variant: 'underline' | 'pill'` —
  `underline` (default) is the existing crimson sliding underline; `pill` is a segmented control on a
  `well` track whose selected segment is a lighter `surface` pill with crimson text (lighter than its
  track in both themes). `size: 'sm' | 'md' | 'lg'` (32/40/48px, default `md`) joins the shared
  control scale, and `fitted` makes tabs share the list width equally. `pill` and `fitted` are
  horizontal treatments; vertical tabs stay underline-style at their 36px row height. Defaults
  reproduce the previous styling exactly. Adds variants = minor.
- 3903386: Add `tone` to `Toast` (`ToastOptions.tone: 'info' | 'success' | 'warning' | 'danger'`), mirroring
  `Alert`'s tone map exactly (same tokens, same left accent border) so a notification and an inline
  alert for the same event read the same. No default — untoned toasts are unchanged. `tone` is sent
  to Base UI as the toast `type`, so a free-form `type` naming a tone is styled too. Exports
  `ToastTone`. Adds a variant = minor.

### Patch Changes

- ce6cef1: Docs: the README component table and the agent docs (`llms.txt`, `llms-full.txt`) list `VideoPlayer`
  again (46 components). The 0.10.0 package rename left the re-exported player out of the generated
  docs; the generator now fails if a re-exported package component goes missing.

## 0.10.0

### Minor Changes

- **Renamed:** `sukuna-ui` is now published as `@sukunagg/ui` (repo moved to `sukuna-gg/sukuna-ui`). Install `@sukunagg/ui` and update imports and CSS paths: `from 'sukuna-ui'` → `from '@sukunagg/ui'`, `sukuna-ui/theme.css` → `@sukunagg/ui/theme.css`, `sukuna-ui/styles.css` → `@sukunagg/ui/styles.css`, `sukuna-ui/video/hls` → `@sukunagg/ui/video/hls`, and the Tailwind `@source` → `../node_modules/@sukunagg/ui/dist`. No API changes beyond the name.
- 9507a1c: The `VideoPlayer` (and its parts, `useVideoPlayer`, and `@sukunagg/ui/video/hls`) now comes from the new
  `@sukunagg/video` package, which `@sukunagg/ui` depends on and re-exports — the names you import are unchanged.
  Its styles now ship as a prebuilt, prefixed stylesheet that `@sukunagg/ui/theme.css` imports and
  `@sukunagg/ui/styles.css` includes, so nothing changes in your setup and the player looks the same
  (verified element by element). `theme.css` also feeds the player's `--vp-*` variables from your
  `--sk-*` tokens.

  Behaviour note (why this is a minor on 0.x): the player's utilities are now unlayered, so a
  conflicting Tailwind class you pass in the player's `className` (e.g. `rounded-none`) no longer
  overrides the built-in one. Use the `--vp-*` variables or an important modifier (`rounded-none!`).
  Non-conflicting classes (`max-w-3xl`, margins) work as before.

### Patch Changes

- Updated dependencies [9507a1c]
  - @sukunagg/video@0.1.0

## 0.9.2

### Patch Changes

- a843dc6: VideoPlayer: choosing a setting (e.g. speed 2×) keeps you on that page with the new value ticked,
  instead of jumping back to the main settings list. Back returns to the list. Behavior fix, no API
  change → patch.

## 0.9.1

### Patch Changes

- 89c31a5: VideoPlayer: the settings menu no longer closes when you pick an option; a choice returns to the
  main list (YouTube-style) and the menu closes only from the gear, an outside click or Escape.
  Tapping ±10s (or anything) restarts the inactivity timer instead of hiding the controls: on touch
  screens a finger lifting no longer counts as the pointer leaving, and focus left by a click or tap
  no longer pins the controls open (keyboard focus still does). Behavior fix, no API change → patch.

## 0.9.0

### Minor Changes

- 415693f: Counter: the count-up paints straight into its text node instead of setting React state every
  frame (zero re-renders while animating, was ~60/s per counter). New `startOnView` prop (default
  `false`) holds the count at `from` until the number scrolls into view.
- ac23b32: Motion wave (CSS-only, see `docs/motion.md`): new tokens `--sk-duration-slow` / `duration-slow` and
  `--sk-ease-spring` / `ease-spring`, plus an `animate-indeterminate` utility. Tabs get a sliding
  indicator (horizontal and vertical); Accordion panels animate their height; Menu, ContextMenu,
  Select, Combobox, Popover, Tooltip and HoverCard slide in from their trigger side; Toasts stack as a
  deck that fans out on hover and can be swiped away; Meter and Progress bars grow in, and
  indeterminate Progress slides instead of pulsing. Everything honors `prefers-reduced-motion`.
  Adds tokens/utilities → minor.
- 9630753: Table actions column. Menu and ContextMenu options accept an `icon` (decorative, `aria-hidden`
  leading icon). New `RowActions` component: a square ghost ⋯ button that opens a Menu of row
  actions (`items`, row-specific `aria-label`, opens aligned to the end). Table gains static
  `Table.ActionsHeaderCell` (visually hidden "Actions" column name) and `Table.ActionsCell`
  (narrow, right-aligned); Table itself stays a zero-JS server component. Adds props/parts/component
  → minor.
- f5f1ef6: Tabs: new `orientation="vertical"` — a navigation column beside the panel (settings pages, sidebars)
  with ArrowUp/ArrowDown and `aria-orientation="vertical"`. Tab labels now lay out icon + text with a
  gap. Default stays `horizontal` with identical styling. Adds a prop → minor.
- eed0d23: Five new components: **Popover** (click-opened, non-modal floating panel), **AlertDialog**
  (`role="alertdialog"` confirm that ignores outside clicks; `Cancel` + primary `Action` with
  `preventDefault()` to stay open), **Textarea** (server component; sizes, `resize`, CSS-only
  `autoResize`), **Collapsible** (single disclosure with animated height) and **Meter**
  (`role="meter"` gauge with `tone`, `showValue`, `Intl` `format`). Adds components → minor.
- 65a8a98: New variants (no new tokens): Button `variant="outline" | "link"` and `iconOnly` (square at every
  size); Alert `onDismiss` + `dismissLabel` (close button, stays a server component); Card
  `interactive` (hover lift + card-sized focus ring via `:has(:focus-visible)`); Avatar
  `shape="square"`; Progress and Spinner `tone` (`accent` | `success` | `premium`, Spinner also
  `current`). Adds props/variants → minor.
- 454464b: New `VideoPlayer` (wave 1 of the Nuevo-parity plan, Q21–Q23): Sukuna-branded controls over the
  native `<video>`, always-dark chrome, no player library. Chapter-segmented seek bar with sprite
  thumbnail previews, quality menu from `sources`, speed, player-rendered captions with language and
  style settings, ±10s, frame stepping, volume, picture-in-picture, AirPlay, fullscreen, touch
  controls with double-tap seek, muted-autoplay chip, context menu, keyboard shortcuts (`?` sheet),
  `labels` for i18n and a public `useVideoPlayer()` hook for custom parts.

  Wave 2 adds opt-in parts (separate exports, tree-shaken when unused): `VideoPlayerPlaylist`,
  `VideoPlayerPanel` (chapters / playlist / transcript), `VideoPlayerUpNext`,
  `VideoPlayerEndScreen`, `VideoPlayerShare`, `VideoPlayerSkip`; and player props `resume`,
  `syncGroup`, `floating` and `theater`.

  Wave 3 adds gear rows `picture` (zoom, mirror, brightness/contrast/saturation), `sleep`, `loop`
  (whole video, chapter, A–B), `snapshot` and `download`; props `watchLimit`, `live` (DVR window +
  LIVE pill), `download`, `onSnapshot`; and parts `VideoPlayerOverlay` and `VideoPlayerAudio`
  (Web Audio visualizer).

  Wave 4 adds the `engine` prop (`VideoEngine` seam for streaming engines; their levels fill the
  Quality menu) and a new entry point `sukuna-ui/video/hls` with `hlsEngine()`. hls.js is an
  **optional** peer dependency (`>=1.5`), needed only by apps that import that entry. Adds a prop,
  components and an export → minor.

### Patch Changes

- eed0d23: Accordion: a disabled item is now visibly dimmed. Base UI keeps a disabled trigger focusable with
  `data-disabled`/`aria-disabled` and no native `disabled`, so the `disabled:` styles never applied
  (same trap as Tabs, D27). Unit + Playwright guards added.
- 415693f: Upgrade the headless layer from `@base-ui-components/react@1.0.0-rc.0` to the stable, renamed
  `@base-ui/react@^1.8.0` (eight releases of fixes). No public API change; ScrollArea keeps its
  scrollbars mounted (`keepMounted`) so layout matches the rc behavior. Internal headless-lib bump
  → patch (breaking-change table).
- 415693f: Button is now a server component: it had no hooks, so the `'use client'` directive only forced
  hydration. Link and submit buttons now ship zero JS under RSC. A new RSC-boundary test fails if a
  hook-free component is ever marked client again (or a hook-using one isn't).
- ac23b32: Animation fixes: Tailwind v4 compiles `scale-*`/`translate-*` to the standalone `scale`/`translate`
  properties, so transitions listed as `transform` never ran — popup and Dialog scale-in, the Button
  press and the Card lift snapped instead of animating (11 components). Indeterminate Progress also
  kept animating under `prefers-reduced-motion` (a `data-[indeterminate]` variant outranked
  `motion-reduce:`). Both fixed; no API change.

## 0.8.0

### Minor Changes

- f896480: Add `Carousel` — an accessible, one-slide-at-a-time content carousel (the gap `Slider`, a range
  input, doesn't fill). Root-managed: each direct child becomes a slide; the root renders the viewport,
  track, prev/next controls, and dots. Follows the WAI-ARIA carousel pattern: labelled region, per-slide
  `role="group"` + `aria-label="{n} of {total}"`, a live region that goes `off` while auto-rotating,
  keyboard (arrows + Home/End), `loop`, and optional `autoplay` that never starts under
  `prefers-reduced-motion` and always renders a pause control (WCAG 2.2.2). Controlled or uncontrolled
  via `index`/`defaultIndex`/`onIndexChange`. Pointer swipe is a documented v1.1 follow-up. Adds a
  component = minor.
- c60d519: Add `ContextMenu` — a right-click (desktop) / long-press (touch) menu of actions over a target area.
  Built on Base UI `context-menu` (`'use client'`), prop-driven `items` reusing `Menu`'s
  `MenuItemOption` shape, with popup/item styling kept in parity with `Menu`. Full keyboard support
  (also `Shift`+`F10`); disabled rows skipped. `children` are wrapped in a `display: contents` trigger
  that sets `user-select: none` / `-webkit-touch-callout: none` so an iOS long-press opens the menu
  instead of starting text selection. Because right-click isn't discoverable, expose the same actions
  through a visible control as well. Adds a component = minor.
- 8a0402f: Add `Counter` — an animated number that counts up to a target value on mount, for stat tiles, KPIs,
  and pricing. Server-renders the final value (no-JS/SEO correct); the count-up is a client
  enhancement that honors `prefers-reduced-motion` (shows the final value instantly). Supports
  `from`, `duration`, `decimals`, `prefix`, `suffix`, a custom `format`, and `once`. The wrapper is
  `role="img"` with an `aria-label` of the final value so assistive tech announces it once, not every
  frame. Adds a component = minor per the breaking-change table.
- 46324fa: Add `GradientText` — fills text with an on-brand gradient via `background-clip: text` for wordmarks,
  hero headings, and accent phrases. Pure CSS, static/RSC-safe (no `'use client'`), zero JavaScript.
  The gradient shows through `-webkit-text-fill-color: transparent` while a real `color` (accent)
  stays as the accessible fallback. Ships the `accent` gradient (the `premium` variant is pending the
  `--sk-gradient-premium` token, owner Q13). Renders real, selectable text as any of `span`/`p`/`h1`–`h6`.
  Adds a component = minor.
- c60d519: Add `HoverCard` — a rich floating card revealed on hover or keyboard focus of a link (a user card,
  repo summary, footnote preview). Built on Base UI `preview-card` (`'use client'`); compound
  `HoverCard` + `HoverCard.Trigger` (an `<a>`, with `delay`/`closeDelay`) + `HoverCard.Content`
  (`side`/`align`/`sideOffset`). Unlike `Tooltip` its content is reachable by assistive tech and may
  hold interactive elements; `prefers-reduced-motion` collapses the transition. The open `delay`
  defaults to 300 ms (halved from Base UI's 600 for a snappier preview). Adds a component = minor.
- c60d519: Add `NumberField` — a numeric input with stepper buttons, keyboard increment (`Arrow`, `Shift`+Arrow
  /`PageUp`-`PageDown` for `largeStep`, `Home`/`End` to the bounds), min/max clamping, and `Intl`
  locale formatting (`format`, e.g. currency or percent). Built on Base UI `number-field`
  (`'use client'`); `forwardRef` targets the `<input>`. Sizes `sm`/`md`/`lg`; wheel scrubbing is
  opt-in via `allowWheelScrub`. `disabled`/`name`/`id`/`required` apply to the field root, other native
  input props spread onto the input. Adds a component = minor.
- c60d519: Add `ScrollArea` — a bounded region with consistent, themed scrollbars across browsers/OSes. Content
  is real, server-rendered DOM inside a native-scrolling viewport (wheel, keyboard, selection and
  find-in-page all native); only the thumb is custom. Built on Base UI `scroll-area` (`'use client'`),
  `forwardRef` to the root. `orientation` `vertical` (default) / `horizontal` / `both` (adds a corner);
  size the region with `className` on the root. Adds a component = minor.
- 3154908: Add `ShinyText` — sweeps a soft light band across dimmed text for "New" flags, premium labels, and
  subtle emphasis. Pure CSS keyframe, static/RSC-safe (no `'use client'`), no runtime deps (unlike the
  GSAP-based original). The band is built from `--sk-text` over a legible `--sk-text-dim` base and
  freezes under `prefers-reduced-motion`. `speed`: 'slow' | 'normal' | 'fast'. Adds a `sk-shine`
  keyframe and `animate-shine*` utilities to the generated theme layer. Adds a component = minor.
- c60d519: Add `ToggleGroup` (plus a standalone `Toggle`) — a segmented control of pressable buttons, single by
  default or multi-select via `multiple`. Built on Base UI `toggle-group`/`toggle` (`'use client'`),
  prop-driven `items` like `Menu`/`Select`. Roving focus with Arrow keys, `aria-pressed` per button,
  `aria-label` required on the group and on icon-only items; sizes `sm`/`md`/`lg` and horizontal or
  vertical `orientation`. `onValueChange` always reports an array (even in single mode). Standalone
  `Toggle` is a single on/off `<button>` (`forwardRef`). Adds components = minor.
- c60d519: `Tooltip`: halve the default open `delay` to **300 ms** (was Base UI's 600 ms) so tooltips appear
  more promptly on hover; keyboard focus still opens instantly, and you can override per-instance with
  `delay`. Changing a documented default is a breaking change (minor on 0.x).

### Patch Changes

- 2ec410f: Button now shows `cursor: pointer` on hover, matching every other interactive component (switch, tabs, accordion, menu items, etc.). The `disabled`/`aria-disabled`/`aria-busy` cursor states are unchanged and still override it. Visual-behavior fix with no API or layout change — patch per the breaking-change table.

## 0.7.0

### Minor Changes

- 1bebf2d: Checkbox: new `label` prop renders the text inside a real `<label>` beside the box, so clicking
  the text toggles it and names it for assistive tech. Enter now toggles the box like Space does;
  the component prevents the default so Enter never implicitly submits a surrounding form (a
  consumer `onKeyDown` that calls `preventDefault()` opts out).

### Patch Changes

- 1bebf2d: Select: the popup now opens below the trigger (flipping above when cramped) instead of Base UI's
  macOS-style "align selected item with trigger" mode, so the mouse wheel scrolls the list rather
  than growing/moving the popup. The popup is at least as wide as the trigger and caps its height at
  the space available on its side (`--available-height`), so a Select near the bottom of the
  viewport no longer runs off the page. Storybook gains a `ManyItems` story (100 numeric options).

## 0.6.0

### Minor Changes

- a6c2ba3: Accordion: new `headingLevel` prop (1–6, default 3) so each item's header renders as the right
  `<h1>`–`<h6>` for your document outline (WCAG 1.3.1), with the trigger nested inside the heading.
- ded3d69: Documented for AI agents and search. Every exported component and prop now carries rich TSDoc in
  the published `.d.ts` — purpose, `@remarks` (SSR/RSC posture, accessibility and keyboard behaviour,
  every variant with its default), `@default`, and copy-pasteable `@example`s — so IDE hover and
  agents reading `node_modules/sukuna-ui` are self-sufficient. New generated agent-facing docs
  (`llms.txt`, `llms-full.txt`, `docs/llms/<component>.md`) are built from the component specs by
  `bun run docs:build` and drift-checked in CI. The README is rewritten code-first with a "For AI
  agents" section and a generated component table; `package.json` gains `keywords`/`author` and a
  sharper description. The showcase example is now a deployable, prerendered, SEO-complete site
  (meta/Open Graph/JSON-LD `SoftwareApplication`, sitemap, robots, favicon, llms files). No runtime
  behaviour changes.
- a6c2ba3: Alert: the ARIA role now derives from `tone` — `role="alert"` (assertive) for `danger`/`warning`,
  `role="status"` (polite) otherwise — so urgent alerts interrupt screen readers appropriately. An
  explicit `role` prop still overrides.
- a6c2ba3: Button is now polymorphic: `<Button as="a" href="…">` renders an anchor with the same styling for
  "link that looks like a button". A disabled link maps to `aria-disabled` + `tabindex={-1}` +
  non-interactive styles (anchors have no native `disabled`). Default (no `as`) is unchanged.
- 72cb4e2: Export `Tabs` (and its `TabItem` / `TabsProps` types) from the package entry. The component
  shipped, was documented and tested, but was never re-exported from `src/index.ts`, so
  `import { Tabs } from "sukuna-ui"` failed. It's now importable like every other component, guarded
  by a test that asserts every component directory is re-exported.
- a6c2ba3: New `Field` component — a form-control wrapper (compound: `Field` + `Field.Label` / `Field.Control`
  / `Field.Description` / `Field.Error`) built on Base UI Field. It wires label association,
  `aria-describedby` for description and error, and `aria-invalid`, so a labelled/validated input is
  correct by construction. Set `invalid` and the error shows and links automatically.

### Patch Changes

- 72cb4e2: Breadcrumbs: key items by position instead of `href`. Keying by `href` produced duplicate React
  keys when two crumbs shared one (e.g. repeated or placeholder hrefs); a breadcrumb trail is a fixed,
  ordered list, so the index is the correct stable key.

## 0.5.0

### Minor Changes

- 02823b2: Accessibility pass (contrast + focus). Retuned color tokens so every text color clears WCAG AA in
  both themes: `text-faint` (was ~3:1, it colors all placeholders), and light-theme `premium`,
  `premium-dim` and `success`. The focus ring is now a **solid** color via a new `--sk-focus-ring`
  token (the translucent `--sk-accent-glow` failed the 3:1 non-text bar as the sole focus indicator);
  `--sk-accent-glow` remains for decorative glow. Menu/Select/Combobox keyboard highlight is now a
  crimson inset ring that meets 3:1 (was a near-invisible 6%-opacity fill). Avatar defaults `alt=""`
  when omitted, Progress defaults an accessible name when unlabeled, and the Toast close button is a
  larger touch target (24→32px). Override any `--sk-*` token to re-tune.
- 59a34b8: Button primary label now meets WCAG AA contrast. The near-white label on the crimson gradient was
  ~3.1:1; the primary label uses a new `--sk-on-accent` token (white, both themes, so it no longer
  flips to dark in light mode) and the dark-theme gradient's light stop is darkened `#FF3B4E → #D8253A`
  so white clears 4.95:1. Still a crimson gradient. The shared `--sk-gradient-accent` (wordmark/hero)
  darkens slightly with it; override the token to customize.
- eca98f2: Performance for large lists (no new dependency). Combobox and Menu items now use
  `content-visibility: auto` so the browser skips layout/paint of off-screen options in long lists.
  Combobox gains a `maxRenderedItems` prop (maps to Base UI's `limit`) — search still spans every
  item, only the top N filtered results render. `Select.Value` uses an O(1) memoized lookup instead
  of an O(n) `items.find` per render, and `MenuItemOption` accepts an optional stable `id` for keying
  dynamic menus. For very large datasets (thousands of rows/options), still paginate or use
  server-side search — `content-visibility` speeds paint but doesn't reduce DOM nodes; see the
  Performance section of the README.
- 32456bf: Respect `prefers-reduced-motion: reduce`. Every animated component now drops its movement under the
  OS "reduce motion" setting via Tailwind's `motion-reduce:` variant: spinners/skeletons/progress stop
  their spin/pulse, overlay enter-exit slide/scale transitions (Dialog, Drawer, Toast, Menu, Select,
  Combobox, Tooltip, Accordion, Switch) become instant, and the Button press-scale is disabled.
  Color-only transitions are unaffected. Verified with a Playwright test that emulates the preference.

### Patch Changes

- 2271c19: RadioGroup: clicking an option's label text now selects it, not just the radio circle. The whole
  row is the control; the accessible name (via `aria-labelledby`) and visuals are unchanged.
- 71b3b0b: Tabs: a disabled tab is now visibly dimmed with a `not-allowed` cursor. It relied on the native
  `:disabled` pseudo-class, but Base UI keeps a disabled tab focusable and marks it with
  `data-disabled` (no native `disabled` attribute), so the dim styling never applied. Now gated on
  `data-disabled` too.
- 4d8d151: Tabs: the selected tab is now clearly styled. It keyed off `data-[selected]`, but Base UI's
  `Tabs.Tab` uses `aria-selected` (there is no `data-selected`), so the active tab previously had no
  distinct styling. The selected tab now shows crimson text and a crimson underline.

## 0.4.0

### Minor Changes

- b5411f4: Fix dropdowns rendering behind a Dialog/Drawer. Select, Menu, Combobox and Tooltip put their
  z-index on the inner popup, but the element portalled to `<body>` is the Base UI **positioner** —
  which Floating UI gives a transform (its own stacking context), so the popup's z-index couldn't
  clear a modal. The z-index now lives on the positioner.

  Overlay stacking is also now a coherent, monotonic token scale so a surface opened _inside_ a
  dialog sits above it: `--sk-z-dialog: 50` < `--sk-z-popover: 60` < `--sk-z-toast: 70` <
  `--sk-z-tooltip: 80`. New tokens `--sk-z-popover` and `--sk-z-toast` are added; `--sk-z-tooltip`
  moves from `40` to `80` (it now clears dialogs, as a tooltip inside a dialog must). Dialog, Drawer
  and Toast reference these tokens instead of a hard-coded `z-50`. Override any `--sk-z-*` to
  re-layer.

## 0.3.0

### Minor Changes

- 8262442: Add three Tier-3 components: **Breadcrumbs** (navigation trail), **Slider** (single-value range,
  Base UI), and **Pagination** (controlled, with an ellipsis range helper). All themed via `--sk-*`,
  100% unit coverage, with a browser test for the Slider's keyboard behavior.
- 37bd60a: Add the final v1.1 components, completing the set: **Drawer** (side-anchored overlay over Base UI
  Dialog, left/right/top/bottom), **Stepper** (ordered progress indicator), **Combobox** (free-text
  autocomplete over Base UI), and **Table** (styled compound over native table elements). All themed
  via `--sk-*`, 100% unit coverage, with browser tests for Drawer and Combobox. The library now ships
  29 components.

## 0.2.0

### Minor Changes

- 44f2255: Add four more v1.1 components (Base UI-backed): **Avatar** (image with graceful fallback),
  **RadioGroup** (single-choice, arrow-key selection), **Tabs** (tabbed panels, horizontal), and
  **Accordion** (expandable sections). All themed via `--sk-*`, 100% unit coverage, with Playwright
  browser tests for the interactive keyboard behavior. This completes the v1.1 Tier-1 set.
- 7b6d3d3: Add four static components (v1.1): **Divider** (horizontal/vertical separator), **Alert** (info/
  success/warning/danger inline message), **Chip** (compact token with optional dismiss), and
  **Spinner** (indeterminate loading indicator). All RSC-safe, themed via `--sk-*`, 100% covered.
- 23445b1: Add three v1.1 Tier-2 components: **Skeleton** (loading placeholder, text/rectangular/circular),
  **Progress** (determinate/indeterminate bar, Base UI), and **Menu** (dropdown action menu, Base UI,
  with a browser test). All themed via `--sk-*` with 100% unit coverage.
- 87a4d40: Add **Toast** (Base UI): wrap the app in `ToastProvider` and call `useToast().toast({ title,
description })` to show transient notifications. Completes the v1.1 Tier-2 set. 100% unit coverage
  plus a browser test.

## 0.1.0

### Minor Changes

- f6b4d08: Initial release. Ten v1 components — Text, Badge, Card (static/RSC-safe); Button, Input, Checkbox,
  Switch (native interactive); Tooltip, Dialog, Select (headless-backed by Base UI) — in the Sukuna
  design language. Dark-default theming via `data-theme` with an approved light palette, Tailwind v4
  `@theme` tokens plus a precompiled `styles.css` fallback, SSR-safe zero-runtime styling, and React
  18/19 support.
