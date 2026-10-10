import { describe, expect, it, mock } from 'bun:test'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, version } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { Poll, type PollLabels, type PollOption, type PollProps } from './index'

const REACT_MAJOR = Number(version.split('.')[0])

const games: PollOption[] = [
  { value: 'sf6', label: 'Street Fighter 6', votes: 34 },
  { value: 'tekken8', label: 'Tekken 8', votes: 21 },
  { value: 'mk8', label: 'Mario Kart 8 Deluxe', votes: 18 },
  { value: 'rl', label: 'Rocket League', votes: 9 },
]

const base: PollProps = {
  title: 'Which game next?',
  description: 'Vote for the next community night.',
  options: games,
  action: '/api/vote',
}

const es: Partial<PollLabels> = {
  vote: 'Votar',
  other: 'Otro',
  otherPlaceholder: 'Ej. Brawlhalla',
  votes: (n) => (n === 1 ? '1 voto' : `${n} votos`),
  closes: (d) => `Cierra el ${d}`,
  closed: (d) => `Cerró el ${d}`,
  yourVote: 'Tu voto',
  changeVote: 'Cambiar voto',
  signIn: 'Entra',
  signInToVote: 'para votar.',
  winner: (label, p) => `Ganó ${label} con ${p}% de los votos`,
  tie: (labels) => `Empate: ${labels.join(' y ')}`,
}

const resultItems = (container: HTMLElement) => [...container.querySelectorAll('li')]
/** What a screen reader hears per result row (sr-only text included, the bar is empty). */
const rowText = (container: HTMLElement) => resultItems(container).map((li) => li.textContent)
const shares = (container: HTMLElement) =>
  resultItems(container).map((li) => li.style.getPropertyValue('--sk-poll-share'))
const bars = (container: HTMLElement) =>
  [...container.querySelectorAll('li > [aria-hidden="true"]')] as HTMLElement[]

describe('Poll', () => {
  describe('states (server render)', () => {
    it('open: renders the form, no results', () => {
      const html = renderServer(<Poll {...base} />)
      expect(html).toContain('<section')
      expect(html).toContain('<form')
      expect(html).toContain('<fieldset')
      expect(html).toContain('<legend')
      expect(html).toContain('type="radio"')
      expect(html).not.toContain('--sk-poll-share')
    })

    it('voted: renders the results with the choice marked, no form', () => {
      const html = renderServer(<Poll {...base} votedFor="sf6" changeVoteHref="?vote=change" />)
      expect(html).not.toContain('<form')
      expect(html).toContain('--sk-poll-share:41%')
      expect(html).toContain('Your vote')
      expect(html).toContain('href="?vote=change"')
    })

    it('signed out: renders a sign-in sentence instead of the form', () => {
      const html = renderServer(<Poll {...base} canVote={false} signInHref="/login" />)
      expect(html).not.toContain('<form')
      expect(html).toContain('href="/login"')
      expect(html).toContain('to vote.')
    })

    it('closed: renders the results and the winner, no form', () => {
      const html = renderServer(<Poll {...base} closed />)
      expect(html).not.toContain('<form')
      expect(html).toContain('Street Fighter 6 won with 41% of the votes')
    })
  })

  describe('form', () => {
    it('names the fields `choice` and `choiceOther`, with a required radio per option', () => {
      const { container } = render(<Poll {...base} allowWriteIn />)
      const radios = screen.getAllByRole('radio') as HTMLInputElement[]
      expect(radios.map((r) => r.value)).toEqual(['sf6', 'tekken8', 'mk8', 'rl', '__other'])
      for (const radio of radios) {
        expect(radio).toHaveAttribute('name', 'choice')
        expect(radio).toBeRequired()
      }
      const writeIn = screen.getByRole('textbox', { name: 'Other' })
      expect(writeIn).toHaveAttribute('name', 'choiceOther')
      expect(writeIn).toHaveAttribute('type', 'text')
      expect(writeIn).toHaveAttribute('minLength', '2')
      expect(writeIn).toHaveAttribute('maxLength', '40')
      expect(writeIn).toHaveAttribute('placeholder', 'e.g. Brawlhalla')
      expect(screen.getByRole('radio', { name: 'Other' })).toBe(radios[4] as HTMLInputElement)
      expect(container.querySelector('[data-sk-poll-other]')).toBeTruthy()
    })

    it('uses `name` for both fields', () => {
      render(<Poll {...base} name="game" allowWriteIn />)
      expect(screen.getAllByRole('radio')[0]).toHaveAttribute('name', 'game')
      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'gameOther')
    })

    it('labels each radio with its option and groups them under the title', () => {
      render(<Poll {...base} />)
      expect(screen.getByRole('radio', { name: 'Tekken 8' })).toHaveAttribute('value', 'tekken8')
      const group = screen.getByRole('group', { name: 'Which game next?' })
      expect(within(group).getAllByRole('radio')).toHaveLength(4)
      expect(screen.getByRole('heading', { level: 3, name: 'Which game next?' })).toBeTruthy()
    })

    it('posts to a URL action with method post, and the chosen value is in the form data', async () => {
      const { container } = render(<Poll {...base} allowWriteIn />)
      const form = container.querySelector('form') as HTMLFormElement
      expect(form).toHaveAttribute('action', '/api/vote')
      expect(form).toHaveAttribute('method', 'post')
      await userEvent.click(screen.getByRole('radio', { name: 'Tekken 8' }))
      const data = new FormData(form)
      expect(data.get('choice')).toBe('tekken8')
      expect(data.get('choiceOther')).toBe('')
    })

    it('requires a choice before it can be submitted (native validation)', async () => {
      const { container } = render(<Poll {...base} />)
      const form = container.querySelector('form') as HTMLFormElement
      expect(form.checkValidity()).toBe(false)
      await userEvent.click(screen.getByRole('radio', { name: 'Rocket League' }))
      expect(form.checkValidity()).toBe(true)
    })

    it('renders a primary submit button', () => {
      render(<Poll {...base} />)
      const button = screen.getByRole('button', { name: 'Vote' })
      expect(button).toHaveAttribute('type', 'submit')
      expect(button.className).toContain('bg-gradient-accent')
    })

    it('omits the write-in unless allowWriteIn', () => {
      render(<Poll {...base} />)
      expect(screen.queryByRole('textbox')).toBeNull()
      expect(screen.getAllByRole('radio')).toHaveLength(4)
    })
  })

  describe('write-in island', () => {
    it('checks the Other radio when the text field is clicked', async () => {
      render(<Poll {...base} allowWriteIn />)
      await userEvent.click(screen.getByRole('radio', { name: 'Tekken 8' }))
      const other = screen.getByRole('radio', { name: 'Other' }) as HTMLInputElement
      expect(other.checked).toBe(false)
      await userEvent.click(screen.getByRole('textbox', { name: 'Other' }))
      expect(other.checked).toBe(true)
      expect((screen.getByRole('radio', { name: 'Tekken 8' }) as HTMLInputElement).checked).toBe(
        false,
      )
      await userEvent.keyboard('Brawlhalla')
      const data = new FormData(other.form as HTMLFormElement)
      expect(data.get('choice')).toBe('__other')
      expect(data.get('choiceOther')).toBe('Brawlhalla')
    })

    it('keeps the choice when tabbing through the field, and checks Other on typing', async () => {
      render(<Poll {...base} options={games.slice(0, 1)} allowWriteIn />)
      const sf6 = screen.getByRole('radio', { name: 'Street Fighter 6' }) as HTMLInputElement
      const other = screen.getByRole('radio', { name: 'Other' }) as HTMLInputElement
      await userEvent.tab() // the radio group
      await userEvent.keyboard('[Space]')
      expect(sf6.checked).toBe(true)
      await userEvent.tab() // the write-in field, on the way to Vote
      expect(screen.getByRole('textbox')).toHaveFocus()
      expect(sf6.checked).toBe(true)
      expect(other.checked).toBe(false)
      await userEvent.keyboard('Smash')
      expect(other.checked).toBe(true)
      expect(sf6.checked).toBe(false)
    })
  })

  describe('results', () => {
    it('reads each row as "label, percent, count"', () => {
      const { container } = render(<Poll {...base} votedFor="tekken8" />)
      expect(rowText(container)).toEqual([
        'Street Fighter 6, 41%, 34 votes',
        'Tekken 8, Your vote, 26%, 21 votes',
        'Mario Kart 8 Deluxe, 22%, 18 votes',
        'Rocket League, 11%, 9 votes',
      ])
      expect(container.querySelector('ul')).toBeTruthy()
    })

    it('rounds with the largest remainder so the percentages add up to 100', () => {
      const three = [1, 1, 1].map((votes, i) => ({ value: `o${i}`, label: `O${i}`, votes }))
      const { container, rerender } = render(<Poll {...base} options={three} closed />)
      expect(shares(container)).toEqual(['34%', '33%', '33%'])
      rerender(<Poll {...base} closed />)
      expect(shares(container)).toEqual(['41%', '26%', '22%', '11%'])
      const seven = [1, 1, 1, 1, 1, 1, 1].map((votes, i) => ({ value: `${i}`, label: i, votes }))
      rerender(<Poll {...base} options={seven} closed />)
      const values = shares(container).map((p) => Number.parseInt(p, 10))
      expect(values.reduce((a, b) => a + b, 0)).toBe(100)
      expect(values).toEqual([15, 15, 14, 14, 14, 14, 14])
    })

    it('sets each bar width through --sk-poll-share and hides the bars', () => {
      const { container } = render(<Poll {...base} votedFor="sf6" />)
      expect(shares(container)[0]).toBe('41%')
      const all = bars(container)
      expect(all).toHaveLength(4)
      for (const bar of all) {
        expect(bar.textContent).toBe('')
        expect(bar.className).toContain('animate-poll-bar')
        expect(bar.className).toContain('motion-reduce:animate-none')
      }
    })

    it('accents the leader bar only', () => {
      const { container } = render(<Poll {...base} votedFor="sf6" />)
      const [leader, ...rest] = bars(container)
      expect(leader?.className).toContain('bg-accent/20')
      for (const bar of rest) {
        expect(bar.className).toContain('bg-text/8')
        expect(bar.className).not.toContain('bg-accent/20')
      }
    })

    it('marks "Your vote" as text in a pill', () => {
      render(<Poll {...base} votedFor="mk8" />)
      const pill = screen.getByText('Your vote')
      expect(pill.className).toContain('bg-gradient-accent')
      expect(pill.closest('li')?.textContent).toContain('Mario Kart 8 Deluxe')
    })

    it('spells out a write-in vote that is not among the options', () => {
      const { container } = render(<Poll {...base} votedFor="Brawlhalla" />)
      expect(container.textContent).toContain('Your vote: Brawlhalla')
      expect(resultItems(container)).toHaveLength(4)
    })

    it('handles a total of 0: "0 votes", empty bars, no leader, no winner', () => {
      const none = games.map((g) => ({ ...g, votes: 0 }))
      const { container } = render(<Poll {...base} options={none} closed />)
      expect(container.querySelector('p')?.textContent).toContain('0 votes')
      expect(shares(container)).toEqual(['0%', '0%', '0%', '0%'])
      for (const bar of bars(container)) expect(bar.className).not.toContain('bg-accent/20')
      expect(container.textContent).not.toContain('won with')
      expect(container.textContent).not.toContain('Tie')
    })

    it('uses the singular for one vote and groups thousands', () => {
      const { container, rerender } = render(
        <Poll {...base} options={[{ value: 'a', label: 'A', votes: 1 }]} closed />,
      )
      expect(rowText(container)).toEqual(['A, 100%, 1 vote'])
      rerender(<Poll {...base} options={[{ value: 'a', label: 'A', votes: 1200 }]} closed />)
      expect(rowText(container)).toEqual(['A, 100%, 1,200 votes'])
    })
  })

  describe('closed', () => {
    it('names the winner in a sentence with a trophy, above the results', () => {
      const { container } = render(<Poll {...base} closed />)
      const sentence = screen.getByText('Street Fighter 6 won with 41% of the votes')
      const panel = sentence.parentElement as HTMLElement
      expect(panel.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
      expect(panel.compareDocumentPosition(container.querySelector('ul') as Node)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      )
      expect(screen.queryByRole('button')).toBeNull()
    })

    it('names a tie instead, and accents every leader', () => {
      const tied = [
        { value: 'a', label: 'Tekken 8', votes: 20 },
        { value: 'b', label: 'Street Fighter 6', votes: 20 },
        { value: 'c', label: 'Rocket League', votes: 10 },
      ]
      const { container, rerender } = render(<Poll {...base} options={tied} closed />)
      expect(container.textContent).toContain('Tie: Tekken 8 and Street Fighter 6')
      const accented = bars(container).filter((b) => b.className.includes('bg-accent/20'))
      expect(accented).toHaveLength(2)
      rerender(
        <Poll {...base} options={tied.map((o) => ({ ...o, votes: 5 }))} closed labels={es} />,
      )
      expect(container.textContent).toContain('Empate: Tekken 8 y Street Fighter 6 y Rocket League')
      rerender(<Poll {...base} options={tied.map((o) => ({ ...o, votes: 5 }))} closed />)
      expect(container.textContent).toContain('Tie: Tekken 8, Street Fighter 6, and Rocket League')
    })

    it('falls back to the option value when the winning label is not text', () => {
      const options = [
        { value: 'sf6', label: <em>Street Fighter 6</em>, votes: 3 },
        { value: 'rl', label: 'Rocket League', votes: 1 },
      ]
      render(<Poll {...base} options={options} closed />)
      expect(screen.getByText('sf6 won with 75% of the votes')).toBeTruthy()
    })

    it('shows the results even with showResults="closed", and marks the vote', () => {
      render(<Poll {...base} closed showResults="closed" votedFor="rl" changeVoteHref="?c" />)
      expect(screen.getByText('Your vote')).toBeTruthy()
      expect(screen.getAllByRole('listitem')).toHaveLength(4)
      expect(screen.queryByRole('link')).toBeNull()
    })

    it('uses the "Closed" date label', () => {
      render(<Poll {...base} closed closesAt="2026-10-15" />)
      const time = screen.getByText('Closed October 15')
      expect(time.tagName).toBe('TIME')
      expect(time).toHaveAttribute('dateTime', '2026-10-15')
    })
  })

  describe('showResults', () => {
    it("'after-vote' (default): no results in the form, results once voted", () => {
      const { container, rerender } = render(<Poll {...base} />)
      expect(resultItems(container)).toHaveLength(0)
      rerender(<Poll {...base} votedFor="sf6" />)
      expect(resultItems(container)).toHaveLength(4)
      expect(container.querySelector('form')).toBeNull()
    })

    it("'always': results above the form", () => {
      const { container } = render(<Poll {...base} showResults="always" />)
      const list = container.querySelector('ul') as HTMLElement
      const form = container.querySelector('form') as HTMLElement
      expect(shares(container)).toEqual(['41%', '26%', '22%', '11%'])
      expect(list.compareDocumentPosition(form)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
      expect(screen.queryByText('Your vote')).toBeNull()
    })

    it("'closed': a voter sees their vote spelled out, not the results", () => {
      const { container } = render(
        <Poll {...base} showResults="closed" votedFor="tekken8" changeVoteHref="?vote=change" />,
      )
      expect(resultItems(container)).toHaveLength(0)
      expect(container.textContent).toContain('Your vote: Tekken 8')
      expect(screen.getByRole('link', { name: 'Change vote' })).toBeTruthy()
    })
  })

  describe('signed out', () => {
    it('lists the choices without numbers while results are hidden, plus a sign-in link', () => {
      const { container } = render(<Poll {...base} canVote={false} signInHref="/login?next=/" />)
      expect(rowText(container)).toEqual([
        'Street Fighter 6',
        'Tekken 8',
        'Mario Kart 8 Deluxe',
        'Rocket League',
      ])
      expect(bars(container)).toHaveLength(0)
      const link = screen.getByRole('link', { name: 'Sign in' })
      expect(link).toHaveAttribute('href', '/login?next=/')
      expect(link.parentElement?.textContent).toBe('Sign in to vote.')
      expect(screen.queryByRole('radio')).toBeNull()
    })

    it('shows the numbers with showResults="always"', () => {
      const { container } = render(<Poll {...base} canVote={false} showResults="always" />)
      expect(shares(container)).toEqual(['41%', '26%', '22%', '11%'])
    })

    it('renders the sentence as text without signInHref', () => {
      render(<Poll {...base} canVote={false} />)
      expect(screen.queryByRole('link')).toBeNull()
      expect(screen.getByText('Sign in to vote.')).toBeTruthy()
    })
  })

  describe('change vote', () => {
    it('links to changeVoteHref once voted', () => {
      render(<Poll {...base} votedFor="sf6" changeVoteHref="?vote=change" />)
      expect(screen.getByRole('link', { name: 'Change vote' })).toHaveAttribute(
        'href',
        '?vote=change',
      )
    })

    it('locks the vote when changeVoteHref is omitted', () => {
      render(<Poll {...base} votedFor="sf6" />)
      expect(screen.queryByRole('link')).toBeNull()
    })

    it('treats an empty votedFor as no vote', () => {
      render(<Poll {...base} votedFor="" />)
      expect(screen.getAllByRole('radio')).toHaveLength(4)
    })
  })

  describe('header', () => {
    it('shows description, closing date and total in the meta line', () => {
      const { container } = render(<Poll {...base} closesAt="2026-10-15" />)
      const meta = container.querySelector('p') as HTMLElement
      expect(meta.textContent).toBe('Vote for the next community night.·Closes October 15·82 votes')
      expect(within(meta).getByText('Closes October 15').tagName).toBe('TIME')
    })

    it('reads the date as UTC, in the given locale', () => {
      render(<Poll {...base} closesAt="2026-01-01" locale="es-MX" labels={es} />)
      expect(screen.getByText('Cierra el 1 de enero')).toBeTruthy()
    })

    it('shows an unparseable date as given', () => {
      render(<Poll {...base} closesAt="soon" />)
      expect(screen.getByText('Closes soon')).toBeTruthy()
    })

    it('shows only the total without description or date', () => {
      const { container } = render(<Poll {...base} description={undefined} />)
      expect((container.querySelector('p') as HTMLElement).textContent).toBe('82 votes')
    })

    it('renders the title at the chosen heading level', () => {
      const { rerender } = render(<Poll {...base} headingLevel={2} />)
      expect(screen.getByRole('heading', { level: 2 })).toBeTruthy()
      rerender(<Poll {...base} headingLevel={4} />)
      expect(screen.getByRole('heading', { level: 4 })).toBeTruthy()
    })
  })

  describe('labels', () => {
    it('translates every string (Pitaya, es-MX)', () => {
      const { container, rerender } = render(
        <Poll {...base} allowWriteIn labels={es} locale="es-MX" closesAt="2026-10-15" />,
      )
      expect(screen.getByRole('button', { name: 'Votar' })).toBeTruthy()
      expect(screen.getByRole('textbox', { name: 'Otro' })).toHaveAttribute(
        'placeholder',
        'Ej. Brawlhalla',
      )
      expect(container.textContent).toContain('Cierra el 15 de octubre')
      expect(container.textContent).toContain('82 votos')
      rerender(<Poll {...base} labels={es} votedFor="sf6" changeVoteHref="?votar=1" />)
      expect(screen.getByText('Tu voto')).toBeTruthy()
      expect(screen.getByRole('link', { name: 'Cambiar voto' })).toBeTruthy()
      rerender(<Poll {...base} labels={es} canVote={false} signInHref="/entrar" />)
      expect(screen.getByRole('link', { name: 'Entra' }).parentElement?.textContent).toBe(
        'Entra para votar.',
      )
      rerender(<Poll {...base} labels={es} closed closesAt="2026-10-15" locale="es-MX" />)
      expect(container.textContent).toContain('Ganó Street Fighter 6 con 41% de los votos')
      expect(container.textContent).toContain('Cerró el 15 de octubre')
    })

    it('keeps English for labels not passed', () => {
      render(<Poll {...base} labels={{ vote: 'Send' }} allowWriteIn />)
      expect(screen.getByRole('button', { name: 'Send' })).toBeTruthy()
      expect(screen.getByRole('textbox', { name: 'Other' })).toBeTruthy()
    })
  })

  describe('action', () => {
    it('accepts a URL on every React version', () => {
      expect(renderServer(<Poll {...base} action="/vote" />)).toContain('action="/vote"')
    })

    it('accepts a server action function', async () => {
      const vote = mock((_data: FormData) => {})
      if (REACT_MAJOR < 19) {
        // React 18 drops a function action; server rendering must still work.
        expect(renderServer(<Poll {...base} action={vote} />)).toContain('<form')
        return
      }
      await expectHydrates(<Poll {...base} action={vote} allowWriteIn />)
      const { container } = render(<Poll {...base} action={vote} />)
      const form = container.querySelector('form') as HTMLFormElement
      expect(form).not.toHaveAttribute('method')
      await userEvent.click(screen.getByRole('radio', { name: 'Tekken 8' }))
      await act(async () => {
        await userEvent.click(screen.getByRole('button', { name: 'Vote' }))
      })
      expect(vote).toHaveBeenCalledTimes(1)
      const [[data]] = vote.mock.calls as [[FormData]]
      expect(data.get('choice')).toBe('tekken8')
    })
  })

  describe('platform contract', () => {
    it('hydrates without warnings in every state', async () => {
      await expectHydrates(<Poll {...base} allowWriteIn closesAt="2026-10-15" />)
      await expectHydrates(<Poll {...base} votedFor="sf6" changeVoteHref="?vote=change" />)
      await expectHydrates(<Poll {...base} canVote={false} signInHref="/login" />)
      await expectHydrates(<Poll {...base} closed />)
    })

    it('passes native props through', () => {
      render(<Poll {...base} id="poll" data-testid="poll" aria-label="Game vote" />)
      const root = screen.getByTestId('poll')
      expect(root.tagName).toBe('SECTION')
      expect(root).toHaveAttribute('id', 'poll')
      expect(root).toHaveAccessibleName('Game vote')
    })

    it('forwards ref to the <section>', () => {
      const ref = createRef<HTMLElement>()
      render(<Poll {...base} ref={ref} />)
      expect(ref.current?.tagName).toBe('SECTION')
    })

    it('lets a consumer className win over a conflicting utility', () => {
      const ref = createRef<HTMLElement>()
      render(<Poll {...base} ref={ref} className="gap-8" />)
      expect(ref.current?.classList.contains('gap-8')).toBe(true)
      expect(ref.current?.classList.contains('gap-4')).toBe(false)
    })

    it('is keyboard operable: Tab reaches the radios, arrows move, Tab reaches Vote', async () => {
      render(<Poll {...base} />)
      await userEvent.tab()
      const first = screen.getByRole('radio', { name: 'Street Fighter 6' }) as HTMLInputElement
      expect(first).toHaveFocus()
      await userEvent.keyboard('[Space]')
      expect(first.checked).toBe(true)
      await userEvent.keyboard('[ArrowDown]')
      expect((screen.getByRole('radio', { name: 'Tekken 8' }) as HTMLInputElement).checked).toBe(
        true,
      )
      await userEvent.tab()
      expect(screen.getByRole('button', { name: 'Vote' })).toHaveFocus()
    })

    it('is accessible in both themes, in every state', async () => {
      for (const theme of ['dark', 'light'] as const) {
        const { container, unmount } = render(
          <div data-theme={theme}>
            <Poll {...base} allowWriteIn closesAt="2026-10-15" showResults="always" />
            <Poll {...base} votedFor="sf6" changeVoteHref="?vote=change" headingLevel={2} />
            <Poll {...base} canVote={false} signInHref="/login" />
            <Poll {...base} closed closesAt="2026-10-15" />
          </div>,
        )
        await expectAccessible(container)
        unmount()
      }
    })
  })
})
