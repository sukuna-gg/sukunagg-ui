---
"@sukunagg/ui": patch
---

Toolkit wave A (Q42): three new server components. `Kbd` draws keys and shortcuts as key caps
(`keys="mod+K"` shows ⌘ on Apple platforms and Ctrl elsewhere; screen readers hear "Command + K";
`platform="auto"` swaps the Apple keys in through a tiny client island after hydration, with no
hydration mismatch). `Prose` styles long text you don't write by hand (Markdown, MDX, CMS output):
headings with a rule above, crimson list markers, notices, code, scrolling tables, 70ch lines, in
three sizes; element rules carry no class specificity, so components inside keep their own styles.
`Timeline` lists entries along a rail with done, current (pulsing halo) and upcoming (dashed)
states, caller colors and icons. No new tokens and no `theme.css` changes. Adding components is a
patch on `0.x` (`docs/releasing.md`).
