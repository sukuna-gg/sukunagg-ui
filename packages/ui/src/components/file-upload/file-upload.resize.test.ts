import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { resizeImage } from './index'

type Bitmap = { width: number; height: number; close: () => void }

let bitmap: ReturnType<typeof spyOn>
let context: ReturnType<typeof spyOn>
let toBlob: ReturnType<typeof spyOn>
let drawImage: ReturnType<typeof mock>
let close: ReturnType<typeof mock>
/** The canvas size and encoder arguments of the last toBlob call. */
let encoded: { width: number; height: number; type?: string; quality?: unknown }

function source(width: number, height: number) {
  close = mock()
  bitmap.mockImplementation(async () => ({ width, height, close }) as Bitmap)
}

beforeEach(() => {
  drawImage = mock()
  bitmap = spyOn(globalThis, 'createImageBitmap')
  source(4000, 3000)
  context = spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ({
    drawImage,
  })) as unknown as HTMLCanvasElement['getContext'])
  toBlob = spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    done: BlobCallback,
    type?: string,
    quality?: unknown,
  ) {
    encoded = { width: this.width, height: this.height, type, quality }
    done(new Blob(['encoded'], { type }))
  })
})
afterEach(() => {
  bitmap.mockRestore()
  context.mockRestore()
  toBlob.mockRestore()
})

const photo = (name = 'IMG_0001.HEIC', type = 'image/heic') =>
  new File(['original bytes'], name, { type, lastModified: 1_700_000_000_000 })

describe('resizeImage', () => {
  it('caps the long side at 2000px, applies the camera rotation and re-encodes as JPEG 0.85', async () => {
    const original = photo()
    const out = await resizeImage()(original)
    expect(bitmap).toHaveBeenCalledWith(original, { imageOrientation: 'from-image' })
    expect(encoded).toEqual({ width: 2000, height: 1500, type: 'image/jpeg', quality: 0.85 })
    expect(drawImage.mock.calls[0]?.slice(1)).toEqual([0, 0, 2000, 1500])
    expect(close).toHaveBeenCalled()
    expect(out).toBeInstanceOf(File)
    expect(out.name).toBe('IMG_0001.jpg')
    expect(out.type).toBe('image/jpeg')
    expect(out.lastModified).toBe(original.lastModified)
    expect(await out.text()).toBe('encoded')
  })

  it('caps portrait photos by their height', async () => {
    source(3000, 4000)
    await resizeImage()(photo())
    expect(encoded).toMatchObject({ width: 1500, height: 2000 })
  })

  it('never upscales a smaller image (re-encodes it at its own size)', async () => {
    source(800, 600)
    await resizeImage()(photo('small.png', 'image/png'))
    expect(encoded).toMatchObject({ width: 800, height: 600 })
  })

  it('passes maxSide, type and quality through and renames to .webp', async () => {
    source(1024, 4096)
    const out = await resizeImage({ maxSide: 512, type: 'image/webp', quality: 0.7 })(
      photo('avatar.final.png', 'image/png'),
    )
    expect(encoded).toEqual({ width: 128, height: 512, type: 'image/webp', quality: 0.7 })
    expect(out.name).toBe('avatar.final.webp')
    expect(out.type).toBe('image/webp')
  })

  it('names a file without a base name "image"', async () => {
    expect((await resizeImage()(photo('.jpg', 'image/jpeg'))).name).toBe('image.jpg')
    expect((await resizeImage()(photo('scan', ''))).name).toBe('scan.jpg')
  })

  it('passes non-image files through untouched', async () => {
    const pdf = photo('statement.pdf', 'application/pdf')
    expect(await resizeImage()(pdf)).toBe(pdf)
    expect(bitmap).not.toHaveBeenCalled()
  })

  it('throws when the image cannot be decoded', async () => {
    bitmap.mockImplementation(async () => {
      throw new DOMException('The source image could not be decoded.', 'InvalidStateError')
    })
    await expect(resizeImage()(photo())).rejects.toThrow('could not be decoded')
  })

  it('throws when the canvas cannot encode', async () => {
    toBlob.mockImplementation((done: BlobCallback) => done(null))
    await expect(resizeImage()(photo('a.jpg', 'image/jpeg'))).rejects.toThrow(
      "resizeImage: couldn't encode a.jpg",
    )
    context.mockImplementation(() => null)
    await expect(resizeImage()(photo('b.jpg', 'image/jpeg'))).rejects.toThrow('b.jpg')
  })
})
