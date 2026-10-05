import { tv, type VariantProps } from '../../utils/tv'

// Icons inherit the text color (`stroke="currentColor"`), so `text-*` utilities color them.
export const iconStyles = tv({ base: 'inline-block shrink-0 align-[-0.125em]' })

export type IconStyleProps = VariantProps<typeof iconStyles>
