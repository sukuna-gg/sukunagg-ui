'use client'

import { type ReactNode, useRef } from 'react'
import { useFxLoop } from '../../internal/use-fx-loop'
import {
  type BracketLink,
  beamHead,
  makeSparks,
  type Rect,
  round2,
  sparkAt,
  timeline,
  type Wire,
  wire,
} from './bracket-beam.geometry'
import { bracketBeamStyles, bracketBeamLayers as layer } from './bracket-beam.styles'

/** Props for {@link BracketBeamMeasure}: all serializable (they cross the server/client line). */
export interface BracketBeamMeasureProps {
  /** Every connector, from `bracketModel`. */
  links: readonly BracketLink[]
  /** Indices into `links` of the champion's path, in travel order. */
  trail: readonly number[]
  /** The rows on the champion's path (`'<data-match>-<row>'`), in travel order: one per link. */
  rows: readonly string[]
  /** The trophy column is rendered (grid columns). */
  champion: boolean
  /** Double elimination: the two-band grid. */
  double?: boolean
  /** Hold the current frame. */
  paused: boolean
  /** The region's accessible name. */
  label?: string
  /** Id(s) of the element(s) naming the region. */
  labelledBy?: string
  /** The server-rendered round columns and trophy card. */
  children: ReactNode
}

const NS = 'http://www.w3.org/2000/svg'
let glowSeq = 0

type Attrs = Record<string, string | number>

function svgEl<K extends keyof SVGElementTagNameMap>(
  parent: Element,
  tag: K,
  attrs: Attrs = {},
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag)
  for (const key in attrs) el.setAttribute(key, String(attrs[key]))
  parent.append(el)
  return el
}

const set = (el: Element, attrs: Attrs): void => {
  for (const key in attrs) el.setAttribute(key, String(attrs[key]))
}

const show = (el: Element, on: boolean): void => {
  const value = on ? 'visible' : 'hidden'
  if (el.getAttribute('visibility') !== value) el.setAttribute('visibility', value)
}

const dim = (el: Element, on: boolean): void => {
  if (el.hasAttribute('data-dim') !== on) el.toggleAttribute('data-dim', on)
}

interface Comet {
  el: SVGPathElement
  /** Nominal length in px (clamped to 70% of short wires). */
  size: number
  length: number
}

interface Segment {
  link: number
  /** A drop into the lower bracket: nothing travels, the ripple and sparks play on the chip. */
  drop: boolean
  trail: SVGPathElement
  flow: SVGPathElement
  ring: SVGCircleElement
  comets: Comet[]
  wire: Wire
  /** Where it lands. */
  end: [number, number]
  /** The match it leaves from, and the box it lands on (what the scroller follows). */
  source: Element
  target: Element
}

/**
 * The client half of `BracketBeam`: the scrolling region around the server-rendered columns, plus
 * the SVG beams. On the shared fx loop (`useFxLoop`, `data-state` on this scroller), it measures
 * the real boxes, draws every wire and, along the champion's path, beams that travel round by round
 * until the trophy ignites (a double-elimination drop has no wire: its step plays a ripple and a
 * spark burst on the drop chip instead). It writes only SVG attributes it created and `data-dim`
 * on the path's rows and the trophy card (styled by `bracket-beam.styles.tsx`), and removes them on
 * teardown. Rendered only by `BracketBeam`.
 * @internal
 */
export function BracketBeamMeasure({
  links,
  trail,
  rows: trailRows,
  champion,
  double,
  paused,
  label,
  labelledBy,
  children,
}: BracketBeamMeasureProps) {
  const grid = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const { ref } = useFxLoop<HTMLElement>(
    (scroller) => {
      const box = grid.current as HTMLDivElement
      const svg = svgRef.current as SVGSVGElement
      const tl = timeline(trail.length)
      const find = (id: string) => box.querySelector(`[data-match="${id}"]`) as HTMLElement
      const rowIn = (match: Element, row: number | string) =>
        match.querySelector<HTMLElement>(`:scope > [data-row="${row}"]`)
      const rows = trailRows.map((key) => {
        const at = key.lastIndexOf('-')
        return rowIn(find(key.slice(0, at)), key.slice(at + 1)) as HTMLElement
      })
      const card = box.querySelector<HTMLElement>('[data-match="champion"]')

      // --- SVG: glow filter, base wires, then per-segment layers (paint order as the mockup) ---
      const glowId = `sk-bracket-beam-glow-${++glowSeq}`
      const filter = svgEl(svg, 'filter', {
        id: glowId,
        filterUnits: 'userSpaceOnUse',
        'color-interpolation-filters': 'sRGB',
      })
      svgEl(filter, 'feGaussianBlur', { stdDeviation: 2.6, result: 'b' })
      const merge = svgEl(filter, 'feMerge')
      for (const input of ['b', 'b', 'SourceGraphic']) svgEl(merge, 'feMergeNode', { in: input })
      const baseLayer = svgEl(svg, 'g')
      const glow = svgEl(svg, 'g', { filter: `url(#${glowId})` })
      const trailLayer = svgEl(glow, 'g')
      const fxLayer = svgEl(glow, 'g')

      const resolved = links.map(([from, to, row, fromRow, drop]) => {
        const source = find(from)
        const dest = find(to)
        const landing = row < 0 ? dest : (rowIn(dest, row) as HTMLElement)
        return {
          source,
          // The row it leaves: the winner's, or `fromRow` (-1 matches nothing: the box's centre).
          win:
            (fromRow === undefined
              ? source.querySelector('[data-winner]')
              : rowIn(source, fromRow)) ?? source,
          dest,
          // A drop lands on the destination row's chip, and has no wire.
          row: drop ? (landing.querySelector('[data-drop]') ?? landing) : landing,
          base: drop ? undefined : svgEl(baseLayer, 'path', { class: layer.base }),
        }
      })
      const hidden = { visibility: 'hidden' }
      const segments: Segment[] = trail.map((link) => ({
        link,
        drop: !resolved[link]?.base,
        trail: svgEl(trailLayer, 'path', { class: layer.trail }),
        flow: svgEl(trailLayer, 'path', { class: layer.flow, ...hidden }),
        ring: svgEl(fxLayer, 'circle', { class: layer.ring, ...hidden }),
        comets: [],
        wire: wire(0, 0, 0, 0),
        end: [0, 0],
        source: resolved[link]?.source ?? box,
        target: resolved[link]?.dest ?? box,
      }))
      for (const seg of segments) {
        if (seg.drop) continue // nothing travels: no comet
        seg.comets = [
          [layer.tail, 72],
          [layer.comet, 36],
          [layer.core, 14],
        ].map(([cls, size]) => ({
          el: svgEl(fxLayer, 'path', { class: cls as string, ...hidden }),
          size: size as number,
          length: size as number,
        }))
      }
      const sparks = (trail.length ? makeSparks(trail.length - 1) : []).map((spark) => ({
        spark,
        on: false,
        el: svgEl(fxLayer, 'circle', {
          class: spark.hot ? layer.sparkHot : layer.spark,
          opacity: 0,
        }),
      }))
      const halo = svgEl(fxLayer, 'circle', { class: layer.halo, r: 6, ...hidden })
      const head = svgEl(fxLayer, 'circle', { class: layer.head, r: 2.3, ...hidden })

      // --- Layout: measure the server boxes, route a wire per link -----------------------------
      let cardBox: Rect = { x: 0, y: 0, w: 0, h: 0 }
      const layout = (): void => {
        const origin = box.getBoundingClientRect()
        if (!origin.width) return
        const rel = (el: Element): Rect => {
          const r = el.getBoundingClientRect()
          return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height }
        }
        const wires = resolved.map((item) => {
          const a = rel(item.source)
          const w = rel(item.win)
          const z = rel(item.dest)
          const y = rel(item.row)
          if (!item.base) {
            // A drop: a zero-length "wire" on the chip's centre, where the beam reappears.
            const [cx, cy] = [y.x + y.w / 2, y.y + y.h / 2]
            return { path: wire(cx, cy, cx, cy), end: [cx, cy] as [number, number] }
          }
          const path = wire(a.x + a.w, w.y + w.h / 2, z.x, y.y + y.h / 2)
          set(item.base, { d: path.d, pathLength: round2(Math.max(path.length, 0.01)) })
          return { path, end: [z.x, y.y + y.h / 2] as [number, number] }
        })
        for (const seg of segments) {
          const { path, end } = wires[seg.link] ?? { path: seg.wire, end: seg.end }
          const length = round2(Math.max(path.length, 0.01))
          seg.wire = path
          seg.end = end
          for (const el of [seg.trail, seg.flow, ...seg.comets.map((c) => c.el)])
            set(el, { d: path.d, pathLength: length })
          seg.trail.setAttribute('stroke-dasharray', `${length} ${length + 9}`)
          for (const comet of seg.comets) {
            comet.length = Math.min(comet.size, length * 0.7)
            comet.el.setAttribute(
              'stroke-dasharray',
              `${comet.length} ${length + comet.length + 9}`,
            )
          }
        }
        if (card) cardBox = rel(card)
        set(filter, { x: -40, y: -60, width: origin.width + 80, height: origin.height + 120 })
        if (scroller.scrollWidth > scroller.clientWidth + 2) scroller.tabIndex = 0
        else scroller.removeAttribute('tabindex')
      }

      // --- Follow the beam while the bracket overflows, until the viewer scrolls it ------------
      let touched = false
      let goal = -1
      let from = 0
      const onScroll = (): void => {
        const x = scroller.scrollLeft
        if (
          goal < 0 ||
          (x - from) * (goal - from) < 0 ||
          Math.abs(x - from) > Math.abs(goal - from) + 1
        )
          touched = true
        else if (Math.abs(x - goal) < 1) goal = -1
      }
      scroller.addEventListener('scroll', onScroll, { passive: true })
      const glide = (x: number, behavior: ScrollBehavior): void => {
        const max = scroller.scrollWidth - scroller.clientWidth
        if (touched || max < 4) return
        from = scroller.scrollLeft
        goal = Math.round(Math.max(0, Math.min(max, x)))
        scroller.scrollTo({ left: goal, behavior })
      }
      const follow = (target: Element): void => {
        const r = target.getBoundingClientRect()
        const s = scroller.getBoundingClientRect()
        glide(
          scroller.scrollLeft + r.left - s.left + (r.width - scroller.clientWidth) / 2,
          'smooth',
        )
      }

      // --- One frame of the timeline (t in ms; `still` = the reduced-motion frame) -------------
      // Start on the lit frame (the server poster's twin): it holds, fades, then the loop plays.
      // `prev` starts there too, so mounting crosses no beam departures (no scroll on load).
      let clock = tl.still
      let prev = clock
      let trailOpacity = -1
      const paint = (t: number, still: boolean): void => {
        if (t < prev) prev = -1 // looped
        const cross = (at: number) => !still && prev < at && t >= at
        if (cross(0)) follow(segments[0]?.source ?? box)
        let active: [Segment, number] | undefined
        const trailAlpha = still ? 1 : round2(Math.min(1, 0.6 + Math.max(0, t - tl.ignite) / 900))
        const flowIn = still ? 0 : Math.max(0, Math.min(1, (t - tl.ignite) / 400))
        segments.forEach((seg, i) => {
          const length = round2(Math.max(seg.wire.length, 0.01))
          const leaves = tl.start[i] ?? 0
          const h = still ? Number.POSITIVE_INFINITY : beamHead(length, t - leaves, tl.travel)
          set(seg.trail, {
            'stroke-dashoffset': round2(length - Math.max(0, Math.min(h, length))),
            opacity: trailAlpha,
          })
          for (const comet of seg.comets) {
            const on = h >= 0 && h - comet.length < length
            show(comet.el, on)
            if (on) comet.el.setAttribute('stroke-dashoffset', String(round2(comet.length - h)))
          }
          if (h >= 0 && h <= length && !seg.drop) active = [seg, h]
          const ripple = t - (tl.arrive[i] ?? 0)
          const rippling = !still && ripple >= 0 && ripple < 480
          show(seg.ring, rippling)
          if (rippling) {
            const k = ripple / 480
            set(seg.ring, {
              cx: round2(seg.end[0]),
              cy: round2(seg.end[1]),
              r: round2(2 + 16 * (1 - (1 - k) ** 3)),
              opacity: round2((1 - k) ** 2),
            })
          }
          show(seg.flow, flowIn > 0)
          if (flowIn > 0)
            set(seg.flow, {
              'stroke-dashoffset': round2(-(t * 0.06) % 12),
              opacity: round2(flowIn * 0.75),
            })
          if (cross(leaves)) follow(seg.target)
        })
        show(head, !!active)
        show(halo, !!active)
        if (active) {
          const [x, y] = active[0].wire.at(active[1])
          set(head, { cx: round2(x), cy: round2(y) })
          set(halo, { cx: round2(x), cy: round2(y) })
        }
        rows.forEach((row, i) => {
          dim(row, !(still || (t >= (tl.lit[i] ?? 0) && t < tl.fade)))
        })
        if (card) dim(card, !still && (t < tl.ignite || t >= tl.fade))
        const fade = still || t < tl.fade ? 1 : round2(Math.max(0, 1 - (t - tl.fade) / 600))
        if (fade !== trailOpacity) {
          trailLayer.style.opacity = String(fade)
          trailOpacity = fade
        }
        const landings = segments.map((seg) => seg.end)
        for (const item of sparks) {
          const [x, y, alpha] = still ? [0, 0, 0] : sparkAt(item.spark, t, tl, landings, cardBox)
          if (alpha > 0.01) {
            set(item.el, {
              cx: round2(x),
              cy: round2(y),
              r: round2(item.spark.radius),
              opacity: round2(alpha),
            })
            item.on = true
          } else if (item.on) {
            item.el.setAttribute('opacity', '0')
            item.on = false
          }
        }
        prev = t
      }

      let lastStill = false
      const repaint = (): void => {
        if (!segments.length) return
        if (lastStill) {
          paint(tl.still, true)
          glide(1e9, 'instant') // reduced motion: show the result (the trophy) at once
        } else paint(clock, false)
      }

      let live = true
      const ro = new ResizeObserver(() => {
        layout()
        repaint()
      })
      ro.observe(box)
      ro.observe(scroller)
      document.fonts?.ready.then(() => {
        if (!live) return
        layout()
        repaint()
      })
      layout()

      return {
        tick({ dt, still }) {
          lastStill = still
          if (!still && segments.length) clock = (clock + dt * 1000) % tl.period
          repaint()
          return !still && segments.length > 0 // a bracket with no champion's path never moves
        },
        dispose() {
          live = false
          ro.disconnect()
          scroller.removeEventListener('scroll', onScroll)
          scroller.removeAttribute('tabindex')
          svg.replaceChildren()
          for (const el of [...rows, card]) el?.removeAttribute('data-dim')
        },
      }
    },
    { paused },
  )

  const s = bracketBeamStyles({ champion, double })
  return (
    <section ref={ref} aria-label={label} aria-labelledby={labelledBy} className={s.scroller()}>
      <div ref={grid} className={s.grid()}>
        {children}
        <div aria-hidden="true" className={s.overlay()}>
          <svg ref={svgRef} className={s.svg()} focusable="false" />
        </div>
      </div>
    </section>
  )
}
