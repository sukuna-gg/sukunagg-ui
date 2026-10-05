import { describe, expect, it, spyOn } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { DataBar } from './index'

const fill = (c: HTMLElement) =>
  c.querySelector('[aria-hidden="true"] > span') as HTMLElement | null

describe('DataBar', () => {
  it('renders on the server', () => {
    expect(renderServer(<DataBar value={31240} max={35880} />)).toContain('31,240')
  })

  it('scales the bar to value / max and clamps above max', () => {
    const { container, rerender } = render(<DataBar value={50} max={200} />)
    expect(fill(container)?.style.width).toBe('25%')
    rerender(<DataBar value={300} max={200} />)
    expect(fill(container)?.style.width).toBe('100%')
    expect(container.textContent).toBe('300')
    rerender(<DataBar value={5} max={0} />)
    expect(fill(container)?.style.width).toBe('0%')
  })

  it('0 is a real value; null is "–" + sr text with no track', () => {
    const { container, rerender } = render(<DataBar value={0} max={10} />)
    expect(container.textContent).toBe('0')
    expect(fill(container)?.style.width).toBe('0%')
    rerender(<DataBar value={null} max={10} />)
    expect(container.textContent).toBe('–Not reported')
    expect(fill(container)).toBeNull()
    rerender(<DataBar value={null} max={10} missingLabel="No damage data" className="ml-2" />)
    expect(container.textContent).toBe('–No damage data')
    expect((container.firstElementChild as HTMLElement).className).toContain('ml-2')
  })

  it('formats with Intl options, a function, or a locale', () => {
    const { container, rerender } = render(
      <DataBar value={0.314} max={1} format={{ style: 'percent' }} />,
    )
    expect(container.textContent).toBe('31%')
    rerender(<DataBar value={31.4} max={40} format={(v) => `${v}%`} />)
    expect(container.textContent).toBe('31.4%')
    rerender(<DataBar value={1234.5} max={2000} locale="de-DE" />)
    expect(container.textContent).toBe('1.234,5')
  })

  it('color goes through a CSS variable; size switches the track', () => {
    const { container, rerender } = render(<DataBar value={1} max={2} color="var(--l-blue)" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.style.getPropertyValue('--sk-databar-color')).toBe('var(--l-blue)')
    expect(container.querySelector('.h-1\\.5')).toBeTruthy()
    rerender(<DataBar value={1} max={2} size="sm" />)
    expect(
      (container.firstElementChild as HTMLElement).style.getPropertyValue('--sk-databar-color'),
    ).toBe('var(--sk-chart-1)')
    expect(container.querySelector('.h-1')).toBeTruthy()
  })

  it('bar only: role="img" with a label; warns without one', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    const { rerender } = render(
      <DataBar value={1} max={2} showValue={false} aria-label="Damage 1 of 2" />,
    )
    expect(screen.getByRole('img', { name: 'Damage 1 of 2' })).toBeTruthy()
    expect(warn).not.toHaveBeenCalled()
    rerender(<DataBar value={1} max={2} showValue={false} />)
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('forwards ref (both branches) and passes native props', () => {
    const ref = createRef<HTMLSpanElement>()
    const { rerender } = render(<DataBar ref={ref} value={1} max={2} data-testid="d" />)
    expect(ref.current).toBeInstanceOf(HTMLSpanElement)
    expect(screen.getByTestId('d')).toBeTruthy()
    rerender(<DataBar ref={ref} value={null} max={2} />)
    expect(ref.current).toBeInstanceOf(HTMLSpanElement)
  })

  it('hydrates and is accessible in both themes (inside a table)', async () => {
    await expectHydrates(<DataBar value={31240} max={35880} />)
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <table data-theme={theme}>
          <tbody>
            <tr>
              <th scope="row">kairo</th>
              <td>
                <DataBar value={31240} max={35880} />
              </td>
              <td>
                <DataBar value={null} max={35880} />
              </td>
            </tr>
          </tbody>
        </table>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
