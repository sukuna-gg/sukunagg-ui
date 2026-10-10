/**
 * Motion CSS for `Calendar` (docs/component-calendar.md §5): the grid slides 12px toward the
 * direction of travel when the month changes, and scales from 97% when the view switches between
 * days, months and years. Emitted into the generated `theme.css` by `scripts/build-tokens.ts` (in
 * the order fixed by `./index.ts`). Names: `sk-calendar-*`, `animate-calendar-*`.
 *
 * Each keyframe only has a `from`, so the grid always lands on its resting style; components apply
 * the utilities behind `motion-safe:`, so reduced motion is instant.
 */
export const css = String.raw`
/* Calendar (docs/component-calendar.md): month slides and view zooms. */
@keyframes sk-calendar-next {
  from {
    opacity: 0.25;
    transform: translateX(12px);
  }
}

@keyframes sk-calendar-prev {
  from {
    opacity: 0.25;
    transform: translateX(-12px);
  }
}

@keyframes sk-calendar-zoom {
  from {
    opacity: 0.25;
    transform: scale(0.97);
  }
}

@utility animate-calendar-next {
  animation: sk-calendar-next var(--sk-duration-base) var(--sk-ease);
}

@utility animate-calendar-prev {
  animation: sk-calendar-prev var(--sk-duration-base) var(--sk-ease);
}

@utility animate-calendar-zoom {
  animation: sk-calendar-zoom var(--sk-duration-base) var(--sk-ease);
}
`
