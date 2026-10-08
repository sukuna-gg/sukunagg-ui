import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'
import { twMergeConfig } from './tw-merge-config'

const twMerge = extendTailwindMerge(twMergeConfig)

/**
 * Merge class names: `clsx` for conditionals, then `tailwind-merge` so a later utility
 * wins over an earlier conflicting one (e.g. a consumer's `h-20` overrides our `h-10`).
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))
