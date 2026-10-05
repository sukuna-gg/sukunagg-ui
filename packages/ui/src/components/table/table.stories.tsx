import type { Meta, StoryObj } from '@storybook/react-vite'
import { CopyIcon, PencilIcon, TrashIcon } from '../../stories/icons'
import { Badge } from '../badge'
import { RowActions } from '../row-actions'
import { Table } from './index'

const rows = [
  { name: 'Ariel', role: 'Owner', status: 'Active' },
  { name: 'Jordan', role: 'Editor', status: 'Active' },
  { name: 'Kim', role: 'Viewer', status: 'Invited' },
]

const meta = {
  title: 'Components/Table',
  component: Table,
  tags: ['autodocs'],
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell scope="col">Name</Table.HeaderCell>
          <Table.HeaderCell scope="col">Role</Table.HeaderCell>
          <Table.HeaderCell scope="col">Status</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rows.map((r) => (
          <Table.Row key={r.name}>
            <Table.Cell>{r.name}</Table.Cell>
            <Table.Cell>{r.role}</Table.Cell>
            <Table.Cell>
              <Badge tone={r.status === 'Active' ? 'success' : 'neutral'}>{r.status}</Badge>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
}

const Rows = () => (
  <>
    <Table.Header>
      <Table.Row>
        <Table.HeaderCell scope="col">Name</Table.HeaderCell>
        <Table.HeaderCell scope="col">Role</Table.HeaderCell>
        <Table.HeaderCell scope="col">Status</Table.HeaderCell>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {rows.map((r) => (
        <Table.Row key={r.name}>
          <Table.Cell>{r.name}</Table.Cell>
          <Table.Cell>{r.role}</Table.Cell>
          <Table.Cell>{r.status}</Table.Cell>
        </Table.Row>
      ))}
    </Table.Body>
  </>
)

export const Compact: Story = {
  render: () => (
    <Table density="compact">
      <Rows />
    </Table>
  ),
}

export const Striped: Story = {
  render: () => (
    <Table striped>
      <Rows />
    </Table>
  ),
}

export const Hoverable: Story = {
  render: () => (
    <Table hoverable>
      <Rows />
    </Table>
  ),
}

export const StripedHoverableCompact: Story = {
  render: () => (
    <Table density="compact" striped hoverable>
      <Rows />
    </Table>
  ),
}

export const Interactive: Story = {
  render: () => (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell scope="col">Name</Table.HeaderCell>
          <Table.HeaderCell scope="col">Role</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rows.map((r) => (
          <Table.Row key={r.name} data-interactive>
            <Table.Cell>{r.name}</Table.Cell>
            <Table.Cell>{r.role}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
}

/** Actions column: a hidden-label header plus a ⋯ menu per row, options with icons. */
export const WithActions: Story = {
  render: () => (
    <Table aria-label="Team members">
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell scope="col">Name</Table.HeaderCell>
          <Table.HeaderCell scope="col">Role</Table.HeaderCell>
          <Table.ActionsHeaderCell scope="col" />
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rows.map((r) => (
          <Table.Row key={r.name}>
            <Table.Cell>{r.name}</Table.Cell>
            <Table.Cell>{r.role}</Table.Cell>
            <Table.ActionsCell>
              <RowActions
                aria-label={`Actions for ${r.name}`}
                items={[
                  { label: 'Edit', icon: <PencilIcon />, onSelect: () => {} },
                  { label: 'Duplicate', icon: <CopyIcon />, onSelect: () => {} },
                  { label: 'Remove', icon: <TrashIcon />, onSelect: () => {} },
                ]}
              />
            </Table.ActionsCell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
}

/** `scroll` in a narrow box: Tab reaches the table because it overflows; arrow keys scroll it. */
export const KeyboardScroll: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <Table scroll aria-label="Stats by champion">
        <Table.Header>
          <Table.Row>
            {['Champion', 'Games', 'Win rate', 'KDA', 'CS / min', 'Dmg / min', 'Vision / min'].map(
              (h) => (
                <Table.HeaderCell key={h} scope="col">
                  {h}
                </Table.HeaderCell>
              ),
            )}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {[
            ['Ahri', '24', '62.5%', '4.12', '7.9', '812', '0.91'],
            ['Jinx', '17', '52.9%', '3.30', '8.6', '944', '0.62'],
            ['Lulu', '9', '44.4%', '2.71', '1.4', '301', '2.10'],
          ].map((r) => (
            <Table.Row key={r[0]}>
              {r.map((c, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional
                <Table.Cell key={i}>{c}</Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  ),
}
