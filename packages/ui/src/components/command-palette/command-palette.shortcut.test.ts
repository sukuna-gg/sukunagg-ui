import { describe, expect, it } from 'bun:test'
import { isTyping, matchesShortcut, parseShortcut } from './command-palette.shortcut'

const press = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init)

describe('parseShortcut', () => {
  it('reads modifiers and the key, case-insensitively', () => {
    expect(parseShortcut('mod+K')).toEqual({
      mod: true,
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
      key: 'k',
    })
    expect(parseShortcut('Control + Option + Shift + P')).toMatchObject({
      ctrl: true,
      alt: true,
      shift: true,
      key: 'p',
    })
    expect(parseShortcut('cmd+command+meta+alt+ctrl+1')).toMatchObject({
      meta: true,
      alt: true,
      ctrl: true,
      key: '1',
    })
  })

  it('maps Kbd key names to KeyboardEvent.key', () => {
    expect(parseShortcut('esc').key).toBe('escape')
    expect(parseShortcut('mod+enter').key).toBe('enter')
    expect(parseShortcut('space').key).toBe(' ')
    expect(parseShortcut('mod+plus').key).toBe('+')
    expect(parseShortcut('shift+up').key).toBe('arrowup')
    expect(parseShortcut('/').key).toBe('/')
  })
})

describe('matchesShortcut', () => {
  const modK = parseShortcut('mod+K')

  it('treats mod as Ctrl off Apple platforms and ⌘ on them', () => {
    expect(matchesShortcut(press({ key: 'k', ctrlKey: true }), modK, false)).toBe(true)
    expect(matchesShortcut(press({ key: 'k', metaKey: true }), modK, false)).toBe(false)
    expect(matchesShortcut(press({ key: 'k', metaKey: true }), modK, true)).toBe(true)
    expect(matchesShortcut(press({ key: 'k', ctrlKey: true }), modK, true)).toBe(false)
  })

  it('needs the exact modifiers', () => {
    expect(matchesShortcut(press({ key: 'K', ctrlKey: true, shiftKey: true }), modK, false)).toBe(
      false,
    )
    expect(matchesShortcut(press({ key: 'k', ctrlKey: true, altKey: true }), modK, false)).toBe(
      false,
    )
    expect(matchesShortcut(press({ key: 'k' }), modK, false)).toBe(false)
    const shifted = parseShortcut('ctrl+shift+L')
    expect(matchesShortcut(press({ key: 'L', ctrlKey: true, shiftKey: true }), shifted, true)).toBe(
      true,
    )
  })

  it('falls back to the physical key for letters and digits (other layouts, ⌥ on a Mac)', () => {
    expect(matchesShortcut(press({ key: 'л', code: 'KeyK', ctrlKey: true }), modK, false)).toBe(
      true,
    )
    const one = parseShortcut('alt+1')
    expect(matchesShortcut(press({ key: '¡', code: 'Digit1', altKey: true }), one, true)).toBe(true)
    expect(matchesShortcut(press({ key: 'x', code: 'KeyX', ctrlKey: true }), modK, false)).toBe(
      false,
    )
  })

  it('matches named and symbol keys by key only', () => {
    const slash = parseShortcut('/')
    expect(matchesShortcut(press({ key: '/', code: 'Slash' }), slash, false)).toBe(true)
    expect(matchesShortcut(press({ key: 'x', code: 'Slash' }), slash, false)).toBe(false)
  })

  it('survives keydown events without a key (browser autofill)', () => {
    const autofill = { ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, code: 'KeyK' }
    expect(matchesShortcut(autofill as KeyboardEvent, modK, false)).toBe(true)
  })
})

describe('isTyping', () => {
  it('is true in fields and editable regions, false elsewhere', () => {
    expect(isTyping(document.createElement('input'))).toBe(true)
    expect(isTyping(document.createElement('textarea'))).toBe(true)
    expect(isTyping(document.createElement('select'))).toBe(true)
    const editable = document.createElement('div')
    Object.defineProperty(editable, 'isContentEditable', { value: true })
    expect(isTyping(editable)).toBe(true)
    expect(isTyping(document.createElement('button'))).toBe(false)
    expect(isTyping(document)).toBe(false)
    expect(isTyping(null)).toBe(false)
  })
})
