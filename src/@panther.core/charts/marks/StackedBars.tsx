import type { PlotRect } from '@/@panther.core/charts/ChartFrame'
import { barPath, insetSegment, num, roundedRectPath } from '@/@panther.core/charts/geometry'
import type { BandScale, LinearScale } from '@/@panther.core/charts/scales'
import { chrome, MARK } from '@/@panther.core/theme/tokens'

/**
 * Stacked bars or columns.
 *
 * Segments are separated by a 2 px gap of the CHART SURFACE, produced by
 * insetting each segment rather than by stroking it - a stroke in a border
 * colour would add a fourth ink to the plot and darken every boundary. Only the
 * outermost segment is rounded, so the stack reads as one bar with divisions
 * rather than a pile of pills.
 *
 * `envelope` draws an unfilled reference outline around the band's total, which
 * is how a trimming or deduplication loss stays visible instead of being hidden
 * inside a normalised stack.
 *
 * Segment order follows `series`, which must come from the full domain of a
 * `createCategoricalScale` - so a filter that removes a mechanism cannot
 * reassign the colours of the ones that remain.
 */
export interface StackSegment {
  seriesKey: string
  value: number | null | undefined
}

export interface StackedBarDatum {
  key: string
  segments: readonly StackSegment[]
}

export interface StackedBarsProps {
  data: readonly StackedBarDatum[]
  plot: PlotRect
  band: BandScale
  value: LinearScale
  /** Full series domain, in fixed slot order. */
  series: readonly string[]
  /** Entity to paint, normally a `CategoricalScale.fill`. */
  fillFor: (seriesKey: string) => string
  orientation?: 'vertical' | 'horizontal'
  maxThickness?: number
  /** Series keys currently hidden by a legend toggle. */
  hidden?: readonly string[]
  /** Total envelope per band key, drawn as a hairline outline. */
  envelope?: (key: string) => number | null | undefined
  onHover?: (
    datum: StackedBarDatum | null,
    seriesKey: string | null,
    point: { x: number; y: number }
  ) => void
}

export const StackedBars = ({
  data,
  plot,
  band,
  value,
  series,
  fillFor,
  orientation = 'vertical',
  maxThickness = MARK.maxBarThickness,
  hidden,
  envelope,
  onHover,
}: StackedBarsProps) => {
  const hiddenSet = new Set(hidden ?? [])
  const visible = series.filter(key => !hiddenSet.has(key))
  const thickness = Math.max(1, band.markThickness(maxThickness) - MARK.surfaceGap)
  const vertical = orientation === 'vertical'

  return (
    <g>
      {data.map(datum => {
        const position = band.center(datum.key) - thickness / 2
        const byKey = new Map(datum.segments.map(segment => [segment.seriesKey, segment.value]))
        const usable = visible.filter(key => {
          const magnitude = byKey.get(key)
          return typeof magnitude === 'number' && Number.isFinite(magnitude) && magnitude > 0
        })

        let cumulative = 0
        const total = envelope?.(datum.key)

        return (
          <g key={datum.key}>
            {typeof total === 'number' && Number.isFinite(total) && (
              <path
                d={
                  vertical
                    ? roundedRectPath(
                        position,
                        Math.min(value(total), value(0)),
                        thickness,
                        Math.abs(value(total) - value(0)),
                        { topLeft: MARK.barEndRadius, topRight: MARK.barEndRadius }
                      )
                    : roundedRectPath(
                        Math.min(value(total), value(0)),
                        position,
                        Math.abs(value(total) - value(0)),
                        thickness,
                        { topRight: MARK.barEndRadius, bottomRight: MARK.barEndRadius }
                      )
                }
                fill="none"
                stroke={chrome.axis}
                strokeWidth={MARK.hairlineWidth}
              />
            )}

            {/* One hit target for the whole stack, bigger than any segment, so a
                pointer never falls into a 2 px gap. Drawn FIRST so the
                segments above it receive the pointer, and only the gaps fall
                through to the stack. */}
            {onHover && (
              <rect
                x={num(vertical ? position : plot.x)}
                y={num(vertical ? plot.y : position)}
                width={num(vertical ? Math.max(thickness, MARK.minHitTarget) : plot.width)}
                height={num(vertical ? plot.height : Math.max(thickness, MARK.minHitTarget))}
                fill="transparent"
                onPointerEnter={() =>
                  onHover(datum, null, {
                    x: vertical ? position + thickness / 2 : plot.x + plot.width,
                    y: vertical ? plot.y : position + thickness / 2,
                  })
                }
                onPointerLeave={() => onHover(null, null, { x: 0, y: 0 })}
              />
            )}

            {usable.map((key, index) => {
              const magnitude = byKey.get(key) as number
              const from = value(cumulative)
              cumulative += magnitude
              const to = value(cumulative)
              const isFirst = index === 0
              const isLast = index === usable.length - 1
              const { start, length } = insetSegment(from, to, { first: isFirst, last: isLast })

              if (length <= 0) return null

              const path = vertical
                ? isLast
                  ? barPath(position, start, thickness, length, 'top', MARK.barEndRadius)
                  : roundedRectPath(position, start, thickness, length)
                : isLast
                  ? barPath(start, position, length, thickness, 'right', MARK.barEndRadius)
                  : roundedRectPath(start, position, length, thickness)

              return (
                <path
                  key={key}
                  d={path}
                  fill={fillFor(key)}
                  onPointerEnter={
                    onHover
                      ? () =>
                          onHover(datum, key, {
                            x: vertical ? position + thickness / 2 : start + length,
                            y: vertical ? start : position + thickness / 2,
                          })
                      : undefined
                  }
                  onPointerLeave={onHover ? () => onHover(null, null, { x: 0, y: 0 }) : undefined}
                />
              )
            })}
          </g>
        )
      })}
    </g>
  )
}
