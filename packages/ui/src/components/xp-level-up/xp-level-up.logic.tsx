import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  forwardRef,
  type ReactNode,
} from 'react'
import { xpLevelUpStyles } from './xp-level-up.styles'

/** Strings {@link XpLevelUp} renders. Override any subset through its `labels` prop. */
export interface XpLevelUpLabels {
  /**
   * Caption over the number in the badge.
   * @default 'LV'
   */
  badge: string
  /**
   * The target under the bar's left end; receives the level the bar fills toward. Wrap the level
   * in `<b>` to set it in the text color.
   * @default (n) => <>To <b>LV {n}</b></>
   */
  target: (level: number) => ReactNode
  /**
   * Screen-reader text for the badge (the drawn number is `aria-hidden`).
   * @default (n) => `Level ${n}`
   */
  level: (level: number) => string
  /**
   * Accessible name of the progress bar; receives the level it fills toward (`level + 1`).
   * @default (n) => `XP to level ${n}`
   */
  bar: (next: number) => string
}

const defaultLabels: XpLevelUpLabels = {
  badge: 'LV',
  target: (n) => (
    <>
      To <b>LV {n}</b>
    </>
  ),
  level: (n) => `Level ${n}`,
  bar: (n) => `XP to level ${n}`,
}

/** Props for {@link XpLevelUp}: native `<div>` attributes (except `title`) plus the options below. */
export interface XpLevelUpProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'title' | 'children'> {
  /**
   * The level reached. The badge counts from `level - 1` up to it when `levelUp` is set; the bar
   * then fills toward `level + 1`. Rounded to an integer. The badge number steps down for four- and
   * five-digit levels; up to 99,999 fits the hexagon.
   */
  level: number
  /**
   * Where the bar settles: progress into `level`, from 0 to 100 (clamped; non-finite → 0). It is
   * the progressbar's `aria-valuenow`.
   */
  progress: number
  /**
   * Where the fill starts, from 0 to 100 (clamped): progress through the previous level when
   * `levelUp` is set, or through `level` for a plain gain, where it is also capped at `progress`
   * (a gain never drains the bar).
   * @default 0
   */
  from?: number
  /**
   * Whether this gain crossed a level. `true` plays fill → flash → burst → count → settle;
   * `false` plays a plain XP gain (the bar fills `from` → `progress`, no burst, static badge).
   * @default true
   */
  levelUp?: boolean
  /** Eyebrow over the card: the season or pass name. Replaces the native `title` attribute. */
  title?: ReactNode
  /**
   * Headline wiped in at the burst (level-ups only).
   * @default 'Level up'
   */
  headline?: ReactNode
  /**
   * The line shown before the level-up, which the headline replaces. With `levelUp={false}` it is
   * the only heading.
   * @default 'Match complete'
   */
  prelude?: ReactNode
  /** The gain chip, e.g. `<><b>+2,450 XP</b> · Match win</>` (a `<b>` is tinted accent). */
  gain?: ReactNode
  /**
   * XP readout under the bar's right end, e.g. `'820 / 10,000 XP'` (a `<b>` is set in the text
   * color). A string also becomes the progressbar's `aria-valuetext`.
   */
  xp?: ReactNode
  /** Override any of the badge, target and screen-reader strings (English defaults). */
  labels?: Partial<XpLevelUpLabels>
  /** Content under the main row: reward tiers, actions. Rendered as is. */
  children?: ReactNode
}

const percent = (n: number) => (Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0)

/** 16 burst sparks; geometry and stagger derive from the index in CSS (no randomness). */
const SPARKS = Array.from({ length: 16 }, (_, i) => i)

/**
 * A level-up moment for a post-match or battle-pass screen: the XP bar fills to the top, flashes
 * once, the level badge bursts and counts up to the new level, then the bar settles at the
 * progress into it.
 *
 * @remarks
 * - SSR/RSC: static and RSC-safe (no `'use client'`): CSS keyframes and two `@property` integer
 *   counters only, no hooks, no DOM access. It plays once on mount, also before hydration.
 * - Replay: change its `key` (`<XpLevelUp key={matchId} … />`); it doesn't wait for visibility,
 *   so mount it when it's on screen.
 * - Reduced motion: every layer carries `motion-reduce:animate-none` and the base styles are the
 *   settled card, so the final level, bar and headline show at once. Browsers without `@property`
 *   flip the counters instead of rolling them; the end state is the same.
 * - Accessibility: the badge art, glow, sparks, flash and the transient texts are `aria-hidden`;
 *   the level is `sr-only` text (`labels.level`). The bar is a `role="progressbar"` (0–100,
 *   `aria-valuenow={progress}`, named by `labels.bar(level + 1)`, `aria-valuetext` from a string
 *   `xp`). It is not a live region: announce a level-up that appears mid-session yourself. In
 *   forced-colors mode the bar keeps a `CanvasText` outline and a `Highlight` fill.
 * - Variants: `levelUp`: `true` (default) | `false`. Under 28rem of width (a container query) the
 *   badge and headline shrink.
 * - Layout: the root is a size container, so its content doesn't size it: it fills a block, and
 *   in a shrink-to-fit parent (`w-fit` dialog, `items-center` column, `inline-flex`, an absolute
 *   toast) it takes an intrinsic 30rem, capped at the parent's width. Give it a width there if
 *   you want another. It draws no surface; place it in a `Card` or any `overflow-hidden` box,
 *   which clips the glow and sparks (they reach ~160px past the badge). Your own chrome can follow
 *   the timeline with the `animate-xp-level-up-swap-out` (1.2s) / `animate-xp-level-up-swap-in`
 *   (1.36s) utilities.
 * - The ref points at the root `<div>`; `className` merges last; `style` is spread after the
 *   internal `--sk-xp-level-up-*` custom properties.
 *
 * @example
 * ```tsx
 * import { Card, XpLevelUp } from '@sukunagg/ui'
 *
 * <Card className="overflow-hidden">
 *   <XpLevelUp
 *     key={match.id}
 *     title="Season 07 pass"
 *     level={42}
 *     from={62}
 *     progress={8}
 *     gain={<><b>+2,450 XP</b> · Match win</>}
 *     xp={<><b>820</b> / 10,000 XP</>}
 *   />
 * </Card>
 *
 * // A gain that doesn't cross a level:
 * <XpLevelUp levelUp={false} level={42} from={8} progress={31} xp="3,100 / 10,000 XP" />
 * ```
 */
export const XpLevelUp = forwardRef<HTMLDivElement, XpLevelUpProps>(function XpLevelUp(
  {
    level,
    progress,
    from = 0,
    levelUp = true,
    title,
    headline = 'Level up',
    prelude = 'Match complete',
    gain,
    xp,
    labels: labelsProp,
    children,
    className,
    style,
    ...rest
  },
  ref,
) {
  const labels = { ...defaultLabels, ...labelsProp }
  const lvl = Math.round(level)
  const at = percent(progress)
  // A level-up starts in the previous level; a plain gain only fills forward.
  const start = levelUp ? percent(from) : Math.min(percent(from), at)
  const width = String(Math.abs(lvl)).length
  const s = xpLevelUpStyles({ levelUp, digits: width >= 5 ? 5 : width === 4 ? 4 : undefined })
  const vars = {
    '--sk-xp-level-up-level': lvl,
    '--sk-xp-level-up-from': start,
    '--sk-xp-level-up-progress': at,
    ...style,
  } as CSSProperties

  return (
    <div ref={ref} className={s.root({ className })} style={vars} {...rest}>
      {title ? <p className={s.eyebrow()}>{title}</p> : null}
      <div className={s.main()}>
        <div className={s.badge()}>
          <span aria-hidden="true" className={s.glow()} />
          {levelUp ? (
            <>
              <span aria-hidden="true" className={s.ring()} />
              <span aria-hidden="true" className={s.sparks()}>
                {SPARKS.map((i) => (
                  <span
                    key={i}
                    className={s.spark()}
                    style={{ '--sk-xp-level-up-i': i } as CSSProperties}
                  />
                ))}
              </span>
            </>
          ) : null}
          <span aria-hidden="true" className={s.hexWrap()}>
            <span className={s.flare()}>
              <span className={s.hex()} />
              <span className={s.face()}>
                <span className={s.prefix()}>{labels.badge}</span>
                <span className={s.num()} />
              </span>
            </span>
          </span>
          <span className="sr-only">{labels.level(lvl)}</span>
        </div>
        <div className={s.col()}>
          <div className={s.head()}>
            <p className={s.heading()}>
              <span aria-hidden={levelUp || undefined} className={s.prelude()}>
                {prelude}
              </span>
              {levelUp ? <span className={s.headline()}>{headline}</span> : null}
            </p>
            {gain ? <p className={s.chip()}>{gain}</p> : null}
          </div>
          <div
            role="progressbar"
            aria-label={labels.bar(lvl + 1)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={at}
            aria-valuetext={typeof xp === 'string' ? xp : undefined}
            className={s.bar()}
          >
            <span className={s.track()} />
            <span className={s.barGlow()}>
              <span className={s.clip()}>
                {levelUp ? <span className={s.fillOld()} /> : null}
                <span className={s.fillNew()} />
              </span>
            </span>
            {levelUp ? <span className={s.flash()} /> : null}
          </div>
          <div className={s.meta()}>
            {levelUp ? (
              <span aria-hidden="true" className={s.targetOld()}>
                {labels.target(lvl)}
              </span>
            ) : null}
            <span className={s.targetNew()}>{labels.target(lvl + 1)}</span>
            {levelUp ? <span aria-hidden="true" className={s.pct()} /> : null}
            {xp ? <span className={s.xp()}>{xp}</span> : null}
          </div>
        </div>
      </div>
      {children}
    </div>
  )
})
