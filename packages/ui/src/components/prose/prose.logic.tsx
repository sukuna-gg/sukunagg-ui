import { type ComponentPropsWithoutRef, forwardRef } from 'react'
import { type ProseStyleProps, proseStyles } from './prose.styles'

/** Props for {@link Prose}: the native `<div>` attributes plus the size, measure and element. */
export interface ProseProps extends ComponentPropsWithoutRef<'div'>, ProseStyleProps {
  /**
   * Element to render: a plain `div`, or `article` / `section` when the text is the page's content.
   * @default 'div'
   */
  as?: 'div' | 'article' | 'section'
}

/**
 * Styles long text whose markup you don't write by hand: rules, legal drafts, patch notes, help
 * articles rendered from Markdown, MDX or a CMS. Headings, lists, tables, quotes and code get the
 * Sukuna look, and lines stay near 70 characters.
 *
 * @remarks
 * - SSR/RSC: a server component and only a class string; no client JS.
 * - It styles, it doesn't parse: keep your own Markdown renderer and put its output inside.
 * - Starts at `h2` (the page owns its `h1`); heading levels stay the content's own.
 * - A component placed inside keeps its own styles: element rules carry no class specificity, and
 *   bare `<table>`/`<kbd>` are styled only when they have no class (so `Table` and `Kbd` aren't
 *   styled twice). Bare tables scroll sideways in their own box on narrow screens.
 * - Variants: `size` 'sm' (14px) | 'md' (16px, default) | 'lg' (18px); `measure` (default `true`)
 *   caps lines at 70ch.
 *
 * @example
 * ```tsx
 * import { Prose } from '@sukunagg/ui'
 *
 * <Prose as="article">
 *   <h2>1. Inscripción</h2>
 *   <p>La inscripción cierra <strong>24 horas antes</strong> del torneo.</p>
 *   <ul><li>El capitán confirma el check-in 30 minutos antes.</li></ul>
 * </Prose>
 * ```
 */
export const Prose = forwardRef<HTMLDivElement, ProseProps>(function Prose(
  { as: Element = 'div', size, measure, className, ...rest },
  ref,
) {
  return <Element ref={ref} className={proseStyles({ size, measure, className })} {...rest} />
})
