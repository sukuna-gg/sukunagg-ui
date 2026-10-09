import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { expectAccessible } from '../../../../../test/axe'
import { expectHydrates, renderServer } from '../../../../../test/ssr'
import { LootReveal, type LootRevealItem } from './index'

const PACK: LootRevealItem[] = [
  { name: 'Ember Tide Spray', kind: 'Spray', rarity: 'rare', icon: <svg data-testid="spray" /> },
  { name: 'Kitsune Mask', kind: 'Mask', rarity: 'epic' },
  { name: 'Crimson Vow Gold Banner', kind: 'Banner', rarity: 'legendary' },
]

const DROP: LootRevealItem[] = [
  { name: 'Ashen Grin', rarity: 'common' },
  { name: 'Gilded Fang', rarity: 'legendary' },
  { name: 'Night Shard', rarity: 'rare' },
  { name: 'Sunfire Crest', rarity: 'legendary' },
]

const ANIMATED = [
  'animate-loot-reveal-pop',
  'animate-loot-reveal-flip',
  'animate-loot-reveal-face',
  'animate-loot-reveal-glyph',
  'animate-loot-reveal-halo',
  'animate-loot-reveal-ring',
  'animate-loot-reveal-rays',
  'animate-loot-reveal-core',
  'animate-loot-reveal-wave',
  'animate-loot-reveal-flare',
  'animate-loot-reveal-sheen',
  'animate-loot-reveal-label',
  'animate-loot-reveal-hint',
  'animate-loot-reveal-back',
  'animate-loot-reveal-charge',
  'animate-loot-reveal-spark',
]

const slots = (root: HTMLElement) => [...root.querySelectorAll<HTMLLIElement>(':scope > li')]
const all = (root: Element, selector: string) => [...root.querySelectorAll<HTMLElement>(selector)]

describe('LootReveal', () => {
  it('server-renders a list with every name, kind and rarity label as real text', () => {
    const html = renderServer(<LootReveal aria-label="Pack rewards" items={PACK} />)
    expect(html).toContain('<ul')
    expect(html.match(/<li/g)).toHaveLength(3)
    for (const text of ['Ember Tide Spray', 'Kitsune Mask', 'Crimson Vow Gold Banner']) {
      expect(html).toContain(text)
    }
    for (const text of ['Spray', 'Mask', 'Banner', 'Rare', 'Epic', 'Legendary']) {
      expect(html).toContain(`>${text}<`)
    }
    expect(html).toContain('--sk-loot-reveal-i:2')
  })

  it('renders one list item per card, with its rarity on data-rarity', () => {
    render(<LootReveal aria-label="Pack rewards" items={DROP} />)
    const list = screen.getByRole('list', { name: 'Pack rewards' })
    // explicit: list-style none makes Safari/VoiceOver drop the implicit list role
    expect(list.getAttribute('role')).toBe('list')
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect(slots(list).map((li) => li.dataset.rarity)).toEqual([
      'common',
      'legendary',
      'rare',
      'legendary',
    ])
  })

  it('maps each rarity to its literal color token and glow utility', () => {
    const items: LootRevealItem[] = [
      { name: 'a', rarity: 'common' },
      { name: 'b', rarity: 'rare' },
      { name: 'c', rarity: 'epic' },
      { name: 'd', rarity: 'legendary' },
    ]
    const colors = {
      common: '[--sk-loot-reveal-color:var(--sk-text-faint)]',
      rare: '[--sk-loot-reveal-color:var(--sk-chart-2)]',
      epic: '[--sk-loot-reveal-color:var(--sk-chart-5)]',
      legendary: '[--sk-loot-reveal-color:var(--sk-premium)]',
    }
    render(<LootReveal data-testid="r" items={items} />)
    for (const li of slots(screen.getByTestId('r'))) {
      const rarity = li.dataset.rarity as keyof typeof colors
      expect(li.classList.contains(colors[rarity])).toBe(true)
      const face = li.querySelector('.animate-loot-reveal-face') as HTMLElement
      const glow = rarity === 'legendary' ? 'loot-reveal-glow-gilded' : 'loot-reveal-glow'
      expect(face.classList.contains(glow)).toBe(true)
    }
    const legendary = slots(screen.getByTestId('r'))[3] as HTMLLIElement
    expect([...legendary.classList].some((c) => c.startsWith('[--sk-loot-reveal-glint:'))).toBe(
      true,
    )
  })

  it('renders the burst (rays, flash, wave, flare, sheen, 24 sparks) for legendaries only', () => {
    render(<LootReveal data-testid="r" items={PACK} />)
    const [rare, epic, legendary] = slots(screen.getByTestId('r')) as [
      HTMLLIElement,
      HTMLLIElement,
      HTMLLIElement,
    ]
    for (const plain of [rare, epic]) {
      for (const part of ['rays', 'core', 'wave', 'flare', 'sheen', 'spark']) {
        expect(all(plain, `.animate-loot-reveal-${part}`)).toHaveLength(0)
      }
      expect(all(plain, '.animate-loot-reveal-halo')).toHaveLength(1)
      expect(all(plain, '.animate-loot-reveal-ring')).toHaveLength(1)
      expect(all(plain, '.animate-loot-reveal-back')).toHaveLength(1)
    }
    for (const part of ['rays', 'core', 'wave', 'flare', 'sheen', 'halo', 'ring', 'charge']) {
      expect(all(legendary, `.animate-loot-reveal-${part}`)).toHaveLength(1)
    }
    expect(all(legendary, '.animate-loot-reveal-back')).toHaveLength(0)
    const sparks = all(legendary, '.animate-loot-reveal-spark')
    expect(sparks).toHaveLength(24)
    // 16 burst from behind the card, 8 fly in front of it.
    const [behind, front] = all(legendary, '.z-0, .z-3')
    expect(behind?.children).toHaveLength(16)
    expect(front?.children).toHaveLength(8)
    expect(sparks.map((s) => s.style.getPropertyValue('--sk-loot-reveal-j')).sort()).toEqual(
      Array.from({ length: 24 }, (_, j) => String(j)).sort(),
    )
    // Shapes and tints alternate: some dots, some accent sparks, all literal classes.
    expect(sparks.filter((s) => s.classList.contains('size-1')).length).toBeGreaterThan(0)
    expect(
      sparks.filter((s) => s.classList.contains('[--sk-loot-reveal-spark:var(--sk-accent)]'))
        .length,
    ).toBeGreaterThan(0)
    expect(
      sparks.filter((s) =>
        s.classList.contains('[--sk-loot-reveal-spark:var(--sk-loot-reveal-color)]'),
      ).length,
    ).toBeGreaterThan(0)
  })

  it('sets the stagger index, the legendary charge count and the card count inline', () => {
    render(<LootReveal data-testid="r" items={DROP} />)
    const root = screen.getByTestId('r')
    expect(root.style.getPropertyValue('--sk-loot-reveal-n')).toBe('4')
    const lis = slots(root)
    expect(lis.map((li) => li.style.getPropertyValue('--sk-loot-reveal-i'))).toEqual([
      '0',
      '1',
      '2',
      '3',
    ])
    // Legendaries up to and including each card: each charge-up delays the cards after it.
    expect(lis.map((li) => li.style.getPropertyValue('--sk-loot-reveal-charge'))).toEqual([
      '0',
      '1',
      '1',
      '2',
    ])
    for (const li of lis) expect(li.classList.contains('loot-reveal-clock')).toBe(true)
  })

  it('spreads the consumer style after the internal card count', () => {
    render(
      <LootReveal
        data-testid="r"
        items={PACK}
        style={{ marginTop: 8, ['--sk-loot-reveal-n' as string]: 5 }}
      />,
    )
    const root = screen.getByTestId('r')
    expect(root.style.getPropertyValue('--sk-loot-reveal-n')).toBe('5')
    expect(root.style.marginTop).toBe('8px')
  })

  it('maps stagger to its step and defaults to normal', () => {
    const cases = { normal: '[--sk-loot-reveal-step:350ms]', slow: '[--sk-loot-reveal-step:700ms]' }
    for (const [stagger, cls] of Object.entries(cases)) {
      const { unmount } = render(
        <LootReveal data-testid="r" items={PACK} stagger={stagger as keyof typeof cases} />,
      )
      expect(screen.getByTestId('r').classList.contains(cls)).toBe(true)
      unmount()
    }
    const { unmount } = render(<LootReveal data-testid="r" items={PACK} />)
    expect(screen.getByTestId('r').classList.contains(cases.normal)).toBe(true)
    unmount()
  })

  it('plays by default, and every animated layer guards reduced motion', () => {
    render(<LootReveal data-testid="r" items={PACK} />)
    const root = screen.getByTestId('r')
    for (const cls of ANIMATED) {
      const els = all(root, `.${cls}`)
      expect(els.length).toBeGreaterThan(0)
      for (const el of els) {
        expect(el.classList.contains('motion-reduce:animate-none')).toBe(true)
        // never two custom animate-* utilities on one element (tailwind-merge can't dedupe them)
        expect([...el.classList].filter((c) => c.startsWith('animate-'))).toHaveLength(1)
      }
    }
  })

  it('play={false} renders the revealed row with no animation and no one-shot burst', () => {
    render(<LootReveal data-testid="r" items={PACK} play={false} />)
    const root = screen.getByTestId('r')
    expect(root.outerHTML).not.toMatch(/(^|\s|")animate-/)
    expect(screen.getByText('Crimson Vow Gold Banner')).toBeTruthy()
    const legendary = slots(root)[2] as HTMLLIElement
    // the burst ends invisible, so a still row skips it (no dead nodes) ...
    expect(all(root, '.loot-reveal-spark')).toHaveLength(0)
    expect(all(root, '.loot-reveal-flare')).toHaveLength(0)
    // core (flash), wave (shock ring), sheen
    expect(all(legendary, '.scale-125, .scale-230, .translate-x-\\[120\\%\\]')).toHaveLength(0)
    // ... but keeps the resting frame: the rays (at 30%) and the halo.
    expect(all(legendary, '.rotate-20.opacity-30')).toHaveLength(1)
    expect(all(legendary, '.-inset-\\[45\\%\\]')).toHaveLength(1)
    expect(legendary.querySelector('.loot-reveal-glow-gilded')).not.toBeNull()
  })

  it('hides decoration from assistive tech and keeps the information readable', () => {
    render(<LootReveal aria-label="Pack rewards" items={PACK} />)
    const list = screen.getByRole('list', { name: 'Pack rewards' })
    const spray = screen.getByTestId('spray')
    expect(spray.parentElement?.getAttribute('aria-hidden')).toBe('true')
    for (const li of slots(list)) {
      const back = li.querySelector(
        '[class*="animate-loot-reveal-back"], [class*="animate-loot-reveal-charge"]',
      )
      expect(back?.getAttribute('aria-hidden')).toBe('true')
      const hint = li.querySelector('.animate-loot-reveal-hint')
      expect(hint?.getAttribute('aria-hidden')).toBe('true')
      expect(hint?.textContent).toBe('• • •')
      for (const part of ['halo', 'ring', 'rays', 'core', 'wave', 'flare', 'sheen']) {
        for (const el of all(li, `.animate-loot-reveal-${part}`)) {
          expect(el.closest('[aria-hidden="true"]')).toBe(el)
        }
      }
      for (const spark of all(li, '.animate-loot-reveal-spark')) {
        expect(spark.closest('[aria-hidden="true"]')).not.toBeNull()
      }
    }
    // The text itself is never inside an aria-hidden subtree.
    for (const text of ['Kitsune Mask', 'Mask', 'Epic']) {
      expect(screen.getByText(text).closest('[aria-hidden="true"]')).toBeNull()
    }
  })

  it('keeps long names and kinds inside the card, and the label legible over its glow', () => {
    const name = 'Drachenschuppenrüstung'
    render(
      <LootReveal
        data-testid="r"
        lang="de"
        items={[{ name, kind: 'Sammlerabzeichen', rarity: 'epic' }]}
        rarityLabels={{ epic: 'Episch' }}
      />,
    )
    const li = slots(screen.getByTestId('r'))[0] as HTMLLIElement
    // a minmax(0,1fr) column, so a long word can't widen the face past the card
    expect(li.querySelector('.animate-loot-reveal-face')?.classList.contains('grid-cols-1')).toBe(
      true,
    )
    expect(screen.getByText(name).classList.contains('wrap-anywhere')).toBe(true)
    const kind = screen.getByText('Sammlerabzeichen')
    for (const cls of ['max-w-full', 'truncate']) expect(kind.classList.contains(cls)).toBe(true)
    // the label is the rarity color mixed toward --sk-text (AA over the card's own halo/glow)
    const rarity = screen.getByText('Episch').parentElement as HTMLElement
    expect(rarity.classList.contains('text-[10px]')).toBe(true)
    expect(
      rarity.classList.contains(
        'text-[color-mix(in_oklab,var(--sk-loot-reveal-color)_75%,var(--sk-text))]',
      ),
    ).toBe(true)
  })

  it('sizes each card from the card count, counting its slot padding, so n cards share a row', () => {
    render(<LootReveal data-testid="r" items={DROP} />)
    const root = screen.getByTestId('r')
    const card = [...root.classList].find((c) => c.startsWith('[--sk-loot-reveal-card:'))
    // card = clamp(72px, 99cqi/n − 2 × slot padding, 124px): every slot is then 99cqi/n wide,
    // so only the 72px floor wraps the row (Playwright checks the real layout).
    const width = card?.match(
      /^\[--sk-loot-reveal-card:clamp\(72px,calc\(99cqi\/var\(--sk-loot-reveal-n,3\)_-_([\d.]+)cqi\),124px\)\]$/,
    )
    expect(width).not.toBeNull()
    const li = slots(root)[0] as HTMLLIElement
    const pad = [...li.classList].find((c) => /^px-\[[\d.]+cqi\]$/.test(c))
    const padding = Number(pad?.match(/[\d.]+/)?.[0])
    expect(Number(width?.[1])).toBe(2 * padding)
    expect(li.querySelector('.w-\\(--sk-loot-reveal-card\\)')).not.toBeNull()
    // the rarity label may spend the slot padding before it widens the slot
    const label = screen.getByText('Common').parentElement as HTMLElement
    expect(label.classList.contains(`-mx-[${padding}cqi]`)).toBe(true)
    // the name shrinks with the card (never over 10.5% of it), not only with the row
    const name = screen.getByText('Ashen Grin')
    expect(
      name.classList.contains(
        'text-[length:clamp(9.5px,min(2.5cqi,calc(var(--sk-loot-reveal-card)*.105)),13px)]',
      ),
    ).toBe(true)
  })

  it('clips horizontal overflow by default; a clipping stage can opt out', () => {
    const { unmount } = render(<LootReveal data-testid="r" items={PACK} />)
    expect(screen.getByTestId('r').classList.contains('overflow-x-clip')).toBe(true)
    unmount()
    render(<LootReveal data-testid="r" items={PACK} className="overflow-x-visible" />)
    const root = screen.getByTestId('r')
    expect(root.classList.contains('overflow-x-visible')).toBe(true)
    expect(root.classList.contains('overflow-x-clip')).toBe(false)
  })

  it('omits the kind chip and icon wrapper when an item has none', () => {
    render(<LootReveal data-testid="r" items={[{ name: 'Plain', rarity: 'common' }]} />)
    const li = slots(screen.getByTestId('r'))[0] as HTMLLIElement
    expect(li.querySelector('.animate-loot-reveal-glyph')).toBeNull()
    expect(li.querySelector('.rounded-pill')).toBeNull()
  })

  it('takes translated rarity labels and a custom back emblem', () => {
    render(
      <LootReveal
        data-testid="r"
        items={PACK}
        rarityLabels={{ legendary: 'Legendario', rare: 'Raro' }}
        backIcon={<svg data-testid="mark" />}
      />,
    )
    expect(screen.getByText('Legendario')).toBeTruthy()
    expect(screen.getByText('Raro')).toBeTruthy()
    expect(screen.getByText('Epic')).toBeTruthy()
    expect(screen.getAllByTestId('mark')).toHaveLength(3)
    expect(screen.getByTestId('r').querySelector('path[fill-rule], path[fillRule]')).toBeNull()
  })

  it('draws the default flame mark on every card back', () => {
    render(<LootReveal data-testid="r" items={PACK} />)
    const marks = all(screen.getByTestId('r'), 'svg[viewBox="0 0 24 24"][focusable="false"]')
    expect(marks).toHaveLength(3)
  })

  it('renders an empty list for no items', () => {
    render(<LootReveal data-testid="r" items={[]} />)
    expect(slots(screen.getByTestId('r'))).toHaveLength(0)
    expect(screen.getByTestId('r').style.getPropertyValue('--sk-loot-reveal-n')).toBe('0')
  })

  it('does not leak its props to the DOM and passes native props through', () => {
    render(
      <LootReveal
        id="loot"
        data-testid="r"
        aria-label="Rewards"
        items={PACK}
        stagger="slow"
        play
        rarityLabels={{ rare: 'R' }}
        backIcon={<b />}
      />,
    )
    const root = screen.getByTestId('r')
    expect(root.id).toBe('loot')
    expect(root.getAttribute('aria-label')).toBe('Rewards')
    for (const attr of ['items', 'stagger', 'play', 'rarityLabels', 'raritylabels', 'backIcon']) {
      expect(root.hasAttribute(attr)).toBe(false)
    }
  })

  it('forwards ref to the <ul>', () => {
    const ref = createRef<HTMLUListElement>()
    render(<LootReveal ref={ref} items={PACK} />)
    expect(ref.current).toBeInstanceOf(HTMLUListElement)
  })

  it('merges a consumer className last, winning a conflict', () => {
    render(<LootReveal data-testid="r" items={PACK} className="justify-start gap-y-2" />)
    const root = screen.getByTestId('r')
    expect(root.classList.contains('justify-start')).toBe(true)
    expect(root.classList.contains('justify-center')).toBe(false)
    expect(root.classList.contains('gap-y-2')).toBe(true)
    expect(root.classList.contains('gap-y-6')).toBe(false)
  })

  it('hydrates without warnings', async () => {
    await expectHydrates(<LootReveal aria-label="Pack rewards" items={PACK} />)
    await expectHydrates(<LootReveal items={DROP} stagger="slow" play={false} />)
  })

  it('is accessible in both themes', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const { container, unmount } = render(
        <div data-theme={theme}>
          <LootReveal aria-label="Pack rewards" items={DROP} />
        </div>,
      )
      await expectAccessible(container)
      unmount()
    }
  })
})
