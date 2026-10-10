/*
 * CommandPalette's global shortcut: parse a Kbd-style chord ('mod+K', 'ctrl+shift+P', '/') once,
 * then test keydown events against it. Pure functions; the listener lives in the logic file.
 */

/** A parsed chord: which modifiers must be down, and the key (lower-case `KeyboardEvent.key`). */
export interface Shortcut {
  mod: boolean
  ctrl: boolean
  meta: boolean
  alt: boolean
  shift: boolean
  key: string
}

// Kbd's key names → `KeyboardEvent.key`, lower-cased.
const KEYS: Record<string, string> = {
  esc: 'escape',
  enter: 'enter',
  space: ' ',
  tab: 'tab',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  backspace: 'backspace',
  delete: 'delete',
  plus: '+',
}

/** Parses `'mod+shift+K'`. Modifier names: `mod`, `ctrl`, `meta`/`cmd`, `alt`/`option`, `shift`. */
export function parseShortcut(chord: string): Shortcut {
  const s: Shortcut = { mod: false, ctrl: false, meta: false, alt: false, shift: false, key: '' }
  for (const raw of chord.split('+')) {
    const token = raw.trim().toLowerCase()
    if (token === 'mod') s.mod = true
    else if (token === 'ctrl' || token === 'control') s.ctrl = true
    else if (token === 'meta' || token === 'cmd' || token === 'command') s.meta = true
    else if (token === 'alt' || token === 'option') s.alt = true
    else if (token === 'shift') s.shift = true
    else if (token) s.key = KEYS[token] ?? token
  }
  return s
}

/** The physical key for a letter or digit ('k' → 'KeyK'), so non-Latin layouts still match. */
const codeFor = (key: string) =>
  /^[a-z]$/.test(key) ? `Key${key.toUpperCase()}` : /^\d$/.test(key) ? `Digit${key}` : null

/**
 * Whether `event` is the chord. `mod` means ⌘ on Apple platforms (`apple`) and Ctrl elsewhere.
 * Modifiers must match exactly, so 'mod+K' doesn't fire on ⌘⇧K.
 */
export function matchesShortcut(event: KeyboardEvent, s: Shortcut, apple: boolean): boolean {
  if (event.ctrlKey !== (s.ctrl || (s.mod && !apple))) return false
  if (event.metaKey !== (s.meta || (s.mod && apple))) return false
  if (event.altKey !== s.alt || event.shiftKey !== s.shift) return false
  // Browser autofill fires keydown without a `key`.
  const key = typeof event.key === 'string' ? event.key.toLowerCase() : ''
  return key === s.key || (codeFor(s.key) !== null && event.code === codeFor(s.key))
}

/** Whether the event comes from where the user types (a bare-key shortcut must not fire there). */
export function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return Boolean(el?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName ?? ''))
}
