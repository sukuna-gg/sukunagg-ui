/**
 * Story registry for the explorer.
 *
 * Reads every `src/components/<name>/<name>.stories.tsx` at build time via `import.meta.glob` and
 * turns each CSF module into a { component → stories } entry the sidebar and detail view render.
 * Because we consume the stories (and the library) from source, the explorer always matches
 * Storybook — a new story shows up here automatically, no manual step.
 *
 * Each story also carries copy-pasteable `code`, lifted from the stories *source* (a second
 * `?raw` glob) rather than reconstructed from runtime values: the story's own JSX with `{...args}`
 * inlined as the literal props written in `args: { … }` (so `items={items}` stays `items={items}`),
 * any helper `const`/`function` the snippet references included above it, and the
 * `import { … } from '@sukunagg/ui'` line derived from the package's real exports (`src/index.ts`).
 */
import { type ComponentType, isValidElement, type ReactNode } from 'react'

/** The runtime shape of a CSF `default` export (Storybook `Meta`). Types from SB are erased. */
interface Meta {
  title?: string
  component?: ComponentType<Record<string, unknown>>
  args?: Record<string, unknown>
}

/** The runtime shape of a named CSF export (Storybook `StoryObj`). */
interface Story {
  render?: (args: Record<string, unknown>, ctx: unknown) => ReactNode
  args?: Record<string, unknown>
}

export interface StoryEntry {
  /** Export identifier, e.g. `WithDisabled`. */
  key: string
  /** Human label, e.g. `With Disabled`. */
  name: string
  story: Story
  /** Copy-pasteable usage: the story's JSX (or a synthesized element) plus any helpers it uses. */
  code: string
  /** Names the snippet uses from `'sukuna-ui'`, for the import line. */
  imports: string[]
  /** React hooks the snippet uses (`useState`, …), for a second import line. */
  hooks: string[]
}

export interface ComponentEntry {
  /** Display name from `meta.title` (`Components/Button` → `Button`). */
  name: string
  /** URL hash slug, e.g. `button`. */
  slug: string
  /** Sidebar section from `meta.title`'s first segment (`Charts/StatTile` → `Charts`). */
  section: string
  meta: Meta
  stories: StoryEntry[]
}

/**
 * Sidebar sections in display order — the same order as Storybook's `storySort`. A title prefix
 * not listed here still shows, after these.
 */
const SECTIONS = ['Components', 'Charts', 'Video']

const sectionRank = (s: string) => {
  const i = SECTIONS.indexOf(s)
  return i === -1 ? SECTIONS.length : i
}

const modules = import.meta.glob('../../../packages/*/src/components/*/*.stories.tsx', {
  eager: true,
}) as Record<string, Record<string, unknown>>

const sources = import.meta.glob('../../../packages/*/src/components/*/*.stories.tsx', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const indexSources = import.meta.glob('../../../packages/ui/src/index.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

/** Every value export of the package: the `export { A, B } from …` lines in src/index.ts. */
const EXPORTS: string[] = Object.values(indexSources)
  .flatMap((src) => [...src.matchAll(/^export \{([^}]+)\} from/gm)])
  .flatMap((m) =>
    (m[1] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )

const prettify = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// --- Source lifting --------------------------------------------------------------------------

/** Source of a top-level `[export] const|let|function NAME …` declaration, up to the next one. */
function topLevel(raw: string, name: string): string | null {
  const m = new RegExp(`^(?:export )?(?:const|let|function) ${name}\\b`, 'm').exec(raw)
  if (!m) return null
  const rest = raw.slice(m.index)
  // The declaration ends where the next column-0 declaration or comment begins.
  const next = rest.slice(1).search(/^(?:export |const |let |function |\/\*\*|\/\/)/m)
  return (next === -1 ? rest : rest.slice(0, next + 1)).trim()
}

/** Names of every top-level declaration in a module (helpers, stories, `meta`). */
function topLevelNames(raw: string): string[] {
  return [...raw.matchAll(/^(?:export )?(?:const|let|function) ([A-Za-z_$][\w$]*)/gm)].map(
    (m) => m[1] ?? '',
  )
}

/** Inner text of a bracketed group that starts at `s[0]` (the brackets themselves are dropped). */
function balanced(s: string, open: string, close: string): string {
  let depth = 0
  let quote: string | null = null
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (quote) {
      if (ch === '\\') i++
      else if (ch === quote) quote = null
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch
    else if (ch === open) depth++
    else if (ch === close && --depth === 0) return s.slice(1, i)
  }
  return s.slice(1)
}

/** Splits the inside of an object/array literal on its top-level commas. */
function splitTopLevel(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  let quote: string | null = null
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (quote) {
      if (ch === '\\') i++
      else if (ch === quote) quote = null
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch
    else if (ch === '{' || ch === '[' || ch === '(') depth++
    else if (ch === '}' || ch === ']' || ch === ')') depth--
    else if (ch === ',' && depth === 0) {
      out.push(s.slice(start, i))
      start = i + 1
    }
  }
  out.push(s.slice(start))
  return out.map((p) => p.trim()).filter(Boolean)
}

/** The `{ … }` literal that follows `label` in `text` (e.g. `args:`), or null if not a literal. */
function objectAfter(text: string, label: string): string | null {
  const i = text.indexOf(label)
  if (i === -1) return null
  const brace = text.indexOf('{', i + label.length)
  if (brace === -1 || text.slice(i + label.length, brace).trim() !== '') return null
  return balanced(text.slice(brace), '{', '}')
}

function dedent(s: string): string {
  const lines = s.replace(/\r\n/g, '\n').split('\n')
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)?.[0].length ?? 0)
  const min = indents.length ? Math.min(...indents) : 0
  return lines
    .map((l) => l.slice(min))
    .join('\n')
    .trim()
}

/** One JSX prop: `value` is ready to print — `"str"`, `{expr}`, or `''` for a bare boolean. */
interface Prop {
  name: string
  value: string
}

/** `{ items, placeholder: 'Pick', loading: true, size: 'sm' }` → props as written in source. */
function propsFromLiteral(literal: string): Prop[] {
  return splitTopLevel(literal).flatMap((entry): Prop[] => {
    if (entry.startsWith('...')) return [{ name: entry, value: '' }]
    const m = /^(?:'([^']*)'|"([^"]*)"|([A-Za-z_$][\w$-]*))\s*(?::\s*([\s\S]*))?$/.exec(entry)
    if (!m) return []
    const name = m[1] ?? m[2] ?? m[3] ?? ''
    if (m[4] === undefined) return [{ name, value: `{${name}}` }] // shorthand
    const v = m[4].trim()
    if (v === 'true') return [{ name, value: '' }]
    const str = /^'((?:[^'\\]|\\.)*)'$/.exec(v) ?? /^"((?:[^"\\]|\\.)*)"$/.exec(v)
    if (str)
      return [{ name, value: `"${(str[1] ?? '').replace(/\\'/g, "'").replace(/"/g, '\\"')}"` }]
    return [{ name, value: `{${v}}` }]
  })
}

/** Fallback when a story has no `args: { … }` literal to read: print the runtime values. */
function propsFromRuntime(args: Record<string, unknown>): Prop[] {
  return Object.entries(args).flatMap(([name, v]): Prop[] => {
    if (v === undefined || isValidElement(v)) return []
    if (v === true) return [{ name, value: '' }]
    if (typeof v === 'string') return [{ name, value: JSON.stringify(v) }]
    if (typeof v === 'function') return [{ name, value: `{${v.name || 'handler'}}` }]
    try {
      return [{ name, value: `{${JSON.stringify(v)}}` }]
    } catch {
      return []
    }
  })
}

const renderProps = (props: Prop[]) =>
  props
    .map((p) => {
      if (p.name.startsWith('...')) return `{${p.name}}`
      return p.value === '' ? p.name : `${p.name}=${p.value}`
    })
    .join(' ')

/** Story args override meta args by name, like Storybook's merge. */
function mergeProps(base: Prop[], override: Prop[]): Prop[] {
  const names = new Set(override.map((p) => p.name))
  return [...base.filter((p) => !names.has(p.name)), ...override]
}

/** Replace `{…}` groups and quoted strings with spaces so attribute names can be read safely. */
function blank(s: string): string {
  let out = ''
  let depth = 0
  let quote: string | null = null
  for (const ch of s) {
    if (quote) {
      if (ch === quote) quote = null
      out += ' '
    } else if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch
      out += ' '
    } else if (ch === '{') {
      depth++
      out += ' '
    } else if (ch === '}') {
      depth--
      out += ' '
    } else out += depth > 0 ? ' ' : ch
  }
  return out
}

/** Inline every `{...args}` in `jsx` as literal props, skipping props the tag sets explicitly. */
function inlineArgs(jsx: string, props: Prop[]): string {
  let out = ''
  let rest = jsx
  for (;;) {
    const i = rest.indexOf('{...args}')
    if (i === -1) return out + rest
    const before = rest.slice(0, i)
    const after = rest.slice(i + '{...args}'.length)
    // The rest of this opening tag: up to the first `>` outside braces/strings.
    let depth = 0
    let quote: string | null = null
    let j = 0
    for (; j < after.length; j++) {
      const ch = after[j]
      if (quote) {
        if (ch === quote) quote = null
      } else if (ch === '"' || ch === "'" || ch === '`') quote = ch
      else if (ch === '{' || ch === '(') depth++
      else if (ch === '}' || ch === ')') depth--
      else if (ch === '>' && depth === 0) break
    }
    const tag = `${before.slice(before.lastIndexOf('<'))} ${after.slice(0, j)}`
    const attrs = blank(tag).replace(/^<[\w.]+/, '')
    const explicit = new Set(
      [...attrs.matchAll(/(?:^|\s)([A-Za-z_:][\w:.-]*)(?=\s*=|\s|$)/g)].map((m) => m[1] ?? ''),
    )
    const expansion = renderProps(props.filter((p) => !explicit.has(p.name)))
    out += before.replace(/\s+$/, '') + (expansion ? ` ${expansion}` : '')
    rest = after
  }
}

/** For an args-only story: `<Button variant="ghost">Label</Button>` from its props. */
function synthesize(name: string, props: Prop[]): string {
  const children = props.find((p) => p.name === 'children')
  const rest = renderProps(props.filter((p) => p.name !== 'children'))
  const open = `<${name}${rest ? ` ${rest}` : ''}`
  if (!children) return `${open} />`
  const inner = children.value.startsWith('"')
    ? children.value.slice(1, -1).replace(/\\"/g, '"')
    : children.value
  return `${open}>${inner}</${name}>`
}

/** What the story renders: the `render` body's JSX (args inlined), else a synthesized element. */
function usageOf(value: string | null, name: string, props: Prop[]): string {
  const r = value?.indexOf('render:') ?? -1
  const arrow = value && r !== -1 ? value.indexOf('=>', r) : -1
  if (!value || arrow === -1) return synthesize(name, props)
  const body = value.slice(arrow + 2).trim()
  let jsx: string
  if (body.startsWith('(')) jsx = balanced(body, '(', ')')
  else if (body.startsWith('{')) jsx = balanced(body, '{', '}')
  else jsx = body.slice(0, body.lastIndexOf('>') + 1)
  // Explicit JSX children win over `children` in args, as in Storybook.
  return dedent(
    inlineArgs(
      jsx,
      props.filter((p) => p.name !== 'children'),
    ),
  )
}

/** Prepend the helper `const`s/`function`s the snippet references (transitively, in file order). */
function withHelpers(raw: string, snippet: string, exclude: Set<string>): string {
  const candidates = topLevelNames(raw).filter((n) => !exclude.has(n) && n !== 'meta')
  const needed = new Set<string>()
  let text = snippet
  for (let pass = 0; pass < 3; pass++) {
    for (const n of candidates) {
      if (!needed.has(n) && new RegExp(`\\b${n}\\b`).test(text)) {
        needed.add(n)
        text += `\n${topLevel(raw, n) ?? ''}`
      }
    }
  }
  const helpers = candidates.filter((n) => needed.has(n)).map((n) => topLevel(raw, n) ?? '')
  return [...helpers, snippet].filter(Boolean).join('\n\n')
}

/** The package exports the snippet mentions (word-boundary match), for the import line. */
function importsOf(code: string, fallback: string): string[] {
  const used = EXPORTS.filter((n) => new RegExp(`\\b${n}\\b`).test(code))
  return (used.length ? used : [fallback]).sort((a, b) => a.localeCompare(b))
}

const hooksOf = (code: string) =>
  [...new Set(code.match(/\buse(?:State|Effect|Ref|Memo|Callback|Id|Reducer)\b/g) ?? [])].sort()

/**
 * The element name for a synthesized story. The story title is used when it is a real export;
 * runtime function names are a last resort (esbuild renames `forwardRef(function Badge…)` to
 * `Badge2` when the outer binding has the same name).
 */
function componentName(meta: Meta, title: string): string {
  if (EXPORTS.includes(title)) return title
  const c = meta.component as
    | (ComponentType<Record<string, unknown>> & {
        displayName?: string
        render?: { name?: string }
      })
    | undefined
  const runtime = c?.displayName ?? (typeof c === 'function' ? c.name : c?.render?.name) ?? title
  return runtime.replace(/\d+$/, '')
}

// --- Registry --------------------------------------------------------------------------------

export const components: ComponentEntry[] = Object.entries(modules)
  .map(([path, mod]): ComponentEntry => {
    const meta = (mod.default ?? {}) as Meta
    const name =
      meta.title?.split('/').pop()?.trim() ??
      // fallback: the folder name from the path
      path.split('/').at(-2) ??
      'Component'
    const raw = sources[path] ?? ''
    const storyKeys = new Set(Object.keys(mod))
    const metaLiteral = objectAfter(topLevel(raw, 'meta') ?? '', 'args:')
    const metaProps =
      metaLiteral === null ? propsFromRuntime(meta.args ?? {}) : propsFromLiteral(metaLiteral)
    const element = componentName(meta, name)
    const stories = Object.entries(mod)
      .filter(([key, value]) => key !== 'default' && value !== null && typeof value === 'object')
      .map(([key, value]): StoryEntry => {
        const story = value as Story
        const decl = topLevel(raw, key)
        const storyValue = decl ? decl.slice(decl.indexOf('=') + 1).trim() : null
        const storyLiteral = storyValue ? objectAfter(storyValue, 'args:') : null
        const storyProps =
          storyLiteral === null
            ? propsFromRuntime(story.args ?? {})
            : propsFromLiteral(storyLiteral)
        const usage = usageOf(storyValue, element, mergeProps(metaProps, storyProps))
        const code = withHelpers(raw, usage, storyKeys)
        return {
          key,
          name: prettify(key),
          story,
          code,
          imports: importsOf(code, name),
          hooks: hooksOf(code),
        }
      })
    const section = meta.title?.includes('/') ? (meta.title.split('/')[0]?.trim() ?? '') : ''
    return { name, slug: slugify(name), section: section || 'Components', meta, stories }
  })
  .filter((c) => c.stories.length > 0)
  .sort(
    (a, b) =>
      sectionRank(a.section) - sectionRank(b.section) ||
      a.section.localeCompare(b.section) ||
      a.name.localeCompare(b.name),
  )

/** Components grouped by section, in sidebar order. */
export const sections: { name: string; components: ComponentEntry[] }[] = [
  ...new Set(components.map((c) => c.section)),
].map((name) => ({ name, components: components.filter((c) => c.section === name) }))

/** Render one story the way Storybook would: merge meta+story args, prefer an explicit `render`. */
export function renderStory(entry: ComponentEntry, item: StoryEntry): ReactNode {
  const args = { ...(entry.meta.args ?? {}), ...(item.story.args ?? {}) }
  if (typeof item.story.render === 'function') {
    return item.story.render(args, { args, globals: {}, parameters: {} })
  }
  const Component = entry.meta.component
  return Component ? <Component {...args} /> : null
}

/** The full snippet shown in the explorer: import line(s) + usage. */
export function storySnippet(item: StoryEntry): string {
  const lines = [`import { ${item.imports.join(', ')} } from '@sukunagg/ui'`]
  if (item.hooks.length) lines.unshift(`import { ${item.hooks.join(', ')} } from 'react'`)
  return `${lines.join('\n')}\n\n${item.code}`
}
