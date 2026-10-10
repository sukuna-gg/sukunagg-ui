# Component: Poll

> Follows the `docs/component-button.md` template. **Server component** rendering a real `<form>`,
> plus a tiny client island for the write-in field (Q42).

## 1. Purpose

Asks one question with a few choices, optionally a write-in, and shows the results as bars with
percentages. It posts like any form, so it works with JavaScript off and with server actions. By
default the results appear only after you vote, so early votes don't steer later ones.

## 2. Files

```
packages/ui/src/components/poll/
├── poll.styles.tsx      # tv() slots: root, header, title, meta, options, option, radio, writeIn,
│                        #   actions, results, result, bar, name, percent, you, winner, note.
├── poll.logic.tsx       # server component; forwardRef <section>; form or results.
├── poll.write-in.tsx    # 'use client' island: focusing the write-in selects its radio
├── poll.test.tsx
├── poll.stories.tsx
└── index.tsx            # export { Poll }; export type { PollProps, PollOption, PollLabels }
```

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

export interface PollOption { value: string; label: ReactNode; votes: number }

export interface PollLabels {
  vote: string                         // 'Vote'
  other: string                        // 'Other'
  otherPlaceholder: string             // 'e.g. Brawlhalla'
  votes: (n: number) => string         // n => n === 1 ? '1 vote' : `${n} votes`
  closes: (date: string) => string     // d => `Closes ${d}`
  closed: (date: string) => string     // d => `Closed ${d}`
  yourVote: string                     // 'Your vote'
  changeVote: string                   // 'Change vote'
  signIn: string                       // 'Sign in'
  signInToVote: string                 // 'to vote.'
  winner: (label: string, percent: number) => string   // `${label} won with ${p}% of the votes`
  tie: (labels: string[]) => string                    // `Tie: ${labels.join(' and ')}`
}

interface PollOwnProps {
  title: ReactNode
  description?: ReactNode
  options: readonly PollOption[]
  /** Form field name for the choice; the write-in posts as `${name}Other`. Default 'choice'. */
  name?: string
  /** Server action (React 19) or a URL. */
  action: string | ((formData: FormData) => void | Promise<void>)
  allowWriteIn?: boolean
  /** The viewer's current vote (an option value), if any. */
  votedFor?: string | null
  /** false = show results + a sign-in link instead of the form. Default true. */
  canVote?: boolean
  signInHref?: string
  /** Link that re-renders the form for a voter (e.g. '?vote=change'). Omit to lock votes. */
  changeVoteHref?: string
  closesAt?: string                    // 'YYYY-MM-DD'
  closed?: boolean
  /** When results show. Default 'after-vote'. */
  showResults?: 'after-vote' | 'always' | 'closed'
  locale?: string
  labels?: Partial<PollLabels>
  headingLevel?: 2 | 3 | 4             // default 3
}

export type PollProps = PollOwnProps & Omit<ComponentPropsWithoutRef<'section'>, 'title' | 'children'>
```

Pitaya's `/juegos` vote (today a free-text box plus badges):

```tsx
<Poll title="¿Falta tu juego?" description="Vota por el juego que quieres ver en Pitaya."
  name="game" action={voteForGame} allowWriteIn votedFor={me?.vote ?? null} canVote={!!me}
  signInHref="/entrar?next=/juegos" changeVoteHref="?votar=1" closesAt="2026-10-15" locale="es-MX"
  options={votes.slice(0, 4).map((v) => ({ value: v.game, label: v.game, votes: v.votes }))}
  labels={esLabels} />
```

Deliberately **not** in v1: multiple choice, ranked choice, live-updating counts (re-render from
the server), anonymous-vote dedupe (the app's job).

## 4. Variants → tokens

| Part | Treatment |
|---|---|
| title | display face, extra-bold, 22px; meta line `text-sm --sk-text-dim` (description · closes · total) |
| option | 48px row, `--sk-surface-2`, 1px `--sk-line`, `--sk-radius-md`; hover border `--sk-text-faint`; checked border `--sk-accent` + bg accent 8% |
| radio | 18px ring `--sk-text-faint`; checked ring + 8px dot `--sk-accent` |
| write-in | inline text input (Input `sm` look on `--sk-surface`) inside the "Other" row |
| result | 46px row on `--sk-surface-2`; bar behind the text at `--sk-text` 8%; the leader's bar `--sk-accent` 20%; percent bold tabular-nums + count `--sk-text-faint` |
| your vote | small pill `bg-gradient-accent --sk-on-accent` "Your vote" |
| winner (closed) | panel `--sk-premium` at 12% over `--sk-surface-2` with a trophy icon, text `--sk-text` |
| vote button | Button `primary` |

## 5. States

| State | Renders |
|---|---|
| open, can vote, no vote yet | the form |
| voted | results (your choice marked) + `changeVoteHref` link if given |
| signed out (`canVote={false}`) | results (per `showResults`) + "Sign in to vote." |
| closed | results + the winner (or tie) sentence; no form |
| `showResults="always"` | results above the form too |
| `showResults="closed"` | results only after closing |

**Motion:** result bars grow from 0 on first render (`sk-poll-bar`, 700ms `--sk-ease`); reduced
motion: drawn at full width.

## 6. Logic (`poll.logic.tsx`)

- **No `'use client'`** in the main file. `forwardRef<HTMLElement, PollProps>`.
- Form: `<form action>` with a `<fieldset>`/`<legend>` (legend = title text, visually hidden when
  the heading shows), native radios (`required`), the write-in radio (`value="__other"`) + text
  input (`${name}Other`, `minLength 2`, `maxLength 40`). The `poll.write-in.tsx` island only checks
  the "Other" radio when the text field gets focus; without it the person picks "Other" first.
- **Percentages** use largest-remainder rounding so they add up to 100; a total of 0 shows "0
  votes" and empty bars.
- Leader(s) = max votes; ties are named in text.
- Dates format with `Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'long', day: 'numeric' })`.

## 7. Styles (`poll.styles.tsx`)

`tv()` `slots` as in §2. The bar width is an inline custom property (`--sk-poll-share: 41%`), the
same way charts take data.

## 8. Accessibility checklist

- [ ] `<fieldset>` + `<legend>`; native radios, keyboard as usual; the write-in input is labelled
      "Other".
- [ ] Submitting without a choice → native `required` message (or the app's validation).
- [ ] Results are a list where each item reads "Street Fighter 6, 41%, 34 votes"; bars are
      `aria-hidden`; "Your vote" is text, not color.
- [ ] The winner/tie is a sentence, never only the longest bar.
- [ ] Text ≥ 4.5:1 on the bars in both themes (bars sit behind the text at ≤ 20%).

## 9. Tests

Server render of each state in §5; form fields and names (`choice`, `choiceOther`); largest-
remainder rounding (e.g. 1/1/1 → 34/33/33); zero total; ties; `showResults` modes; sign-in and
change links; write-in island checks the radio; React 18 (`action` as URL) and 19 (function);
ref forwards; className wins; axe both themes.

## 10. Stories

`Open`, `Voted`, `SignedOut`, `Closed`, `Tie`, `WithWriteIn` (Pitaya style, es-MX). Both
`data-theme` values.

## 11. Decisions

- A server-rendered form, not a client widget: votes are server state anyway, and it works with JS
  off (Q42 mockup).
- Results after voting by default, so early results don't steer later votes.
- Budget target ≤ 1.5 kB gzip (+ the write-in island), measured +10% (P5).
