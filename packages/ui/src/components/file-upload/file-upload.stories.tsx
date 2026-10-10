import type { Meta, StoryObj } from '@storybook/react-vite'
import { Field } from '../field'
import { FileUpload, type FileUploadLabels, type FileUploadProps, resizeImage } from './index'

const meta = {
  title: 'Components/FileUpload',
  component: FileUpload,
  tags: ['autodocs'],
  args: {
    accept: 'image/*',
    maxSize: 10_000_000,
    hint: 'JPG, PNG or HEIC · up to 10 MB',
    layout: 'zone',
  },
  // A form column's width; `parameters.wide` for the two-slot ID form.
  decorators: [
    (Story, { parameters }) => (
      <div style={{ maxWidth: parameters.wide ? 760 : 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FileUpload>

export default meta
type Story = StoryObj<typeof meta>

/** Pitaya's identity form copy (es-MX). */
const es: Partial<FileUploadLabels> = {
  title: 'Elige una foto o arrástrala aquí',
  titleTouch: 'Toca para tomar la foto',
  gallery: 'O elige una foto de tu galería',
  preparing: 'Preparando foto…',
  ready: 'Foto lista',
  uploaded: 'Subida',
  change: 'Cambiar foto',
  remove: (name) => `Quitar ${name}`,
  retry: 'Reintentar',
  wrongType: () => 'Ese archivo no es una foto. Usa JPG, PNG o HEIC.',
  tooBig: (size, max) => `La foto pesa ${size}. El máximo es ${max}.`,
  tooMany: (max) => `Máximo ${max} fotos.`,
  unreadable: 'No pudimos leer esa foto. Intenta con JPG o PNG.',
  uploadFailed: 'No se pudo subir. Revisa tu conexión.',
}

/** One identity photo slot: label above, back camera on phones, shrunk to ≤ 2000px JPEG. */
function IdSlot({ id, label, ...props }: { id: string; label: string } & FileUploadProps) {
  return (
    <Field>
      <Field.Label htmlFor={id}>{label}</Field.Label>
      <FileUpload
        id={id}
        name={id}
        accept="image/*"
        capture="environment"
        maxSize={10_000_000}
        prepare={resizeImage()}
        hint="JPG, PNG o HEIC · hasta 10 MB"
        labels={es}
        required
        {...props}
      />
    </Field>
  )
}

/** Every prop as a control. Drop a photo, or a file that isn't one. */
export const Playground: Story = {
  render: (args) => <FileUpload {...args} prepare={resizeImage()} />,
}

/**
 * Pitaya's identity step: the INE front and back. On a phone each zone opens the back camera,
 * with a link to the photo library; the photo is shrunk to a ≤ 2000px JPEG before the form
 * sends it (it's written back into the input).
 */
export const IdPhoto: Story = {
  parameters: { wide: true },
  render: () => (
    <form
      lang="es"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: 14,
      }}
      onSubmit={(event) => event.preventDefault()}
    >
      <IdSlot id="ine-front" label="INE · frente" />
      <IdSlot id="ine-back" label="INE · reverso" />
    </form>
  ),
}

/** One slot: the passport's photo page. */
export const Passport: Story = {
  render: () => (
    <div lang="es">
      <IdSlot id="passport" label="Pasaporte · página con foto" />
    </div>
  ),
}

let attempts = 0
/** Fake upload: ~1.2s of progress; the second upload of the page fails once (try Retry). */
const fakeUpload: FileUploadProps['onUpload'] = (_file, { onProgress, signal }) =>
  new Promise<void>((resolve, reject) => {
    const fails = ++attempts === 2
    let percent = 0
    const timer = setInterval(() => {
      percent += 10
      onProgress(Math.min(percent, 100))
      if (fails && percent >= 60) {
        clearInterval(timer)
        reject(new Error('Network error'))
      } else if (percent >= 100) {
        clearInterval(timer)
        resolve()
      }
    }, 120)
    signal.addEventListener('abort', () => {
      clearInterval(timer)
      reject(signal.reason)
    })
  })

/**
 * The list form: `compact`, `multiple`, `onUpload`. Each file shows its own progress, error and
 * remove button; the second upload fails so you can try Retry.
 */
export const Screenshots: Story = {
  args: { layout: 'compact', multiple: true, maxFiles: 3, hint: 'Up to 3 images · 10 MB each' },
  render: (args) => (
    <Field>
      <Field.Label htmlFor="screenshots">Final scoreboard screenshots</Field.Label>
      <FileUpload
        {...args}
        id="screenshots"
        labels={{ title: 'Add screenshots or drop them here' }}
        onUpload={fakeUpload}
      />
    </Field>
  ),
}

/** An error you own (here, the server's review), shown with `invalid` + `aria-describedby`. */
export const Invalid: Story = {
  render: (args) => (
    <Field invalid>
      <Field.Label htmlFor="selfie">Selfie holding your ID</Field.Label>
      <FileUpload {...args} id="selfie" invalid aria-describedby="selfie-error" />
      <p id="selfie-error" className="m-0 text-sm font-semibold text-accent">
        We couldn't read your ID in that photo. Take it again in good light.
      </p>
    </Field>
  ),
}

export const Disabled: Story = {
  args: { disabled: true, hint: 'Uploads open after check-in' },
}

/** Dark and light next to each other. */
export const BothThemes: Story = {
  parameters: { sideBySide: true },
  render: (args) => <FileUpload {...args} aria-label="Profile photo" />,
}
