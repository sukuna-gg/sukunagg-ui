'use client'

import type { ComponentPropsWithoutRef, SyntheticEvent } from 'react'

/** Checks the write-in row's "Other" radio (the row is marked `data-sk-poll-other`). */
const selectOther = (event: SyntheticEvent<HTMLInputElement>) => {
  const radio = event.currentTarget
    .closest('[data-sk-poll-other]')
    ?.querySelector<HTMLInputElement>('input[type="radio"]')
  if (radio) radio.checked = true
}

/**
 * The client half of `Poll allowWriteIn`: the write-in text field, which checks the "Other" radio
 * when it is clicked or typed in, so writing a name is enough. Tabbing through it doesn't: a
 * keyboard user on their way to Vote keeps their choice. Rendered by `Poll` only in the open
 * form; the server HTML is the same `<input>`, so without JS the person picks "Other" first.
 * @internal
 */
export function PollWriteIn(
  props: Omit<ComponentPropsWithoutRef<'input'>, 'onPointerDown' | 'onChange' | 'type'>,
) {
  return <input type="text" {...props} onPointerDown={selectOther} onChange={selectOther} />
}
