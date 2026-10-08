/**
 * Shared `tailwind-merge` extension, used by both `cn` and `tv` so class conflicts
 * resolve identically whether a component composes classes with `cn(...)` or through a
 * `tv()` variant map.
 *
 * - Font sizes: custom `text-*` sizes (e.g. `text-md`, which Tailwind's default scale lacks) would
 *   otherwise be read as text-COLOR utilities and wrongly conflict with `text-text`. The size list
 *   mirrors `fontSizes` in packages/ui/src/tokens.ts; keep them in sync (inlined so this runtime
 *   util doesn't pull the token table into the bundle).
 * - Animations: tailwind-merge doesn't know our custom `animate-*` utilities (src/styles/*.css),
 *   so it would never dedupe them and a consumer's `animate-none` could not win. Each effect lists
 *   its keys (without the `animate-` prefix) under its own comment line in `animateKeys`.
 * - Never name an image/gradient utility `bg-*`: tailwind-merge reads any `bg-*` as a background
 *   COLOR and drops it next to `bg-<color>` (build brief §4).
 */
import type { ConfigExtension, DefaultClassGroupIds, DefaultThemeGroupIds } from 'tailwind-merge'

const fontSizeKeys = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']

// One comment line per effect, alphabetical. Builders: add your keys on the lines directly under
// YOUR comment (e.g. 'particle-field-haze',) and never edit another effect's lines.
const animateKeys: string[] = [
  // bracket-beam
  'bracket-beam-breathe',
  'bracket-beam-shock',
  // flow-field
  // holo-card
  'holo-card-drift',
  // lightning
  // particle-field
]

// Use the default class-group ids (which include `font-size`) so this config is assignable to
// both `extendTailwindMerge` (cn) and `createTV`'s `twMergeConfig` (tv), whose generics differ.
export const twMergeConfig: ConfigExtension<DefaultClassGroupIds, DefaultThemeGroupIds> = {
  extend: {
    theme: {
      animate: animateKeys,
    },
    classGroups: {
      'font-size': [{ text: fontSizeKeys }],
    },
  },
}
