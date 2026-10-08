import { type ComponentPropsWithoutRef, forwardRef, type ReactNode } from 'react'
import { avatarFrameOrbits, avatarFrameStyles } from './avatar-frame.styles'

/** Ring treatment of an {@link AvatarFrame}: crimson comet or bone metal. */
export type AvatarFrameTone = 'accent' | 'premium'

/** Presence shown by an {@link AvatarFrame}'s status dot. */
export type AvatarFrameStatus = 'online' | 'offline'

// DECISION(open): status labels — English defaults, overridable via `statusLabel`; only these two
// statuses until there are tokens for away/busy.
const defaultStatusLabel: Record<AvatarFrameStatus, string> = {
  online: 'Online',
  offline: 'Offline',
}

/** Props for {@link AvatarFrame}: native `<span>` attributes plus the frame options below. */
export interface AvatarFrameProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  /**
   * The round thing being framed — usually an `<Avatar>`. Its size sets the frame's size (the
   * frame adds a 3px ring and a 3px gap around it). Must be phrasing content: the root is a
   * `<span>`, so the frame can sit inside buttons and links.
   */
  children: ReactNode
  /**
   * Ring treatment. `accent`: a crimson comet ring that circles the avatar (3.2s per turn) with a
   * glow and a hot head. `premium`: a bone metal ring with a sheen sweeping around it and a
   * hairline outer ring.
   * @default 'accent'
   */
  tone?: AvatarFrameTone
  /**
   * Live-broadcast look: a breathing crimson halo, a ripple ring and a LIVE pill on the bottom
   * edge. The accent comet turns into a solid ring (the halo carries the motion); `premium` keeps
   * its metal ring.
   * @default false
   */
  live?: boolean
  /**
   * Text of the LIVE pill (shown only with `live`). Real, visible text, read by screen readers;
   * localise it here.
   * @default 'Live'
   */
  liveLabel?: ReactNode
  /**
   * Three bone sparks orbiting the ring at three radii and speeds (one counter-clockwise). Pairs
   * best with `tone="premium"`. Parked on the ring under reduced motion.
   * @default false
   */
  sparks?: boolean
  /**
   * Presence dot on the avatar's bottom-right edge, cut cleanly out of the ring, glow and avatar.
   * `online`: a filled `--sk-success` dot. `offline`: a hollow `--sk-text-faint` ring (the shape
   * differs, not only the colour). Omit for no dot.
   */
  status?: AvatarFrameStatus
  /**
   * Visually hidden text that says the `status` in words (accessibility-critical: the dot alone
   * is decoration). Pass `''` when visible text next to the avatar already says it.
   * @default 'Online' | 'Offline' (per `status`)
   */
  statusLabel?: string
}

/**
 * An animated frame around a round avatar: a crimson comet ring, a bone premium ring with
 * orbiting sparks, a live-broadcast halo with a LIVE pill, and a status dot cut out of the ring.
 *
 * @remarks
 * - SSR/RSC: static and RSC-safe (no `'use client'`) — CSS keyframes only, no hooks, no DOM
 *   access, no randomness. The loops play on mount and run forever (ambient decoration).
 * - Size: wraps any round child and takes its size; every effect scales with it (container
 *   units). Wrap `<Avatar>` rather than expecting the frame to size it.
 * - Accessibility: every decorative layer is `aria-hidden` and ignores the pointer, so a framed
 *   avatar inside a button or link stays clickable. The child keeps its own semantics (`alt` /
 *   fallback). `status` adds a visually hidden `statusLabel`; the LIVE pill is real text
 *   (`--sk-on-accent` on the accent gradient, ≥ 4.5:1 in both themes).
 * - Reduced motion: `motion-reduce:animate-none` on every loop; each stops on a designed rest
 *   frame (ring at 40°, sparks parked on the ring, halo at 70%). Nothing is hidden.
 * - Variants: `tone`: 'accent' (default) | 'premium'; `live`, `sparks`: booleans (default false);
 *   `status`: 'online' | 'offline' | undefined (default, no dot).
 * - The LIVE pill's 3px separator ring is `--sk-avatar-frame-backdrop` (default `--sk-surface`);
 *   set it when the frame sits on another surface.
 * - The ref points at the root `<span>`; `className` merges last; `data-sk-avatar-frame`,
 *   `data-tone`, `data-live` and `data-status` are set on the root for styling hooks.
 *
 * @example
 * ```tsx
 * import { Avatar, AvatarFrame } from '@sukunagg/ui'
 *
 * // Crimson comet with an online dot
 * <AvatarFrame status="online">
 *   <Avatar src={user.avatarUrl} alt={user.name} fallback="RY" size="lg" />
 * </AvatarFrame>
 *
 * // Premium supporter with orbiting sparks
 * <AvatarFrame tone="premium" sparks>
 *   <Avatar fallback="KA" size="lg" />
 * </AvatarFrame>
 *
 * // Streaming now — the visible caption already says "Live", the pill repeats it on the avatar
 * <AvatarFrame live liveLabel="En vivo">
 *   <Avatar fallback="M1" size="lg" />
 * </AvatarFrame>
 * ```
 */
export const AvatarFrame = forwardRef<HTMLSpanElement, AvatarFrameProps>(function AvatarFrame(
  {
    tone = 'accent',
    live = false,
    liveLabel = 'Live',
    sparks = false,
    status,
    statusLabel,
    className,
    children,
    ...rest
  },
  ref,
) {
  const s = avatarFrameStyles({ tone, live, status })
  const comet = tone === 'accent' && !live
  const premium = tone === 'premium'
  const srStatus = status ? (statusLabel ?? defaultStatusLabel[status]) : ''

  return (
    <span
      ref={ref}
      data-sk-avatar-frame=""
      data-tone={tone}
      data-live={live ? '' : undefined}
      data-status={status}
      className={s.root({ className })}
      {...rest}
    >
      <span aria-hidden="true" className={s.back()}>
        <span className={s.cut()}>
          <span className={s.layers()}>
            {live ? (
              <>
                <span className={s.halo()} />
                <span className={s.ripple()} />
              </>
            ) : null}
            <span className={s.glow()}>
              <span className={s.glowRing()} />
            </span>
            {comet ? <span className={s.track()} /> : null}
            {premium ? <span className={s.hair()} /> : null}
            <span className={s.ring()} />
            {comet ? <span className={s.head()} /> : null}
            {premium ? <span className={s.sheen()} /> : null}
          </span>
        </span>
      </span>
      <span className={s.avatar()}>{children}</span>
      {sparks || status || live ? (
        <span className={s.front()}>
          {sparks
            ? avatarFrameOrbits.map((o) => (
                <span key={o.orbit} aria-hidden="true" className={s.orbit({ class: o.orbit })}>
                  <span className={s.spark({ class: o.spark })} />
                </span>
              ))
            : null}
          {status ? <span aria-hidden="true" className={s.status()} /> : null}
          {srStatus ? <span className="sr-only">{srStatus}</span> : null}
          {live ? (
            <span className={s.pill()}>
              <span aria-hidden="true" className={s.pillDot()} />
              {liveLabel}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  )
})
