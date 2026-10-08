import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../packages/*/src/**/*.mdx', '../packages/*/src/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  typescript: { reactDocgen: 'react-docgen-typescript' },
  core: { disableTelemetry: true },
  staticDirs: [
    // Media fixtures for VideoPlayer stories and browser tests (served at /video/*).
    './public',
    // The brand kit's Storybook logo (see brand/storybook) for the manager theme's brandImage.
    { from: '../brand/storybook', to: '/brand' },
  ],
  // Stories exercise the same Tailwind utilities a consumer's build generates.
  viteFinal: async (cfg) => {
    const { default: tailwindcss } = await import('@tailwindcss/vite')
    cfg.plugins = [...(cfg.plugins ?? []), tailwindcss()]
    // `@sukunagg/ui` re-exports the VideoPlayer from its workspace package (Q27): resolve it to
    // source so `bun run storybook` works without a prior build and there's one player copy.
    const src = (rel: string) =>
      fileURLToPath(new URL(`../packages/video/src/${rel}`, import.meta.url))
    cfg.resolve ??= {}
    cfg.resolve.alias = [
      ...(Array.isArray(cfg.resolve.alias)
        ? cfg.resolve.alias
        : Object.entries(cfg.resolve.alias ?? {}).map(([find, replacement]) => ({
            find,
            replacement,
          }))),
      { find: /^@sukunagg\/video\/hls$/, replacement: src('hls.ts') },
      { find: /^@sukunagg\/video$/, replacement: src('index.ts') },
      // `@sukunagg/charts` imports `@sukunagg/ui` (EmptyState, Skeleton, Table): resolve it to the
      // same source the ui stories use, so there's one copy and no prior build is needed.
      {
        find: /^@sukunagg\/ui$/,
        replacement: fileURLToPath(new URL('../packages/ui/src/index.ts', import.meta.url)),
      },
      // `@sukunagg/fx` by name (docs, examples) resolves to source too, like the tsconfig paths.
      {
        find: /^@sukunagg\/fx$/,
        replacement: fileURLToPath(new URL('../packages/fx/src/index.ts', import.meta.url)),
      },
    ]
    return cfg
  },
}

export default config
