/**
 * Build `dist/styles.css` (`bun run css:build`, part of `bun run build`): the chart utilities
 * precompiled with the Tailwind CLI for apps that don't run Tailwind. See src/styles/fallback.css.
 */
import { $ } from 'bun'

const root = new URL('..', import.meta.url)
const p = (rel: string) => new URL(rel, root).pathname.replace(/^\/([A-Za-z]:)/, '$1')

await $`bun x @tailwindcss/cli -i ${p('src/styles/fallback.css')} -o ${p('dist/styles.css')} --minify`

console.log('dist/styles.css written')
