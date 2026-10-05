/**
 * Sukuna design tokens — the single source of truth.
 *
 * `src/styles/tokens.css` is GENERATED from this file by `scripts/build-tokens.ts`
 * (`bun run tokens:build`). Edit values here, never in the CSS.
 *
 * Dark is the default/brand theme; light is a mode. Themed tokens carry both;
 * everything else is theme-independent. Values come from `docs/tokens.md`.
 */

export type ThemeName = 'dark' | 'light'

/** A value that differs between the two themes. */
export interface Themed<T = string> {
  readonly dark: T
  readonly light: T
}

/** Semantic colors. Keys are the `--sk-*` suffix. All themed. */
export const colors = {
  bg: { dark: '#0A0A0B', light: '#FAF9F5' },
  surface: { dark: '#141416', light: '#FFFFFF' },
  'surface-2': { dark: '#1C1C20', light: '#F1EFE9' },
  well: { dark: '#000000', light: '#E8E5DD' },
  line: { dark: 'rgba(255, 255, 255, 0.1)', light: 'rgba(0, 0, 0, 0.12)' },
  'line-soft': { dark: 'rgba(255, 255, 255, 0.06)', light: 'rgba(0, 0, 0, 0.06)' },
  accent: { dark: '#FF3B4E', light: '#D8253A' },
  'accent-deep': { dark: '#B01221', light: '#9A0E1C' },
  'accent-glow': { dark: 'rgba(255, 59, 78, 0.6)', light: 'rgba(216, 37, 58, 0.35)' },
  // Solid focus-ring color (a11y: the translucent `accent-glow` failed WCAG 1.4.11 3:1 as the
  // sole focus indicator). Crimson `accent` clears 3:1 on every surface (4.84 dark / 4.30 light).
  'focus-ring': { dark: '#FF3B4E', light: '#D8253A' },
  // Foreground for text/icons sitting on the crimson accent/gradient (Button primary). White in
  // both themes so the label never flips to dark; clears 4.5:1 over the (darkened) gradient. See D23.
  'on-accent': { dark: '#FFFFFF', light: '#FFFFFF' },
  premium: { dark: '#E8DCC4', light: '#786A4A' },
  'premium-dim': { dark: '#B5A98C', light: '#776A48' },
  text: { dark: '#F4F1EC', light: '#141413' },
  'text-dim': { dark: '#9A948A', light: '#5E5A52' },
  // text-faint retuned to clear AA 4.5:1 in both themes (was #6C665D / #8C877D, ~3:1) — it colors
  // every Input/Select/Combobox placeholder. See docs/tokens.md and D22 in docs/ai-decisions.md.
  'text-faint': { dark: '#8C8479', light: '#6F6B63' },
  success: { dark: '#31C877', light: '#177B46' },
  // "Worse / down" for data (StatTile deltas). Coral, not crimson, so the brand red never means
  // "bad"; text-safe in both themes. Not a Button/Badge variant (D33, D36). Approved Q31/Q32.
  danger: { dark: '#FF7A59', light: '#B4380A' },
  // Data visualization (Q31/Q32, docs/tokens.md → "Data visualization"). Series colors are used
  // in this fixed order, never cycled — the order is part of the colorblind safety (neighbouring
  // slots CVD ΔE ≥ 13.4). A 7th series folds into chart-other.
  'chart-1': { dark: '#FF3B4E', light: '#D8253A' },
  'chart-2': { dark: '#4C8EEF', light: '#3072D0' },
  'chart-3': { dark: '#00A699', light: '#008A7E' },
  'chart-4': { dark: '#C98000', light: '#A96100' },
  'chart-5': { dark: '#A072E6', light: '#8557C8' },
  'chart-6': { dark: '#749F2B', light: '#5A8400' },
  'chart-other': { dark: '#6F6B63', light: '#B5B0A6' },
  // Heatmap levels, low → high (an empty cell is surface-2). One crimson hue: brighter = more in
  // dark, deeper = more in light. Level 1 clears 2:1 on surface so the lowest level stays visible.
  'heat-1': { dark: '#941424', light: '#FF908E' },
  'heat-2': { dark: '#B3363D', light: '#E66E6D' },
  'heat-3': { dark: '#D25456', light: '#C04B4E' },
  'heat-4': { dark: '#F17070', light: '#9A282F' },
  // Dark start darkened #FF3B4E → #D8253A so a white label on the primary Button clears AA 4.5:1
  // (was 3.51:1). Still crimson; the wordmark/hero share this gradient. See D23.
  'gradient-accent': {
    dark: 'linear-gradient(135deg, #D8253A, #B01221)',
    light: 'linear-gradient(135deg, #D8253A, #9A0E1C)',
  },
} as const satisfies Record<string, Themed>

/**
 * Elevation. `card` dark is from `docs/tokens.md`; the light value is a PROPOSAL
 * (the doc only says "softer in light") awaiting owner approval — see docs/questions.md Q12.
 */
export const shadows = {
  card: {
    dark: '0 30px 60px -24px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.06)',
    light: '0 20px 40px -24px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.06)',
  },
} as const satisfies Record<string, Themed>

/** Font families. `display` falls back to `sans`; the library does not bundle Archivo. */
export const fonts = {
  sans: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  display: '"Archivo", var(--sk-font-sans)',
} as const

/** Type scale (px). Keys map to `--sk-text-*`. */
export const fontSizes = {
  xs: '11px',
  sm: '12px',
  md: '14px',
  lg: '16px',
  xl: '18px',
  '2xl': '24px',
  '3xl': '34px',
} as const

/** Font weights → `--sk-weight-*`. */
export const fontWeights = {
  regular: 400,
  semibold: 600,
  bold: 700,
  black: 900,
} as const

/** Letter-spacing → `--sk-tracking-*`. */
export const tracking = {
  tight: '-0.02em',
  normal: '0',
  eyebrow: '0.22em',
} as const

/** Line-height → `--sk-leading-*`. */
export const leading = {
  tight: 1.02,
  normal: 1.5,
} as const

/** Spacing scale (px) → `--sk-space-*`. */
export const space = {
  1: '4px',
  2: '6px',
  3: '8px',
  4: '12px',
  5: '16px',
  6: '20px',
  7: '24px',
  8: '32px',
} as const

/** Corner radii → `--sk-radius-*`. */
export const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  pill: '999px',
} as const

/** Motion → `--sk-duration-*`, `--sk-ease` and `--sk-ease-spring`. Rules: `docs/motion.md`. */
export const motion = {
  duration: {
    fast: '120ms',
    base: '200ms',
    /** Large moves: the toast stack, long slides. */
    slow: '320ms',
  },
  ease: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  /**
   * A soft spring (~2% overshoot) as a CSS `linear()` curve — no JS. For sliding indicators and
   * toggles. Browsers without `linear()` ignore the declaration and fall back to `ease`.
   */
  easeSpring:
    'linear(0, 0.013, 0.05 2.6%, 0.2 5.6%, 0.6 12%, 0.84 17.5%, 0.96 23%, 1.012 28%, 1.02 33%, 1.012 41%, 1.002 52%, 1)',
} as const

/**
 * Stacking order → `--sk-z-*`. Higher sits above lower. The scale is monotonic so a surface that
 * can open *inside* a dialog (a Select/Menu/Combobox dropdown, a tooltip) renders above it:
 * `dialog` < `popover` < `toast` < `tooltip`.
 */
export const zIndex = {
  dialog: 50,
  popover: 60,
  toast: 70,
  tooltip: 80,
} as const

/** Everything, for consumers who want tokens in JS. */
export const tokens = {
  colors,
  shadows,
  fonts,
  fontSizes,
  fontWeights,
  tracking,
  leading,
  space,
  radius,
  motion,
  zIndex,
} as const

export type Tokens = typeof tokens
