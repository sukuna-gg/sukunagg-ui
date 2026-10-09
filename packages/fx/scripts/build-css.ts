/**
 * Build the two published stylesheets (`bun run css:build`, part of `bun run build`; runs after
 * tsup, whose `clean: true` wipes `dist/`):
 *
 * - `dist/theme.css` — `src/styles/theme.css` with each `@import "./<component>.css";` line replaced
 *   by that file's contents, so Tailwind apps `@import "@sukunagg/fx/theme.css"` as one flat file
 *   (the effects' `@property`, `@keyframes` and `@utility` blocks). The leading `/* … *\/` header of
 *   every source file is authoring notes, so it is dropped (comments inside the CSS stay).
 *   Deterministic: same input → same bytes.
 * - `dist/styles.css` — `src/styles/fallback.css` precompiled with the Tailwind CLI for apps that
 *   don't run Tailwind (it pulls in the same theme.css, so @utility/@keyframes compile in).
 */
import { $ } from 'bun'

const root = new URL('..', import.meta.url)
const p = (rel: string) => new URL(rel, root).pathname.replace(/^\/([A-Za-z]:)/, '$1')

const IMPORT = /^@import "\.\/([a-z0-9-]+\.css)";\s*$/
const HEADER = /^\s*\/\*[\s\S]*?\*\/\s*/
const BANNER = [
  '/*',
  ' * @sukunagg/fx theme.css: the effects’ @property, @keyframes and @utility rules (Q39).',
  ' * Tailwind v4 apps: @import "@sukunagg/fx/theme.css" after "@sukunagg/ui/theme.css".',
  ' * GENERATED from packages/fx/src/styles by scripts/build-css.ts — do not edit.',
  ' */',
]

const read = async (file: string) =>
  (await Bun.file(p(`src/styles/${file}`)).text()).replace(HEADER, '').trimEnd()

const lines = [...BANNER]
for (const line of (await read('theme.css')).split(/\r?\n/)) {
  const file = IMPORT.exec(line)?.[1]
  if (!file) lines.push(line)
  else {
    const css = await read(file)
    if (css) lines.push(`/* ${file.replace(/\.css$/, '')} */`, css)
  }
}
await Bun.write(p('dist/theme.css'), `${lines.join('\n').trimEnd()}\n`)
console.log('dist/theme.css written')

await $`bun x @tailwindcss/cli -i ${p('src/styles/fallback.css')} -o ${p('dist/styles.css')} --minify`
console.log('dist/styles.css written')
