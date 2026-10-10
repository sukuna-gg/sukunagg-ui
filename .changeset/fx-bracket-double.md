---
"@sukunagg/fx": patch
---

`BracketBeam` gains double elimination (Q42): `format="double"` takes an upper bracket, a lower
bracket and a grand final, linked explicitly by match `id` and `next.winner` / `next.loser`. The
champion's path lights across both bands, and drop chips ("▼ SF1") mark where a loser falls to the
lower bracket. Single elimination stays the default, and its server markup is unchanged. New CSS in
`theme.css`: the `bracket-beam-double`, `-band` and `-drop` utilities. Adding a prop value is a
patch on `0.x` (`docs/releasing.md`).
