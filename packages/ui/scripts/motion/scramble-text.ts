/**
 * Motion CSS for the `scramble-text` showpiece (Q39): its `@property`, `@keyframes` and `@utility`
 * blocks, emitted into the generated `theme.css` by `scripts/build-tokens.ts` (in the order
 * fixed by `./index.ts`). Names: `--sk-scramble-text-*`, `sk-scramble-text-*`, `animate-scramble-text-*`.
 *
 * The decode itself is JS (the `scramble-text.scramble.tsx` island swaps characters with rAF); the
 * only CSS motion is the afterglow a glyph's overlay cell keeps after it locks. The keyframe has no
 * `to`, so it fades into whatever color the text inherits. Its 600 ms is mirrored by `SETTLE` in
 * the island, which removes every cell once the last afterglow has ended (so nothing is left to
 * restart when a hidden parent is shown again).
 */
export const css = String.raw`
/* ScrambleText (Q39): the afterglow a glyph keeps for a beat after it locks to its real character. */
@keyframes sk-scramble-text-settle {
  from {
    color: var(--sk-accent);
    text-shadow: 0 0 0.5em var(--sk-accent-glow), 0 0 0.1em var(--sk-accent-glow);
  }
}

@utility animate-scramble-text-settle {
  animation: sk-scramble-text-settle 600ms var(--sk-ease);
}
`
