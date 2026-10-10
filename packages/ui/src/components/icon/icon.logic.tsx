import { type ComponentPropsWithoutRef, forwardRef, type ReactNode } from 'react'
import { iconStyles } from './icon.styles'

/** Props for every icon: native `<svg>` attributes plus size, stroke and an optional name. */
export interface IconProps extends Omit<ComponentPropsWithoutRef<'svg'>, 'children'> {
  /**
   * Width and height (px number or CSS length).
   * @default 18
   */
  size?: number | string
  /**
   * Stroke width on the 24px grid (scales with `size`).
   * @default 2
   */
  strokeWidth?: number
  /** Accessible name. Without it (or an `aria-label`) the icon is decorative and hidden. */
  title?: string
}

/**
 * Makes one icon component from its glyph. Every icon shares the same 24px grid, 2px round
 * stroke and `currentColor`, so they match each other and the surrounding text.
 */
function createIcon(displayName: string, glyph: ReactNode) {
  const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size = 18, strokeWidth = 2, title, className, ...rest },
    ref,
  ) {
    const named = Boolean(title || rest['aria-label'] || rest['aria-labelledby'])
    return (
      // biome-ignore lint/a11y/noSvgWithoutTitle: decorative unless named; then `title` renders a <title>
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        role={named ? 'img' : undefined}
        aria-hidden={named ? undefined : true}
        focusable="false"
        className={iconStyles({ className })}
        {...rest}
      >
        {title ? <title>{title}</title> : null}
        {glyph}
      </svg>
    )
  })
  Icon.displayName = displayName
  return Icon
}

/**
 * A line icon on the shared 24px / 2px grid, colored by `currentColor`.
 *
 * @remarks
 * - SSR/RSC: server components (no `'use client'`); each icon is its own export, so bundlers keep
 *   only the ones you import.
 * - Accessibility: decorative by default (`aria-hidden`, not focusable). Pass `title` (adds
 *   `role="img"` + `<title>`) or `aria-label` when the icon means something on its own. Inside a
 *   button, name the button (`Button iconOnly aria-label`) and leave the icon decorative.
 * - Sizing/color: `size` (default 18) and `strokeWidth` (default 2); color comes from the text
 *   color, so `className="text-text-dim"` works.
 *
 * @example
 * ```tsx
 * import { Button, ChevronDownIcon, InfoIcon } from '@sukunagg/ui'
 *
 * <Button iconOnly variant="ghost" aria-label="Show details"><ChevronDownIcon /></Button>
 * <InfoIcon title="Not reported by Riot" className="text-text-faint" />
 * ```
 */
export const AlertIcon = /* @__PURE__ */ createIcon(
  'AlertIcon',
  <>
    <path d="M12 4.5l8.5 15h-17z" />
    <path d="M12 10v4M12 17h.01" />
  </>,
)

/** Camera (take a photo). See {@link AlertIcon} for props and accessibility. */
export const CameraIcon = /* @__PURE__ */ createIcon(
  'CameraIcon',
  <>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="13" r="3.5" />
  </>,
)

/** Bar-chart glyph. See {@link AlertIcon} for props and accessibility. */
export const ChartIcon = /* @__PURE__ */ createIcon(
  'ChartIcon',
  <path d="M4 20V11M10 20V5M16 20v-6M3 20h18" />,
)

/** Check mark. See {@link AlertIcon} for props and accessibility. */
export const CheckIcon = /* @__PURE__ */ createIcon(
  'CheckIcon',
  <path d="M5 12.5l4.5 4.5L19 7.5" />,
)

/** Chevron pointing down (expand). See {@link AlertIcon} for props and accessibility. */
export const ChevronDownIcon = /* @__PURE__ */ createIcon(
  'ChevronDownIcon',
  <path d="M6 9l6 6 6-6" />,
)

/** Chevron pointing left. See {@link AlertIcon} for props and accessibility. */
export const ChevronLeftIcon = /* @__PURE__ */ createIcon(
  'ChevronLeftIcon',
  <path d="M15 6l-6 6 6 6" />,
)

/** Chevron pointing right. See {@link AlertIcon} for props and accessibility. */
export const ChevronRightIcon = /* @__PURE__ */ createIcon(
  'ChevronRightIcon',
  <path d="M9 6l6 6-6 6" />,
)

/** Chevron pointing up (collapse). See {@link AlertIcon} for props and accessibility. */
export const ChevronUpIcon = /* @__PURE__ */ createIcon('ChevronUpIcon', <path d="M6 15l6-6 6 6" />)

/** Clock (time, "not yet"). See {@link AlertIcon} for props and accessibility. */
export const ClockIcon = /* @__PURE__ */ createIcon(
  'ClockIcon',
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>,
)

/** Close / dismiss (×). See {@link AlertIcon} for props and accessibility. */
export const CloseIcon = /* @__PURE__ */ createIcon('CloseIcon', <path d="M6 6l12 12M18 6L6 18" />)

/** External link (opens elsewhere). See {@link AlertIcon} for props and accessibility. */
export const ExternalIcon = /* @__PURE__ */ createIcon(
  'ExternalIcon',
  <>
    <path d="M14 5h5v5M19 5l-8 8" />
    <path d="M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" />
  </>,
)

/** Picture (image file, photo). See {@link AlertIcon} for props and accessibility. */
export const ImageIcon = /* @__PURE__ */ createIcon(
  'ImageIcon',
  <>
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M20 15.5l-4.5-4.5L7 19.5" />
  </>,
)

/** Information (i). See {@link AlertIcon} for props and accessibility. */
export const InfoIcon = /* @__PURE__ */ createIcon(
  'InfoIcon',
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8h.01" />
  </>,
)

/** Padlock (locked, premium). See {@link AlertIcon} for props and accessibility. */
export const LockIcon = /* @__PURE__ */ createIcon(
  'LockIcon',
  <>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </>,
)

/** Moon (dark theme). See {@link AlertIcon} for props and accessibility. */
export const MoonIcon = /* @__PURE__ */ createIcon(
  'MoonIcon',
  <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
)

/** Circular arrow (refresh, retry). See {@link AlertIcon} for props and accessibility. */
export const RefreshIcon = /* @__PURE__ */ createIcon(
  'RefreshIcon',
  <>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
    <path d="M19.5 4.5v4.5H15" />
  </>,
)

/** Magnifier (search). See {@link AlertIcon} for props and accessibility. */
export const SearchIcon = /* @__PURE__ */ createIcon(
  'SearchIcon',
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </>,
)

/** Sun (light theme). See {@link AlertIcon} for props and accessibility. */
export const SunIcon = /* @__PURE__ */ createIcon(
  'SunIcon',
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </>,
)

/** Arrow out of a tray (upload). See {@link AlertIcon} for props and accessibility. */
export const UploadIcon = /* @__PURE__ */ createIcon(
  'UploadIcon',
  <>
    <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5" />
    <path d="M4.5 15v3.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V15" />
  </>,
)

/** Person (account, player). See {@link AlertIcon} for props and accessibility. */
export const UserIcon = /* @__PURE__ */ createIcon(
  'UserIcon',
  <>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </>,
)
