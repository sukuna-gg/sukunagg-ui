---
"@sukunagg/ui": patch
---

`Combobox`: the popup now starts at the input's start edge and is at least as wide as the input
(`min-w-[var(--anchor-width,12rem)]`, `align="start"`), like `Select`; it used to be centered at its
own minimum width, floating away from a wide input (Q44). New optional `itemIcon` prop draws a
leading visual before each suggestion's text (an avatar, a portrait); it's decorative, so the text
stays the option's name. A layout fix toward the spec plus an added prop: a patch on `0.x`
(`docs/releasing.md`).
