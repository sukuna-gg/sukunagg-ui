# Component: FileUpload

> Follows the `docs/component-button.md` template. `'use client'` island over a real
> `<input type="file">`, so it still works as a plain file field before JS loads (Q42).

## 1. Purpose

Lets people add a file by tapping, picking or dropping it, and shows what they added. On a phone it
can open the back camera straight away (an ID photo); on a computer it opens the file picker or
takes a dropped file. Photos can be shrunk on the device before they upload, so a 12 MB phone photo
becomes a ~400 KB JPEG (Pitaya does this by hand today).

## 2. Files

```
packages/ui/src/components/file-upload/
├── file-upload.styles.tsx   # tv() slots: root, zone, icon, title, hint, gallery, preview, list, row,
│                            #   thumb, progress, error, actions. Variant `layout`.
├── file-upload.logic.tsx    # 'use client'; forwardRef <input>; drop, validate, prepare, upload, list.
├── file-upload.resize.ts    # resizeImage(): pure-ish browser helper (canvas), exported
├── file-upload.test.tsx
├── file-upload.stories.tsx
└── index.tsx                # export { FileUpload, resizeImage }; export type { FileUploadProps,
                             #   FileUploadLabels, FileUploadItem, ResizeImageOptions }
test/browser/file-upload.test.ts  # Playwright: setInputFiles → preview; drop; wrong type; multiple + remove
```

Adds `CameraIcon`, `UploadIcon` and `ImageIcon` to the icon set (minor, `component-icon.md`).

## 3. API

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

export interface FileUploadItem {
  id: string
  file: File                    // after `prepare`
  original: File                // as picked
  status: 'preparing' | 'ready' | 'uploading' | 'uploaded' | 'error'
  progress?: number             // 0–100 while uploading
  error?: string
  previewUrl?: string           // object URL for images (revoked on remove/unmount)
}

export interface FileUploadLabels {
  title: string                 // 'Choose a file or drop it here'
  titleTouch: string            // 'Tap to take a photo' (coarse pointer + capture)
  gallery: string               // 'Or choose from your gallery' (coarse pointer + capture)
  preparing: string             // 'Preparing…'
  ready: string                 // 'Ready'
  uploaded: string              // 'Uploaded'
  change: string                // 'Change'
  remove: (name: string) => string        // n => `Remove ${n}`
  retry: string                 // 'Retry'
  wrongType: (accept: string) => string   // "That file type isn't accepted. Use …"
  tooBig: (size: string, max: string) => string
  tooMany: (max: number) => string
  unreadable: string            // "Couldn't read that file. Try a JPG or PNG."
  uploadFailed: string          // "Couldn't upload. Check your connection."
}

interface FileUploadOwnProps {
  accept?: string               // native syntax: 'image/*', '.pdf'
  capture?: 'user' | 'environment'
  multiple?: boolean
  maxFiles?: number             // with `multiple`; default 10
  maxSize?: number              // bytes, checked on the original file
  /** Runs on each accepted file before it's kept or uploaded, e.g. resizeImage(…). */
  prepare?: (file: File) => Promise<File>
  /** Upload each file yourself. Without it, files stay in the input for the form to submit. */
  onUpload?: (file: File, ctx: { onProgress: (percent: number) => void; signal: AbortSignal }) => Promise<void>
  onFilesChange?: (items: readonly FileUploadItem[]) => void
  /** 'zone' (default): a tall drop zone, one-file preview. 'compact': a short zone + list (multiple). */
  layout?: 'zone' | 'compact'
  hint?: ReactNode              // under the title, e.g. 'JPG, PNG or HEIC · up to 10 MB'
  labels?: Partial<FileUploadLabels>
  invalid?: boolean
}

// The real <input type="file"> receives `name`, `id`, `required`, `disabled`, `form`, aria-*…
export type FileUploadProps = FileUploadOwnProps &
  Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'accept' | 'capture' | 'multiple' | 'onChange' | 'size'>

export interface ResizeImageOptions { maxSide?: number; type?: 'image/jpeg' | 'image/webp'; quality?: number }
/** Fixes camera rotation, caps the long side (default 2000px), re-encodes (default JPEG 0.85). */
export function resizeImage(options?: ResizeImageOptions): (file: File) => Promise<File>
```

Pitaya's identity form:

```tsx
<Field>
  <Field.Label htmlFor="front">Frente</Field.Label>
  <FileUpload id="front" name="front" accept="image/*" capture="environment" maxSize={10_000_000}
    prepare={resizeImage()} hint="JPG, PNG o HEIC · hasta 10 MB" labels={esLabels} required />
</Field>
```

Deliberately **not** in v1: chunked/resumable uploads, image cropping, paste-from-clipboard, folder
upload, a camera viewfinder (the OS camera via `capture` is enough).

## 4. Variants → tokens

| Part | Treatment |
|---|---|
| zone | min 172px (`zone`) / 92px (`compact`), 1.5px dashed `--sk-line`, `--sk-radius-md`, bg `--sk-surface-2` mixed toward `--sk-surface`; hover border `--sk-text-faint` |
| dragging | solid `--sk-accent` border, bg `--sk-accent` at 9%, icon `--sk-accent` |
| icon tile | 44px, `--sk-surface`, 1px `--sk-line-soft`, 12px radius |
| invalid / error | border `--sk-accent`; message `text-sm` semibold `--sk-accent` (Field's error style) |
| preview (`zone`, ready) | image 112×76 `object-fit: cover`, "Ready" with `CheckIcon` in `--sk-success`, size line `text-xs --sk-text-faint` (e.g. "3.4 MB → 412 KB · 2000×1262 JPEG"), `secondary sm` Change + `ghost sm` Remove |
| list row (`compact`) | 40px thumb, name semibold ellipsis, status line, 4px progress track `--sk-surface` with `bg-gradient-accent` fill; failed rows: border `--sk-accent` at 45%, message in `--sk-accent`, `secondary sm` Retry |
| gallery link | coarse pointers only, `--sk-accent` underlined text button |

## 5. States

| State | Behavior |
|---|---|
| empty | zone: title + hint; on coarse pointers with `capture`, `titleTouch` + the gallery link |
| dragging | zone highlights while a file is over it |
| preparing | spinner + `labels.preparing` (`aria-busy`) while `prepare` runs |
| ready | preview / row; the prepared file is in the input (no `onUpload`) |
| uploading | progress bar with `onProgress`; Remove aborts the request |
| uploaded | row says `labels.uploaded` |
| error | type, size, count, unreadable (prepare threw) or upload failed; upload errors offer Retry |
| no JS | the label + native input work as a plain file field |

**Motion:** border/background transitions `--sk-duration-fast`; spinner rotation stops under
reduced motion (it becomes a still ring + the text).

## 6. Logic (`file-upload.logic.tsx`)

- `'use client'`. `forwardRef<HTMLInputElement, FileUploadProps>`: the ref is the real input,
  visually hidden inside the `<label>` zone, so the whole zone opens the picker and the input keeps
  its form semantics.
- Validation order: count → type (matches `accept`, incl. extensions and `image/*`) → size → `prepare`.
- **Keeping prepared files in the form:** without `onUpload`, the prepared files are written back
  into the input with a `DataTransfer` (`input.files = dt.files`), so a native submit or `FormData`
  sends the ~400 KB JPEG, not the original.
- With `onUpload`, files upload one at a time per item (parallel across items), each with its own
  `AbortController`; Retry re-runs it.
- Drop handling on the zone (`dragenter/over/leave/drop`); nested `dragleave` ignored via
  `relatedTarget`.
- With `capture` on a coarse pointer (`matchMedia('(pointer: coarse)')` in an effect, CSS
  `pointer-coarse:` for the first paint), a second hidden input **without** `capture` backs the
  gallery link, because `capture` skips the gallery on phones.
- Object URLs are revoked on remove and unmount.

`resizeImage` (`file-upload.resize.ts`): `createImageBitmap(file, { imageOrientation:
'from-image' })` → canvas scaled so the long side ≤ `maxSide` → `canvas.toBlob(type, quality)` →
`new File([blob], renamed)`. Throws on undecodable input (e.g. HEIC where the browser can't decode
it), which the component turns into `labels.unreadable`. Smaller images are re-encoded, never
upscaled.

## 7. Styles (`file-upload.styles.tsx`)

`tv()` `slots` as in §2; variants `layout`, `dragging`, `invalid`, and `status` on rows.

## 8. Accessibility checklist

- [ ] The input is a real `type="file"` with a label (the zone, or `Field.Label`); keyboard users
      tab to it and press Enter/Space.
- [ ] Focus ring on the zone while the hidden input is focused (`:focus-within`).
- [ ] Drag and drop is an extra; everything works without it.
- [ ] Errors are `role="alert"` and linked through `aria-describedby`; `aria-invalid` on the input.
- [ ] Progress bars are `role="progressbar"` with the file name; Remove/Retry buttons name the file.
- [ ] Preview images have alt text (the label + "preview").
- [ ] Text ≥ 4.5:1 in both themes. The zone is identified by its text and icon; the dashed
      border is decoration, and keyboard focus shows as the 2px `--sk-focus-ring` (≥ 3:1).

## 9. Tests

**Unit:** server renders label + input (works without JS); accept matching (`image/*`, `.pdf`,
mixed); size and count errors; `prepare` success, failure (unreadable) and the DataTransfer write-
back (mocked); `onUpload` progress, abort on remove, failure + retry; `multiple` list; preview URL
revocation; coarse-pointer gallery input; labels; ref is the input; axe both themes.
`resizeImage` with a mocked canvas: long side capped, never upscaled, type/quality passed.
**Browser:** `setInputFiles` shows the preview; a real 4000×3000 JPEG comes out ≤ 2000px; drop a
`.txt` → error; multiple files + remove.

## 10. Stories

`IdPhoto` (Pitaya style, INE front/back), `Passport`, `Screenshots` (`compact`, `multiple`,
`onUpload` with fake progress and one failure), `Invalid`, `Disabled`. Both `data-theme` values.

## 11. Decisions

- Ships `resizeImage` as an opt-in helper (owner, Q42 recommendation 3).
- Prepared files go back into the input, so forms that never call `onUpload` still upload the small
  file (D41).
- Budget target ≤ 3.5 kB gzip (with `resizeImage` tree-shaken when unused), measured +10% (P5).
