/** Options for {@link resizeImage}. */
export interface ResizeImageOptions {
  /**
   * Longest side of the output, in px. Larger images are scaled down to it; smaller ones keep
   * their size (never upscaled).
   * @default 2000
   */
  maxSide?: number
  /**
   * Output format. The file extension follows it (`.jpg` / `.webp`).
   * @default 'image/jpeg'
   */
  type?: 'image/jpeg' | 'image/webp'
  /**
   * Encoder quality, 0–1.
   * @default 0.85
   */
  quality?: number
}

/**
 * Makes a `prepare` function that shrinks photos on the device before they're kept or uploaded:
 * it applies the camera's rotation (EXIF), caps the long side at `maxSide` and re-encodes, so a
 * 12 MB phone photo becomes a ~400 KB JPEG.
 *
 * @remarks
 * - Browser only: uses `createImageBitmap` and a `<canvas>`, so call the returned function from
 *   the client (FileUpload does, from its `prepare` prop). Creating it with `resizeImage()` is
 *   safe anywhere, including during server rendering.
 * - Files whose type is known and not `image/*` (a PDF next to photos) pass through unchanged.
 * - Throws when the browser can't decode the image (HEIC on most non-Apple browsers, a broken
 *   file); FileUpload shows that as `labels.unreadable`.
 * - Opt-in and tree-shaken: importing FileUpload alone doesn't bundle it.
 *
 * @example
 * ```tsx
 * import { FileUpload, resizeImage } from '@sukunagg/ui'
 *
 * <FileUpload name="front" accept="image/*" capture="environment" prepare={resizeImage()} />
 *
 * // Smaller WebP thumbnails.
 * <FileUpload
 *   name="avatar"
 *   accept="image/*"
 *   prepare={resizeImage({ maxSide: 512, type: 'image/webp' })}
 * />
 * ```
 */
export function resizeImage({
  maxSide = 2000,
  type = 'image/jpeg',
  quality = 0.85,
}: ResizeImageOptions = {}): (file: File) => Promise<File> {
  return async (file) => {
    if (file.type && !file.type.startsWith('image/')) return file
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    context?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob =
      context && (await new Promise<Blob | null>((done) => canvas.toBlob(done, type, quality)))
    if (!blob) throw new Error(`resizeImage: couldn't encode ${file.name}`)
    const base = file.name.replace(/\.[^.]*$/, '') || 'image'
    return new File([blob], `${base}.${type === 'image/webp' ? 'webp' : 'jpg'}`, {
      type,
      lastModified: file.lastModified,
    })
  }
}
