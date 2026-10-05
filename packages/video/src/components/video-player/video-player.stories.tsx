import type { Meta, StoryObj } from '@storybook/react-vite'
import { type ComponentPropsWithoutRef, type ComponentType, useRef, useState } from 'react'
import { hlsEngine } from '../../hls'
import {
  useVideoPlayer,
  VideoPlayer,
  VideoPlayerAudio,
  VideoPlayerEndScreen,
  VideoPlayerOverlay,
  VideoPlayerPanel,
  VideoPlayerPlaylist,
  type VideoPlayerProps,
  VideoPlayerShare,
  VideoPlayerSkip,
  VideoPlayerUpNext,
  type VideoPlaylistItem,
} from './index'

// Fixtures live in .storybook/public/video (served next to iframe.html). Relative URLs so the
// Storybook also works from a sub-path (GitHub Pages).
const V = 'video/'
const sources = [
  { src: `${V}night-360.webm`, type: 'video/webm', res: 360, default: true },
  { src: `${V}night-180.webm`, type: 'video/webm', res: 180 },
]
const tracks: VideoPlayerProps['tracks'] = [
  { kind: 'captions', src: `${V}captions-en.vtt`, srclang: 'en', label: 'English', default: true },
  { kind: 'subtitles', src: `${V}captions-es.vtt`, srclang: 'es', label: 'Español' },
  { kind: 'chapters', src: `${V}chapters.vtt` },
]

// The props type is a union (title | aria-label); stories always pass a title, so pin that branch
// for Storybook's arg inference.
type Args = Extract<VideoPlayerProps, { title: string }>
const Player = VideoPlayer as unknown as ComponentType<Args>

// Story-only button: the player package doesn't depend on sukuna-ui, so demos that need a plain
// call-to-action style one inline instead of importing Button.
const StoryButton = ({
  primary,
  style,
  ...rest
}: ComponentPropsWithoutRef<'button'> & { primary?: boolean }) => (
  <button
    type="button"
    style={{
      height: 36,
      padding: '0 14px',
      borderRadius: 10,
      border: primary ? 0 : '1px solid rgba(255, 255, 255, 0.12)',
      background: primary ? '#D8253A' : 'rgba(255, 255, 255, 0.06)',
      color: primary ? '#fff' : 'inherit',
      font: 'inherit',
      fontWeight: 600,
      cursor: 'pointer',
      ...style,
    }}
    {...rest}
  />
)

const meta = {
  title: 'Video/VideoPlayer',
  component: Player,
  tags: ['autodocs'],
  args: {
    title: 'Last Train, Shibuya',
    info: 'Night walk · Episode 1',
    poster: `${V}poster.jpg`,
    sources,
    tracks,
    thumbnails: `${V}thumbs.vtt`,
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 820 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

/** Everything W1 ships: chapters, thumbnails, captions, quality, speed. */
export const Playground: Story = {}

/** Just a source and a title. */
export const Basic: Story = {
  args: { sources: undefined, tracks: undefined, thumbnails: undefined, src: `${V}night-360.webm` },
}

/** Chapters split the bar; hover for the thumbnail and chapter name. Shift+←/→ jumps chapters. */
export const ChaptersAndThumbnails: Story = {
  args: {
    tracks: undefined,
    chapters: [
      { start: 0, title: 'Cold open' },
      { start: 6, title: 'Last train out' },
      { start: 14, title: 'The scramble crossing' },
      { start: 22, title: 'Down to the river' },
    ],
  },
}

/** Two caption tracks; the gear → Subtitles / CC → Caption style adjusts size, color, background. */
export const WithCaptions: Story = { args: { tracks: tracks?.slice(0, 2) } }

/** Two renditions; the gear → Quality switches and keeps the position. */
export const Quality: Story = { args: { tracks: undefined, thumbnails: undefined } }

export const CustomSpeeds: Story = { args: { playbackRates: [1, 1.5, 2, 3] } }

export const AspectRatios: Story = {
  render: (args) => (
    <div
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      }}
    >
      {(['16/9', '4/3', '1/1', '21/9', '9/16'] as const).map((ratio) => (
        <VideoPlayer key={ratio} {...args} title={`Aspect ${ratio}`} aspectRatio={ratio} />
      ))}
    </div>
  ),
}

/** Below 480px the bar drops the volume slider, PiP and skip buttons. */
export const Compact: Story = {
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
}

/** The chrome keeps the dark palette inside a light page (a light host with its own colours). */
export const LightAppContext: Story = {
  decorators: [
    (Story) => (
      <div data-theme="light" style={{ background: '#FAF9F5', padding: 16, borderRadius: 16 }}>
        <p style={{ color: '#141413', fontFamily: 'var(--vp-font-display)', fontWeight: 700 }}>
          Episode 3 · Lesson notes
        </p>
        <Story />
      </div>
    ),
  ],
}

export const ErrorState: Story = {
  args: { sources: undefined, tracks: undefined, src: `${V}does-not-exist.webm` },
}

/** Autoplays muted (what browsers allow) with a "Tap to unmute" chip. */
export const MutedAutoplay: Story = { args: { autoplayPolicy: 'muted' } }

/** `ref` points at the `<video>`, so outside buttons can drive it. */
export const Controlled: Story = {
  render: (args) => {
    const ref = useRef<HTMLVideoElement>(null)
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <VideoPlayer {...args} ref={ref} />
        <div style={{ display: 'flex', gap: 8 }}>
          <StoryButton onClick={() => ref.current?.play()}>Play</StoryButton>
          <StoryButton onClick={() => ref.current?.pause()}>Pause</StoryButton>
          <StoryButton
            onClick={() => {
              if (ref.current) ref.current.currentTime = 20
            }}
          >
            Jump to 0:20
          </StoryButton>
        </div>
      </div>
    )
  },
}

function ChapterBadge() {
  const { state } = useVideoPlayer()
  const chapter = state.chapters[state.chapterIndex]
  if (!chapter || !state.controlsVisible) return null
  return (
    <div
      style={{
        position: 'absolute',
        top: 64,
        left: 20,
        padding: '4px 10px',
        borderRadius: 8,
        background: 'var(--vp-color-surface-2)',
        border: '1px solid var(--vp-color-line)',
        fontSize: 12,
      }}
    >
      Chapter {state.chapterIndex + 1} of {state.chapters.length}
    </div>
  )
}

/** A custom part built with `useVideoPlayer()`. */
export const CustomPart: Story = {
  render: (args) => (
    <VideoPlayer {...args}>
      <ChapterBadge />
    </VideoPlayer>
  ),
}

// ── W2: parts ─────────────────────────────────────────────────────────────────────────────

const episodes: VideoPlaylistItem[] = [
  {
    id: 'shibuya',
    title: 'Last Train, Shibuya',
    info: 'Night walk · Episode 1',
    sources,
    tracks,
    thumbnails: `${V}thumbs.vtt`,
    poster: `${V}poster.jpg`,
    thumb: `${V}poster.jpg`,
    duration: 30,
  },
  {
    id: 'tsukiji',
    title: 'Morning Market, Tsukiji',
    info: 'Night walk · Episode 2',
    src: `${V}night-180.webm`,
    tracks: tracks?.slice(0, 1),
    thumb: `${V}poster.jpg`,
    duration: 30,
  },
  {
    id: 'omoide',
    title: 'Rain on Omoide Yokocho',
    info: 'Night walk · Episode 3',
    src: `${V}night-360.webm`,
    thumb: `${V}poster.jpg`,
    duration: 30,
  },
]

const related = [
  { title: 'Harbour Lights, Yokohama', thumb: `${V}poster.jpg`, duration: 426, href: '#yokohama' },
  { title: 'Snow Monkeys, Nagano', thumb: `${V}poster.jpg`, duration: 263, href: '#nagano' },
  { title: 'Kyoto at Dawn', thumb: `${V}poster.jpg`, duration: 318, href: '#kyoto' },
]

/** Everything together: playlist, side panel, skip intro, up next, share and the end screen. */
export const FullPlayer: Story = {
  render: (args) => (
    <VideoPlayer {...args} resume="story-full" onTheaterChange={() => {}}>
      <VideoPlayerPlaylist items={episodes} />
      <VideoPlayerPanel />
      <VideoPlayerSkip start={0} end={6} />
      <VideoPlayerUpNext countdown={8} />
      <VideoPlayerShare
        url="https://sukuna.test/watch/night-walks"
        embed={(url) =>
          `<iframe src="${url}/embed" width="640" height="360" allowfullscreen></iframe>`
        }
      />
      <VideoPlayerEndScreen related={related} />
    </VideoPlayer>
  ),
}

/** The side panel open on chapters; switch to the transcript tab. */
export const ChaptersPanel: Story = {
  render: (args) => (
    <VideoPlayer {...args}>
      <VideoPlayerPanel tabs={['chapters', 'transcript']} defaultOpen />
    </VideoPlayer>
  ),
}

/** A playlist with previous / next, Shift+N / Shift+P and auto-advance. */
export const Playlist: Story = {
  render: (args) => (
    <VideoPlayer {...args}>
      <VideoPlayerPlaylist items={episodes} />
      <VideoPlayerPanel tabs={['playlist']} defaultOpen />
      <VideoPlayerUpNext />
    </VideoPlayer>
  ),
}

/** Seek near the end (press 9) to see the end screen. */
export const EndScreen: Story = {
  render: (args) => (
    <VideoPlayer {...args}>
      <VideoPlayerShare />
      <VideoPlayerEndScreen related={related} />
    </VideoPlayer>
  ),
}

export const Share: Story = {
  render: (args) => (
    <VideoPlayer {...args}>
      <VideoPlayerShare
        url="https://sukuna.test/watch/shibuya"
        embed={(url) => `<iframe src="${url}/embed" width="640" height="360"></iframe>`}
      />
    </VideoPlayer>
  ),
}

/** Appears for the first 6 seconds once playback starts. */
export const SkipIntro: Story = {
  render: (args) => (
    <VideoPlayer {...args}>
      <VideoPlayerSkip start={0} end={6} />
    </VideoPlayer>
  ),
}

/** Plays past 5s, reload the story, and it offers to resume. */
export const Resume: Story = { args: { resume: 'story-resume' } }

/** The app owns the wider layout; the player owns the button and the T key. */
export const TheaterMode: Story = {
  render: (args) => {
    const [theater, setTheater] = useState(false)
    return (
      <div style={{ maxWidth: theater ? '100%' : 640, transition: 'max-width 320ms' }}>
        <VideoPlayer {...args} theater={theater} onTheaterChange={setTheater} />
      </div>
    )
  },
  decorators: [(Story) => <Story />],
}

/** Play, then scroll down: the player docks to the corner. */
export const Floating: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 16 }}>
      <VideoPlayer {...args} floating />
      <div style={{ height: 1600, color: 'var(--vp-color-text-dim)' }}>
        Scroll down while it plays…
      </div>
    </div>
  ),
}

/** Two players in one sync group: starting one pauses the other. */
export const SyncGroup: Story = {
  render: (args) => (
    <div
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      }}
    >
      <VideoPlayer {...args} title="Camera A" syncGroup="cams" />
      <VideoPlayer {...args} title="Camera B" syncGroup="cams" />
    </div>
  ),
}

// ── W3: tools ─────────────────────────────────────────────────────────────────────────────

/** Every gear row: quality, speed, captions, picture, sleep timer, loop, snapshot, download. */
export const AllSettings: Story = {
  args: {
    settings: ['quality', 'speed', 'captions', 'picture', 'sleep', 'loop', 'snapshot', 'download'],
    download: { src: `${V}night-360.webm`, filename: 'last-train-shibuya.webm' },
    crossOrigin: 'anonymous',
  },
}

/** Stops at 0:10 and covers the frame with a call to action. */
export const WatchLimit: Story = {
  args: {
    watchLimit: {
      seconds: 10,
      content: (
        <div style={{ display: 'grid', gap: 12, justifyItems: 'center', textAlign: 'center' }}>
          <strong style={{ fontFamily: 'var(--vp-font-display)', fontSize: 18 }}>
            Your free preview ended
          </strong>
          <span style={{ color: 'var(--vp-color-text-dim)' }}>Start a trial to keep watching.</span>
          <StoryButton primary>Start 7-day free trial</StoryButton>
        </div>
      ),
    },
  },
}

/**
 * Live mode against the 30s fixture (its seekable range stands in for a DVR window): the LIVE
 * pill turns crimson at the edge; seek back and it shows the time behind, click it to return.
 */
export const Live: Story = {
  args: { live: { dvrWindow: 20 }, tracks: undefined, thumbnails: undefined, info: 'Live now' },
}

/** A dismissible card at 0:03–0:12 and a banner that shows while paused. */
export const Overlays: Story = {
  render: (args) => (
    <VideoPlayer {...args}>
      <VideoPlayerOverlay aria-label="Tour offer" start={3} end={12} dismissible>
        <div style={{ display: 'grid', gap: 8 }}>
          <strong>Night food walk</strong>
          <span style={{ color: 'var(--vp-color-text-dim)' }}>
            Book this route with a local guide.
          </span>
          <StoryButton>See tours</StoryButton>
        </div>
      </VideoPlayerOverlay>
      <VideoPlayerOverlay aria-label="Sponsor" showOn="pause" variant="banner">
        Brought to you by Sukuna Sound · night walks every Friday
      </VideoPlayerOverlay>
    </VideoPlayer>
  ),
}

/** Audio mode: cover tile, title and a Web Audio visualizer instead of the picture. */
export const AudioMode: Story = {
  args: {
    title: 'Last Train (Night Mix)',
    tracks: undefined,
    thumbnails: undefined,
    crossOrigin: 'anonymous',
  },
  render: (args) => (
    <VideoPlayer {...args}>
      <VideoPlayerAudio artist="Sukuna Sound · Episode 3" />
    </VideoPlayer>
  ),
}

// ── W4: streaming engines ──────────────────────────────────────────────────────────────────

const hls = hlsEngine()

/**
 * HLS through `hlsEngine()` from `@sukunagg/video/hls` (hls.js is an optional peer). The Quality
 * menu comes from the manifest: Auto plus each level.
 */
export const HlsStream: Story = {
  args: {
    sources: undefined,
    src: `${V}hls/master.m3u8`,
    engine: hls,
    tracks: tracks?.slice(0, 1),
    thumbnails: `${V}thumbs.vtt`,
  },
}
