/**
 * Showpiece motion CSS (Q39), one module per component so builders never edit the same file.
 * `scripts/build-tokens.ts` appends these to `theme.css` in this fixed order; keep it alphabetical.
 */
import { css as avatarFrame } from './avatar-frame'
import { css as borderBeam } from './border-beam'
import { css as glitchText } from './glitch-text'
import { css as lootReveal } from './loot-reveal'
import { css as matchFound } from './match-found'
import { css as rankReveal } from './rank-reveal'
import { css as retroGrid } from './retro-grid'
import { css as scrambleText } from './scramble-text'
import { css as xpLevelUp } from './xp-level-up'

export const showpieceCss = [
  avatarFrame,
  borderBeam,
  glitchText,
  lootReveal,
  matchFound,
  rankReveal,
  retroGrid,
  scrambleText,
  xpLevelUp,
]
  .map((block) => block.trim())
  .filter(Boolean)
  .join('\n\n')
