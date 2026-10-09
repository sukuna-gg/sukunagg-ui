import {
  Children,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  Fragment,
  forwardRef,
  type ReactNode,
} from 'react'
import { matchFoundSlotStyles, matchFoundStyles } from './match-found.styles'

/** Your answer to the ready check, or `'expired'` once the app's own timer ran out. */
export type MatchFoundState = 'pending' | 'accepted' | 'declined' | 'expired'

/** Props for {@link MatchFound}: native `<section>` attributes plus the ready-check data below. */
export interface MatchFoundProps extends Omit<ComponentPropsWithoutRef<'section'>, 'title'> {
  /**
   * The heading. A string is split into words, each revealed under an accent wipe, and its size
   * shrinks so the longest word fits (translations never clip); a node is one piece at full size.
   * Replaces the native `title` tooltip attribute.
   * @default 'Match found'
   */
  title?: ReactNode
  /** Small accent line over the title, with a live dot: `'Ranked · 5v5'`. */
  eyebrow?: ReactNode
  /** One line under the title (truncates): map, region, average MMR. */
  meta?: ReactNode
  /**
   * Heading element used for `title`, to fit the page outline.
   * @default 'h2'
   */
  headingLevel?: 'h2' | 'h3' | 'h4'
  /**
   * The accept window in whole seconds (rounded, clamped to 1–3600). The ring and number count
   * down from it, starting on mount. It only drives the picture: run your own timer.
   * @default 12
   */
  seconds?: number
  /**
   * Players in the ready check (rounded, at least 1): one slot each, the last one is you.
   * @default 5
   */
  players?: number
  /**
   * Players ready so far, including you once `state` is `'accepted'` — the N in "N/5 ready".
   * Clamped to `players` (to `players - 1` until you accept). Raising it fills the next teammate
   * slot with a pop.
   * @default 0
   */
  accepted?: number
  /**
   * Your answer. `'accepted'` fills your slot (and, with everyone ready, freezes the ring green);
   * `'declined'` freezes it grey; `'expired'` shows the final frame (0, drained). Set `'expired'`
   * from your own timer.
   * @default 'pending'
   */
  state?: MatchFoundState
  /**
   * Replaces the status line. Default: `'N/players ready'`, `'All ready'`, `'Declined'` or
   * `'Expired'`. It is read by screen readers, so keep it meaningful without colour.
   */
  status?: ReactNode
  /**
   * Screen-reader text for the countdown while `state` is `'pending'` (the ring is `aria-hidden`).
   * @default `Accept within ${seconds} seconds`
   */
  timerLabel?: ReactNode
  /**
   * Small label under the number.
   * @default 'sec'
   */
  unitLabel?: ReactNode
  /**
   * Label inside your slot while you haven't answered (decorative; the slots are `aria-hidden`).
   * @default 'You'
   */
  youLabel?: ReactNode
  /**
   * The actions, laid out in a row: put Accept first, then Decline. While `state` is
   * `'pending'` the first one gets a decorative glow pulse and sheen.
   */
  children?: ReactNode
}

const CHECK = 'M3.5 8.5l3 3 6-7'
const CROSS = 'M5 5l6 6M11 5l-6 6'

/**
 * The ready-check prompt a game client shows when the queue pops: a draining countdown ring, who
 * on the team has accepted, and the Accept / Decline actions you pass as `children`.
 *
 * @remarks
 * - SSR/RSC: static and RSC-safe (no `'use client'`): the countdown and the entrance are CSS
 *   keyframes (`theme.css`), so they run before hydration and without JS. They play **on mount**;
 *   to restart for a new queue pop, change the React `key`.
 * - Presentational: the app owns the timer, the accept/decline requests and the announcements.
 *   Run your own timer, set `state="expired"` when it ends, and announce changes in your own
 *   `aria-live` region. `seconds` only drives the picture.
 * - Accessibility: the title is a real heading (`headingLevel`); pass `id` to make the section a
 *   region labelled by it. The ring, number and slots are `aria-hidden`; screen readers get the
 *   sr-only `timerLabel` while pending and the visible status line. Actions are your own buttons —
 *   disable them once the player has answered.
 * - Phases: `state="accepted"` with `accepted >= players` freezes the ring success green ("All
 *   ready"); `declined` freezes it grey; `expired` shows 0 and a drained ring. The last 3 seconds
 *   turn danger red with a ripple and a beat each second (no faster than 1 Hz, WCAG 2.3.1).
 * - Reduced motion: entrances, ripples, pulses and the sheen are off; the countdown keeps running
 *   and steps once per second, because the remaining time is information.
 * - Layout: fills its container's width and switches to the ring-left layout from a 460px-wide
 *   container. Bring the frame (a Card, a Dialog popup with `p-0`, or your own surface).
 * - The ref points at the root `<section>`; `className` merges last; `style` is merged after the
 *   internal `--sk-match-found-seconds`. `data-state` (and `data-ready` when everyone is ready)
 *   are set on the root for your own styling.
 *
 * @example
 * ```tsx
 * import { Button, MatchFound } from '@sukunagg/ui'
 *
 * <MatchFound
 *   key={queuePopId}
 *   eyebrow="Ranked · 5v5"
 *   meta="Bind · EU West · avg 1,840 MMR"
 *   seconds={12}
 *   players={5}
 *   accepted={readyCount}
 *   state={answer}
 * >
 *   <Button onClick={accept} disabled={answer !== 'pending'}>Accept</Button>
 *   <Button variant="outline" onClick={decline} disabled={answer !== 'pending'}>Decline</Button>
 * </MatchFound>
 * ```
 */
export const MatchFound = forwardRef<HTMLElement, MatchFoundProps>(function MatchFound(
  {
    title = 'Match found',
    eyebrow,
    meta,
    headingLevel: Heading = 'h2',
    seconds = 12,
    players = 5,
    accepted = 0,
    state = 'pending',
    status,
    timerLabel,
    unitLabel = 'sec',
    youLabel = 'You',
    id,
    'aria-labelledby': labelledBy,
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  // The CSS count runs from a literal 3600 (see scripts/motion/match-found.ts), hence the cap.
  const total = Math.min(3600, Math.max(1, Math.round(seconds) || 1))
  const size = Math.max(1, Math.round(players) || 1)
  const youIn = state === 'accepted'
  const lost = state === 'declined' || state === 'expired'
  // You count once you accept; until then at most the others (players − 1) can be ready.
  const ready = Math.min(
    youIn ? size : size - 1,
    Math.max(youIn ? 1 : 0, Math.round(accepted) || 0),
  )
  const teammates = ready - (youIn ? 1 : 0)
  const allReady = youIn && ready >= size
  const phase = allReady ? 'ready' : lost ? state : 'running'
  const hasActions = Children.toArray(children).length > 0

  const s = matchFoundStyles({ phase, actions: hasActions, pending: state === 'pending' })
  const titleId = id ? `${id}-title` : undefined
  const words = typeof title === 'string' ? title.trim().split(/\s+/) : [title]
  // Longest word in characters: the title's font shrinks so that word fits (see the styles).
  const fit =
    typeof title === 'string'
      ? { '--sk-match-found-fit': Math.max(1, ...words.map((w) => Array.from(String(w)).length)) }
      : undefined
  const statusText =
    status ??
    (allReady
      ? 'All ready'
      : state === 'declined'
        ? 'Declined'
        : state === 'expired'
          ? 'Expired'
          : `${ready}/${size} ready`)

  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={labelledBy ?? titleId}
      data-state={state}
      data-ready={allReady ? '' : undefined}
      className={s.root({ className })}
      style={{ '--sk-match-found-seconds': total, ...style } as CSSProperties}
      {...rest}
    >
      <div aria-hidden="true" className={s.decor()} />
      <div className={s.panel()}>
        <header className={s.head()}>
          {eyebrow != null && <p className={s.eyebrow()}>{eyebrow}</p>}
          <Heading id={titleId} className={s.title()} style={fit as CSSProperties | undefined}>
            {words.map((word, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: positional words of a static title.
              <Fragment key={i}>
                {i > 0 && ' '}
                <span
                  className={s.word()}
                  style={{ '--sk-match-found-d': `${120 + i * 110}ms` } as CSSProperties}
                >
                  {word}
                </span>
              </Fragment>
            ))}
          </Heading>
          {meta != null && <p className={s.meta()}>{meta}</p>}
        </header>

        <div aria-hidden="true" className={s.ring()}>
          <div className={s.dial()}>
            <svg aria-hidden="true" className={s.svg()} viewBox="0 0 120 120">
              <circle className={s.disc()} cx="60" cy="60" r="44" />
              <circle
                className={s.tick()}
                cx="60"
                cy="60"
                r="56"
                strokeWidth={3}
                strokeDasharray=".5 5.36431"
                strokeDashoffset=".25"
                transform="rotate(-90 60 60)"
              />
              <circle
                className={s.tickMajor()}
                cx="60"
                cy="60"
                r="56"
                strokeWidth={5}
                strokeDasharray="1.2 28.12153"
                strokeDashoffset=".6"
                transform="rotate(-90 60 60)"
              />
              <circle className={s.track()} cx="60" cy="60" r="50" strokeWidth={6} />
              <circle
                className={s.arc()}
                cx="60"
                cy="60"
                r="50"
                strokeWidth={6}
                strokeDasharray="314.16"
                transform="rotate(-90 60 60)"
              />
              <g className={s.comet()}>
                <circle className={s.cometHalo()} cx="60" cy="10" r="6" />
                <circle className={s.cometCore()} cx="60" cy="10" r="2.4" />
              </g>
            </svg>
            <span className={s.ping()} />
            {allReady && <span className={s.readyPing()} />}
            <span className={s.num()}>
              <span className={s.number()} />
              <span className={s.unit()}>{unitLabel}</span>
            </span>
          </div>
        </div>
        {state === 'pending' && (
          <p className="sr-only">{timerLabel ?? `Accept within ${total} seconds`}</p>
        )}

        <div className={s.side()}>
          <ol aria-hidden="true" className={s.slots()}>
            {Array.from({ length: size }, (_, i) => {
              const fill =
                i === size - 1
                  ? youIn
                    ? 'ready'
                    : lost
                      ? 'lost'
                      : 'you'
                  : i < teammates
                    ? 'ready'
                    : 'waiting'
              const k = matchFoundSlotStyles({ fill })
              return (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: slots are positional.
                  key={i}
                  data-fill={fill}
                  className={k.slot()}
                  style={{ '--sk-match-found-d': `${540 + i * 60}ms` } as CSSProperties}
                >
                  <span className={k.dot()}>
                    {fill === 'you' && <span className={k.you()}>{youLabel}</span>}
                    {fill === 'lost' ? (
                      <svg aria-hidden="true" className={k.cross()} viewBox="0 0 16 16">
                        <path d={CROSS} strokeWidth={2.4} strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg aria-hidden="true" className={k.check()} viewBox="0 0 16 16">
                        <path
                          d={CHECK}
                          strokeWidth={2.4}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                </li>
              )
            })}
          </ol>
          <p className={s.status()}>{statusText}</p>
        </div>

        {hasActions && <div className={s.actions()}>{children}</div>}
      </div>
    </section>
  )
})
