import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
  forwardRef,
  type Ref,
} from 'react'
import { borderBeamStyles } from './border-beam.styles'

/** Elements {@link BorderBeam} can render as its root. */
export type BorderBeamElement = 'div' | 'article' | 'section' | 'li'

/** Props for {@link BorderBeam}: native `<div>` attributes plus the beam options below. */
export interface BorderBeamProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * Intrinsic element to render as the root — use `article` when the beam IS the card, `li` inside
   * a list of cards.
   * @default 'div'
   */
  as?: BorderBeamElement
  /**
   * Beam color: `accent` is the crimson `--sk-accent`; `premium` is the bone `--sk-premium` warmed
   * toward gold, for paid or season-pass surfaces. Each tone is tuned per theme (a white-hot head
   * on dark, a flat one on light).
   * @default 'accent'
   */
  tone?: 'accent' | 'premium'
  /**
   * How fast the beam laps the border: `slow` 6.5s, `normal` 4s, `fast` 2.5s per lap.
   * @default 'normal'
   */
  speed?: 'slow' | 'normal' | 'fast'
  /**
   * Where the beam starts, as a fraction of a lap (`0.5` = half a lap ahead). Give several beams on
   * one screen different phases so they don't orbit in lockstep. Ignored unless finite.
   * @default 0
   */
  phase?: number
}

/**
 * Sends a short light around the border of a card — a featured match, a season pass, the plan you
 * want picked — to mark the one thing on a screen that deserves attention.
 *
 * @remarks
 * - SSR/RSC: static and RSC-safe (no `'use client'`) — pure CSS: a registered
 *   `--sk-border-beam-angle` animated by one keyframe drives conic-gradient layers. No hooks, no
 *   DOM access, nothing to hydrate. The orbit is a loop, so there is nothing to replay.
 * - Shape: the root defaults to `rounded-lg` and every layer is `rounded-[inherit]`. Either make
 *   the BorderBeam the card (`className="border border-line bg-surface p-5"`, the beam rides that
 *   border) or wrap a `Card` (pass the card's `rounded-*` if it isn't `lg`, and give the card
 *   `h-full` so it fills a stretched wrapper). Don't add `overflow-hidden` to the root: the glow
 *   sits just outside the border box. On a wide, short card (or a tall, narrow one, past 3:2) the
 *   tail gets shorter so the head doesn't race along the long edges.
 * - Layers: a blurred glow and an inner sheen paint under `children`; the 1.5px ring paints over
 *   them, so it also covers a wrapped card's border (an opaque wrapped card hides the sheen). All
 *   three are `aria-hidden` and `pointer-events-none`. Glow and sheen brighten on hover /
 *   focus-within.
 * - Accessibility: decoration only — the component adds no role, name or focus stop; `children`
 *   carry the meaning (give an `as="article"` card an `aria-label` or a heading). A single highlight
 *   passes any point at most once per lap (≥ 2.5s), far below the WCAG 2.3.1 flash threshold.
 * - Reduced motion: `prefers-reduced-motion: reduce` stops every layer, hides glow and sheen, and
 *   leaves the ring as a still, quiet tint of the beam color around the whole border.
 * - Variants: `tone`: 'accent' (default) | 'premium'; `speed`: 'slow' | 'normal' (default) |
 *   'fast'. Colors are `--sk-*` tokens mixed per tone, so they follow `data-theme`.
 * - The ref points at the root; `className` merges last (e.g. `rounded-md` replaces the default
 *   radius); `style` is merged after the internal `--sk-border-beam-phase`.
 *
 * @example
 * ```tsx
 * import { BorderBeam } from '@sukunagg/ui'
 *
 * <BorderBeam as="article" aria-label="Featured match" className="border border-line bg-surface p-5">
 *   <h3>Crimson Vow vs Night Shift</h3>
 *   <p>Grand final · Map 4</p>
 * </BorderBeam>
 * ```
 *
 * @example
 * ```tsx
 * // Wrap an existing card; offset a second beam so the two don't move in lockstep.
 * import { BorderBeam, Card } from '@sukunagg/ui'
 *
 * <BorderBeam tone="premium" speed="slow" phase={0.45}>
 *   <Card tone="premium" className="h-full">
 *     Season 07 Pass
 *   </Card>
 * </BorderBeam>
 * ```
 */
export const BorderBeam = forwardRef<HTMLElement, BorderBeamProps>(function BorderBeam(
  { as, tone, speed, phase, className, style, children, ...rest },
  ref,
) {
  const Component = (as ?? 'div') as ElementType
  const s = borderBeamStyles({ tone, speed })
  const vars =
    typeof phase === 'number' && Number.isFinite(phase)
      ? ({ '--sk-border-beam-phase': phase } as CSSProperties)
      : undefined
  return (
    <Component
      ref={ref as Ref<HTMLElement>}
      className={s.root({ className })}
      style={vars || style ? { ...vars, ...style } : undefined}
      {...rest}
    >
      <span aria-hidden="true" data-sk-border-beam="glow" className={s.glow()} />
      <span aria-hidden="true" data-sk-border-beam="sheen" className={s.sheen()} />
      {children}
      <span aria-hidden="true" data-sk-border-beam="ring" className={s.ring()} />
    </Component>
  )
})
