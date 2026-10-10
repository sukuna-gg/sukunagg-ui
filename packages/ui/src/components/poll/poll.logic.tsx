import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  forwardRef,
  type ReactNode,
} from 'react'
import { Button } from '../button'
import { pollStyles } from './poll.styles'
import { PollWriteIn } from './poll.write-in'

/** One choice in a {@link Poll}. */
export interface PollOption {
  /** What the form posts for this choice, and what `votedFor` matches against. */
  value: string
  /**
   * What people see. The winner sentence needs text, so a non-string label is named there by
   * its `value`.
   */
  label: ReactNode
  /** Votes so far: a whole number, 0 or more. */
  votes: number
}

/** Every string a {@link Poll} renders, for translation. Functions build the sentences. */
export interface PollLabels {
  /** The submit button. @default 'Vote' */
  vote: string
  /** The write-in choice, and the accessible name of its text field. @default 'Other' */
  other: string
  /** Placeholder in the write-in text field. @default 'e.g. Brawlhalla' */
  otherPlaceholder: string
  /** A vote count. @default (n) => n === 1 ? '1 vote' : `${n} votes` */
  votes: (n: number) => string
  /** The closing date while the poll is open. @default (date) => `Closes ${date}` */
  closes: (date: string) => string
  /** The closing date once `closed`. @default (date) => `Closed ${date}` */
  closed: (date: string) => string
  /** Marks the viewer's choice in the results (as text, not only color). @default 'Your vote' */
  yourVote: string
  /** The `changeVoteHref` link. @default 'Change vote' */
  changeVote: string
  /** The `signInHref` link at the start of the sign-in sentence. @default 'Sign in' */
  signIn: string
  /** The rest of the sign-in sentence, after the link. @default 'to vote.' */
  signInToVote: string
  /**
   * The closed poll's result when one choice leads.
   * @default (label, percent) => `${label} won with ${percent}% of the votes`
   */
  winner: (label: string, percent: number) => string
  /** The closed poll's result when several choices share the lead. @default (labels) => `Tie: A and B` */
  tie: (labels: string[]) => string
}

/** Props for {@link Poll}: the native `<section>` attributes plus the question, choices and state. */
export interface PollProps extends Omit<ComponentPropsWithoutRef<'section'>, 'title' | 'children'> {
  /** The question, shown as a heading (`headingLevel`) and used as the form's `<legend>`. */
  title: ReactNode
  /** One line under the question, e.g. what the vote decides. */
  description?: ReactNode
  /** The choices, in the order they are shown (results keep this order; sort it to rank). */
  options: readonly PollOption[]
  /**
   * Form field name for the choice. The write-in text posts as `${name}Other`, and the write-in
   * choice itself posts the value `'__other'`.
   * @default 'choice'
   */
  name?: string
  /**
   * Where the vote goes: a URL (posted with `method="post"`), or a React 19 server action
   * (`(formData) => …`). React 18 supports only the URL: it drops a function, with React's own
   * dev warning, and the form then submits to the current page.
   */
  action: string | ((formData: FormData) => void | Promise<void>)
  /**
   * Adds an "Other" choice with a text field (`minLength` 2, `maxLength` 40). Clicking or typing
   * in the field selects "Other" once the page is interactive (tabbing through it doesn't);
   * without JS the person picks "Other" first.
   * @default false
   */
  allowWriteIn?: boolean
  /**
   * The viewer's current vote (an option `value`, or what they wrote in). Set, it shows the
   * results instead of the form, with their choice marked.
   */
  votedFor?: string | null
  /**
   * `false` for a viewer who can't vote (signed out): the form becomes the results (per
   * `showResults`) and a sign-in sentence.
   * @default true
   */
  canVote?: boolean
  /** Where the sign-in sentence links to, e.g. `'/login?next=/games'`. Without it, plain text. */
  signInHref?: string
  /**
   * A link that brings the form back for someone who voted, e.g. `'?vote=change'`. Render that
   * page with `votedFor={null}`. Omit it to lock votes.
   */
  changeVoteHref?: string
  /** The closing date, `'YYYY-MM-DD'`, shown as "Closes October 15" (read as UTC). */
  closesAt?: string
  /**
   * The poll is over: results for everyone, the winner (or tie) named in a sentence, no form.
   * @default false
   */
  closed?: boolean
  /**
   * When the results show: `'after-vote'` once the viewer has voted (so early results don't
   * steer later votes), `'always'` (also above the form), or `'closed'` only once it closes.
   * @default 'after-vote'
   */
  showResults?: 'after-vote' | 'always' | 'closed'
  /**
   * Locale for the closing date (`Intl.DateTimeFormat`). Pass it with `labels` when translating.
   * @default 'en-US'
   */
  locale?: string
  /** Any of the strings to replace; the rest stay English. */
  labels?: Partial<PollLabels>
  /**
   * Heading level of `title`, to fit the page outline.
   * @default 3
   */
  headingLevel?: 2 | 3 | 4
}

/** The value the write-in choice posts. */
const OTHER = '__other'

const HEADINGS = { 2: 'h2', 3: 'h3', 4: 'h4' } as const

const defaultLabels: PollLabels = {
  vote: 'Vote',
  other: 'Other',
  otherPlaceholder: 'e.g. Brawlhalla',
  votes: (n) => (n === 1 ? '1 vote' : `${n.toLocaleString('en-US')} votes`),
  closes: (date) => `Closes ${date}`,
  closed: (date) => `Closed ${date}`,
  yourVote: 'Your vote',
  changeVote: 'Change vote',
  signIn: 'Sign in',
  signInToVote: 'to vote.',
  winner: (label, percent) => `${label} won with ${percent}% of the votes`,
  tie: (labels) => `Tie: ${new Intl.ListFormat('en-US', { type: 'conjunction' }).format(labels)}`,
}

/**
 * Whole-number percentages that add up to 100 (largest remainder): each share is rounded down,
 * then the points left over go to the largest remainders, earlier options first on a tie.
 * A total of 0 gives every option 0.
 */
const percentages = (votes: readonly number[]): number[] => {
  const total = votes.reduce((sum, v) => sum + v, 0)
  if (total === 0) return votes.map(() => 0)
  const exact = votes.map((v) => (v * 100) / total)
  const result = exact.map(Math.floor)
  let left = 100 - result.reduce((sum, p) => sum + p, 0)
  const byRemainder = exact
    .map((p, i) => ({ i, rest: p - Math.floor(p) }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i)
  for (const { i } of byRemainder) {
    if (left <= 0) break
    result[i] = (result[i] as number) + 1
    left -= 1
  }
  return result
}

/** `'2026-10-15'` → "October 15" in `locale`, read as UTC so the day never shifts. */
const formatDay = (iso: string, locale: string) => {
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'long', day: 'numeric' }).format(
    date,
  )
}

/** A label as text for the winner sentence; a non-text label falls back to the option value. */
const textOf = (option: PollOption) =>
  typeof option.label === 'string' || typeof option.label === 'number'
    ? String(option.label)
    : option.value

const Trophy = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
    <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4" />
  </svg>
)

/**
 * One question with a few choices, an optional write-in, and the results as bars with
 * percentages. It is a real `<form>`, so it works with JavaScript off and with server actions.
 * By default the results appear only after the viewer votes.
 *
 * @remarks
 * - SSR/RSC: a server component (no `'use client'`). Only the write-in field (`allowWriteIn`) is
 *   a tiny client island, and only while the form shows: clicking or typing in it selects
 *   "Other"; tabbing through it keeps the chosen option.
 * - States: the form (can vote, no vote yet) → the results with "Your vote" (`votedFor`) and a
 *   `changeVoteHref` link → for `canVote={false}` the results (per `showResults`) and a sign-in
 *   sentence → `closed`: results for everyone plus the winner or tie in a sentence.
 * - Form: `<fieldset>` + `<legend>` (the title, visually hidden next to the heading) and native
 *   radios with `required`, so submitting without a choice shows the browser's own message. The
 *   write-in posts `'__other'` as the choice and its text as `${name}Other`; validate both on
 *   the server (an empty write-in can still be posted).
 * - Results: a list whose items read "Street Fighter 6, 41%, 34 votes". Percentages are whole
 *   numbers that add up to 100 (largest remainder). Bars are `aria-hidden`; the leader's bar is
 *   crimson, "Your vote" is text, and a closed poll names its winner in a sentence.
 * - Motion: bars grow from 0 on first render (`animate-poll-bar`, 700ms); reduced motion draws
 *   them at full width.
 * - Dates: `closesAt` is `'YYYY-MM-DD'`, formatted in `locale` as UTC.
 *
 * @example
 * ```tsx
 * import { Poll } from '@sukunagg/ui'
 *
 * <Poll
 *   title="Which game next?"
 *   action="/api/poll/next-game"
 *   options={[
 *     { value: 'sf6', label: 'Street Fighter 6', votes: 34 },
 *     { value: 'tekken8', label: 'Tekken 8', votes: 21 },
 *   ]}
 *   allowWriteIn
 *   votedFor={viewer?.vote ?? null}
 *   canVote={!!viewer}
 *   signInHref="/login?next=/games"
 *   closesAt="2026-10-15"
 * />
 * ```
 *
 * @example
 * ```tsx
 * import { Poll } from '@sukunagg/ui'
 *
 * // React 19 server action; the write-in arrives as formData.get('gameOther').
 * async function vote(formData: FormData) {
 *   'use server'
 *   await saveVote(formData.get('game'), formData.get('gameOther'))
 * }
 *
 * <Poll title="¿Falta tu juego?" name="game" action={vote} allowWriteIn options={top} locale="es-MX"
 *   labels={{ vote: 'Votar', other: 'Otro', votes: (n) => `${n} votos` }} />
 * ```
 */
export const Poll = forwardRef<HTMLElement, PollProps>(function Poll(
  {
    title,
    description,
    options,
    name = 'choice',
    action,
    allowWriteIn = false,
    votedFor = null,
    canVote = true,
    signInHref,
    changeVoteHref,
    closesAt,
    closed = false,
    showResults = 'after-vote',
    locale = 'en-US',
    labels: labelOverrides,
    headingLevel = 3,
    className,
    ...rest
  },
  ref,
) {
  const s = pollStyles()
  const labels = { ...defaultLabels, ...labelOverrides }
  const Heading = HEADINGS[headingLevel]

  const votes = options.map((o) => o.votes)
  const total = votes.reduce((sum, v) => sum + v, 0)
  const percents = percentages(votes)
  const top = Math.max(0, ...votes)
  const leaders = top > 0 ? options.filter((o) => o.votes === top) : []

  const voted = votedFor !== null && votedFor !== ''
  const view = closed ? 'closed' : voted ? 'voted' : canVote ? 'open' : 'signedOut'
  const reveal = closed || showResults === 'always' || (showResults === 'after-vote' && voted)

  const mine = voted ? options.find((o) => o.value === votedFor) : undefined
  // Spelled out when the results don't already mark it: hidden, or a write-in not in `options`.
  const yourVote = voted && (!mine || !reveal) ? (mine ? mine.label : votedFor) : null

  const results = (withNumbers: boolean) => (
    <ul className={s.results()}>
      {options.map((option, i) => {
        const percent = percents[i] as number
        const isMine = option === mine
        return (
          <li
            key={option.value}
            className={s.result()}
            style={
              withNumbers ? ({ '--sk-poll-share': `${percent}%` } as CSSProperties) : undefined
            }
          >
            {withNumbers ? (
              <span aria-hidden="true" className={s.bar({ leader: leaders.includes(option) })} />
            ) : null}
            <span className={s.name()}>
              <span className={s.nameText()}>{option.label}</span>
              {isMine ? (
                <>
                  <span className="sr-only">, </span>
                  <span className={s.you()}>{labels.yourVote}</span>
                </>
              ) : null}
            </span>
            {withNumbers ? (
              <span className={s.percent()}>
                <span className="sr-only">, </span>
                {percent}%<span className="sr-only">, </span>
                <span className={s.count()}>{labels.votes(option.votes)}</span>
              </span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )

  let outcome: string | null = null
  if (closed && leaders.length === 1) {
    const [winner] = leaders as [PollOption]
    outcome = labels.winner(textOf(winner), percents[options.indexOf(winner)] as number)
  } else if (closed && leaders.length > 1) {
    outcome = labels.tie(leaders.map(textOf))
  }

  return (
    <section ref={ref} className={s.root({ className })} {...rest}>
      <div className={s.header()}>
        <Heading className={s.title()}>{title}</Heading>
        <p className={s.meta()}>
          {description ? (
            <>
              <span>{description}</span>
              <span aria-hidden="true" className={s.sep()}>
                ·
              </span>
            </>
          ) : null}
          {closesAt ? (
            <>
              <time dateTime={closesAt}>
                {(closed ? labels.closed : labels.closes)(formatDay(closesAt, locale))}
              </time>
              <span aria-hidden="true" className={s.sep()}>
                ·
              </span>
            </>
          ) : null}
          <span>{labels.votes(total)}</span>
        </p>
      </div>

      {outcome ? (
        <p className={s.winner()}>
          <Trophy />
          <span>{outcome}</span>
        </p>
      ) : null}

      {/* Signed out with hidden results: still list what's on the ballot, without numbers. */}
      {reveal ? results(true) : view === 'signedOut' ? results(false) : null}

      {yourVote === null ? null : (
        <p className={s.note()}>
          {labels.yourVote}: <strong className="font-semibold text-text">{yourVote}</strong>
        </p>
      )}

      {view === 'voted' && changeVoteHref ? (
        <p className={s.note()}>
          <a href={changeVoteHref} className={s.link()}>
            {labels.changeVote}
          </a>
        </p>
      ) : null}

      {view === 'signedOut' ? (
        <p className={s.note()}>
          {signInHref ? (
            <a href={signInHref} className={s.link()}>
              {labels.signIn}
            </a>
          ) : (
            labels.signIn
          )}{' '}
          {labels.signInToVote}
        </p>
      ) : null}

      {view === 'open' ? (
        <form
          action={action}
          method={typeof action === 'string' ? 'post' : undefined}
          className={s.form()}
        >
          <fieldset className={s.fieldset()}>
            <legend className="sr-only">{title}</legend>
            <div className={s.options()}>
              {options.map((option) => (
                <label key={option.value} className={s.option({ className: 'cursor-pointer' })}>
                  <input
                    type="radio"
                    name={name}
                    value={option.value}
                    required
                    className={s.radio()}
                  />
                  <span className={s.label()}>{option.label}</span>
                </label>
              ))}
              {allowWriteIn ? (
                <div data-sk-poll-other="" className={s.option()}>
                  <label className={s.choice()}>
                    <input type="radio" name={name} value={OTHER} required className={s.radio()} />
                    <span className="font-semibold">{labels.other}</span>
                  </label>
                  <PollWriteIn
                    name={`${name}Other`}
                    aria-label={labels.other}
                    placeholder={labels.otherPlaceholder}
                    minLength={2}
                    maxLength={40}
                    autoComplete="off"
                    className={s.writeIn()}
                  />
                </div>
              ) : null}
            </div>
          </fieldset>
          <div className={s.actions()}>
            <Button type="submit">{labels.vote}</Button>
          </div>
        </form>
      ) : null}
    </section>
  )
})
