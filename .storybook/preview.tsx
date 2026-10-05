import type { Decorator, Preview } from '@storybook/react-vite'
import type { ReactNode } from 'react'
import '../packages/ui/src/styles/storybook.css'
// The VideoPlayer's own stylesheet (prefixed `vp:` utilities + `--vp-*` theme), from source.
import '../packages/video/src/styles/video.css'

type ThemeName = 'dark' | 'light'

const frame = (theme: ThemeName, children: ReactNode) => (
  <div
    data-theme={theme}
    style={{
      background: 'var(--sk-bg)',
      color: 'var(--sk-text)',
      fontFamily: 'var(--sk-font-sans)',
      padding: 24,
      minHeight: '100vh',
    }}
  >
    {children}
  </div>
)

// Flips `data-theme` on the story root from the toolbar so every story is
// reviewed in dark and light.
const withTheme: Decorator = (Story, ctx) => {
  if (ctx.parameters.sideBySide) return <Story /> // withSideBySide owns the frames
  const theme = (ctx.globals.theme as ThemeName) ?? 'dark'
  return frame(theme, <Story />)
}

// Opt-in via `parameters: { sideBySide: true }` — renders dark and light at once
// for review screenshots.
const withSideBySide: Decorator = (Story, ctx) => {
  if (!ctx.parameters.sideBySide) return <Story />
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {frame('dark', <Story />)}
      {frame('light', <Story />)}
    </div>
  )
}

const preview: Preview = {
  decorators: [withSideBySide, withTheme],
  globalTypes: {
    theme: {
      description: 'Sukuna theme',
      toolbar: { icon: 'mirror', items: ['dark', 'light'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'dark' },
  parameters: {
    backgrounds: { disable: true }, // the decorator owns the background
    layout: 'fullscreen',
    // Sidebar sections: general components, then data viz, then the standalone video player.
    options: { storySort: { order: ['Design', 'Components', 'Charts', 'Video'] } },
  },
}

export default preview
