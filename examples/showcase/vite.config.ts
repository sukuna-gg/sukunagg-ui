import { cpSync, createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// The explorer imports the library + its stories from source (../../../packages/ui/src) and
// builds Tailwind so every story utility renders (see src/styles.css). Storybook does the same.
const repoRoot = resolve(import.meta.dirname, '..', '..')

// VideoPlayer stories load media fixtures from `video/…`. Storybook serves them from
// .storybook/public (staticDirs); serve the same folder here instead of keeping a second copy.
const videoFixtures = resolve(repoRoot, '.storybook', 'public', 'video')
const MIME: Record<string, string> = {
  '.webm': 'video/webm',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.m4s': 'video/iso.segment',
  '.mp4': 'video/mp4',
  '.vtt': 'text/vtt',
  '.jpg': 'image/jpeg',
}
function storyMedia(): Plugin {
  return {
    name: 'sukuna-story-media',
    configureServer(server) {
      server.middlewares.use('/video', (req, res, next) => {
        const file = normalize(
          join(videoFixtures, decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/')),
        )
        if (!file.startsWith(videoFixtures) || !existsSync(file) || !statSync(file).isFile())
          return next()
        res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream')
        res.setHeader('Content-Length', statSync(file).size)
        createReadStream(file).pipe(res)
      })
    },
    closeBundle() {
      const out = resolve(import.meta.dirname, 'dist', 'video')
      if (existsSync(resolve(import.meta.dirname, 'dist')))
        cpSync(videoFixtures, out, { recursive: true })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), storyMedia()],
  resolve: {
    // sukuna-ui is `bun link`ed from the repo root, which has its own node_modules/react. Force a
    // single React copy so hooks/context inside the library see the same runtime as the app.
    dedupe: ['react', 'react-dom'],
    // The library source re-exports the VideoPlayer from its workspace package; resolve that to
    // source too, so the player's own stories and the library share one copy (one context).
    alias: [
      {
        find: /^@sukunagg\/video\/hls$/,
        replacement: resolve(repoRoot, 'packages/video/src/hls.ts'),
      },
      {
        find: /^@sukunagg\/video$/,
        replacement: resolve(repoRoot, 'packages/video/src/index.ts'),
      },
      // Chart stories import `@sukunagg/ui` through `@sukunagg/charts`: same source, one copy.
      { find: /^@sukunagg\/ui$/, replacement: resolve(repoRoot, 'packages/ui/src/index.ts') },
    ],
  },
  server: {
    // Allow importing the library source and stories, which live above this app's root.
    fs: { allow: [repoRoot] },
  },
  ssr: {
    // Prerender build (`vite build --ssr src/entry-server.tsx`): bundle every dependency —
    // including the linked library and its Base UI deps, which live in the root node_modules —
    // into one file that `scripts/prerender.ts` can import under Bun. React stays external: it
    // resolves from this app's node_modules at runtime (one copy, and Bun's parser rejects the
    // re-bundled react-dom/server output).
    noExternal: true,
    external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/server'],
  },
})
