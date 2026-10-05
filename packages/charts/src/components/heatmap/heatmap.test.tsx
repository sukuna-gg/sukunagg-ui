import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { Heatmap } from './index'

const DAY = 86_400_000
// 2026-08-03 is a Monday; four weeks of data, Mondays busiest.
const start = Date.UTC(2026, 7, 3)
const days = Array.from({ length: 28 }, (_d, i) => ({
  day: new Date(start + i * DAY).toISOString().slice(0, 10),
  games: i % 7 === 0 ? 8 : i % 7,
}))
const cells = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('span.aspect-square')]
const desc = (c: HTMLElement) => {
  const f = c.querySelector('figure') as HTMLElement
  return document.getElementById(f.getAttribute('aria-describedby') as string)?.textContent
}

describe('Heatmap', () => {
  it('renders on the server', () => {
    expect(
      renderServer(<Heatmap aria-label="G" data={days} date="day" value="games" weeks={4} />),
    ).toContain('<figure')
  })

  it('lays out weeks × 7 days in UTC, ending on the latest date', () => {
    const { container } = render(
      <Heatmap aria-label="G" data={days} date="day" value="games" weeks={4} unit="games" />,
    )
    const c = cells(container)
    expect(c).toHaveLength(28)
    // Row-major: the first row is the Mondays of the 4 weeks.
    expect(c[0]?.title).toBe('Mon, Aug 3: 8 games')
    expect(c[4]?.title).toBe('Tue, Aug 4: 1 games')
    // 8 + 1 + 2 + … + 6 = 29 a week, every day active
    expect(desc(container)).toBe('G: 116 games over 4 weeks, 28 active days of 28 tracked')
    expect(container.textContent).toContain('Mon')
    expect(container.textContent).toContain('Aug')
  })

  it('levels: quarters of the max by default, or custom bounds', () => {
    const { container, rerender } = render(
      <Heatmap aria-label="G" data={days} date="day" value="games" weeks={4} />,
    )
    const cls = () => cells(container).map((x) => x.className)
    // Monday 8 → level 4; Tuesday 1 → level 1 (≤ 2).
    expect(cls()[0]).toContain('bg-heat-4')
    expect(cls()[4]).toContain('bg-heat-1')
    rerender(
      <Heatmap
        aria-label="G"
        data={days}
        date="day"
        value="games"
        weeks={4}
        levels={[0.5, 1, 2]}
      />,
    )
    expect(cls()[4]).toContain('bg-heat-2')
    rerender(
      <Heatmap
        aria-label="G"
        data={[...days, { day: '2026-08-31', games: 0 }]}
        date="day"
        value="games"
        weeks={5}
      />,
    )
    // a tracked 0 is level 0
    expect(cells(container)[4]?.className).toContain('bg-surface-2')
  })

  it('days without rows (or null) are not tracked; days after end are blank', () => {
    const partial = [...days.slice(7), { day: '2026-08-31', games: null }]
    const { container } = render(
      <Heatmap aria-label="G" data={partial} date="day" value="games" end="2026-09-02" weeks={5} />,
    )
    const c = cells(container)
    expect(c).toHaveLength(35)
    expect(c[0]?.title).toBe('Mon, Aug 3: not tracked')
    expect(c[0]?.className).toContain('ring-1')
    expect(container.textContent).toContain('Not tracked')
    // Thursday of the last week (Sep 3) is after `end`: blank.
    expect(c[3 * 5 + 4]?.className).toContain('invisible')
    expect(container.querySelector('table')?.textContent).toContain('Not tracked')
  })

  it('empty: grid + EmptyState overlay; no rows and no end: EmptyState only', () => {
    const { container, rerender } = render(
      <Heatmap
        aria-label="G"
        data={days.map((d) => ({ ...d, games: 0 }))}
        date="day"
        value="games"
        weeks={4}
      />,
    )
    expect(cells(container)).toHaveLength(28)
    expect(screen.getByRole('heading', { name: 'No activity yet' })).toBeTruthy()
    expect(desc(container)).toBe('G: No activity yet')
    rerender(
      <Heatmap
        aria-label="G"
        data={[]}
        date="day"
        value="games"
        empty={{ title: 'Nothing yet' }}
      />,
    )
    expect(cells(container)).toHaveLength(0)
    expect(screen.getByRole('heading', { name: 'Nothing yet' })).toBeTruthy()
    rerender(
      <Heatmap
        aria-labelledby="t"
        data={[{ day: 'not-a-date', games: 3 }]}
        date="day"
        value="games"
        empty={{ title: <b>x</b> }}
      />,
    )
    expect(desc(container)).toBe('no activity yet')
    rerender(<Heatmap aria-label="G" data={[]} date="day" value="games" loading />)
    expect(desc(container)).toBe('G: loading')
    rerender(<Heatmap aria-label="G" data={days} date="day" value="games" weeks={4} loading />)
    expect(cells(container)[0]?.className).toContain('animate-pulse')
    expect(container.querySelector('figure')).toHaveAttribute('aria-busy', 'true')
    expect(desc(container)).toBe('G: loading')
    rerender(
      <Heatmap
        aria-labelledby="t"
        data={days.map((d) => ({ ...d, games: 0 }))}
        date="day"
        value="games"
        weeks={4}
        empty={{ title: <b>x</b> }}
      />,
    )
    expect(desc(container)).toBe('no activity yet')
  })

  it('month labels skip crowded partial months', () => {
    // Aug 31 is a Monday: column 0 = August (1 week), column 1 starts September.
    const sep = Array.from({ length: 35 }, (_d, i) => ({
      day: new Date(Date.UTC(2026, 7, 31) + i * DAY).toISOString().slice(0, 10),
      games: 1,
    }))
    const { container } = render(
      <Heatmap aria-label="G" data={sep} date="day" value="games" weeks={5} />,
    )
    const months = [...container.querySelectorAll('span.h-3\\.5')].map((m) => m.textContent)
    expect(months.filter(Boolean)).toEqual(['Sep'])
  })

  it('table, id, className, ref; hydrates; accessible', async () => {
    const ref = createRef<HTMLElement>()
    const { container } = render(
      <Heatmap
        ref={ref}
        id="h"
        className="mt-1"
        aria-label="G"
        data={days}
        date="day"
        value="games"
        weeks={4}
        table="details"
        summary="S"
      />,
    )
    expect(ref.current?.id).toBe('h')
    expect(ref.current?.className).toContain('mt-1')
    expect(container.querySelector('details')?.textContent).toContain('Week of')
    expect(desc(container)).toBe('S')
    await expectHydrates(<Heatmap aria-label="G" data={days} date="day" value="games" weeks={4} />)
    for (const theme of ['dark', 'light'] as const) {
      const { container: c, unmount } = render(
        <div data-theme={theme}>
          <Heatmap aria-label="G" data={days} date="day" value="games" weeks={4} />
        </div>,
      )
      await expectAccessible(c)
      unmount()
    }
  })
})
