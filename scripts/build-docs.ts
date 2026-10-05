/**
 * Generate every agent/consumer documentation channel from the repo's source of truth.
 *
 * Run: `bun run docs:build` (also part of `bun run build`). Deterministic — no timestamps, stable
 * ordering — so re-running on unchanged inputs is byte-identical (`bun run docs:check` diffs it).
 *
 * Inputs (source of truth):
 *  - `docs/component-<name>.md`  the per-component spec every component must have (docs-first rule)
 *  - `src/index.ts`              the public export names per component directory (ui, plus the
 *                                add-on packages in `ADDON_PACKAGES`, e.g. `@sukunagg/charts`)
 *  - `package.json`              name / version / description
 *
 * Outputs:
 *  - `docs/llms/<name>.md`       consumer-facing page per component (Purpose, API, Variants,
 *                                States, Accessibility) with install/import lines
 *  - `llms.txt`                  llmstxt.org index (H1 → blockquote → H2 link lists)
 *  - `llms-full.txt`             everything in one file, for "paste one URL" agent context
 *  - `README.md`                 the component table between `<!-- components:start/end -->` and
 *                                the count between `<!-- count -->` / `<!-- /count -->`
 *  - `examples/showcase/public/` copies of llms.txt, llms-full.txt and llms/*.md for deployment
 *
 * Links point at the raw GitHub copies (`RAW_URL`) so they work before — and independently of —
 * the showcase deployment; the deployed showcase serves the same files at its own origin
 * (`/llms.txt`, `/llms-full.txt`, `/llms/<name>.md`).
 *
 * The package VERSION is deliberately NOT embedded in any output: the Changesets release commit
 * bumps `package.json` without running this script, so an embedded version drifts on every
 * release and fails `docs:check` (it did, on the 0.6.0 merge). The version is authoritative in
 * `package.json` / npm.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
/** The published `@sukunagg/ui` package inside the Bun workspace. */
const PKG = join(ROOT, 'packages/ui')
const REPO_URL = 'https://github.com/sukuna-gg/sukunagg-ui'
/** Raw file base — real Markdown over HTTP, live today, no deployment required. */
const RAW_URL = 'https://raw.githubusercontent.com/sukuna-gg/sukunagg-ui/main'

const pkg = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8')) as {
  name: string
  version: string
  description: string
}

// --- Inputs ---------------------------------------------------------------------------------

/**
 * Components that live in their own workspace package and are re-exported by `@sukunagg/ui`
 * (Q27): package name → component directory (the docs name) and its source path in the repo.
 */
const PACKAGE_COMPONENTS: Record<
  string,
  { name: string; source: string; css: string; readme: string; theme: string }
> = {
  '@sukunagg/video': {
    name: 'video-player',
    source: 'packages/video/src/components/video-player',
    css: 'video.css',
    readme: 'packages/video#readme',
    theme: '`--vp-*` variables',
  },
}

/**
 * Packages that ship their own components next to `@sukunagg/ui` (not re-exported by it), read
 * from their own `src/index.ts`. Their pages get that package's install/import/CSS lines.
 */
const ADDON_PACKAGES: Record<
  string,
  { dir: string; tailwind: string; plain: string; note: string }
> = {
  '@sukunagg/charts': {
    dir: 'packages/charts',
    tailwind: '@source "../node_modules/@sukunagg/charts/dist"',
    plain: 'import "@sukunagg/charts/styles.css"',
    note: 'peers on `@sukunagg/ui` for its `theme.css` tokens, EmptyState and Skeleton',
  },
}

/** Which add-on package a component directory belongs to, if any. */
const addonOf = (name: string): string | undefined =>
  Object.entries(ADDON_PACKAGES).find(([, a]) =>
    existsSync(join(ROOT, a.dir, 'src/components', name)),
  )?.[0]

/** Where a component's source lives in the repo (for the generated Source link). */
const sourcePath = (name: string): string => {
  const addon = addonOf(name)
  if (addon) return `${ADDON_PACKAGES[addon]?.dir}/src/components/${name}`
  return (
    Object.values(PACKAGE_COMPONENTS).find((p) => p.name === name)?.source ??
    `packages/ui/src/components/${name}`
  )
}

/**
 * `export { A, B } from './components/<dir>'` lines in src/index.ts (or from a re-exported
 * workspace package, see `PACKAGE_COMPONENTS`) → dir → export names.
 */
function readExportNames(): Map<string, string[]> {
  const src = readFileSync(join(PKG, 'src/index.ts'), 'utf8')
  const map = new Map<string, string[]>()
  const re = /^export \{([^}]+)\} from '(?:\.\/components\/([a-z0-9-]+)|(@sukunagg\/[a-z0-9-]+))'/gm
  for (const m of src.matchAll(re)) {
    const names = (m[1] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const dir = m[2] ?? PACKAGE_COMPONENTS[m[3] ?? '']?.name
    if (dir) map.set(dir, names)
  }
  for (const a of Object.values(ADDON_PACKAGES)) {
    const index = join(ROOT, a.dir, 'src/index.ts')
    if (!existsSync(index)) continue
    for (const m of readFileSync(index, 'utf8').matchAll(
      /^export \{([^}]+)\} from '\.\/components\/([a-z0-9-]+)'/gm,
    )) {
      const names = (m[1] ?? '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
      if (m[2]) map.set(m[2], names)
    }
  }
  // A re-exported package component that isn't found would silently drop out of every generated
  // doc (it happened once, after a package rename) — fail loudly instead.
  for (const [pkg, { name }] of Object.entries(PACKAGE_COMPONENTS))
    if (!map.has(name))
      throw new Error(`build-docs: no \`export { … } from '${pkg}'\` in src/index.ts`)
  return map
}

interface Section {
  num: number
  title: string
  body: string
}

interface ComponentDoc {
  /** kebab-case directory / doc name, e.g. `radio-group` */
  name: string
  /** display name from the doc H1, e.g. `RadioGroup` */
  display: string
  /** public export names, e.g. `['ToastProvider', 'useToast']` */
  exports: string[]
  /** npm package that exports it: `@sukunagg/ui` or an add-on such as `@sukunagg/charts` */
  pkgName: string
  /** first sentence of the Purpose section */
  summary: string
  sections: Section[]
}

/** Split a component spec into its `## N. Title` sections. */
function parseSections(md: string): Section[] {
  const lines = md.split('\n')
  const sections: Section[] = []
  let current: Section | null = null
  for (const line of lines) {
    const m = line.match(/^## (\d+)\. (.+)$/)
    if (m) {
      if (current) sections.push(current)
      current = { num: Number(m[1]), title: (m[2] ?? '').trim(), body: '' }
    } else if (current) {
      current.body += `${line}\n`
    }
  }
  if (current) sections.push(current)
  return sections.map((s) => ({ ...s, body: s.body.trim() }))
}

/**
 * First sentence of the Purpose section, markdown-stripped, as a one-line summary. Joins the
 * first paragraph (specs hard-wrap at 100 chars) so a sentence spanning lines isn't truncated.
 */
function firstSentence(body: string): string {
  const lines = body.split('\n').map((l) => l.trim())
  let i = 0
  const skip = (l: string) => l === '' || l.startsWith('>') || l.startsWith('#')
  while (i < lines.length && skip(lines[i] ?? '')) i++
  const para: string[] = []
  for (; i < lines.length && (lines[i] ?? '') !== ''; i++) para.push(lines[i] ?? '')
  const text = para.join(' ')
  if (!text) return ''
  const plain = text.replace(/[`*_]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  const end = plain.search(/\.\s|\.$/)
  return end === -1 ? plain : plain.slice(0, end + 1)
}

function readComponentDocs(): ComponentDoc[] {
  const exportsByDir = readExportNames()
  const docsDir = join(ROOT, 'docs')
  const docs: ComponentDoc[] = []
  for (const file of readdirSync(docsDir).sort()) {
    const m = file.match(/^component-([a-z0-9-]+)\.md$/)
    if (!m) continue
    const name = m[1] ?? ''
    const exports = exportsByDir.get(name)
    // Docs-first: a spec may exist before its code. Skip specs with no matching export in
    // src/index.ts so generated docs (README table, llms.txt) never advertise an unshipped
    // component. The spec still lives in docs/ and gets picked up once the code is exported.
    if (!exports) continue
    const md = readFileSync(join(docsDir, file), 'utf8')
    const h1 = md.match(/^# Component: (.+)$/m)
    const display = (h1?.[1] ?? name).trim()
    const sections = parseSections(md)
    const purpose = sections.find((s) => s.num === 1)
    docs.push({
      name,
      display,
      exports,
      pkgName: addonOf(name) ?? pkg.name,
      summary: purpose ? firstSentence(purpose.body) : '',
      sections,
    })
  }
  return docs.sort((a, b) => a.name.localeCompare(b.name))
}

// --- Outputs ----------------------------------------------------------------------------------

const GENERATED = (from: string) =>
  `<!-- GENERATED by scripts/build-docs.ts from ${from} — do not edit by hand; run \`bun run docs:build\`. -->`

/** Consumer-facing section titles for the spec sections we keep (the rest are authoring-only). */
const KEEP: Record<number, string> = {
  1: 'Purpose',
  3: 'API',
  4: 'Variants & tokens',
  5: 'States',
  8: 'Accessibility',
}

/** For a component that is also its own package: how to use it without sukuna-ui. */
function standaloneLines(doc: ComponentDoc): string[] {
  const entry = Object.entries(PACKAGE_COMPONENTS).find(([, p]) => p.name === doc.name)
  if (!entry) return []
  const [own, p] = entry
  return [
    `- **Standalone:** \`bun add ${own}\` — \`import { ${doc.exports.join(', ')} } from '${own}'\` + \`import '${own}/${p.css}'\` (no Tailwind or sukuna-ui needed; themed by ${p.theme} — see ${REPO_URL}/tree/main/${p.readme})`,
  ]
}

function renderComponentPage(doc: ComponentDoc): string {
  const importLine = `import { ${doc.exports.join(', ')} } from '${doc.pkgName}'`
  const addon = ADDON_PACKAGES[doc.pkgName]
  const out: string[] = [
    GENERATED(`docs/component-${doc.name}.md`),
    `# ${doc.display} — ${doc.pkgName}`,
    '',
    `> ${doc.summary}`,
    '',
    addon
      ? `- **Package:** \`${doc.pkgName}\` — \`bun add ${doc.pkgName} ${pkg.name}\` (${addon.note})`
      : `- **Package:** \`${pkg.name}\` — \`bun add ${pkg.name}\` (or \`npm i ${pkg.name}\`)`,
    `- **Import:** \`${importLine}\``,
    addon
      ? `- **Styles:** with Tailwind v4 add \`${addon.tailwind}\` next to the ${pkg.name} setup; without Tailwind \`${addon.plain}\` after \`${pkg.name}/styles.css\` — see [Getting started](${RAW_URL}/llms.txt)`
      : `- **Styles:** \`@import "${pkg.name}/theme.css"\` (Tailwind v4) or \`import "${pkg.name}/styles.css"\` (no Tailwind) — see [Getting started](${RAW_URL}/llms.txt)`,
    ...standaloneLines(doc),
    `- **Source:** ${REPO_URL}/tree/main/${sourcePath(doc.name)} · **Spec:** ${REPO_URL}/blob/main/docs/component-${doc.name}.md`,
    '',
  ]
  for (const num of [1, 3, 4, 5, 8]) {
    const section = doc.sections.find((s) => s.num === num)
    if (!section?.body) continue
    out.push(`## ${KEEP[num]}`, '', section.body, '')
  }
  return `${out.join('\n').trimEnd()}\n`
}

const gettingStarted = [
  `${pkg.name} is a React 18/19 component library: ${docsCountPlaceholder()} components, SSR- and React Server Components-safe, WCAG AA contrast in both themes, dark-first with a light mode, styled with Tailwind v4 design tokens (\`--sk-*\`) on top of Base UI. Zero runtime styling.`,
  '',
  'Install: `bun add @sukunagg/ui` (or `npm i @sukunagg/ui`). Then pick one CSS path:',
  '',
  '- **Tailwind v4 (primary):** in your global CSS add `@import "tailwindcss"; @import "@sukunagg/ui/theme.css"; @source "../node_modules/@sukunagg/ui/dist";`',
  '- **No Tailwind:** `import "@sukunagg/ui/styles.css"` once.',
  '',
  'Set the theme with `data-theme="dark"` (default/brand) or `"light"` on `<html>`. Every component below links to a Markdown page with its full API, variants, states and accessibility notes. Static components (Text, Badge, Card, Table…) work in Server Components; interactive ones are `\'use client\'`.',
].join('\n')

function docsCountPlaceholder(): string {
  // Replaced after docs are read; kept as a function so the paragraph reads naturally.
  return '{COUNT}'
}

function renderLlmsTxt(docs: ComponentDoc[]): string {
  const lines: string[] = [
    `# ${pkg.name}`,
    '',
    `> ${pkg.description}`,
    '',
    gettingStarted.replace('{COUNT}', String(docs.length)),
    '',
    '## Getting started',
    '',
    `- [README](${REPO_URL}#readme): install, setup (Tailwind or precompiled CSS), theming, RSC notes, performance guidance`,
    `- [Full docs in one file](${RAW_URL}/llms-full.txt): every component page concatenated — paste this URL into your agent for complete context`,
    '',
    '## Components',
    '',
    ...docs
      .filter((d) => d.pkgName === pkg.name)
      .map((d) => `- [${d.display}](${RAW_URL}/docs/llms/${d.name}.md): ${d.summary}`),
    '',
    ...Object.entries(ADDON_PACKAGES).flatMap(([name, a]) => {
      const own = docs.filter((d) => d.pkgName === name)
      return own.length
        ? [
            `## ${name}`,
            '',
            `Install \`bun add ${name}\` (${a.note}). Tailwind apps add \`${a.tailwind}\`; others \`${a.plain}\`.`,
            '',
            ...own.map((d) => `- [${d.display}](${RAW_URL}/docs/llms/${d.name}.md): ${d.summary}`),
            '',
          ]
        : []
    }),
    '## Theming',
    '',
    `- [Design tokens](${REPO_URL}/blob/main/docs/tokens.md): every \`--sk-*\` token with dark and light values and the AA contrast floor`,
    `- [Styling engine](${REPO_URL}/blob/main/docs/styling.md): Tailwind v4 + tailwind-variants, how utilities map to tokens, overriding`,
    '',
    '## Optional',
    '',
    `- [Known issues & audit](${REPO_URL}/blob/main/docs/known-issues-and-audit.md): ecosystem lessons and the library's own a11y/perf audit`,
    `- [Improvement backlog](${REPO_URL}/blob/main/docs/improvements.md)`,
    `- [Source repository](${REPO_URL})`,
    `- [npm](https://www.npmjs.com/package/${pkg.name})`,
  ]
  return `${lines.join('\n')}\n`
}

function renderLlmsFull(docs: ComponentDoc[], pages: Map<string, string>): string {
  const tokens = readFileSync(join(ROOT, 'docs/tokens.md'), 'utf8').trim()
  const parts: string[] = [
    `# ${pkg.name} — full documentation`,
    '',
    `> ${pkg.description} This file concatenates every component page plus the design-token reference; the index is at ${RAW_URL}/llms.txt.`,
    '',
    gettingStarted.replace('{COUNT}', String(docs.length)),
    '',
    '## Components',
    '',
    ...docs.map(
      (d) => `- ${d.display}${d.pkgName === pkg.name ? '' : ` (${d.pkgName})`}: ${d.summary}`,
    ),
    '',
  ]
  for (const doc of docs) {
    const page = pages.get(doc.name) ?? ''
    // Drop the per-file GENERATED marker line inside the concatenation.
    parts.push('---', '', page.replace(/^<!--[^\n]*-->\n/, '').trimEnd(), '')
  }
  parts.push('---', '', '# Design tokens', '', tokens, '')
  return `${parts.join('\n').trimEnd()}\n`
}

function updateReadme(docs: ComponentDoc[]): void {
  const path = join(ROOT, 'README.md')
  let readme = readFileSync(path, 'utf8')
  const table = [
    '| Component | What it is for | Docs |',
    '|---|---|---|',
    ...docs.map(
      (d) =>
        `| \`${d.exports.join('`, `')}\`${d.pkgName === pkg.name ? '' : ` · ${d.pkgName}`} | ${d.summary} | [docs/llms/${d.name}.md](docs/llms/${d.name}.md) |`,
    ),
  ].join('\n')

  const replaceBetween = (text: string, start: string, end: string, inner: string): string => {
    const a = text.indexOf(start)
    const b = text.indexOf(end)
    if (a === -1 || b === -1 || b < a) {
      throw new Error(`README.md is missing the ${start} … ${end} markers`)
    }
    return `${text.slice(0, a + start.length)}\n${inner}\n${text.slice(b)}`
  }
  readme = replaceBetween(readme, '<!-- components:start -->', '<!-- components:end -->', table)
  readme = readme.replace(
    /<!-- count -->\d*<!-- \/count -->/g,
    `<!-- count -->${docs.length}<!-- /count -->`,
  )
  writeFileSync(path, readme)
  // npm publishes the README that sits next to the package's package.json (gitignored copy).
  writeFileSync(join(PKG, 'README.md'), readme)
}

// --- Run ----------------------------------------------------------------------------------------

const docs = readComponentDocs()
if (docs.length === 0) throw new Error('no docs/component-*.md found')

const llmsDir = join(ROOT, 'docs/llms')
mkdirSync(llmsDir, { recursive: true })
const pages = new Map<string, string>()
for (const doc of docs) {
  const page = renderComponentPage(doc)
  pages.set(doc.name, page)
  writeFileSync(join(llmsDir, `${doc.name}.md`), page)
}

const llmsTxt = renderLlmsTxt(docs)
const llmsFull = renderLlmsFull(docs, pages)
writeFileSync(join(ROOT, 'llms.txt'), llmsTxt)
writeFileSync(join(ROOT, 'llms-full.txt'), llmsFull)
updateReadme(docs)

// Copies for the deployed showcase (served at /llms.txt, /llms-full.txt, /llms/<name>.md).
const publicDir = join(ROOT, 'examples/showcase/public')
if (existsSync(join(ROOT, 'examples/showcase'))) {
  mkdirSync(join(publicDir, 'llms'), { recursive: true })
  writeFileSync(join(publicDir, 'llms.txt'), llmsTxt)
  writeFileSync(join(publicDir, 'llms-full.txt'), llmsFull)
  for (const [name, page] of pages) writeFileSync(join(publicDir, 'llms', `${name}.md`), page)
}

console.log(
  `docs:build — ${docs.length} components → docs/llms/*.md, llms.txt (${llmsTxt.length} B), llms-full.txt (${llmsFull.length} B), README table, showcase public/`,
)
