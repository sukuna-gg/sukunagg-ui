import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { type CSSProperties, createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { XpLevelUp } from './index'

const base = { level: 42, from: 62, progress: 8 }

/** The element carrying a given (static or animate) utility, by its literal class name. */
const byClass = (root: ParentNode, cls: string) =>
  root.querySelector<HTMLElement>(`[class~="${cls}"]`)

const ANIMATED = [
  'animate-xp-level-up-chip',
  'animate-xp-level-up-glow',
  'animate-xp-level-up-ring',
  'animate-xp-level-up-spark',
  'animate-xp-level-up-pop',
  'animate-xp-level-up-flare',
  'animate-xp-level-up-roll',
  'animate-xp-level-up-prelude',
  'animate-xp-level-up-headline',
  'animate-xp-level-up-charge',
  'animate-xp-level-up-refill',
  'animate-xp-level-up-flash',
  'animate-xp-level-up-count',
  'animate-xp-level-up-swap-out',
  'animate-xp-level-up-swap-in',
]

describe('XpLevelUp', () => {
  it('server-renders the real level, headline, gain and xp as text', () => {
    const html = renderServer(
      <XpLevelUp
        {...base}
        title="Season 07 pass"
        gain={
          <>
            <b>+2,450 XP</b> · Match win
          </>
        }
        xp="820 / 10,000 XP"
      />,
    )
    expect(html).toContain('Season 07 pass')
    expect(html).toContain('Level 42')
    expect(html).toContain('Level up')
    expect(html).toContain('Match complete')
    expect(html).toContain('+2,450 XP')
    expect(html).toContain('820 / 10,000 XP')
    expect(html).toContain('role="progressbar"')
  })

  it('server-renders a plain gain without the burst layers', () => {
    const html = renderServer(<XpLevelUp {...base} levelUp={false} />)
    expect(html).toContain('Match complete')
    expect(html).not.toContain('Level up')
    expect(html).not.toContain('animate-xp-level-up-ring')
  })

  it('puts every animated layer behind its utility and guards each for reduced motion', () => {
    const { container } = render(<XpLevelUp {...base} gain="+2,450 XP" xp="820 / 10,000 XP" />)
    for (const cls of ANIMATED) {
      const el = byClass(container, cls)
      expect(el, cls).not.toBeNull()
      expect(el?.classList.contains('motion-reduce:animate-none'), cls).toBe(true)
    }
    // The shine rides on the old fill's ::after, with the matching pseudo-element guard.
    const fill = byClass(container, 'animate-xp-level-up-charge') as HTMLElement
    expect(fill.classList.contains('after:animate-xp-level-up-shine')).toBe(true)
    expect(fill.classList.contains('motion-reduce:after:animate-none')).toBe(true)
  })

  it('keeps the base styles on the final frame: the old layers rest hidden, the new ones show', () => {
    const { container } = render(<XpLevelUp {...base} xp="820 / 10,000 XP" />)
    for (const cls of [
      'animate-xp-level-up-ring',
      'animate-xp-level-up-prelude',
      'animate-xp-level-up-charge',
      'animate-xp-level-up-flash',
      'animate-xp-level-up-count',
      'animate-xp-level-up-swap-out',
    ]) {
      expect(byClass(container, cls)?.classList.contains('opacity-0'), cls).toBe(true)
    }
    for (const cls of ['animate-xp-level-up-headline', 'animate-xp-level-up-refill']) {
      expect(byClass(container, cls)?.classList.contains('opacity-0'), cls).toBe(false)
    }
    // Settled values: the new fill sits at `progress`, the next target and xp are visible text.
    const fill = byClass(container, 'animate-xp-level-up-refill') as HTMLElement
    expect(fill.className).toContain(
      '[translate:calc(var(--sk-xp-level-up-progress)_*_1%_-_100%)_0]',
    )
    expect(screen.getByText('LV 43')).toBeTruthy()
    expect(screen.getByText('820 / 10,000 XP')).toBeTruthy()
  })

  it('draws the counters with CSS and keeps them out of the accessibility tree', () => {
    const { container } = render(<XpLevelUp {...base} />)
    const num = byClass(container, 'xp-level-up-level') as HTMLElement
    expect(num.textContent).toBe('')
    expect(num.closest('[aria-hidden="true"]')).not.toBeNull()
    const pct = byClass(container, 'xp-level-up-pct') as HTMLElement
    expect(pct.getAttribute('aria-hidden')).toBe('true')
    const sr = screen.getByText('Level 42')
    expect(sr.classList.contains('sr-only')).toBe(true)
    expect(sr.closest('[aria-hidden="true"]')).toBeNull()
  })

  it('hides the decoration and the transient texts from assistive tech', () => {
    const { container } = render(<XpLevelUp {...base} />)
    for (const cls of [
      'animate-xp-level-up-glow',
      'animate-xp-level-up-ring',
      'animate-xp-level-up-prelude',
      'animate-xp-level-up-swap-out',
    ]) {
      expect(byClass(container, cls)?.getAttribute('aria-hidden'), cls).toBe('true')
    }
    const spark = byClass(container, 'xp-level-up-spark') as HTMLElement
    expect(spark.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.getByText('LV 42').closest('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.getByText('LV 43').closest('[aria-hidden="true"]')).toBeNull()
    expect(screen.getByText('Match complete').getAttribute('aria-hidden')).toBe('true')
  })

  it('renders 16 sparks with their index as an inline custom property', () => {
    const { container } = render(<XpLevelUp {...base} />)
    const sparks = [...container.querySelectorAll<HTMLElement>('[class~="xp-level-up-spark"]')]
    expect(sparks).toHaveLength(16)
    expect(sparks.map((s) => s.style.getPropertyValue('--sk-xp-level-up-i'))).toEqual(
      Array.from({ length: 16 }, (_, i) => String(i)),
    )
  })

  it('plays a plain gain with levelUp={false}', () => {
    const { container } = render(
      <XpLevelUp {...base} levelUp={false} from={8} progress={31} prelude="Top 4" />,
    )
    for (const cls of [
      'animate-xp-level-up-ring',
      'xp-level-up-spark',
      'animate-xp-level-up-flash',
      'animate-xp-level-up-charge',
      'animate-xp-level-up-count',
      'animate-xp-level-up-swap-out',
      'animate-xp-level-up-headline',
      'animate-xp-level-up-pop',
      'animate-xp-level-up-roll',
    ]) {
      expect(byClass(container, cls), cls).toBeNull()
    }
    const gain = byClass(container, 'animate-xp-level-up-gain') as HTMLElement
    expect(gain.classList.contains('motion-reduce:animate-none')).toBe(true)
    expect(gain.classList.contains('after:animate-xp-level-up-shine')).toBe(true)
    const prelude = screen.getByText('Top 4')
    expect(prelude.hasAttribute('aria-hidden')).toBe(false)
    expect(prelude.classList.contains('font-display')).toBe(true)
    expect(screen.getByText('Level 42')).toBeTruthy()
  })

  it('sets the clamped, rounded inline vars and lets the consumer style win', () => {
    render(
      <XpLevelUp
        level={41.6}
        from={-20}
        progress={140}
        data-testid="x"
        style={{ '--sk-xp-level-up-from': '5', marginTop: 4 } as CSSProperties}
      />,
    )
    const el = screen.getByTestId('x')
    expect(el.style.getPropertyValue('--sk-xp-level-up-level')).toBe('42')
    expect(el.style.getPropertyValue('--sk-xp-level-up-progress')).toBe('100')
    expect(el.style.getPropertyValue('--sk-xp-level-up-from')).toBe('5')
    expect(el.style.marginTop).toBe('4px')
  })

  it('treats non-finite numbers as 0 and defaults from to 0', () => {
    render(<XpLevelUp level={3} progress={Number.NaN} data-testid="x" />)
    const el = screen.getByTestId('x')
    expect(el.style.getPropertyValue('--sk-xp-level-up-progress')).toBe('0')
    expect(el.style.getPropertyValue('--sk-xp-level-up-from')).toBe('0')
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0')
  })

  it('exposes the bar as a named progressbar with the xp string as its value text', () => {
    render(<XpLevelUp {...base} xp="820 / 10,000 XP" />)
    const bar = screen.getByRole('progressbar', { name: 'XP to level 43' })
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
    expect(bar.getAttribute('aria-valuenow')).toBe('8')
    expect(bar.getAttribute('aria-valuetext')).toBe('820 / 10,000 XP')
  })

  it('omits aria-valuetext when xp is a node', () => {
    render(
      <XpLevelUp
        {...base}
        xp={
          <>
            <b>820</b> / 10,000 XP
          </>
        }
      />,
    )
    expect(screen.getByRole('progressbar').hasAttribute('aria-valuetext')).toBe(false)
    expect(screen.getByText('820')).toBeTruthy()
  })

  it('omits the readout when xp is absent', () => {
    const { container } = render(<XpLevelUp {...base} />)
    // Only the (aria-hidden) pct readout sits at the bar's right end.
    expect(container.querySelectorAll('[class~="justify-self-end"]')).toHaveLength(1)
    expect(screen.getByRole('progressbar').hasAttribute('aria-valuetext')).toBe(false)
  })

  it('omits the eyebrow and chip when title and gain are absent', () => {
    const { container } = render(<XpLevelUp {...base} />)
    expect(byClass(container, 'animate-xp-level-up-chip')).toBeNull()
    expect(container.querySelector('p.font-display')).toBeNull()
  })

  it('merges partial labels over the English defaults', () => {
    render(
      <XpLevelUp
        {...base}
        headline="Niveau sup"
        prelude="Partie finie"
        labels={{
          badge: 'NV',
          level: (n) => `Niveau ${n}`,
          bar: (n) => `XP vers le niveau ${n}`,
          target: (n) => `Vers NV ${n}`,
        }}
      />,
    )
    expect(screen.getByText('NV')).toBeTruthy()
    expect(screen.getByText('Niveau 42')).toBeTruthy()
    expect(screen.getByText('Niveau sup')).toBeTruthy()
    expect(screen.getByText('Partie finie')).toBeTruthy()
    expect(screen.getByText('Vers NV 43')).toBeTruthy()
    expect(screen.getByRole('progressbar', { name: 'XP vers le niveau 43' })).toBeTruthy()
  })

  it('shrinks four-digit levels to fit the badge', () => {
    const { container, unmount } = render(<XpLevelUp level={1200} progress={10} />)
    const long = byClass(container, 'xp-level-up-level') as HTMLElement
    expect(long.classList.contains('text-[28px]')).toBe(true)
    expect(long.classList.contains('text-[40px]')).toBe(false)
    unmount()
    const { container: c2 } = render(<XpLevelUp level={999} progress={10} />)
    expect(byClass(c2, 'xp-level-up-level')?.classList.contains('text-[40px]')).toBe(true)
  })

  it('renders children under the main row', () => {
    render(
      <XpLevelUp {...base}>
        <ol aria-label="Pass rewards">
          <li>Tier 42</li>
        </ol>
      </XpLevelUp>,
    )
    expect(screen.getByRole('list', { name: 'Pass rewards' })).toBeTruthy()
  })

  it('does not leak own props, passes native ones through, and merges className last', () => {
    render(
      <XpLevelUp
        {...base}
        title="Season"
        id="lvl"
        aria-label="Level up card"
        data-testid="x"
        className="gap-8"
      />,
    )
    const el = screen.getByTestId('x')
    for (const attr of ['level', 'progress', 'from', 'levelup', 'title', 'headline', 'xp']) {
      expect(el.hasAttribute(attr), attr).toBe(false)
    }
    expect(el.id).toBe('lvl')
    expect(el.getAttribute('aria-label')).toBe('Level up card')
    expect(el.classList.contains('gap-8')).toBe(true)
    expect(el.classList.contains('gap-5')).toBe(false)
  })

  it('forwards the ref to the root div', () => {
    const ref = createRef<HTMLDivElement>()
    render(<XpLevelUp ref={ref} {...base} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(
      <XpLevelUp {...base} title="Season 07 pass" gain="+2,450 XP" xp="820 / 10,000 XP" />,
    )
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <XpLevelUp {...base} title="Season 07 pass" gain="+2,450 XP" xp="820 / 10,000 XP" />
          <XpLevelUp {...base} levelUp={false} />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
