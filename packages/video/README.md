# @sukunagg/video

A branded, accessible React video player you can drop into **any** React app — no Tailwind, no
`@sukunagg/ui`, no other UI library. It's the `VideoPlayer` from
[sukuna-ui](https://github.com/sukuna-gg/sukunagg-ui), published on its own.

- Chapters on the seek bar, sprite thumbnails, captions with style settings, quality and speed menus
- Playlists, a side panel (chapters / transcript / playlist), up next, end screen, share, skip intro,
  overlays, audio mode, live (DVR), watch limit, snapshot, loop A–B, picture filters
- HLS through an optional adapter (`@sukunagg/video/hls`, hls.js as your own dependency)
- Keyboard shortcuts, touch gestures, fullscreen with the branded controls, picture-in-picture
- SSR-safe (Next.js App Router, Remix, Vite SSR); WCAG AA chrome
- ~17 kB (core) / ~21 kB (every part) of JS and ~7 kB of CSS, brotli

## Install

```bash
bun add @sukunagg/video
# or: npm i @sukunagg/video · pnpm add @sukunagg/video
```

Peer dependencies: `react` and `react-dom` 18 or newer. `hls.js` (≥ 1.5) only if you use the HLS
adapter.

## Use

Import the stylesheet once (your root layout or entry file), then render the player:

```tsx
import '@sukunagg/video/video.css'
import { VideoPlayer } from '@sukunagg/video'

export function Episode() {
  return (
    <VideoPlayer
      title="Last Train, Shibuya"
      info="Night walk · Episode 1"
      poster="/media/poster.jpg"
      sources={[
        { src: '/media/night-1080.mp4', type: 'video/mp4', res: 1080, default: true },
        { src: '/media/night-480.mp4', type: 'video/mp4', res: 480 },
      ]}
      tracks={[
        { kind: 'captions', src: '/media/en.vtt', srclang: 'en', label: 'English', default: true },
        { kind: 'chapters', src: '/media/chapters.vtt' },
      ]}
      thumbnails="/media/thumbs.vtt"
    />
  )
}
```

Parts are opt-in children, so you only ship what you render:

```tsx
import { VideoPlayer, VideoPlayerPanel, VideoPlayerPlaylist, VideoPlayerUpNext } from '@sukunagg/video'

<VideoPlayer title="Season 1">
  <VideoPlayerPlaylist items={episodes} />
  <VideoPlayerPanel tabs={['chapters', 'playlist']} />
  <VideoPlayerUpNext />
</VideoPlayer>
```

HLS:

```tsx
import { VideoPlayer } from '@sukunagg/video'
import { hlsEngine } from '@sukunagg/video/hls'

const hls = hlsEngine() // module scope, not inline in render

<VideoPlayer title="Live" src="https://cdn.example.com/stream.m3u8" engine={hls} />
```

## Theming

The player looks like sukuna-ui out of the box (dark chrome, crimson accent). Every value is a CSS
custom property, so you re-theme it by overriding variables — on `:root`, on a wrapper, or on the
player via `style` / `className`:

```css
:root {
  --vp-color-accent: #14b8a6;
  --vp-color-accent-deep: #0f766e;
  --vp-color-accent-glow: rgba(20, 184, 166, 0.55);
  --vp-gradient-accent: linear-gradient(135deg, #14b8a6, #0f766e);
  --vp-radius-lg: 6px;
  --vp-font-sans: Inter, system-ui, sans-serif;
}
```

| Variable | Default | Used for |
|---|---|---|
| `--vp-color-accent` | `#ff3b4e` | progress, active items, LIVE pill, focus ring source |
| `--vp-color-accent-deep` | `#b01221` | audio-mode backdrop + visualizer |
| `--vp-color-accent-glow` | `rgba(255, 59, 78, 0.6)` | play-button, seek-thumb and edge glows |
| `--vp-color-on-accent` | `#ffffff` | text and icons on the accent |
| `--vp-gradient-accent` | `linear-gradient(135deg, #d8253a, #b01221)` | big play button, action buttons |
| `--vp-color-focus-ring` | `#ff3b4e` | keyboard focus ring |
| `--vp-color-premium` | `#e8dcc4` | loop A–B range, "champagne" caption colour |
| `--vp-color-well` | `#000000` | player background, scrims, thumbnails |
| `--vp-color-surface` | `#141416` | menus, panels, toasts |
| `--vp-color-surface-2` | `#1c1c20` | inputs, chips, audio art frame |
| `--vp-color-line` / `--vp-color-line-soft` | `rgba(255,255,255,.1)` / `.06` | borders, dividers, rail tracks |
| `--vp-color-text` / `--vp-color-text-dim` | `#f4f1ec` / `#9a948a` | primary / secondary text and icons |
| `--vp-font-sans` / `--vp-font-display` | system stack / `"Archivo", …` | UI text / titles and big numbers |
| `--vp-text-xs` … `--vp-text-3xl` | `11px` … `34px` | type scale |
| `--vp-radius-sm` / `-md` / `-lg` / `-pill` | `8px` / `12px` / `16px` / `999px` | controls / menus / player / pills |
| `--vp-duration-fast` / `-base` / `-slow` | `120ms` / `200ms` / `320ms` | motion (off under reduced motion) |

The card shadow is compiled into the stylesheet and isn't a runtime variable; override it with a
`className` if you need to.

`labels` translates every string (`labels={{ play: 'Reproducir', … }}`).

## How it stays out of your way

- **Every class is prefixed** (`vp:bg-accent`) and the stylesheet is prebuilt, so it can't collide
  with your Tailwind, Bootstrap or hand-written CSS — and you don't need Tailwind at all.
- **Global element rules don't leak in.** The stylesheet is unlayered and carries a small reset
  scoped to the player (`@scope ([data-vp-root])`), so a site-wide `button { … }` doesn't restyle
  the controls.
- **Your content keeps your styles.** What you pass into the player (overlay children, `info`, the
  watch-limit card) sits outside that reset, so your own buttons and links look like yours.
- **Overriding a built-in style:** prefer the variables above. A conflicting class in `className`
  loses to the player's own utility (unlayered beats layered); use an important modifier
  (`rounded-none!`) when you really need it.

Import `video.css` before your own stylesheet if both define rules for the same elements.

## With sukuna-ui

`@sukunagg/ui` already depends on this package and re-exports everything (`import { VideoPlayer } from
'sukuna-ui'`, `@sukunagg/ui/video/hls`), and its `theme.css` / `styles.css` include `video.css` — so
there's nothing extra to install or import. Inside a sukuna-ui app the player also follows your
Sukuna tokens (`--sk-*`).

## License

MIT
