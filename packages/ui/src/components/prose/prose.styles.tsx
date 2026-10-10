import { tv, type VariantProps } from '../../utils/tv'

/*
 * Every element rule is written `[:where(&)_x]:…`, which compiles to `:where(.prose) x`: element
 * specificity only. A component placed inside an article (a Table, a Kbd, an Alert) keeps its
 * own classes without `!important`. Tables and <kbd> are styled only when they carry no class,
 * so our own Table and Kbd components never pick up a second set of borders.
 */
export const proseStyles = tv({
  base: [
    'text-text-dim',
    // Flow: blocks are 1em apart; headings set their own space.
    '[:where(&)_:is(p,ul,ol,blockquote,pre,table,figure,hr)]:my-[1em]',
    '[:where(&)>:first-child]:mt-0 [:where(&)>:last-child]:mb-0',
    // Two element selectors, so it outranks the 1em flow margin whatever the rule order.
    '[:where(&)_:is(h2,h3,h4)+:is(p,ul,ol,blockquote,pre,table,figure,hr)]:mt-0',
    // Headings. h2 opens a section with a rule above, except at the very top.
    '[:where(&)_h2]:mt-[2em] [:where(&)_h2]:mb-[0.6em] [:where(&)_h2]:border-t [:where(&)_h2]:border-line [:where(&)_h2]:pt-[1.1em]',
    '[:where(&)_h2]:font-display [:where(&)_h2]:text-[1.5em] [:where(&)_h2]:font-extrabold [:where(&)_h2]:leading-[1.15] [:where(&)_h2]:text-text [:where(&)_h2]:font-stretch-[108%] [:where(&)_h2]:text-balance',
    '[:where(&)_h2:first-child]:mt-0 [:where(&)_h2:first-child]:border-t-0 [:where(&)_h2:first-child]:pt-0',
    '[:where(&)_h3]:mt-[1.6em] [:where(&)_h3]:mb-[0.5em] [:where(&)_h3]:font-display [:where(&)_h3]:text-[1.15em] [:where(&)_h3]:font-extrabold [:where(&)_h3]:leading-[1.25] [:where(&)_h3]:text-text',
    '[:where(&)_h4]:mt-[1.4em] [:where(&)_h4]:mb-[0.4em] [:where(&)_h4]:text-[1em] [:where(&)_h4]:font-semibold [:where(&)_h4]:text-text',
    // Inline text.
    '[:where(&)_strong]:font-semibold [:where(&)_strong]:text-text',
    '[:where(&)_a]:text-accent [:where(&)_a]:underline [:where(&)_a]:decoration-1 [:where(&)_a]:underline-offset-[3px] [:where(&)_a:hover]:decoration-2',
    '[:where(&)_a:focus-visible]:rounded-[2px] [:where(&)_a:focus-visible]:outline-2 [:where(&)_a:focus-visible]:outline-offset-2 [:where(&)_a:focus-visible]:outline-focus-ring',
    // Lists: crimson markers.
    '[:where(&)_ul]:list-disc [:where(&)_ol]:list-decimal [:where(&)_:is(ul,ol)]:pl-[1.3em]',
    '[:where(&)_li]:pl-[0.2em] [:where(&)_li+li]:mt-[0.45em] [:where(&)_li::marker]:text-accent',
    '[:where(&)_ol>li::marker]:font-bold [:where(&)_ol>li::marker]:tabular-nums',
    // Notices.
    '[:where(&)_blockquote]:rounded-sm [:where(&)_blockquote]:bg-surface-2 [:where(&)_blockquote]:px-[1em] [:where(&)_blockquote]:py-[0.8em] [:where(&)_blockquote]:text-[0.95em] [:where(&)_blockquote]:text-text',
    // Code.
    '[:where(&)_code]:rounded-[calc(var(--sk-radius-sm)*0.625)] [:where(&)_code]:bg-surface-2 [:where(&)_code]:px-[0.35em] [:where(&)_code]:py-[0.1em] [:where(&)_code]:font-mono [:where(&)_code]:text-[0.86em] [:where(&)_code]:text-text',
    '[:where(&)_pre]:overflow-x-auto [:where(&)_pre]:rounded-md [:where(&)_pre]:bg-surface-2 [:where(&)_pre]:p-[1em] [:where(&)_pre]:text-[0.86em] [:where(&)_pre]:leading-[1.6]',
    '[:where(&)_pre_code]:bg-transparent [:where(&)_pre_code]:p-0 [:where(&)_pre_code]:text-[1em]',
    // A bare <kbd> (Markdown output); the Kbd component brings its own classes.
    '[:where(&)_kbd:not([class])]:rounded-[calc(var(--sk-radius-sm)*0.75)] [:where(&)_kbd:not([class])]:border [:where(&)_kbd:not([class])]:border-b-2 [:where(&)_kbd:not([class])]:border-line [:where(&)_kbd:not([class])]:bg-surface-2 [:where(&)_kbd:not([class])]:px-[0.4em] [:where(&)_kbd:not([class])]:font-sans [:where(&)_kbd:not([class])]:text-[0.8em] [:where(&)_kbd:not([class])]:font-semibold [:where(&)_kbd:not([class])]:text-text',
    // Bare tables scroll in their own box (GitHub's approach); our Table component is left alone.
    '[:where(&)_table:not([class])]:block [:where(&)_table:not([class])]:w-max [:where(&)_table:not([class])]:max-w-full [:where(&)_table:not([class])]:overflow-x-auto [:where(&)_table:not([class])]:border-collapse [:where(&)_table:not([class])]:text-[0.92em] [:where(&)_table:not([class])]:tabular-nums',
    '[:where(&)_table:not([class])_th]:border-b [:where(&)_table:not([class])_th]:border-line [:where(&)_table:not([class])_th]:pr-[1.6em] [:where(&)_table:not([class])_th]:pb-[0.5em] [:where(&)_table:not([class])_th]:text-left [:where(&)_table:not([class])_th]:text-[0.85em] [:where(&)_table:not([class])_th]:font-semibold [:where(&)_table:not([class])_th]:tracking-[0.04em] [:where(&)_table:not([class])_th]:text-text-faint',
    '[:where(&)_table:not([class])_td]:border-b [:where(&)_table:not([class])_td]:border-line-soft [:where(&)_table:not([class])_td]:py-[0.55em] [:where(&)_table:not([class])_td]:pr-[1.6em] [:where(&)_table:not([class])_td]:text-text',
    // Rules and media.
    '[:where(&)_hr]:my-[2em] [:where(&)_hr]:border-0 [:where(&)_hr]:border-t [:where(&)_hr]:border-line',
    '[:where(&)_img]:max-w-full [:where(&)_img]:rounded-md',
    '[:where(&)_figcaption]:mt-[0.5em] [:where(&)_figcaption]:text-sm [:where(&)_figcaption]:text-text-faint',
  ],
  variants: {
    size: {
      sm: 'text-md leading-[1.6]',
      md: 'text-lg leading-[1.7]',
      lg: 'text-xl leading-[1.75]',
    },
    measure: {
      true: 'max-w-[70ch]',
      false: '',
    },
  },
  defaultVariants: { size: 'md', measure: true },
})

export type ProseStyleProps = VariantProps<typeof proseStyles>
