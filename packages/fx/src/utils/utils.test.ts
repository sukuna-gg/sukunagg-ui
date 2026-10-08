import { describe, expect, it } from 'bun:test'
import { cn } from './cn'
import { tv } from './tv'

describe('cn', () => {
  it('joins conditionals and lets a later conflicting utility win', () => {
    expect(cn('h-10 px-2', false, 'h-20')).toBe('px-2 h-20')
  })

  it('keeps custom font sizes and text colors in separate groups', () => {
    expect(cn('text-md text-text', 'text-text-dim')).toBe('text-md text-text-dim')
  })

  it('lets animate-none override an animation', () => {
    expect(cn('animate-spin', 'animate-none')).toBe('animate-none')
  })
})

describe('tv', () => {
  it('merges variant classes with the same rules as cn', () => {
    const styles = tv({ base: 'h-10 text-md', variants: { tall: { true: 'h-20' } } })
    expect(styles({ tall: true })).toBe('text-md h-20')
    expect(styles({ class: 'text-text' })).toBe('h-10 text-md text-text')
  })
})
