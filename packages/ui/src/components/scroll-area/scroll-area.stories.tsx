import type { Meta, StoryObj } from '@storybook/react-vite'
import { ScrollArea } from './index'

const meta = {
  title: 'Components/ScrollArea',
  component: ScrollArea,
  tags: ['autodocs'],
  args: { children: null },
} satisfies Meta<typeof ScrollArea>

export default meta
type Story = StoryObj<typeof meta>

const lines = Array.from({ length: 30 }, (_, i) => `Line ${i + 1}`)

export const Vertical: Story = {
  render: () => (
    <ScrollArea className="h-64 w-64 rounded-md border border-line">
      <div className="p-4 text-text">
        {lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
    </ScrollArea>
  ),
}

export const Horizontal: Story = {
  render: () => (
    <ScrollArea orientation="horizontal" className="w-80 rounded-md border border-line">
      <div className="flex gap-3 p-4">
        {lines.map((l) => (
          <div key={l} className="shrink-0 rounded-md bg-surface-2 px-6 py-8 text-text">
            {l}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
}

export const Both: Story = {
  render: () => (
    <ScrollArea orientation="both" className="h-64 w-80 rounded-md border border-line">
      <div className="w-[900px] p-4 text-text">
        {lines.map((l) => (
          <p key={l} className="whitespace-nowrap">
            {l} — a very long row that overflows horizontally as well as vertically.
          </p>
        ))}
      </div>
    </ScrollArea>
  ),
}

/** `tone="accent"`: the Sukuna crimson thumb (80% idle, solid on hover). */
export const Accent: Story = {
  args: { tone: 'accent' },
  render: (args) => (
    <ScrollArea {...args} className="h-64 w-64 rounded-md border border-line">
      <div className="p-4 text-text">
        {lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
    </ScrollArea>
  ),
}

/** Every tone side by side, scrolling both ways so both thumbs show. */
export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      {(['neutral', 'accent'] as const).map((tone) => (
        <div key={tone} className="space-y-2">
          <p className="text-sm text-text-dim">{tone}</p>
          <ScrollArea
            tone={tone}
            orientation="both"
            className="h-48 w-56 rounded-md border border-line"
          >
            <div className="w-[480px] p-4 text-text">
              {lines.map((l) => (
                <p key={l} className="whitespace-nowrap">
                  {l} — wide enough to scroll sideways too.
                </p>
              ))}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  ),
}

export const InACard: Story = {
  render: () => (
    <div className="w-72 rounded-lg border border-line bg-surface p-4 shadow-card">
      <h3 className="mb-2 font-display font-bold text-text">Changelog</h3>
      <ScrollArea className="h-40">
        <ul className="space-y-1 pr-3 text-sm text-text-dim">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  ),
}
