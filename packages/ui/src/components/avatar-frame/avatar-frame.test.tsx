import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { Avatar } from '../avatar'
import { AvatarFrame, type AvatarFrameProps } from './index'

const tones = ['accent', 'premium'] as const
const statuses = [undefined, 'online', 'offline'] as const
const flags = [false, true] as const

/** Every tone × live × sparks × status combination. */
const combos: Omit<AvatarFrameProps, 'children'>[] = tones.flatMap((tone) =>
  flags.flatMap((live) =>
    flags.flatMap((sparks) => statuses.map((status) => ({ tone, live, sparks, status }))),
  ),
)

/** Descendants carrying a class token (Tailwind tokens like `bg-accent/8` aren't valid selectors). */
const byClass = (root: Element, cls: string) =>
  [...root.querySelectorAll('*')].filter((el) => el.classList.contains(cls)) as HTMLElement[]
const one = (root: Element, cls: string) => {
  const found = byClass(root, cls)
  expect(found).toHaveLength(1)
  return found[0] as HTMLElement
}
const none = (root: Element, cls: string) => expect(byClass(root, cls)).toHaveLength(0)

/** Renders a framed `<Avatar>` and returns the frame's root `<span>`. */
function frame(props: Omit<AvatarFrameProps, 'children'> = {}) {
  const { container } = render(
    <AvatarFrame {...props}>
      <Avatar fallback="RY" size="lg" />
    </AvatarFrame>,
  )
  return container.firstElementChild as HTMLElement
}

describe('AvatarFrame', () => {
  it('server-renders every combination with the child and its status text', () => {
    for (const props of combos) {
      const html = renderServer(
        <AvatarFrame {...props}>
          <Avatar fallback="RY" />
        </AvatarFrame>,
      )
      expect(html).toContain('<span')
      expect(html).toContain('data-sk-avatar-frame')
      expect(html).toContain('RY')
      if (props.status === 'online') expect(html).toContain('Online')
      if (props.status === 'offline') expect(html).toContain('Offline')
      if (props.live) expect(html).toContain('Live')
    }
  })

  it('guards reduced motion on every animated layer, in every combination', () => {
    for (const props of combos) {
      const { container, unmount } = render(
        <AvatarFrame {...props}>
          <Avatar fallback="RY" />
        </AvatarFrame>,
      )
      const animated = [...container.querySelectorAll('*')].filter((el) =>
        [...el.classList].some((c) => c.startsWith('animate-')),
      )
      expect(animated.length).toBeGreaterThan(0)
      for (const el of animated) {
        expect(el.classList.contains('motion-reduce:animate-none')).toBe(true)
      }
      unmount()
    }
  })

  it('accent (default) draws the turning comet: ring, glow, track and head', () => {
    const root = frame()
    expect(root.dataset.tone).toBe('accent')
    const ring = one(root, 'avatar-frame-comet')
    expect(ring.classList.contains('avatar-frame-band')).toBe(true)
    expect(ring.classList.contains('animate-avatar-frame-spin')).toBe(true)
    expect(ring.classList.contains('[--sk-avatar-frame-phase:40deg]')).toBe(true)
    const glow = one(root, 'avatar-frame-comet-glow')
    expect(glow.classList.contains('animate-avatar-frame-spin')).toBe(true)
    one(root, 'bg-accent/8') // the faint track under the comet
    const head = one(root, 'avatar-frame-head')
    expect(head.classList.contains('animate-avatar-frame-spin')).toBe(true)
    for (const cls of ['avatar-frame-metal', 'avatar-frame-sheen', 'avatar-frame-halo']) {
      none(root, cls)
    }
  })

  it('premium draws the bone metal ring, a hairline and the turning sheen', () => {
    const root = frame({ tone: 'premium' })
    expect(root.dataset.tone).toBe('premium')
    const ring = one(root, 'avatar-frame-metal')
    expect(ring.classList.contains('avatar-frame-band')).toBe(true)
    expect([...ring.classList].some((c) => c.startsWith('animate-'))).toBe(false)
    const sheen = one(root, 'avatar-frame-sheen')
    expect(sheen.classList.contains('animate-avatar-frame-sheen')).toBe(true)
    one(root, 'border-premium/28')
    one(root, 'bg-premium') // the soft glow ring
    for (const cls of ['avatar-frame-comet', 'avatar-frame-head', 'bg-accent/8']) none(root, cls)
  })

  it('live adds the halo, ripple and LIVE pill, and holds the accent ring solid', () => {
    const root = frame({ live: true })
    expect(root.hasAttribute('data-live')).toBe(true)
    expect(one(root, 'avatar-frame-halo').classList.contains('animate-avatar-frame-breathe')).toBe(
      true,
    )
    expect(one(root, 'border-accent').classList.contains('animate-avatar-frame-ripple')).toBe(true)
    const pill = one(root, 'bg-gradient-accent')
    expect(pill.textContent).toBe('Live')
    expect(pill.getAttribute('aria-hidden')).toBeNull()
    const dot = one(pill, 'animate-avatar-frame-blink')
    expect(dot.getAttribute('aria-hidden')).toBe('true')
    // The comet gives way to a solid ring (ring + glow ring).
    expect(byClass(root, 'bg-accent')).toHaveLength(2)
    for (const cls of ['avatar-frame-comet', 'avatar-frame-head', 'animate-avatar-frame-spin']) {
      none(root, cls)
    }
  })

  it('live keeps the premium metal ring and sheen', () => {
    const root = frame({ tone: 'premium', live: true })
    one(root, 'avatar-frame-metal')
    one(root, 'avatar-frame-sheen')
    one(root, 'avatar-frame-halo')
    expect(one(root, 'bg-gradient-accent').textContent).toBe('Live')
  })

  it('takes a localised pill label', () => {
    const root = frame({ live: true, liveLabel: 'En vivo' })
    expect(one(root, 'bg-gradient-accent').textContent).toBe('En vivo')
  })

  it('sparks: three hidden orbits with their own radius, speed, direction and rest angle', () => {
    const root = frame({ tone: 'premium', sparks: true })
    const orbits = byClass(root, 'animate-avatar-frame-orbit')
    expect(orbits).toHaveLength(3)
    for (const o of orbits) {
      expect(o.getAttribute('aria-hidden')).toBe('true')
      one(o, 'avatar-frame-spark')
    }
    const [a, b, c] = orbits as [HTMLElement, HTMLElement, HTMLElement]
    expect(a.classList.contains('[--sk-avatar-frame-t:3.7s]')).toBe(true)
    expect(b.classList.contains('[--sk-avatar-frame-t:6.1s]')).toBe(true)
    expect(c.classList.contains('[--sk-avatar-frame-t:9.3s]')).toBe(true)
    // The counter-clockwise orbit reverses and mirrors its spark so the tail trails behind.
    expect(b.classList.contains('[--sk-avatar-frame-dir:reverse]')).toBe(true)
    expect(one(b, 'avatar-frame-spark').classList.contains('-scale-x-100')).toBe(true)
    expect(one(a, 'avatar-frame-spark').classList.contains('-scale-x-100')).toBe(false)
  })

  it('renders no front layer when sparks, status and live are all off', () => {
    const root = frame()
    // Just the back layers and the avatar slot.
    expect(root.children).toHaveLength(2)
    one(root, '@container-[size]')
    for (const cls of ['avatar-frame-spark', 'avatar-frame-status', 'sr-only']) none(root, cls)
    expect(frame({ sparks: true }).children).toHaveLength(3)
  })

  it('status: a dot cut out of the ring and avatar, and its words for screen readers', () => {
    const online = frame({ status: 'online' })
    expect(online.dataset.status).toBe('online')
    const dot = one(online, 'avatar-frame-status')
    expect(dot.classList.contains('avatar-frame-online')).toBe(true)
    expect(dot.getAttribute('aria-hidden')).toBe('true')
    one(online, 'avatar-frame-cutout')
    one(online, 'avatar-frame-cutout-avatar')
    expect(one(online, 'sr-only').textContent).toBe('Online')
  })

  it('offline is a hollow ring (shape, not only colour)', () => {
    const root = frame({ status: 'offline' })
    const dot = one(root, 'avatar-frame-status')
    expect(dot.classList.contains('avatar-frame-offline')).toBe(true)
    expect(dot.classList.contains('avatar-frame-online')).toBe(false)
    expect(one(root, 'sr-only').textContent).toBe('Offline')
  })

  it('takes a custom status label, and none when it is empty', () => {
    const custom = frame({ status: 'online', statusLabel: 'En línea' })
    expect(one(custom, 'sr-only').textContent).toBe('En línea')
    const empty = frame({ status: 'offline', statusLabel: '' })
    none(empty, 'sr-only')
    one(empty, 'avatar-frame-offline')
  })

  it('no status: no dot, no cut-out, no label (even with a statusLabel)', () => {
    const root = frame({ statusLabel: 'Online' })
    expect(root.hasAttribute('data-status')).toBe(false)
    for (const cls of ['avatar-frame-status', 'avatar-frame-cutout', 'sr-only']) none(root, cls)
  })

  it('hides every decorative layer from assistive tech and the pointer', () => {
    const root = frame({ tone: 'premium', sparks: true, status: 'online', live: true })
    const back = root.firstElementChild as HTMLElement
    expect(back.getAttribute('aria-hidden')).toBe('true')
    expect(back.classList.contains('pointer-events-none')).toBe(true)
    expect(back.textContent).toBe('')
    const avatarSlot = back.nextElementSibling as HTMLElement
    expect(avatarSlot.textContent).toBe('RY')
    expect(avatarSlot.classList.contains('pointer-events-auto')).toBe(true)
    const front = avatarSlot.nextElementSibling as HTMLElement
    expect(front.classList.contains('pointer-events-none')).toBe(true)
    // Only real text is exposed: the status words and the pill label.
    const exposed = [...front.children].filter((el) => el.getAttribute('aria-hidden') !== 'true')
    expect(exposed.map((el) => el.textContent)).toEqual(['Online', 'Live'])
  })

  it('does not leak its props as attributes; sets data hooks instead', () => {
    const root = frame({
      tone: 'premium',
      live: true,
      sparks: true,
      status: 'online',
      statusLabel: 'Here',
      liveLabel: 'On air',
    })
    for (const attr of ['tone', 'live', 'sparks', 'status', 'statuslabel', 'livelabel']) {
      expect(root.hasAttribute(attr)).toBe(false)
    }
    expect(root.hasAttribute('data-sk-avatar-frame')).toBe(true)
    expect(root.dataset.tone).toBe('premium')
    expect(root.dataset.status).toBe('online')
  })

  it('passes native props through to the root span', () => {
    render(
      <AvatarFrame id="me" title="Ryomen" aria-label="Ryomen, online" data-testid="f">
        <Avatar fallback="RY" />
      </AvatarFrame>,
    )
    const root = screen.getByTestId('f')
    expect(root.tagName).toBe('SPAN')
    expect(root.id).toBe('me')
    expect(root.title).toBe('Ryomen')
    expect(root.getAttribute('aria-label')).toBe('Ryomen, online')
  })

  it('forwards its ref to the root span', () => {
    const ref = createRef<HTMLSpanElement>()
    render(
      <AvatarFrame ref={ref}>
        <Avatar fallback="RY" />
      </AvatarFrame>,
    )
    expect(ref.current).toBeInstanceOf(HTMLSpanElement)
    expect(ref.current?.hasAttribute('data-sk-avatar-frame')).toBe(true)
  })

  it('merges a consumer className last', () => {
    const root = frame({ className: 'p-[10px] align-top' })
    expect(root.classList.contains('p-[10px]')).toBe(true)
    expect(root.classList.contains('p-[6px]')).toBe(false)
    expect(root.classList.contains('align-top')).toBe(true)
    expect(root.classList.contains('align-middle')).toBe(false)
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(
      <AvatarFrame tone="premium" sparks status="online" live>
        <Avatar fallback="KA" />
      </AvatarFrame>,
    )
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <AvatarFrame status="online">
            <Avatar fallback="RY" />
          </AvatarFrame>
          <AvatarFrame tone="premium" sparks status="offline">
            <Avatar fallback="KA" />
          </AvatarFrame>
          <AvatarFrame live>
            <Avatar fallback="M1" />
          </AvatarFrame>
          <button type="button">
            <AvatarFrame status="online" statusLabel="">
              <Avatar fallback="SO" alt="" />
            </AvatarFrame>
            Sora, online
          </button>
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
