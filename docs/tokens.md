# Tokens — Sukuna → `--sk-*`

Source: Pomo Design System (Sukuna language). Dark is the default theme. Light palette **approved by owner 2026-09-16**.

## Color (semantic)

| Token | Dark (source) | Light (proposed) | Use |
|---|---|---|---|
| `--sk-bg` | `#0A0A0B` (ink) | `#FAF9F5` | Page canvas |
| `--sk-surface` | `#141416` (panel) | `#FFFFFF` | Cards, dialogs |
| `--sk-surface-2` | `#1C1C20` (panel2) | `#F1EFE9` | Nested surfaces, inputs |
| `--sk-well` | `#000000` | `#E8E5DD` | Sunken areas |
| `--sk-line` | `rgba(255,255,255,.10)` | `rgba(0,0,0,.12)` | Borders |
| `--sk-line-soft` | `rgba(255,255,255,.06)` | `rgba(0,0,0,.06)` | Dividers |
| `--sk-accent` | `#FF3B4E` (crimson) | `#D8253A` | Primary action, "live" |
| `--sk-accent-deep` | `#B01221` | `#9A0E1C` | Hover/pressed accent |
| `--sk-accent-glow` | `rgba(255,59,78,.6)` | `rgba(216,37,58,.35)` | Decorative glow shadow (not the focus ring) |
| `--sk-focus-ring` | `#FF3B4E` | `#D8253A` | Solid focus ring (≥3:1 on every surface, WCAG 1.4.11) |
| `--sk-on-accent` | `#FFFFFF` | `#FFFFFF` | Text/icons on the crimson accent/gradient (Button primary) |
| `--sk-premium` | `#E8DCC4` (bone) | `#786A4A` | Premium / gold surfaces |
| `--sk-premium-dim` | `#B5A98C` | `#776A48` | Premium secondary |
| `--sk-text` | `#F4F1EC` | `#141413` | Primary text |
| `--sk-text-dim` | `#9A948A` | `#5E5A52` | Secondary text |
| `--sk-text-faint` | `#8C8479` | `#6F6B63` | Placeholders, disabled |
| `--sk-success` | `#31C877` | `#177B46` | Done / positive |
| `--sk-danger` | `#FF7A59` (coral) | `#B4380A` | **Approved Q31/Q32 (2026-10-05); not in `theme.css` yet (wave 1).** Worse / down: StatTile deltas, data "bad" states. Coral, not crimson, so the brand red never means "bad". Text-safe: 7.17:1 / 5.98:1 on `surface`. Not (yet) a Button/Badge variant — see D33 |

> **Contrast floor.** Every color used as text must clear WCAG AA — 4.5:1 (normal) / 3:1 (large or
> non-text UI) — on `bg`, `surface` and `surface-2` in **both** themes. `text-faint` (both themes)
> and light-theme `premium`/`premium-dim`/`success` were retuned to meet this (see D22). The focus
> ring uses the solid `--sk-focus-ring`, not the translucent `--sk-accent-glow` (which failed 3:1).
> Verify with `scratchpad` contrast script when changing any color token.
| `--sk-gradient-accent` | `linear-gradient(135deg,#D8253A,#B01221)` | `linear-gradient(135deg,#D8253A,#9A0E1C)` | Wordmark, hero CTA, Button primary |

## Data visualization (approved Q31/Q32, 2026-10-05 — not in `theme.css` yet; ships with charts & stats wave 1)

Used by `Sparkline`, `StatTile` and `@sukunagg/charts`. Apps pass their own domain colors (game
placements, team sides) to charts as `color` props; these tokens are the library defaults.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--sk-chart-1` | `#FF3B4E` | `#D8253A` | Series 1 (= accent) |
| `--sk-chart-2` | `#4C8EEF` | `#3072D0` | Series 2 · blue |
| `--sk-chart-3` | `#00A699` | `#008A7E` | Series 3 · teal |
| `--sk-chart-4` | `#C98000` | `#A96100` | Series 4 · amber |
| `--sk-chart-5` | `#A072E6` | `#8557C8` | Series 5 · violet |
| `--sk-chart-6` | `#749F2B` | `#5A8400` | Series 6 · lime |
| `--sk-chart-other` | `#6F6B63` | `#B5B0A6` | The "Other" fold (7th+ series, donut remainder) |
| `--sk-heat-1` … `--sk-heat-4` | `#941424 #B3363D #D25456 #F17070` | `#FF908E #E66E6D #C04B4E #9A282F` | Heatmap levels, low → high (empty cell = `--sk-surface-2`) |

**Rules (each one is enforced by a test or a spec):**

- **Fixed order, never cycled.** Series take slots 1, 2, 3… in order; a 7th series folds into
  `chart-other`. The order is part of the colorblind safety.
- **Validated** with the dataviz palette validator (OKLab ΔE ×100, Machado 2009 CVD simulation):
  lightness band and chroma floor pass; neighbouring slots CVD ΔE ≥ 13.4 (target 8) and
  normal-vision ΔE ≥ 16.4 (floor 15) in both themes; slots 1–3 also pass all-pairs (scatter/donut);
  every slot ≥ 3:1 on `bg`, `surface`, `surface-2` in dark, light, midnight and paper (the last
  two inherit these values). Heat ramps: one hue, monotone, first step ≥ 2:1 (2.09 / 2.18).
- **Amber beside crimson fails under deuteranopia** (ΔE 3.6), so a donut caps at three colored
  segments + Other (a ring makes the last segment touch the first).
- **Text never wears a series color**; labels use `text` / `text-dim` / `text-faint`.
- `chart-6` (lime) sits near `success`: deltas always carry ▲/▼ and a sign, never color alone.

## Typography

| Token | Value |
|---|---|
| `--sk-font-sans` | `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif` |
| `--sk-font-display` | `"Archivo", var(--sk-font-sans)` — library does NOT bundle the font; document `@import` / `next/font` for consumers |
| `--sk-text-xs / sm / md / lg / xl / 2xl / 3xl` | `11 / 12 / 14 / 16 / 18 / 24 / 34 px` |
| `--sk-weight-regular / semibold / bold / black` | `400 / 600 / 700 / 900` |
| `--sk-tracking-tight / normal / eyebrow` | `-0.02em / 0 / 0.22em` |
| `--sk-leading-tight / normal` | `1.02 / 1.5` |
| Numerals | `font-variant-numeric: tabular-nums` on numeric Text variant |

## Spacing, radius, shadow, motion

| Group | Tokens |
|---|---|
| Space | `--sk-space-1..8` = `4 6 8 12 16 20 24 32 px` |
| Radius | `--sk-radius-sm 8px`, `--sk-radius-md 12px`, `--sk-radius-lg 16px`, `--sk-radius-pill 999px` |
| Shadow | `--sk-shadow-card: 0 30px 60px -24px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.06)` (dark) / light **proposed** `0 20px 40px -24px rgba(0,0,0,.25), 0 0 0 1px rgba(0,0,0,.06)` — pending owner approval, see `questions.md` Q12 |
| Motion | `--sk-duration-fast 120ms`, `--sk-duration-base 200ms`, `--sk-duration-slow 320ms` (v1.3), `--sk-ease: cubic-bezier(.2,.8,.2,1)`, `--sk-ease-spring: linear(…)` (v1.3, ≈2% overshoot) — see `docs/motion.md` |
| Z-index | `--sk-z-tooltip 40`, `--sk-z-dialog 50` |

## Theme wiring (Tailwind v4)

`packages/ui/src/styles/theme.css`, shipped as `@sukunagg/ui/theme.css`:

```css
:root, [data-theme="dark"]  { --sk-bg: #0A0A0B; --sk-surface: #141416; /* ... */ }
[data-theme="light"]        { --sk-bg: #FAF9F5; --sk-surface: #FFFFFF; /* ... */ }

@theme inline {
  --color-bg: var(--sk-bg);
  --color-surface: var(--sk-surface);
  --color-surface-2: var(--sk-surface-2);
  --color-accent: var(--sk-accent);
  --color-text: var(--sk-text);
  /* one line per semantic color */
  --font-display: var(--sk-font-display);
  --radius-sm: var(--sk-radius-sm);
  --ease-sukuna: var(--sk-ease);
  --duration-fast: var(--sk-duration-fast);
}

@utility bg-gradient-accent { background-image: var(--sk-gradient-accent); }
```

`@theme inline` keeps the utility pointing at the runtime variable, so `data-theme` switches colors without Tailwind's `dark:` variant. Consumers override by redefining any `--sk-*` under their own selector, exactly as before.
