/**
 * `@sukunagg/fx`: canvas, WebGL and SVG effects for sukuna-ui (Q39).
 *
 * Every effect is a server-rendered CSS poster plus a small client island on one shared frame
 * loop (`./internal/loop`). The loop pauses off-screen and in hidden tabs, holds a still frame
 * under reduced motion, caps the device pixel ratio and reports its state as `data-state`.
 *
 * Peers on `@sukunagg/ui` for the `--sk-*` tokens (`@sukunagg/ui/theme.css`). Tailwind apps add
 * `@import "@sukunagg/fx/theme.css"` and `@source "../node_modules/@sukunagg/fx/dist"`; others
 * import `@sukunagg/fx/styles.css`. Builder guide: packages/fx/BUILDERS.md.
 */

// Components: one comment line per effect, alphabetical. Each builder adds exactly two lines
// directly under THEIR comment and touches nothing else. docs:build reads the value line, so use
// single quotes and no `/index`:
//   export type { NameProps } from './components/<dir>'
//   export { Name } from './components/<dir>'
// bracket-beam
export type {
  BracketBeamProps,
  BracketMatch,
  BracketRound,
  BracketTeam,
  BracketTeamInfo,
} from './components/bracket-beam'
export { BracketBeam } from './components/bracket-beam'
// flow-field
export type { FlowFieldProps } from './components/flow-field'
export { FlowField } from './components/flow-field'
// holo-card
// lightning
// particle-field

export type { FxState } from './internal/loop'
