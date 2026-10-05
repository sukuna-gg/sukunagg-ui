/**
 * Shared `tailwind-merge` extension, used by both `cn` and `tv` so class conflicts
 * resolve identically whether a component composes classes with `cn(...)` or through a
 * `tv()` variant map.
 *
 * The one real ambiguity our theme introduces: custom `text-*` font sizes (e.g. `text-md`,
 * which Tailwind's default scale lacks) would otherwise be read as text-COLOR utilities and
 * wrongly conflict with `text-text`, `text-text-dim`, etc. Declaring the font-size group with
 * our size keys keeps `text-<size>` and `text-<color>` in separate conflict groups.
 *
 * The size list mirrors `fontSizes` in `src/tokens.ts`; keep them in sync. It's inlined here
 * (rather than imported) so this runtime util doesn't pull the token table into the bundle.
 */
import type { ConfigExtension, DefaultClassGroupIds, DefaultThemeGroupIds } from 'tailwind-merge'

const fontSizeKeys = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']

// Use the default class-group ids (which include `font-size`) so this config is assignable to
// both `extendTailwindMerge` (cn) and `createTV`'s `twMergeConfig` (tv), whose generics differ.
export const twMergeConfig: ConfigExtension<DefaultClassGroupIds, DefaultThemeGroupIds> = {
  extend: {
    classGroups: {
      'font-size': [{ text: fontSizeKeys }],
    },
  },
}
