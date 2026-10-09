import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { RankReveal } from './index'

const change = (
  <>
    Diamond III <span aria-hidden="true">→</span>
    <span className="sr-only">to</span> <strong>Master I</strong> · <em>+32 RR</em>
  </>
)

const root = (c: HTMLElement) => c.querySelector('[data-sk-rank-reveal]') as HTMLElement
const animated = (c: HTMLElement) =>
  Array.from(c.querySelectorAll<Element>('[class*="animate-rank-reveal-"]'))
const utility = (el: Element) =>
  Array.from(el.classList).find((c) => c.startsWith('animate-rank-reveal-'))

describe('RankReveal', () => {
  it('server-renders the real copy, a heading and the effect layer', () => {
    const html = renderServer(<RankReveal title="Master" division="I" description={change} />)
    expect(html).toContain('data-sk-rank-reveal=""')
    expect(html).toContain('<h2')
    expect(html).toContain('Rank up')
    expect(html).toContain('Master')
    expect(html).toContain('+32 RR')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('--sk-rank-reveal-i:9')
  })

  it('server-renders the title in the heading tag chosen by headingLevel', () => {
    for (const level of ['h3', 'h4'] as const) {
      const html = renderServer(<RankReveal title="Master" headingLevel={level} />)
      expect(html).toContain(`<${level} class=`)
      expect(html).not.toContain('<h2')
    }
    // 'p': no heading at all — the eyebrow and the title are both paragraphs.
    const html = renderServer(<RankReveal title="Master" headingLevel="p" />)
    expect(html).not.toMatch(/<h[1-6]/)
    expect(html.match(/<p class=/g)).toHaveLength(2)
  })

  it('renders the title (with its division) at the chosen heading level', () => {
    const { rerender, container } = render(<RankReveal title="Master" division="I" />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Master I')
    rerender(<RankReveal title="Master" headingLevel="h3" />)
    expect(screen.getByRole('heading', { level: 3, name: 'Master' })).toBeTruthy()
    rerender(<RankReveal title="Master" headingLevel="h4" />)
    expect(screen.getByRole('heading', { level: 4 })).toBeTruthy()
    rerender(<RankReveal title="Master" headingLevel="p" />)
    expect(screen.queryByRole('heading')).toBeNull()
    expect(container.querySelector('p')?.textContent).toBe('Rank up')
  })

  it('colors the division in the tone color', () => {
    render(<RankReveal title="Master" division="I" />)
    const division = screen.getByText('I')
    expect(division.className).toContain('text-(--sk-rank-reveal-hue)')
  })

  it('renders nothing for parts that are not passed', () => {
    const { container, rerender } = render(<RankReveal title="Radiant" />)
    expect(screen.getByText('Rank up')).toBeTruthy()
    expect(container.querySelectorAll('p')).toHaveLength(1)
    expect(screen.getByRole('heading').textContent).toBe('Radiant')
    rerender(<RankReveal title="Radiant" eyebrow={null} />)
    expect(screen.queryByText('Rank up')).toBeNull()
    expect(container.querySelectorAll('p')).toHaveLength(0)
    rerender(<RankReveal title="Radiant" eyebrow="Promoted" description="Top 500" />)
    expect(screen.getByText('Promoted')).toBeTruthy()
    expect(screen.getByText('Top 500')).toBeTruthy()
  })

  it('maps tone to the captured color variables (accent by default)', () => {
    const { container, rerender } = render(<RankReveal title="Master" />)
    const face = () => container.querySelector('[data-theme="dark"]')?.firstElementChild as Element
    expect(root(container).className).toContain('[--sk-rank-reveal-hue:var(--sk-accent)]')
    expect(root(container).className).toContain('[--sk-rank-reveal-glow:var(--sk-accent-glow)]')
    expect(face().className).toContain(
      'bg-[linear-gradient(var(--sk-rank-reveal-hue),var(--sk-rank-reveal-deep))]',
    )
    const evenPip = () => container.querySelectorAll('.animate-rank-reveal-pip')[1] as Element
    expect(evenPip().className).toContain('even:bg-(--sk-rank-reveal-hue)')
    rerender(<RankReveal title="Master" tone="premium" />)
    expect(root(container).className).toContain('[--sk-rank-reveal-hue:var(--sk-premium)]')
    expect(root(container).className).toContain('[--sk-rank-reveal-deep:var(--sk-premium-dim)]')
    expect(root(container).className).not.toContain('var(--sk-accent)')
    // Light premium and premium-dim are near-identical: the face's lower stop takes the dark stage.
    expect(face().className).toContain(
      'color-mix(in_oklab,var(--sk-rank-reveal-deep)_70%,var(--sk-bg))',
    )
    // Premium's hue is nearly the bone, so the small pips take the deep stop (and only that).
    expect(evenPip().className).toContain('even:bg-(--sk-rank-reveal-deep)')
    expect(evenPip().className).not.toContain('even:bg-(--sk-rank-reveal-hue)')
  })

  it('keeps every effect-layer length in px, so the parts align at any root font size', () => {
    const { container } = render(<RankReveal title="Master" />)
    const fx = root(container).firstElementChild as HTMLElement
    // Tailwind's numeric spacing scale (`size-50`, `h-6`, `top-25`) is rem-based.
    const remScale =
      /^(?:[\w-]+:)*-?(?:size|w|h|top|right|bottom|left|inset|translate-[xy])-(?!0$)\d+(?:\.\d+)?$/
    const classes = Array.from(fx.querySelectorAll('*')).flatMap((el) => Array.from(el.classList))
    expect(classes).toContain('size-[720px]')
    expect(classes.filter((c) => remScale.test(c))).toEqual([])
  })

  it('is a size container with an intrinsic width floor for shrink-to-fit parents', () => {
    const { container } = render(<RankReveal title="Master" />)
    const el = root(container)
    expect(el.classList.contains('@container')).toBe(true)
    expect(el.classList.contains('[contain-intrinsic-inline-size:288px]')).toBe(true)
  })

  it('keeps the title whole: fluid size, wraps rather than clips, prints without the sheen', () => {
    render(<RankReveal title="Grandmaster" />)
    const heading = screen.getByRole('heading')
    const text = heading.firstElementChild as HTMLElement
    expect(heading.classList.contains('text-[length:clamp(20px,9cqi,42px)]')).toBe(true)
    for (const c of [
      '[overflow-wrap:anywhere]',
      'max-w-full',
      'print:bg-none',
      'print:[-webkit-text-fill-color:currentColor]',
      '[-webkit-text-fill-color:transparent]',
    ])
      expect(text.classList.contains(c)).toBe(true)
  })

  it('guards every animated part with motion-reduce:animate-none', () => {
    const { container } = render(<RankReveal title="Master" division="I" description={change} />)
    const parts = animated(container)
    const names = new Set(parts.map(utility))
    expect([...names].sort()).toEqual(
      [
        'crest',
        'eyebrow',
        'flash',
        'glint',
        'glint-alt',
        'halo',
        'line',
        'orbit',
        'pip',
        'rays',
        'rays-alt',
        'slot',
        'spark',
        'ticks',
        'title',
        'wave',
        'wave-alt',
      ].map((n) => `animate-rank-reveal-${n}`),
    )
    for (const el of parts) expect(el.classList.contains('motion-reduce:animate-none')).toBe(true)
    // The root itself never animates, so a consumer className can't fight the timeline.
    expect(utility(root(container))).toBeUndefined()
  })

  it('ships every utility it uses in theme.css (keyframes + timeline + image layers)', () => {
    const css = readFileSync(new URL('../../styles/theme.css', import.meta.url), 'utf8')
    const { container } = render(<RankReveal title="Master" description={change} />)
    const used = new Set(
      Array.from(container.querySelectorAll('*')).flatMap((el) =>
        Array.from(el.classList).filter((c) => /^(animate-)?rank-reveal-/.test(c)),
      ),
    )
    expect(used.size).toBeGreaterThan(20)
    for (const name of used) expect(css).toContain(`@utility ${name} {`)
    const keyframes = css.match(/@keyframes sk-rank-reveal-[\w-]+/g) ?? []
    expect(keyframes).toHaveLength(8)
  })

  it('hides the effect layer and indexes its sparks and pips', () => {
    const { container } = render(<RankReveal title="Master" />)
    const fx = root(container).firstElementChild as HTMLElement
    expect(fx.getAttribute('aria-hidden')).toBe('true')
    expect(fx.querySelector('svg')).toBeTruthy()
    const sparks = fx.querySelectorAll('.animate-rank-reveal-spark')
    const pips = fx.querySelectorAll('.animate-rank-reveal-pip')
    expect(sparks).toHaveLength(10)
    expect(pips).toHaveLength(8)
    expect((sparks[9] as HTMLElement).style.getPropertyValue('--sk-rank-reveal-i')).toBe('9')
    expect((pips[0] as HTMLElement).style.getPropertyValue('--sk-rank-reveal-i')).toBe('0')
    expect((pips[7] as HTMLElement).style.getPropertyValue('--sk-rank-reveal-i')).toBe('7')
  })

  it('pins the built-in crest dark, and swaps it for a custom emblem', () => {
    const { container, rerender } = render(<RankReveal title="Master" />)
    const crest = container.querySelector('[data-theme="dark"]') as HTMLElement
    expect(crest).toBeTruthy()
    expect(crest.closest('[aria-hidden="true"]')).toBeTruthy()
    expect(crest.querySelector('.rank-reveal-flame')).toBeTruthy()
    rerender(
      <RankReveal title="Master" emblem={<img alt="" src="/master.png" data-testid="e" />} />,
    )
    expect(container.querySelector('[data-theme="dark"]')).toBeNull()
    const emblem = screen.getByTestId('e')
    expect(emblem.closest('[aria-hidden="true"]')).toBeTruthy()
    expect(emblem.parentElement?.classList.contains('animate-rank-reveal-flash')).toBe(true)
  })

  it('does not leak its props and passes native ones through', () => {
    const { container } = render(
      <RankReveal
        title="Master"
        tone="premium"
        headingLevel="h3"
        emblem={<span />}
        id="rr"
        lang="en"
        data-testid="r"
        aria-describedby="rr-note"
      />,
    )
    const el = root(container)
    for (const attr of ['tone', 'headinglevel', 'emblem', 'title', 'division', 'eyebrow'])
      expect(el.hasAttribute(attr)).toBe(false)
    expect(el.id).toBe('rr')
    expect(el.lang).toBe('en')
    expect(screen.getByTestId('r')).toBe(el)
    expect(el.getAttribute('aria-describedby')).toBe('rr-note')
  })

  it('forwards the ref to the root div', () => {
    const ref = createRef<HTMLDivElement>()
    render(<RankReveal ref={ref} title="Master" />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(ref.current?.hasAttribute('data-sk-rank-reveal')).toBe(true)
  })

  it('merges a consumer className last', () => {
    const { container } = render(<RankReveal title="Master" className="py-12 rounded-lg" />)
    const el = root(container)
    expect(el.classList.contains('py-12')).toBe(true)
    expect(el.classList.contains('pt-2')).toBe(false)
    expect(el.classList.contains('pb-8')).toBe(false)
    expect(el.classList.contains('rounded-lg')).toBe(true)
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(<RankReveal title="Master" division="I" description={change} />)
  })

  it('is accessible in both themes and both tones', async () => {
    for (const theme of ['dark', 'light'] as const) {
      for (const tone of ['accent', 'premium'] as const) {
        const { container, unmount } = render(
          <div data-theme={theme}>
            <RankReveal title="Master" division="I" tone={tone} description={change} />
          </div>,
        )
        await expectAccessible(container)
        unmount()
      }
    }
  })
})
