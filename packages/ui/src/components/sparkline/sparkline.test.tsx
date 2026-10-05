import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { Sparkline } from './index'
import { scaleY, toSegments } from './sparkline.logic'

const variants = ['line', 'area', 'bar', 'winloss'] as const
const trend = [1810, 1825, 1818, 1840, 1866, 1902]
const wl = [1, 1, -1, 1, -1]

/** Count of `M` (move-to) commands across every line path = number of drawn segments. */
const segmentsDrawn = (container: HTMLElement) =>
  [...container.querySelectorAll('path')]
    .filter((p) => !p.getAttribute('class')?.includes('fill-('))
    .reduce((n, p) => n + (p.getAttribute('d')?.match(/M/g)?.length ?? 0), 0)

describe('Sparkline', () => {
  it('renders every variant on the server', () => {
    for (const variant of variants) {
      const html = renderServer(
        <Sparkline variant={variant} data={variant === 'winloss' ? wl : trend} />,
      )
      expect(html).toContain('role="img"')
    }
  })

  it('toSegments splits runs at null (and non-finite) values', () => {
    expect(toSegments([1, 2, null, 4])).toEqual([[0, 1], [3]])
    expect(toSegments([null, null])).toEqual([])
    expect(toSegments([1, Number.NaN, 3])).toEqual([[0], [2]])
  })

  it('scaleY keeps points inside the padded box and centres flat data', () => {
    const ys = scaleY([0, 5, 10, null], 28)
    expect(ys[0]).toBe(22)
    expect(ys[2]).toBe(6)
    expect(ys[3]).toBeNull()
    expect(scaleY([3, 3, 3], 28)).toEqual([14, 14, 14])
  })

  it('breaks the line at missing points instead of drawing 0', () => {
    const { container } = render(<Sparkline data={[1, 2, null, 4, 5]} />)
    expect(segmentsDrawn(container)).toBe(2)
  })

  it('draws a lone point between gaps as a small dot', () => {
    const { container } = render(<Sparkline data={[1, 2, null, 4, null, 6, 7]} />)
    // one lone point (index 3) + the highlighted last dot
    expect(container.querySelectorAll('span[style*="left"]')).toHaveLength(2)
  })

  it('one point renders a dot and no line', () => {
    const { container } = render(<Sparkline data={[42]} />)
    expect(container.querySelectorAll('path')).toHaveLength(0)
    expect(container.querySelectorAll('span[style*="left: 100%"]')).toHaveLength(1)
    expect(screen.getByRole('img')).toHaveAccessibleName('Trend: 42')
  })

  it('a single-value last run is still the highlighted dot', () => {
    const { container } = render(<Sparkline data={[1, 2, null, 9]} />)
    expect(container.querySelectorAll('span[style*="left"]')).toHaveLength(1)
  })

  it('renders the empty label plus sr text when there are no numbers', () => {
    const { container, rerender } = render(<Sparkline data={[]} />)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.textContent).toBe('–no data')
    rerender(<Sparkline data={[null, null]} emptyLabel="No games" aria-label="No games yet" />)
    expect(container.textContent).toBe('No gamesNo games yet')
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('keeps flat data inside the box', () => {
    const { container } = render(<Sparkline data={[5, 5, 5]} />)
    expect(container.querySelector('path')?.getAttribute('d')).toBe(
      'M0.00,14.00L50.00,14.00L100.00,14.00',
    )
  })

  it('area draws a fill path per segment closed to the bottom edge', () => {
    const { container } = render(<Sparkline variant="area" data={[1, 3, null, 2, 5]} height={40} />)
    const fills = [...container.querySelectorAll('path')].filter((p) =>
      p.getAttribute('d')?.endsWith('Z'),
    )
    expect(fills).toHaveLength(2)
    expect(fills[0]?.getAttribute('d')).toContain(',40')
  })

  it('summarises the trend and the win/loss record by default; aria-label overrides', () => {
    const { rerender } = render(<Sparkline data={[1810, null, 1902]} />)
    expect(screen.getByRole('img')).toHaveAccessibleName('Trend from 1,810 to 1,902')
    rerender(<Sparkline variant="winloss" data={[1, -1, 0, null, 1]} />)
    expect(screen.getByRole('img')).toHaveAccessibleName('2 wins, 1 loss')
    rerender(<Sparkline variant="winloss" data={[1, -1, -1]} />)
    expect(screen.getByRole('img')).toHaveAccessibleName('1 win, 2 losses')
    rerender(<Sparkline data={[1, 2]} aria-label="Rating, last 2 games" />)
    expect(screen.getByRole('img')).toHaveAccessibleName('Rating, last 2 games')
  })

  it('bar variant scales heights and highlights the last known bar', () => {
    const { container } = render(<Sparkline variant="bar" data={[2, 4, null, 8, null]} />)
    const bars = [...container.querySelectorAll<HTMLElement>('[style*="height:"]')].filter((el) =>
      el.className.includes('flex-1'),
    )
    expect(bars.map((b) => b.style.height)).toEqual(['25%', '50%', '0%', '100%', '0%'])
    expect(bars[3]?.className).toContain('bg-(--sk-spark-dot)')
    expect(bars[0]?.className).toContain('opacity-55')
  })

  it('bar variant with highlightLast off and all-zero data', () => {
    const { container } = render(<Sparkline variant="bar" data={[0, 0]} highlightLast={false} />)
    const bars = [...container.querySelectorAll<HTMLElement>('.flex-1')]
    expect(bars.every((b) => b.style.height === '0%' && b.className.includes('opacity-55'))).toBe(
      true,
    )
  })

  it('winloss puts wins above the middle and losses below it', () => {
    const { container } = render(<Sparkline variant="winloss" data={[1, -1, 0]} />)
    const cols = container.querySelectorAll('.max-w-1\\.5')
    expect(cols).toHaveLength(3)
    expect(cols[0]?.children[0]?.children).toHaveLength(1)
    expect(cols[0]?.children[1]?.children).toHaveLength(0)
    expect(cols[1]?.children[1]?.children).toHaveLength(1)
    expect(
      cols[2]?.querySelectorAll('.rounded-t-\\[1\\.5px\\], .rounded-b-\\[1\\.5px\\]'),
    ).toHaveLength(0)
  })

  it('passes colors through CSS variables', () => {
    render(<Sparkline data={[1, 2]} color="var(--l-blue)" winColor="red" lossColor="blue" />)
    const style = (screen.getByRole('img') as HTMLElement).style
    expect(style.getPropertyValue('--sk-spark-color')).toBe('var(--l-blue)')
    expect(style.getPropertyValue('--sk-spark-dot')).toBe('var(--l-blue)')
    expect(style.getPropertyValue('--sk-spark-win')).toBe('red')
    expect(style.getPropertyValue('--sk-spark-loss')).toBe('blue')
  })

  it('defaults: grey line with an accent dot; area in the accent', () => {
    const { rerender } = render(<Sparkline data={[1, 2]} />)
    let style = (screen.getByRole('img') as HTMLElement).style
    expect(style.getPropertyValue('--sk-spark-color')).toBe('var(--sk-text-faint)')
    expect(style.getPropertyValue('--sk-spark-dot')).toBe('var(--sk-chart-1)')
    rerender(<Sparkline variant="area" data={[1, 2]} />)
    style = (screen.getByRole('img') as HTMLElement).style
    expect(style.getPropertyValue('--sk-spark-color')).toBe('var(--sk-chart-1)')
  })

  it('highlightLast={false} drops the end dot', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} highlightLast={false} />)
    expect(container.querySelectorAll('span[style*="left"]')).toHaveLength(0)
  })

  it('sets width and height; className merges', () => {
    render(<Sparkline data={[1, 2]} width={96} height={20} className="mx-2" />)
    const el = screen.getByRole('img') as HTMLElement
    expect(el.style.width).toBe('96px')
    expect(el.style.height).toBe('20px')
    expect(el.className).toContain('mx-2')
  })

  it('forwards ref to the root span', () => {
    const ref = createRef<HTMLSpanElement>()
    render(<Sparkline ref={ref} data={[1, 2]} />)
    expect(ref.current).toBeInstanceOf(HTMLSpanElement)
    const empty = createRef<HTMLSpanElement>()
    render(<Sparkline ref={empty} data={[]} />)
    expect(empty.current).toBeInstanceOf(HTMLSpanElement)
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(<Sparkline data={[1, null, 3, 4]} variant="area" />)
    await expectHydrates(<Sparkline data={wl} variant="winloss" />)
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          {variants.map((variant) => (
            <Sparkline key={variant} variant={variant} data={variant === 'winloss' ? wl : trend} />
          ))}
          <Sparkline data={[]} />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
