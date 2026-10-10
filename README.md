<p align="center">
  <a href="https://sukuna-ui.vercel.app/">
    <img src="https://raw.githubusercontent.com/sukuna-gg/sukunagg-ui/main/brand/social/readme-banner.png" alt="sukuna-ui — Accessible React components. One crimson." width="100%" />
  </a>
</p>

# sukuna-ui

[![npm version](https://img.shields.io/npm/v/@sukunagg/ui?color=D8253A&label=npm)](https://www.npmjs.com/package/@sukunagg/ui)
[![npm downloads](https://img.shields.io/npm/dm/@sukunagg/ui?color=D8253A)](https://www.npmjs.com/package/@sukunagg/ui)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@sukunagg/ui?label=minzip)](https://bundlephobia.com/package/@sukunagg/ui)
[![types](https://img.shields.io/npm/types/@sukunagg/ui)](https://www.npmjs.com/package/@sukunagg/ui)
[![CI](https://github.com/sukuna-gg/sukunagg-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/sukuna-gg/sukunagg-ui/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@sukunagg/ui)](./LICENSE)

**SSR-safe, accessible React components for dark-first products — and for the AI agents that build them.**

<!-- count -->82<!-- /count --> components on [Base UI](https://base-ui.com) + Tailwind v4 design tokens. WCAG AA
contrast in both themes, `prefers-reduced-motion` honored, zero runtime styling, React Server
Components-ready, React 18 and 19. Dark is the identity; light is a mode.

```bash
bun add @sukunagg/ui        # or: npm i @sukunagg/ui
```

```tsx
import { Button, Card, Dialog, Text } from '@sukunagg/ui'

export function Example() {
  return (
    <Card elevation="raised">
      <Text as="h2" font="display" size="lg" weight="bold">Welcome</Text>
      <Dialog>
        <Dialog.Trigger><Button>Open</Button></Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>Hello</Dialog.Title>
          <Dialog.Description>Every component, one CSS import.</Dialog.Description>
          <Dialog.Close render={<Button>Got it</Button>} />
        </Dialog.Content>
      </Dialog>
    </Card>
  )
}
```

→ **[llms.txt](https://raw.githubusercontent.com/sukuna-gg/sukunagg-ui/main/llms.txt)** · [npm](https://www.npmjs.com/package/@sukunagg/ui) · [showcase source](examples/showcase) (a prerendered one-page site; deploys to Vercel from the root `vercel.json`)

## For AI agents

This library is documented for machines as carefully as for people:

- **`https://raw.githubusercontent.com/sukuna-gg/sukunagg-ui/main/llms.txt`** — an [llmstxt.org](https://llmstxt.org) index of every component with a one-line purpose and a link to its Markdown page.
- **`https://raw.githubusercontent.com/sukuna-gg/sukunagg-ui/main/llms-full.txt`** — everything in one file. Paste this URL into your agent (Claude Code, Cursor, Codex, Copilot…) for complete context on every component, variant, state and accessibility rule.
- **`docs/llms/<component>.md`** — one page per component, e.g. `https://raw.githubusercontent.com/sukuna-gg/sukunagg-ui/main/docs/llms/button.md`.
- **Source-level TSDoc** — every exported component and prop in the published `.d.ts` carries usage notes, defaults, accessibility requirements and copy-pasteable `@example`s, so an agent reading `node_modules/@sukunagg/ui` is self-sufficient.
- Also indexable via [Context7](https://context7.com) (search `@sukunagg/ui`).

Once the showcase is deployed it serves the same files at its own origin (`/llms.txt`, `/llms-full.txt`, `/llms/<name>.md`). The generated docs are rebuilt from the source of truth on every build (`bun run docs:build`) and CI fails if they drift or a page is missing.

## Setup

### Tailwind v4 (primary path)

Two lines in your global CSS — your Tailwind build then emits exactly the utilities used:

```css
@import "tailwindcss";
@import "@sukunagg/ui/theme.css";              /* @theme tokens + data-theme palettes */
@source "../node_modules/@sukunagg/ui/dist";   /* so your build sees our classes */
```

### No Tailwind (fallback path)

```ts
import "@sukunagg/ui/styles.css"
```

Precompiled and self-contained; tokens still overridable via `--sk-*` variables.

### Theme

Set `data-theme` on `<html>` (or any ancestor): `"dark"` (default/brand) or `"light"`. Override any
token by redefining a `--sk-*` variable under your own selector — see [docs/tokens.md](docs/tokens.md).

### Just the video player

The `VideoPlayer` is also published on its own as
[`@sukunagg/video`](packages/video#readme) — for apps that want the player without the rest of
the library, Tailwind or the Sukuna theme:

```tsx
import '@sukunagg/video/video.css'   // prebuilt, prefixed — no Tailwind needed
import { VideoPlayer } from '@sukunagg/video'
```

It keeps the Sukuna look by default and re-themes through `--vp-*` CSS variables. Inside a
sukuna-ui app you don't need it separately: `@sukunagg/ui` re-exports it and its CSS already includes
the player's.

### Charts

`BarChart`, `LineChart`, `AreaChart` and `DataBar` live in
[`@sukunagg/charts`](packages/charts#readme), next to the library (it peers on `@sukunagg/ui` for
the tokens and `EmptyState`). They render on the server and size themselves with CSS — no client
measuring, no layout shift; hover and arrow-key tooltips come from a ~1 kB client island.

```bash
bun add @sukunagg/charts
```

```css
@source "../node_modules/@sukunagg/charts/dist"; /* Tailwind: next to the @sukunagg/ui lines */
/* No Tailwind: import "@sukunagg/charts/styles.css" after "@sukunagg/ui/styles.css" */
```

## Components

Every row links to that component's generated Markdown page (full API, variants, states, accessibility).

<!-- components:start -->
| Component | What it is for | Docs |
|---|---|---|
| `Accordion` | Vertically stacked, expandable sections. | [docs/llms/accordion.md](docs/llms/accordion.md) |
| `Agenda` | Lists what's coming up, one heading per day ("Today · Friday, October 9", "Tomorrow · Saturday, October 10"), each event with its time, title, details and status. | [docs/llms/agenda.md](docs/llms/agenda.md) |
| `Alert` | An inline message that draws attention to information, success, a caution, or an error. | [docs/llms/alert.md](docs/llms/alert.md) |
| `AlertDialog` | Ask the user to confirm something that is hard to undo ("Delete project?", "Discard changes?"). | [docs/llms/alert-dialog.md](docs/llms/alert-dialog.md) |
| `Avatar` | A user/entity image with a graceful fallback (initials or icon) while loading or on error. | [docs/llms/avatar.md](docs/llms/avatar.md) |
| `AvatarFrame` | Decorates a circular avatar with an animated frame: a crimson comet ring that circles it, a bone "premium" ring with a passing sheen and orbiting sparks, a live-broadcast halo with a LIVE pill, and an online/offline status dot cut cleanly out of the ring. | [docs/llms/avatar-frame.md](docs/llms/avatar-frame.md) |
| `Badge` | A small, pill-shaped label for status and metadata — "LIVE", counts, tags. | [docs/llms/badge.md](docs/llms/badge.md) |
| `BarChart` · @sukunagg/charts | Compares amounts across categories: games per placement, kills per weapon by season, revenue per plan per month, pick rate per agent. | [docs/llms/bar-chart.md](docs/llms/bar-chart.md) |
| `BorderBeam` | Sends a short light around the border of a card, a featured match, a season pass or a plan tile, to mark the one thing on a screen that deserves attention. | [docs/llms/border-beam.md](docs/llms/border-beam.md) |
| `BracketBeam` · @sukunagg/fx | Shows a single-elimination tournament bracket and sends a beam of light along the champion's path, round by round, until the trophy card ignites. | [docs/llms/bracket-beam.md](docs/llms/bracket-beam.md) |
| `Breadcrumbs` | Show the path to the current page and let users jump back up it. | [docs/llms/breadcrumbs.md](docs/llms/breadcrumbs.md) |
| `Button` | Triggers an action. | [docs/llms/button.md](docs/llms/button.md) |
| `Calendar` | Shows one or two months and lets people pick a day or a range with a mouse, touch or the keyboard. | [docs/llms/calendar.md](docs/llms/calendar.md) |
| `Card` | A surface container that groups related content on an elevation. | [docs/llms/card.md](docs/llms/card.md) |
| `Carousel` | A horizontal, one-slide-at-a-time content carousel for images, cards, or arbitrary nodes — the gap Slider (a range input) doesn't fill. | [docs/llms/carousel.md](docs/llms/carousel.md) |
| `Checkbox` | A boolean checkbox. | [docs/llms/checkbox.md](docs/llms/checkbox.md) |
| `Chip` | A compact token for filters, selections, or tags — optionally removable. | [docs/llms/chip.md](docs/llms/chip.md) |
| `Collapsible` | A single disclosure: "Show advanced options", "Read more", a sidebar group. | [docs/llms/collapsible.md](docs/llms/collapsible.md) |
| `Combobox` | A text input with a filtered list of suggestions (free-text autocomplete). | [docs/llms/combobox.md](docs/llms/combobox.md) |
| `CommandPalette` | One search box, opened from anywhere with ⌘K / Ctrl+K, that finds players, pages and actions. | [docs/llms/command-palette.md](docs/llms/command-palette.md) |
| `ContextMenu` | Offer contextual actions where the pointer is — right-click on desktop, long-press on touch. | [docs/llms/context-menu.md](docs/llms/context-menu.md) |
| `Counter` | Animates a number from a start to a target value — for stat tiles, KPIs, pricing, and dashboards. | [docs/llms/counter.md](docs/llms/counter.md) |
| `DataBar` · @sukunagg/charts | A number with a small bar under it, for comparing rows of a table at a glance: damage to champions in a scoreboard, pick rate in a meta table. | [docs/llms/data-bar.md](docs/llms/data-bar.md) |
| `DatePicker` | Lets people type a date or pick it from a calendar, for forms like a birth date or a deadline. | [docs/llms/date-picker.md](docs/llms/date-picker.md) |
| `DateRangePicker` | Picks a start and end day, for filters like "games from Sep 10 to Oct 9". | [docs/llms/date-range-picker.md](docs/llms/date-range-picker.md) |
| `DateTimePicker` | Picks a day and a start time in a given time zone, such as a tournament at 6:00 PM Hermosillo time, and hands back the exact moment as an ISO string. | [docs/llms/date-time-picker.md](docs/llms/date-time-picker.md) |
| `Dialog` | A modal dialog. | [docs/llms/dialog.md](docs/llms/dialog.md) |
| `Divider` | A thin rule that separates content, horizontally or vertically. | [docs/llms/divider.md](docs/llms/divider.md) |
| `DonutChart` · @sukunagg/charts | Shows a part-to-whole split with few parts: time played by role, games by queue, plans by share. | [docs/llms/donut-chart.md](docs/llms/donut-chart.md) |
| `Drawer` | A panel that slides in from an edge (nav, filters, details). | [docs/llms/drawer.md](docs/llms/drawer.md) |
| `EmptyState` | Takes the place of content that isn't there: no results, nothing yet this season, a player not found, a service not answering. | [docs/llms/empty-state.md](docs/llms/empty-state.md) |
| `Field` | Wraps one form control (an Input, Checkbox, Switch, …) with a label, an optional description and an optional error, and wires the id / aria-labelledby / aria-describedby / aria-invalid relationships for you. | [docs/llms/field.md](docs/llms/field.md) |
| `FileUpload`, `resizeImage` | Lets people add a file by tapping, picking or dropping it, and shows what they added. | [docs/llms/file-upload.md](docs/llms/file-upload.md) |
| `FlowField` · @sukunagg/fx | A matchmaking-screen backdrop where crimson particles stream along a drifting noise field and swirl around the content you centre on it. | [docs/llms/flow-field.md](docs/llms/flow-field.md) |
| `GlitchText` | Hits real text with short RGB-split glitch bursts, for elimination banners, match results and error or offline headings. | [docs/llms/glitch-text.md](docs/llms/glitch-text.md) |
| `GradientText` | Fills text with a gradient (via background-clip: text) for wordmarks, hero headings, and accent phrases. | [docs/llms/gradient-text.md](docs/llms/gradient-text.md) |
| `Heatmap` · @sukunagg/charts | A calendar of activity: one square per day, weeks as columns, darker or brighter by how much happened — games played per day, commits, sessions. | [docs/llms/heatmap.md](docs/llms/heatmap.md) |
| `HoloCard` · @sukunagg/fx | A holographic foil card that wraps your card art and tilts toward the pointer or the arrow keys. | [docs/llms/holo-card.md](docs/llms/holo-card.md) |
| `HoverCard` | Preview richer context for a link without a click — a user card, a repo summary, a footnote. | [docs/llms/hover-card.md](docs/llms/hover-card.md) |
| `AlertIcon`, `CameraIcon`, `ChartIcon`, `CheckIcon`, `ChevronDownIcon`, `ChevronLeftIcon`, `ChevronRightIcon`, `ChevronUpIcon`, `ClockIcon`, `CloseIcon`, `ExternalIcon`, `ImageIcon`, `InfoIcon`, `LockIcon`, `MoonIcon`, `RefreshIcon`, `SearchIcon`, `SunIcon`, `UploadIcon`, `UserIcon` | A small set of line icons for the interface: disclosure chevrons, status glyphs for empty and error states, the theme toggle, search, external links. | [docs/llms/icon.md](docs/llms/icon.md) |
| `Input` | A single-line text input. | [docs/llms/input.md](docs/llms/input.md) |
| `Kbd` | Shows a key or a shortcut the way it looks on a keyboard: Esc, ⌘ K, Ctrl + Shift + L. | [docs/llms/kbd.md](docs/llms/kbd.md) |
| `Lightning` · @sukunagg/fx | A crackling crimson lightning bolt behind a hero banner, drawn by one WebGL shader over a server-rendered SVG poster. | [docs/llms/lightning.md](docs/llms/lightning.md) |
| `AreaChart`, `LineChart` · @sukunagg/charts | Shows change across an ordered axis: rating over the last 30 matches, damage per round by role per week, placement per game, gold difference per minute. | [docs/llms/line-chart.md](docs/llms/line-chart.md) |
| `LootReveal` | Flips a row of face-down item cards to reveal what a player won, one after another, with a rarity glow per card and a spark burst for legendaries. | [docs/llms/loot-reveal.md](docs/llms/loot-reveal.md) |
| `MatchFound` | The ready-check prompt a game client shows when the queue pops: a draining countdown ring, who on the team has accepted, and the Accept / Decline actions. | [docs/llms/match-found.md](docs/llms/match-found.md) |
| `Menu` | A dropdown menu of actions triggered by a button. | [docs/llms/menu.md](docs/llms/menu.md) |
| `Meter` | Show a scalar measurement within a known range: storage used, quota, password strength, a score. | [docs/llms/meter.md](docs/llms/meter.md) |
| `MonthView` | Shows a whole month at once: a tournament schedule, a release calendar, or days played with a result in each cell. | [docs/llms/month-view.md](docs/llms/month-view.md) |
| `NumberField` | Enter a number precisely. | [docs/llms/number-field.md](docs/llms/number-field.md) |
| `Pagination`, `paginationRange` | Navigate between pages of results, with first/last always shown and ellipses in between. | [docs/llms/pagination.md](docs/llms/pagination.md) |
| `ParticleField` · @sukunagg/fx | An always-dark hero stage where crimson embers rise out of a glowing haze behind your overlay content, for season launches, event banners, landing heroes and "play now" panels. | [docs/llms/particle-field.md](docs/llms/particle-field.md) |
| `Poll` | Asks one question with a few choices, optionally a write-in, and shows the results as bars with percentages. | [docs/llms/poll.md](docs/llms/poll.md) |
| `Popover` | Show a small, interactive panel next to the element that opened it — filters, quick settings, a share box, a date picker later. | [docs/llms/popover.md](docs/llms/popover.md) |
| `Progress` | A horizontal progress bar, determinate or indeterminate. | [docs/llms/progress.md](docs/llms/progress.md) |
| `Prose` | Styles long-form text you don't control element by element: rules, legal drafts, patch notes, help articles rendered from Markdown, MDX or a CMS. | [docs/llms/prose.md](docs/llms/prose.md) |
| `RadialGauge` · @sukunagg/charts | One value against a range, drawn as a 270° arc with the number in the middle: LP to the next division, plan usage, a score out of 100. | [docs/llms/radial-gauge.md](docs/llms/radial-gauge.md) |
| `RadioGroup` | Choose one option from a small set. | [docs/llms/radio-group.md](docs/llms/radio-group.md) |
| `RankReveal` | Celebrates a new rank with a crest that bursts in over a ray field while an orbit draws around it and the rank name rises into place. | [docs/llms/rank-reveal.md](docs/llms/rank-reveal.md) |
| `RetroGrid` | A synthwave arena backdrop for hero sections: a crimson perspective grid scrolls toward the viewer under a glowing horizon, two spotlights sway in the sky and a light wave rolls out of the horizon every few seconds. | [docs/llms/retro-grid.md](docs/llms/retro-grid.md) |
| `RowActions` | Every data table eventually needs a per-row "Edit / Duplicate / Delete" menu. | [docs/llms/row-actions.md](docs/llms/row-actions.md) |
| `ScrambleText` | Decodes a short label out of glyph noise into its real text, sweeping left to right — for match-found titles, lobby rosters, callsigns and reveal moments. | [docs/llms/scramble-text.md](docs/llms/scramble-text.md) |
| `ScrollArea` | Give a bounded region (a list, a code block, a sidebar) an overlay scrollbar that looks the same in every browser and matches the Sukuna surface, instead of the OS default. | [docs/llms/scroll-area.md](docs/llms/scroll-area.md) |
| `Select` | A single-select dropdown. | [docs/llms/select.md](docs/llms/select.md) |
| `ShinyText` | Sweeps a soft light band across dimmed text — for "New" flags, premium labels, and subtle CTA emphasis. | [docs/llms/shiny-text.md](docs/llms/shiny-text.md) |
| `Skeleton` | A placeholder shimmer shown while content loads. | [docs/llms/skeleton.md](docs/llms/skeleton.md) |
| `Slider` | Pick a number from a range by dragging or with the keyboard. | [docs/llms/slider.md](docs/llms/slider.md) |
| `Sparkline` | A word-sized trend with no axes: a rating over the last games, matches per day, a win/loss streak. | [docs/llms/sparkline.md](docs/llms/sparkline.md) |
| `Spinner` | An indeterminate loading indicator (CSS spin). | [docs/llms/spinner.md](docs/llms/spinner.md) |
| `StatTile` | One headline number with what it means: a label, the value, a caption line (record, breakdown, scope) and optionally a signed change against a named period and a small trend. | [docs/llms/stat-tile.md](docs/llms/stat-tile.md) |
| `Stepper` | Show progress through an ordered sequence of steps. | [docs/llms/stepper.md](docs/llms/stepper.md) |
| `Switch` | An on/off toggle for an immediate setting (not form submission). | [docs/llms/switch.md](docs/llms/switch.md) |
| `Table` | Present tabular data with Sukuna styling. | [docs/llms/table.md](docs/llms/table.md) |
| `Tabs` | Switch between panels of related content. | [docs/llms/tabs.md](docs/llms/tabs.md) |
| `Text` | The typographic primitive. | [docs/llms/text.md](docs/llms/text.md) |
| `Textarea` | Multi-line free text: comments, descriptions, messages. | [docs/llms/textarea.md](docs/llms/textarea.md) |
| `Timeline` | Lists things in the order they happened or will happen, with a time or label on the left: a match's objectives, a team's night at a tournament, an audit log, a changelog. | [docs/llms/timeline.md](docs/llms/timeline.md) |
| `ToastProvider`, `useToast` | Transient notifications. | [docs/llms/toast.md](docs/llms/toast.md) |
| `Toggle`, `ToggleGroup` | Pick one option from a small, mutually-exclusive set (segmented control), or toggle several independent options (a formatting toolbar). | [docs/llms/toggle-group.md](docs/llms/toggle-group.md) |
| `Tooltip` | A hover/focus tooltip for supplementary text. | [docs/llms/tooltip.md](docs/llms/tooltip.md) |
| `useVideoPlayer`, `VideoPlayer`, `VideoPlayerAudio`, `VideoPlayerEndScreen`, `VideoPlayerOverlay`, `VideoPlayerPanel`, `VideoPlayerPlaylist`, `VideoPlayerShare`, `VideoPlayerSkip`, `VideoPlayerUpNext` | Plays a single video with Sukuna-branded controls instead of each browser's native chrome, so video looks the same in Chrome, Safari and Firefox and matches the rest of the library. | [docs/llms/video-player.md](docs/llms/video-player.md) |
| `XpLevelUp` | Celebrates an XP gain that crosses a level: the bar fills to the top, flashes once, the badge bursts and counts up to the new level, then the bar settles at the progress into that level. | [docs/llms/xp-level-up.md](docs/llms/xp-level-up.md) |
<!-- components:end -->

Fonts: the library does **not** bundle Archivo. Load it yourself (`@import` or `next/font`) so
`--sk-font-display` resolves; it falls back to the system sans otherwise.

## Accessibility

- WCAG AA contrast for every text/UI token pair in both themes, **enforced by a test**
  (`packages/ui/src/tokens.contrast.test.ts`) so it can't regress.
- Solid focus rings (≥3:1), visible keyboard highlights, tone-derived live-region roles on alerts,
  `prefers-reduced-motion` respected across all animated components.
- Built on Base UI for focus management, ARIA wiring and keyboard interaction; every component ships
  with axe tests in both themes plus real-browser Playwright tests for interactive flows.

## React Server Components

`Text`, `Badge`, `Card`, `Divider`, `Alert`, `Chip`, `Spinner`, `Avatar`, `Skeleton`, `Breadcrumbs`,
`Pagination`, `Stepper`, `Table` and `Progress` are server components (no `'use client'`).
Interactive components carry `'use client'` per file in the published package, so a server component
importing only `Text` never pulls a client boundary in.

## Performance at scale

Components render every row/item you pass — there is no built-in windowing. `Combobox` and `Menu`
apply `content-visibility: auto` and `Combobox` takes `maxRenderedItems`; for very large datasets
paginate (`Pagination`) or use server-side search. Details in [docs/known-issues-and-audit.md](docs/known-issues-and-audit.md).

## Development

Bun only. See [CLAUDE.md](CLAUDE.md) and [docs/](docs). Every unit of work ends green:

```bash
bun run check && bun run test:coverage && bun run build && bun run check:pkg
```

- `bun run storybook` — component workshop (dark/light toolbar, live token contrast badges).
- `bun run test:browser` — Playwright suite against a built Storybook.
- `bun run docs:build` / `bun run docs:check` — regenerate / verify the generated docs (README table, `llms.txt`, `docs/llms/*.md`).
- `bun run size` — per-export size budgets.
- `examples/showcase` — the deployable one-page showcase (`cd examples/showcase && bun install && bun link @sukunagg/ui && bun run dev`).

## License

MIT
