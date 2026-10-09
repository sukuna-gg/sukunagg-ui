import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { GlitchText, type GlitchTextElement } from './index'

const root = (el: HTMLElement) => el.closest('[data-sk-glitch-text]') as HTMLElement
/** root > frame > text: the span that holds the real text. */
const textOf = (r: HTMLElement) => r.firstElementChild?.firstElementChild as HTMLElement
const hidden = (r: HTMLElement) => Array.from(r.querySelectorAll<HTMLElement>('[aria-hidden]'))
const byClass = (r: HTMLElement, cls: string) =>
  Array.from(r.querySelectorAll<HTMLElement>('span')).find((el) => el.classList.contains(cls))

describe('GlitchText', () => {
  it('server-renders every element × intro × scanline with the text and its hidden copies', () => {
    const tags: GlitchTextElement[] = [
      'span',
      'p',
      'div',
      'strong',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
    ]
    for (const as of tags) {
      for (const intro of [true, false]) {
        for (const scanline of [true, false]) {
          const html = renderServer(
            <GlitchText as={as} intro={intro} scanline={scanline}>
              Eliminated
            </GlitchText>,
          )
          expect(html.startsWith(`<${as}`)).toBe(true)
          expect(html).toContain('data-sk-glitch-text=""')
          // The text once for real, then fringe ×2 (+ scanline) and the shard as copies.
          expect(html.split('Eliminated').length - 1).toBe(scanline ? 5 : 4)
          expect(html.split('aria-hidden="true"').length - 1).toBe(scanline ? 5 : 4)
          // Every copy that holds the text is kept out of search snippets (the edge has no text).
          expect(html.split('data-nosnippet=""').length - 1).toBe(scanline ? 4 : 3)
        }
      }
    }
  })

  it('exposes the text exactly once to assistive tech', () => {
    render(<GlitchText as="h2">Eliminated</GlitchText>)
    const heading = screen.getByRole('heading', { level: 2, name: 'Eliminated' })
    expect(heading.tagName).toBe('H2')
    // Every copy is aria-hidden and unselectable; only the text slot holds visible text.
    const copies = hidden(heading)
    expect(copies).toHaveLength(4)
    for (const copy of copies) {
      expect(copy.getAttribute('aria-hidden')).toBe('true')
      expect(copy.classList.contains('pointer-events-none')).toBe(true)
      // Copies that hold text can't be selected or quoted in a search snippet.
      if (copy.textContent) {
        expect(copy.classList.contains('select-none')).toBe(true)
        expect(copy.hasAttribute('data-nosnippet')).toBe(true)
      }
    }
    const visible = screen.getAllByText('Eliminated').filter((el) => !el.closest('[aria-hidden]'))
    expect(visible).toHaveLength(1)
  })

  it('plays the intro by default and maps intro={false} to the plain burst loop', () => {
    const { unmount } = render(<GlitchText data-testid="g">Victory</GlitchText>)
    const on = screen.getByTestId('g')
    const text = textOf(on)
    expect(on.classList.contains('animate-glitch-text-burst-intro')).toBe(true)
    expect(on.classList.contains('animate-glitch-text-burst')).toBe(false)
    expect(text.classList.contains('animate-glitch-text-reveal')).toBe(true)
    unmount()

    render(
      <GlitchText intro={false} data-testid="g">
        Offline
      </GlitchText>,
    )
    const off = screen.getByTestId('g')
    expect(off.classList.contains('animate-glitch-text-burst')).toBe(true)
    expect(off.classList.contains('animate-glitch-text-burst-intro')).toBe(false)
    expect(textOf(off).className).not.toMatch(/(^|\s)animate-/)
  })

  it('maps every layer to its utilities and guards reduced motion on each', () => {
    render(<GlitchText data-testid="g">Defeat</GlitchText>)
    const r = screen.getByTestId('g')
    const frame = r.firstElementChild as HTMLElement
    const text = textOf(r)
    expect(r.classList.contains('motion-reduce:animate-none')).toBe(true)
    expect(frame.classList.contains('relative')).toBe(true)
    expect(frame.classList.contains('isolate')).toBe(true)
    expect(frame.hasAttribute('aria-hidden')).toBe(false)
    expect(text.classList.contains('glitch-text-cut')).toBe(true)
    expect(text.classList.contains('glitch-text-glow')).toBe(true)
    expect(text.classList.contains('motion-reduce:animate-none')).toBe(true)
    // Forced colors drop the shard's shadows, so the band must not be cut there.
    expect(text.classList.contains('forced-colors:[clip-path:none]')).toBe(true)

    const [fringe, late, shard, edge] = hidden(r)
    expect(fringe?.classList.contains('animate-glitch-text-split')).toBe(true)
    expect(fringe?.classList.contains('[--sk-glitch-text-tint:var(--sk-accent)]')).toBe(true)
    expect(late?.classList.contains('animate-glitch-text-split-late')).toBe(true)
    expect(late?.classList.contains('[--sk-glitch-text-tint:var(--sk-chart-2)]')).toBe(true)
    expect(late?.classList.contains('[--sk-glitch-text-side:-1]')).toBe(true)
    expect(shard?.classList.contains('glitch-text-shard')).toBe(true)
    // The shard's glyphs live in one inner span, painted into the band by its text-shadow.
    expect(shard?.children).toHaveLength(1)
    expect(shard?.firstElementChild?.classList.contains('glitch-text-shard-ink')).toBe(true)
    expect(shard?.firstElementChild?.textContent).toBe('Defeat')
    expect(edge?.classList.contains('glitch-text-edge')).toBe(true)
    expect(edge?.textContent).toBe('')
    expect(edge?.hasAttribute('data-nosnippet')).toBe(false)
    for (const layer of [fringe, late, shard, edge]) {
      expect(layer?.classList.contains('motion-reduce:hidden')).toBe(true)
    }
    // Copies sit inside the text (fringes, behind it) or beside it in the frame (shard, edge), so
    // padding on the root can't push them out of line with the text.
    expect(fringe?.parentElement).toBe(text)
    expect(shard?.parentElement).toBe(frame)
    expect(edge?.parentElement).toBe(frame)
  })

  it('adds the clipped scanline texture only when asked', () => {
    const { unmount } = render(<GlitchText data-testid="g">Offline</GlitchText>)
    expect(byClass(screen.getByTestId('g'), 'glitch-text-scanlines')).toBeUndefined()
    unmount()

    render(
      <GlitchText scanline data-testid="g">
        Offline
      </GlitchText>,
    )
    const scan = byClass(screen.getByTestId('g'), 'glitch-text-scanlines')
    expect(scan?.getAttribute('aria-hidden')).toBe('true')
    expect(scan?.classList.contains('bg-clip-text')).toBe(true)
    expect(scan?.classList.contains('[-webkit-text-fill-color:transparent]')).toBe(true)
    // Solid line stops faded by the layer (a color-mix stop renders as a flat tint in Firefox).
    expect(scan?.classList.contains('opacity-30')).toBe(true)
    expect(scan?.classList.contains('motion-reduce:hidden')).toBe(false)
    expect(scan?.textContent).toBe('Offline')
  })

  it('does not leak its own props, passes native ones through and merges className last', () => {
    render(
      <GlitchText
        as="p"
        intro={false}
        scanline
        id="banner"
        aria-label="Round lost"
        data-testid="g"
        className="block text-lg"
      >
        Round lost
      </GlitchText>,
    )
    const el = screen.getByTestId('g')
    expect(el.tagName).toBe('P')
    for (const attr of ['as', 'intro', 'scanline']) expect(el.hasAttribute(attr)).toBe(false)
    expect(el.id).toBe('banner')
    expect(el.getAttribute('aria-label')).toBe('Round lost')
    // Consumer `block` replaces our `inline-block` (tailwind-merge), extra classes append.
    expect(el.classList.contains('block')).toBe(true)
    expect(el.classList.contains('inline-block')).toBe(false)
    expect(el.classList.contains('text-lg')).toBe(true)
  })

  it('forwards ref to the rendered element', () => {
    const span = createRef<HTMLElement>()
    const { unmount } = render(<GlitchText ref={span}>x</GlitchText>)
    expect(span.current).toBeInstanceOf(HTMLSpanElement)
    expect(root(span.current as HTMLElement)).toBe(span.current as HTMLElement)
    unmount()

    const h1 = createRef<HTMLElement>()
    render(
      <GlitchText ref={h1} as="h1">
        x
      </GlitchText>,
    )
    expect(h1.current).toBeInstanceOf(HTMLHeadingElement)
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(
      <GlitchText as="h2" scanline>
        Eliminated
      </GlitchText>,
    )
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <GlitchText as="h1" scanline>
            Eliminated
          </GlitchText>
          <p>
            Server status: <GlitchText intro={false}>Offline</GlitchText>
          </p>
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
