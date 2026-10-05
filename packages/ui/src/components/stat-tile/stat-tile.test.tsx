import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { StatTile } from './index'

const valueEl = (container: HTMLElement) => container.querySelector('.leading-none') as HTMLElement

describe('StatTile', () => {
  it('renders on the server', () => {
    const html = renderServer(
      <StatTile
        label="Win rate"
        value={0.583}
        format={{ style: 'percent', maximumFractionDigits: 1 }}
      />,
    )
    expect(html).toContain('Win rate')
    expect(html).toContain('58.3%')
  })

  it('formats numbers with the fixed locale (or a given one)', () => {
    const { container, rerender } = render(<StatTile label="Matches" value={1284} />)
    expect(valueEl(container).textContent).toBe('1,284')
    rerender(<StatTile label="Matches" value={1284.5} locale="de-DE" />)
    expect(valueEl(container).textContent).toBe('1.284,5')
  })

  it('passes strings and nodes through as is', () => {
    const { container, rerender } = render(<StatTile label="Avg. place" value="3.84" />)
    expect(valueEl(container).textContent).toBe('3.84')
    rerender(<StatTile label="Rank" value={<b>Diamond II</b>} />)
    expect(valueEl(container).querySelector('b')?.textContent).toBe('Diamond II')
  })

  it('shows — for a missing value with sr text, never 0; a real 0 shows 0', () => {
    const { container, rerender } = render(
      <StatTile label="Damage / game" value={null} caption="Not reported by Riot for Set 18" />,
    )
    expect(container.textContent).toContain('—')
    expect(container.textContent).toContain('Not reported')
    expect(container.textContent).not.toMatch(/\b0\b/)
    expect(valueEl(container).className).toContain('text-text-faint')
    rerender(
      <StatTile label="Damage" value={undefined} missingLabel="No data yet" valueColor="red" />,
    )
    expect(container.textContent).toContain('No data yet')
    expect(valueEl(container).className).not.toContain('--sk-stat-value')
    rerender(<StatTile label="Deaths" value={0} />)
    expect(valueEl(container).textContent).toBe('0')
  })

  it('applies each tone to the value', () => {
    const map = {
      default: 'text-text',
      positive: 'text-success',
      negative: 'text-danger',
      premium: 'text-premium',
    } as const
    for (const [tone, cls] of Object.entries(map)) {
      const { container, unmount } = render(
        <StatTile label="x" value={1} tone={tone as keyof typeof map} />,
      )
      expect(valueEl(container).className).toContain(cls)
      unmount()
    }
  })

  it('valueColor sets the CSS variable and beats tone', () => {
    const { container } = render(
      <StatTile
        label="KDA"
        value="3.42"
        tone="positive"
        valueColor="var(--l-great)"
        style={{ marginTop: 4 }}
      />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue('--sk-stat-value')).toBe('var(--l-great)')
    expect(root.style.marginTop).toBe('4px')
    expect(valueEl(container).className).toContain('text-(--sk-stat-value)')
    expect(valueEl(container).className).not.toContain('text-success')
  })

  it('delta: up/down/zero × invert → good/bad/flat, with words for screen readers', () => {
    const cases = [
      {
        d: { value: 2.1, unit: ' pts', period: 'vs last act' },
        cls: 'text-success',
        aria: '▲ 2.1 pts',
        sr: 'up 2.1 pts, better,',
      },
      {
        d: { value: -1.6, invert: true },
        cls: 'text-success',
        aria: '▼ 1.6',
        sr: 'down 1.6, better',
      },
      {
        d: { value: 0.4, unit: ' pts', invert: true },
        cls: 'text-success',
        aria: '▲ 0.4 pts',
        sr: 'up 0.4 pts, worse',
      },
      { d: { value: -3 }, cls: 'text-danger', aria: '▼ 3', sr: 'down 3, worse' },
      {
        d: { value: 0, period: 'vs last week' },
        cls: 'text-text-dim',
        aria: '– No change',
        sr: 'no change,',
      },
    ]
    for (const c of cases) {
      const { container, unmount } = render(<StatTile label="x" value={1} delta={c.d} />)
      const delta = container.querySelector('.text-xs.font-semibold') as HTMLElement
      const want = c.sr.includes('worse') ? 'text-danger' : c.cls
      expect(delta.className).toContain(want)
      expect(delta.querySelector('[aria-hidden="true"]')?.textContent).toBe(c.aria)
      expect(delta.querySelector('.sr-only')?.textContent).toBe(c.sr)
      unmount()
    }
  })

  it('formats the delta with its own format', () => {
    const { container } = render(
      <StatTile
        label="x"
        value={1}
        delta={{ value: 0.1234, format: { maximumFractionDigits: 2 } }}
      />,
    )
    expect(container.textContent).toContain('▲ 0.12')
  })

  it('renders a trend beside the value (md) or below it (lg); skips an all-null trend', () => {
    const { container, rerender } = render(<StatTile label="LP" value={64} trend={[22, 40, 64]} />)
    const spark = () => container.querySelector('[role="img"]') as HTMLElement
    expect(spark().parentElement?.className).toContain('max-w-24')
    expect(spark().style.height).toBe('28px')
    rerender(<StatTile label="LP" value={64} trend={[22, 40, 64]} size="lg" />)
    expect(spark().parentElement?.className).toContain('mt-auto')
    expect(spark().style.height).toBe('56px')
    expect(valueEl(container).className).toContain('text-[52px]')
    rerender(<StatTile label="LP" value={64} trend={[null, null]} />)
    expect(container.querySelector('[role="img"]')).toBeNull()
  })

  it('valueFont switches the value face', () => {
    const { container, rerender } = render(<StatTile label="x" value={1} />)
    expect(valueEl(container).className).toContain('font-display')
    rerender(<StatTile label="x" value={1} valueFont="sans" />)
    expect(valueEl(container).className).toContain('font-sans')
  })

  it('loading renders a same-size skeleton with aria-busy', () => {
    const { container, rerender } = render(<StatTile label="Win rate" value={1} loading />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveAttribute('aria-busy', 'true')
    expect(root.className).toContain('min-h-28')
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3)
    expect(container.textContent).toBe('')
    rerender(<StatTile label="Win rate" value={1} loading size="lg" />)
    expect((container.firstElementChild as HTMLElement).className).toContain('min-h-44')
    expect(container.querySelector('.h-12')).toBeTruthy()
  })

  it('omits caption and delta when not given', () => {
    const { container } = render(<StatTile label="x" value={1} />)
    expect(container.firstElementChild?.children).toHaveLength(2)
  })

  it('forwards ref, merges className, passes native props', () => {
    const ref = createRef<HTMLDivElement>()
    render(<StatTile ref={ref} label="x" value={1} className="col-span-2" data-testid="t" />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(screen.getByTestId('t').className).toContain('col-span-2')
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(
      <StatTile
        label="Avg deaths"
        value={14.3}
        caption="Last 20"
        delta={{ value: -1.6, period: 'vs last 20', invert: true }}
        trend={[16, 15, 14.3]}
      />,
    )
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <StatTile
            label="Win rate"
            value="58.3%"
            tone="positive"
            caption="35W 25L"
            delta={{ value: 2.1, unit: ' pts', period: 'vs last act' }}
            trend={[1, 2, 3]}
          />
          <StatTile label="Damage / game" value={null} caption="Not reported by Riot" />
          <StatTile
            label="Churn"
            value="3.1%"
            delta={{ value: 0.4, invert: true }}
            size="lg"
            trend={[2, 3]}
          />
          <StatTile label="Loading" value={1} loading />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
