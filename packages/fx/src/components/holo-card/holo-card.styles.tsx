import { tv, type VariantProps } from '../../utils/tv'

/**
 * Slot class map for {@link HoloCard}. Pure and server-safe: no hooks, no DOM, no 'use client'.
 *
 * The `holo-card-*` utilities, `animate-holo-card-drift` and the `--sk-holo-card-t` `@property`
 * come from `packages/fx/src/styles/holo-card.css` (shipped in `@sukunagg/fx/theme.css`). The base
 * styles are the rest frame: a flat card with its foil and glare centred. The tilt island writes
 * `--sk-holo-card-x/-y/-a` on the scene; reduced motion keeps the card flat with a static sheen.
 */
export const holoCardStyles = tv({
  slots: {
    // `group/holo`: the card draws the focus ring when the root is focus-visible (it tilts with
    // the card); the root's own outline is suppressed in favour of it.
    root: 'group/holo relative isolate block aspect-[5/7] w-50 shrink-0 outline-none',
    // The island's element: owns `data-state` (the loop writes it), the tilt variables and the
    // idle drift, which also pauses while the loop is paused (off-screen, hidden tab).
    scene: [
      'holo-card-scene absolute inset-0',
      'animate-holo-card-drift motion-reduce:animate-none',
      'data-[state=paused]:[animation-play-state:paused]',
    ],
    aura: [
      'pointer-events-none absolute -inset-x-20 -inset-y-12.5',
      'bg-[radial-gradient(closest-side,var(--sk-accent-glow),transparent)]',
      'opacity-[calc(.3+.3*var(--sk-holo-card-a))]',
      '[translate:calc(var(--sk-holo-card-x)*14px)_calc(var(--sk-holo-card-y)*10px)]',
    ],
    // Pinned dark (data-theme): a near-black contact shadow in both themes, like the mockup.
    floor: [
      'pointer-events-none absolute inset-x-[6%] -bottom-6 h-7',
      'bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--sk-well)_55%,transparent),transparent)]',
      '[translate:calc(var(--sk-holo-card-x)*-16px)_0]',
    ],
    card: [
      'holo-card-edge absolute inset-0 rounded-lg',
      'group-focus-visible/holo:outline-2 group-focus-visible/holo:outline-offset-2',
      'group-focus-visible/holo:outline-(--sk-holo-card-ring)',
    ],
    face: [
      'absolute inset-[1.5px] isolate overflow-hidden rounded-[calc(var(--sk-radius-lg)-1.5px)]',
      'bg-(--sk-holo-card-base) text-(--sk-holo-card-ink)',
    ],
    foil: 'holo-card-foil pointer-events-none absolute inset-0',
    glare: 'holo-card-glare pointer-events-none absolute inset-0',
  },
  variants: {
    // Two scale factors the CSS module multiplies into the tilt/lift and the foil/glare opacity.
    intensity: {
      normal: { root: '[--sk-holo-card-tilt:1] [--sk-holo-card-shine:1]' },
      subtle: { root: '[--sk-holo-card-tilt:0.5] [--sk-holo-card-shine:0.6]' },
    },
  },
  defaultVariants: { intensity: 'normal' },
})

/** The style props {@link holoCardStyles} accepts (`intensity`). */
export type HoloCardStyleProps = VariantProps<typeof holoCardStyles>
