import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  forwardRef,
  type ReactNode,
} from 'react'
import {
  type BracketRound,
  bracketModel,
  CHAMPION,
  teamName,
  teamSeed,
} from './bracket-beam.geometry'
import { BracketBeamMeasure } from './bracket-beam.measure'
import { bracketBeamStyles } from './bracket-beam.styles'

/** Props for {@link BracketBeam}: the bracket data plus native `<div>` attributes for the root. */
export interface BracketBeamProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /**
   * The rounds, first to last. Match `i` of a round feeds match `⌊i/2⌋` of the next; a connector
   * lands on the next match's row holding the same team name.
   */
  rounds: readonly BracketRound[]
  /**
   * The winning team's name. Lights its path through every round, sends the beams along it and
   * renders the trophy card. Omit while the tournament is running: the bracket is then static.
   */
  champion?: string
  /** The line under the champion's name, e.g. `<><b>3–1</b> grand final · seed 1</>`. */
  championMeta?: ReactNode
  /**
   * The trophy card's eyebrow. Localize it.
   * @default 'Champion'
   */
  championLabel?: string
  /**
   * The trophy column's heading. Localize it.
   * @default 'Trophy'
   */
  trophyLabel?: string
  /** A short note at the right of the trophy column's heading, e.g. `'S04'`. */
  trophyMeta?: string
  /**
   * Read by screen readers after each winning row (", winner"). Localize it.
   * @default 'winner'
   */
  winnerLabel?: string
  /**
   * Hold the current frame of the beam. Toggling it never restarts the animation.
   * @default false
   */
  paused?: boolean
  /**
   * The scrolling region's accessible name (ignored when `aria-labelledby` is set).
   * @default 'Tournament bracket'
   */
  'aria-label'?: string
}

/**
 * A single-elimination tournament bracket that sends a beam of light along the champion's path,
 * round by round, until the trophy card ignites.
 *
 * @remarks
 * - SSR/RSC: a server component (no `'use client'`). The bracket, its connectors and the lit path
 *   are server HTML and CSS, the final frame no-JS users and the first paint get. A small client
 *   island measures the real layout and draws the travelling SVG beams on the shared fx loop: it
 *   pauses off-screen and in hidden tabs, and reports `data-state` on its scroller
 *   (`[data-sk-fx="bracket-beam"] > [data-state]`).
 * - Data: match `i` of a round feeds match `⌊i/2⌋` of the next. The champion's path is found by
 *   name, backwards from the last-round match `champion` won. New data remounts the beams; change
 *   `key` to replay from the start.
 * - Accessibility: a region (`aria-label`, default 'Tournament bracket') holding one `<ol>` per
 *   round; every name and score is text, winners add an `sr-only` ", winner" (`winnerLabel`).
 *   Wires, beams and sparks are `aria-hidden`. The region is a tab stop only while it overflows.
 * - Reduced motion: one still frame, the champion's path and the trophy lit, no loops; an
 *   overflowing bracket scrolls to the trophy once.
 * - Layout: fills its container, scrolls sideways when it can't fit (fixed columns under a 640px
 *   container). Theme-aware: every color is a `--sk-*` token.
 * - The ref points at the root `<div>`; `className` merges last; `style` is merged after the
 *   internal custom properties.
 *
 * @example
 * ```tsx
 * import { BracketBeam } from '@sukunagg/fx'
 *
 * <BracketBeam
 *   champion="Crimson Vow"
 *   championMeta={<><b>3–1</b> grand final · seed 1</>}
 *   rounds={[
 *     {
 *       name: 'Semi-finals',
 *       meta: 'Bo3',
 *       matches: [
 *         { teams: [{ name: 'Crimson Vow', seed: 1 }, { name: 'Night Shift', seed: 4 }], scores: [2, 1], winner: 0 },
 *         { teams: [{ name: 'Hollow Crown', seed: 6 }, { name: 'Ember Tide', seed: 2 }], scores: [2, 1], winner: 0 },
 *       ],
 *     },
 *     {
 *       name: 'Grand final',
 *       meta: 'Bo5',
 *       matches: [{ teams: ['Crimson Vow', 'Hollow Crown'], scores: [3, 1], winner: 0 }],
 *     },
 *   ]}
 * />
 * ```
 */
export const BracketBeam = forwardRef<HTMLDivElement, BracketBeamProps>(function BracketBeam(
  {
    rounds,
    champion,
    championMeta,
    championLabel = 'Champion',
    trophyLabel = 'Trophy',
    trophyMeta,
    winnerLabel = 'winner',
    paused = false,
    'aria-label': ariaLabel = 'Tournament bracket',
    'aria-labelledby': labelledBy,
    className,
    style,
    ...rest
  },
  ref,
) {
  const model = bracketModel(rounds, champion)
  const hasChampion = champion !== undefined
  const s = bracketBeamStyles({ champion: hasChampion })
  const seeded = rounds.some((round) =>
    round.matches.some((match) => match.teams.some((team) => teamSeed(team) !== undefined)),
  )

  return (
    <div
      ref={ref}
      data-sk-fx="bracket-beam"
      className={s.root({ className })}
      style={{ '--sk-bracket-beam-rounds': rounds.length, ...style } as CSSProperties}
      {...rest}
    >
      <BracketBeamMeasure
        // New links or a new path rebuild the beams from scratch.
        key={JSON.stringify([model.links, model.trail])}
        links={model.links}
        trail={model.trail}
        champion={hasChampion}
        paused={paused}
        label={labelledBy ? undefined : ariaLabel}
        labelledBy={labelledBy}
      >
        {rounds.map((round, r) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: rounds are positional.
          <div key={r} className={s.column()}>
            <div aria-hidden="true" className={s.heading()}>
              <span>{round.name}</span>
              {round.meta && <b className={s.headingMeta()}>{round.meta}</b>}
            </div>
            <ol
              aria-label={round.meta ? `${round.name}, ${round.meta}` : round.name}
              className={s.list()}
            >
              {round.matches.map((match, i) => {
                const id = `${r}-${i}`
                const wire = model.wires.get(id)
                return (
                  // biome-ignore lint/suspicious/noArrayIndexKey: matches are positional.
                  <li key={i} className={s.slot()}>
                    <div data-match={id} className={s.match()}>
                      {match.teams.map((team, k) => {
                        const won = match.winner === k
                        const trail = model.trailRows.has(`${id}-${k}`)
                        return (
                          <div
                            // biome-ignore lint/suspicious/noArrayIndexKey: two fixed rows.
                            key={k}
                            data-row={k}
                            data-winner={won || undefined}
                            data-trail={trail || undefined}
                            className={s.row({ winner: won, trail })}
                          >
                            {seeded && <span className={s.seed({ trail })}>{teamSeed(team)}</span>}
                            <span className={s.name()}>{teamName(team)}</span>
                            <span className={s.score({ winner: won, trail })}>
                              {match.scores?.[k]}
                            </span>
                            {won && <span className="sr-only">, {winnerLabel}</span>}
                          </div>
                        )
                      })}
                    </div>
                    {wire && (
                      <span
                        aria-hidden="true"
                        className={s.wire({ dir: wire.dir, lit: wire.lit })}
                        style={
                          {
                            '--sk-bracket-beam-ys': wire.ys,
                            '--sk-bracket-beam-y': wire.y,
                            '--sk-bracket-beam-hs': wire.hs,
                            '--sk-bracket-beam-h': wire.h,
                          } as CSSProperties
                        }
                      />
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
        ))}
        {hasChampion && (
          <div className={s.column()}>
            <div aria-hidden="true" className={s.heading()}>
              <span>{trophyLabel}</span>
              {trophyMeta && <b className={s.headingMeta()}>{trophyMeta}</b>}
            </div>
            <div className={s.trophy()}>
              <div data-match={CHAMPION} className={s.card()}>
                <span aria-hidden="true" className={s.bloom()} />
                <p className={s.eyebrow()}>
                  <svg
                    aria-hidden="true"
                    focusable="false"
                    viewBox="0 0 20 14"
                    className={s.crown()}
                  >
                    <path d="M3 10.5 1.6 3.2l4.6 3.4L10 1.4l3.8 5.2 4.6-3.4L17 10.5zM3.4 13h13.2" />
                  </svg>
                  {championLabel}
                </p>
                <p className={s.title()}>
                  <span aria-hidden="true" className={s.bar()} />
                  <span className={s.titleText()}>{champion}</span>
                </p>
                {championMeta !== undefined && (
                  // DECISION(open): bracket-beam pending placeholder — a bar, not the mockup's
                  // "Awaiting grand final" line, so the component ships no extra English string.
                  <p className={s.meta()}>
                    <span
                      aria-hidden="true"
                      className={s.bar({ className: 'h-[0.6em] w-[58%]' })}
                    />
                    <span className={s.metaText()}>{championMeta}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </BracketBeamMeasure>
    </div>
  )
})
