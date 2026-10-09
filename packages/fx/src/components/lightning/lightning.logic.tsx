import { type ComponentPropsWithoutRef, type CSSProperties, forwardRef } from 'react'
import type { LightningIntensity } from './lightning.storm'
import { lightningStyles } from './lightning.styles'
import { LightningCanvas } from './lightning.webgl'

/** Props for {@link Lightning}: native `<div>` attributes plus the options below. */
export interface LightningProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * How often and how hard the bolt strikes: `'calm'` (every 2.6–5 s, softer), `'normal'`
   * (every 1.2–2.7 s) or `'storm'` (every 1–1.7 s, brighter, more branches). Every setting stays at
   * or under three flashes a second. Applies live, without a remount: the resting brightness and
   * flash strength change at once; the strike cadence and branch odds change from the next strike.
   * @default 'normal'
   */
  intensity?: LightningIntensity
  /**
   * Where the bolt stands, as a fraction of the width (0 = left edge, 1 = right edge; clamped).
   * Leave it unset for the responsive default, or set it to keep the bolt clear of your copy.
   *
   * A layout setting, not something to animate: each new value restarts the effect (a fresh WebGL
   * context and shader, a crossfade from the poster and a new storm that strikes at once). Set it
   * once per layout; don't drive it from a slider, a scroll position or a tween.
   * @default 0.66, or 0.8 when the effect is narrower than 720 px
   */
  position?: number
  /**
   * Hold the current frame. Wire it to a pause control when the banner sits beside content people
   * read (WCAG 2.2.2); the `WithPauseControl` story is a copy-pasteable toggle. The effect already
   * pauses off-screen, in hidden tabs and under reduced motion.
   * @default false
   */
  paused?: boolean
}

// The frozen route (`FROZEN` in lightning.storm.ts) traced from the shader into SVG user units:
// x is centered on the bolt, y runs 0–1000 down the height. The poster, the reduced-motion still
// frame and the first live frame all show this bolt.
const TRUNK =
  'M44 -30 37 -7 29 9 26 31 29 42 19 54 22 65 15 88 18 111 16 122 29 134 30 144 26 157 15 169 16 ' +
  '179 10 192 11 203 17 214 10 226 16 237 -13 284 -9 305 18 329 23 340 36 353 28 374 30 409 23 ' +
  '429 30 443 50 466 53 476 53 489 58 500 51 511 49 524 26 549 23 571 -3 619 4 642 -9 683 -8 712 ' +
  '-28 737 -25 745 -11 761 -13 783 -7 798 -16 809 -22 831 -54 856 -83 892 -79 903 -89 926 -88 ' +
  '941 -92 950 -86 992 -89 1004 -87 1015 -90 1029'
const BRANCH =
  'M28 400 12 427 13 436 7 445 12 456 10 460 -10 478 -9 482 -16 491 -15 496 -30 513 -29 519 -39 ' +
  '526 -63 536 -70 546 -89 555 -115 579 -119 591 -129 601 -131 609 -169 651 -172 661 -170 670 ' +
  '-194 684 -195 691 -205 699M-39 526 -55 537 -58 546 -76 557 -74 565 -70 570 -77 579 -71 592 -76 ' +
  '601 -72 608 -76 618 -67 632 -57 642 -59 651 -53 662 -42 670 -55 685 -48 691 -47 700'

/**
 * A crackling crimson lightning bolt behind a hero banner: one WebGL shader on the shared fx loop,
 * over a server-rendered SVG poster of the same bolt. Put the banner content in `children`.
 *
 * @remarks
 * - SSR/RSC: a server component (no `'use client'`, no hooks). The server renders the always-dark
 *   root, the SVG poster and `children`; the WebGL canvas is a client island that mounts in an
 *   effect and fades in over the poster once it has drawn. No-JS, no-WebGL (`data-state="off"`) and
 *   a lost GPU context (`"lost"`) show the poster.
 * - Always dark: `data-theme="dark"` is pinned on the root (like VideoPlayer), so the stage and the
 *   inherited `text-text` resolve dark in every page theme. Colors come from `--sk-text`,
 *   `--sk-accent`, `--sk-accent-deep` and `--sk-bg`. Token utilities passed in `className`
 *   (shadows, borders, rings) resolve in the dark palette too, so put page-themed chrome such as
 *   `shadow-card` on a wrapper element.
 * - Layout: `children` render in normal flow above the effect and give the root its height (or size
 *   it with `className`, e.g. `h-96`). The root is a `@container`, so overlay chrome can use
 *   `@max-[720px]:` variants against the effect's width. Below 400 px the frozen bolt (poster,
 *   still frame, first strike) drops its fork, which would otherwise reach into a phone card's copy.
 * - Accessibility: the effect is `aria-hidden` and not focusable; `children` stay real, readable
 *   DOM. At most three flashes in any second (WCAG 2.3.1): strikes are at least 1 s apart, each one
 *   flash plus one echo. Keep copy off the bolt (`position`) or add a scrim behind it.
 * - Motion: one shared `requestAnimationFrame`, paused off-screen and in hidden tabs; reduced motion
 *   draws one still frame of the poster's bolt. The loop reports `data-state` on the root:
 *   `running | paused | still | lost | off` (absent on the server).
 * - The ref points at the root `<div>`; `className` merges last (`tailwind-merge`).
 *
 * @example
 * ```tsx
 * import { Lightning } from '@sukunagg/fx'
 *
 * <Lightning intensity="storm" className="rounded-lg">
 *   <div className="flex min-h-96 flex-col justify-center gap-3 px-12">
 *     <h2 className="font-display text-3xl font-black uppercase">Grand Final</h2>
 *     <p className="text-text-dim">Crimson Vow vs Night Shift · Map 4</p>
 *   </div>
 * </Lightning>
 * ```
 */
export const Lightning = forwardRef<HTMLDivElement, LightningProps>(function Lightning(
  { intensity = 'normal', position, paused = false, className, children, ...rest },
  ref,
) {
  const s = lightningStyles()
  const x = Number.isFinite(position) ? Math.min(1, Math.max(0, position as number)) : undefined
  return (
    <div
      {...rest}
      ref={ref}
      data-sk-fx="lightning"
      data-theme="dark"
      className={s.root({ className })}
    >
      <div
        aria-hidden="true"
        className={s.stage()}
        style={x === undefined ? undefined : ({ '--sk-lightning-x': x } as CSSProperties)}
      >
        <div className={s.poster()}>
          <svg aria-hidden="true" className={s.glow()} viewBox="-500 0 1000 1000">
            <path d={TRUNK} />
            <path className={s.glowBranch()} d={BRANCH} />
          </svg>
          <svg aria-hidden="true" className={s.bolt()} viewBox="-500 0 1000 1000">
            <path d={TRUNK} />
            <path className={s.boltBranch()} d={BRANCH} />
          </svg>
        </div>
        {/* A new position remounts the island, so the still and paused frames pick it up too
            (the loop has no repaint hook yet; until it does, `position` is a layout setting). */}
        <LightningCanvas
          key={x ?? 'auto'}
          intensity={intensity}
          paused={paused}
          className={s.canvas()}
        />
      </div>
      {children}
    </div>
  )
})
