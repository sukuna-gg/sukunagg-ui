---
"@sukunagg/ui": patch
---

`Combobox`: the empty "No results" status no longer leaves a 16 px blank strip above the
suggestions. It stays in the DOM as a live region while suggestions show, and now takes no room
when it has nothing in it (`empty:p-0`). A layout fix toward the spec: a patch on `0.x`
(`docs/releasing.md`).
