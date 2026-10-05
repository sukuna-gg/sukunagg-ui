import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
// Consume the library from source so the explorer shares one module instance with the stories
// (matters for context components like Toast) and always reflects the current code.
import { Badge, Button, Card, Text, ToastProvider } from '../../../packages/ui/src/index'
import { Highlight } from './highlight'
import {
  type ComponentEntry,
  components,
  renderStory,
  type StoryEntry,
  sections,
  storySnippet,
} from './stories'

const GITHUB_URL = 'https://github.com/sukuna-gg/sukunagg-ui'
const NPM_URL = 'https://www.npmjs.com/package/@sukunagg/ui'
const OVERVIEW = 'overview'
const COUNT = components.length

/** Catches a single broken story so it can't take down the whole page. */
class StoryBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[showcase] story failed to render:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <Text as="p" tone="dim" size="sm">
          This example failed to render: {this.state.error.message}
        </Text>
      )
    }
    return this.props.children
  }
}

/** Hash-based route: `#button` → `button`; empty → the overview. SSR renders the overview. */
function useHashSlug() {
  const [slug, setSlug] = useState(OVERVIEW)
  useEffect(() => {
    const read = () => setSlug(window.location.hash.replace(/^#/, '') || OVERVIEW)
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])
  return slug
}

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sk-theme')
      if (saved === 'light' || saved === 'dark') setTheme(saved)
    } catch {}
  }, [])
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('sk-theme', theme)
    } catch {}
  }, [theme])
  return [theme, setTheme] as const
}

function Header({ theme, onToggle }: { theme: 'dark' | 'light'; onToggle: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-[color-mix(in_srgb,var(--sk-bg)_82%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a href={`#${OVERVIEW}`} className="flex items-center gap-2.5 no-underline">
          <Text as="span" font="display" size="lg" weight="black">
            sukuna<span className="text-accent">-ui</span>
          </Text>
          <Badge tone="accent" dot>
            showcase
          </Badge>
        </a>
        <div className="flex items-center gap-1">
          <Button as="a" href={GITHUB_URL} variant="ghost" size="sm">
            GitHub
          </Button>
          <Button as="a" href={NPM_URL} variant="ghost" size="sm">
            npm
          </Button>
          <Button variant="secondary" size="sm" onClick={onToggle}>
            {theme === 'dark' ? '☾ Dark' : '☀ Light'}
          </Button>
        </div>
      </div>
    </header>
  )
}

/** Rotates a quarter turn when its `<details>` (named group `sec`) is open. */
function SectionChevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-3 shrink-0 transition-transform duration-fast ease-sukuna group-open/sec:rotate-90 motion-reduce:transition-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

/** Native disclosure toggle: works before hydration, keyboard + screen reader for free. */
const summaryClass =
  'flex cursor-pointer list-none items-center gap-1.5 rounded-md select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring [&::-webkit-details-marker]:hidden'

function Sidebar({ active }: { active: string }) {
  const navRef = useRef<HTMLElement>(null)
  // Opening a component inside a collapsed section re-opens that section, so the current item
  // is never hidden. Sections the person collapsed otherwise stay collapsed.
  useEffect(() => {
    navRef.current
      ?.querySelector(`a[href="#${active}"]`)
      ?.closest('details')
      ?.setAttribute('open', '')
  }, [active])
  const linkBase =
    'block rounded-md px-3 py-1.5 text-sm no-underline transition-colors duration-fast'
  const itemClass = (isActive: boolean) =>
    isActive
      ? `${linkBase} bg-well text-text font-medium`
      : `${linkBase} text-text-dim hover:bg-line-soft hover:text-text`
  return (
    <nav
      ref={navRef}
      aria-label="Components"
      className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-56 shrink-0 overflow-y-auto border-r border-line py-6 pr-4 md:block"
    >
      <a href={`#${OVERVIEW}`} className={itemClass(active === OVERVIEW)}>
        Overview
      </a>
      {sections.map((s) => (
        <details key={s.name} open className="group/sec mt-5">
          <summary
            className={`${summaryClass} px-3 py-1 text-xs font-semibold uppercase tracking-wider text-text-faint hover:text-text-dim`}
          >
            <SectionChevron />
            {s.name} · {s.components.length}
          </summary>
          <ul className="mt-1 list-none p-0">
            {s.components.map((c) => (
              <li key={c.slug}>
                <a href={`#${c.slug}`} className={itemClass(active === c.slug)}>
                  {c.name}
                </a>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </nav>
  )
}

function MobileNav({ active }: { active: string }) {
  return (
    <div className="border-b border-line px-4 py-3 md:hidden">
      <label htmlFor="sk-nav" className="sr-only">
        Jump to a component
      </label>
      <select
        id="sk-nav"
        value={active}
        onChange={(e) => {
          window.location.hash = e.target.value
        }}
        className="h-10 w-full rounded-md border border-line bg-surface-2 px-3 text-text"
      >
        <option value={OVERVIEW}>Overview</option>
        {sections.map((s) => (
          <optgroup key={s.name} label={s.name}>
            {s.components.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}

function Overview() {
  return (
    <div className="mx-auto max-w-[760px]">
      <Text as="p" size="xs" weight="semibold" tone="accent" tracking="eyebrow" className="mb-4">
        React · Tailwind v4 tokens · SSR / RSC-safe · WCAG AA
      </Text>
      <Text as="h1" font="display" size="3xl" weight="black" leading="tight" tracking="tight">
        Every sukuna-ui component, live — pick one on the left.
      </Text>
      <Text tone="dim" size="lg" className="mt-4">
        {COUNT} accessible components, each shown with the same examples as Storybook. Flip the
        theme in the header to see dark and light. Dark is the identity; light is a mode.
      </Text>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card elevation="raised" padding="lg">
          <Text as="h2" font="display" size="md" weight="bold" className="mb-2">
            Install
          </Text>
          <pre className="m-0 overflow-x-auto rounded-md bg-well p-3 text-sm text-text">
            <code>bun add @sukunagg/ui{'\n'}npm i @sukunagg/ui</code>
          </pre>
        </Card>
        <Card elevation="raised" padding="lg">
          <Text as="h2" font="display" size="md" weight="bold" className="mb-2">
            Built for AI agents
          </Text>
          <Text tone="dim" size="sm">
            Every component is documented in plain Markdown, served next to the site. Point your
            agent at{' '}
            <a href="/llms.txt" className="text-accent underline underline-offset-2">
              /llms.txt
            </a>{' '}
            or{' '}
            <a href="/llms-full.txt" className="text-accent underline underline-offset-2">
              /llms-full.txt
            </a>
            .
          </Text>
        </Card>
      </div>

      {sections.map((s) => (
        <details key={s.name} open className="group/sec mt-8">
          <summary className={`${summaryClass} mb-3 w-fit text-text-faint`}>
            <SectionChevron />
            <Text as="h2" size="xs" weight="semibold" tone="faint" tracking="eyebrow">
              {s.name} · {s.components.length}
            </Text>
          </summary>
          <div className="flex flex-wrap gap-2">
            {s.components.map((c) => (
              <a
                key={c.slug}
                href={`#${c.slug}`}
                className="group rounded-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <Badge
                  tone="neutral"
                  className="cursor-pointer transition-[color,background-color,border-color,transform] duration-fast ease-sukuna group-hover:-translate-y-0.5 group-hover:border-accent group-hover:bg-surface-2 group-hover:text-text"
                >
                  {c.name}
                </Badge>
              </a>
            ))}
          </div>
        </details>
      ))}
    </div>
  )
}

/**
 * One example: the live story, plus a "Show code" toggle revealing the import line and the
 * story's own JSX (lifted from the stories source, see `stories.tsx`). Closed on the server, so
 * the prerendered page stays lean; the toggle and Copy are plain client event handlers.
 */
function Example({ entry, item }: { entry: ComponentEntry; item: StoryEntry }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const codeId = useId()
  const snippet = storySnippet(item)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <section>
      <Text
        as="h2"
        font="display"
        size="md"
        weight="bold"
        className="mb-2"
        style={{ letterSpacing: 'var(--sk-tracking-tight)' }}
      >
        {item.name}
      </Text>
      <Card elevation="raised" padding="lg">
        <StoryBoundary>{renderStory(entry, item)}</StoryBoundary>
        {/* Footer strip inside the card: negative margins cancel the card's `p-8` so the rule and
            the code block run edge to edge; `rounded-b-lg` matches the card's own radius. */}
        <div className="-mx-8 -mb-8 mt-6 border-t border-line">
          <div className="flex items-center justify-between gap-2 px-3 py-1.5">
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={open}
              aria-controls={codeId}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? 'Hide code' : 'Show code'}
            </Button>
            {open ? (
              <Button variant="ghost" size="sm" onClick={copy} aria-live="polite">
                {copied ? 'Copied' : 'Copy'}
              </Button>
            ) : null}
          </div>
          {open ? (
            <pre
              id={codeId}
              className="m-0 overflow-x-auto rounded-b-lg border-t border-line bg-well p-4 text-sm leading-relaxed text-text"
            >
              <code>
                <Highlight code={snippet} />
              </code>
            </pre>
          ) : null}
        </div>
      </Card>
    </section>
  )
}

function ComponentDetail({ entry }: { entry: ComponentEntry }) {
  return (
    <div className="mx-auto max-w-[900px]">
      <Text as="h1" font="display" size="2xl" weight="black" tracking="tight">
        {entry.name}
      </Text>
      <Text tone="dim" size="sm" className="mt-1">
        {entry.stories.length} example{entry.stories.length === 1 ? '' : 's'} · same as Storybook ·
        each with its code and import
      </Text>

      <div className="mt-6 flex flex-col gap-6">
        {entry.stories.map((item) => (
          <Example key={item.key} entry={entry} item={item} />
        ))}
      </div>
    </div>
  )
}

export function App() {
  const [theme, setTheme] = useTheme()
  const slug = useHashSlug()
  const entry = slug === OVERVIEW ? null : components.find((c) => c.slug === slug)
  const active = entry?.slug ?? OVERVIEW

  return (
    <ToastProvider>
      <div className="min-h-screen">
        <Header theme={theme} onToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />
        <MobileNav active={active} />
        <div className="mx-auto flex max-w-[1240px] gap-8 px-4 sm:px-6">
          <Sidebar active={active} />
          <main className="min-w-0 flex-1 py-8">
            {entry ? <ComponentDetail entry={entry} /> : <Overview />}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
