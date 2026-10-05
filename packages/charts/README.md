# @sukunagg/charts

Server-rendered, accessible React charts for [sukuna-ui](https://github.com/sukuna-gg/sukuna-ui):
`BarChart`, `LineChart`, `AreaChart` and `DataBar`.

- **Server components.** Charts render as SVG paths plus HTML bars, dots and labels, sized by CSS:
  the first paint is the final layout at any width, with nothing measured in the browser.
- **One small client island.** Hover and arrow-key tooltips (~1 kB). `interactive={false}` ships
  no chart JavaScript at all.
- **Missing data is never 0.** `null` breaks lines, draws no bar and says "Not reported"; an empty
  chart keeps its size and shows an `EmptyState`; loading draws a same-size skeleton.
- **Accessible.** A named `<figure>`, a generated summary, the data as a table (screen-reader only
  or behind "Show as a table"), keyboard inspection with a live region.
- **Your colors.** Defaults are the validated `--sk-chart-1…6` tokens; every series, bar or point
  takes any CSS color, so apps keep their own palettes.

## Install

```bash
bun add @sukunagg/charts @sukunagg/ui
```

`@sukunagg/ui` is a peer: charts use its `--sk-*` tokens, `EmptyState` and `Skeleton`.

**Tailwind v4** — next to the `@sukunagg/ui` setup in your global CSS:

```css
@import "tailwindcss";
@import "@sukunagg/ui/theme.css";
@source "../node_modules/@sukunagg/ui/dist";
@source "../node_modules/@sukunagg/charts/dist";
```

**No Tailwind** — import the precompiled utilities after the library's stylesheet:

```ts
import '@sukunagg/ui/styles.css'
import '@sukunagg/charts/styles.css'
```

## Use

```tsx
import { AreaChart, BarChart, DataBar, LineChart } from '@sukunagg/charts'

<BarChart
  aria-label="Kills by weapon, Season 3 vs Season 4"
  data={kills}
  x="weapon"
  series={[{ key: 's3', label: 'Season 3' }, { key: 's4', label: 'Season 4' }]}
  valueLabels
/>

<AreaChart
  aria-label="Gold difference, blue minus red"
  data={gold}
  x="minute"
  series={[{ key: 'gold', label: 'Blue − red' }]}
  baseline={0}
  symmetric
  above="var(--l-blue)"
  below="var(--l-red)"
/>

<DataBar value={damage} max={topDamage} color="var(--l-blue)" />
```

Full API per component: [BarChart](https://github.com/sukuna-gg/sukuna-ui/blob/main/docs/llms/bar-chart.md) ·
[LineChart / AreaChart](https://github.com/sukuna-gg/sukuna-ui/blob/main/docs/llms/line-chart.md) ·
[DataBar](https://github.com/sukuna-gg/sukuna-ui/blob/main/docs/llms/data-bar.md). Design notes:
[docs/charts-and-stats.md](https://github.com/sukuna-gg/sukuna-ui/blob/main/docs/charts-and-stats.md).

## License

MIT
