import { defineConfig } from 'tsup'

// Zero-runtime library build. React is never bundled (peer dep).
//
// `bundle: false` transpiles each source file to its own output, mirroring `src/`. This is what
// makes RSC support work: a client component's `'use client'` must sit at the top of ITS OWN
// output file, not be merged into a shared barrel (which would wrongly force every consumer
// client-side). It also gives natural tree-shaking — importing `{ Button }` reaches only button
// files, never Dialog (Phase 7).
//
// esbuild strips top-level directives, so `scripts/fix-directives.ts` re-adds `'use client'` to the
// exact outputs whose source declared it (run right after tsup, see the `build` script). We tried
// esbuild-plugin-preserve-directives; it does not preserve them in this tsup/esbuild version.
export default defineConfig({
  entry: ['src/**/*.{ts,tsx}', '!src/**/*.test.*', '!src/**/*.stories.*', '!src/stories/**'],
  format: ['esm', 'cjs'],
  dts: true,
  bundle: false,
  sourcemap: true,
  clean: true,
  tsconfig: 'tsconfig.build.json',
})
