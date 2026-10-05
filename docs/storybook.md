# Storybook — development workshop for `@sukunagg/ui`

Storybook is the dev environment for this library. There is no demo app; every component is built, reviewed, and accessibility-checked in Storybook first.

## Version & framework

- `storybook@10` (verify latest 10.x at install time; do not use 8/9 docs).
- Framework: `@storybook/react-vite`. Vite is only a dev dependency; the published package is still built by tsup.
- Tailwind: `@tailwindcss/vite` plugin added in `viteFinal`; `preview.tsx` imports `packages/ui/src/styles/storybook.css` (`@import "tailwindcss"; @import "./theme.css";`). Stories therefore exercise the same utilities consumers will generate.
- Installed and run with Bun: `bunx storybook@latest init --builder vite --no-dev`, then `bun run storybook`.

## Files

```
.storybook/
├── main.ts          # framework, stories glob, addons, viteFinal
├── preview.tsx      # global decorators, theme toolbar, imports packages/ui/src/styles/index.css
├── manager.ts       # Sukuna-themed Storybook UI (dark, crimson accent)
└── theme.ts         # create({ base: 'dark', colorPrimary: '#FF3B4E', ... })
src/
├── components/<name>/<name>.stories.tsx
└── stories/
    ├── Tokens.mdx   # renders every --sk-* token in both themes
    └── Intro.mdx    # install, CSS import, theming, RSC notes (mirrors README)
```

## `main.ts`

```ts
import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.mdx', '../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  typescript: { reactDocgen: 'react-docgen-typescript' },
  viteFinal: async (cfg) => {
    const { default: tailwindcss } = await import('@tailwindcss/vite')
    cfg.plugins = [...(cfg.plugins ?? []), tailwindcss()]
    return cfg
  },
}
export default config
```

Addons (all first-party, verify names against the 10.x docs — several moved into core in 9/10):
- **a11y** — axe panel on every story for review while developing. Enforcement happens in `bun test` (`jest-axe`), not here.
- **docs** — autodocs from TS props. Every component gets `tags: ['autodocs']`.
- Controls, actions, backgrounds, viewport are in core; no extra install.

## `preview.tsx` — theme toolbar

The single most important piece: a global toolbar that flips `data-theme` on the story root so every story is reviewed in dark and light.

```tsx
import type { Preview, Decorator } from '@storybook/react-vite'
import React from 'react'
import '../packages/ui/src/styles/storybook.css'

const withTheme: Decorator = (Story, ctx) => {
  const theme = ctx.globals.theme ?? 'dark'
  return (
    <div data-theme={theme} style={{ background: 'var(--sk-bg)', color: 'var(--sk-text)', padding: 24, minHeight: '100vh' }}>
      <Story />
    </div>
  )
}

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Sukuna theme',
      toolbar: { icon: 'mirror', items: ['dark', 'light'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'dark' },
  parameters: {
    backgrounds: { disable: true },   // decorator owns the background
    layout: 'fullscreen',
  },
}
export default preview
```

Also add a `SideBySide` decorator (opt-in per story via `parameters.sideBySide: true`) that renders the story twice, dark and light, in one frame for review screenshots.

## Story conventions

- One `*.stories.tsx` per component, co-located. The title's first segment is the sidebar
  section, in this order (`storySort` in `.storybook/preview.tsx`; the showcase groups the same
  way): `Components/Button` for general components, `Charts/StatTile` for data visualization
  (StatTile, Sparkline, and `@sukunagg/charts` later), `Video/VideoPlayer` for the player. The
  section is part of the story id (`charts-stattile--hero`), so browser tests use it too.
- Required stories, in this order: `Playground` (all controls), then one per variant axis (`Variants`, `Sizes`), then each state (`Loading`, `Disabled`, ...). Names must match Section 10 of the component doc.
- Use CSF3 with `satisfies Meta<typeof Button>` and `type Story = StoryObj<typeof meta>`.
- Stories are fixtures, not tests. Keyboard-driven behavior is tested in `test/browser/` (`bun test` + Playwright) against these stories by id, so story ids are part of the contract and must not change without a changeset.
- No story may import from `dist/`. Always `src/`, so changes hot-reload.

## Scripts (`package.json`)

```json
{
  "storybook": "storybook dev -p 6006",
  "storybook:build": "storybook build -o storybook-static"
}
```

## CI

- `storybook:build` runs in CI; a broken story fails the build.
- `bun run test:browser` runs the Playwright suite against `storybook-static`.
- Deploy `storybook-static` to GitHub Pages on tag; it doubles as the public docs site until a real one exists.

## Done when

- `bun run storybook` opens with the theme toolbar working.
- `Tokens.mdx` shows every token swatch in both themes.
- `Button` stories render, autodocs shows typed props, a11y panel is clean.
