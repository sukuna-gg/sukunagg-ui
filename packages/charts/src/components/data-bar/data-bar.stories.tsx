import type { Meta, StoryObj } from '@storybook/react-vite'
import { DataBar } from './index'

const meta = {
  title: 'Charts/DataBar',
  component: DataBar,
  tags: ['autodocs'],
  args: { value: 31240, max: 35880 },
} satisfies Meta<typeof DataBar>

export default meta
type Story = StoryObj<typeof meta>

// Sample data, for the stories only.
const players = [
  { champ: 'Ahri', player: 'kairo', kda: '8/2/11', damage: 31240 },
  { champ: 'Lee Sin', player: 'nyx.exe', kda: '5/4/14', damage: null },
  { champ: 'Jinx', player: 'moss', kda: '11/3/6', damage: 35880 },
  { champ: 'Ornn', player: 'vantablack', kda: '1/5/9', damage: 12610 },
  { champ: 'Lulu', player: 'petal', kda: '0/4/19', damage: 7930 },
]
const cell = { padding: '8px 12px 8px 0', borderBottom: '1px solid var(--sk-line-soft)' } as const
const head = { ...cell, color: 'var(--sk-text-faint)', fontSize: 12, textAlign: 'left' } as const

export const Playground: Story = {}

/** One shared scale (the lobby's top damage); Riot didn't report one player's damage. */
export const Scoreboard: Story = {
  render: () => {
    const max = Math.max(...players.map((p) => p.damage ?? 0))
    return (
      <table style={{ borderCollapse: 'collapse', color: 'var(--sk-text)', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={head}>Player</th>
            <th style={head}>KDA</th>
            <th style={head}>Damage</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.player}>
              <td style={cell}>
                {p.player} <span style={{ color: 'var(--sk-text-faint)' }}>· {p.champ}</span>
              </td>
              <td style={cell}>{p.kda}</td>
              <td style={cell}>
                <DataBar value={p.damage} max={max} color="var(--sk-chart-2)" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  },
}

export const MetaTable: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 200 }}>
      {[31.4, 24.9, 22.1, 9.3].map((rate) => (
        <DataBar key={rate} value={rate} max={31.4} format={(v) => `${v.toFixed(1)}%`} />
      ))}
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 200 }}>
      <DataBar value={62} max={100} size="sm" />
      <DataBar value={62} max={100} size="md" />
    </div>
  ),
}

/** Bar only: the root becomes the image, so it needs a name. */
export const BarOnly: Story = {
  args: { showValue: false, 'aria-label': 'Damage 31,240 of 35,880' },
}
