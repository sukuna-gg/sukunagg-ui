---
"@sukunagg/ui": patch
---

Add a `tone` variant to `ScrollArea`: `'neutral' | 'accent'` (same names as Badge/Chip `tone`).
`accent` is the Sukuna crimson scrollbar — the thumb sits at 80% crimson (≈3.7:1 on dark `surface`,
≈3.8:1 on light) and goes solid on hover, with a 10% crimson track tint. `neutral` is the default
and renders exactly as before. Adds a variant = patch on `0.x` (`docs/releasing.md`).
