import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  forwardRef,
  type ReactNode,
} from 'react'
import { lootRevealSparkStyles, lootRevealStyles } from './loot-reveal.styles'

/** How rare an item is. It picks the card's color; `legendary` adds a charge-up and spark burst. */
export type LootRarity = 'common' | 'rare' | 'epic' | 'legendary'

/** One card in a {@link LootReveal}. */
export interface LootRevealItem {
  /** Item name, shown on the card face. Real text, readable from the first render. */
  name: ReactNode
  /** Rarity: colors the card and labels it under the card (see `rarityLabels`). */
  rarity: LootRarity
  /**
   * Art in the middle of the card face, tinted with the rarity color (`currentColor`).
   * Decorative: wrapped in `aria-hidden`, so the name must say what the item is.
   */
  icon?: ReactNode
  /** Short item type shown as a chip at the top of the face: "Spray", "Mask", "Banner". */
  kind?: ReactNode
}

/** Props for {@link LootReveal}: native `<ul>` attributes (except `children`) plus the options below. */
export interface LootRevealProps extends Omit<ComponentPropsWithoutRef<'ul'>, 'children'> {
  /** The items won, one card each, revealed left to right in this order. */
  items: readonly LootRevealItem[]
  /**
   * Time between two cards turning over: `normal` = 350ms, `slow` = 700ms. A legendary card
   * always adds its own 450ms charge-up before it flips.
   * @default 'normal'
   */
  stagger?: 'normal' | 'slow'
  /**
   * Play the reveal on mount. `false` renders the revealed row with no motion — for a pack the
   * player already opened.
   * @default true
   */
  play?: boolean
  /**
   * Text under each card per rarity (translate them here).
   * @default { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' }
   */
  rarityLabels?: Partial<Record<LootRarity, ReactNode>>
  /**
   * Emblem on the card backs (decorative, `aria-hidden`), tinted with `--sk-accent`.
   * @default the Sukuna flame mark
   */
  backIcon?: ReactNode
}

const DEFAULT_LABELS: Record<LootRarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
}

/** The default card-back emblem: a flame with a notch, on the 24px grid. */
const FLAME_MARK = (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M12 1.5c1.2 3.8 6.5 6.4 6.5 12.6a6.5 6.5 0 0 1-13 0c0-3.6 1.7-5.8 3.4-7.3 0 2.4 1 3.6 2.1 4.2C10.4 7.4 10.2 4.3 12 1.5zM9.4 13.6h5.2L12 20z"
    />
  </svg>
)

interface Spark {
  j: number
  shape: 'streak' | 'dot'
  tint: 'rarity' | 'accent'
}

/**
 * 24 sparks for a legendary burst: every third flies in front of the card, the rest burst from
 * behind it. Within each group every 4th (from the 1st) is a dot and every 3rd is accent-colored.
 * Their angle and distance come from a CSS trig hash of `--sk-loot-reveal-j` (deterministic).
 */
function sparkGroup(front: boolean): Spark[] {
  return Array.from({ length: 24 }, (_, j) => j)
    .filter((j) => (j % 3 === 0) === front)
    .map((j, k) => ({
      j,
      shape: k % 4 === 0 ? 'dot' : 'streak',
      tint: (k + 1) % 3 === 0 ? 'accent' : 'rarity',
    }))
}
const SPARKS_BEHIND = sparkGroup(false)
const SPARKS_FRONT = sparkGroup(true)

/**
 * Flips a row of face-down item cards to reveal what a player won, one after another, with a
 * rarity glow per card and a spark burst for legendaries — for pack openings, match rewards and
 * drops.
 *
 * @remarks
 * - SSR/RSC: static and RSC-safe (no `'use client'`) — pure CSS keyframes, no hooks, no timers,
 *   no DOM access. It plays once on mount; **replay by changing `key`**. `play={false}` shows the
 *   revealed row without motion.
 * - Timing: card `i` starts flipping at `200ms + i × step + 450ms × (legendaries up to and
 *   including i)`; step is 350ms (`stagger="normal"`) or 700ms (`"slow"`). Use it to time an
 *   app-owned sound or `aria-live` counter.
 * - Accessibility: a `<ul>` of `<li>`s (name it with `aria-label`). Kind, name and rarity label
 *   are real text from the first render; backs, icon, glows and sparks are `aria-hidden`. Not
 *   interactive. `prefers-reduced-motion: reduce` shows the revealed row at once; the component
 *   does not announce — the app owns any live region.
 * - Variants: `stagger`: 'normal' (default) | 'slow'; per item `rarity`: 'common' | 'rare' |
 *   'epic' | 'legendary' (colors from existing tokens until rarity colors are approved, Q38(c)).
 * - Layout: fills its container's width (`container-type: inline-size`); cards are up to 124px
 *   wide (min 72px) and wrap. The legendary burst spills past the root — clip a parent if needed.
 * - The ref points at the `<ul>`; `className` merges last; `style` is spread after the internal
 *   `--sk-loot-reveal-n` custom property.
 *
 * @example
 * ```tsx
 * import { LootReveal } from '@sukunagg/ui'
 *
 * <LootReveal
 *   key={pack.id}
 *   aria-label="Crimson Vow Pack rewards"
 *   items={[
 *     { name: 'Ember Tide Spray', kind: 'Spray', rarity: 'rare', icon: <SprayIcon /> },
 *     { name: 'Kitsune Mask', kind: 'Mask', rarity: 'epic', icon: <MaskIcon /> },
 *     { name: 'Crimson Vow Gold Banner', kind: 'Banner', rarity: 'legendary', icon: <BannerIcon /> },
 *   ]}
 * />
 * ```
 */
export const LootReveal = forwardRef<HTMLUListElement, LootRevealProps>(function LootReveal(
  { items, stagger, play = true, rarityLabels, backIcon, className, style, ...rest },
  ref,
) {
  const s = lootRevealStyles({ stagger, play })
  const labels = { ...DEFAULT_LABELS, ...rarityLabels }
  let charges = 0

  return (
    <ul
      ref={ref}
      className={s.root({ className })}
      style={{ '--sk-loot-reveal-n': items.length, ...style } as CSSProperties}
      {...rest}
    >
      {items.map((item, i) => {
        const legendary = item.rarity === 'legendary'
        if (legendary) charges += 1
        const c = lootRevealStyles({ rarity: item.rarity, play })
        const sparks = (group: Spark[], layer: string) => (
          <span aria-hidden="true" className={c.sparks({ class: layer })}>
            {group.map(({ j, shape, tint }) => (
              <i
                key={j}
                className={lootRevealSparkStyles({ shape, tint, play })}
                style={{ '--sk-loot-reveal-j': j } as CSSProperties}
              />
            ))}
          </span>
        )
        return (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: a pack is a fixed, ordered list.
            key={i}
            data-rarity={item.rarity}
            className={c.slot()}
            style={{ '--sk-loot-reveal-i': i, '--sk-loot-reveal-charge': charges } as CSSProperties}
          >
            <div className={c.box()}>
              {legendary ? (
                <span aria-hidden="true" className={c.rays()}>
                  <span className={c.beams()} />
                </span>
              ) : null}
              <span aria-hidden="true" className={c.halo()} />
              {legendary ? <span aria-hidden="true" className={c.core()} /> : null}
              {legendary ? <span aria-hidden="true" className={c.wave()} /> : null}
              <span aria-hidden="true" className={c.ring()} />
              {legendary ? sparks(SPARKS_BEHIND, 'z-0') : null}
              <div className={c.card()}>
                <div className={c.flip()}>
                  <div aria-hidden="true" className={c.back()}>
                    <span className={c.backFrame()} />
                    <span className={c.backHatch()} />
                    <span className={c.mark()}>{backIcon ?? FLAME_MARK}</span>
                  </div>
                  <div className={c.face()}>
                    {item.kind != null ? <span className={c.kind()}>{item.kind}</span> : null}
                    {item.icon != null ? (
                      <span aria-hidden="true" className={c.icon()}>
                        {item.icon}
                      </span>
                    ) : null}
                    <span className={c.name()}>{item.name}</span>
                    {legendary ? <span aria-hidden="true" className={c.sheen()} /> : null}
                  </div>
                  {legendary ? <span aria-hidden="true" className={c.flare()} /> : null}
                </div>
              </div>
              {legendary ? sparks(SPARKS_FRONT, 'z-3') : null}
            </div>
            <span className={c.rarity()}>
              <span className={c.label()}>{labels[item.rarity]}</span>
              <span aria-hidden="true" className={c.hint()}>
                • • •
              </span>
            </span>
          </li>
        )
      })}
    </ul>
  )
})
