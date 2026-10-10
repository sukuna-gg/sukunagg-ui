---
"@sukunagg/ui": patch
---

New `Poll` (Q42): one question with a few choices and an optional write-in, rendered on the server
as a real `<form>` (a URL or a React 19 server action), so it works with JavaScript off. Results
show as bars with percentages that add up to 100 (largest remainder), after the viewer votes by
default; open, voted, signed-out and closed states; the winner or a tie is named in text. A tiny
client island checks "Other" when someone clicks or types in the write-in. New CSS in `theme.css`:
the `sk-poll-bar` keyframe and `animate-poll-bar` (the bars grow from 0; still under reduced
motion). Adding a component is a patch on `0.x` (`docs/releasing.md`).
