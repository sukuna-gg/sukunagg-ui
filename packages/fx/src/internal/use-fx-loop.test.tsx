import { afterEach, describe, expect, it, mock } from 'bun:test'
import { act, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { type FxEnv, flushEffects, installFxEnv } from '../../../../test/fx'
import { expectHydrates, renderServer } from '../../../../test/ssr'
import type { FxState, FxTicker } from './loop'
import { type UseFxLoopOptions, useFxLoop } from './use-fx-loop'

let env: FxEnv | undefined
afterEach(() => {
  env?.restore()
  env = undefined
})

type Create = (root: HTMLDivElement) => FxTicker

let wakeFromTest: (() => void) | undefined

function Island({
  create,
  attach = true,
  ...options
}: UseFxLoopOptions & { create: Create; attach?: boolean }) {
  const { ref, wake } = useFxLoop<HTMLDivElement>(create, options)
  wakeFromTest = wake
  return <div ref={attach ? ref : undefined} data-testid="root" />
}

/** A factory whose tickers settle when `moving` is false, and record their roots and disposals. */
function factory() {
  const roots: HTMLElement[] = []
  const disposed: number[] = []
  const state = { moving: true }
  let made = 0
  const create = mock((root: HTMLDivElement): FxTicker => {
    const id = ++made
    roots.push(root)
    return {
      tick: ({ still }) => {
        root.style.setProperty('--sk-test-x', still ? 'rest' : 'moving')
        return state.moving
      },
      dispose: () => disposed.push(id),
    }
  })
  return { create, disposed, roots, state }
}

const rootOf = () => screen.getByTestId('root')

describe('useFxLoop', () => {
  it('server-renders the root only (nothing runs on the server)', () => {
    const { create } = factory()
    const html = renderServer(<Island create={create} />)
    expect(html).toContain('data-testid="root"')
    expect(html).not.toContain('data-state')
    expect(create).not.toHaveBeenCalled()
  })

  it('hydrates without warnings', async () => {
    env = installFxEnv({ reducedMotion: true })
    const { create } = factory()
    await expectHydrates(<Island create={create} />)
    await flushEffects() // the hydrated island settles as a still frame inside this test
    expect(create).toHaveBeenCalledTimes(1)
    expect(env.pendingFrames()).toBe(0)
  })

  it('mounts on the ref element, paints once and tears down on unmount', () => {
    env = installFxEnv()
    const { create, disposed, roots } = factory()
    const { unmount } = render(<Island create={create} />)
    expect(roots).toEqual([rootOf()])
    expect(rootOf().style.getPropertyValue('--sk-test-x')).toBe('moving')
    expect(rootOf().dataset.state).toBe('paused')
    env.intersect(true)
    expect(rootOf().dataset.state).toBe('running')
    unmount()
    expect(disposed).toEqual([1])
    expect(env.pendingFrames()).toBe(0)
  })

  it('wakes a settled effect through the stable wake()', () => {
    env = installFxEnv()
    const { create, state } = factory()
    const { rerender } = render(<Island create={create} />)
    const wake = wakeFromTest
    env.intersect(true)
    state.moving = false
    env.frame(16)
    expect(env.pendingFrames()).toBe(0)
    rerender(<Island create={create} />)
    expect(wakeFromTest).toBe(wake as () => void)
    state.moving = true
    act(() => wakeFromTest?.())
    expect(env.pendingFrames()).toBe(1)
  })

  it('paints the still frame under reduced motion', () => {
    env = installFxEnv({ reducedMotion: true })
    const { create } = factory()
    render(<Island create={create} />)
    expect(rootOf().dataset.state).toBe('still')
    expect(rootOf().style.getPropertyValue('--sk-test-x')).toBe('rest')
  })

  it('skips mounting when the ref is not attached; wake() is then a no-op', () => {
    env = installFxEnv()
    const { create } = factory()
    render(<Island create={create} attach={false} />)
    expect(create).not.toHaveBeenCalled()
    expect(() => wakeFromTest?.()).not.toThrow()
  })

  it('survives StrictMode: a fresh ticker per mount, the first one disposed', () => {
    env = installFxEnv()
    const { create, disposed } = factory()
    const { unmount } = render(
      <StrictMode>
        <Island create={create} />
      </StrictMode>,
    )
    expect(create).toHaveBeenCalledTimes(2)
    expect(disposed).toEqual([1])
    env.intersect(true)
    expect(rootOf().dataset.state).toBe('running')
    unmount()
    expect(disposed).toEqual([1, 2])
    expect(env.pendingFrames()).toBe(0)
  })

  it('applies `paused` and `onState` live, without remounting', () => {
    env = installFxEnv()
    const { create } = factory()
    const first = mock((_s: FxState) => {})
    const second = mock((_s: FxState) => {})
    const { rerender } = render(<Island create={create} paused onState={first} />)
    env.intersect(true)
    expect(rootOf().dataset.state).toBe('paused')
    expect(first.mock.calls).toEqual([['paused']])
    rerender(<Island create={create} paused={false} onState={second} />)
    expect(rootOf().dataset.state).toBe('running')
    expect(second.mock.calls).toEqual([['running']])
    expect(create).toHaveBeenCalledTimes(1)
  })
})
