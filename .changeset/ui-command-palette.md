---
"@sukunagg/ui": patch
---

New `CommandPalette` (Q42): one search box, opened from anywhere with ⌘K / Ctrl+K, for players,
pages and actions. Built on Base UI Dialog + Autocomplete (inline list). It filters the items you
give it (fuzzy, accent-insensitive, matched letters highlighted, `maxPerGroup`), can ask your
server for more (`onSearch`, debounced, stale requests aborted, loading and error rows), and can
show a hint for almost-valid input. `href` items are real links; `onSelect` items run and close;
focus returns to the opener. Shortcuts render with `Kbd`. Adding a component is a patch on `0.x`
(`docs/releasing.md`).
