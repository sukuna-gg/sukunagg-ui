import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { RadialGauge } from './index'

describe('RadialGauge', () => {
  it('renders on the server as a meter', () => {
    expect(renderServer(<RadialGauge value={64} aria-label="LP" />)).toContain('role="meter"')
  })

  it('is a named meter with min/max/now and a text value', () => {
    render(
      <RadialGauge
        value={64}
        label="LP to next division"
        caption="of 100 LP"
        description="Diamond II"
      />,
    )
    const m = screen.getByRole('meter', { name: 'LP to next division' })
    expect(m).toHaveAttribute('aria-valuemin', '0')
    expect(m).toHaveAttribute('aria-valuemax', '100')
    expect(m).toHaveAttribute('aria-valuenow', '64')
    expect(m).toHaveAttribute('aria-valuetext', '64')
    expect(m.textContent).toContain('of 100 LP')
    expect(m.textContent).toContain('Diamond II')
  })

  it('draws the fill to the value and clamps out-of-range values', () => {
    const { container, rerender } = render(<RadialGauge value={0} aria-label="x" />)
    expect(container.querySelectorAll('path')).toHaveLength(1)
    rerender(<RadialGauge value={50} aria-label="x" />)
    const fill = container.querySelectorAll('path')[1]?.getAttribute('d') as string
    // Half of the 270° arc ends at the top of the circle.
    expect(fill.endsWith('50.000,4.000')).toBe(true)
    rerender(<RadialGauge value={500} aria-label="x" />)
    expect(container.querySelectorAll('path')[1]?.getAttribute('d')).toContain(' 0 1 1 ')
    rerender(<RadialGauge value={5} min={10} max={10} aria-label="x" />)
    expect(container.querySelectorAll('path')).toHaveLength(1)
  })

  it('null: an image named like the gauge, described as not reported — never a meter at 0', () => {
    const { container, rerender } = render(<RadialGauge value={null} aria-label="LP" />)
    expect(screen.queryByRole('meter')).toBeNull()
    const m = screen.getByRole('img', { name: 'LP' })
    expect(m.hasAttribute('aria-valuenow')).toBe(false)
    expect(m).toHaveAccessibleDescription('Not reported')
    expect(container.querySelectorAll('path')).toHaveLength(1)
    expect(m.textContent).toContain('—')
    rerender(<RadialGauge value={null} aria-label="LP" missingLabel="Unranked" valueLabel="?" />)
    expect(screen.getByRole('img')).toHaveAccessibleDescription('Unranked')
    expect(screen.getByRole('img').textContent).toContain('?')
  })

  it('format, locale, valueLabel, aria-valuetext override, color, size', () => {
    const { container, rerender } = render(
      <RadialGauge
        value={0.84}
        max={1}
        format={{ style: 'percent' }}
        aria-label="Usage"
        color="var(--sk-chart-2)"
        size={200}
      />,
    )
    const m = screen.getByRole('meter')
    expect(m.textContent).toContain('84%')
    expect(m.style.getPropertyValue('--sk-gauge-color')).toBe('var(--sk-chart-2)')
    expect(container.querySelector('svg')?.parentElement?.style.width).toBe('200px')
    rerender(
      <RadialGauge
        value={1234.5}
        max={2000}
        locale="de-DE"
        aria-label="x"
        aria-valuetext="lots"
        valueLabel="big"
      />,
    )
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', 'lots')
    expect(screen.getByRole('meter').textContent).toContain('big')
  })

  it('ref, id, native props; hydrates; accessible', async () => {
    const ref = createRef<HTMLDivElement>()
    render(<RadialGauge ref={ref} id="g" value={10} label="L" data-testid="g" className="m-2" />)
    expect(ref.current?.id).toBe('g')
    expect(screen.getByTestId('g').className).toContain('m-2')
    expect(screen.getByRole('meter', { name: 'L' })).toBeTruthy()
    await expectHydrates(<RadialGauge value={64} label="LP" />)
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <RadialGauge value={64} label="LP to next division" caption="of 100 LP" />
          <RadialGauge value={null} aria-label="Rank" />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
