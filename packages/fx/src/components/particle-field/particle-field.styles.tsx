import { tv, type VariantProps } from '../../utils/tv'

/**
 * Slot class map for {@link ParticleField}. Pure and server-safe: no hooks, no DOM, no
 * `'use client'`.
 *
 * - The `particle-field-*` utilities and the `sk-particle-field-haze` keyframe live in
 *   `src/styles/particle-field.css` (shipped in `@sukunagg/fx/theme.css`). They read the tone
 *   colors the root sets: `--sk-particle-field-hot`, `-deep` and `-glow`.
 * - The loop owns `data-state` on the root (`group/fx`): once it has drawn (`running`, `paused`,
 *   `still`) the canvas fades in and the poster embers fade out; `off` keeps the poster.
 * - `particle-field-fade` is the mockup's 1.6 s crossfade; it is instant under reduced motion.
 */
export const particleFieldStyles = tv({
  slots: {
    root: 'group/fx relative isolate overflow-hidden bg-well text-text rtl:[--sk-particle-field-s:-1]',
    haze: 'pointer-events-none absolute inset-0 origin-bottom particle-field-haze animate-particle-field-haze group-data-[state=paused]/fx:[animation-play-state:paused]',
    embers:
      'pointer-events-none absolute inset-0 particle-field-embers particle-field-fade group-data-[state=running]/fx:opacity-0 group-data-[state=paused]/fx:opacity-0 group-data-[state=still]/fx:opacity-0',
    layer: 'pointer-events-none absolute inset-0',
    canvas:
      'block size-full opacity-0 particle-field-fade group-data-[state=running]/fx:opacity-100 group-data-[state=paused]/fx:opacity-100 group-data-[state=still]/fx:opacity-100',
    scrim: 'pointer-events-none absolute inset-0 particle-field-scrim',
    content: 'relative h-full',
  },
  variants: {
    tone: {
      accent: {
        root: '[--sk-particle-field-hot:var(--sk-accent)] [--sk-particle-field-deep:var(--sk-accent-deep)] [--sk-particle-field-glow:var(--sk-accent-glow)]',
      },
      // DECISION(open): the premium palette (amber/bone) is built from --sk-premium and
      // --sk-chart-4; no new token (docs/component-particle-field.md §11).
      premium: {
        root: '[--sk-particle-field-hot:color-mix(in_oklab,var(--sk-premium)_55%,var(--sk-chart-4))] [--sk-particle-field-deep:color-mix(in_srgb,var(--sk-chart-4)_55%,var(--sk-well))] [--sk-particle-field-glow:color-mix(in_srgb,var(--sk-premium)_45%,transparent)]',
      },
    },
  },
  defaultVariants: { tone: 'accent' },
})

export type ParticleFieldStyleProps = VariantProps<typeof particleFieldStyles>
