import { afterEach, describe, expect, it, mock } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { type FxEnv, flushEffects, installFxEnv } from '../../../../test/fx'
import { expectHydrates, renderServer } from '../../../../test/ssr'
import type { FxContextKind, FxRenderer, FxState } from './loop'
import { type UseFxCanvasOptions, useFxCanvas } from './use-fx-canvas'

let env: FxEnv | undefined
afterEach(() => {
  env?.restore()
  env = undefined
})

type Create = () => FxRenderer<CanvasRenderingContext2D>

function Island({
  create,
  attach = true,
  ...options
}: UseFxCanvasOptions<FxContextKind> & { create: Create; attach?: boolean }) {
  const canvas = useFxCanvas<FxContextKind>(create, options)
  return <canvas ref={attach ? canvas : undefined} data-testid="canvas" />
}

/** A factory whose renderers record draws and disposals. */
function factory() {
  const disposed: number[] = []
  let made = 0
  const create = mock((): FxRenderer<CanvasRenderingContext2D> => {
    const id = ++made
    return { draw: () => {}, dispose: () => disposed.push(id) }
  })
  return { create, disposed }
}

const rootOf = () => screen.getByTestId('root')

describe('useFxCanvas', () => {
  it('server-renders only the canvas (nothing runs on the server)', () => {
    const { create } = factory()
    const html = renderServer(
      <div data-sk-fx="test">
        <Island create={create} />
      </div>,
    )
    expect(html).toContain('<canvas')
    expect(html).not.toContain('data-state')
    expect(create).not.toHaveBeenCalled()
  })

  it('hydrates without warnings', async () => {
    env = installFxEnv({ reducedMotion: true })
    const { create } = factory()
    await expectHydrates(
      <div data-sk-fx="test">
        <Island create={create} />
      </div>,
    )
    await flushEffects() // the hydrated island settles as a still frame inside this test
    expect(create).toHaveBeenCalledTimes(1)
    expect(env.pendingFrames()).toBe(0)
  })

  it("reports `off` on happy-dom's null context without throwing", () => {
    const { create } = factory()
    render(
      <div data-sk-fx="test" data-testid="root">
        <Island create={create} />
      </div>,
    )
    expect(rootOf().dataset.state).toBe('off')
  })

  it('mounts on the closest [data-sk-fx] and tears down on unmount', () => {
    env = installFxEnv()
    const { create, disposed } = factory()
    const { unmount } = render(
      <div data-sk-fx="test" data-testid="root">
        <div data-testid="parent">
          <Island create={create} />
        </div>
      </div>,
    )
    expect(rootOf().dataset.state).toBe('paused')
    expect(screen.getByTestId('parent').hasAttribute('data-state')).toBe(false)
    env.intersect(true)
    expect(rootOf().dataset.state).toBe('running')
    unmount()
    expect(disposed).toEqual([1])
    expect(env.pendingFrames()).toBe(0)
  })

  it('falls back to the parent element, or uses a custom root', () => {
    env = installFxEnv()
    const { create } = factory()
    render(
      <div data-testid="root">
        <Island create={create} />
      </div>,
    )
    expect(rootOf().dataset.state).toBe('paused')

    const custom = document.createElement('section')
    document.body.append(custom)
    render(<Island create={create} root={() => custom} />)
    expect(custom.dataset.state).toBe('paused')
    custom.remove()
  })

  it('skips mounting when the custom root is null or the ref is not attached', () => {
    env = installFxEnv()
    const { create } = factory()
    render(<Island create={create} root={() => null} />)
    render(<Island create={create} attach={false} />)
    expect(create).not.toHaveBeenCalled()
    expect(document.querySelector('[data-state]')).toBeNull()
  })

  it('survives StrictMode: a fresh renderer per mount, the first one disposed', () => {
    env = installFxEnv()
    const { create, disposed } = factory()
    const { unmount } = render(
      <StrictMode>
        <div data-sk-fx="test" data-testid="root">
          <Island create={create} />
        </div>
      </StrictMode>,
    )
    expect(create).toHaveBeenCalledTimes(2)
    expect(disposed).toEqual([1])
    expect(rootOf().dataset.state).toBe('paused')
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
    const tree = (paused: boolean, onState: (s: FxState) => void) => (
      <div data-sk-fx="test" data-testid="root">
        <Island create={create} paused={paused} onState={onState} />
      </div>
    )
    const { rerender } = render(tree(true, first))
    env.intersect(true)
    expect(rootOf().dataset.state).toBe('paused')
    expect(first.mock.calls).toEqual([['paused']])
    rerender(tree(false, second))
    expect(rootOf().dataset.state).toBe('running')
    expect(second.mock.calls).toEqual([['running']])
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('remounts when the context kind changes', () => {
    env = installFxEnv()
    const { create, disposed } = factory()
    const tree = (context: FxContextKind) => (
      <div data-sk-fx="test" data-testid="root">
        <Island create={create} context={context} maxDpr={1} />
      </div>
    )
    const { rerender } = render(tree('2d'))
    rerender(tree('webgl'))
    expect(create).toHaveBeenCalledTimes(2)
    expect(disposed).toEqual([1])
    // A canvas that already has a 2D context has no WebGL one, exactly as in browsers.
    expect(rootOf().dataset.state).toBe('off')
  })
})
