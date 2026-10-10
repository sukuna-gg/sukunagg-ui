# Component: Kbd

> Follows the `docs/component-button.md` template. **Server component** (one optional client
> island for the platform key). Keyboard keys and shortcuts as small key caps (Q42, mockup
> https://claude.ai/artifact/At75qRavdfveJfo7x3vPPb).

## 1. Purpose

Shows a key or a shortcut the way it looks on a keyboard: `Esc`, `⌘ K`, `Ctrl + Shift + L`. Use it
in tooltips, menus, the command palette and help pages. `mod` means ⌘ on a Mac and Ctrl
everywhere else, and screen readers hear the key's name ("Command + K"), not the symbol.

## 2. Files

```
packages/ui/src/components/kbd/
├── kbd.styles.tsx      # tv() slots: root, key, join. Pure. Server-safe.
├── kbd.logic.tsx       # server component; forwardRef <kbd>; parses `keys`, names each key.
├── kbd.platform.tsx    # 'use client' island: swaps mod/alt glyphs after mount when platform="auto"
├── kbd.test.tsx
├── kbd.stories.tsx
└── index.tsx           # export { Kbd }; export type { KbdProps, KbdPlatform }
```

The island follows the `input.reveal.tsx` / `scramble-text.scramble.tsx` pattern: the main file
stays server-only, and the island is only rendered when the Apple drawing differs (a platform key
like `mod`/`alt`, or a chord, which Apple draws without "+") and the platform isn't known. The
server renders both drawings; the island only picks one.

## 3. API

```ts
import type { ComponentPropsWithoutRef } from 'react'

export type KbdPlatform = 'mac' | 'other' | 'auto'

interface KbdOwnProps {
  /**
   * A chord ('mod+K', 'shift+?') or a sequence of chords (['G', 'M'] = G then M).
   * Named keys: mod, ctrl, alt, shift, enter, esc, tab, space, up, down, left, right,
   * backspace, delete. Anything else prints as given (letters uppercased).
   * Omit it and pass children for a single literal key: <Kbd>Esc</Kbd>.
   */
  keys?: string | readonly string[]
  /** 'auto' (default) reads the browser after mount; pass 'mac' / 'other' from the server
   *  (e.g. from the user-agent header) for an exact first paint. */
  platform?: KbdPlatform
  size?: 'sm' | 'md' | 'lg'                  // default 'md'
  /** Word between steps of a sequence. Default 'then'. */
  thenLabel?: string
}

export type KbdProps = KbdOwnProps & ComponentPropsWithoutRef<'kbd'>
```

```tsx
<Kbd keys="mod+K" />                    // ⌘ K on a Mac, Ctrl + K elsewhere
<Kbd keys={['G', 'M']} size="sm" />    // G then M
<Kbd>Esc</Kbd>
```

Deliberately **not** in v1: listening for the shortcut (that's the caller's or CommandPalette's
job), localized key names beyond `thenLabel` (key names come from a fixed English table, overridable
later if an app asks), a `Menu` shortcut column (a follow-up on Menu once Kbd ships).

## 4. Variants → tokens

| Part | Treatment |
|---|---|
| key | `--sk-surface-2` bg, 1px `--sk-line` border with a 2px bottom border (the key's edge), radius ¾ of `--sk-radius-sm` (6px; ⅝ at `sm`, full at `lg`), `--sk-text`, semibold, tabular-nums |
| join | `+` between chord keys on non-Mac platforms, `--sk-text-faint`; Mac chords sit side by side with no visible `+` (⌘⇧L), as macOS menus do, but keep a screen-reader-only `+` |
| then | the `thenLabel` word between sequence steps, `--sk-text-faint` |

| Size | Height | Min width | Font |
|---|---|---|---|
| sm | 18px | 18px | 10.5px |
| md | 22px | 22px | 11.5px |
| lg | 28px | 28px | 13px |

## 5. States

Static. With `platform="auto"`, the server renders the non-Mac glyphs (`Ctrl`, `Alt`) and the
island swaps them to `⌘`/`⌥` after mount on Apple platforms. Keys without `mod`/`alt` never change.
No motion.

## 6. Logic (`kbd.logic.tsx`)

- **No `'use client'`, no hooks** in the main file. `forwardRef<HTMLElement, KbdProps>`; the ref and
  rest props land on the outer `<kbd>`.
- Markup follows the HTML spec for key combinations: an outer `<kbd>` with one nested `<kbd>` per
  key. Each nested key renders its glyph `aria-hidden` plus a visually hidden name ("Command",
  "Shift", "Up arrow"), so screen readers never read "place of interest sign". Chord keys are
  joined by a "+" that is visible off Apple and screen-reader-only on Apple.
- `platform="mac" | "other"` resolves on the server. `"auto"` renders both drawings on the server
  and passes them to the `kbd.platform.tsx` island, which uses
  `useSyncExternalStore` with a `false` server snapshot (so hydration matches) and reads
  `navigator.userAgentData?.platform ?? navigator.platform` on the client.
- Parsing: split sequences, then chords on `+`; a literal `+` key is written `plus`.

## 7. Styles (`kbd.styles.tsx`)

`tv()` `slots`: `root` (inline-flex, gap), `key`, `join`, `then`. Variant `size`.

## 8. Accessibility checklist

- [ ] Nested `<kbd>` markup; each key has a spoken name; glyphs are `aria-hidden`.
- [ ] Never the only way to learn a shortcut's action: the label next to it says what it does.
- [ ] Text ≥ 4.5:1 on `surface-2` in both themes. The key edge is decoration.
- [ ] No hydration warning on Mac with `platform="auto"` (server snapshot = other).

## 9. Tests

Server render of chords, sequences and literal children; Mac vs other glyphs and joins; spoken
names for every named key; `plus` literal; `platform="auto"` hydrates with no warning and swaps to
⌘ after mount (mock `navigator.platform`); island not imported when `keys` has no `mod`/`alt`
(RSC boundary test); sizes; ref forwards; className wins; axe both themes.

## 10. Stories

`Default`, `Chords`, `Sequence`, `Sizes`, `Platforms` (mac / other side by side), `InTooltip`,
`InMenu` (until Menu gets a shortcut slot), `ShortcutList` (the VideoPlayer hotkeys). Both
`data-theme` values.

## 11. Decisions

- Built first in the Q42 wave: CommandPalette, Tooltip examples and the VideoPlayer list use it.
- `platform` prop + an island for `auto`, so apps that know the platform (user-agent header) get an
  exact first paint and nobody gets a hydration warning (D41).
- Size: 1.27 kB brotli with the island, budget 1.5 kB (statics stay ≤ 2 kB, P5).
