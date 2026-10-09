import { type ComponentPropsWithoutRef, forwardRef, type ReactNode } from 'react'
import { holoCardStyles } from './holo-card.styles'
import { HoloCardTilt } from './holo-card.tilt'

/** Props for {@link HoloCard}: native `<div>` attributes plus the options below. */
export interface HoloCardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'aria-label'> {
  /**
   * The card's accessible name (required): what the card shows, in a sentence, e.g.
   * `"ryomen, Duelist, Crimson Vow, rating 94, legendary card"`. The root is a focusable
   * `role="group"`, so it needs a name of its own; the art's text is still read after it.
   */
  'aria-label': string
  /**
   * How strongly the card reacts: `'normal'` tilts up to 17° and lights the foil fully,
   * `'subtle'` halves the tilt, sway and lift and dims the foil and glare to 60%.
   * @default 'normal'
   */
  intensity?: 'subtle' | 'normal'
  /**
   * Freeze the card: the idle drift and sway stop where they are and the pointer and arrow keys
   * stop tilting it (arrows scroll again). This is the hook for an app-level pause control
   * (WCAG 2.2.2); the card already pauses on its own off-screen, in hidden tabs and under
   * reduced motion. Toggling it never remounts the card.
   * @default false
   */
  paused?: boolean
  /**
   * The card art, painted on the card face under the foil and glare. The face is dark in both
   * themes (it pins `data-theme="dark"`), and the art can read `--sk-holo-card-x`/`-y` (−1…1)
   * and `--sk-holo-card-a` (0…1) for parallax, plus `--sk-holo-card-hue`, `-deep`, `-ink` and
   * `-base` for color.
   */
  children?: ReactNode
}

/**
 * A holographic foil card that wraps your card art and tilts toward the pointer or the arrow keys.
 *
 * @remarks
 * - SSR/RSC: a server component (no `'use client'`, no hooks). The whole card renders on the
 *   server, foil, glare and idle sway included (pure CSS); one small client island
 *   (`holo-card.tilt.tsx`) adds the spring tilt on the shared `@sukunagg/fx` frame loop, which
 *   pauses off-screen and in hidden tabs and requests no frames once the card has settled.
 * - Motion: at rest the card sways gently and its light drifts (compositor-only transforms: no
 *   frames, no repaint); `paused` freezes both. The loop's state is `data-state`
 *   (`running | paused | still | off`) on the scene, the root's first child: select it with
 *   `[data-sk-fx="holo-card"] > [data-state]`, never on the root.
 * - Accessibility: the root is focusable (`tabIndex={0}`), `role="group"` with
 *   `aria-roledescription="player card"` and your required `aria-label`. Arrow keys tilt it,
 *   `Escape`/`Home` reset it, the focus ring is drawn on the card. Arrows with a modifier
 *   (Alt+← is Back) are left to the browser, and `Home` is only claimed to undo a key tilt. Every
 *   decorative layer is `aria-hidden`. Override `tabIndex`/`aria-roledescription` with the native
 *   props.
 * - Reduced motion: no drift, no sway, no tilt; a static diagonal sheen. Keys keep their defaults.
 * - Variants: `intensity`: 'normal' (default) | 'subtle'.
 * - Theme: the card is a dark collectible in both themes; its accent, aura and focus ring follow
 *   the page theme. Requires `@sukunagg/fx/theme.css` (Tailwind) or `@sukunagg/fx/styles.css`.
 * - Layout: 200 × 280 px by default (`w-50 aspect-[5/7]`); resize with `className`. The aura and
 *   floor shadow paint up to 80 px outside the box. The ref points at the root `<div>`;
 *   `className` merges last.
 *
 * @example
 * ```tsx
 * import { HoloCard } from '@sukunagg/fx'
 *
 * <HoloCard aria-label="ryomen, Duelist, rating 94, legendary card" paused={motionOff}>
 *   <img src="/cards/ryomen.webp" alt="" className="size-full object-cover" />
 * </HoloCard>
 * ```
 */
export const HoloCard = forwardRef<HTMLDivElement, HoloCardProps>(function HoloCard(
  { intensity, paused = false, className, children, ...rest },
  ref,
) {
  const s = holoCardStyles({ intensity })
  return (
    // biome-ignore lint/a11y/useSemanticElements: a focusable group, not a <fieldset> (charts pattern)
    <div
      ref={ref}
      data-sk-fx="holo-card"
      role="group"
      // DECISION(open): "player card" by default, overridable by the native prop, rather than a
      // dedicated prop (component doc §11).
      aria-roledescription="player card"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users tilt it with the arrow keys
      tabIndex={0}
      className={s.root({ className })}
      {...rest}
    >
      <HoloCardTilt className={s.scene()} paused={paused}>
        <span aria-hidden="true" className={s.aura()} />
        <span aria-hidden="true" data-theme="dark" className={s.floor()} />
        <div className={s.sway()}>
          {/* DECISION(open): the card is dark in both themes (the approved light mockup keeps it
              on the always-dark stage color); its accent, aura and ring follow the page theme. */}
          <div data-theme="dark" className={s.card()}>
            <div className={s.face()}>
              {children}
              <span aria-hidden="true" className={s.foil()}>
                <span className={s.band()} />
                <span className={s.dots()} />
              </span>
              <span aria-hidden="true" className={s.glare()} />
            </div>
          </div>
        </div>
      </HoloCardTilt>
    </div>
  )
})
