---
"@sukunagg/ui": patch
---

Showpieces wave (Q38, Q39). Nine new animated components: `RetroGrid` (perspective arena floor),
`BorderBeam` (light orbiting a card edge), `RankReveal` (tier-up moment), `MatchFound` (ready-check
panel with a CSS countdown), `LootReveal` (pack opening with rarity glows), `XpLevelUp` (XP fill,
burst and level count-up), `AvatarFrame` (animated avatar rings), `ScrambleText` (glyph decode, small
client island) and `GlitchText` (RGB-split glitch bursts). All server-render their final frame and
land on it under reduced motion. New CSS in `theme.css`: one `@property`/`@keyframes`/`@utility`
block per component (`--sk-<component>-*`, `sk-<component>-*`, `animate-<component>-*`), which grows
`theme.css` to about 57 kB (12.8 kB gzip). Adding components is a patch on `0.x`
(`docs/releasing.md`).
