import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from './index'

const meta = {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: { children: 'Badge' },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

const row = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } as const

export const Playground: Story = {}

export const Tones: Story = {
  render: (args) => (
    <div style={row}>
      {(['neutral', 'accent', 'success', 'premium'] as const).map((tone) => (
        <Badge key={tone} {...args} tone={tone}>
          {tone}
        </Badge>
      ))}
    </div>
  ),
}

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 12 }}>
      {(['soft', 'solid', 'outline'] as const).map((variant) => (
        <div key={variant} style={row}>
          {(['neutral', 'accent', 'success', 'premium'] as const).map((tone) => (
            <Badge key={tone} {...args} tone={tone} variant={variant}>
              {variant} {tone}
            </Badge>
          ))}
        </div>
      ))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={row}>
      <Badge {...args} size="sm">
        small
      </Badge>
      <Badge {...args} size="md">
        medium
      </Badge>
    </div>
  ),
}

export const WithDot: Story = {
  render: (args) => (
    <div style={row}>
      {(['neutral', 'accent', 'success', 'premium'] as const).map((tone) => (
        <Badge key={tone} {...args} tone={tone} dot>
          {tone}
        </Badge>
      ))}
    </div>
  ),
}

export const Live: Story = {
  args: { tone: 'accent', dot: true, children: 'LIVE' },
}

/** `pulse` animates the dot for a live state; it is still under reduced motion. */
export const LiveStatus: Story = {
  render: (args) => (
    <div style={row}>
      <Badge {...args} tone="success" dot pulse>
        In game · started 12 min ago
      </Badge>
      <Badge {...args} dot>
        Not in game
      </Badge>
      <Badge {...args} dot>
        Live status unavailable
      </Badge>
      <Badge {...args} dot aria-busy="true">
        Checking live status
      </Badge>
    </div>
  ),
}

export const InText: Story = {
  render: (args) => (
    <p style={{ color: 'var(--sk-text)', fontFamily: 'var(--sk-font-sans)' }}>
      Streaming now{' '}
      <Badge {...args} tone="accent" dot>
        LIVE
      </Badge>{' '}
      — join before it ends.
    </p>
  ),
}
