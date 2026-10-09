import type { Decorator, Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../button'
import { RetroGrid } from './index'

// Storybook loads no web fonts, and the hero copy below is set in Archivo on its `wdth` axis
// (`font-stretch-expanded`), as in the approved prototype. React 19 hoists (and dedupes) this
// stylesheet into <head>. Story chrome only: the component itself uses no font.
const withDisplayFont: Decorator = (Story) => (
  <>
    <link
      rel="stylesheet"
      precedence="default"
      href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap"
    />
    <Story />
  </>
)

const meta = {
  title: 'Components/RetroGrid',
  component: RetroGrid,
  tags: ['autodocs'],
  decorators: [withDisplayFont],
  args: { speed: 'normal' },
  argTypes: { speed: { control: 'inline-radio', options: ['slow', 'normal', 'fast'] } },
} satisfies Meta<typeof RetroGrid>

export default meta
type Story = StoryObj<typeof meta>

/** The approved hero copy (story chrome): eyebrow, display title and date line. */
function ArenaCopy() {
  return (
    <>
      <p className="m-0 flex items-center gap-3 text-[11px] font-semibold uppercase leading-none tracking-eyebrow text-accent tabular-nums before:h-px before:w-8 before:bg-linear-to-r before:from-transparent before:to-current after:h-px after:w-8 after:bg-linear-to-l after:from-transparent after:to-current @max-[560px]:gap-2 @max-[560px]:text-[10px] @max-[560px]:before:w-[18px] @max-[560px]:after:w-[18px]">
        Sukuna Invitational
      </p>
      <h1 className="m-0 mt-3 mb-3.5 bg-linear-to-b from-text from-38% to-premium bg-clip-text px-[.04em] font-display text-[clamp(50px,16cqi,116px)] font-black uppercase leading-[.84] tracking-[-.01em] font-stretch-expanded text-transparent drop-shadow-[0_4px_26px_color-mix(in_srgb,var(--sk-accent-glow)_50%,transparent)] in-data-[theme=light]:to-[color-mix(in_oklab,var(--sk-accent-deep)_75%,var(--sk-text))]">
        Arena
      </h1>
      <p className="m-0 text-md font-medium leading-tight tracking-[.04em] text-text/70 tabular-nums @max-[560px]:text-[13px]">
        Oct 24–27 · Seoul
      </p>
    </>
  )
}

export const Playground: Story = {
  render: (args) => (
    <RetroGrid {...args} className="min-h-[380px] rounded-lg shadow-card">
      <ArenaCopy />
    </RetroGrid>
  ),
}

export const LandingHero: Story = {
  render: (args) => (
    <div className="overflow-hidden rounded-lg border border-line bg-bg shadow-card">
      <header className="flex items-center justify-between gap-4 border-b border-line-soft px-6 py-3">
        <span className="font-display text-lg font-black uppercase tracking-tight font-stretch-expanded">
          Sukuna<span className="text-accent">.gg</span>
        </span>
        <nav aria-label="Event" className="hidden sm:block">
          <ul className="m-0 flex list-none gap-6 p-0 text-sm">
            {['Schedule', 'Teams', 'Watch live'].map((item) => (
              <li key={item}>
                <a
                  href={`#${item.toLowerCase().replace(' ', '-')}`}
                  className="rounded-sm text-text-dim no-underline transition-colors duration-fast ease-sukuna hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring motion-reduce:transition-none"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <Button size="sm" variant="secondary">
          Sign in
        </Button>
      </header>
      <RetroGrid {...args} className="min-h-[480px]">
        <ArenaCopy />
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button>Register your team</Button>
          <Button variant="secondary">Watch the trailer</Button>
        </div>
      </RetroGrid>
    </div>
  ),
}

/** A full-viewport hero: the floor reaches both sides of the frame at any width and height. */
export const FullViewport: Story = {
  render: (args) => (
    // An app would write `min-h-svh`; the Storybook frame pads 24px on every side.
    <RetroGrid {...args} className="min-h-[calc(100svh-48px)]">
      <ArenaCopy />
    </RetroGrid>
  ),
}

export const Speeds: Story = {
  render: () => (
    <div className="grid gap-4 md:grid-cols-3">
      {(['slow', 'normal', 'fast'] as const).map((speed) => (
        <RetroGrid key={speed} speed={speed} className="min-h-64 rounded-lg">
          <p className="m-0 text-xs font-semibold uppercase tracking-eyebrow text-text-dim">
            {speed}
          </p>
        </RetroGrid>
      ))}
    </div>
  ),
}

export const Phone: Story = {
  render: (args) => (
    <div className="w-[360px] max-w-full">
      <RetroGrid {...args} className="min-h-[380px] rounded-lg shadow-card">
        <ArenaCopy />
      </RetroGrid>
    </div>
  ),
}

export const Backdrop: Story = {
  render: (args) => <RetroGrid {...args} className="min-h-72 rounded-lg" />,
}

export const Themes: Story = {
  parameters: { sideBySide: true },
  render: (args) => (
    <RetroGrid {...args} className="min-h-[380px] rounded-lg shadow-card">
      <ArenaCopy />
    </RetroGrid>
  ),
}
