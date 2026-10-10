import { type ComponentPropsWithoutRef, Fragment, forwardRef, type ReactNode } from 'react'
import { KbdPlatformSwitch } from './kbd.platform'
import { type KbdStyleProps, kbdStyles } from './kbd.styles'

/** Which keyboard to draw: Apple's (⌘ ⌥ ⇧), everyone else's (Ctrl Alt Shift), or detect it. */
export type KbdPlatform = 'mac' | 'other' | 'auto'

/** Props for {@link Kbd}: the native `<kbd>` attributes plus the keys, platform and size. */
export interface KbdProps extends ComponentPropsWithoutRef<'kbd'>, KbdStyleProps {
  /**
   * A chord (`'mod+K'`, `'shift+?'`) or a sequence of chords (`['G', 'M']` = G then M).
   * Named keys: `mod` (⌘ on Apple, Ctrl elsewhere), `ctrl`, `alt`, `shift`, `enter`, `esc`, `tab`,
   * `space`, `up`, `down`, `left`, `right`, `backspace`, `delete`, `plus` (a literal +). Anything
   * else prints as given, single letters uppercased. Omit it to show `children` as one key.
   */
  keys?: string | readonly string[]
  /**
   * `'auto'` draws the non-Apple keys on the server and switches to ⌘/⌥ after hydration on Apple
   * platforms. Pass `'mac'` or `'other'` (e.g. from the user-agent header) for an exact first paint.
   * @default 'auto'
   */
  platform?: KbdPlatform
  /**
   * The word between steps of a sequence, for translation.
   * @default 'then'
   */
  thenLabel?: string
}

interface KeyInfo {
  mac: string
  other: string
  macName: string
  otherName: string
}

const k = (mac: string, other: string, macName: string, otherName = macName): KeyInfo => ({
  mac,
  other,
  macName,
  otherName,
})

// Glyph on each platform, then the name screen readers hear instead of the glyph.
const NAMED: Record<string, KeyInfo> = {
  mod: k('⌘', 'Ctrl', 'Command', 'Control'),
  ctrl: k('⌃', 'Ctrl', 'Control'),
  alt: k('⌥', 'Alt', 'Option', 'Alt'),
  shift: k('⇧', 'Shift', 'Shift'),
  enter: k('↵', 'Enter', 'Return', 'Enter'),
  esc: k('Esc', 'Esc', 'Escape'),
  tab: k('Tab', 'Tab', 'Tab'),
  space: k('Space', 'Space', 'Space'),
  up: k('↑', '↑', 'Up arrow'),
  down: k('↓', '↓', 'Down arrow'),
  left: k('←', '←', 'Left arrow'),
  right: k('→', '→', 'Right arrow'),
  backspace: k('⌫', 'Backspace', 'Delete', 'Backspace'),
  delete: k('⌦', 'Del', 'Forward delete', 'Delete'),
  plus: k('+', '+', 'Plus'),
}

const named = (token: string): KeyInfo | undefined => NAMED[token.toLowerCase()]

const parse = (keys: string | readonly string[]): string[][] =>
  (typeof keys === 'string' ? [keys] : keys).map((chord) =>
    chord
      .split('+')
      .map((t) => t.trim())
      .filter(Boolean),
  )

/** True when the Apple rendering differs: a platform key, or a chord (Apple drops the "+"). */
const dependsOnPlatform = (chords: string[][]) =>
  chords.some(
    (chord) =>
      chord.length > 1 ||
      chord.some((t) => {
        const info = named(t)
        return info !== undefined && (info.mac !== info.other || info.macName !== info.otherName)
      }),
  )

/**
 * A key or a keyboard shortcut drawn as key caps: `Esc`, `⌘ K`, `Ctrl + Shift + L`, `G then M`.
 * Use it next to the action it triggers: in tooltips, menus, the command palette, help pages.
 *
 * @remarks
 * - SSR/RSC: a server component. Only a shortcut with platform keys (`mod`, `alt`…) and
 *   `platform="auto"` renders a tiny client island, which swaps ⌘/⌥ in after hydration; the
 *   server and the hydration render both draw the non-Apple keys, so there is no mismatch.
 * - Accessibility: HTML's markup for combinations (an outer `<kbd>`, one `<kbd>` per key). Symbols
 *   are `aria-hidden` and each key carries its spoken name, so a screen reader says
 *   "Command + K", never "place of interest sign". Kbd doesn't listen for the shortcut; say what
 *   it does in text next to it.
 * - Variants: `size` 'sm' | 'md' (default) | 'lg'.
 *
 * @example
 * ```tsx
 * import { Kbd } from '@sukunagg/ui'
 *
 * <Kbd keys="mod+K" />            // ⌘ K on a Mac, Ctrl + K elsewhere
 * <Kbd keys={['G', 'M']} size="sm" />
 * <Kbd>Esc</Kbd>
 * ```
 */
export const Kbd = forwardRef<HTMLElement, KbdProps>(function Kbd(
  { keys, platform = 'auto', thenLabel = 'then', size, className, children, ...rest },
  ref,
) {
  const s = kbdStyles({ size })
  const chords = keys === undefined ? null : parse(keys)

  const draw = (mac: boolean, list: string[][]): ReactNode =>
    list.map((chord, ci) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: a fixed, ordered list; "G then G" repeats a chord.
      <Fragment key={`${ci}-${chord.join('+')}`}>
        {ci > 0 ? <span className={s.thenWord()}>{thenLabel}</span> : null}
        {chord.map((token, ki) => {
          const info = named(token)
          const glyph = info
            ? mac
              ? info.mac
              : info.other
            : token.length === 1
              ? token.toUpperCase()
              : token
          const name = info ? (mac ? info.macName : info.otherName) : glyph
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: keys of one chord, fixed and ordered.
            <Fragment key={`${ki}-${token}`}>
              {ki > 0 ? (
                // Apple draws chords without "+"; screen readers hear it on every platform.
                <span className={mac ? 'sr-only' : s.join()}>+</span>
              ) : null}
              <kbd className={s.key()}>
                {glyph === name ? (
                  glyph
                ) : (
                  <>
                    <span aria-hidden="true">{glyph}</span>
                    <span className="sr-only">{name}</span>
                  </>
                )}
              </kbd>
            </Fragment>
          )
        })}
      </Fragment>
    ))

  let content: ReactNode
  if (chords === null) content = <kbd className={s.key()}>{children}</kbd>
  else if (platform === 'auto' && dependsOnPlatform(chords))
    content = <KbdPlatformSwitch mac={draw(true, chords)} other={draw(false, chords)} />
  else content = draw(platform === 'mac', chords)

  return (
    <kbd ref={ref} className={s.root({ className })} {...rest}>
      {content}
    </kbd>
  )
})
