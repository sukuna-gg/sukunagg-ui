/**
 * `@sukunagg/charts` — server-rendered, accessible charts for sukuna-ui.
 *
 * Peers on `@sukunagg/ui` for the `--sk-*` tokens (`@sukunagg/ui/theme.css`), `EmptyState` and
 * `Skeleton`. Tailwind apps add `@source "../node_modules/@sukunagg/charts/dist"`; others import
 * `@sukunagg/charts/styles.css`. Spec: docs/charts-and-stats.md §5.
 */

export type { BarChartProps } from './components/bar-chart'
export { BarChart } from './components/bar-chart'
export type { DataBarProps } from './components/data-bar'
export { DataBar } from './components/data-bar'
export type { AreaChartProps, LineChartOwnProps, LineChartProps } from './components/line-chart'
export { AreaChart, LineChart } from './components/line-chart'
export type {
  ChartBaseProps,
  ChartEmpty,
  ChartLabelProps,
  ChartLegendItem,
  ChartSeries,
} from './internal/types'
