import { createTV, type VariantProps } from 'tailwind-variants'
import { twMergeConfig } from './tw-merge-config'

/**
 * `tailwind-variants` configured with the Sukuna merge extension, so `tv()` maps resolve
 * class conflicts the same way `cn` does. Every `*.styles.tsx` imports `tv` (and `VariantProps`)
 * from here — this is the single variant helper (the plan's "create-variants" wrapper folded in).
 */
export const tv = createTV({ twMergeConfig })

export type { VariantProps }
