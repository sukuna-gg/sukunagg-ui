# @sukunagg/fx

## 0.1.1

### Patch Changes

- e59ee0f: `BracketBeam` gains double elimination (Q42): `format="double"` takes an upper bracket, a lower
  bracket and a grand final, linked explicitly by match `id` and `next.winner` / `next.loser`. The
  champion's path lights across both bands, and drop chips ("▼ SF1") mark where a loser falls to the
  lower bracket. Single elimination stays the default, and its server markup is unchanged. New CSS in
  `theme.css`: the `bracket-beam-double`, `-band` and `-drop` utilities. Adding a prop value is a
  patch on `0.x` (`docs/releasing.md`).
- Updated dependencies [1fd4097]
- Updated dependencies [a31c143]
- Updated dependencies [9f316af]
- Updated dependencies [339ca4d]
- Updated dependencies [25d149b]
  - @sukunagg/ui@0.11.2

## 0.1.0

### Minor Changes

- 41bca1f: New package: `@sukunagg/fx`, opt-in canvas, WebGL and pointer effects for the Sukuna brand (Q38, Q39).
  `ParticleField` (crimson embers rising through depth, Canvas2D), `HoloCard` (a collectible card that
  tilts toward the pointer or arrow keys with a foil sheen), `FlowField` (particles flowing along a
  noise field, Canvas2D), `Lightning` (a crackling bolt, one WebGL1 shader) and `BracketBeam` (light
  travelling the winner's path through a tournament bracket). Each is a client island on one shared
  loop: the server renders a CSS poster first; the loop pauses offscreen and in hidden tabs, caps the
  pixel ratio, survives a lost GPU context and StrictMode remounts, and draws a single still frame
  under reduced motion (switching live both ways). Peers on `@sukunagg/ui` (>= 0.11.0) and React; no
  effect engines (no three.js, tsParticles or matter-js). First release = 0.1.0.

### Patch Changes

- Updated dependencies [0ade815]
- Updated dependencies [baba8db]
  - @sukunagg/ui@0.11.1
