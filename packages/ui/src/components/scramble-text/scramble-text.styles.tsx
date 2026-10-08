import { tv, type VariantProps } from '../../utils/tv'

/**
 * Slot map for {@link ScrambleText}. Pure and server-safe — no hooks, no DOM, no 'use client'.
 *
 * The base utilities ARE the final frame: with no `data-glyph` (server, no-JS, reduced motion) each
 * glyph shows its real character and the noise overlay is invisible. The island sets `data-glyph`
 * while decoding: `hidden` / `noise` / `lock` make the real character transparent (it still holds
 * the width, so nothing shifts) and draw noise in the overlay; `done` plays the afterglow from the
 * `animate-scramble-text-settle` utility (`sk-scramble-text-settle`, emitted into the generated
 * `theme.css` from `scripts/motion/scramble-text.ts`).
 *
 * - `root`: the rendered element; no intrinsic style (type, size and color are inherited).
 * - `label`: the real text for assistive tech, once and unsplit. `select-none` so a copy of the
 *   visible line doesn't paste the text twice.
 * - `glyphs`: the `aria-hidden` visible layer. Ligatures off: every glyph is its own box.
 * - `glyph`: one grapheme; `group` so the overlay can follow its state.
 * - `noise`: the overlay, a flex box centred on the glyph so the noise sits on its baseline at any
 *   line-height. Dropped in forced-colors mode, which would force the transparent glyph visible.
 */
export const scrambleTextStyles = tv({
  slots: {
    root: '',
    label: 'sr-only select-none',
    glyphs: '[font-variant-ligatures:none]',
    glyph: [
      'group relative',
      'data-[glyph=hidden]:text-transparent data-[glyph=noise]:text-transparent',
      'data-[glyph=lock]:text-transparent',
      // The variant chain repeats on the reduce override, or `[data-glyph]` would outrank it.
      'data-[glyph=done]:animate-scramble-text-settle motion-reduce:data-[glyph=done]:animate-none',
    ],
    noise: [
      'pointer-events-none invisible absolute inset-0 flex items-center justify-center',
      'whitespace-pre select-none forced-colors:hidden',
      // DECISION(open): noise in --sk-text-faint, the lock highlight in --sk-accent (16% cell tint +
      // --sk-accent-glow text-shadow) — the approved mockup's colors; no new token (Q39).
      'group-data-[glyph=noise]:visible group-data-[glyph=noise]:text-text-faint',
      'group-data-[glyph=lock]:visible group-data-[glyph=lock]:text-accent',
      'group-data-[glyph=lock]:bg-accent/16',
      'group-data-[glyph=lock]:[text-shadow:0_0_.5em_var(--sk-accent-glow),0_0_.1em_var(--sk-accent-glow)]',
    ],
  },
})

export type ScrambleTextStyleProps = VariantProps<typeof scrambleTextStyles>
