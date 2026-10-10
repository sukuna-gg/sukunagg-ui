import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import * as icons from './index'

const all = Object.entries(icons) as [string, typeof icons.CheckIcon][]

describe('Icon', () => {
  it('exports 20 icons, each named after itself', () => {
    expect(all).toHaveLength(20)
    for (const [name, Icon] of all) expect(Icon.displayName).toBe(name)
  })

  it('renders every icon on the server as a 24px-grid stroke svg', () => {
    for (const [, Icon] of all) {
      const html = renderServer(<Icon />)
      expect(html).toContain('viewBox="0 0 24 24"')
      expect(html).toContain('stroke="currentColor"')
    }
  })

  it('is decorative by default', () => {
    const { container } = render(<icons.CheckIcon />)
    const svg = container.querySelector('svg') as SVGSVGElement
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
    expect(svg.hasAttribute('role')).toBe(false)
    expect(svg.querySelector('title')).toBeNull()
  })

  it('title names it as an image', () => {
    render(<icons.InfoIcon title="Not reported by Riot" />)
    const img = screen.getByRole('img', { name: 'Not reported by Riot' })
    expect(img.hasAttribute('aria-hidden')).toBe(false)
    expect(img.querySelector('title')?.textContent).toBe('Not reported by Riot')
  })

  it('aria-label or aria-labelledby also name it', () => {
    render(
      <>
        <span id="lbl">Locked</span>
        <icons.LockIcon aria-labelledby="lbl" />
        <icons.SearchIcon aria-label="Search" />
      </>,
    )
    expect(screen.getByRole('img', { name: 'Locked' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Search' })).toBeTruthy()
  })

  it('size, strokeWidth, className and native props', () => {
    const { container } = render(
      <icons.ChevronDownIcon
        size={24}
        strokeWidth={1.5}
        className="text-text-dim"
        data-testid="i"
      />,
    )
    const svg = container.querySelector('svg') as SVGSVGElement
    expect(svg).toHaveAttribute('width', '24')
    expect(svg).toHaveAttribute('height', '24')
    expect(svg).toHaveAttribute('stroke-width', '1.5')
    expect(svg.getAttribute('class')).toContain('text-text-dim')
    expect(svg.getAttribute('class')).toContain('shrink-0')
    expect(screen.getByTestId('i')).toBe(svg as unknown as HTMLElement)
    const { container: c2 } = render(<icons.SunIcon size="1em" />)
    expect(c2.querySelector('svg')).toHaveAttribute('width', '1em')
  })

  it('forwards ref to the svg', () => {
    const ref = createRef<SVGSVGElement>()
    render(<icons.MoonIcon ref={ref} />)
    expect(ref.current?.tagName.toLowerCase()).toBe('svg')
  })

  it('hydrates and is accessible', async () => {
    await expectHydrates(<icons.AlertIcon title="Warning" />)
    const { container } = render(
      <div>
        {all.map(([name, Icon]) => (
          <Icon key={name} />
        ))}
        <icons.InfoIcon title="Info" />
      </div>,
    )
    await expectAccessible(container)
  })
})
