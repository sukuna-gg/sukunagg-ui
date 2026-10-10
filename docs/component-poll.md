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
├── poll.styles.tsx      # tv() slots: root, header, title, meta, sep, form, fieldset, options,
│                        #   option, choice, radio, label, writeIn, actions, results, result, bar,
│                        #   name, nameText, percent, count, you, winner, note, link; `leader` variant.
├── poll.logic.tsx       # server component; forwardRef <section>; form or results.
├── poll.write-in.tsx    # 'use client' island: clicking or typing in the write-in selects its radio
├── poll.test.tsx
├── poll.stories.tsx
└── index.tsx            # export { Poll }; export type { PollProps, PollOption, PollLabels }
packages/ui/scripts/motion/poll.ts   # @keyframes sk-poll-bar + @utility animate-poll-bar
test/browser/poll.test.ts            # bar motion + reduced motion, write-in island, native required
```

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

export interface PollOption { value: string; label: ReactNode; votes: number }

export interface PollLabels {
  vote: string                         // 'Vote'
  other: string                        // 'Other'
  otherPlaceholder: string             // 'e.g. Brawlhalla'
  votes: (n: number) => string         // n => n === 1 ? '1 vote' : `${n} votes` (n grouped: 1,200)
  closes: (date: string) => string     // d => `Closes ${d}`
  closed: (date: string) => string     // d => `Closed ${d}`
  yourVote: string                     // 'Your vote'
  changeVote: string                   // 'Change vote'
  signIn: string                       // 'Sign in'
  signInToVote: string                 // 'to vote.'
  winner: (label: string, percent: number) => string   // `${label} won with ${p}% of the votes`
  tie: (labels: string[]) => string                    // `Tie: A and B` / `Tie: A, B, and C`
}

export interface PollProps extends Omit<ComponentPropsWithoutRef<'section'>, 'title' | 'children'> {
  title: ReactNode
  description?: ReactNode
  /** Shown in this order, results included (sort it yourself to rank). */
  options: readonly PollOption[]
  /** Form field name for the choice; the write-in posts as `${name}Other`. Default 'choice'. */
  name?: string
  /** Server action (React 19) or a URL (posted with method="post"). */
  action: string | ((formData: FormData) => void | Promise<void>)
  allowWriteIn?: boolean               // default false
  /** The viewer's current vote (an option value, or what they wrote in), if any. */
  votedFor?: string | null
  /** false = show results (per showResults) + a sign-in sentence instead of the form. Default true. */
  canVote?: boolean
  signInHref?: string
  /** Link that re-renders the form for a voter (e.g. '?vote=change'); render that page with
   *  votedFor={null}. Omit to lock votes. */
  changeVoteHref?: string
  closesAt?: string                    // 'YYYY-MM-DD'
  closed?: boolean                     // default false
  /** When results show. Default 'after-vote'. */
  showResults?: 'after-vote' | 'always' | 'closed'
  locale?: string                      // default 'en-US' (the closing date)
  labels?: Partial<PollLabels>
  headingLevel?: 2 | 3 | 4             // default 3
}
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
the server), anonymous-vote dedupe (the app's job), pre-checking the old vote on the change-vote
page.

## 4. Variants → tokens

| Part | Treatment |
|---|---|
| title | display face, extra-bold, 22px (`font-stretch` 108%); meta line `text-sm --sk-text-dim` (description · closes · total, `·` in `--sk-text-faint`) |
| option | 48px row, `--sk-surface-2`, 1px `--sk-line`, `--sk-radius-md`; hover border `--sk-text-faint`; checked border `--sk-accent` + bg accent 8% over `--sk-surface-2`; radio focus → 2px `--sk-focus-ring` ring around the row |
| radio | native, `appearance: none`: 18px ring `--sk-text-faint`; checked ring + 8px dot `--sk-accent` (dot scales in, `duration-fast`) |
| write-in | inline text input (Input `sm` look on `--sk-surface`) beside "Other" in the last row |
| result | 46px row on `--sk-surface-2`; bar behind the text at `--sk-text` 8%; the leader's bar `--sk-accent` 20%; percent bold tabular-nums + count `--sk-text-faint` |
| your vote | small pill `bg-gradient-accent --sk-on-accent` "Your vote" |
| winner (closed) | panel `--sk-premium` at 12% over `--sk-surface-2` with a trophy icon (`--sk-premium`), text `--sk-text` |
| links (sign in, change vote) | `--sk-accent`, semibold, underlined |
| vote button | Button `primary` |

Arbitrary values (`color-mix`) reference `--sk-*`, never `--color-*`: the `--color-*` mapping is
resolved at `:root`, so it wouldn't follow a nested `data-theme`.

## 5. States

Precedence: closed → voted → signed out → open.

| State | Renders |
|---|---|
| open, can vote, no vote yet | the form |
| voted | results (your choice marked "Your vote") + `changeVoteHref` link if given |
| signed out (`canVote={false}`) | results (per `showResults`; while hidden, the choices without numbers) + "Sign in to vote." (a link with `signInHref`) |
| closed | the winner (or tie) sentence, then results for everyone (your vote marked); no form, no change link. 0 votes: no sentence |
| `showResults="always"` | results above the form too |
| `showResults="closed"` | results only after closing; a voter sees "Your vote: X" instead |
| vote not among `options` (a write-in) | "Your vote: Brawlhalla" under the results |

The meta line always shows the total ("82 votes").

**Motion:** result bars grow from 0 on first render (`sk-poll-bar`, 700ms `--sk-ease`, animating
`scale` from `0 1` with the origin at the inline start); reduced motion: drawn at full width.

## 6. Logic (`poll.logic.tsx`)

- **No `'use client'`** in the main file and no hooks. `forwardRef<HTMLElement, PollProps>`.
- Form: `<form action>` (`method="post"` for a URL; a function is passed through as-is: React 19
  runs it as an action, React 18 drops it with its own dev warning, so React 18 apps pass a URL)
  with a `<fieldset>`/`<legend>` (legend = title, visually hidden next to the heading), native
  radios (`required`), the write-in radio (`value="__other"`) + text input (`${name}Other`,
  `minLength 2`, `maxLength 40`, `aria-label` = `labels.other`). The `poll.write-in.tsx` island
  checks the "Other" radio when the text field is **clicked (pointer down) or typed in**; tabbing
  through it does not, so a keyboard user on their way to Vote keeps their choice. Without JS the
  person picks "Other" first. An empty write-in can still be posted: validate on the server.
- **Percentages** use largest-remainder rounding so they add up to 100 (1/1/1 → 34/33/33; ties in
  remainder go to the earlier option); a total of 0 shows "0 votes" and empty bars.
- Leader(s) = max votes (none at 0); ties are named in text. The sentence needs text: a
  non-string `label` is named by its `value`.
- Dates format with `Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'long', day: 'numeric' })`
  inside `<time dateTime>`; an unparseable `closesAt` is shown as given.

## 7. Styles (`poll.styles.tsx`)

`tv()` `slots` as in §2, plus a `leader` variant for the bar. The bar width is an inline custom
property (`--sk-poll-share: 41%`), the same way charts take data.

## 8. Accessibility checklist

- [ ] `<fieldset>` + `<legend>`; native radios, keyboard as usual; the write-in input is labelled
      "Other".
- [ ] Submitting without a choice → native `required` message (or the app's validation).
- [ ] Results are a list where each item reads "Street Fighter 6, 41%, 34 votes"; bars are
      `aria-hidden`; "Your vote" is text, not color.
- [ ] The winner/tie is a sentence, never only the longest bar.
- [ ] Text ≥ 4.5:1 on the bars in both themes (bars sit behind the text at ≤ 20%).
- [ ] Tabbing past the write-in never changes the chosen option.

## 9. Tests

Server render of each state in §5; form fields and names (`choice`, `choiceOther`); largest-
remainder rounding (e.g. 1/1/1 → 34/33/33); zero total; ties; `showResults` modes; sign-in and
change links; write-in island checks the radio on click/typing, not on Tab; React 18 (`action` as
URL, function doesn't break SSR) and 19 (function, submitted with the form data); hydration; ref
forwards; className wins; keyboard; axe both themes. Browser (`test/browser/poll.test.ts`): bars
start at 0 and settle at their share, reduced motion draws them at once, the island in Chromium,
native `required`.

## 10. Stories

`Open`, `Voted`, `SignedOut`, `Closed`, `Tie`, `WithWriteIn` (Pitaya style, es-MX). Both
`data-theme` values.

## 11. Decisions

- A server-rendered form, not a client widget: votes are server state anyway, and it works with JS
  off (Q42 mockup).
- Results after voting by default, so early results don't steer later votes.
- Results keep the order of `options` (the mockup sorted by votes): the app decides the order, and
  hidden results never leak a ranking.
- The write-in island reacts to pointer down and typing, not focus (the spec said focus): with
  focus, tabbing from a chosen option to Vote silently switched the vote to an empty "Other".
- Budget target ≤ 1.5 kB gzip (+ the write-in island), measured +10% (P5). Measured 3.56 kB brotli
  with Button (~2.9 kB without): four states, twelve labels and the form/results markup don't fit
  1.5 kB. Limit set to 3.9 kB, next to LootReveal/MatchFound (3.5 kB).
