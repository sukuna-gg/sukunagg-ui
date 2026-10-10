# BracketBeam: double elimination (pending spec)

> Spec for an addition to the shipped `BracketBeam` (`@sukunagg/fx`, `docs/component-bracket-beam.md`).
> Kept in its own file until the code ships, because `component-bracket-beam.md` feeds the
> generated docs (`llms.txt`, README) and must not advertise an unshipped API (D41). The PR that
> builds it merges this into `component-bracket-beam.md` §3–§11 and deletes this file.
> Q42, mockup https://claude.ai/artifact/At75qRavdfveJfo7x3vPPb.

## 1. Purpose

Adds double elimination: an upper bracket, a lower bracket for teams that lost once, a grand final
and the optional reset match. The beam follows the champion even when they come back from the lower
bracket, and lower-bracket rows show which upper match each team dropped from, so no wire has to
cross the bracket.

## 2. Files

Same component files (`packages/fx/src/components/bracket-beam/`). New pure module
`bracket-beam.double.ts` (data validation, column layout, champion path for linked matches), unit
tested on its own. CSS module gains the two-band layout and the drop chip.

## 3. API (additions)

```ts
export interface BracketMatch {
  teams: readonly [BracketTeam, BracketTeam]
  scores?: readonly [number | string, number | string]
  winner?: 0 | 1
  /** Required in double elimination; ignored in single. */
  id?: string
  /** Where the winner and the loser go next (match ids). Double elimination only. */
  next?: { winner?: string; loser?: string }
}

interface BracketBeamDoubleProps {
  format: 'double'
  upper: readonly BracketRound[]     // round 1 first
  lower: readonly BracketRound[]     // round 1 first
  grandFinal: {
    match: BracketMatch
    /** The bracket-reset match: include it once it's scheduled or played. */
    reset?: BracketMatch
    name?: string                    // column heading, default 'Grand final'
    resetName?: string               // default 'Reset'
    meta?: string                    // e.g. 'Bo5'
  }
  upperLabel?: string                // band heading, default 'Upper bracket'
  lowerLabel?: string                // default 'Lower bracket'
  /** Chip text for a dropped team, from the upper round name + match number. Default 'SF1' style. */
  dropLabel?: (round: BracketRound, matchIndex: number) => string
  dropSpokenLabel?: (roundName: string, matchIndex: number) => string   // 'dropped from Semifinal 1'
}

type BracketBeamSingleProps = { format?: 'single'; rounds: readonly BracketRound[] }

export type BracketBeamProps = (BracketBeamSingleProps | BracketBeamDoubleProps) &
  BracketBeamSharedProps &          // champion, championMeta, labels, paused… (unchanged)
  Omit<ComponentPropsWithoutRef<'div'>, 'children'>
```

Discriminated on `format`; existing single-elimination code keeps working (no `format` = single).

```tsx
<BracketBeam format="double" champion="Sahuaros" championMeta="Desde la llave inferior"
  upperLabel="Llave superior" lowerLabel="Llave inferior"
  upper={upperRounds} lower={lowerRounds}
  grandFinal={{ match: gf, reset: gfReset, name: 'Gran final', resetName: 'Reinicio', meta: 'Bo5' }} />
// match: { id: 'ub-sf1', teams, scores, winner: 0, next: { winner: 'ub-final', loser: 'lb-r2-2' } }
```

**Data rules.** In double elimination every match has a unique `id`, and links are explicit:
`next.winner` / `next.loser` name the destination match (owner, Q42 recommendation 4: lower-bracket
seeding varies by organizer, so no position rule). The upper final's `next.winner` and the lower
final's `next.winner` are the grand final; the grand final's winner goes to `reset` when present,
else to the trophy. Unknown ids, a match fed by more than two links, or a cycle throw in
development and render the bracket without wires in production.

Deliberately **not** in v1 of this addition: triple elimination, Swiss/round-robin stages, byes
drawn as gaps (still out, as in single), a lower bracket shown as a separate scroller.

## 4. Variants → tokens

Unchanged match boxes, wires, beam and trophy card. New:

| Part | Treatment |
|---|---|
| band heading | display face, italic, 11px uppercase, tracking .14em, `--sk-text-dim`, with a `--sk-line-soft` rule to the right |
| drop chip | 10px bold, 1px `--sk-line` border, 4px radius, `--sk-text-faint` ("▼ SF1"); on the champion's lit row `--sk-bracket-beam-ink` with an accent border at 50% |
| layout | columns = max(upper rounds, lower rounds) + grand final + reset (if any) + trophy; upper band on top, lower band below; the grand-final, reset and trophy columns span both bands, centred |

## 5. States

As single elimination (static without `champion`, beam with it). The lit path: every match the
champion won, the wires between them, and the drop chip where they fell to the lower bracket (the
upper match they lost is lit too, so the path reads as one story). Reset column only when `reset`
is given. Reduced motion: the poster path, no beam.

## 6. Logic

- `bracket-beam.double.ts` validates links, assigns columns (upper round i → column i, lower round
  i → column i; grand final after the wider band), and walks the champion's path forward from
  their first match through `next` links.
- Wires: drawn only along `next.winner` links, from the winner's row to the row holding the same
  team in the destination (same rule as today). Loser links never draw wires; they become drop
  chips on the destination row.
- Everything else (beam, SVG/CSS poster, IO pause, reduced motion, measuring) reuses the shared loop
  and the single-elimination renderer.

## 7. Styles

CSS module additions in `packages/fx/src/styles/bracket-beam.css`: `.bracket-beam--double` grid
(two bands), `.bracket-beam__band`, `.bracket-beam__drop`.

## 8. Accessibility checklist

- [ ] Each band is a group named by its label; rounds stay lists named by the round name.
- [ ] A dropped team's row reads "Sahuaros, seed 4, dropped from Semifinal 1, 2, winner".
- [ ] Reset match is announced by its column name.
- [ ] Existing BracketBeam checklist applies.

## 9. Tests

`bracket-beam.double.ts` (100%): link validation errors, columns for 4/8/16 teams, champion path
from the upper and from the lower bracket, with and without reset. Component: server render of an
8-team bracket, drop chips and their spoken labels, lit rows, single-elimination snapshots
unchanged, axe both themes. Browser: beam reaches the trophy along a lower-bracket path.

## 10. Stories

`DoubleElimination` (8 teams, champion from the lower bracket, with reset), `DoubleNoReset`
(upper-bracket champion wins the grand final), `DoubleStatic` (no champion yet). Both themes.

## 11. Decisions

- Explicit `id` / `next` links (owner, Q42 recommendation 4); single elimination keeps the
  position rule.
- Drop chips instead of cross-bracket wires.
- Built last in the Q42 wave: it pays off once Pitaya's API serves double-elimination brackets
  (single only today).
- Budget: BracketBeam 7.69 kB → target ≤ 9.5 kB gzip, measured +10% (P5).
