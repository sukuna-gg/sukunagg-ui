import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  forwardRef,
  type Key,
  type ReactNode,
} from 'react'
import {
  type BracketGrandFinal,
  doubleModel,
  dropChip,
  dropSpoken,
  matchKey,
} from './bracket-beam.double'
import {
  type BracketMatch,
  type BracketRound,
  bracketModel,
  CHAMPION,
  type PosterWire,
  teamName,
  teamSeed,
} from './bracket-beam.geometry'
import { BracketBeamMeasure } from './bracket-beam.measure'
import { bracketBeamStyles } from './bracket-beam.styles'

/** Props every {@link BracketBeam} takes, in either format, plus native `<div>` attributes. */
export interface BracketBeamSharedProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
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
   * Read by screen readers before each seed ("seed 1"), so seed and score aren't two bare
   * numbers. Localize it.
   * @default 'seed'
   */
  seedLabel?: string
  /**
   * Read by screen readers before each score ("score 2"). Localize it.
   * @default 'score'
   */
  scoreLabel?: string
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

/** Single-elimination props for {@link BracketBeam} (the default format). */
export interface BracketBeamSingleProps extends BracketBeamSharedProps {
  /**
   * Single elimination: one column per round, matches linked by position.
   * @default 'single'
   */
  format?: 'single'
  /**
   * The rounds, first to last. Match `i` of a round feeds match `⌊i/2⌋` of the next; a connector
   * lands on the next match's row holding the same team name.
   */
  rounds: readonly BracketRound[]
}

/** Double-elimination props for {@link BracketBeam} (`format="double"`). */
export interface BracketBeamDoubleProps extends BracketBeamSharedProps {
  /** Double elimination: an upper and a lower bracket, a grand final and an optional reset. */
  format: 'double'
  /**
   * The upper bracket's rounds, first to last. Every match needs an `id` and says where its
   * teams go next: `next.winner` (a connector) and `next.loser` (a drop into the lower bracket).
   * The upper final's `next.winner` is the grand final's `id`.
   */
  upper: readonly BracketRound[]
  /**
   * The lower bracket's rounds, first to last, linked the same way (`id`, `next.winner`); the
   * lower final's `next.winner` is the grand final's `id`. Round `i` shares a column with upper
   * round `i`.
   */
  lower: readonly BracketRound[]
  /** The grand final, the optional bracket reset, their column names and their meta. */
  grandFinal: BracketGrandFinal
  /**
   * The upper band's label, and its group's accessible name. Localize it.
   * @default 'Upper bracket'
   */
  upperLabel?: string
  /**
   * The lower band's label, and its group's accessible name. Localize it.
   * @default 'Lower bracket'
   */
  lowerLabel?: string
  /**
   * The drop chip's text on a row whose team dropped from an upper match, from that match's round
   * and its 0-based index in the round. Default: the round name's initials plus the match number
   * (`'SF1'` for 'Semi-final' match 0; no number when the round has one match).
   */
  dropLabel?: (round: BracketRound, matchIndex: number) => string
  /**
   * What screen readers hear for a drop chip, after the team's name. Localize it. Default:
   * `'dropped from <round name> <matchIndex + 1>'` (no number when the round has one match).
   */
  dropSpokenLabel?: (roundName: string, matchIndex: number) => string
}

/**
 * Props for {@link BracketBeam}: single elimination (`rounds`) or double elimination
 * (`format="double"`, `upper`, `lower`, `grandFinal`), plus native `<div>` attributes for the root.
 */
export type BracketBeamProps = BracketBeamSingleProps | BracketBeamDoubleProps

/** Every prop of either format, all readable (the component narrows on `format` itself). */
type AnyProps = BracketBeamSharedProps &
  Omit<Partial<BracketBeamDoubleProps>, 'format'> & {
    format?: 'single' | 'double'
    rounds?: readonly BracketRound[]
  }

/** What every match slot needs, in either format. */
interface SlotContext {
  s: ReturnType<typeof bracketBeamStyles>
  seeded: boolean
  seedLabel: string
  scoreLabel: string
  winnerLabel: string
  trailRows: ReadonlySet<string>
  wires: ReadonlyMap<string, PosterWire>
  /** Double elimination: each drop chip's text and spoken label, by row (`'<match>-<row>'`). */
  drops?: ReadonlyMap<string, readonly [chip: string, spoken: string]>
}

/** One match: its rows (seed, drop chip, name, score) and the CSS poster wire leaving it. */
function matchSlot(ctx: SlotContext, match: BracketMatch, id: string, i: number) {
  const { s } = ctx
  const wire = ctx.wires.get(id)
  return (
    <li key={i} className={s.slot()}>
      <div data-match={id} className={s.match()}>
        {match.teams.map((team, k) => {
          const won = match.winner === k
          const trail = ctx.trailRows.has(`${id}-${k}`)
          const seed = teamSeed(team)
          const score = match.scores?.[k]
          const drop = ctx.drops?.get(`${id}-${k}`)
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: two fixed rows.
              key={k}
              data-row={k}
              data-winner={won || undefined}
              data-trail={trail || undefined}
              className={s.row({ winner: won, trail })}
            >
              {ctx.seeded && (
                <span className={s.seed({ trail })}>
                  {seed !== undefined && <span className="sr-only">{ctx.seedLabel} </span>}
                  {seed}
                </span>
              )}
              {drop && (
                <span aria-hidden="true" data-drop="" title={drop[1]} className={s.drop({ trail })}>
                  {`▼ ${drop[0]}`}
                </span>
              )}
              <span className={s.name()}>{teamName(team)}</span>
              {drop && <span className="sr-only">{`, ${drop[1]},`}</span>}
              <span className={s.score({ winner: won, trail })}>
                {score !== undefined && <span className="sr-only">{ctx.scoreLabel} </span>}
                {score}
              </span>
              {won && <span className="sr-only">, {ctx.winnerLabel}</span>}
            </div>
          )
        })}
      </div>
      {wire && posterWire(s, wire)}
    </li>
  )
}

/**
 * A CSS connector of the server poster: two bordered halves, geometry in inline custom
 * properties. Inside its match's slot (single elimination), or a grid child at `wire.grid`.
 */
function posterWire(s: SlotContext['s'], wire: PosterWire, key?: Key) {
  const { grid } = wire
  return (
    <span
      key={key}
      aria-hidden="true"
      className={s.wire({
        dir: wire.dir,
        lit: wire.lit,
        place: grid === undefined ? undefined : wire.over ? 'over' : 'end',
      })}
      style={
        {
          ...(grid !== undefined && { gridColumn: grid }),
          '--sk-bracket-beam-ys': wire.ys,
          '--sk-bracket-beam-y': wire.y,
          '--sk-bracket-beam-hs': wire.hs,
          '--sk-bracket-beam-h': wire.h,
        } as CSSProperties
      }
    />
  )
}

/**
 * One round column: its heading (a visual duplicate) and its `<ol>` of matches named by the
 * round. `id(i)` is match `i`'s `data-match`; `span` makes it a grand-final/reset column.
 */
function roundColumn(
  ctx: SlotContext,
  round: BracketRound,
  key: Key,
  id: (i: number) => string,
  span?: boolean,
) {
  const { s } = ctx
  return (
    <div key={key} className={s.column({ span })}>
      <div aria-hidden="true" className={s.heading()}>
        <span>{round.name}</span>
        {round.meta && <b className={s.headingMeta()}>{round.meta}</b>}
      </div>
      <ol
        aria-label={round.meta ? `${round.name}, ${round.meta}` : round.name}
        className={s.list()}
      >
        {round.matches.map((match, i) => matchSlot(ctx, match, id(i), i))}
      </ol>
    </div>
  )
}

/**
 * A tournament bracket that sends a beam of light along the champion's path, round by round,
 * until the trophy card ignites: single elimination, or double elimination with an upper and a
 * lower bracket, a grand final and the optional bracket reset.
 *
 * @remarks
 * - SSR/RSC: a server component (no `'use client'`). The bracket, its connectors and the lit path
 *   are server HTML and CSS, the final frame no-JS users and the first paint get. A small client
 *   island measures the real layout and draws the travelling SVG beams on the shared fx loop: it
 *   pauses off-screen and in hidden tabs, and reports `data-state` on its scroller
 *   (`[data-sk-fx="bracket-beam"] > [data-state]`).
 * - Single elimination (default): match `i` of a round feeds match `⌊i/2⌋` of the next. The
 *   champion's path is found by name, backwards from the last-round match `champion` won.
 * - Double elimination (`format="double"`): matches link explicitly by `id` and
 *   `next.winner`/`next.loser`. The upper band sits over the lower one (round `i` of each in
 *   column `i`); the grand final, the reset (only when given) and the trophy span both. Loser
 *   links draw no wire: the row the team drops into shows a chip ("▼ SF1"). The path follows the
 *   champion forward from their first match, through the drop chip when they came back from the
 *   lower bracket (the upper match they lost is lit too). Unknown ids, a match fed by more than
 *   two links, a winner link that doesn't move right, or a cycle throw in development; production
 *   renders the bracket without wires.
 * - New data remounts the beams; change `key` to replay from the start.
 * - Accessibility: a region (`aria-label`, default 'Tournament bracket') holding one `<ol>` per
 *   round (in double elimination, inside one group per band named by its label); every name, seed
 *   and score is text, a row reads "seed 1 Crimson Vow score 2, winner" (`sr-only` words,
 *   localized by `seedLabel`, `scoreLabel` and `winnerLabel`), and a dropped team's row adds
 *   ", dropped from Semi-final 1," after its name (`dropSpokenLabel`). Wires, beams, sparks and the
 *   visible chip are `aria-hidden`. The region is a tab stop only while it overflows.
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
 *
 * @example
 * ```tsx
 * import { BracketBeam } from '@sukunagg/fx'
 *
 * // Four teams, double elimination: Night Shift drops after the first round and comes back.
 * <BracketBeam
 *   format="double"
 *   champion="Night Shift"
 *   upper={[
 *     {
 *       name: 'Semi-final',
 *       matches: [
 *         { id: 'sf1', teams: ['Crimson Vow', 'Night Shift'], scores: [2, 1], winner: 0, next: { winner: 'uf', loser: 'lr1' } },
 *         { id: 'sf2', teams: ['Ember Tide', 'Hollow Crown'], scores: [2, 0], winner: 0, next: { winner: 'uf', loser: 'lr1' } },
 *       ],
 *     },
 *     { name: 'Upper final', matches: [{ id: 'uf', teams: ['Crimson Vow', 'Ember Tide'], scores: [2, 0], winner: 0, next: { winner: 'gf', loser: 'lf' } }] },
 *   ]}
 *   lower={[
 *     { name: 'Lower round 1', matches: [{ id: 'lr1', teams: ['Night Shift', 'Hollow Crown'], scores: [2, 0], winner: 0, next: { winner: 'lf' } }] },
 *     { name: 'Lower final', matches: [{ id: 'lf', teams: ['Night Shift', 'Ember Tide'], scores: [2, 1], winner: 0, next: { winner: 'gf' } }] },
 *   ]}
 *   grandFinal={{
 *     meta: 'Bo5',
 *     match: { id: 'gf', teams: ['Crimson Vow', 'Night Shift'], scores: [1, 3], winner: 1 },
 *     reset: { teams: ['Crimson Vow', 'Night Shift'], scores: [2, 3], winner: 1 },
 *   }}
 * />
 * ```
 */
export const BracketBeam = forwardRef<HTMLDivElement, BracketBeamProps>(
  function BracketBeam(props, ref) {
    const {
      format,
      rounds = [],
      upper = [],
      lower = [],
      grandFinal,
      upperLabel = 'Upper bracket',
      lowerLabel = 'Lower bracket',
      dropLabel = dropChip,
      dropSpokenLabel,
      champion,
      championMeta,
      championLabel = 'Champion',
      trophyLabel = 'Trophy',
      trophyMeta,
      winnerLabel = 'winner',
      seedLabel = 'seed',
      scoreLabel = 'score',
      paused = false,
      'aria-label': ariaLabel = 'Tournament bracket',
      'aria-labelledby': labelledBy,
      className,
      style,
      ...rest
    } = props as AnyProps
    const double = format === 'double'
    const gf = grandFinal as BracketGrandFinal // read only in double elimination
    const reset = double ? gf.reset : undefined
    const dm = double ? doubleModel(upper, lower, gf, champion) : undefined
    const model = dm ?? bracketModel(rounds, champion)
    const hasChampion = champion !== undefined
    const s = bracketBeamStyles({ champion: hasChampion, double })
    const all = double
      ? [...upper, ...lower, { name: '', matches: reset ? [gf.match, reset] : [gf.match] }]
      : rounds
    const ctx: SlotContext = {
      s,
      seeded: all.some((round) =>
        round.matches.some((match) => match.teams.some((team) => teamSeed(team) !== undefined)),
      ),
      seedLabel,
      scoreLabel,
      winnerLabel,
      trailRows: model.trailRows,
      // Double elimination draws its wires as grid children instead (below).
      wires: dm ? new Map() : model.wires,
    }
    const rows = [...model.trailRows]

    let columns: ReactNode
    if (dm) {
      ctx.drops = new Map(
        [...dm.drops].map(([row, { round, index }]) => [
          row,
          [
            dropLabel(round, index),
            dropSpokenLabel ? dropSpokenLabel(round.name, index) : dropSpoken(round, index),
          ] as const,
        ]),
      )
      const { meta, name = 'Grand final', resetName = 'Reset' } = gf
      columns = (
        <>
          {(
            [
              ['u', upper, upperLabel],
              ['l', lower, lowerLabel],
            ] as const
          ).map(([b, bandRounds, bandLabel]) => (
            // biome-ignore lint/a11y/useSemanticElements: a named group of lists, not a form <fieldset>
            <div
              key={b}
              role="group"
              aria-label={bandLabel}
              className={s.band({ lower: b === 'l' })}
            >
              <div aria-hidden="true" className={s.bandLabel()}>
                {bandLabel}
              </div>
              {bandRounds.map((round, r) => roundColumn(ctx, round, r, (i) => matchKey(b, r, i)))}
            </div>
          ))}
          {roundColumn(ctx, { name, meta, matches: [gf.match] }, 'gf', () => 'gf', true)}
          {reset &&
            roundColumn(ctx, { name: resetName, meta, matches: [reset] }, 'gr', () => 'gr', true)}
          {[...dm.wires].map(([key, wire]) => posterWire(s, wire, key))}
        </>
      )
    } else {
      columns = rounds.map((round, r) => roundColumn(ctx, round, r, (i) => `${r}-${i}`))
    }

    return (
      <div
        ref={ref}
        data-sk-fx="bracket-beam"
        className={s.root({ className })}
        style={
          dm
            ? ({
                '--sk-bracket-beam-rounds': dm.band + (reset ? 2 : 1),
                '--sk-bracket-beam-band': dm.band,
                ...style,
              } as CSSProperties)
            : ({ '--sk-bracket-beam-rounds': rounds.length, ...style } as CSSProperties)
        }
        {...rest}
      >
        <BracketBeamMeasure
          // New links or a new path rebuild the beams from scratch.
          key={JSON.stringify([model.links, model.trail, rows])}
          links={model.links}
          trail={model.trail}
          rows={rows}
          champion={hasChampion}
          double={double || undefined}
          paused={paused}
          label={labelledBy ? undefined : ariaLabel}
          labelledBy={labelledBy}
        >
          {columns}
          {hasChampion && (
            <div className={s.column({ span: double })}>
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
  },
)
