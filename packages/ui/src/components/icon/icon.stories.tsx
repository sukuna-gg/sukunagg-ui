import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../button'
import * as icons from './index'
import { InfoIcon } from './index'

const meta = {
  title: 'Components/Icon',
  component: InfoIcon,
  tags: ['autodocs'],
  args: { size: 24 },
} satisfies Meta<typeof InfoIcon>

export default meta
type Story = StoryObj<typeof meta>

const text = { color: 'var(--sk-text)', fontFamily: 'var(--sk-font-sans)' } as const

export const Playground: Story = {}

export const All: Story = {
  render: (args) => (
    <div
      style={{
        ...text,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: 8,
      }}
    >
      {Object.entries(icons).map(([name, Icon]) => (
        <div
          key={name}
          style={{
            display: 'grid',
            justifyItems: 'center',
            gap: 6,
            padding: 12,
            borderRadius: 12,
            background: 'var(--sk-surface-2)',
          }}
        >
          <Icon {...args} />
          <code style={{ fontSize: 11, color: 'var(--sk-text-faint)' }}>{name}</code>
        </div>
      ))}
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div style={{ ...text, display: 'flex', gap: 16, alignItems: 'center' }}>
      <InfoIcon size={14} />
      <InfoIcon size={18} />
      <InfoIcon size={24} />
      <InfoIcon size={32} strokeWidth={1.5} />
    </div>
  ),
}

/** Name the button; the icon stays decorative. */
export const InButton: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button iconOnly variant="ghost" aria-label="Show details">
        <icons.ChevronDownIcon />
      </Button>
      <Button iconOnly variant="secondary" aria-label="Switch to light theme">
        <icons.SunIcon />
      </Button>
      <Button variant="secondary" leadingIcon={<icons.RefreshIcon />}>
        Retry now
      </Button>
    </div>
  ),
}

/** Color comes from the text color. */
export const Colored: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      <icons.CheckIcon size={24} className="text-success" title="Done" />
      <icons.AlertIcon size={24} className="text-danger" title="Problem" />
      <icons.LockIcon size={24} className="text-premium" title="Premium" />
      <icons.ClockIcon size={24} className="text-text-faint" title="Not yet" />
    </div>
  ),
}
