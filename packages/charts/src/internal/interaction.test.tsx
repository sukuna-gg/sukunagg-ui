import { describe, expect, it } from 'bun:test'
import { act, fireEvent, render } from '@testing-library/react'
import { expectAccessible } from '../../../../test/axe'
import { ChartInteraction, type ChartInteractionProps } from './interaction'

const tips = ['Rifles', 'SMGs', 'Snipers'].map((title, i) => ({
  title,
  rows: [
    { label: 'Season 3', value: String(100 * (i + 1)), color: 'var(--sk-chart-1)' },
    { label: 'Total', value: String(200 * (i + 1)) },
  ],
}))

const base: ChartInteractionProps = {
  label: 'Kills by weapon',
  axis: 'x',
  positions: [10, 50, 90],
  anchors: [80, 20, null],
  tips,
}

function setup(props: Partial<ChartInteractionProps> = {}) {
  const utils = render(
    <div style={{ position: 'relative', width: 200, height: 100 }}>
      <ChartInteraction {...base} {...props} />
    </div>,
  )
  const el = utils.container.querySelector('[aria-roledescription="chart"]') as HTMLElement
  // happy-dom has no layout: give the overlay a 200×100 box at the origin.
  el.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 200,
    height: 100,
    right: 200,
    bottom: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
  const live = () => el.querySelector('[aria-live]')?.textContent
  const tip = () => el.querySelector('.pointer-events-none.absolute.z-10') as HTMLElement | null
  return { ...utils, el, live, tip }
}

describe('ChartInteraction', () => {
  it('is one named tab stop with nothing shown at rest', () => {
    const { el, live, tip } = setup()
    expect(el).toHaveAttribute('tabindex', '0')
    expect(el).toHaveAttribute('role', 'group')
    expect(el.getAttribute('aria-label')).toBe(
      'Kills by weapon. Use the arrow keys to read values.',
    )
    expect(live()).toBe('')
    expect(tip()).toBeNull()
  })

  it('shows the nearest point under the pointer and hides on leave', () => {
    const { el, live, tip } = setup()
    fireEvent.pointerMove(el, { clientX: 110, clientY: 40 })
    expect(live()).toBe('SMGs: Season 3 200, Total 400')
    expect(tip()?.textContent).toContain('SMGs')
    // band highlight is absent without `band`: a crosshair line instead
    expect(el.querySelector('.w-px')).toBeTruthy()
    fireEvent.pointerLeave(el)
    expect(tip()).toBeNull()
  })

  it('arrow keys, Home/End and Escape move through points', () => {
    const { el, live } = setup()
    const key = (k: string) => fireEvent.keyDown(el, { key: k })
    key('ArrowRight')
    expect(live()).toContain('Rifles')
    key('ArrowDown')
    expect(live()).toContain('SMGs')
    key('ArrowLeft')
    expect(live()).toContain('Rifles')
    key('ArrowLeft')
    expect(live()).toContain('Rifles')
    key('End')
    expect(live()).toContain('Snipers')
    key('ArrowRight')
    expect(live()).toContain('Snipers')
    key('Home')
    expect(live()).toContain('Rifles')
    key('Escape')
    expect(live()).toBe('')
    key('ArrowUp')
    expect(live()).toContain('Rifles')
    key('a') // ignored
    expect(live()).toContain('Rifles')
    act(() => el.blur())
    fireEvent.blur(el)
    expect(live()).toBe('')
  })

  it('flips the tooltip near the right edge and drops it below near the top', () => {
    const { el, tip } = setup()
    fireEvent.pointerMove(el, { clientX: 20, clientY: 50 })
    expect(tip()?.style.translate).toBe('12px calc(-100% - 8px)')
    fireEvent.pointerMove(el, { clientX: 100, clientY: 50 })
    expect(tip()?.style.translate).toBe('12px 8px')
    fireEvent.pointerMove(el, { clientX: 190, clientY: 50 })
    expect(tip()?.style.translate).toBe('calc(-100% - 12px) calc(-100% - 8px)')
    expect(tip()?.style.top).toBe('50%') // null anchor → middle
  })

  it('draws a band highlight and ringed marks when given', () => {
    const { el } = setup({ band: 20, marks: [{ color: 'red', at: [30, null, 70] }] })
    fireEvent.pointerMove(el, { clientX: 10, clientY: 50 })
    const band = el.querySelector('.rounded-md') as HTMLElement
    expect(band.style.left).toBe('0%')
    expect(band.style.width).toBe('20%')
    expect(el.querySelectorAll('.ring-2')).toHaveLength(1)
    fireEvent.pointerMove(el, { clientX: 100, clientY: 50 })
    expect(el.querySelectorAll('.ring-2')).toHaveLength(0)
  })

  it('works along y for horizontal bars', () => {
    const { el, live, tip } = setup({ axis: 'y', band: 30, anchors: [80, 20, 50] })
    fireEvent.pointerMove(el, { clientX: 10, clientY: 95 })
    expect(live()).toContain('Snipers')
    expect(tip()?.style.translate).toBe('12px -50%')
    expect((el.querySelector('.rounded-md') as HTMLElement).style.height).toBe('30%')
    fireEvent.pointerMove(el, { clientX: 10, clientY: 5 })
    expect(tip()?.style.translate).toBe('calc(-100% - 12px) -50%')
  })

  it('is accessible', async () => {
    const { container, el } = setup()
    fireEvent.keyDown(el, { key: 'ArrowRight' })
    await expectAccessible(container)
  })
})
