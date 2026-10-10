import { afterEach, describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { Kbd } from './index'

/** Pretend to be an Apple device (or not) for the client snapshot. */
const setPlatform = (platform: string, uaPlatform?: string) => {
  Object.defineProperty(navigator, 'platform', { value: platform, configurable: true })
  Object.defineProperty(navigator, 'userAgentData', {
    value: uaPlatform === undefined ? undefined : { platform: uaPlatform },
    configurable: true,
  })
}

afterEach(() => {
  // Back to happy-dom's own values.
  Reflect.deleteProperty(navigator, 'platform')
  Reflect.deleteProperty(navigator, 'userAgentData')
})

/** Visible text: everything except the screen-reader-only spans. */
const visible = (el: Element) => {
  const clone = el.cloneNode(true) as Element
  for (const sr of clone.querySelectorAll('.sr-only')) sr.remove()
  return clone.textContent
}

describe('Kbd', () => {
  it('renders a chord on the server with the non-Apple keys', () => {
    const html = renderServer(<Kbd keys="mod+K" />)
    expect(html).toContain('Ctrl')
    expect(html).toContain('Control')
    expect(html).not.toContain('⌘')
  })

  it('nests one <kbd> per key inside the outer <kbd>', () => {
    const { container } = render(<Kbd keys="mod+shift+L" platform="other" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.tagName).toBe('KBD')
    expect(root.querySelectorAll(':scope kbd')).toHaveLength(3)
    expect(visible(root)).toBe('Ctrl+Shift+L')
  })

  it('draws Apple chords without a visible "+" but keeps it for screen readers', () => {
    const { container } = render(<Kbd keys="mod+shift+L" platform="mac" />)
    const root = container.firstElementChild as HTMLElement
    expect(visible(root)).toBe('⌘⇧L')
    expect(root.textContent).toBe('⌘Command+⇧Shift+L')
  })

  it('names symbol keys for screen readers and hides the glyph', () => {
    const { container } = render(<Kbd keys="alt+up" platform="mac" />)
    const hidden = [...container.querySelectorAll('[aria-hidden="true"]')].map((e) => e.textContent)
    const spoken = [...container.querySelectorAll('.sr-only')].map((e) => e.textContent)
    expect(hidden).toEqual(['⌥', '↑'])
    expect(spoken).toEqual(['Option', '+', 'Up arrow'])
  })

  it('renders a sequence with the then word, translatable', () => {
    const { container, rerender } = render(<Kbd keys={['G', 'M']} />)
    expect(visible(container.firstElementChild as Element)).toBe('GthenM')
    rerender(<Kbd keys={['g', 'm']} thenLabel="luego" />)
    expect(screen.getByText('luego')).toBeTruthy()
  })

  it('prints unknown keys as given and uppercases single letters', () => {
    const { container } = render(<Kbd keys="shift+F5+plus+?" platform="other" />)
    expect(visible(container.firstElementChild as Element)).toBe('Shift+F5+++?')
  })

  it('shows children as one key when keys is omitted', () => {
    const { container } = render(<Kbd>Esc</Kbd>)
    const keys = container.querySelectorAll('kbd kbd')
    expect(keys).toHaveLength(1)
    expect(keys[0]?.textContent).toBe('Esc')
  })

  it('switches to the Apple keys on the client with platform="auto"', () => {
    setPlatform('MacIntel')
    const { container } = render(<Kbd keys="mod+K" />)
    expect(visible(container.firstElementChild as Element)).toBe('⌘K')
  })

  it('reads userAgentData before navigator.platform', () => {
    setPlatform('Win32', 'macOS')
    const { container } = render(<Kbd keys="mod+K" />)
    expect(visible(container.firstElementChild as Element)).toBe('⌘K')
  })

  it('stays on the other keys off Apple platforms', () => {
    setPlatform('Win32')
    const { container } = render(<Kbd keys="mod+K" />)
    expect(visible(container.firstElementChild as Element)).toBe('Ctrl+K')
  })

  it('hydrates without warnings on an Apple platform', async () => {
    setPlatform('MacIntel')
    await expectHydrates(<Kbd keys="mod+K" />)
    await expectHydrates(<Kbd keys={['G', 'M']} />)
  })

  it('applies the size variant', () => {
    const { container, rerender } = render(<Kbd>K</Kbd>)
    const key = () => container.querySelector('kbd kbd') as HTMLElement
    expect(key().className).toContain('h-[22px]')
    rerender(<Kbd size="sm">K</Kbd>)
    expect(key().className).toContain('h-[18px]')
    rerender(<Kbd size="lg">K</Kbd>)
    expect(key().className).toContain('h-7')
  })

  it('passes native props through, forwards ref and merges className', () => {
    const ref = createRef<HTMLElement>()
    render(<Kbd ref={ref} id="k" title="Search" className="ml-2" keys="mod+K" platform="other" />)
    expect(ref.current?.tagName).toBe('KBD')
    expect(ref.current).toHaveAttribute('id', 'k')
    expect(ref.current).toHaveAttribute('title', 'Search')
    expect(ref.current?.className).toContain('ml-2')
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <p>
            Search <Kbd keys="mod+K" platform="other" />
          </p>
          <p>
            Go to matches <Kbd keys={['G', 'M']} size="sm" />
          </p>
          <p>
            Close <Kbd>Esc</Kbd>
          </p>
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
