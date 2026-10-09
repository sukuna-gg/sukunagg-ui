import { tv, type VariantProps } from '../../utils/tv'

/**
 * Slot map for {@link ScrambleText}. Pure and server-safe — no hooks, no DOM, no 'use client'.
 *
 * The base utilities ARE the final frame: the visible line is the real text as one text node (so it
 * keeps the font's kerning and wrapping) and the overlay is empty. While the island decodes, it sets
 * `data-state="running"` on the layer, which hides the real text with `visibility` (so a gradient
 * fill, text-shadow or text-stroke inherited from a parent can't leak through), and draws each glyph
 * in an island-owned `cell` placed over the real glyph's measured box. Cells walk `data-glyph`
 * `hidden` → `noise` → `lock` → `done`; `done` plays the afterglow from the
 * `animate-scramble-text-settle` utility (`sk-scramble-text-settle`, emitted into the generated
 * `theme.css` from `scripts/motion/scramble-text.ts`). The island removes every cell when the last
 * afterglow ends, so nothing animated is left behind to replay.
 *
 * - `root`: the rendered element; no intrinsic style (type, size and color are inherited).
 * - `label`: the real text for assistive tech, once and unsplit. `select-none` so a copy of the
 *   visible line doesn't paste the text twice.
 * - `glyphs`: the `aria-hidden` visible layer (named group `scramble-text`). Ligatures off, so the
 *   glyphs the overlay draws one by one are the glyphs of the line at rest.
 * - `overlay`: the island-owned cell container — an empty, positioned inline box at the start of the
 *   line (the cells' containing block), kept inside the root so the root's overflow clips the cells.
 * - `text`: the real text; `visibility: hidden` while the layer is running.
 * - `cell`: one glyph of the decode, created by the island. Its box (`--sk-scramble-text-x/y/w/h`)
 *   is the real glyph's measured box and its line-height is that box's height, so what it draws
 *   sits on the real baseline; noise is centred in it, the locked glyph sits at its left edge (the
 *   real glyph's pen position). The text fill follows `color`, so noise shows under a parent's
 *   `-webkit-text-fill-color: transparent` (GradientText, ShinyText).
 * - `probe`: a throwaway invisible row the island measures the noise alphabet with.
 */
export const scrambleTextStyles = tv({
  slots: {
    root: '',
    label: 'sr-only select-none',
    glyphs: 'group/scramble-text [font-variant-ligatures:none]',
    overlay: 'pointer-events-none relative select-none',
    text: 'group-data-[state=running]/scramble-text:invisible',
    cell: [
      'absolute top-(--sk-scramble-text-y) left-(--sk-scramble-text-x)',
      'h-(--sk-scramble-text-h) w-(--sk-scramble-text-w) leading-(--sk-scramble-text-h)',
      'flex items-center justify-center whitespace-pre [-webkit-text-fill-color:currentColor]',
      // DECISION(open): noise in --sk-text-faint, the lock highlight in --sk-accent (16% cell tint +
      // --sk-accent-glow text-shadow) — the approved mockup's colors; no new token (Q39).
      'data-[glyph=noise]:text-text-faint',
      'data-[glyph=lock]:bg-accent/16 data-[glyph=lock]:text-accent',
      'data-[glyph=lock]:[text-shadow:0_0_.5em_var(--sk-accent-glow),0_0_.1em_var(--sk-accent-glow)]',
      // The variant chain repeats on the reduce override, or `[data-glyph]` would outrank it.
      'data-[glyph=done]:justify-start data-[glyph=done]:animate-scramble-text-settle',
      'motion-reduce:data-[glyph=done]:animate-none',
    ],
    probe: 'invisible absolute whitespace-pre',
  },
})

export type ScrambleTextStyleProps = VariantProps<typeof scrambleTextStyles>
