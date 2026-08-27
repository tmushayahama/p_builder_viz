import type { PlotRect } from '@/@panther.core/charts/ChartFrame'
import { barPath, hitRect, num } from '@/@panther.core/charts/geometry'
import type { BandScale, LinearScale } from '@/@panther.core/charts/scales'
import { ink, MARK, seriesFill } from '@/@panther.core/theme/tokens'

/**
 * Bars and columns.
 *
 * Geometry is the app's shared geometry and is not configurable per chart:
 * thickness capped at 24 px with the band's leftover left as AIR rather than
 * spent on a fatter bar, rounded at the data end, square at the baseline, and a
 * 2 px gap of the chart surface between adjacent bars - the surface showing
 * through, not a stroke drawn around the mark.
 *
 * Absent values are SKIPPED, not scaled to the baseline. A zero-height bar
 * where a measurement is missing reads as a measured zero, which is the one
 * thing the report must never say; the caller renders the absence elsewhere.
 *
 * Labels are selective by design: `labelKeys` names the endpoint, the extreme or
 * the one bar that matters. There is no "label every bar" option, and labels are
 * drawn OUTSIDE the fill in ink tokens - a label inside a fill needs
 * `seriesOnFill(slot)`, which only the caller knows.
 */
export interface BarDatum {
  key: string
  value: number | null | undefined
  /** Paint override for this bar. Defaults to `fill`. */
  fill?: string
  /** Pre-formatted label, used when this key is in `labelKeys`. */
  label?: string
}

export interface BarsProps {
  data: readonly BarDatum[]
  plot: PlotRect
  /** Categories. Vertical bars band along x; horizontal bars band along y. */
  band: BandScale
  /** Magnitude. Its range must already point the right way for the orientation. */
  value: LinearScale
  orientation?: 'vertical' | 'horizontal'
  /** Nominal categories all take one fill; slot 1 is the default. */
  fill?: string
  maxThickness?: number
  labelKeys?: readonly string[]
  formatValue?: (value: number) => string
  onHover?: (datum: BarDatum | null, point: { x: number; y: number }) => void
  onSelect?: (datum: BarDatum) => void
}

export const Bars = ({
  data,
  plot,
  band,
  value,
  orientation = 'vertical',
  fill,
  maxThickness = MARK.maxBarThickness,
  labelKeys,
  formatValue = magnitude => magnitude.toLocaleString(),
  onHover,
  onSelect,
}: BarsProps) => {
  const paint = fill ?? seriesFill(1)
  const labelled = new Set(labelKeys ?? [])
  // The surface gap is taken out of the band, so adjacent bars never touch even
  // when the band scale has no padding.
  const thickness = Math.max(1, band.markThickness(maxThickness) - MARK.surfaceGap)
  const baseline = value(0)

  return (
    <g>
      {data.map(datum => {
        const magnitude = datum.value
        if (typeof magnitude !== 'number' || !Number.isFinite(magnitude)) return null

        const position = band.center(datum.key) - thickness / 2
        const projected = value(magnitude)
        const isLabelled = labelled.has(datum.key)

        if (orientation === 'vertical') {
          const top = Math.min(projected, baseline)
          const height = Math.abs(projected - baseline)
          const hit = hitRect(
            position + thickness / 2,
            plot.y + plot.height / 2,
            Math.max(thickness, band.step),
            plot.height
          )
          return (
            <g key={datum.key}>
              <path
                d={barPath(
                  position,
                  top,
                  thickness,
                  height,
                  magnitude < 0 ? 'bottom' : 'top',
                  MARK.barEndRadius
                )}
                fill={datum.fill ?? paint}
              />
              {isLabelled && (
                <text
                  x={position + thickness / 2}
                  y={magnitude < 0 ? top + height + 11 : top - 4}
                  textAnchor="middle"
                  fill={ink.primary}
                  fontSize={10}
                  fontWeight={600}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {datum.label ?? formatValue(magnitude)}
                </text>
              )}
              {(onHover || onSelect) && (
                <rect
                  x={num(hit.x)}
                  y={num(hit.y)}
                  width={num(hit.width)}
                  height={num(hit.height)}
                  fill="transparent"
                  // The bar's own top-centre, not the pointer: every coordinate a
                  // mark hands back is in the frame's SVG space, so a tooltip
                  // anchors to the mark rather than jittering under the cursor.
                  onPointerEnter={() => onHover?.(datum, { x: position + thickness / 2, y: top })}
                  onPointerLeave={() => onHover?.(null, { x: 0, y: 0 })}
                  onClick={onSelect ? () => onSelect(datum) : undefined}
                  style={{ cursor: onSelect ? 'pointer' : 'default' }}
                />
              )}
            </g>
          )
        }

        const left = Math.min(projected, baseline)
        const width = Math.abs(projected - baseline)
        const hit = hitRect(
          plot.x + plot.width / 2,
          position + thickness / 2,
          plot.width,
          Math.max(thickness, band.step)
        )
        return (
          <g key={datum.key}>
            <path
              d={barPath(
                left,
                position,
                width,
                thickness,
                magnitude < 0 ? 'left' : 'right',
                MARK.barEndRadius
              )}
              fill={datum.fill ?? paint}
            />
            {isLabelled && (
              <text
                x={magnitude < 0 ? left - 4 : left + width + 4}
                y={position + thickness / 2 + 3}
                textAnchor={magnitude < 0 ? 'end' : 'start'}
                fill={ink.primary}
                fontSize={10}
                fontWeight={600}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {datum.label ?? formatValue(magnitude)}
              </text>
            )}
            {(onHover || onSelect) && (
              <rect
                x={num(hit.x)}
                y={num(hit.y)}
                width={num(hit.width)}
                height={num(hit.height)}
                fill="transparent"
                onPointerEnter={() =>
                  onHover?.(datum, {
                    x: magnitude < 0 ? left : left + width,
                    y: position + thickness / 2,
                  })
                }
                onPointerLeave={() => onHover?.(null, { x: 0, y: 0 })}
                onClick={onSelect ? () => onSelect(datum) : undefined}
                style={{ cursor: onSelect ? 'pointer' : 'default' }}
              />
            )}
          </g>
        )
      })}
    </g>
  )
}
