import { areaPath } from '@/@panther.core/charts/geometry'
import { Line } from '@/@panther.core/charts/marks/Line'
import type { LinePoint } from '@/@panther.core/charts/marks/Line'
import { MARK, seriesFill } from '@/@panther.core/theme/tokens'

/**
 * An area: a ~10 % fill with the line on top.
 *
 * The fill is context and the line is the signal, which is why the opacity is
 * fixed rather than a prop - a heavier fill turns two overlapping areas into
 * mud, and this app will stack several.
 *
 * The fill breaks at the same gaps as the line, so an absent value leaves a hole
 * rather than a wedge down to the baseline.
 */
export interface AreaProps {
  points: readonly LinePoint[]
  /** Pixel y of the baseline the fill drops to - usually `value(0)`. */
  baselineY: number
  fill?: string
  /** Draw the 2 px line on top. Almost always yes. */
  withLine?: boolean
  markers?: boolean
  labelPoint?: 'none' | 'last' | 'max' | 'min'
  onHover?: (point: LinePoint | null) => void
}

export const Area = ({
  points,
  baselineY,
  fill,
  withLine = true,
  markers = false,
  labelPoint = 'none',
  onHover,
}: AreaProps) => {
  const paint = fill ?? seriesFill(1)

  return (
    <g>
      <path
        d={areaPath(
          points.map(point => (point.y === null ? null : { x: point.x, y: point.y })),
          baselineY
        )}
        fill={paint}
        fillOpacity={MARK.areaFillOpacity}
      />
      {withLine && (
        <Line
          points={points}
          stroke={paint}
          markers={markers}
          labelPoint={labelPoint}
          onHover={onHover}
        />
      )}
    </g>
  )
}
