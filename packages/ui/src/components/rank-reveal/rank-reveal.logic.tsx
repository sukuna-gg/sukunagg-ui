import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  forwardRef,
  type ReactNode,
} from 'react'
import { rankRevealStyles } from './rank-reveal.styles'

/** Props for {@link RankReveal}. Extends the native `<div>` except `title` and `children`. */
export interface RankRevealProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'title' | 'children'> {
  /**
   * The new rank, e.g. "Master". Rendered in a real heading (see `headingLevel`), so the rank is
   * never only in the crest.
   */
  title: ReactNode
  /** Division or tier numeral shown after the title in the tone color: "I", "III", "2". */
  division?: ReactNode
  /**
   * Small uppercase line above the title. Pass `null` to leave it out.
   * @default 'Rank up'
   */
  eyebrow?: ReactNode
  /**
   * One line under the title: the change, e.g. "Diamond III → **Master I** · *+32 RR*".
   * `<strong>` renders in the full text color and `<em>` in premium with tabular numbers; hide
   * arrows from screen readers (`aria-hidden`) and give them a word ("to").
   */
  description?: ReactNode
  /**
   * The centerpiece, about 96–120px (the orbit is sized for that). Hidden from screen readers like
   * the rest of the effect layer — the title carries the meaning.
   * @default the built-in crest
   */
  emblem?: ReactNode
  /**
   * Burst color: crimson `accent`, or the bone/gold `premium` treatment for top tiers.
   * @default 'accent'
   */
  tone?: 'accent' | 'premium'
  /**
   * Element used for `title`, to fit the page outline. `'p'` when the screen already has its own
   * heading.
   * @default 'h2'
   */
  headingLevel?: 'h2' | 'h3' | 'h4' | 'p'
}

const SPARKS = 10
const PIPS = 8
const i = (n: number) => ({ '--sk-rank-reveal-i': n }) as CSSProperties

/**
 * Celebrates a new rank: a crest bursts in over a ray field while an orbit draws around it and the
 * rank name rises into place. For a post-match or season-reward screen, once per promotion.
 *
 * @remarks
 * - SSR/RSC: static and RSC-safe (no `'use client'`) — CSS keyframes only, no hooks, no DOM access.
 *   It **plays once on mount**; to replay, remount it with a new `key`. There is no hidden
 *   pre-state: the base styles are the final frame, so no-JS and server renders show the full
 *   reveal.
 * - Accessibility: the whole effect layer (and a custom `emblem`) is `aria-hidden`; the eyebrow,
 *   the title (a real heading, `headingLevel`) and the description are real text in reading order.
 *   It is not a live region — pass `role="status"` if the reveal appears after an action and should
 *   be announced. Only one crest brighten and two small glints flash (WCAG 2.3.1).
 * - Reduced motion: every part carries `motion-reduce:animate-none`, so the settled frame shows at
 *   once and the decorative loops (ray spin, halo breathe) stop.
 * - Variants: `tone`: 'accent' (default) | 'premium'.
 * - Layout: fills its container's width, clips the ray field, and centers itself vertically; give
 *   it a stage about 320px tall (a card, a dialog). It paints only a soft tone glow behind the
 *   crest (no background of its own), so it sits seamlessly inside a bigger card. The title steps
 *   down to `text-3xl` below 420px. The pips' knock-out ring is `--sk-surface`, the stage it is
 *   designed on. Load Archivo with its `wdth` axis for the expanded title (the library does not
 *   bundle the font).
 * - The ref points at the root `<div>` (`data-sk-rank-reveal`); `className` merges last.
 *
 * @example
 * ```tsx
 * import { RankReveal } from '@sukunagg/ui'
 *
 * <RankReveal
 *   key={promotion.id}
 *   title="Master"
 *   division="I"
 *   description={
 *     <>
 *       Diamond III <span aria-hidden="true">→</span>
 *       <span className="sr-only">to</span> <strong>Master I</strong> · <em>+32 RR</em>
 *     </>
 *   }
 * />
 * ```
 */
export const RankReveal = forwardRef<HTMLDivElement, RankRevealProps>(function RankReveal(
  {
    title,
    division,
    eyebrow = 'Rank up',
    description,
    emblem,
    tone,
    headingLevel: Heading = 'h2',
    className,
    ...rest
  },
  ref,
) {
  const s = rankRevealStyles({ tone })
  return (
    <div ref={ref} data-sk-rank-reveal="" className={s.root({ className })} {...rest}>
      <div aria-hidden="true" className={s.fx()}>
        <div className={s.anchor()}>
          <span className={s.beams()}>
            <span className={s.rays()} />
            <span className={s.raysAlt()} />
            <span className={s.halo()} />
          </span>
          <span className={s.wave()} />
          <span className={s.waveAlt()} />
          <span className={s.sparks()}>
            {Array.from({ length: SPARKS }, (_, n) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: positional, static decoration.
              <span key={n} className={s.spark()} style={i(n)} />
            ))}
          </span>
          <svg aria-hidden="true" viewBox="0 0 200 200" className={s.orbit()}>
            <g className={s.ticks()}>
              <path
                pathLength={39}
                d="M23.5 48.89A92 92 0 1 1 23.5 151.11"
                className={s.tickArc()}
              />
            </g>
            <circle cx="100" cy="100" r="74" pathLength={1} className={s.orbitRing()} />
          </svg>
          <span className={s.pips()}>
            {Array.from({ length: PIPS }, (_, n) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: positional, static decoration.
              <span key={n} className={s.pip()} style={i(n)} />
            ))}
          </span>
          <span className={s.crest()}>
            <span className={s.flash()}>
              {emblem ?? (
                <span data-theme="dark" className={s.crestArt()}>
                  <span className={s.crestFace()} />
                  <span className={s.crestTop()} />
                  <span className={s.crestBottom()} />
                  <span className={s.crestRim()} />
                  <span className={s.crestCore()} />
                  <span className={s.crestLine()} />
                  <span className={s.crestLineCore()} />
                  <span className={s.crestFlame()} />
                </span>
              )}
            </span>
          </span>
          <span className={s.glint()} />
          <span className={s.glintAlt()} />
        </div>
      </div>
      <div className={s.copy()}>
        {eyebrow ? (
          <p className={s.eyebrow()}>
            <span className={s.eyebrowText()}>{eyebrow}</span>
          </p>
        ) : null}
        <Heading className={s.title()}>
          <span className={s.titleText()}>
            {title}
            {division ? (
              <>
                {' '}
                <span className={s.division()}>{division}</span>
              </>
            ) : null}
          </span>
        </Heading>
        {description ? (
          <p className={s.description()}>
            <span className={s.descriptionText()}>{description}</span>
          </p>
        ) : null}
      </div>
    </div>
  )
})
