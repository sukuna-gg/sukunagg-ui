import { type ComponentPropsWithoutRef, type ElementType, forwardRef, type Ref } from 'react'
import { glitchTextStyles } from './glitch-text.styles'

/** Intrinsic elements {@link GlitchText} can render as. */
export type GlitchTextElement =
  | 'span'
  | 'p'
  | 'div'
  | 'strong'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'

/** Props for {@link GlitchText}: native `<span>` attributes plus the options below. */
export interface GlitchTextProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  /**
   * Intrinsic element to render. Pick it for semantics: `'h1'` for a result banner, `'span'` for
   * a word inside a sentence.
   * @default 'span'
   */
  as?: GlitchTextElement
  /**
   * The text. It renders once as real, selectable text (the accessible name); the glitch layers
   * are `aria-hidden` copies of it, which is why it is a plain string and not markup.
   */
  children: string
  /**
   * Play the wipe-in reveal when the element mounts (the first burst lands on it). Remount with a
   * new `key` to replay it; set `false` for always-on labels that should just start glitching.
   * @default true
   */
  intro?: boolean
  /**
   * Fill the glyphs with a faint static CRT line texture (1px every 3px). Not animated, so it
   * stays under reduced motion.
   * @default false
   */
  scanline?: boolean
}

/**
 * Hits real text with short RGB-split glitch bursts, for elimination banners, match results and
 * error or offline headings.
 *
 * @remarks
 * - SSR/RSC: static and RSC-safe (no `'use client'`): CSS keyframes and `@property` only, no
 *   hooks, no DOM access, no randomness in render. Needs `@sukunagg/ui/theme.css` (or
 *   `styles.css`) for the `sk-glitch-text-*` keyframes.
 * - Motion: clean for 3.1s, then a ~0.37s burst (a band of the text jumps sideways with a
 *   red/blue edge while thin red and blue slices flick out behind it), every 3.5s while mounted.
 *   With `intro` the text first wipes in left to right and settles from a skew.
 * - Accessibility: the text is in the accessibility tree once; every copy is `aria-hidden`,
 *   `select-none` and `data-nosnippet` (find-in-page still counts the copies). The bursts move
 *   glyphs rather than flash light, once per 3.5s, so they stay under the WCAG 2.3.1 flash limit
 *   up to a font size of about 160px; clamp fluid (`vw`/`cqi`) type below that.
 *   `prefers-reduced-motion: reduce` shows the clean text: no intro, no bursts, no layers.
 * - Styling: typography comes from you (`className` or the surrounding text); offsets are in `em`
 *   so it scales. The root is `inline-block` (pass `block` to fill the row) and its `transform`
 *   is animated, so position it with `translate`/`rotate`/`scale`, not `skew-*`.
 * - Layout: the copies are painted as overflow (like a shadow), so bursts don't change the page's
 *   scroll width. Only the word's own jitter (two 52ms skew steps per burst) reaches ~0.2em past
 *   its box: a page gutter covers it; flush inside a horizontal scroller, give the scroller that
 *   much inline padding or wrap the text in `overflow-x-clip`.
 * - Cost: the keyframes animate custom properties, so the browser recalculates style every frame
 *   while it is mounted. Fine for a few headings; avoid dozens of always-on instances (a long list
 *   of `intro={false}` labels).
 * - The ref points at the rendered element; `className` merges last onto it; other native props
 *   (`id`, `aria-*`, `data-*`) spread onto it. The root carries `data-sk-glitch-text`.
 *
 * @example
 * ```tsx
 * import { GlitchText } from '@sukunagg/ui'
 *
 * <GlitchText as="h1" className="font-display text-3xl font-black uppercase leading-none">
 *   Eliminated
 * </GlitchText>
 *
 * // Replay the intro on every new round:
 * <GlitchText key={round} as="h2" scanline>Round lost</GlitchText>
 * ```
 */
export const GlitchText = forwardRef<HTMLElement, GlitchTextProps>(function GlitchText(
  { as, intro, scanline = false, className, children, ...rest },
  ref,
) {
  const Component = (as ?? 'span') as ElementType
  const s = glitchTextStyles({ intro })
  return (
    <Component
      ref={ref as Ref<HTMLElement>}
      data-sk-glitch-text=""
      className={s.root({ className })}
      {...rest}
    >
      <span className={s.frame()}>
        <span className={s.text()}>
          {children}
          <span aria-hidden="true" data-nosnippet="" className={s.fringe()}>
            {children}
          </span>
          <span aria-hidden="true" data-nosnippet="" className={s.fringeLate()}>
            {children}
          </span>
          {scanline ? (
            <span aria-hidden="true" data-nosnippet="" className={s.scanline()}>
              {children}
            </span>
          ) : null}
        </span>
        <span aria-hidden="true" data-nosnippet="" className={s.shard()}>
          <span className={s.shardInk()}>{children}</span>
        </span>
        <span aria-hidden="true" className={s.edge()} />
      </span>
    </Component>
  )
})
