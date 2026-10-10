'use client'

import {
  type ComponentPropsWithoutRef,
  type DragEvent,
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { Button } from '../button'
import { CameraIcon, CheckIcon, CloseIcon, ImageIcon, UploadIcon } from '../icon'
import { Spinner } from '../spinner'
import { fileUploadStyles } from './file-upload.styles'

/** One file FileUpload holds, as passed to `onFilesChange`. */
export interface FileUploadItem {
  /** Stable id for this file while it's in the list. */
  id: string
  /** The file that's kept or uploaded: the result of `prepare`, or the picked file without it. */
  file: File
  /** The file as picked or dropped, before `prepare`. */
  original: File
  /**
   * Where the file is: `'preparing'` while `prepare` runs, `'ready'` once it's kept (no
   * `onUpload`), `'uploading'` / `'uploaded'` with `onUpload`, `'error'` when the upload failed.
   */
  status: 'preparing' | 'ready' | 'uploading' | 'uploaded' | 'error'
  /** Upload progress, 0–100, while `status` is `'uploading'`. */
  progress?: number
  /** Why the upload failed (`labels.uploadFailed`), when `status` is `'error'`. */
  error?: string
  /** Object URL of the image preview. Revoked when the file is removed or FileUpload unmounts. */
  previewUrl?: string
}

/** Every text FileUpload renders, for translation. Pass the ones you change in `labels`. */
export interface FileUploadLabels {
  /** Zone title. @default 'Choose a file or drop it here' */
  title: string
  /** Zone title on touch screens when `capture` is set. @default 'Tap to take a photo' */
  titleTouch: string
  /**
   * Link to the photo library on touch screens with `capture`.
   * @default 'Or choose from your gallery'
   */
  gallery: string
  /** While `prepare` runs. @default 'Preparing…' */
  preparing: string
  /** A kept file (no `onUpload`). @default 'Ready' */
  ready: string
  /** A finished upload. @default 'Uploaded' */
  uploaded: string
  /** Button that picks a different file in the one-file preview. @default 'Change' */
  change: string
  /** Accessible name of a file's remove button. @default (name) => `Remove ${name}` */
  remove: (name: string) => string
  /**
   * Button that re-runs a failed upload (the file name follows it for screen readers).
   * @default 'Retry'
   */
  retry: string
  /**
   * The file doesn't match `accept` (receives the `accept` prop).
   * @default (accept) => "That file type isn't accepted. Use …" (e.g. 'image files or PDF')
   */
  wrongType: (accept: string) => string
  /**
   * The file is over `maxSize` (both formatted, e.g. '12.4 MB', '10 MB').
   * @default (size, max) => `That file is ${size}. The limit is ${max}.`
   */
  tooBig: (size: string, max: string) => string
  /**
   * More files than allowed (`maxFiles`, or 1 without `multiple`).
   * @default (max) => `You can add up to ${max} files.` ('Choose one file.' for 1)
   */
  tooMany: (max: number) => string
  /**
   * `prepare` threw (e.g. a HEIC photo the browser can't decode).
   * @default "Couldn't read that file. Try a JPG or PNG."
   */
  unreadable: string
  /** `onUpload` rejected. @default "Couldn't upload. Check your connection." */
  uploadFailed: string
}

/**
 * Props for {@link FileUpload}: the props below plus every native `<input>` attribute, which go to
 * the real `<input type="file">` (`name`, `id`, `required`, `disabled`, `form`, `aria-*`…), except
 * `className` and `style`, which go to the wrapper. `type`, `onChange` and the native `size` are
 * not available (use `onFilesChange`).
 */
export interface FileUploadProps
  extends Omit<
    ComponentPropsWithoutRef<'input'>,
    'type' | 'accept' | 'capture' | 'multiple' | 'onChange' | 'size'
  > {
  /**
   * File types to accept, in the native syntax: MIME types (`'application/pdf'`), wildcards
   * (`'image/*'`) and extensions (`'.pdf'`), comma-separated. Filters the picker and is checked
   * again on every picked or dropped file.
   */
  accept?: string
  /**
   * Opens the camera straight away on phones: `'environment'` (back) or `'user'` (front). On
   * touch screens a "choose from your gallery" link is added, because `capture` skips the photo
   * library there.
   */
  capture?: 'user' | 'environment'
  /**
   * Allows several files; they collect in a list (each pick adds to it).
   * @default false
   */
  multiple?: boolean
  /**
   * Most files kept at once, with `multiple`. A pick that would go over it is refused whole.
   * @default 10
   */
  maxFiles?: number
  /** Largest file in bytes, checked on the file as picked (before `prepare`). */
  maxSize?: number
  /**
   * Runs on each accepted file before it's kept or uploaded, e.g. `resizeImage()`. When it
   * throws, the file is dropped with `labels.unreadable`.
   */
  prepare?: (file: File) => Promise<File>
  /**
   * Uploads each file yourself, one call per file (files upload in parallel). Report progress
   * with `onProgress(0–100)` and honour `signal`: it aborts when the file is removed or FileUpload
   * unmounts. A rejected promise marks the file failed and offers Retry. Without `onUpload`, files
   * stay in the input for the form to submit.
   */
  onUpload?: (
    file: File,
    context: { onProgress: (percent: number) => void; signal: AbortSignal },
  ) => Promise<void>
  /** Called with the whole list whenever a file is added, prepared, uploaded or removed. */
  onFilesChange?: (items: readonly FileUploadItem[]) => void
  /**
   * `'zone'`: a tall drop zone that turns into a preview of the file. `'compact'`: a short zone
   * over a list of files (the usual pick for `multiple`). With `multiple`, `'zone'` keeps the tall
   * zone and lists the files under it.
   * @default 'zone'
   */
  layout?: 'zone' | 'compact'
  /** Line under the title, e.g. 'JPG, PNG or HEIC · up to 10 MB'. */
  hint?: ReactNode
  /** Text overrides, e.g. a translation. Missing keys keep the English defaults. */
  labels?: Partial<FileUploadLabels>
  /**
   * Shows the zone as invalid and sets `aria-invalid` on the input, for errors you own (a server
   * check). Point `aria-describedby` at your message.
   * @default false
   */
  invalid?: boolean
}

const describeAccept = (accept: string) => {
  const kinds = accept
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) =>
      token.endsWith('/*')
        ? `${token.slice(0, -2)} files`
        : (token.split('/').pop() as string).replace('.', '').toUpperCase(),
    )
  return kinds.length > 1 ? `${kinds.slice(0, -1).join(', ')} or ${kinds.at(-1)}` : kinds[0]
}

const defaultLabels: FileUploadLabels = {
  title: 'Choose a file or drop it here',
  titleTouch: 'Tap to take a photo',
  gallery: 'Or choose from your gallery',
  preparing: 'Preparing…',
  ready: 'Ready',
  uploaded: 'Uploaded',
  change: 'Change',
  remove: (name) => `Remove ${name}`,
  retry: 'Retry',
  wrongType: (accept) => `That file type isn't accepted. Use ${describeAccept(accept)}.`,
  tooBig: (size, max) => `That file is ${size}. The limit is ${max}.`,
  tooMany: (max) => (max === 1 ? 'Choose one file.' : `You can add up to ${max} files.`),
  unreadable: "Couldn't read that file. Try a JPG or PNG.",
  uploadFailed: "Couldn't upload. Check your connection.",
}

/** 1000-based, like `maxSize={10_000_000}` → '10 MB'. */
const formatBytes = (bytes: number) =>
  bytes < 1e3
    ? `${bytes} B`
    : bytes < 1e6
      ? `${Math.round(bytes / 1e3)} KB`
      : `${+(bytes / 1e6).toFixed(1)} MB`

// Some systems report HEIC photos with an empty type; the extension still says what they are.
const typeOf = (file: File) => file.type || (/\.hei[cf]$/i.test(file.name) ? 'image/heic' : '')

const accepts = (file: File, accept?: string) => {
  if (!accept) return true
  const type = typeOf(file).toLowerCase()
  const name = file.name.toLowerCase()
  return accept.split(',').some((raw) => {
    const token = raw.trim().toLowerCase()
    if (token.startsWith('.')) return name.endsWith(token)
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1))
    return token !== '' && type === token
  })
}

// Formats browsers draw in an <img>; HEIC/TIFF get the icon instead of a broken image.
const previewable = (file: File) => /^image\/(?!hei[cf]|tiff)/.test(file.type)

/** Puts the kept files back into the input so a native submit / FormData sends them. */
const writeFiles = (input: HTMLInputElement, files: readonly File[]) => {
  if (!files.length) {
    input.value = ''
    return
  }
  try {
    const transfer = new DataTransfer()
    for (const file of files) transfer.items.add(file)
    input.files = transfer.files
  } catch {
    // No DataTransfer constructor (very old browsers): the input keeps what was picked.
  }
}

const COARSE = '(pointer: coarse)'
const subscribeCoarse = (onChange: () => void) => {
  const query = window.matchMedia(COARSE)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
const isCoarse = () => window.matchMedia(COARSE).matches
// Unknown on the server and while hydrating: CSS (`pointer-coarse:`) picks the first paint.
const unknownPointer = () => null

/**
 * Lets people add files by tapping, picking or dropping them, and shows what they added. On a
 * phone it can open the camera straight away (an ID photo); photos can be shrunk on the device
 * first with `prepare={resizeImage()}`.
 *
 * @remarks
 * - SSR/RSC: a client component (`'use client'`) over a real `<input type="file">` inside a
 *   `<label>`, so before JS loads (or without it) it is a plain file field that submits with the
 *   form. The ref is that input.
 * - Accessibility: the whole zone is the input's label; keyboard users Tab to it and press
 *   Enter/Space (the zone shows the focus ring). Drag and drop is an extra. Errors render as
 *   `role="alert"`, are linked with `aria-describedby` and set `aria-invalid`. Upload bars are
 *   `role="progressbar"` named by the file; Remove and Retry name the file too. Use it inside
 *   `Field` with `Field.Label htmlFor={id}` or give it an `aria-label`.
 * - Checks, in order: count (`maxFiles`, 1 without `multiple`) → type (`accept`) → size
 *   (`maxSize`) → `prepare`. Refused files show the reason and are never kept.
 * - Forms: kept files (after `prepare`) are written back into the input with `DataTransfer`, so
 *   a native submit or `FormData` sends the prepared files, not the originals. With `onUpload`
 *   the input mirrors the list too; leave out `name` if your form shouldn't send them again.
 * - Variants: `layout`: 'zone' (default; a one-file preview with Change/Remove) | 'compact'
 *   (short zone + list; use with `multiple`). `invalid` and `disabled` restyle the zone.
 * - Touch screens: with `capture` the title becomes `labels.titleTouch` and a link to a second
 *   input without `capture` opens the photo library (CSS `pointer-coarse:` for the first paint,
 *   `matchMedia('(pointer: coarse)')` after hydration).
 * - Preview object URLs are revoked when a file is removed and on unmount; in-flight uploads are
 *   aborted on unmount.
 *
 * @example
 * ```tsx
 * import { Field, FileUpload, resizeImage } from '@sukunagg/ui'
 *
 * <Field>
 *   <Field.Label htmlFor="front">ID, front</Field.Label>
 *   <FileUpload
 *     id="front"
 *     name="front"
 *     accept="image/*"
 *     capture="environment"
 *     maxSize={10_000_000}
 *     prepare={resizeImage()}
 *     hint="JPG, PNG or HEIC · up to 10 MB"
 *     required
 *   />
 * </Field>
 * ```
 *
 * @example
 * ```tsx
 * import { FileUpload } from '@sukunagg/ui'
 *
 * // Upload each file yourself, with progress and Retry.
 * <FileUpload
 *   aria-label="Match screenshots"
 *   layout="compact"
 *   multiple
 *   maxFiles={3}
 *   accept="image/*"
 *   onUpload={(file, { onProgress, signal }) => uploadScreenshot(file, { onProgress, signal })}
 * />
 * ```
 */
export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(function FileUpload(
  {
    accept,
    capture,
    multiple = false,
    maxFiles = 10,
    maxSize,
    prepare,
    onUpload,
    onFilesChange,
    layout = 'zone',
    hint,
    labels,
    invalid = false,
    disabled = false,
    className,
    style,
    'aria-describedby': describedBy,
    ...rest
  },
  ref,
) {
  const t = { ...defaultLabels, ...labels }
  const uid = useId()
  const errorId = `${uid}error`
  const [items, setItems] = useState<FileUploadItem[]>([])
  const [error, setError] = useState<string>()
  const [dragging, setDragging] = useState(false)
  // [item id, "2000×1262"] — the shown preview's pixel size, read when its image loads.
  const [pixels, setPixels] = useState<[string, string]>()
  const coarse = useSyncExternalStore<boolean | null>(subscribeCoarse, isCoarse, unknownPointer)
  const input = useRef<HTMLInputElement | null>(null)
  const preview = useRef<HTMLDivElement>(null)
  const seq = useRef(0)
  const controllers = useRef(new Map<string, AbortController>())
  const urls = useRef(new Map<string, string>())
  const synced = useRef<{ items: FileUploadItem[]; files: readonly File[] }>({
    items,
    files: [],
  })
  const notify = useRef(onFilesChange)
  notify.current = onFilesChange

  const setInput = useCallback(
    (node: HTMLInputElement | null) => {
      input.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  // Mirror the list into the input and tell the consumer, after every change (not on mount).
  useEffect(() => {
    if (synced.current.items === items) return
    const files = items.map((item) => item.file)
    const before = synced.current.files
    if (files.length !== before.length || files.some((file, i) => file !== before[i]))
      writeFiles(input.current as HTMLInputElement, files)
    synced.current = { items, files }
    notify.current?.(items)
  }, [items])

  // Abort uploads and free preview URLs when FileUpload goes away.
  useEffect(() => {
    const live = controllers.current
    const made = urls.current
    return () => {
      for (const controller of live.values()) controller.abort()
      for (const url of made.values()) URL.revokeObjectURL(url)
    }
  }, [])

  const shown = layout === 'zone' && !multiple ? items[0] : undefined
  const shownId = shown?.id
  // The zone gives way to the preview: keep keyboard focus from falling to <body>.
  useEffect(() => {
    if (shownId && document.activeElement === input.current) preview.current?.focus()
  }, [shownId])

  const patch = (id: string, change: Partial<FileUploadItem>) =>
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...change } : item)))

  const discard = (id: string) => {
    controllers.current.get(id)?.abort()
    controllers.current.delete(id)
    const url = urls.current.get(id)
    if (url) URL.revokeObjectURL(url)
    urls.current.delete(id)
  }

  const drop = (id: string) => {
    discard(id)
    setItems((list) => list.filter((item) => item.id !== id))
  }

  const remove = (id: string) => {
    drop(id)
    setError(undefined)
    input.current?.focus()
  }

  const because = (file: File, reason: string) => (multiple ? `${file.name}: ${reason}` : reason)

  const upload = async (id: string, file: File) => {
    const send = onUpload as NonNullable<typeof onUpload>
    const controller = new AbortController()
    controllers.current.set(id, controller)
    patch(id, { status: 'uploading', progress: 0, error: undefined })
    try {
      await send(file, {
        signal: controller.signal,
        onProgress: (percent) =>
          patch(id, { progress: Math.round(Math.min(100, Math.max(0, percent))) }),
      })
      patch(id, { status: 'uploaded', progress: 100 })
    } catch {
      // A removed file is gone from the list already, so this is a no-op for aborts.
      patch(id, { status: 'error', error: t.uploadFailed })
    }
  }

  const run = async (item: FileUploadItem, controller: AbortController) => {
    let file: File | null = item.original
    if (prepare)
      try {
        file = await prepare(item.original)
      } catch {
        file = null
      }
    if (controller.signal.aborted) return
    if (!file) {
      drop(item.id)
      setError(because(item.original, t.unreadable))
      return
    }
    let previewUrl: string | undefined
    if (previewable(file)) {
      previewUrl = URL.createObjectURL(file)
      urls.current.set(item.id, previewUrl)
    }
    patch(item.id, { file, previewUrl, status: 'ready' })
    if (onUpload) await upload(item.id, file)
  }

  const take = (list: FileList | null) => {
    const files = Array.from(list ?? [])
    const max = multiple ? maxFiles : 1
    const added: FileUploadItem[] = []
    let problem: string | undefined
    if (files.length + (multiple ? items.length : 0) > max) problem = t.tooMany(max)
    else
      for (const file of files) {
        const reason = !accepts(file, accept)
          ? t.wrongType(accept as string)
          : maxSize !== undefined && file.size > maxSize
            ? t.tooBig(formatBytes(file.size), formatBytes(maxSize))
            : undefined
        if (reason) problem ??= because(file, reason)
        else
          added.push({
            id: `${uid}${seq.current++}`,
            file,
            original: file,
            status: prepare ? 'preparing' : 'ready',
          })
      }
    // An empty pick is a cancelled dialog: keep the current error and files.
    if (files.length) setError(problem)
    if (!added.length) {
      // The picker already replaced the input's files; put the kept ones back.
      writeFiles(
        input.current as HTMLInputElement,
        items.map((item) => item.file),
      )
      return
    }
    if (!multiple) for (const old of items) discard(old.id)
    setItems((current) => (multiple ? [...current, ...added] : added))
    for (const item of added) {
      const controller = new AbortController()
      controllers.current.set(item.id, controller)
      void run(item, controller)
    }
  }

  const over = (event: DragEvent<HTMLLabelElement>) => {
    if (disabled) return
    event.preventDefault()
    setDragging(true)
  }
  const leave = (event: DragEvent<HTMLLabelElement>) => {
    // Moving onto the zone's own children fires dragleave too; only leaving the zone counts.
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
  }
  const dropFiles = (event: DragEvent<HTMLLabelElement>) => {
    if (disabled) return
    event.preventDefault()
    setDragging(false)
    take(event.dataTransfer.files)
  }

  const isInvalid = invalid || error !== undefined
  const s = fileUploadStyles({ layout, dragging, invalid: isInvalid, disabled })
  const touch = capture ? coarse : false
  const title =
    touch === null ? (
      <>
        <span className="pointer-coarse:hidden">{t.title}</span>
        <span className="hidden pointer-coarse:inline">{t.titleTouch}</span>
      </>
    ) : touch ? (
      t.titleTouch
    ) : (
      t.title
    )

  const statusText = (item: FileUploadItem) =>
    item.status === 'uploading'
      ? `${item.progress}%`
      : item.status === 'error'
        ? item.error
        : t[item.status]

  const thumb = (item: FileUploadItem, alt: string) =>
    item.previewUrl ? (
      <img
        src={item.previewUrl}
        alt={alt}
        onLoad={(event) =>
          setPixels([
            item.id,
            `${event.currentTarget.naturalWidth}×${event.currentTarget.naturalHeight}`,
          ])
        }
      />
    ) : item.status === 'preparing' ? (
      <Spinner tone="current" aria-hidden />
    ) : typeOf(item.file).startsWith('image/') ? (
      <ImageIcon />
    ) : (
      item.file.name.split('.').pop()?.slice(0, 4).toUpperCase()
    )

  const progress = (item: FileUploadItem) =>
    item.status === 'uploading' ? (
      <span
        role="progressbar"
        aria-label={item.original.name}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={item.progress}
        className={s.progress()}
      >
        <span className={s.bar()} style={{ width: `${item.progress}%` }} />
      </span>
    ) : null

  const actions = (item: FileUploadItem, change?: ReactNode) => (
    <span className={s.actions()}>
      {item.status === 'error' ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => void upload(item.id, item.file)}
        >
          {t.retry}
          <span className="sr-only"> {item.original.name}</span>
        </Button>
      ) : null}
      {change}
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        disabled={disabled}
        aria-label={t.remove(item.original.name)}
        onClick={() => remove(item.id)}
      >
        <CloseIcon size={16} />
      </Button>
    </span>
  )

  const sizes = (item: FileUploadItem) =>
    item.file === item.original
      ? formatBytes(item.file.size)
      : `${formatBytes(item.original.size)} → ${formatBytes(item.file.size)}`

  return (
    <div className={s.root({ className })} style={style}>
      <label
        className={shown ? 'sr-only' : s.zone()}
        aria-hidden={shown ? true : undefined}
        onDragEnter={over}
        onDragOver={over}
        onDragLeave={leave}
        onDrop={dropFiles}
      >
        <input
          {...rest}
          ref={setInput}
          type="file"
          className="sr-only"
          accept={accept}
          capture={capture}
          multiple={multiple}
          disabled={disabled}
          tabIndex={shown ? -1 : rest.tabIndex}
          aria-invalid={isInvalid || undefined}
          aria-describedby={[describedBy, error && errorId].filter(Boolean).join(' ') || undefined}
          onChange={(event) => take(event.currentTarget.files)}
        />
        <span className={s.icon()}>
          {capture ? <CameraIcon size={20} /> : <UploadIcon size={20} />}
        </span>
        <span className={s.title()}>{title}</span>
        {hint ? <span className={s.hint()}>{hint}</span> : null}
      </label>
      {shown ? (
        <div
          ref={preview}
          tabIndex={-1}
          aria-busy={shown.status === 'preparing' || undefined}
          className={s.preview({ status: shown.status })}
        >
          <span className={s.thumb()}>{thumb(shown, shown.original.name)}</span>
          <div className={s.info()}>
            <p
              key={shown.status === 'error' ? 'alert' : 'status'}
              role={shown.status === 'error' ? 'alert' : 'status'}
              className={s.status({ status: shown.status, className: 'm-0' })}
            >
              {shown.status === 'ready' || shown.status === 'uploaded' ? (
                <CheckIcon size={15} />
              ) : null}
              {statusText(shown)}
            </p>
            <p className={s.meta({ className: 'm-0' })}>
              {[
                sizes(shown),
                [pixels?.[0] === shown.id && pixels[1], shown.file.type.split('/')[1]]
                  .filter(Boolean)
                  .join(' ')
                  .toUpperCase(),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {progress(shown)}
            {actions(
              shown,
              <Button
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={() => input.current?.click()}
              >
                {t.change}
              </Button>,
            )}
          </div>
        </div>
      ) : null}
      {capture && touch !== false && !shown ? (
        <label className={s.gallery()}>
          {t.gallery}
          <input
            type="file"
            className="sr-only"
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            onChange={(event) => {
              take(event.currentTarget.files)
              event.currentTarget.value = ''
            }}
          />
        </label>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className={s.error()}>
          {error}
        </p>
      ) : null}
      {!shown && items.length ? (
        <ul className={s.list()}>
          {items.map((item) => (
            <li
              key={item.id}
              aria-busy={item.status === 'preparing' || undefined}
              className={s.row({ status: item.status })}
            >
              <span className={s.thumb({ layout: 'compact' })}>{thumb(item, '')}</span>
              <span className={s.body()}>
                <span className={s.name()}>{item.original.name}</span>
                <span
                  key={item.status === 'error' ? 'alert' : 'status'}
                  role={item.status === 'error' ? 'alert' : undefined}
                  className={s.meta({ status: item.status })}
                >
                  {formatBytes(item.file.size)} · {statusText(item)}
                </span>
                {progress(item)}
              </span>
              {actions(item)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
})
