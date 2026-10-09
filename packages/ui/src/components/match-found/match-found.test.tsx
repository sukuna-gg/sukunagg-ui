import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { MatchFound, type MatchFoundState } from './index'

const actions = (
  <>
    <button type="button">Accept</button>
    <button type="button">Decline</button>
  </>
)

/** The root `<section>` of the only MatchFound in the document. */
const root = (container: HTMLElement) => container.querySelector('section') as HTMLElement
const q = (container: HTMLElement, cls: string) =>
  container.querySelector(`[class~="${cls}"]`) as HTMLElement | null
const has = (el: Element | null, cls: string) => el?.classList.contains(cls) ?? false
const slots = (container: HTMLElement) => Array.from(container.querySelectorAll('li'))
const fills = (container: HTMLElement) => slots(container).map((li) => li.dataset.fill)

describe('MatchFound', () => {
  it('server-renders the heading, status and timer text for every state', () => {
    const cases: [MatchFoundState, number, string][] = [
      ['pending', 2, '2/5 ready'],
      ['accepted', 3, '3/5 ready'],
      ['accepted', 5, 'All ready'],
      ['declined', 4, 'Declined'],
      ['expired', 4, 'Expired'],
    ]
    for (const [state, accepted, status] of cases) {
      const html = renderServer(
        <MatchFound state={state} accepted={accepted}>
          {actions}
        </MatchFound>,
      )
      expect(html).toContain('<section')
      expect(html).toContain('<h2')
      expect(html).toContain('Match')
      expect(html).toContain('found')
      expect(html).toContain(status)
      expect(html).toContain(`data-state="${state}"`)
      expect(html).toContain('--sk-match-found-seconds:12')
      expect(html.includes('Accept within 12 seconds')).toBe(state === 'pending')
    }
  })

  it('sets data-state, data-ready only when everyone is ready, and the seconds variable', () => {
    const { container, rerender } = render(<MatchFound accepted={4} state="accepted" />)
    const el = root(container)
    expect(el.dataset.state).toBe('accepted')
    expect(el.hasAttribute('data-ready')).toBe(false)
    rerender(<MatchFound accepted={5} state="accepted" />)
    expect(el.hasAttribute('data-ready')).toBe(true)
    rerender(<MatchFound accepted={5} state="pending" />)
    expect(el.hasAttribute('data-ready')).toBe(false)
    expect(el.style.getPropertyValue('--sk-match-found-seconds')).toBe('12')
  })

  it('rounds seconds and players to whole numbers of at least 1', () => {
    const { container, rerender } = render(<MatchFound seconds={7.6} players={2.4} />)
    expect(root(container).style.getPropertyValue('--sk-match-found-seconds')).toBe('8')
    expect(slots(container)).toHaveLength(2)
    expect(screen.getByText('Accept within 8 seconds')).toBeTruthy()
    rerender(<MatchFound seconds={0} players={-3} />)
    expect(root(container).style.getPropertyValue('--sk-match-found-seconds')).toBe('1')
    expect(slots(container)).toHaveLength(1)
    rerender(<MatchFound seconds={Number.NaN} players={Number.NaN} />)
    expect(root(container).style.getPropertyValue('--sk-match-found-seconds')).toBe('1')
    expect(slots(container)).toHaveLength(1)
    // The CSS count starts from a literal 3600.
    rerender(<MatchFound seconds={5000} />)
    expect(root(container).style.getPropertyValue('--sk-match-found-seconds')).toBe('3600')
  })

  it('merges the consumer style after the seconds variable', () => {
    const { container } = render(
      <MatchFound style={{ '--sk-match-found-seconds': 30, minHeight: 300 } as never} />,
    )
    const el = root(container)
    expect(el.style.getPropertyValue('--sk-match-found-seconds')).toBe('30')
    expect(el.style.minHeight).toBe('300px')
  })

  it('fills one slot per player: teammates by count, you last per state', () => {
    const { container, rerender } = render(<MatchFound accepted={2} />)
    expect(fills(container)).toEqual(['ready', 'ready', 'waiting', 'waiting', 'you'])
    expect(screen.getByText('You')).toBeTruthy()

    rerender(<MatchFound accepted={3} state="accepted" />)
    expect(fills(container)).toEqual(['ready', 'ready', 'waiting', 'waiting', 'ready'])

    rerender(<MatchFound accepted={5} state="accepted" />)
    expect(fills(container)).toEqual(['ready', 'ready', 'ready', 'ready', 'ready'])

    rerender(<MatchFound accepted={4} state="declined" />)
    expect(fills(container)).toEqual(['ready', 'ready', 'ready', 'ready', 'lost'])
    expect(screen.queryByText('You')).toBeNull()

    rerender(<MatchFound accepted={1} state="expired" />)
    expect(fills(container)).toEqual(['ready', 'waiting', 'waiting', 'waiting', 'lost'])
  })

  it('clamps accepted to the players and to at least you once accepted', () => {
    const { container, rerender } = render(<MatchFound accepted={9} />)
    // Pending: you are not ready, so at most players - 1 can be.
    expect(fills(container)).toEqual(['ready', 'ready', 'ready', 'ready', 'you'])
    expect(screen.getByText('4/5 ready')).toBeTruthy()
    rerender(<MatchFound accepted={9} state="accepted" />)
    expect(screen.getByText('All ready')).toBeTruthy()
    rerender(<MatchFound accepted={-2} />)
    expect(fills(container)).toEqual(['waiting', 'waiting', 'waiting', 'waiting', 'you'])
    expect(screen.getByText('0/5 ready')).toBeTruthy()
    rerender(<MatchFound accepted={0} state="accepted" />)
    expect(fills(container)).toEqual(['waiting', 'waiting', 'waiting', 'waiting', 'ready'])
    expect(screen.getByText('1/5 ready')).toBeTruthy()
    rerender(<MatchFound accepted={Number.NaN} />)
    expect(screen.getByText('0/5 ready')).toBeTruthy()
  })

  it('staggers the slot rise-in with an inline delay', () => {
    const { container } = render(<MatchFound players={3} />)
    expect(slots(container).map((li) => li.style.getPropertyValue('--sk-match-found-d'))).toEqual([
      '540ms',
      '600ms',
      '660ms',
    ])
  })

  it('draws the slot fills with literal utilities', () => {
    const { container } = render(<MatchFound accepted={1} />)
    const [ready, waiting, , , you] = slots(container)
    const dot = (li?: HTMLLIElement) => li?.firstElementChild as HTMLElement
    expect(has(dot(ready), 'bg-success')).toBe(true)
    expect(has(dot(ready), 'motion-safe:animate-match-found-pop')).toBe(true)
    expect(has(ready ?? null, 'motion-safe:after:animate-match-found-burst')).toBe(true)
    expect(has(dot(waiting), 'motion-safe:before:animate-match-found-spin')).toBe(true)
    expect(has(dot(you), 'text-accent')).toBe(true)
    // Every slot rises in, motion-safe only.
    for (const li of slots(container)) {
      expect(has(li, 'motion-safe:animate-match-found-rise')).toBe(true)
    }
  })

  it('shows a cross in your slot after declining or expiring', () => {
    const { container } = render(<MatchFound state="expired" />)
    const you = slots(container).at(-1) as HTMLLIElement
    const dot = you.firstElementChild as HTMLElement
    expect(has(dot, 'text-danger')).toBe(true)
    expect(you.querySelector('path')?.getAttribute('d')).toBe('M5 5l6 6M11 5l-6 6')
  })

  it('maps the countdown phase to its animation classes', () => {
    const { container, rerender } = render(<MatchFound />)
    const number = () => q(container, 'match-found-number')
    const arc = () => container.querySelector('circle[r="50"][stroke-dasharray]')
    const dial = () => q(container, 'match-found-glow')

    // running
    expect(has(number(), 'animate-match-found-count')).toBe(true)
    expect(has(arc(), 'animate-match-found-drain')).toBe(true)
    expect(has(dial(), 'animate-match-found-urgent')).toBe(true)
    expect(q(container, 'motion-safe:animate-match-found-beat')).not.toBeNull()
    expect(q(container, 'motion-safe:animate-match-found-ping-urgent')).not.toBeNull()
    expect(has(root(container), '[--sk-match-found-play:paused]')).toBe(false)
    expect(q(container, 'motion-safe:animate-match-found-ping-ready')).toBeNull()

    // all ready: keeps the countdown classes but pauses them, forced success colour, one ripple
    rerender(<MatchFound accepted={5} state="accepted" />)
    expect(has(root(container), '[--sk-match-found-play:paused]')).toBe(true)
    expect(has(number(), 'animate-match-found-count')).toBe(true)
    expect(has(number(), 'text-success!')).toBe(true)
    expect(has(dial(), 'text-success!')).toBe(true)
    expect(q(container, 'motion-safe:animate-match-found-ping-ready')).not.toBeNull()
    expect(q(container, 'motion-safe:animate-match-found-lock')).not.toBeNull()
    expect(q(container, 'motion-safe:animate-match-found-beat')).toBeNull()
    expect(has(screen.getByText('All ready'), 'text-success')).toBe(true)

    // declined: paused, grey
    rerender(<MatchFound state="declined" />)
    expect(has(root(container), '[--sk-match-found-play:paused]')).toBe(true)
    expect(has(arc(), 'animate-match-found-drain')).toBe(true)
    expect(has(dial(), 'text-text-faint!')).toBe(true)
    expect(has(number(), 'text-text-dim!')).toBe(true)
    expect(has(screen.getByText('Declined'), 'text-danger')).toBe(true)

    // expired: no countdown animation at all → the base (final) frame shows
    rerender(<MatchFound state="expired" />)
    expect(container.querySelector('[class*="animate-match-found-count"]')).toBeNull()
    expect(container.querySelector('[class*="animate-match-found-drain"]')).toBeNull()
    expect(container.querySelector('[class*="animate-match-found-urgent"]')).toBeNull()
    expect(has(number(), 'text-danger')).toBe(true)
    expect(has(screen.getByText('Expired'), 'text-danger')).toBe(true)
  })

  it('keeps the countdown under reduced motion and gates decoration behind motion-safe', () => {
    const { container } = render(<MatchFound eyebrow="Ranked">{actions}</MatchFound>)
    // The ring steps once per second under reduced motion.
    expect(
      has(
        root(container),
        'motion-reduce:[--sk-match-found-ease:steps(var(--sk-match-found-seconds),end)]',
      ),
    ).toBe(true)
    // The countdown classes are unconditional (information keeps moving).
    expect(has(q(container, 'match-found-number'), 'animate-match-found-count')).toBe(true)
    // Every decorative animation is motion-safe only: no bare decorative animate-* class.
    const decorative = /(^|\s)animate-match-found-(?!count|drain|urgent)/
    for (const el of Array.from(container.querySelectorAll('*'))) {
      expect(decorative.test(el.getAttribute('class') ?? '')).toBe(false)
    }
    expect(q(container, 'motion-safe:animate-match-found-pop-in')).not.toBeNull()
    expect(q(container, 'motion-safe:animate-match-found-slide')).not.toBeNull()
  })

  it('splits a string title into words and keeps a node title whole', () => {
    const { container, rerender } = render(<MatchFound title="  Partida   encontrada " />)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.textContent).toBe('Partida encontrada')
    const words = Array.from(heading.querySelectorAll('span'))
    expect(words.map((w) => w.style.getPropertyValue('--sk-match-found-d'))).toEqual([
      '120ms',
      '230ms',
    ])
    expect(words.every((w) => has(w, 'motion-safe:animate-match-found-show'))).toBe(true)
    // The font shrinks to fit the longest word ("encontrada", 10 characters).
    expect(heading.style.getPropertyValue('--sk-match-found-fit')).toBe('10')

    rerender(
      <MatchFound
        title={
          <>
            Match <em>found</em>
          </>
        }
        headingLevel="h3"
      />,
    )
    const h3 = screen.getByRole('heading', { level: 3 })
    expect(h3.textContent).toBe('Match found')
    expect(h3.querySelectorAll(':scope > span')).toHaveLength(1)
    expect(h3.style.getPropertyValue('--sk-match-found-fit')).toBe('')
    expect(container.querySelector('h2')).toBeNull()
  })

  it('renders the eyebrow and meta only when given', () => {
    const { container, rerender } = render(<MatchFound />)
    expect(container.querySelectorAll('header p')).toHaveLength(0)
    rerender(<MatchFound eyebrow="Ranked · 5v5" meta="Bind · EU West" />)
    expect(screen.getByText('Ranked · 5v5')).toBeTruthy()
    expect(screen.getByText('Bind · EU West')).toBeTruthy()
  })

  it('labels the section by its title when it has an id', () => {
    const { container, rerender } = render(<MatchFound id="pop" />)
    expect(screen.getByRole('region', { name: 'Match found' })).toBeTruthy()
    expect(container.querySelector('h2')?.id).toBe('pop-title')
    rerender(<MatchFound id="pop" aria-labelledby="elsewhere" />)
    expect(root(container).getAttribute('aria-labelledby')).toBe('elsewhere')
    rerender(<MatchFound />)
    expect(root(container).hasAttribute('aria-labelledby')).toBe(false)
    expect(container.querySelector('h2')?.hasAttribute('id')).toBe(false)
  })

  it('takes over the status, timer, unit and you labels', () => {
    render(
      <MatchFound
        status="2/5 listos"
        timerLabel="Acepta en 12 segundos"
        unitLabel="seg"
        youLabel="Tú"
      />,
    )
    expect(screen.getByText('2/5 listos')).toBeTruthy()
    expect(screen.getByText('Acepta en 12 segundos')).toBeTruthy()
    expect(screen.getByText('seg')).toBeTruthy()
    expect(screen.getByText('Tú')).toBeTruthy()
    expect(screen.queryByText('2/5 ready')).toBeNull()
  })

  it('hides the ring and slots from assistive tech and keeps the timer text sr-only', () => {
    const { container } = render(<MatchFound />)
    const ring = q(container, 'match-found-number')?.closest('[aria-hidden="true"]')
    expect(ring).not.toBeNull()
    expect(container.querySelector('ol')?.getAttribute('aria-hidden')).toBe('true')
    for (const svg of Array.from(container.querySelectorAll('svg'))) {
      expect(svg.closest('[aria-hidden="true"]')).not.toBeNull()
    }
    expect(has(screen.getByText('Accept within 12 seconds'), 'sr-only')).toBe(true)
    // No live region inside: the app announces.
    expect(container.querySelector('[aria-live]')).toBeNull()
  })

  it('lays out the actions row and emphasises the first action only while pending', () => {
    const { container, rerender } = render(<MatchFound>{actions}</MatchFound>)
    const row = () => screen.getByText('Accept').parentElement as HTMLElement
    expect(row().children).toHaveLength(2)
    expect(has(row(), 'motion-safe:[&>:first-child]:before:animate-match-found-pulse')).toBe(true)
    expect(has(row(), 'motion-safe:[&>:first-child]:after:animate-match-found-sheen')).toBe(true)
    expect(
      has(q(container, 'match-found-glow'), 'motion-safe:before:animate-match-found-breathe'),
    ).toBe(true)
    rerender(<MatchFound state="accepted">{actions}</MatchFound>)
    expect(has(row(), 'motion-safe:[&>:first-child]:before:animate-match-found-pulse')).toBe(false)
    expect(q(container, 'motion-safe:before:animate-match-found-breathe')).toBeNull()
  })

  it('drops the actions row and its grid area when there are no actions', () => {
    const { container, rerender } = render(<MatchFound>{actions}</MatchFound>)
    const panel = () => root(container).children[1] as HTMLElement
    expect(panel().className).toContain("'act_act'")
    rerender(<MatchFound>{null}</MatchFound>)
    expect(panel().className).not.toContain("'act_act'")
    // header, ring, sr-only timer, side: no actions row
    expect(panel().children).toHaveLength(4)
  })

  it('passes native props through and does not leak its own', () => {
    render(<MatchFound data-testid="mf" aria-describedby="hint" players={3} seconds={9} />)
    const el = screen.getByTestId('mf')
    expect(el.getAttribute('aria-describedby')).toBe('hint')
    for (const attr of ['players', 'seconds', 'accepted', 'state', 'title', 'eyebrow', 'meta']) {
      expect(el.hasAttribute(attr)).toBe(false)
    }
  })

  it('forwards the ref to the section and lets className win', () => {
    const ref = createRef<HTMLElement>()
    const { container } = render(<MatchFound ref={ref} className="overflow-visible" />)
    expect(ref.current).toBe(root(container))
    expect(ref.current?.tagName).toBe('SECTION')
    expect(has(ref.current, 'overflow-visible')).toBe(true)
    expect(has(ref.current, 'overflow-hidden')).toBe(false)
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(
      <MatchFound id="h" eyebrow="Ranked · 5v5" meta="Bind" accepted={2}>
        {actions}
      </MatchFound>,
    )
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <MatchFound id="a11y" eyebrow="Ranked · 5v5" meta="Bind · EU West" accepted={2}>
            {actions}
          </MatchFound>
          <MatchFound state="declined" accepted={4} />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
