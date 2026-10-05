import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { DonutChart } from './index'

const roles = [
  { role: 'Duelist', hours: 97 },
  { role: 'Initiator', hours: 61 },
  { role: 'Controller', hours: 33 },
  { role: 'Sentinel', hours: 21 },
]
const segs = (c: HTMLElement) => [...c.querySelectorAll('svg path')]
const desc = (c: HTMLElement) => {
  const f = c.querySelector('figure') as HTMLElement
  return document.getElementById(f.getAttribute('aria-describedby') as string)?.textContent
}

describe('DonutChart', () => {
  it('renders on the server', () => {
    expect(
      renderServer(<DonutChart aria-label="Roles" data={roles} x="role" y="hours" />),
    ).toContain('<figure')
  })

  it('draws one segment per part with titles, total in the middle and a legend of shares', () => {
    const { container } = render(
      <DonutChart aria-label="Roles" data={roles} x="role" y="hours" centerCaption="hours" />,
    )
    // 4 parts with maxSegments 3: no folding (only one part would be left over).
    expect(segs(container)).toHaveLength(4)
    expect(segs(container)[0]?.querySelector('title')?.textContent).toBe('Duelist: 97, 46%')
    expect(container.textContent).toContain('212')
    expect(container.textContent).toContain('hours')
    expect([...container.querySelectorAll('li')].map((l) => l.textContent)).toEqual([
      'Duelist46%',
      'Initiator29%',
      'Controller16%',
      'Sentinel10%',
    ])
    expect(desc(container)).toBe(
      'Roles: Duelist 97 (46%), Initiator 61 (29%), Controller 33 (16%), Sentinel 21 (10%)',
    )
  })

  it('folds parts beyond maxSegments into Other', () => {
    const many = [...roles, { role: 'Flex', hours: 5 }]
    const { container, rerender } = render(
      <DonutChart aria-label="R" data={many} x="role" y="hours" />,
    )
    expect(segs(container)).toHaveLength(4)
    expect(container.querySelector('li:last-child')?.textContent).toBe('Other12%')
    expect(
      (segs(container)[3] as SVGPathElement).style.getPropertyValue('--sk-segment-color'),
    ).toBe('var(--sk-chart-other)')
    rerender(
      <DonutChart aria-label="R" data={many} x="role" y="hours" maxSegments={5} legend={false} />,
    )
    expect(segs(container)).toHaveLength(5)
    expect(container.querySelector('ul')).toBeNull()
  })

  it('custom colors, centerValue, one part as a full ring', () => {
    const { container, rerender } = render(
      <DonutChart
        aria-label="R"
        data={roles}
        x="role"
        y="hours"
        color={(_r, i) => `c${i}`}
        centerValue="212 h"
      />,
    )
    expect(
      (segs(container)[1] as SVGPathElement).style.getPropertyValue('--sk-segment-color'),
    ).toBe('c1')
    expect(container.textContent).toContain('212 h')
    rerender(<DonutChart aria-label="R" data={[{ role: 'Mid', hours: 10 }]} x="role" y="hours" />)
    expect(segs(container)).toHaveLength(0)
    expect(container.querySelector('circle title')?.textContent).toBe('Mid: 10, 100%')
  })

  it('missing parts are left out and noted; table says Not reported', () => {
    const { container } = render(
      <DonutChart
        aria-label="R"
        data={[...roles, { role: 'Flex', hours: null }]}
        x="role"
        y="hours"
      />,
    )
    expect(container.textContent).toContain('1 not reported')
    expect(desc(container)).toContain('; 1 not reported')
    expect(container.querySelector('table')?.textContent).toContain('FlexNot reported–')
  })

  it('empty: grey ring, "—", EmptyState; loading: skeleton + aria-busy', () => {
    const { container, rerender } = render(
      <DonutChart
        aria-label="R"
        data={roles.map((r) => ({ ...r, hours: 0 }))}
        x="role"
        y="hours"
        empty={{ title: 'No games' }}
      />,
    )
    expect(container.textContent).toContain('—')
    expect(screen.getByRole('heading', { name: 'No games' })).toBeTruthy()
    expect(desc(container)).toBe('R: No games')
    rerender(
      <DonutChart aria-labelledby="t" data={[]} x="role" y="hours" empty={{ title: <b>x</b> }} />,
    )
    expect(desc(container)).toBe('no data yet')
    rerender(<DonutChart aria-label="R" data={roles} x="role" y="hours" loading />)
    expect(container.querySelector('figure')).toHaveAttribute('aria-busy', 'true')
    expect(desc(container)).toBe('R: loading')
    expect(container.querySelector('svg')).toBeNull()
  })

  it('table modes, id, className, ref; hydrates; accessible', async () => {
    const ref = createRef<HTMLElement>()
    const { container } = render(
      <DonutChart
        ref={ref}
        id="d"
        className="mt-2"
        aria-label="R"
        data={roles}
        x="role"
        y="hours"
        table="details"
        summary="Custom"
      />,
    )
    expect(ref.current?.id).toBe('d')
    expect(ref.current?.className).toContain('mt-2')
    expect(container.querySelector('details summary')?.textContent).toBe('Show as a table')
    expect(desc(container)).toBe('Custom')
    await expectHydrates(<DonutChart aria-label="R" data={roles} x="role" y="hours" />)
    for (const theme of ['dark', 'light'] as const) {
      const { container: c, unmount } = render(
        <div data-theme={theme}>
          <DonutChart aria-label="R" data={roles} x="role" y="hours" />
          <DonutChart aria-label="E" data={[]} x="role" y="hours" />
        </div>,
      )
      await expectAccessible(c)
      unmount()
    }
  })
})
