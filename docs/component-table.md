# Component: Table

> Follows the `docs/component-button.md` template. Static component — no `'use client'`. A styled,
> compound wrapper over native table elements (not a data grid).

## 1. Purpose

Present tabular data with Sukuna styling. Composition over configuration; sorting/selection/
virtualization are out of scope (use a data-grid library for those).

## 2. Files

```
packages/ui/src/components/table/
├── table.styles.tsx   # tv() slots: wrapper, table, header, body, row, headerCell, cell.
├── table.logic.tsx    # forwardRef<table> + Header/Body/Row/HeaderCell/Cell. NO 'use client'.
├── table.test.tsx
├── table.stories.tsx
└── index.tsx
```

## 3. API

```ts
export interface TableProps extends ComponentPropsWithoutRef<'table'> {
  density?: 'comfortable' | 'compact'   // default 'comfortable'
  striped?: boolean                     // even body rows get a line-soft background
  hoverable?: boolean                   // every body row highlights on hover
  scroll?: boolean                      // charts & stats wave 3: keyboard-scrollable while it overflows
}
export const Table: ForwardRefExoticComponent<TableProps> & {
  Header, Body, Row, HeaderCell, Cell   // thin styled wrappers over thead/tbody/tr/th/td
  ActionsHeaderCell, ActionsCell        // v1.3 — the actions column (see component-row-actions.md)
}
```

```tsx
<Table>
  <Table.Header><Table.Row><Table.HeaderCell>Name</Table.HeaderCell></Table.Row></Table.Header>
  <Table.Body><Table.Row><Table.Cell>Ariel</Table.Cell></Table.Row></Table.Body>
</Table>
```

**Actions column (v1.3).** `Table.ActionsHeaderCell` is a `th` (`w-px text-right`) whose default
content is a visually hidden "Actions" (`sr-only`) so the column keeps an accessible name; pass
children to replace it. `Table.ActionsCell` is a `td` (`w-px text-right whitespace-nowrap`) that
holds a `RowActions` (⋯ menu with icon options). Both stay static — the menu lives in
`RowActions`, so `Table` never imports Base UI and keeps its 2 kB budget.

## 4. Variants → tokens

wrapper: `w-full overflow-x-auto` (horizontal scroll on small screens). table: `w-full border-collapse
text-sm text-text`. headerCell: `h-10 px-3 text-xs uppercase tracking-eyebrow text-text-dim border-b
border-line`. row: `border-b border-line`, `data-[interactive]:hover:bg-line-soft`. cell: `h-11 px-3`.

Root options are applied to the `<table>` through descendant selectors, so sub-parts need no
context (and a descendant rule beats a cell's own `h-11` on specificity):

| option | table utilities |
|---|---|
| density compact | `[&_th]:h-8 [&_th]:px-2 [&_td]:h-9 [&_td]:px-2` (comfortable = unchanged cell classes) |
| striped | `[&_tbody_tr:nth-child(even)]:bg-line-soft` |
| hoverable | `[&_tbody_tr:hover]:bg-line` — `line` (10%) rather than `line-soft` so it still reads over a stripe |

## 5. States

Static. Rows highlight on hover when the table is `hoverable`, or per row with `data-interactive`.

**`scroll` (wave 3, Q32/Q33):** the wrapper always scrolls sideways; with `scroll` it also becomes a
keyboard tab stop **only while the table overflows** (arrow keys then scroll it), with a focus ring,
and it is a `role="region"` named by the table's own `aria-label` / `aria-labelledby`. When nothing
overflows it stays out of the tab order. Replaces sukuna-gg-web's `Scrollable`.

## 6. Logic (`table.logic.tsx`)

- No `'use client'`. `Table` renders a scroll-wrapped `<table>` (forwardRef to the table). Sub-parts
  are thin styled wrappers over `thead`/`tbody`/`tr`/`th`/`td`, all accepting native props.
- `scroll`: the wrapper is `<TableScroll>` from a fourth file, `table.scroll.tsx` (`'use client'`):
  a ResizeObserver sets `tabIndex=0` while `scrollWidth > clientWidth` and removes it otherwise.
  Without `scroll`, Table stays a zero-JS server component (same split as Input `reveal`, D36).

## 7. Styles

`tv()` `slots` + root-only `density` / `striped` / `hoverable` variants on the `table` slot;
`defaultVariants: { density: 'comfortable' }`. Sub-parts use a static slot map.

## 8. Accessibility checklist

- [ ] Real `<table>`/`<thead>`/`<th>` semantics (use `Table.HeaderCell` for headers).
- [ ] Add `scope="col"`/`scope="row"` on header cells where appropriate (native prop passthrough).
- [ ] The wrapper scrolls horizontally so the table never breaks the page layout.
- [ ] With `scroll`, keyboard users can reach and scroll an overflowing table (WCAG 2.1.1); the
      region has the table's name and a visible focus ring; no extra tab stop when it fits.

## 9. Tests

Renders a semantic table with column headers and rows; header/data cells resolve to `th`/`td`; ref
on the table; className merges; the wrapper enables horizontal scroll; SSR; axe both themes.
`scroll`: tab stop only while overflowing (and removed when it stops), region named by the table's
label, a plain Table module stays server-only.

## 10. Stories

`Default`, `Compact`, `Striped`, `Hoverable`, `StripedHoverableCompact`, `Interactive` (per-row
hover), `Wide`, `WithActions` (v1.3 actions column), `KeyboardScroll` (`scroll` in a narrow box).

## 11. Decisions

- Compound of styled native elements; no sorting/selection/pagination baked in (compose with
  Pagination; bring a data grid for heavy needs).
- Root options (post-0.8.0) use descendant selectors instead of React context, keeping every
  sub-part a stateless, context-free wrapper (RSC-safe, no re-render coupling).
