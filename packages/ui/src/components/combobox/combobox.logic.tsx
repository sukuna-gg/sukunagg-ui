'use client'

import { Autocomplete as Base } from '@base-ui/react/autocomplete'
import type { ReactNode } from 'react'
import { type ComboboxStyleProps, comboboxStyles } from './combobox.styles'

/**
 * Props for {@link Combobox}. Style variants: `variant?: 'filled' | 'outline' | 'ghost'` (default
 * `'filled'`) and `size?: 'sm' | 'md' | 'lg'` (default `'md'`) — the same maps as `Input`.
 */
export interface ComboboxProps extends ComboboxStyleProps {
  /** Suggestion strings. Each is both the option's key and the text it fills into the input. */
  items: string[]
  /**
   * Controlled input text (not an item index). Pair with `onValueChange`; omit to stay
   * uncontrolled.
   */
  value?: string
  /** Initial input text for uncontrolled use. Ignored once `value` is provided. */
  defaultValue?: string
  /**
   * Fires with the new input text whenever it changes: on every keystroke, when a suggestion is
   * picked (arrow + `Enter` or click), and when the field is cleared.
   */
  onValueChange?: (value: string) => void
  /**
   * Placeholder shown in the empty input.
   * @default 'Search…'
   */
  placeholder?: string
  /**
   * Disables the input; no typing and no popup.
   * @default false
   */
  disabled?: boolean
  /**
   * Text rendered inside the popup when no item matches the typed text.
   * @default 'No results'
   */
  emptyMessage?: string
  /**
   * Cap how many (filtered) suggestions render at once — search still spans every item, only the
   * top N are shown. Keeps a huge `items` list cheap to open. Omit/`-1` for no cap.
   */
  maxRenderedItems?: number
  /**
   * A leading visual for each suggestion, drawn before its text: an avatar, a champion portrait.
   * Decorative: the item's text stays the option's accessible name, so give images `alt=""`.
   * Return `null` for an item without one.
   *
   * @example
   * ```tsx
   * <Combobox
   *   aria-label="Champion"
   *   items={['Ahri', 'Syndra']}
   *   itemIcon={(name) => <img src={portraits[name]} alt="" width={20} height={20} />}
   * />
   * ```
   */
  itemIcon?: (item: string) => ReactNode
  /**
   * Accessible name for the input. Required unless a visible `<label>` wraps or points at it;
   * the placeholder alone is not a name.
   */
  'aria-label'?: string
}

/**
 * Free-text autocomplete: a text input whose popup lists the `items` that match what was typed.
 * Use it when the user may type any value and suggestions merely help; for a fixed pick-from-list
 * use `Select`.
 *
 * @remarks
 * - SSR/RSC: a client component (`'use client'`) because filtering, open state and positioning
 *   run in Base UI hooks. The input server-renders; the popup is client-only.
 * - Accessibility: the input is `role="combobox"` with `aria-expanded`/`aria-controls` pointing
 *   at a `role="listbox"` of `role="option"` items. Give it an `aria-label` or a `<label>`. Typing
 *   filters (case-insensitive substring match from Base UI), `ArrowDown`/`ArrowUp` move the
 *   highlight, `Enter` fills the highlighted suggestion into the input, `Escape` closes.
 * - Variants: `variant` ('filled' default | 'outline' | 'ghost') and `size` ('sm' | 'md' default |
 *   'lg') use the same maps as `Input`, so the field matches a plain Input beside it. The popup is
 *   capped at `max-h-72` and scrolls; it starts at the input's start edge and is at least as wide
 *   as the input, like `Select`.
 * - Icons: `itemIcon(item)` draws a leading visual (avatar, portrait) before each suggestion's
 *   text; decorative, so the text stays the option's name.
 * - Behaviour: the value is the raw input text, so a typed string that matches no item is still a
 *   valid value. Uncontrolled via `defaultValue`, controlled via `value` + `onValueChange`.
 *   Filtering is built in; do not pre-filter `items` yourself on each keystroke. For large lists
 *   set `maxRenderedItems` (e.g. `50`): filtering still spans every item but only the top N mount.
 *   Beyond a few thousand items prefer server-side search feeding a capped `items`.
 * - Gotchas: `items` must be unique strings (each is a React key). Object items and async loading
 *   are not supported in v1.
 *
 * @example
 * ```tsx
 * import { Combobox } from '@sukunagg/ui'
 *
 * const languages = ['TypeScript', 'JavaScript', 'Rust', 'Go', 'Python', 'Zig']
 *
 * <Combobox aria-label="Language" items={languages} placeholder="Type a language" />
 * ```
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 * import { Combobox } from '@sukunagg/ui'
 *
 * function CountrySearch({ countries }: { countries: string[] }) {
 *   const [query, setQuery] = useState('')
 *   return (
 *     <Combobox
 *       aria-label="Country"
 *       items={countries}
 *       value={query}
 *       onValueChange={setQuery}
 *       maxRenderedItems={50}
 *       emptyMessage="No country matches"
 *     />
 *   )
 * }
 * ```
 */
export function Combobox({
  items,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Search…',
  disabled,
  emptyMessage = 'No results',
  maxRenderedItems,
  variant,
  size,
  itemIcon,
  'aria-label': ariaLabel,
}: ComboboxProps) {
  const styles = comboboxStyles({ variant, size })
  return (
    <Base.Root
      items={items}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      limit={maxRenderedItems}
    >
      <Base.Input
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        className={styles.input()}
      />
      <Base.Portal>
        <Base.Positioner sideOffset={6} align="start" className={styles.positioner()}>
          <Base.Popup className={styles.popup()}>
            <Base.Empty className={styles.empty()}>{emptyMessage}</Base.Empty>
            <Base.List>
              {(item: string) => (
                <Base.Item key={item} value={item} className={styles.item()}>
                  {itemIcon ? (
                    <span className={styles.itemIcon()} aria-hidden="true">
                      {itemIcon(item)}
                    </span>
                  ) : null}
                  {item}
                </Base.Item>
              )}
            </Base.List>
          </Base.Popup>
        </Base.Positioner>
      </Base.Portal>
    </Base.Root>
  )
}
