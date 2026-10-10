---
"@sukunagg/ui": patch
---

New `FileUpload` and `resizeImage` (Q42), plus `CameraIcon`, `UploadIcon` and `ImageIcon`.
FileUpload is a drop zone over a real `<input type="file">` (it works before JavaScript loads):
pick, drop, or open the back camera on phones (`capture`), with a "choose from gallery" link on
touch screens. Files are validated (count, type, size), optionally prepared on the device
(`prepare`), and written back into the input, so a plain form submit sends the prepared file. With
`onUpload`, each file shows progress, Remove aborts it and failures offer Retry. `resizeImage()`
fixes camera rotation, caps the long side (2000px) and re-encodes as JPEG/WebP; it's opt-in and
tree-shaken. Adding components is a patch on `0.x` (`docs/releasing.md`).
