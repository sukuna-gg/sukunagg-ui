# @sukunagg/fx

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
