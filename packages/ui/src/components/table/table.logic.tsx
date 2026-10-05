import { type ComponentPropsWithoutRef, forwardRef } from 'react'
import { TableScroll } from './table.scroll'
import { type TableStyleProps, tableStyles } from './table.styles'

// Sub-parts vary by nothing, so they share one static slot map.
const styles = tableStyles()

/** Props for {@link Table}: the native `<table>` attributes plus the root style options. */
export interface TableProps
  extends ComponentPropsWithoutRef<'table'>,
    Omit<TableStyleProps, 'density' | 'striped' | 'hoverable'> {
  /**
   * Row height: `comfortable` (40px header / 44px cells) or `compact` (32px / 36px, tighter
   * padding) for dense data.
   * @default 'comfortable'
   */
  density?: 'comfortable' | 'compact'
  /**
   * Even body rows get a `line-soft` background.
   * @default false
   */
  striped?: boolean
  /**
   * Every body row highlights on hover (no per-row `data-interactive` needed).
   * @default false
   */
  hoverable?: boolean
  /**
   * Make the sideways-scrolling wrapper a keyboard tab stop while the table overflows (arrow
   * keys then scroll it), as a region named by the table's `aria-label` / `aria-labelledby`.
   * Loads a small client file; without it Table ships no JS.
   * @default false
   */
  scroll?: boolean
}

/**
 * Table root: a `<table>` inside a full-width, horizontally scrolling `<div>`. Accepts every
 * native `<table>` attribute; `className` is merged into the table (not the wrapper) and the ref
 * points at the `<table>`.
 */
const TableRoot = forwardRef<HTMLTableElement, TableProps>(function Table(
  { density, striped, hoverable, scroll = false, className, children, ...rest },
  ref,
) {
  const root = tableStyles({ density, striped, hoverable })
  const table = (
    <table ref={ref} className={root.table({ className })} {...rest}>
      {children}
    </table>
  )
  return scroll ? (
    <TableScroll
      className={root.wrapper()}
      label={rest['aria-label']}
      labelledBy={rest['aria-labelledby']}
    >
      {table}
    </TableScroll>
  ) : (
    <div className={root.wrapper()}>{table}</div>
  )
})

/** `Table.Header`: a left-aligned `<thead>`; put one `Table.Row` of `Table.HeaderCell`s inside. */
function Header({ className, ...rest }: ComponentPropsWithoutRef<'thead'>) {
  return <thead className={styles.header({ className })} {...rest} />
}
/** `Table.Body`: an unstyled `<tbody>` holding the data `Table.Row`s. */
function Body({ className, ...rest }: ComponentPropsWithoutRef<'tbody'>) {
  return <tbody className={styles.body({ className })} {...rest} />
}
/**
 * `Table.Row`: a `<tr>` with a bottom hairline (none on the last row). Add `data-interactive`
 * to get a hover background for clickable rows.
 */
function Row({ className, ...rest }: ComponentPropsWithoutRef<'tr'>) {
  return <tr className={styles.row({ className })} {...rest} />
}
/**
 * `Table.HeaderCell`: a 40px-tall `<th>` in dim uppercase eyebrow text. Pass `scope="col"` (or
 * `scope="row"` for row headers) so screen readers associate it with its cells.
 */
function HeaderCell({ className, ...rest }: ComponentPropsWithoutRef<'th'>) {
  return <th className={styles.headerCell({ className })} {...rest} />
}
/** `Table.Cell`: a 44px-tall, vertically centred `<td>`; use `className` for alignment. */
function Cell({ className, ...rest }: ComponentPropsWithoutRef<'td'>) {
  return <td className={styles.cell({ className })} {...rest} />
}

/**
 * Header cell for the actions column. With no children it renders a visually hidden "Actions"
 * label, so the column keeps an accessible name without visible text.
 */
function ActionsHeaderCell({ className, children, ...rest }: ComponentPropsWithoutRef<'th'>) {
  return (
    <th
      className={styles.headerCell({ className: styles.actionsHeaderCell({ className }) })}
      {...rest}
    >
      {children ?? <span className="sr-only">Actions</span>}
    </th>
  )
}
/** Data cell for the actions column: shrinks to its content and right-aligns a `RowActions`. */
function ActionsCell({ className, ...rest }: ComponentPropsWithoutRef<'td'>) {
  return <td className={styles.cell({ className: styles.actionsCell({ className }) })} {...rest} />
}

/**
 * Presents tabular data with Sukuna styling as a compound of thin wrappers over the native table
 * elements: `Table` + `Table.Header` / `Table.Body` / `Table.Row` / `Table.HeaderCell` /
 * `Table.Cell`.
 *
 * @remarks
 * - SSR/RSC: static (no `'use client'`); every part is a plain function component with no state
 *   or DOM access, so the whole table can live in a React Server Component.
 * - Accessibility: real `<table>`/`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>` semantics — use
 *   `Table.HeaderCell` (never a styled `Table.Cell`) for headers and give it `scope`. Add a
 *   `<caption>` child or `aria-label` on `Table` to name it. The wrapper scrolls horizontally so a
 *   wide table never breaks the page layout; add `scroll` so keyboard users can reach and scroll
 *   it while it overflows (a region named like the table — the only part that loads client JS).
 * - Variants (on the root only; applied to the `<table>` via descendant selectors so sub-parts
 *   need no context):
 *   - `density`: 'comfortable' (default — 40px header / 44px cells) | 'compact' (32px / 36px,
 *     tighter padding).
 *   - `striped`: boolean — even body rows get a `line-soft` background.
 *   - `hoverable`: boolean — every body row highlights (`line`) on hover, without per-row
 *     `data-interactive`.
 *   Each part takes its native props and a `className` merged after the base styles. Only the
 *   root is `forwardRef` (→ `HTMLTableElement`); sub-parts take no ref.
 * - Behaviour: renders every row you pass — no sorting, selection, virtualization or paging.
 *   Beyond a few hundred rows, paginate (compose with `Pagination`) or use a data grid.
 *   `data-interactive` on a `Table.Row` opts that single row into a hover background.
 * - Actions column (v1.3): `Table.ActionsHeaderCell` (visually hidden "Actions" name by default)
 *   and `Table.ActionsCell` (narrow, right-aligned) hold a `RowActions` ⋯ menu per row. The menu
 *   lives in `RowActions`, so `Table` itself stays static and Base-UI-free.
 *
 * @example
 * ```tsx
 * import { RowActions, Table } from '@sukunagg/ui'
 *
 * <Table.Row>
 *   <Table.Cell>Invoice #42</Table.Cell>
 *   <Table.ActionsCell>
 *     <RowActions
 *       aria-label="Actions for invoice #42"
 *       items={[
 *         { label: 'Edit', icon: <PencilIcon />, onSelect: edit },
 *         { label: 'Delete', icon: <TrashIcon />, onSelect: remove },
 *       ]}
 *     />
 *   </Table.ActionsCell>
 * </Table.Row>
 * ```
 *
 * @example
 * ```tsx
 * import { Table } from '@sukunagg/ui'
 *
 * const users = [
 *   { id: 1, name: 'Ariel', role: 'Owner', lastSeen: 'Today' },
 *   { id: 2, name: 'Sukuna', role: 'Admin', lastSeen: 'Yesterday' },
 * ]
 *
 * <Table aria-label="Team members">
 *   <Table.Header>
 *     <Table.Row>
 *       <Table.HeaderCell scope="col">Name</Table.HeaderCell>
 *       <Table.HeaderCell scope="col">Role</Table.HeaderCell>
 *       <Table.HeaderCell scope="col" className="text-right">Last seen</Table.HeaderCell>
 *     </Table.Row>
 *   </Table.Header>
 *   <Table.Body>
 *     {users.map((user) => (
 *       <Table.Row key={user.id} data-interactive onClick={() => openUser(user.id)}>
 *         <Table.Cell>{user.name}</Table.Cell>
 *         <Table.Cell>{user.role}</Table.Cell>
 *         <Table.Cell className="text-right">{user.lastSeen}</Table.Cell>
 *       </Table.Row>
 *     ))}
 *   </Table.Body>
 * </Table>
 * ```
 */
export const Table = Object.assign(TableRoot, {
  Header,
  Body,
  Row,
  HeaderCell,
  Cell,
  ActionsHeaderCell,
  ActionsCell,
})
