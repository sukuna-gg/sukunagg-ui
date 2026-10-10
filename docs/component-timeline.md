# Component: Timeline

> Follows the `docs/component-button.md` template. **Server component**, no client JS. Events in
> order along a rail (Q42).

## 1. Purpose

Lists things in the order they happened or will happen, with a time or label on the left: a
match's objectives, a team's night at a tournament, an audit log, a changelog. Done steps are
solid, the current one pulses, and upcoming ones are dashed, so people see at a glance where things
stand.

## 2. Files

```
packages/ui/src/components/timeline/
├── timeline.styles.tsx   # tv() slots: root, item, time, rail, dot, body, title, description.
├── timeline.logic.tsx    # server component; forwardRef <ol>.
├── timeline.test.tsx
├── timeline.stories.tsx
└── index.tsx             # export { Timeline }; export type { TimelineProps, TimelineItem }
```

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

export interface TimelineItem {
  id: string
  /** Left column: '20:31', a date, a version Badge… */
  time?: ReactNode
  /** Machine-readable time for <time dateTime>, when `time` is a date or a clock time. */
  dateTime?: string
  title: ReactNode
  description?: ReactNode
  /** Small icon in the dot (an icon from the set, or the app's own). Omit for a plain dot. */
  icon?: ReactNode
  /** Dot color (CSS color), e.g. a side or game color. Default var(--sk-text-dim). */
  color?: string
  /** Default 'done'. */
  status?: 'done' | 'current' | 'upcoming'
  /** Trailing element on the title line, e.g. <Badge>Victoria</Badge>. */
  badge?: ReactNode
  /** Anything else under the description: a list of changes, a link. */
  children?: ReactNode
}

interface TimelineOwnProps {
  items: readonly TimelineItem[]
  density?: 'default' | 'compact'      // default 'default' (18px between items; compact 10px)
  timeWidth?: 'sm' | 'md' | 'lg'       // left column: 52 / 64 / 84px; default 'sm'
  /** Name for the current item's state, read by screen readers. Default 'current step'. */
  currentLabel?: string
  /** Word read after each upcoming item. Default 'upcoming'. */
  upcomingLabel?: string
}

export type TimelineProps = TimelineOwnProps & Omit<ComponentPropsWithoutRef<'ol'>, 'children'>
```

```tsx
<Timeline density="compact" aria-label="Objectives" items={objectives.map((o) => ({
  id: o.id, time: mmss(o.at), title: o.name, description: o.teamName,
  color: o.team === 'blue' ? 'var(--l-blue)' : 'var(--l-red)', icon: <ObjectiveIcon type={o.type} />,
}))} />
```

Deliberately **not** in v1: horizontal layout (use `Stepper` for steps across), alternating
left/right, collapsing long runs, lazy loading.

## 4. Variants → tokens

| Part | Treatment |
|---|---|
| time | `text-xs` semibold tabular-nums `--sk-text-faint`, right-aligned |
| rail | 2px `--sk-line` between dots; dashed after the current item |
| dot, plain | 12px circle in `color`, ringed by the container's surface |
| dot, with icon | 22px circle, `--sk-surface-2`, 1px `--sk-line`, icon in `color` |
| current | dot `bg-gradient-accent` + `--sk-on-accent` icon; a halo behind it (`--sk-accent` at 20%, 4px wider than the dot) that fades in and out |
| upcoming | dot `--sk-surface` with a 1.5px dashed `--sk-text-faint` ring; title `--sk-text-dim` |
| title | semibold `--sk-text`; description `text-sm` (12px) `--sk-text-dim` |

## 5. States

done / current / upcoming per item, as above. **Motion:** only the current dot's halo pulses, with
Tailwind's built-in `animate-pulse` behind `motion-safe:` (no new keyframe, so `theme.css` is
unchanged); under reduced motion the halo stays still.

## 6. Logic (`timeline.logic.tsx`)

- **No `'use client'`, no hooks.** `forwardRef<HTMLOListElement, TimelineProps>`.
- `<ol>` of `<li>`; `time` wraps in `<time dateTime>` when `dateTime` is given.
- The current item gets `aria-current="step"` and a visually hidden `currentLabel`; upcoming items a
  hidden "upcoming".
- Item colors through the `--sk-timeline-dot` custom property (caller colors, like the charts).

## 7. Styles (`timeline.styles.tsx`)

`tv()` `slots`: `root`, `item`, `time`, `rail`, `dot`, `body`, `title`, `description`. Variants
`density`, `timeWidth`, `status` (on item/dot/rail), `withIcon` (on dot).

## 8. Accessibility checklist

- [ ] Ordered list; the order is the meaning.
- [ ] Current item: `aria-current="step"` + spoken label; upcoming: spoken "upcoming".
- [ ] Color never carries meaning alone: the title/description names the side or result.
- [ ] Icons `aria-hidden`; text ≥ 4.5:1 both themes; pulse respects reduced motion.

## 9. Tests

Server render with plain and icon dots; statuses (current `aria-current`, hidden labels); dashed
rail after current; `dateTime` wraps in `<time>`; `density`/`timeWidth`; caller colors; RSC
boundary; ref forwards; className wins; axe both themes.

## 10. Stories

`MatchObjectives` (sukuna-gg-web style, compact, side colors), `TournamentNight` (Pitaya style,
current + upcoming), `Changelog` (version badges, `timeWidth="lg"`), `AuditLog`. Both `data-theme`
values.

## 11. Decisions

- Vertical only; `Stepper` already covers horizontal steps.
- Size: 1.23 kB brotli, budget 1.5 kB (P5).
