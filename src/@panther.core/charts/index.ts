/**
 * Barrel for the chart chassis and the generic marks.
 *
 * There is no chart library in this project and none is to be added: every chart
 * is hand-rolled inline SVG on `ChartFrame`. What lives here is the chassis, the
 * scales, the shared geometry and the generic marks - the build-specific charts
 * (the stage progression, the species distribution, the phase timeline, the
 * release comparison) belong to their own view plans and compose these.
 */

export { ChartFrame } from '@/@panther.core/charts/ChartFrame'
export type {
  AxisTick,
  ChartFrameProps,
  ChartMargins,
  PlotRect,
} from '@/@panther.core/charts/ChartFrame'
export { ChartLegend } from '@/@panther.core/charts/ChartLegend'
export type { ChartLegendProps, LegendItem } from '@/@panther.core/charts/ChartLegend'
export { ChartPatterns, hatchFill } from '@/@panther.core/charts/ChartPatterns'
export { ChartTooltip } from '@/@panther.core/charts/ChartTooltip'
export type { ChartTooltipProps, ChartTooltipRow } from '@/@panther.core/charts/ChartTooltip'
export { TableView } from '@/@panther.core/charts/TableView'
export type { TableViewProps } from '@/@panther.core/charts/TableView'

export {
  areaPath,
  barPath,
  clampSpan,
  hitRect,
  insetSegment,
  linePath,
  num,
  roundedRectPath,
} from '@/@panther.core/charts/geometry'
export type { CornerRadii, Point } from '@/@panther.core/charts/geometry'

export {
  bandScale,
  extent,
  extentWithZero,
  linearScale,
  niceTicks,
} from '@/@panther.core/charts/scales'
export type { BandScale, BandScaleOptions, LinearScale } from '@/@panther.core/charts/scales'

export { Area } from '@/@panther.core/charts/marks/Area'
export type { AreaProps } from '@/@panther.core/charts/marks/Area'
export { Bars } from '@/@panther.core/charts/marks/Bars'
export type { BarDatum, BarsProps } from '@/@panther.core/charts/marks/Bars'
export { Dots } from '@/@panther.core/charts/marks/Dots'
export type { DotDatum, DotsProps } from '@/@panther.core/charts/marks/Dots'
export { Line } from '@/@panther.core/charts/marks/Line'
export type { LinePoint, LineProps } from '@/@panther.core/charts/marks/Line'
export { Sparkline } from '@/@panther.core/charts/marks/Sparkline'
export type { SparklineProps } from '@/@panther.core/charts/marks/Sparkline'
export { StackedBars } from '@/@panther.core/charts/marks/StackedBars'
export type {
  StackedBarDatum,
  StackedBarsProps,
  StackSegment,
} from '@/@panther.core/charts/marks/StackedBars'
