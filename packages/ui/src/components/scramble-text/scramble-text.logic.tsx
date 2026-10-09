import { type ComponentPropsWithoutRef, type ElementType, forwardRef, type Ref } from 'react'
import { ScrambleGlyphs } from './scramble-text.scramble'
import { scrambleTextStyles } from './scramble-text.styles'

/** Intrinsic elements {@link ScrambleText} can render as. */
export type ScrambleTextElement =
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

/**
 * Props for {@link ScrambleText}: native `<span>` attributes (minus `children` and
 * `dangerouslySetInnerHTML` — `text` is the content) plus the decode controls below.
 */
export interface ScrambleTextProps
  extends Omit<ComponentPropsWithoutRef<'span'>, 'children' | 'dangerouslySetInnerHTML'> {
  /**
   * The real text. It is what the server renders, what no-JS and reduced-motion users see, and the
   * accessible name — the decode only ever lands on it.
   */
  text: string
  /**
   * Intrinsic element to render — pick it for semantics (`'h1'` for a hero title).
   * @default 'span'
   */
  as?: ScrambleTextElement
  /**
   * Milliseconds to wait after mount before the decode starts; the glyphs stay blank meanwhile.
   * Stagger several lines by giving each a larger `delay`. Negative values count as `0`.
   * @default 0
   */
  delay?: number
  /**
   * Milliseconds the decode lasts once it starts; the last glyph locks exactly at
   * `delay + duration`. Values `<= 0` show the text immediately.
   * @default 800
   */
  duration?: number
  /**
   * Seed for the noise sequence: the same seed (and text) always decodes the same way. Change it
   * for a different pattern on otherwise identical lines.
   * @default a hash of `text`
   */
  seed?: number
}

/**
 * Decodes a short label out of glyph noise into its real text, left to right — for match-found
 * titles, lobby rosters, callsigns and reveal moments.
 *
 * @remarks
 * - SSR/RSC: RSC-safe (no `'use client'`) — it renders the real text, unsplit; only the
 *   `aria-hidden` visible line is a small client island that animates after mount with
 *   `requestAnimationFrame` (zero React re-renders per frame, seeded PRNG — no `Math.random`; the
 *   text is only split into graphemes inside the effect, so hydration always matches). Plays
 *   **on mount**; to replay, change its `key`. Changing `text`, `delay`, `duration` or `seed`
 *   restarts it.
 * - Accessibility: the real text is in the DOM once, unsplit, in an `sr-only` span (so screen
 *   readers never read noise or spell it letter by letter); the visible line is `aria-hidden`.
 *   Use `as` for headings. `prefers-reduced-motion: reduce` shows the final text with no decode.
 * - Layout: at rest (server, no-JS, reduced motion, and once the decode ends) the visible line is
 *   the real text as one text node, so kerning and wrapping are exactly those of plain text
 *   (ligatures are off). While decoding, that text keeps its place but is hidden with
 *   `visibility`, and noise is drawn in an overlay over each glyph's measured box — picked no
 *   wider than the glyph it covers — so the line never shifts or jitters, in any font. Size,
 *   weight, font and color are inherited — style it with `className` or the surrounding text.
 * - Colors: noise in `--sk-text-faint`, the locking edge in `--sk-accent` with an
 *   `--sk-accent-glow` afterglow that fades into the inherited color. An inherited text-shadow or
 *   text-stroke styles the noise too; under a gradient fill (`GradientText`) the decode draws in
 *   the inherited `color` and the gradient returns when it ends.
 * - One string per instance. Stagger lines (or the cells of a row) by rendering several instances
 *   with increasing `delay`. The ref points at the rendered element; `className` merges last.
 *
 * @example
 * ```tsx
 * import { ScrambleText } from '@sukunagg/ui'
 *
 * <ScrambleText as="h2" text="MATCH FOUND" className="font-display text-3xl font-black" />
 * <ScrambleText text="LOBBY 4471 · CUSTOM" delay={400} duration={650} />
 * <ScrambleText key={round} text={winner} seed={round} />
 * ```
 */
export const ScrambleText = forwardRef<HTMLElement, ScrambleTextProps>(function ScrambleText(
  { text, as, delay = 0, duration = 800, seed, className, ...rest },
  ref,
) {
  const Component = (as ?? 'span') as ElementType
  const s = scrambleTextStyles()
  return (
    <Component ref={ref as Ref<HTMLElement>} className={s.root({ className })} {...rest}>
      <span className={s.label()}>{text}</span>
      <ScrambleGlyphs text={text} delay={delay} duration={duration} seed={seed} />
    </Component>
  )
})
