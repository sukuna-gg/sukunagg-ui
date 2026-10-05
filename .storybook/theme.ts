import { create } from 'storybook/theming'

// Sukuna-branded Storybook manager UI: near-black, crimson accent, bone text.
export default create({
  base: 'dark',
  brandTitle: 'sukuna-ui',
  // Ember Gate lockup from the brand kit, served via `staticDirs` in main.ts.
  brandImage: '/brand/storybook-logo-dark.svg',
  brandUrl: 'https://github.com/sukuna-gg/sukunagg-ui',
  brandTarget: '_self',
  colorPrimary: '#FF3B4E',
  colorSecondary: '#FF3B4E',
  appBg: '#0A0A0B',
  appContentBg: '#141416',
  appPreviewBg: '#0A0A0B',
  appBorderColor: 'rgba(255, 255, 255, 0.1)',
  appBorderRadius: 12,
  textColor: '#F4F1EC',
  textInverseColor: '#0A0A0B',
  barTextColor: '#9A948A',
  barSelectedColor: '#FF3B4E',
  barBg: '#141416',
  inputBg: '#1C1C20',
  inputBorder: 'rgba(255, 255, 255, 0.1)',
  inputTextColor: '#F4F1EC',
  inputBorderRadius: 8,
  fontBase: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
})
