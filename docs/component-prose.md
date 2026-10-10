# Component: Prose

> Follows the `docs/component-button.md` template. **Server component**, CSS only. Typography for
> long text whose markup you don't write by hand (Q42).

## 1. Purpose

Styles long-form text you don't control element by element: rules, legal drafts, patch notes,
help articles rendered from Markdown, MDX or a CMS. Headings, lists, tables, quotes and code get
the Sukuna look, and lines stay near 70 characters. It styles only; your app keeps its own
Markdown renderer (Q42, recommendation 2).

## 2. Files

```
packages/ui/src/components/prose/
├── prose.styles.tsx   # tv() base with descendant selectors ([&_h2]:…), size variant. Pure.
├── prose.logic.tsx    # server component; forwardRef <div> (or `as`).
├── prose.test.tsx
├── prose.stories.tsx
└── index.tsx          # export { Prose }; export type { ProseProps }
```

## 3. API

```ts
import type { ComponentPropsWithoutRef } from 'react'

interface ProseOwnProps {
  size?: 'sm' | 'md' | 'lg'          // default 'md' (16px / 1.7)
  /** Cap lines near 70 characters. Default true. */
  measure?: boolean
  as?: 'div' | 'article' | 'section' // default 'div'
}

export type ProseProps = ProseOwnProps & ComponentPropsWithoutRef<'div'>
```

```tsx
<Prose as="article">
  <SimpleMarkdown source={doc.body} baseLevel={1} />   {/* Pitaya keeps its safe subset */}
</Prose>
```

Deliberately **not** in v1: a Markdown renderer (owner, Q42), an `h1` style (the page owns its
title; Prose starts at `h2`), syntax highlighting for `pre`, an inverted variant.

## 4. Variants → tokens

| Element | Treatment |
|---|---|
| body text | `--sk-text-dim`, size per variant; paragraphs and blocks separated by `1em` |
| `h2` | display face, extra-bold, 1.5em, `--sk-text`; a `--sk-line` rule and padding above, except the first child (Pitaya's section look) |
| `h3`, `h4` | display face, 1.15em / 1em, `--sk-text`, tighter space after |
| `strong` | `--sk-text`, semibold |
| `a` | `--sk-accent`, 1px underline offset 3px, 2px on hover; focus ring `--sk-focus-ring` |
| `ul` / `ol` | 1.3em indent, `0.45em` between items; markers `--sk-accent`, `ol` markers bold tabular-nums |
| `blockquote` | `--sk-surface-2` panel, `--sk-radius-sm`, `--sk-text` (used for notices in rules: no side bar) |
| `code` | mono, 0.86em, `--sk-surface-2`, 5px radius; `pre` scrolls sideways in its own box |
| `kbd` | a class-less `<kbd>` (Markdown output) gets a key-cap look; the `Kbd` component is left alone |
| `table` | class-less tables only (our `Table` is left alone): content width, scrolling sideways in their own box when too wide (`display: block; overflow-x: auto`, GitHub's approach); tabular-nums; head `--sk-text-faint` with a `--sk-line` rule; rows `--sk-line-soft` |
| `hr` | 1px `--sk-line` |
| `img`, `figure` | `max-width: 100%`, `--sk-radius-md`; `figcaption` `text-sm --sk-text-faint` |

| Size | Font | Line height |
|---|---|---|
| sm | 14px (`text-md`) | 1.6 |
| md | 16px (`text-lg`) | 1.7 |
| lg | 18px (`text-xl`) | 1.75 |

## 5. States

Static. No motion.

## 6. Logic (`prose.logic.tsx`)

- **No `'use client'`, no hooks.** `forwardRef<HTMLElement, ProseProps>`. Renders `as` with the
  styles class; children untouched.
- Every element rule is `[:where(&)_x]:…`, compiled to `:where(.prose) x`: element specificity
  only, so a class on any inner element (an `Alert` inside the article) wins without
  `!important`. Tables and `<kbd>` are styled only when they carry no class, so `Table` and `Kbd`
  never get a second set of borders.

## 7. Styles (`prose.styles.tsx`)

`tv()` `base` with literal descendant utilities (`[:where(&)_h2]:mt-[2em]`, …) and variants
`size`, `measure`. No per-component CSS file (rule 7): everything is a utility string.

## 8. Accessibility checklist

- [ ] Body text ≥ 4.5:1 (`--sk-text-dim` on `bg`/`surface`/`surface-2`, both themes).
- [ ] Links are distinguishable without color (underlined) and have a visible focus ring.
- [ ] Heading levels are the content's; Prose never changes them.
- [ ] Wide tables scroll in their own region instead of the page.

## 9. Tests

Server render of every element in §4; size variants; `measure={false}`; `as`; an inner element's
own class beats Prose's (`:where`); ref forwards; className wins; axe both themes on the rules
story.

## 10. Stories

`Rules` (Pitaya-style, Spanish), `Changelog`, `Sizes`, `WithTable`, `WithComponents` (Kbd, Alert,
Table inside). Both `data-theme` values.

## 11. Decisions

- Styles only, no renderer (owner, Q42 recommendation 2).
- `:where()` descendant selectors, so Prose never fights a component placed inside it (D41).
- Size: 1.07 kB brotli (it's a class string), budget 1.5 kB (P5).
