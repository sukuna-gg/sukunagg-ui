import { tv, type VariantProps } from '../../utils/tv'

// Every beam layer: decoration only, shaped by the root's radius, orbiting on the shared angle.
// The tone variables pick their dark or light value with `light-dark()`, which follows
// `color-scheme`. Theme blocks don't set `color-scheme` yet (roadmap T2), so each layer derives it
// from the nearest `data-theme` here — a dark island inside a light page stays dark.
// DECISION(open): drop these three scheme classes once every theme block sets `color-scheme` (T2).
const layer = [
  'pointer-events-none absolute rounded-[inherit]',
  'animate-border-beam-orbit motion-reduce:animate-none',
  'scheme-dark in-data-[theme=light]:scheme-light [[data-theme=light]_[data-theme=dark]_&]:scheme-dark',
]

// Glow and sheen brighten while the card is hovered or holds focus.
const brighten = [
  'transition-opacity duration-slow ease-sukuna motion-reduce:transition-none',
  'group-hover/border-beam:opacity-100 group-focus-within/border-beam:opacity-100',
]

/**
 * Slot class map for {@link BorderBeam}. Pure and server-safe — no hooks, no DOM, no 'use client'.
 *
 * The `animate-border-beam-orbit` and `border-beam-{ring,glow,sheen}` utilities, the
 * `sk-border-beam-orbit` keyframe and the registered `--sk-border-beam-angle` are emitted into the
 * generated `theme.css` from `scripts/motion/border-beam.ts`. Tones and speeds only set
 * `--sk-border-beam-*` variables on the root (literal arbitrary properties, rule 7); the layers
 * read them. Under reduced motion every layer stops, glow and sheen hide, and the ring turns into a
 * still tint (inside the `border-beam-ring` utility).
 *
 * tailwind-merge reads an unknown `border-<x>` as a border COLOR, so each `border-beam-*` paint
 * utility must stay alone on its slot — never next to a `border-<color>` class.
 */
export const borderBeamStyles = tv({
  slots: {
    root: 'group/border-beam relative isolate rounded-lg',
    glow: [layer, '-inset-1 -z-10 border-beam-glow opacity-75 motion-reduce:hidden', brighten],
    sheen: [layer, 'inset-0 -z-10 border-beam-sheen opacity-70 motion-reduce:hidden', brighten],
    ring: [layer, '-inset-px border-beam-ring'],
  },
  variants: {
    // Each value is light-dark(<light theme>, <dark theme>): the dark theme gets a white-hot head
    // and an emissive bloom, the light theme a flat head and a faint tint.
    tone: {
      accent: {
        root: [
          '[--sk-border-beam-color:var(--sk-accent)]',
          '[--sk-border-beam-head:light-dark(var(--sk-accent),color-mix(in_oklab,var(--sk-accent),var(--sk-on-accent)_62%))]',
          '[--sk-border-beam-glow:light-dark(color-mix(in_oklab,var(--sk-accent)_20%,transparent),var(--sk-accent-glow))]',
          '[--sk-border-beam-bloom:light-dark(color-mix(in_oklab,var(--sk-accent)_40%,transparent),var(--sk-accent))]',
        ],
      },
      // DECISION(open): premium beam color — `--sk-premium` warmed toward `--sk-chart-4` (amber),
      // as in the approved mockup; a dedicated `--sk-premium-glow` token would need the owner.
      premium: {
        root: [
          '[--sk-border-beam-color:light-dark(color-mix(in_oklab,var(--sk-premium),var(--sk-chart-4)_50%),color-mix(in_oklab,var(--sk-premium),var(--sk-chart-4)_22%))]',
          '[--sk-border-beam-head:light-dark(color-mix(in_oklab,var(--sk-premium),var(--sk-chart-4)_78%),color-mix(in_oklab,var(--sk-premium),var(--sk-on-accent)_70%))]',
          '[--sk-border-beam-glow:light-dark(color-mix(in_oklab,var(--sk-chart-4)_5%,transparent),color-mix(in_oklab,var(--sk-premium)_55%,transparent))]',
          '[--sk-border-beam-bloom:light-dark(color-mix(in_oklab,var(--sk-chart-4)_14%,transparent),var(--sk-border-beam-color))]',
        ],
      },
    },
    // DECISION(open): durations — seconds per lap (mockup: 4s accent, 6.5s premium); tunable.
    speed: {
      slow: { root: '[--sk-border-beam-duration:6.5s]' },
      normal: { root: '[--sk-border-beam-duration:4s]' },
      fast: { root: '[--sk-border-beam-duration:2.5s]' },
    },
  },
  defaultVariants: { tone: 'accent', speed: 'normal' },
})

export type BorderBeamStyleProps = VariantProps<typeof borderBeamStyles>
