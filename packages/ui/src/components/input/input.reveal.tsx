'use client'

import { type ComponentPropsWithoutRef, forwardRef, useId, useState } from 'react'
import { type InputStyleProps, inputStyles } from './input.styles'

/** Toggle text for the password reveal button. */
export interface RevealLabels {
  show: string
  hide: string
}

type RevealInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'size' | 'type'> &
  InputStyleProps & { revealLabels?: RevealLabels }

// Ghost-button look (Button variant="ghost" size="sm"), sized to sit inside the field.
const toggleClass = [
  'absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-7 items-center rounded-sm px-2',
  'font-display text-sm font-bold text-text-dim cursor-pointer select-none',
  'transition-[color,background-color] duration-fast ease-sukuna hover:text-text hover:bg-line-soft',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
  'disabled:opacity-45 disabled:cursor-not-allowed',
].join(' ')

/**
 * The client half of `Input reveal`: a password field with a Show/Hide toggle. Rendered by
 * `Input` only for `type="password" reveal`, so every other Input stays a server component.
 * @internal
 */
export const RevealInput = forwardRef<HTMLInputElement, RevealInputProps>(function RevealInput(
  {
    variant,
    size,
    invalid,
    className,
    id,
    disabled,
    revealLabels = { show: 'Show', hide: 'Hide' },
    ...rest
  },
  ref,
) {
  const [shown, setShown] = useState(false)
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <span className="relative block w-full">
      <input
        ref={ref}
        id={inputId}
        type={shown ? 'text' : 'password'}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={inputStyles({ variant, size, invalid, className: ['pr-20', className] })}
        {...rest}
      />
      <button
        type="button"
        className={toggleClass}
        aria-controls={inputId}
        aria-pressed={shown}
        disabled={disabled}
        onClick={() => setShown((v) => !v)}
      >
        {shown ? revealLabels.hide : revealLabels.show}
        <span className="sr-only"> password</span>
      </button>
    </span>
  )
})
