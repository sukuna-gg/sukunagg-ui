import type { Meta, StoryObj } from '@storybook/react-vite'
import { Kbd } from './index'

const meta = {
  title: 'Components/Kbd',
  component: Kbd,
  tags: ['autodocs'],
  args: { keys: 'mod+K' },
  argTypes: {
    platform: { control: 'inline-radio', options: ['auto', 'mac', 'other'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Kbd>

export default meta
type Story = StoryObj<typeof meta>

const row = { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' } as const
const label = { color: 'var(--sk-text-dim)', fontSize: 13, minWidth: 150 } as const

export const Playground: Story = {}

export const Chords: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      {['mod+K', 'shift+?', 'mod+shift+L', 'alt+up', 'ctrl+enter'].map((keys) => (
        <div key={keys} style={row}>
          <code style={label}>{keys}</code>
          <Kbd keys={keys} />
        </div>
      ))}
    </div>
  ),
}

/** Two keys pressed one after the other. */
export const Sequence: Story = {
  args: { keys: ['G', 'M'] },
}

export const SingleKey: Story = {
  render: () => (
    <div style={row}>
      <Kbd>Esc</Kbd>
      <Kbd>Tab</Kbd>
      <Kbd keys="space" />
      <Kbd keys="left" />
      <Kbd keys="right" />
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div style={row}>
      <Kbd keys="mod+K" size="sm" />
      <Kbd keys="mod+K" size="md" />
      <Kbd keys="mod+K" size="lg" />
    </div>
  ),
}

/** `platform` set from the server (e.g. the user-agent header): no swap after hydration. */
export const Platforms: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={row}>
        <span style={label}>platform="mac"</span>
        <Kbd keys="mod+shift+L" platform="mac" />
      </div>
      <div style={row}>
        <span style={label}>platform="other"</span>
        <Kbd keys="mod+shift+L" platform="other" />
      </div>
    </div>
  ),
}

export const InText: Story = {
  render: () => (
    <p style={{ color: 'var(--sk-text-dim)', fontSize: 14, maxWidth: 420 }}>
      Press <Kbd keys="mod+K" size="sm" /> to search players, or <Kbd keys={['G', 'M']} size="sm" />{' '}
      to jump to your matches.
    </p>
  ),
}

/** The VideoPlayer's shortcut list, drawn with Kbd. */
export const ShortcutList: Story = {
  render: () => (
    <dl style={{ display: 'grid', gap: 8, maxWidth: 280, margin: 0, fontSize: 13 }}>
      {(
        [
          ['Play / pause', 'space'],
          ['Back 5 seconds', 'left'],
          ['Forward 5 seconds', 'right'],
          ['Mute', 'M'],
          ['Captions', 'C'],
          ['Full screen', 'F'],
        ] as const
      ).map(([what, keys]) => (
        <div key={what} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <dt style={{ color: 'var(--sk-text-dim)' }}>{what}</dt>
          <dd style={{ margin: 0 }}>
            <Kbd keys={keys} size="sm" />
          </dd>
        </div>
      ))}
    </dl>
  ),
}
