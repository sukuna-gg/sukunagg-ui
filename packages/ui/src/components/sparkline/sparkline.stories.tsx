import type { Meta, StoryObj } from '@storybook/react-vite'
import { Sparkline } from './index'

const meta = {
  title: 'Charts/Sparkline',
  component: Sparkline,
  tags: ['autodocs'],
  args: {
    data: [1810, 1825, 1818, 1840, 1836, 1852, 1849, 1866, 1871, 1868, 1884, 1902],
    width: 120,
  },
} satisfies Meta<typeof Sparkline>

export default meta
type Story = StoryObj<typeof meta>

const text = {
  color: 'var(--sk-text-dim)',
  fontFamily: 'var(--sk-font-sans)',
  fontSize: 12,
} as const
const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  gap: 16,
} as const
const cell = { display: 'grid', gap: 6 } as const

export const Playground: Story = {}

export const Variants: Story = {
  render: (args) => (
    <div style={grid}>
      <div style={cell}>
        <Sparkline {...args} variant="line" />
        <span style={text}>line · rating trend</span>
      </div>
      <div style={cell}>
        <Sparkline
          {...args}
          variant="area"
          data={[3.1, 3.4, 3.3, 3.8, 4.1, 3.9, 4.4, 4.6, 4.5, 5, 5.3, 5.6]}
        />
        <span style={text}>area · daily active</span>
      </div>
      <div style={cell}>
        <Sparkline {...args} variant="bar" data={[4, 6, 3, 7, 5, 8, 6, 4, 9, 7, 5, 8]} />
        <span style={text}>bar · matches per day</span>
      </div>
      <div style={cell}>
        <Sparkline {...args} variant="winloss" data={[1, 1, -1, 1, -1, -1, 1, 1, 1, -1]} />
        <span style={text}>winloss · last 10</span>
      </div>
    </div>
  ),
}

/** `null` is a missing point: the line breaks instead of dropping to 0. */
export const WithGaps: Story = {
  args: { data: [1810, 1825, null, null, 1836, 1852, 1849, null, 1871, 1868, 1884, 1902] },
}

/** No numbers at all: "–" at the same height, "no data" for screen readers. */
export const Empty: Story = {
  render: (args) => (
    <div style={{ ...text, display: 'flex', gap: 24, alignItems: 'center' }}>
      <Sparkline {...args} data={[]} />
      <Sparkline {...args} data={[null, null]} emptyLabel="No games" />
      <Sparkline {...args} data={[42]} />
      <span>(the last one has a single point)</span>
    </div>
  ),
}

const squad = [
  {
    player: 'kairo',
    wl: [1, 1, -1, 1, 1, -1, 1, 1, 1, -1],
    mmr: [1820, 1842, 1830, 1856, 1871, 1862, 1880, 1902],
  },
  {
    player: 'nyx.exe',
    wl: [-1, 1, -1, 1, 1, -1, -1, 1, 1, 1],
    mmr: [1710, 1702, 1716, 1725, 1719, 1731, 1744, 1750],
  },
  { player: 'moss', wl: [1, -1, 1], mmr: [1640, 1652] },
  { player: 'petal', wl: [], mmr: [] },
]

export const InTable: Story = {
  render: () => (
    <table style={{ ...text, fontSize: 13, color: 'var(--sk-text)', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ color: 'var(--sk-text-faint)', textAlign: 'left' }}>
          <th style={{ padding: '0 12px 8px 0' }}>Player</th>
          <th style={{ padding: '0 12px 8px 0' }}>Last 10</th>
          <th style={{ padding: '0 12px 8px 0' }}>MMR trend</th>
        </tr>
      </thead>
      <tbody>
        {squad.map((r) => (
          <tr key={r.player}>
            <td style={{ padding: '6px 12px 6px 0' }}>{r.player}</td>
            <td style={{ padding: '6px 12px 6px 0' }}>
              <Sparkline
                variant="winloss"
                data={r.wl}
                width={80}
                height={20}
                emptyLabel="No games"
              />
            </td>
            <td style={{ padding: '6px 12px 6px 0' }}>
              <Sparkline data={r.mmr} width={72} height={20} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}

/** Apps pass their own palettes as CSS values. */
export const CustomColors: Story = {
  render: (args) => (
    <div style={grid}>
      <Sparkline
        {...args}
        variant="winloss"
        data={[1, -1, 1, 1, -1, 1]}
        winColor="var(--sk-chart-2)"
        lossColor="var(--sk-danger)"
      />
      <Sparkline {...args} variant="area" color="var(--sk-chart-3)" />
      <Sparkline {...args} color="var(--sk-premium)" />
    </div>
  ),
}

export const Widths: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
      <Sparkline {...args} width={48} />
      <Sparkline {...args} width={96} />
      <Sparkline {...args} width="100%" />
    </div>
  ),
}
