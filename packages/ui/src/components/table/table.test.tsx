import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { renderServer } from '../../../../../test/ssr'
import { Table } from './index'

function Example() {
  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell scope="col">Name</Table.HeaderCell>
          <Table.HeaderCell scope="col">Role</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell>Ariel</Table.Cell>
          <Table.Cell>Owner</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  )
}

describe('Table', () => {
  it('renders a semantic table with headers and rows', () => {
    render(<Example />)
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).toHaveLength(2)
    expect(screen.getByRole('cell', { name: 'Ariel' })).toBeInTheDocument()
  })

  it('resolves header cells to th and data cells to td', () => {
    render(<Example />)
    expect(screen.getByText('Name').tagName).toBe('TH')
    expect(screen.getByText('Owner').tagName).toBe('TD')
  })

  it('forwards ref to the table and merges className', () => {
    const ref = createRef<HTMLTableElement>()
    render(
      <Table ref={ref} className="text-md">
        <Table.Body>
          <Table.Row>
            <Table.Cell>x</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    )
    expect(ref.current?.tagName).toBe('TABLE')
    expect(ref.current?.classList.contains('text-md')).toBe(true)
  })

  it('maps density, striped and hoverable onto the table root and keeps them off the DOM', () => {
    render(
      <Table density="compact" striped hoverable data-testid="t">
        <Table.Body>
          <Table.Row>
            <Table.Cell>x</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    )
    const table = screen.getByTestId('t')
    expect(table.classList.contains('[&_td]:h-9')).toBe(true)
    expect(table.classList.contains('[&_tbody_tr:nth-child(even)]:bg-line-soft')).toBe(true)
    expect(table.classList.contains('[&_tbody_tr:hover]:bg-line')).toBe(true)
    for (const attr of ['density', 'striped', 'hoverable'])
      expect(table.hasAttribute(attr)).toBe(false)
  })

  it('comfortable density is the unchanged default', () => {
    render(<Example />)
    const table = screen.getByRole('table')
    expect(table.classList.contains('[&_td]:h-9')).toBe(false)
    expect(screen.getByText('Owner').classList.contains('h-11')).toBe(true)
  })

  it('wraps the table in a horizontal-scroll container', () => {
    const { container } = render(<Example />)
    const wrapper = container.querySelector('div')
    expect(wrapper?.classList.contains('overflow-x-auto')).toBe(true)
  })

  it('actions column: a hidden "Actions" header name and a narrow right-aligned cell', () => {
    render(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell scope="col">Name</Table.HeaderCell>
            <Table.ActionsHeaderCell scope="col" className="pr-4" />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Ariel</Table.Cell>
            <Table.ActionsCell className="pr-4">
              <button type="button">⋯</button>
            </Table.ActionsCell>
          </Table.Row>
        </Table.Body>
      </Table>,
    )
    const header = screen.getByRole('columnheader', { name: 'Actions' })
    expect(header.querySelector('.sr-only')).not.toBeNull()
    expect(header.classList.contains('w-px')).toBe(true)
    expect(header.classList.contains('pr-4')).toBe(true)
    const cell = screen.getByRole('button', { name: '⋯' }).parentElement as HTMLElement
    expect(cell.tagName).toBe('TD')
    expect(cell.classList.contains('text-right')).toBe(true)
    expect(cell.classList.contains('pr-4')).toBe(true)
  })

  it('actions header shows custom children instead of the hidden label', () => {
    render(
      <table>
        <thead>
          <tr>
            <Table.ActionsHeaderCell>Manage</Table.ActionsHeaderCell>
          </tr>
        </thead>
      </table>,
    )
    const header = screen.getByRole('columnheader', { name: 'Manage' })
    expect(header.querySelector('.sr-only')).toBeNull()
  })

  it('renders on the server', () => {
    expect(renderServer(<Example />)).toContain('<table')
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <Example />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})

describe('Table scroll', () => {
  // happy-dom has no layout: drive the overflow measurements and the ResizeObserver by hand.
  function setup(widths: { scroll: number; client: number }) {
    let notify: () => void = () => {}
    const RO = globalThis.ResizeObserver
    globalThis.ResizeObserver = class {
      constructor(cb: () => void) {
        notify = cb
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    } as unknown as typeof ResizeObserver
    const scrollW = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth')
    const clientW = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get: () => widths.scroll,
    })
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => widths.client,
    })
    const utils = render(
      <Table scroll aria-label="Stats by champion">
        <Table.Body>
          <Table.Row>
            <Table.Cell>Ahri</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    )
    const restore = () => {
      globalThis.ResizeObserver = RO
      if (scrollW) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', scrollW)
      if (clientW) Object.defineProperty(HTMLElement.prototype, 'clientWidth', clientW)
    }
    return {
      ...utils,
      region: () => screen.getByRole('region', { name: 'Stats by champion' }),
      notify: () => notify(),
      restore,
    }
  }

  it('is a tab stop only while the table overflows', () => {
    const widths = { scroll: 800, client: 360 }
    const t = setup(widths)
    try {
      expect(t.region()).toHaveAttribute('tabindex', '0')
      widths.scroll = 360
      t.notify()
      expect(t.region().hasAttribute('tabindex')).toBe(false)
      t.unmount()
    } finally {
      t.restore()
    }
  })

  it('names the region from aria-labelledby too, and a plain Table renders no region', () => {
    const t = setup({ scroll: 100, client: 100 })
    t.restore()
    t.unmount()
    render(
      <>
        <h2 id="t">Roles</h2>
        <Table scroll aria-labelledby="t">
          <Table.Body>
            <Table.Row>
              <Table.Cell>Mid</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
        <Table aria-label="Plain">
          <Table.Body>
            <Table.Row>
              <Table.Cell>x</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      </>,
    )
    expect(screen.getByRole('region', { name: 'Roles' })).toBeTruthy()
    expect(screen.getAllByRole('region')).toHaveLength(1)
  })
})
