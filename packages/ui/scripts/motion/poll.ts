/**
 * Motion CSS for `Poll` (Q42): the result bars grow from zero on first render. Emitted into the
 * generated `theme.css` by `scripts/build-tokens.ts` (in the order fixed by `./index.ts`).
 * Names: `sk-poll-*`, `animate-poll-*`.
 *
 * The keyframe states only where the bar *starts*; the bar's own width (`--sk-poll-share`) is the
 * final frame, so `motion-reduce:animate-none` lands on the drawn bar. It animates `scale` (not
 * `width`) to stay on the compositor (docs/motion.md rule 2). Spec: docs/component-poll.md §5.
 */
export const css = `
/* Poll (Q42): result bars grow from 0 on first render. docs/component-poll.md */
@keyframes sk-poll-bar {
  from {
    scale: 0 1;
  }
}

@utility animate-poll-bar {
  animation: sk-poll-bar 700ms var(--sk-ease) both;
}
`
