'use client'

import { type ReactNode, useSyncExternalStore } from 'react'

type NavigatorWithUAData = Navigator & { userAgentData?: { platform?: string } }

// The platform never changes while the page is open, so there is nothing to subscribe to.
const subscribe = () => () => {}
const isApple = () => {
  const nav = navigator as NavigatorWithUAData
  return /mac|iphone|ipad|ipod/i.test(nav.userAgentData?.platform || nav.platform || nav.userAgent)
}
// The server (and the hydration render) always draws the non-Apple keys, so HTML matches.
const onServer = () => false

/**
 * The client half of `Kbd platform="auto"`: shows the Mac rendering on Apple platforms after
 * hydration, the other one everywhere else. Both are rendered on the server by `Kbd`; this only
 * picks one, so every Kbd without `mod`/`alt` keys stays server-only.
 * @internal
 */
export function KbdPlatformSwitch({ mac, other }: { mac: ReactNode; other: ReactNode }) {
  return useSyncExternalStore(subscribe, isApple, onServer) ? mac : other
}
