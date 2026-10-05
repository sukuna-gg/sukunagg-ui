import { describe, expect, it, spyOn } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { BarChart } from './index'

const kills = [
  { weapon: 'Rifles', s3: 812, s4: 944 },
  { weapon: 'SMGs', s3: 402, s4: null },
  { weapon: 'Snipers', s3: 0, s4: 241 },
]
const series = [
  { key: 's3' as const, label: 'Season 3' },
  { key: 's4' as const, label: 'Season 4' },
]
const bars = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('[style*="--sk-bar-color"]')]
const figure = (c: HTMLElement) => c.querySelector('figure') as HTMLElement

describe('BarChart', () => {
  it('renders every layout on the server', () => {
    for (const layout of ['grouped', 'stacked', 'horizontal'] as const) {
      const html = renderServer(
        <BarChart aria-label="Kills" layout={layout} data={kills} x="weapon" series={series} />,
      )
      expect(html).toContain('<figure')
      expect(html).toContain('Rifles')
    }
  })

  it('scales bars to a nice 0-based axis with round ticks', () => {
    const { container } = render(
      <BarChart aria-label="Kills" data={kills} x="weapon" series={series} interactive={false} />,
    )
    // max 944 → axis 0…1000, ticks every 200; positions rounded to 3 decimals
    const ticks = [
      ...container.querySelectorAll('[aria-hidden="true"].relative.text-right span.absolute'),
    ].map((s) => s.textContent)
    expect(ticks).toEqual(['0', '200', '400', '600', '800', '1,000'])
    expect(bars(container).map((b) => b.style.height)).toEqual(['81.2%', '94.4%', '40.2%', '24.1%'])
  })

  it('missing draws no bar and labels "–"; zero draws no bar and labels "0"', () => {
    const { container } = render(
      <BarChart aria-label="Kills" data={kills} x="weapon" series={series} valueLabels />,
    )
    const caps = [...container.querySelectorAll('span.font-bold')].map((s) => s.textContent)
    expect(caps).toEqual(['812', '944', '402', '–', '0', '241'])
    expect(container.querySelector('span.text-text-faint.font-bold')?.textContent).toBe('–')
    expect(bars(container)).toHaveLength(4)
  })

  it('takes a per-row color function and custom legend items', () => {
    const { container } = render(
      <BarChart
        aria-label="Placements"
        data={[
          { p: '1st', n: 4 },
          { p: '2nd', n: 3 },
        ]}
        x="p"
        series={[{ key: 'n', label: 'Games', color: (_r, i) => (i === 0 ? 'gold' : 'teal') }]}
        legend={[{ label: '1st', color: 'gold' }]}
      />,
    )
    expect(bars(container).map((b) => b.style.getPropertyValue('--sk-bar-color'))).toEqual([
      'gold',
      'teal',
    ])
    expect(container.querySelector('ul')?.textContent).toBe('1st')
  })

  it('auto legend for 2+ series (fixed colors only), none for one series or legend={false}', () => {
    const { container, rerender } = render(
      <BarChart aria-label="K" data={kills} x="weapon" series={series} />,
    )
    expect(container.querySelectorAll('ul li')).toHaveLength(2)
    rerender(<BarChart aria-label="K" data={kills} x="weapon" series={series} legend={false} />)
    expect(container.querySelector('ul')).toBeNull()
    rerender(
      <BarChart aria-label="K" data={kills} x="weapon" series={[{ key: 's3', label: 'S3' }]} />,
    )
    expect(container.querySelector('ul')).toBeNull()
    rerender(
      <BarChart
        aria-label="K"
        data={kills}
        x="weapon"
        series={[
          series[0] as (typeof series)[number],
          { key: 's4', label: 'S4', color: () => 'red' },
        ]}
      />,
    )
    expect(container.querySelectorAll('ul li')).toHaveLength(1)
  })

  it('a 7th series falls back to --sk-chart-other', () => {
    const keys = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const
    const row = Object.fromEntries([['x', 'one'], ...keys.map((k) => [k, 1])]) as Record<
      string,
      unknown
    >
    const { container } = render(
      <BarChart
        aria-label="K"
        data={[row]}
        x="x"
        series={keys.map((k) => ({ key: k, label: k }))}
      />,
    )
    expect(bars(container).at(-1)?.style.getPropertyValue('--sk-bar-color')).toBe(
      'var(--sk-chart-other)',
    )
  })

  it('stacked: segments add up, gaps between them, totals ignore nulls, "–" when all missing', () => {
    const data = [
      { m: 'Apr', a: 10, b: 30 },
      { m: 'May', a: null, b: 20 },
      { m: 'Jun', a: null, b: null },
    ]
    const two = [
      { key: 'a' as const, label: 'A' },
      { key: 'b' as const, label: 'B' },
    ]
    // totals max 40 → axis 0…40
    const { container } = render(
      <BarChart aria-label="S" layout="stacked" data={data} x="m" series={two} valueLabels />,
    )
    const seg = bars(container)
    expect(seg.map((s) => [s.style.bottom, s.style.height])).toEqual([
      ['0%', '25%'],
      ['25%', '75%'],
      ['0%', '50%'],
    ])
    expect(seg[1]?.className).toContain('border-b-2')
    expect(seg[1]?.className).toContain('rounded-t-[4px]')
    expect(seg[0]?.className).not.toContain('rounded-t-[4px]')
    expect([...container.querySelectorAll('span.font-bold')].map((s) => s.textContent)).toEqual([
      '40',
      '20',
      '–',
    ])
    expect(container.querySelector('table')?.textContent).toContain('Total')
  })

  it('horizontal: rows with category labels and values at the tips', () => {
    const { container } = render(
      <BarChart
        aria-label="Pick rate"
        layout="horizontal"
        data={[
          { a: 'Jett', r: 31.4 },
          { a: 'Omen', r: 15.7 },
          { a: 'Sova', r: null },
        ]}
        x="a"
        series={[{ key: 'r', label: 'Pick rate' }]}
        valueFormat={(v) => `${v}%`}
      />,
    )
    expect(bars(container).map((b) => b.style.width)).toEqual(['100%', '50%'])
    expect([...container.querySelectorAll('span.font-bold')].map((s) => s.textContent)).toEqual([
      '31.4%',
      '15.7%',
      '–',
    ])
    expect(container.textContent).toContain('Jett')
    expect(
      (container.querySelector('.relative[style*="height"]') as HTMLElement).style.height,
    ).toBe('96px')
  })

  it('warns about negatives (drawn as 0) and a domain without 0', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <BarChart
        aria-label="N"
        data={[
          { x: 'a', v: -5 },
          { x: 'b', v: 5 },
        ]}
        x="x"
        series={[{ key: 'v', label: 'V' }]}
        yDomain={[1, 10]}
      />,
    )
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })

  it('empty: keeps the frame, shows the EmptyState, no y labels', () => {
    const { container, rerender } = render(
      <BarChart
        aria-label="P"
        data={[{ p: '1st', n: null }]}
        x="p"
        series={[{ key: 'n', label: 'Games' }]}
      />,
    )
    expect(screen.getByRole('heading', { name: 'No data yet' })).toBeTruthy()
    expect(container.querySelector('[aria-roledescription]')).toBeNull()
    rerender(
      <BarChart
        aria-label="P"
        data={[]}
        x="p"
        series={[{ key: 'n', label: 'Games' }]}
        empty={{
          title: 'No ranked games',
          description: 'Play one.',
          action: <button type="button">Show all</button>,
        }}
      />,
    )
    expect(screen.getByRole('heading', { name: 'No ranked games' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Show all' })).toBeTruthy()
    expect(figure(container).querySelector(`#${figure(container).id}-summary`)?.textContent).toBe(
      'P: No ranked games',
    )
  })

  it('loading: same frame, skeleton, aria-busy', () => {
    const { container } = render(
      <BarChart aria-label="P" data={kills} x="weapon" series={series} loading />,
    )
    expect(figure(container)).toHaveAttribute('aria-busy', 'true')
    expect(bars(container)).toHaveLength(0)
    expect(figure(container).textContent).toContain('P: loading')
  })

  it('table view: sr-only by default, details on request, none to drop it', () => {
    const { container, rerender } = render(
      <BarChart aria-label="K" data={kills} x="weapon" series={series} />,
    )
    const table = container.querySelector('table.sr-only') as HTMLElement
    expect(table.textContent).toContain('WeaponSeason 3Season 4')
    expect(table.textContent).toContain('Not reported')
    rerender(
      <BarChart
        aria-label="K"
        data={kills}
        x="weapon"
        xLabel="Weapon class"
        series={series}
        table="details"
      />,
    )
    expect(container.querySelector('details summary')?.textContent).toBe('Show as a table')
    expect(container.querySelector('details')?.textContent).toContain('Weapon class')
    rerender(<BarChart aria-label="K" data={kills} x="weapon" series={series} table="none" />)
    expect(container.querySelector('table')).toBeNull()
  })

  it('summary: generated for one or many series, or replaced', () => {
    const { container, rerender } = render(
      <BarChart
        aria-label="Games"
        data={[
          { p: '1st', n: 4 },
          { p: '2nd', n: null },
        ]}
        x="p"
        series={[{ key: 'n', label: 'Games' }]}
      />,
    )
    const desc = () =>
      document.getElementById(figure(container).getAttribute('aria-describedby') as string)
        ?.textContent
    expect(desc()).toBe('Games: 1st 4, 2nd –')
    rerender(<BarChart aria-label="Kills" data={kills.slice(0, 1)} x="weapon" series={series} />)
    expect(desc()).toBe('Kills: Rifles: Season 3 812, Season 4 944')
    rerender(
      <BarChart aria-labelledby="h" data={kills} x="weapon" series={series} summary="Custom." />,
    )
    expect(desc()).toBe('Custom.')
  })

  it('interactive by default; interactive={false} renders no island', () => {
    const { container, rerender } = render(
      <BarChart aria-label="K" data={kills} x="weapon" series={series} />,
    )
    expect(container.querySelector('[aria-roledescription="chart"]')).toBeTruthy()
    rerender(
      <BarChart aria-label="K" data={kills} x="weapon" series={series} interactive={false} />,
    )
    expect(container.querySelector('[aria-roledescription="chart"]')).toBeNull()
  })

  it('names the figure, thins x labels for many categories, takes id/xFormat/className', () => {
    const many = Array.from({ length: 24 }, (_v, i) => ({ d: i, v: i + 1 }))
    const { container } = render(
      <BarChart
        aria-labelledby="title"
        id="my-chart"
        className="mt-4"
        data={many}
        x="d"
        xFormat={(d) => `D${d}`}
        series={[{ key: 'v', label: 'V' }]}
      />,
    )
    const f = figure(container)
    expect(f.id).toBe('my-chart')
    expect(f).toHaveAttribute('aria-labelledby', 'title')
    expect(f.className).toContain('mt-4')
    const xs = [...container.querySelectorAll('.mt-1\\.5 span')]
    expect(xs).toHaveLength(12)
    expect(xs[0]?.textContent).toBe('D0')
    expect(xs.filter((s) => s.className.includes('@max-md:hidden'))).toHaveLength(6)
  })

  it('derives a stable id from the data', () => {
    const a = render(<BarChart aria-label="K" data={kills} x="weapon" series={series} />)
    const b = render(<BarChart aria-label="K" data={kills} x="weapon" series={series} />)
    expect(figure(a.container).id).toBe(figure(b.container).id)
    expect(figure(a.container).id).toMatch(/^skc-/)
  })

  it('forwards ref to the figure', () => {
    const ref = createRef<HTMLElement>()
    render(<BarChart ref={ref} aria-label="K" data={kills} x="weapon" series={series} />)
    expect(ref.current?.tagName).toBe('FIGURE')
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(
      <BarChart aria-label="K" data={kills} x="weapon" series={series} valueLabels />,
    )
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <BarChart
            aria-label="Kills"
            data={kills}
            x="weapon"
            series={series}
            valueLabels
            table="details"
          />
          <BarChart
            aria-label="Rates"
            layout="horizontal"
            data={kills}
            x="weapon"
            series={series.slice(0, 1)}
          />
          <BarChart aria-label="Empty" data={[]} x="weapon" series={series} />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
