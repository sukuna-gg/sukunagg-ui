import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import {
  VideoPlayer,
  VideoPlayerEndScreen,
  VideoPlayerPanel,
  VideoPlayerPlaylist,
  type VideoPlayerProps,
  VideoPlayerShare,
  VideoPlayerSkip,
  VideoPlayerUpNext,
  type VideoPlaylistItem,
} from './index'

const VTT: Record<string, string> = {
  '/en.vtt':
    'WEBVTT\n\n00:00.000 --> 00:05.000\nFirst line\n\n00:05.000 --> 00:10.000\nSecond line',
}
let fetchSpy: ReturnType<typeof spyOn>
let play: ReturnType<typeof spyOn>
let pause: ReturnType<typeof spyOn>
beforeEach(() => {
  fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async (input: RequestInfo | URL) => {
    const body = VTT[String(input)]
    return body ? new Response(body) : new Response('', { status: 404 })
  }) as typeof fetch)
  play = spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  pause = spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  localStorage.clear()
})
afterEach(() => {
  fetchSpy.mockRestore()
  play.mockRestore()
  pause.mockRestore()
})

const items: VideoPlaylistItem[] = [
  { id: 'a', title: 'Shibuya', src: '/a.mp4', thumb: '/a.jpg', duration: 252, info: 'Ep 1' },
  { id: 'b', title: 'Tsukiji', src: '/b.mp4', poster: '/b.jpg' },
  { title: 'Omoide', sources: [{ src: '/c-720.mp4', res: 720 }] },
]
const button = (name: string | RegExp) => screen.getByRole('button', { name })
const region = () => screen.getByRole('region', { name: /./ })

function withDuration(v: HTMLVideoElement, d: number) {
  Object.defineProperty(v, 'duration', { value: d, configurable: true })
  fireEvent.durationChange(v)
}

function setup(props: Partial<VideoPlayerProps> = {}, parts: React.ReactNode = null) {
  const utils = render(
    <VideoPlayer title="Player" src="/own.mp4" {...(props as object)}>
      {parts}
    </VideoPlayer>,
  )
  const video = utils.container.querySelector('video') as HTMLVideoElement
  withDuration(video, 100)
  return { ...utils, video }
}

describe('VideoPlayerPlaylist', () => {
  it('plays the current item, navigates with buttons and hotkeys, and wraps with repeat', () => {
    const { video, rerender } = setup({}, <VideoPlayerPlaylist items={items} />)
    expect(video.getAttribute('src')).toBe('/a.mp4')
    expect(region()).toHaveAccessibleName('Shibuya')
    expect(screen.getByText('Ep 1')).toBeInTheDocument()
    expect(button('Previous video')).toBeDisabled()
    fireEvent.click(button('Next video'))
    expect(video.getAttribute('src')).toBe('/b.mp4')
    expect(video.getAttribute('poster')).toBe('/b.jpg')
    fireEvent.keyDown(region(), { key: 'N', shiftKey: true })
    expect(video.getAttribute('src')).toBe('/c-720.mp4')
    expect(button('Next video')).toBeDisabled()
    fireEvent.keyDown(region(), { key: 'P', shiftKey: true })
    expect(video.getAttribute('src')).toBe('/b.mp4')
    // previous restarts the current item once past 3s
    video.currentTime = 20
    fireEvent.timeUpdate(video)
    fireEvent.click(button('Previous video'))
    expect(video.currentTime).toBe(0)
    rerender(
      <VideoPlayer title="Player" src="/own.mp4">
        <VideoPlayerPlaylist items={items} repeat />
      </VideoPlayer>,
    )
    fireEvent.click(button('Previous video'))
    fireEvent.click(button('Previous video'))
    expect(video.getAttribute('src')).toBe('/c-720.mp4') // wrapped
    fireEvent.click(button('Next video'))
    expect(video.getAttribute('src')).toBe('/a.mp4')
  })

  it('auto-advances on end and plays the next item once it loads', () => {
    const { video } = setup({}, <VideoPlayerPlaylist items={items} />)
    fireEvent.ended(video)
    expect(video.getAttribute('src')).toBe('/b.mp4')
    withDuration(video, 90)
    fireEvent.loadedMetadata(video)
    expect(play).toHaveBeenCalled()
  })

  it('stops at the end without autoAdvance', () => {
    const { video } = setup({}, <VideoPlayerPlaylist items={items} autoAdvance={false} />)
    fireEvent.ended(video)
    expect(video.getAttribute('src')).toBe('/a.mp4')
    expect(button('Replay')).toBeInTheDocument()
  })

  it('works controlled and remembers the item', () => {
    const onIndexChange = mock()
    function Controlled() {
      const [i, setI] = useState(1)
      return (
        <VideoPlayer title="P" src="/own.mp4">
          <VideoPlayerPlaylist
            items={items}
            index={i}
            onIndexChange={(n) => {
              onIndexChange(n)
              setI(n)
            }}
          />
        </VideoPlayer>
      )
    }
    const first = render(<Controlled />)
    expect(first.container.querySelector('video')?.getAttribute('src')).toBe('/b.mp4')
    fireEvent.click(button('Next video'))
    expect(onIndexChange).toHaveBeenCalledWith(2)
    first.unmount()

    localStorage.setItem('sk-playlist:walks', '2')
    const second = setup({}, <VideoPlayerPlaylist items={items} rememberKey="walks" />)
    expect(second.video.getAttribute('src')).toBe('/c-720.mp4')
    fireEvent.click(button('Previous video'))
    expect(localStorage.getItem('sk-playlist:walks')).toBe('1')
  })

  it('falls back to the player props when unmounted or empty', () => {
    const { video, rerender } = setup({}, <VideoPlayerPlaylist items={[]} />)
    expect(video.getAttribute('src')).toBe('/own.mp4')
    rerender(<VideoPlayer title="Player" src="/own.mp4" />)
    expect(screen.queryByRole('button', { name: 'Next video' })).toBeNull()
  })

  it('survives a throwing localStorage', () => {
    const get = spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const set = spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { video } = setup({ resume: 'x' }, <VideoPlayerPlaylist items={items} rememberKey="k" />)
    fireEvent.loadedMetadata(video)
    fireEvent.pause(video)
    expect(video.getAttribute('src')).toBe('/a.mp4')
    get.mockRestore()
    set.mockRestore()
  })
})

describe('VideoPlayerPanel', () => {
  const chapters = [
    { start: 0, title: 'Cold open', thumb: '/c0.jpg' },
    { start: 40, title: 'Crossing' },
  ]

  it('opens from the list button and the chapter label, and lists chapters', async () => {
    const { video, container } = setup({ chapters }, <VideoPlayerPanel />)
    expect(screen.queryByRole('complementary')).toBeNull()
    fireEvent.click(button('Chapters: Cold open'))
    const panel = screen.getByRole('complementary', { name: 'Chapters and playlist' })
    expect(
      within(panel)
        .getAllByRole('tab')
        .map((t) => t.textContent),
    ).toEqual(['Chapters'])
    const crossing = within(panel).getByRole('button', { name: /Crossing/ })
    expect(crossing).toHaveTextContent('1:00') // duration to the end (100 − 40)
    fireEvent.click(crossing)
    expect(video.currentTime).toBe(40)
    fireEvent.timeUpdate(video)
    expect(within(panel).getByRole('button', { name: /Crossing/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(container.querySelector('img[src="/c0.jpg"]')).not.toBeNull()
    await expectAccessible(container)
    fireEvent.click(button('Close panel'))
    expect(screen.queryByRole('complementary')).toBeNull()
    fireEvent.click(button('Chapters and playlist'))
    expect(button('Chapters and playlist')).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(button('Chapters and playlist'))
    expect(screen.queryByRole('complementary')).toBeNull()
    fireEvent.click(button('Chapters and playlist'))
    fireEvent.keyDown(region(), { key: 'Escape' })
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('switches tabs with arrows and shows playlist + transcript', async () => {
    const scroll = mock()
    Element.prototype.scrollIntoView = scroll
    const en = [{ kind: 'captions' as const, src: '/en.vtt', srclang: 'en', label: 'English' }]
    const { video } = setup(
      { chapters },
      <>
        <VideoPlayerPlaylist items={items.map((it) => ({ ...it, tracks: en }))} />
        <VideoPlayerPanel defaultOpen />
      </>,
    )
    const panel = screen.getByRole('complementary')
    const tabs = within(panel).getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['Playlist', 'Transcript']) // items have no chapters
    const tablist = within(panel).getByRole('tablist')
    fireEvent.keyDown(tablist, { key: 'ArrowRight' })
    expect(within(panel).getByRole('tab', { name: 'Transcript' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    fireEvent.keyDown(tablist, { key: 'ArrowRight' })
    expect(within(panel).getByRole('tab', { name: 'Playlist' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    fireEvent.keyDown(tablist, { key: 'ArrowLeft' })
    fireEvent.keyDown(tablist, { key: 'x' })
    fireEvent.click(within(panel).getByRole('tab', { name: 'Playlist' }))
    const list = within(panel).getAllByRole('button', { name: /of 3/ })
    expect(list[0]).toHaveTextContent('Now playing')
    expect(list[0]).toHaveTextContent('4:12')
    fireEvent.click(list[1] as HTMLElement)
    expect(video.getAttribute('src')).toBe('/b.mp4')
    fireEvent.click(within(panel).getByRole('tab', { name: 'Transcript' }))
    await waitFor(() => expect(within(panel).getByText('First line')).toBeInTheDocument())
    expect(button(/First line/)).toHaveAttribute('aria-current', 'true')
    // The active cue scrolls into view in an effect, after it renders: wait for it.
    await waitFor(() => expect(scroll).toHaveBeenCalled())
    fireEvent.click(button(/Second line/))
    expect(video.currentTime).toBe(5)
  })

  it('offers nothing (and no list button) when no tab has content', () => {
    setup({}, <VideoPlayerPanel defaultOpen />)
    expect(screen.queryByRole('button', { name: 'Chapters and playlist' })).toBeNull()
    expect(screen.queryByRole('complementary')).toBeNull()
  })
})

describe('VideoPlayerUpNext + VideoPlayerEndScreen', () => {
  it('counts down near the end; Cancel stops auto-advance and the end screen shows', async () => {
    const { video } = setup(
      {},
      <>
        <VideoPlayerPlaylist items={items} />
        <VideoPlayerUpNext countdown={10} />
        <VideoPlayerEndScreen
          related={[
            { title: 'Linked', href: '/w/1', thumb: '/r1.jpg', duration: 61 },
            { title: 'Clicked', onSelect: mock() },
          ]}
        />
      </>,
    )
    fireEvent.play(video)
    video.currentTime = 50
    fireEvent.timeUpdate(video)
    expect(screen.queryByRole('status', { name: /Up next/ })).toBeNull()
    video.currentTime = 93.5
    fireEvent.timeUpdate(video)
    const card = screen.getByRole('status', { name: 'Up next in 7' })
    expect(card).toHaveTextContent('Tsukiji')
    fireEvent.click(within(card).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('status', { name: /Up next/ })).toBeNull()
    fireEvent.ended(video)
    expect(video.getAttribute('src')).toBe('/a.mp4') // no advance
    const end = screen.getByRole('region', { name: 'Watch next' })
    expect(within(end).getByRole('link', { name: /Linked/ })).toHaveAttribute('href', '/w/1')
    expect(within(end).getByRole('link', { name: /Linked/ })).toHaveTextContent('1:01')
    expect(within(end).queryByRole('button', { name: 'Share' })).toBeNull() // no Share part
    fireEvent.click(within(end).getByRole('button', { name: 'Clicked' }))
    fireEvent.click(within(end).getByRole('button', { name: 'Replay' }))
    expect(play).toHaveBeenCalled()
    expect(video.currentTime).toBe(0)
  })

  it('Play now jumps to the next item', () => {
    const { video } = setup(
      {},
      <>
        <VideoPlayerPlaylist items={items} />
        <VideoPlayerUpNext />
      </>,
    )
    fireEvent.play(video)
    video.currentTime = 95
    fireEvent.timeUpdate(video)
    fireEvent.click(button('Play now'))
    expect(video.getAttribute('src')).toBe('/b.mp4')
  })

  it('hides without a next item or before playback', () => {
    const { video } = setup({}, <VideoPlayerUpNext />)
    video.currentTime = 95
    fireEvent.timeUpdate(video)
    expect(screen.queryByRole('status', { name: /Up next/ })).toBeNull()
  })
})

describe('VideoPlayerShare', () => {
  it('opens from the top bar and the end screen, copies the link (optionally at a time)', async () => {
    const writeText = mock(async (_t: string) => {})
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const { video } = setup(
      {},
      <>
        <VideoPlayerShare
          url="https://sukuna.test/watch/a"
          embed={(u) => `<iframe src="${u}/embed"></iframe>`}
        />
        <VideoPlayerEndScreen />
      </>,
    )
    video.currentTime = 42
    fireEvent.timeUpdate(video)
    fireEvent.click(button('Share'))
    expect(pause).toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: 'Share this video' })
    const input = within(dialog).getByRole('textbox', { name: 'Video link' }) as HTMLInputElement
    expect(input).toHaveFocus()
    expect(input.value).toBe('https://sukuna.test/watch/a')
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Start at 0:42' }))
    expect(input.value).toBe('https://sukuna.test/watch/a?t=42')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy video link' }))
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: 'Copied' })).toBeInTheDocument(),
    )
    expect(writeText).toHaveBeenCalledWith('https://sukuna.test/watch/a?t=42')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy embed code' }))
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        '<iframe src="https://sukuna.test/watch/a/embed"></iframe>',
      ),
    )
    await expectAccessible(dialog)
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.ended(video)
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Watch next' })).getByRole('button', {
        name: 'Share',
      }),
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Watch next' })).toBeNull() // share covers it
    fireEvent.click(button('Close'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('selects the text when the clipboard is unavailable or refuses; string embed; default URL', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    setup({}, <VideoPlayerShare embed="<iframe></iframe>" />)
    fireEvent.click(button('Share'))
    const input = screen.getByRole('textbox', { name: 'Video link' }) as HTMLInputElement
    expect(input.value).toBe(window.location.href.split('#')[0] as string)
    // Spy on the instances: prototype spies don't survive other test files in the same run.
    const select = spyOn(input, 'select')
    fireEvent.click(button('Copy video link'))
    expect(select).toHaveBeenCalled()
    select.mockRestore()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('denied')) },
      configurable: true,
    })
    const selectArea = spyOn(
      screen.getByRole('textbox', { name: 'Embed code' }) as HTMLTextAreaElement,
      'select',
    )
    fireEvent.click(button('Copy embed code'))
    await waitFor(() => expect(selectArea).toHaveBeenCalled())
    selectArea.mockRestore()
  })

  it('closes with Escape from the player when focus is outside the sheet', () => {
    setup({}, <VideoPlayerShare />)
    fireEvent.click(button('Share'))
    act(() => region().focus())
    fireEvent.keyDown(region(), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('VideoPlayerSkip', () => {
  it('shows inside its range after playback starts and skips to the end', () => {
    const { video } = setup({}, <VideoPlayerSkip start={2} end={12} />)
    video.currentTime = 5
    fireEvent.timeUpdate(video)
    expect(screen.queryByRole('button', { name: 'Skip intro' })).toBeNull() // not started
    fireEvent.play(video)
    fireEvent.click(button('Skip intro'))
    expect(video.currentTime).toBe(12)
    expect(screen.queryByRole('button', { name: 'Skip intro' })).toBeNull()
  })

  it('takes a custom label', () => {
    const { video } = setup({}, <VideoPlayerSkip start={0} end={5} label="Skip recap" />)
    fireEvent.play(video)
    expect(button('Skip recap')).toBeInTheDocument()
  })
})

describe('VideoPlayer W2 core', () => {
  it('offers to resume, saves progress and forgets it at the end', () => {
    localStorage.setItem('sk-video:ep1', '42')
    const { video } = setup({ resume: 'ep1' })
    fireEvent.loadedMetadata(video)
    expect(screen.getByText('Resume from 0:42?')).toBeInTheDocument()
    fireEvent.click(button('Resume'))
    expect(video.currentTime).toBe(42)
    expect(play).toHaveBeenCalled()
    expect(screen.queryByText(/Resume from/)).toBeNull()
    video.currentTime = 60
    fireEvent.timeUpdate(video)
    expect(localStorage.getItem('sk-video:ep1')).toBe('60')
    video.currentTime = 61
    fireEvent.timeUpdate(video) // < 5s since the last save
    expect(localStorage.getItem('sk-video:ep1')).toBe('60')
    video.currentTime = 70
    fireEvent.pause(video)
    expect(localStorage.getItem('sk-video:ep1')).toBe('70')
    fireEvent.ended(video)
    expect(localStorage.getItem('sk-video:ep1')).toBeNull()
  })

  it('Start over dismisses the prompt; near-start or near-end positions are ignored', () => {
    localStorage.setItem('sk-video:ep2', '30')
    const first = setup({ resume: 'ep2' })
    fireEvent.loadedMetadata(first.video)
    fireEvent.click(button('Start over'))
    expect(screen.queryByText(/Resume from/)).toBeNull()
    first.unmount()
    localStorage.setItem('sk-video:ep3', '98')
    const second = setup({ resume: 'ep3' })
    fireEvent.loadedMetadata(second.video)
    expect(screen.queryByText(/Resume from/)).toBeNull()
  })

  it('pauses the other players in its sync group', () => {
    render(
      <>
        <VideoPlayer title="One" src="/1.mp4" syncGroup="page" />
        <VideoPlayer title="Two" src="/2.mp4" syncGroup="page" />
        <VideoPlayer title="Three" src="/3.mp4" />
      </>,
    )
    const [one] = Array.from(document.querySelectorAll('video'))
    pause.mockClear()
    fireEvent.play(one as HTMLVideoElement)
    expect(pause).toHaveBeenCalledTimes(1)
  })

  it('toggles theater mode uncontrolled and controlled', () => {
    const onTheaterChange = mock()
    const { unmount } = setup({ onTheaterChange })
    fireEvent.click(button('Theater mode'))
    expect(onTheaterChange).toHaveBeenCalledWith(true)
    expect(button('Theater mode')).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(region(), { key: 't' })
    expect(onTheaterChange).toHaveBeenLastCalledWith(false)
    unmount()
    setup({ theater: true })
    expect(button('Theater mode')).toHaveAttribute('aria-pressed', 'true')
    unmount()
  })

  it('has no theater button or T key by default', () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Theater mode' })).toBeNull()
    fireEvent.keyDown(region(), { key: 't' })
  })

  it('docks while playing off-screen, can be closed, and re-arms when back in view', () => {
    let fire: (e: Partial<IntersectionObserverEntry>) => void = () => {}
    const disconnect = mock()
    const orig = globalThis.IntersectionObserver
    globalThis.IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback) {
        fire = (e) => cb([e as IntersectionObserverEntry], this as unknown as IntersectionObserver)
      }
      observe() {}
      disconnect = disconnect
    } as unknown as typeof IntersectionObserver
    const { video, unmount } = setup({ floating: true })
    fireEvent.play(video)
    act(() => fire({ isIntersecting: false, boundingClientRect: { height: 360 } as DOMRect }))
    expect(region()).toHaveAttribute('data-docked')
    expect((region().parentElement as HTMLElement).style.height).toBe('360px')
    fireEvent.click(button('Close mini player'))
    expect(region()).not.toHaveAttribute('data-docked')
    act(() => fire({ isIntersecting: true }))
    act(() => fire({ isIntersecting: false, boundingClientRect: { height: 360 } as DOMRect }))
    expect(region()).toHaveAttribute('data-docked')
    act(() => fire(undefined as unknown as Partial<IntersectionObserverEntry>))
    fireEvent.pause(video)
    expect(region()).not.toHaveAttribute('data-docked')
    unmount()
    expect(disconnect).toHaveBeenCalled()
    globalThis.IntersectionObserver = orig
  })
})
