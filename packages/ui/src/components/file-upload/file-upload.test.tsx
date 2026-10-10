import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { act, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { Field } from '../field'
import { FileUpload, type FileUploadItem } from './index'

/** A File with a given (claimed) size, so tests don't allocate megabytes. */
function file(name: string, type: string, size = 2_000) {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}
const photo = (name = 'front.png', size = 3_400_000) => file(name, 'image/png', size)

/** Puts files into the real input the way the browser does, then fires `change`. */
function choose(input: HTMLInputElement, files: File[]) {
  const transfer = new DataTransfer()
  for (const f of files) transfer.items.add(f)
  input.files = transfer.files
  fireEvent.change(input)
}

const fileInput = (container: HTMLElement) =>
  container.querySelector('input[type="file"]') as HTMLInputElement
const zoneOf = (input: HTMLInputElement) => input.closest('label') as HTMLLabelElement

/** A promise you settle from the test. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

let created: ReturnType<typeof spyOn>
let revoked: ReturnType<typeof spyOn>
let urlCount = 0
beforeEach(() => {
  urlCount = 0
  created = spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:test-${++urlCount}`)
  revoked = spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})
afterEach(() => {
  created.mockRestore()
  revoked.mockRestore()
})

describe('FileUpload', () => {
  describe('server and hydration', () => {
    it('renders a label around a real file input on the server (works without JS)', () => {
      const html = renderServer(
        <FileUpload name="front" accept="image/*" hint="JPG or PNG · up to 10 MB" required />,
      )
      expect(html).toMatch(/^<div[^>]*><label/)
      expect(html).toContain('type="file"')
      expect(html).toContain('name="front"')
      expect(html).toContain('accept="image/*"')
      expect(html).toContain('required=""')
      expect(html).toContain('Choose a file or drop it here')
      expect(html).toContain('JPG or PNG · up to 10 MB')
      for (const layout of ['zone', 'compact'] as const)
        expect(renderServer(<FileUpload layout={layout} multiple />)).toContain('multiple=""')
    })

    it('with capture, the server draws both titles and the gallery link for CSS to pick', () => {
      const html = renderServer(<FileUpload accept="image/*" capture="environment" />)
      expect(html).toContain('capture="environment"')
      expect(html).toContain('Tap to take a photo')
      expect(html).toContain('pointer-coarse:inline-flex')
      expect(html).toContain('Or choose from your gallery')
      // The gallery input has no capture attribute (it opens the photo library).
      expect(html.match(/type="file"/g)).toHaveLength(2)
      expect(html.match(/capture=/g)).toHaveLength(1)
    })

    it('hydrates without warnings', async () => {
      await expectHydrates(<FileUpload name="doc" hint="PDF" />)
      await expectHydrates(<FileUpload accept="image/*" capture="environment" layout="compact" />)
    })
  })

  describe('props, ref and styling', () => {
    it('passes native props to the input and className/style to the wrapper', () => {
      const { container } = render(
        <FileUpload
          id="front"
          name="front"
          data-testid="input"
          aria-label="ID, front"
          className="gap-4"
          style={{ maxWidth: 320 }}
        />,
      )
      const input = screen.getByTestId('input')
      expect(input).toBe(fileInput(container))
      expect(input).toHaveAttribute('id', 'front')
      expect(input).toHaveAttribute('name', 'front')
      expect(input).toHaveAccessibleName('ID, front')
      const root = container.firstElementChild as HTMLElement
      expect(root.classList.contains('gap-4')).toBe(true)
      expect(root.classList.contains('gap-2')).toBe(false)
      expect(root.style.maxWidth).toBe('320px')
    })

    it('forwards the ref to the real input (object and callback refs)', () => {
      const ref = createRef<HTMLInputElement>()
      const { unmount } = render(<FileUpload ref={ref} />)
      expect(ref.current).toBeInstanceOf(HTMLInputElement)
      expect(ref.current?.type).toBe('file')
      unmount()
      let node: HTMLInputElement | null = null
      render(
        <FileUpload
          ref={(el) => {
            node = el
          }}
        />,
      )
      expect(node).toBeInstanceOf(HTMLInputElement)
    })

    it('is labelled by the zone, or by Field.Label plus the zone', () => {
      const { unmount } = render(<FileUpload hint="Up to 10 MB" />)
      expect(screen.getByLabelText(/Choose a file or drop it here/)).toBeInstanceOf(
        HTMLInputElement,
      )
      unmount()
      render(
        <Field>
          <Field.Label htmlFor="front">ID, front</Field.Label>
          <FileUpload id="front" />
        </Field>,
      )
      expect(screen.getByLabelText(/ID, front/)).toHaveAttribute('type', 'file')
    })

    it('invalid and disabled restyle the zone and reach the input', () => {
      const { container, rerender } = render(<FileUpload invalid aria-describedby="err" />)
      const input = fileInput(container)
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby', 'err')
      expect(zoneOf(input).classList.contains('border-accent')).toBe(true)
      rerender(<FileUpload disabled />)
      expect(input).toBeDisabled()
      expect(input.hasAttribute('aria-invalid')).toBe(false)
      expect(zoneOf(input).classList.contains('opacity-45')).toBe(true)
    })

    it('compact layout puts the icon beside a short zone', () => {
      const { container } = render(<FileUpload layout="compact" />)
      const zone = zoneOf(fileInput(container))
      expect(zone.classList.contains('min-h-[92px]')).toBe(true)
      expect(zone.querySelector('svg')).not.toBeNull()
    })
  })

  describe('validation', () => {
    it('accepts by wildcard, extension (any case) and exact type', async () => {
      const onFilesChange = mock()
      const { container, rerender } = render(
        <FileUpload
          accept="image/*,.pdf"
          multiple
          layout="compact"
          onFilesChange={onFilesChange}
        />,
      )
      const input = fileInput(container)
      choose(input, [photo('a.png'), file('b.PDF', ''), file('c.heic', '')])
      expect(screen.getAllByRole('listitem')).toHaveLength(3)
      expect(screen.queryByRole('alert')).toBeNull()

      rerender(<FileUpload accept="application/pdf, image/png" multiple layout="compact" />)
      choose(input, [file('d.pdf', 'application/pdf')])
      expect(screen.getAllByRole('listitem')).toHaveLength(4)
      expect(onFilesChange).toHaveBeenCalledTimes(1)
    })

    it('refuses other types with an alert linked to the input', async () => {
      const { container } = render(<FileUpload accept="image/*,.pdf" aria-describedby="help" />)
      const input = fileInput(container)
      choose(input, [file('notes.txt', 'text/plain')])
      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent("That file type isn't accepted. Use image files or PDF.")
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input.getAttribute('aria-describedby')).toBe(`help ${alert.id}`)
      expect(zoneOf(input).classList.contains('border-accent')).toBe(true)
      // The refused file doesn't stay in the input.
      expect(input.files).toHaveLength(0)
    })

    it('describes a single accepted type and a list', () => {
      const { container, rerender } = render(<FileUpload accept=".pdf" />)
      choose(fileInput(container), [file('a.txt', 'text/plain')])
      expect(screen.getByRole('alert')).toHaveTextContent('Use PDF.')
      rerender(<FileUpload accept=".jpg, .png,image/webp" />)
      choose(fileInput(container), [file('a.txt', 'text/plain')])
      expect(screen.getByRole('alert')).toHaveTextContent('Use JPG, PNG or WEBP.')
    })

    it('refuses files over maxSize, measured on the original', () => {
      const { container } = render(<FileUpload accept="image/*" maxSize={10_000_000} />)
      choose(fileInput(container), [photo('big.png', 12_400_000)])
      expect(screen.getByRole('alert')).toHaveTextContent(
        'That file is 12.4 MB. The limit is 10 MB.',
      )
      expect(screen.queryByRole('status')).toBeNull()
    })

    it('refuses more files than allowed, whole', () => {
      const { container, rerender } = render(<FileUpload multiple maxFiles={2} layout="compact" />)
      const input = fileInput(container)
      choose(input, [photo('a.png'), photo('b.png'), photo('c.png')])
      expect(screen.getByRole('alert')).toHaveTextContent('You can add up to 2 files.')
      expect(screen.queryAllByRole('listitem')).toHaveLength(0)
      // The limit counts files already kept.
      choose(input, [photo('a.png')])
      expect(screen.queryByRole('alert')).toBeNull()
      choose(input, [photo('b.png'), photo('c.png')])
      expect(screen.getByRole('alert')).toHaveTextContent('You can add up to 2 files.')
      expect(screen.getAllByRole('listitem')).toHaveLength(1)
      rerender(<FileUpload layout="compact" />)
      fireEvent.drop(zoneOf(input), { dataTransfer: { files: [photo('x.png'), photo('y.png')] } })
      expect(screen.getByRole('alert')).toHaveTextContent('Choose one file.')
    })

    it('names the refused file when there are several', () => {
      const { container } = render(<FileUpload accept="image/*" multiple layout="compact" />)
      choose(fileInput(container), [photo('ok.png'), file('notes.txt', 'text/plain')])
      expect(screen.getByRole('alert')).toHaveTextContent(/^notes\.txt: That file type/)
      expect(screen.getAllByRole('listitem')).toHaveLength(1)
    })
  })

  describe('prepare and the form', () => {
    it('shows preparing, then the preview, and writes the prepared file back into the input', async () => {
      const pending = deferred<File>()
      const prepare = mock(() => pending.promise)
      const onFilesChange = mock((_: readonly FileUploadItem[]) => {})
      const { container } = render(
        <FileUpload name="front" prepare={prepare} onFilesChange={onFilesChange} />,
      )
      const input = fileInput(container)
      const original = photo('IMG_0001.png', 3_400_000)
      choose(input, [original])
      expect(prepare).toHaveBeenCalledWith(original)
      expect(screen.getByRole('status')).toHaveTextContent('Preparing…')
      expect(screen.getByRole('status').closest('[aria-busy="true"]')).not.toBeNull()

      const small = file('IMG_0001.jpg', 'image/jpeg', 412_000)
      pending.resolve(small)
      expect(await screen.findByText('Ready')).toBeTruthy()
      expect(screen.getByText('3.4 MB → 412 KB · JPEG')).toBeTruthy()
      expect(screen.getByRole('img', { name: 'IMG_0001.png' })).toHaveAttribute(
        'src',
        'blob:test-1',
      )
      expect(created).toHaveBeenCalledWith(small)
      // The write-back runs in an effect after the preview renders.
      await waitFor(() => expect(input.files?.[0]?.name).toBe('IMG_0001.jpg'))
      const last = onFilesChange.mock.calls.at(-1)?.[0] as readonly FileUploadItem[]
      expect(last[0]).toMatchObject({ file: small, original, status: 'ready' })
    })

    it('adds the image size to the preview once it loads', async () => {
      const { container } = render(<FileUpload />)
      choose(fileInput(container), [photo('a.png', 900)])
      const img = await screen.findByRole('img', { name: 'a.png' })
      Object.defineProperty(img, 'naturalWidth', { value: 2000 })
      Object.defineProperty(img, 'naturalHeight', { value: 1262 })
      fireEvent.load(img)
      expect(screen.getByText('900 B · 2000×1262 PNG')).toBeTruthy()
    })

    it('drops a file prepare cannot read, with the unreadable message', async () => {
      const prepare = mock(() => Promise.reject(new Error('HEIC')))
      const { container } = render(<FileUpload accept="image/*" prepare={prepare} />)
      const input = fileInput(container)
      choose(input, [file('IMG_1.heic', '')])
      expect(await screen.findByRole('alert')).toHaveTextContent(
        "Couldn't read that file. Try a JPG or PNG.",
      )
      expect(screen.queryByRole('status')).toBeNull()
      expect(zoneOf(input).getAttribute('aria-hidden')).toBeNull()
      expect(input.files).toHaveLength(0)
    })

    it('a prepare that throws synchronously is unreadable too', async () => {
      const prepare = () => {
        throw new Error('not a promise')
      }
      const { container } = render(<FileUpload prepare={prepare} />)
      choose(fileInput(container), [photo('a.png')])
      expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't read that file.")
    })

    it('a file removed while preparing is never kept or uploaded', async () => {
      const pending = deferred<File>()
      const onUpload = mock(() => Promise.resolve())
      const { container } = render(
        <FileUpload prepare={() => pending.promise} onUpload={onUpload} />,
      )
      choose(fileInput(container), [photo('a.png')])
      await userEvent.click(screen.getByRole('button', { name: 'Remove a.png' }))
      await act(async () => pending.resolve(photo('a.png')))
      expect(onUpload).not.toHaveBeenCalled()
      expect(created).not.toHaveBeenCalled()
      expect(screen.queryByRole('status')).toBeNull()
      // A failing prepare after removal stays silent too.
      const failing = deferred<File>()
      const { container: c2 } = render(<FileUpload prepare={() => failing.promise} />)
      choose(fileInput(c2), [photo('b.png')])
      await userEvent.click(screen.getByRole('button', { name: 'Remove b.png' }))
      await act(async () => failing.reject(new Error('x')))
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('keeps working when DataTransfer is missing (the input keeps what was picked)', async () => {
      const { container } = render(<FileUpload prepare={async () => photo('small.png', 10)} />)
      const input = fileInput(container)
      choose(input, [photo('big.png')])
      const saved = globalThis.DataTransfer
      // biome-ignore lint/suspicious/noExplicitAny: simulating an old browser
      ;(globalThis as any).DataTransfer = undefined
      try {
        expect(await screen.findByText('Ready')).toBeTruthy()
        expect(input.files?.[0]?.name).toBe('big.png')
      } finally {
        globalThis.DataTransfer = saved
      }
    })

    it('an invalid or cancelled pick keeps the kept file in the input', async () => {
      const { container } = render(<FileUpload accept="image/*" />)
      const input = fileInput(container)
      choose(input, [photo('keep.png')])
      await screen.findByText('Ready')
      choose(input, [file('notes.txt', 'text/plain')])
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(screen.getByText('Ready')).toBeTruthy()
      expect(input.files?.[0]?.name).toBe('keep.png')
      // A cancelled dialog (no files) changes nothing, not even the error.
      choose(input, [])
      expect(screen.getByRole('alert')).toBeTruthy()
      expect(input.files?.[0]?.name).toBe('keep.png')
    })

    it('a new pick replaces the single file and frees its preview', async () => {
      const { container } = render(<FileUpload />)
      const input = fileInput(container)
      choose(input, [photo('one.png')])
      await screen.findByRole('img', { name: 'one.png' })
      choose(input, [photo('two.png')])
      await screen.findByRole('img', { name: 'two.png' })
      expect(revoked).toHaveBeenCalledWith('blob:test-1')
      expect(input.files).toHaveLength(1)
      expect(input.files?.[0]?.name).toBe('two.png')
    })
  })

  describe('one-file preview', () => {
    it('moves focus to the preview, Change reopens the picker, Remove brings the zone back', async () => {
      const user = userEvent.setup()
      const { container } = render(<FileUpload capture="environment" />)
      const input = fileInput(container)
      await user.tab()
      expect(input).toHaveFocus()
      choose(input, [photo('front.png')])
      await screen.findByText('Ready')
      const zone = zoneOf(input)
      expect(zone).toHaveAttribute('aria-hidden', 'true')
      expect(zone.className).toBe('sr-only')
      expect(input).toHaveAttribute('tabindex', '-1')
      expect(screen.queryByText('Or choose from your gallery')).toBeNull()
      const preview = document.activeElement as HTMLElement
      expect(preview.contains(screen.getByText('Ready'))).toBe(true)

      const click = spyOn(input, 'click').mockImplementation(() => {})
      await user.click(screen.getByRole('button', { name: 'Change' }))
      expect(click).toHaveBeenCalledTimes(1)

      await user.tab()
      expect(screen.getByRole('button', { name: 'Remove front.png' })).toHaveFocus()
      await user.keyboard('[Enter]')
      expect(screen.queryByText('Ready')).toBeNull()
      expect(zone.getAttribute('aria-hidden')).toBeNull()
      expect(input).toHaveFocus()
      expect(input.hasAttribute('tabindex')).toBe(false)
      expect(input.files).toHaveLength(0)
      expect(revoked).toHaveBeenCalledWith('blob:test-1')
    })

    it('does not steal focus when the file came by drag and drop', async () => {
      const { container } = render(<FileUpload />)
      fireEvent.drop(zoneOf(fileInput(container)), { dataTransfer: { files: [photo('a.png')] } })
      await screen.findByText('Ready')
      expect(document.activeElement).toBe(document.body)
    })

    it('shows non-image files by extension and undrawable images with an icon', async () => {
      const { container, unmount } = render(<FileUpload accept=".pdf" />)
      choose(fileInput(container), [file('statement.pdf', 'application/pdf', 52_000)])
      await screen.findByText('Ready')
      expect(screen.getByText('PDF')).toBeTruthy()
      expect(screen.getByText('52 KB · PDF')).toBeTruthy()
      expect(created).not.toHaveBeenCalled()
      unmount()
      const { container: c2 } = render(<FileUpload accept="image/*" />)
      choose(fileInput(c2), [file('IMG_2.heic', 'image/heic')])
      await screen.findByText('Ready')
      const card = screen.getByText('Ready').closest('[tabindex="-1"]') as HTMLElement
      expect(card.querySelector('img')).toBeNull()
      expect(card.firstElementChild?.querySelector('svg')).not.toBeNull()
      expect(created).not.toHaveBeenCalled()
    })
  })

  describe('uploading', () => {
    it('reports progress on a named progressbar, then Uploaded', async () => {
      const pending = deferred<void>()
      let report: (n: number) => void = () => {}
      const onUpload = mock((_f: File, ctx: { onProgress: (n: number) => void }) => {
        report = ctx.onProgress
        return pending.promise
      })
      const { container } = render(<FileUpload layout="compact" onUpload={onUpload} />)
      choose(fileInput(container), [photo('shot.png', 2_000_000)])
      const bar = screen.getByRole('progressbar', { name: 'shot.png' })
      expect(bar).toHaveAttribute('aria-valuenow', '0')
      act(() => report(39.6))
      expect(bar).toHaveAttribute('aria-valuenow', '40')
      expect(screen.getByText('2 MB · 40%')).toBeTruthy()
      act(() => report(250))
      expect(bar).toHaveAttribute('aria-valuenow', '100')
      act(() => report(-5))
      expect(bar).toHaveAttribute('aria-valuenow', '0')
      await act(async () => pending.resolve())
      expect(screen.getByText('2 MB · Uploaded')).toBeTruthy()
      expect(screen.queryByRole('progressbar')).toBeNull()
    })

    it('Remove aborts the upload; unmount aborts the rest', async () => {
      const signals: AbortSignal[] = []
      const onUpload = (_f: File, ctx: { signal: AbortSignal }) => {
        signals.push(ctx.signal)
        return new Promise<void>((_, reject) =>
          ctx.signal.addEventListener('abort', () => reject(new Error('aborted'))),
        )
      }
      const { container, unmount } = render(
        <FileUpload multiple layout="compact" onUpload={onUpload} />,
      )
      choose(fileInput(container), [photo('a.png'), photo('b.png')])
      expect(signals).toHaveLength(2)
      await userEvent.click(screen.getByRole('button', { name: 'Remove a.png' }))
      expect(signals[0]?.aborted).toBe(true)
      expect(signals[1]?.aborted).toBe(false)
      expect(screen.getAllByRole('listitem')).toHaveLength(1)
      expect(screen.queryByRole('alert')).toBeNull()
      unmount()
      expect(signals[1]?.aborted).toBe(true)
      expect(revoked).toHaveBeenCalledWith('blob:test-2')
    })

    it('a failed upload offers Retry, which uploads again', async () => {
      let attempt = 0
      const onUpload = mock(() =>
        ++attempt === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(),
      )
      const { container } = render(<FileUpload layout="compact" onUpload={onUpload} />)
      choose(fileInput(container), [photo('shot.png', 2_000_000)])
      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent("2 MB · Couldn't upload. Check your connection.")
      const row = screen.getByRole('listitem')
      expect(row.classList.contains('border-accent/45')).toBe(true)
      const retry = screen.getByRole('button', { name: 'Retry shot.png' })
      await userEvent.click(retry)
      expect(onUpload).toHaveBeenCalledTimes(2)
      expect(await screen.findByText('2 MB · Uploaded')).toBeTruthy()
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('uploads the prepared file and shows the state in the one-file preview', async () => {
      const prepared = photo('small.png', 400_000)
      const onUpload = mock((_file: File) => Promise.reject(new Error('500')))
      render(<FileUpload prepare={async () => prepared} onUpload={onUpload} />)
      choose(fileInput(document.body), [photo('big.png')])
      expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't upload.")
      expect(onUpload.mock.calls[0]?.[0]).toBe(prepared)
      expect(screen.getByRole('button', { name: 'Retry big.png' })).toBeTruthy()
    })
  })

  describe('multiple files', () => {
    it('collects picks in a list and mirrors it into the input', async () => {
      const { container } = render(<FileUpload multiple layout="compact" />)
      const input = fileInput(container)
      choose(input, [photo('a.png', 500), photo('b.png')])
      choose(input, [file('c.pdf', 'application/pdf')])
      const rows = screen.getAllByRole('listitem')
      expect(rows).toHaveLength(3)
      expect(rows[0]).toHaveTextContent('a.png500 B · Ready')
      expect(rows[2]).toHaveTextContent('PDF')
      expect(Array.from(input.files ?? []).map((f) => f.name)).toEqual(['a.png', 'b.png', 'c.pdf'])
      await userEvent.click(screen.getByRole('button', { name: 'Remove b.png' }))
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
      expect(input).toHaveFocus()
      expect(Array.from(input.files ?? []).map((f) => f.name)).toEqual(['a.png', 'c.pdf'])
    })

    it('zone layout with multiple keeps the tall zone and lists under it', () => {
      const { container } = render(<FileUpload multiple />)
      const input = fileInput(container)
      choose(input, [photo('a.png')])
      expect(zoneOf(input).classList.contains('min-h-[172px]')).toBe(true)
      expect(screen.getAllByRole('listitem')).toHaveLength(1)
    })
  })

  describe('drag and drop', () => {
    it('highlights while a file is over the zone and ignores leaving onto its children', () => {
      const { container } = render(<FileUpload layout="compact" />)
      const input = fileInput(container)
      const zone = zoneOf(input)
      const icon = zone.querySelector('span') as HTMLElement
      // happy-dom drops `relatedTarget` from drag event init, so set it on the event itself.
      const leaveTo = (target: Element) => {
        const event = createEvent.dragLeave(zone)
        Object.defineProperty(event, 'relatedTarget', { value: target })
        fireEvent(zone, event)
      }
      fireEvent.dragEnter(zone)
      expect(zone.classList.contains('border-solid')).toBe(true)
      leaveTo(icon)
      expect(zone.classList.contains('border-solid')).toBe(true)
      leaveTo(document.body)
      expect(zone.classList.contains('border-solid')).toBe(false)
      fireEvent.dragOver(zone)
      fireEvent.drop(zone, { dataTransfer: { files: [photo('dropped.png')] } })
      expect(zone.classList.contains('border-solid')).toBe(false)
      expect(screen.getByRole('listitem')).toHaveTextContent('dropped.png')
      expect(input.files?.[0]?.name).toBe('dropped.png')
    })

    it('ignores drags and drops while disabled', () => {
      const { container } = render(<FileUpload disabled layout="compact" />)
      const zone = zoneOf(fileInput(container))
      expect(fireEvent.dragOver(zone)).toBe(true) // not cancelled: the zone isn't a drop target
      expect(zone.classList.contains('border-solid')).toBe(false)
      fireEvent.drop(zone, { dataTransfer: { files: [photo('a.png')] } })
      expect(screen.queryByRole('listitem')).toBeNull()
    })
  })

  describe('touch screens with capture', () => {
    let media: ReturnType<typeof spyOn>
    const listeners = new Set<() => void>()
    const query = (matches: boolean) =>
      ({
        matches,
        addEventListener: (_: string, fn: () => void) => listeners.add(fn),
        removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
      }) as unknown as MediaQueryList
    beforeEach(() => {
      media = spyOn(window, 'matchMedia').mockReturnValue(query(true))
    })
    afterEach(() => media.mockRestore())

    it('says "take a photo" and adds a gallery input without capture', () => {
      const { container } = render(<FileUpload accept="image/*" capture="environment" />)
      expect(media).toHaveBeenCalledWith('(pointer: coarse)')
      expect(screen.getByText('Tap to take a photo')).toBeTruthy()
      expect(screen.queryByText('Choose a file or drop it here')).toBeNull()
      const gallery = screen.getByLabelText('Or choose from your gallery') as HTMLInputElement
      expect(gallery).not.toBe(fileInput(container))
      expect(gallery.hasAttribute('capture')).toBe(false)
      expect(gallery).toHaveAttribute('accept', 'image/*')
      expect(fileInput(container)).toHaveAttribute('capture', 'environment')

      choose(gallery, [photo('library.png')])
      expect(screen.getByRole('status')).toHaveTextContent('Ready')
      expect(gallery.files).toHaveLength(0)
      expect(fileInput(container).files?.[0]?.name).toBe('library.png')
    })

    it('follows pointer changes and unsubscribes on unmount', () => {
      const { unmount } = render(<FileUpload capture="user" />)
      expect(screen.getByText('Or choose from your gallery')).toBeTruthy()
      media.mockReturnValue(query(false))
      act(() => {
        for (const fn of listeners) fn()
      })
      expect(screen.queryByText('Or choose from your gallery')).toBeNull()
      expect(screen.getByText('Choose a file or drop it here')).toBeTruthy()
      unmount()
      expect(listeners.size).toBe(0)
    })

    it('has no gallery link without capture', () => {
      render(<FileUpload />)
      expect(screen.queryByText('Or choose from your gallery')).toBeNull()
      expect(screen.getByText('Choose a file or drop it here')).toBeTruthy()
    })
  })

  describe('labels', () => {
    it('every text can be replaced', async () => {
      const es = {
        title: 'Elige una foto o arrástrala aquí',
        preparing: 'Preparando foto…',
        ready: 'Foto lista',
        change: 'Cambiar foto',
        remove: (n: string) => `Quitar ${n}`,
        wrongType: () => 'Ese archivo no es una foto.',
      }
      const pending = deferred<File>()
      const { container } = render(
        <FileUpload accept="image/*" labels={es} prepare={() => pending.promise} />,
      )
      expect(screen.getByText(es.title)).toBeTruthy()
      choose(fileInput(container), [file('a.txt', 'text/plain')])
      expect(screen.getByRole('alert')).toHaveTextContent('Ese archivo no es una foto.')
      choose(fileInput(container), [photo('frente.png')])
      expect(screen.getByRole('status')).toHaveTextContent('Preparando foto…')
      pending.resolve(photo('frente.png'))
      expect(await screen.findByText('Foto lista')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Cambiar foto' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Quitar frente.png' })).toBeTruthy()
    })
  })

  describe('accessibility', () => {
    it('passes axe in both themes: empty, invalid, preview and list', async () => {
      for (const theme of ['dark', 'light']) {
        const { container, unmount } = render(
          <div data-theme={theme}>
            <Field>
              <Field.Label htmlFor={`front-${theme}`}>ID, front</Field.Label>
              <FileUpload
                id={`front-${theme}`}
                accept="image/*"
                capture="environment"
                hint="Up to 10 MB"
              />
            </Field>
            <FileUpload aria-label="Back" invalid />
            <FileUpload aria-label="Screenshots" layout="compact" multiple />
            <FileUpload aria-label="Passport" />
          </div>,
        )
        const inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]')
        choose(inputs[inputs.length - 2] as HTMLInputElement, [photo('a.png'), photo('b.png')])
        choose(inputs[inputs.length - 1] as HTMLInputElement, [photo('passport.png')])
        await waitFor(() => expect(screen.getAllByText('Ready')).toHaveLength(1))
        await expectAccessible(container)
        unmount()
      }
    })
  })
})
