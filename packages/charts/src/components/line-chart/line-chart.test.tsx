import { describe, expect, it, spyOn } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { AreaChart, LineChart } from './index'

const rating = [1840, 1862, 1851, 1890, 1912].map((rating, i) => ({ match: i + 1, rating }))
const one = [{ key: 'rating' as const, label: 'Rating' }]
const lines = (c: HTMLElement) =>
  [...c.querySelectorAll('svg path')].filter((p) => p.getAttribute('class')?.includes('stroke-('))
const fills = (c: HTMLElement) =>
  [...c.querySelectorAll('svg path')].filter((p) => !p.getAttribute('class')?.includes('stroke-('))
const dots = (c: HTMLElement) => [
  ...c.querySelectorAll<HTMLElement>('span[style*="--sk-dot-color"]'),
]
const desc = (c: HTMLElement) => {
  const f = c.querySelector('figure') as HTMLElement
  return document.getElementById(f.getAttribute('aria-describedby') as string)?.textContent
}

describe('LineChart / AreaChart', () => {
  it('render on the server', () => {
    expect(
      renderServer(<LineChart aria-label="R" data={rating} x="match" series={one} />),
    ).toContain('<figure')
    expect(
      renderServer(<AreaChart aria-label="R" data={rating} x="match" series={one} />),
    ).toContain('<svg')
  })

  it('draws a line over a nice, non-zero axis with the last value as end label', () => {
    const { container } = render(
      <LineChart aria-label="Rating" data={rating} x="match" series={one} />,
    )
    const ticks = [
      ...container.querySelectorAll('[aria-hidden="true"].relative.text-right span.absolute'),
    ].map((s) => s.textContent)
    expect(ticks).toEqual(['1,840', '1,860', '1,880', '1,900', '1,920'])
    expect(lines(container)[0]?.getAttribute('d')?.startsWith('M0,100L25,')).toBe(true)
    expect(container.querySelector('.left-\\[calc\\(100\\%\\+8px\\)\\]')?.textContent).toBe('1,912')
    expect(dots(container)).toHaveLength(1)
    expect(desc(container)).toBe('Rating: Rating from 1,840 to 1,912 over 5 points')
  })

  it('breaks lines at null, shades runs missing everywhere, dots lone points', () => {
    const data = [1, 2, null, 4, null, null, 7, 8].map((v, i) => ({ i, v }))
    const { container } = render(
      <LineChart aria-label="G" data={data} x="i" series={[{ key: 'v', label: 'V' }]} />,
    )
    expect(lines(container)[0]?.getAttribute('d')?.match(/M/g)).toHaveLength(2)
    const gaps = [...container.querySelectorAll<HTMLElement>('.bg-text\\/4')]
    expect(gaps).toHaveLength(2)
    expect(gaps[0]?.textContent).toBe('Not reported')
    // lone point at index 3 (between gaps) + highlighted last
    expect(container.querySelectorAll('span.size-1\\.5')).toHaveLength(1)
    expect(container.querySelectorAll('span.size-2')).toHaveLength(1)
    const { container: c2 } = render(
      <LineChart
        aria-label="G"
        data={data}
        x="i"
        series={[{ key: 'v', label: 'V' }]}
        gaps="none"
      />,
    )
    expect(c2.querySelectorAll('.bg-text\\/4')).toHaveLength(0)
  })

  it('shades edge gaps to the plot edge', () => {
    const data = [null, 2, 3, null].map((v, i) => ({ i, v }))
    const { container } = render(
      <LineChart aria-label="G" data={data} x="i" series={[{ key: 'v', label: 'V' }]} />,
    )
    const gaps = [...container.querySelectorAll<HTMLElement>('.bg-text\\/4')]
    expect(gaps.map((g) => [g.style.left, g.style.width])).toEqual([
      ['0%', '33.333%'],
      ['66.667%', '33.333%'],
    ])
  })

  it('reverse puts the smallest value on top; explicit ticks + band + references', () => {
    const games = [1, 8, 4].map((placement, game) => ({ game, placement }))
    const { container } = render(
      <LineChart
        aria-label="Placement"
        data={games}
        x="game"
        series={[{ key: 'placement', label: 'Placement' }]}
        reverse
        yDomain={[0.5, 8.5]}
        yTickValues={[1, 4, 8]}
        yTickFormat={(v) => `#${v}`}
        band={{ from: 0.5, to: 4.5, label: 'Top 4' }}
        references={[{ value: 4.33, label: 'avg 4.33' }]}
        pointColor={(g) => (g.placement === 1 ? 'gold' : 'grey')}
        endLabels={false}
      />,
    )
    const d = dots(container)
    expect(d).toHaveLength(3)
    expect(d[0]?.style.top).toBe('6.25%')
    expect(d[1]?.style.top).toBe('93.75%')
    expect(d.map((x) => x.style.getPropertyValue('--sk-dot-color'))).toEqual([
      'gold',
      'grey',
      'grey',
    ])
    const ticks = [
      ...container.querySelectorAll('[aria-hidden="true"].relative.text-right span.absolute'),
    ].map((s) => s.textContent)
    expect(ticks).toEqual(['#1', '#4', '#8'])
    expect(container.textContent).toContain('Top 4')
    expect(container.textContent).toContain('avg 4.33')
    const band = container.querySelector<HTMLElement>('[style*="--sk-band-color"]')
    expect(band?.style.top).toBe('0%')
    expect(band?.style.height).toBe('50%')
    // the padded baseline (8.5) still gets its strong line
    expect(container.querySelectorAll('.bg-line')).toHaveLength(1)
  })

  it('points none/all, monotone curve, series end labels and a legend for several series', () => {
    const data = [
      { w: 'W1', a: 1, b: 3 },
      { w: 'W2', a: 2, b: 2 },
      { w: 'W3', a: 4, b: 1 },
    ]
    const two = [
      { key: 'a' as const, label: 'Duelist' },
      { key: 'b' as const, label: 'Controller', color: 'teal' },
    ]
    const { container, rerender } = render(
      <LineChart aria-label="D" data={data} x="w" series={two} curve="monotone" />,
    )
    expect(lines(container)[0]?.getAttribute('d')).toContain('C')
    expect([...container.querySelectorAll('ul li')].map((l) => l.textContent)).toEqual([
      'Duelist',
      'Controller',
    ])
    expect(container.textContent).toContain('Duelist')
    expect(desc(container)).toBe(
      'D: Duelist from 1 to 4 over 3 points; Controller from 3 to 1 over 3 points',
    )
    rerender(
      <LineChart aria-label="D" data={data} x="w" series={two} points="none" endLabels="value" />,
    )
    expect(dots(container)).toHaveLength(0)
    expect(container.querySelector('.left-\\[calc\\(100\\%\\+8px\\)\\]')?.textContent).toBe('4')
    rerender(
      <LineChart
        aria-label="D"
        data={data}
        x="w"
        series={two}
        points="all"
        legend={false}
        endLabels="series"
      />,
    )
    expect(dots(container)).toHaveLength(6)
    expect(container.querySelector('ul')).toBeNull()
    rerender(
      <LineChart
        aria-label="D"
        data={data}
        x="w"
        series={two}
        legend={[{ label: 'Mine', color: 'red' }]}
      />,
    )
    expect(container.querySelector('ul')?.textContent).toBe('Mine')
  })

  it('area fills down to the axis bottom (or a baseline)', () => {
    const { container, rerender } = render(
      <AreaChart aria-label="R" data={rating} x="match" series={one} />,
    )
    expect(fills(container)).toHaveLength(1)
    expect(fills(container)[0]?.getAttribute('d')).toContain(',100Z')
    rerender(
      <AreaChart
        aria-label="R"
        data={rating}
        x="match"
        series={one}
        baseline={1850}
        yDomain={[1800, 1950]}
      />,
    )
    expect(fills(container)[0]?.getAttribute('d')).toContain(',66.67Z')
  })

  it('diverging area: two clipped fills around the baseline, symmetric axis, neutral line', () => {
    const data = [0, 900, -1200, 2400].map((gold, minute) => ({ minute, gold }))
    const { container } = render(
      <AreaChart
        aria-label="Gold"
        id="gold"
        data={data}
        x="minute"
        series={[{ key: 'gold', label: 'Gold' }]}
        baseline={0}
        symmetric
        above="blue"
        below="red"
      />,
    )
    const f = fills(container)
    expect(f).toHaveLength(2)
    expect(f[0]?.getAttribute('clip-path')).toBe('url(#gold-above)')
    expect(f[1]?.getAttribute('clip-path')).toBe('url(#gold-below)')
    expect(container.querySelector('#gold-above rect')?.getAttribute('height')).toBe('51')
    const ticks = [
      ...container.querySelectorAll('[aria-hidden="true"].relative.text-right span.absolute'),
    ].map((s) => s.textContent)
    // reach 2,400 → ±2,500 axis; round ticks every 1,000
    expect(ticks[0]).toBe('-2,000')
    expect(ticks.at(-1)).toBe('2,000')
    expect((lines(container)[0] as HTMLElement).style.getPropertyValue('--sk-series-color')).toBe(
      'var(--sk-text-dim)',
    )
  })

  it('diverging defaults and the multi-series warning', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    const data = [
      { m: 0, a: 1, b: -1 },
      { m: 1, a: -1, b: 1 },
    ]
    const { container } = render(
      <AreaChart
        aria-label="X"
        data={data}
        x="m"
        series={[
          { key: 'a', label: 'A' },
          { key: 'b', label: 'B' },
        ]}
        above="blue"
      />,
    )
    expect(warn).toHaveBeenCalledTimes(1)
    expect(fills(container).map((p) => (p as HTMLElement).style.fill)).toContain(
      'var(--sk-chart-1)',
    )
    warn.mockRestore()
  })

  it('too few points and empty states keep the frame; loading is busy', () => {
    const { container, rerender } = render(
      <AreaChart
        aria-label="Gold"
        data={[{ m: 0, g: 0 }]}
        x="m"
        series={[{ key: 'g', label: 'G' }]}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Not enough data for a chart' })).toBeTruthy()
    rerender(
      <LineChart
        aria-label="Gold"
        data={[{ m: 0, g: 5 }]}
        x="m"
        series={[{ key: 'g', label: 'G' }]}
      />,
    )
    expect(dots(container)).toHaveLength(1)
    expect(desc(container)).toBe('Gold: G 5')
    rerender(<LineChart aria-label="Gold" data={[]} x="m" series={[{ key: 'g', label: 'G' }]} />)
    expect(screen.getByRole('heading', { name: 'No data yet' })).toBeTruthy()
    expect(desc(container)).toBe('Gold: No data yet')
    rerender(<LineChart aria-label="Gold" data={rating} x="match" series={one} loading />)
    expect(container.querySelector('figure')).toHaveAttribute('aria-busy', 'true')
    expect(desc(container)).toBe('Gold: loading')
    rerender(
      <LineChart
        aria-labelledby="t"
        data={[]}
        x="m"
        series={[{ key: 'g', label: 'G' }]}
        empty={{ title: <b>Nope</b> }}
      />,
    )
    expect(desc(container)).toBe('no data yet')
  })

  it('table view and tooltip island', () => {
    const data = [
      { m: '1m', v: 5 },
      { m: '2m', v: null },
    ]
    const { container, rerender } = render(
      <LineChart aria-label="T" data={data} x="m" series={[{ key: 'v', label: 'Value' }]} />,
    )
    expect(container.querySelector('table')?.textContent).toBe('MValue1m52mNot reported')
    expect(container.querySelector('[aria-roledescription="chart"]')).toBeTruthy()
    rerender(
      <LineChart
        aria-label="T"
        data={data}
        x="m"
        series={[{ key: 'v', label: 'Value' }]}
        interactive={false}
        xLabel="Minute"
      />,
    )
    expect(container.querySelector('[aria-roledescription="chart"]')).toBeNull()
    expect(container.querySelector('table th')?.textContent).toBe('Minute')
  })

  it('thins x labels and uses xFormat', () => {
    const data = Array.from({ length: 30 }, (_v, i) => ({ i, v: i }))
    const { container } = render(
      <LineChart
        aria-label="T"
        data={data}
        x="i"
        xFormat={(i) => `M${i}`}
        series={[{ key: 'v', label: 'V' }]}
      />,
    )
    const xs = [...container.querySelectorAll('.mt-1\\.5 span')]
    expect(xs.map((x) => x.textContent)).toEqual([
      'M0',
      'M4',
      'M8',
      'M12',
      'M16',
      'M20',
      'M24',
      'M28',
    ])
    expect(xs.filter((x) => x.className.includes('@max-md:hidden'))).toHaveLength(4)
  })

  it('forwards ref; hydrates; accessible in both themes', async () => {
    const ref = createRef<HTMLElement>()
    render(<AreaChart ref={ref} aria-label="R" data={rating} x="match" series={one} />)
    expect(ref.current?.tagName).toBe('FIGURE')
    await expectHydrates(
      <AreaChart
        aria-label="R"
        data={rating}
        x="match"
        series={one}
        baseline={1850}
        above="blue"
        below="red"
      />,
    )
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <LineChart aria-label="Rating" data={rating} x="match" series={one} table="details" />
          <AreaChart aria-label="Empty" data={[]} x="match" series={one} />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
