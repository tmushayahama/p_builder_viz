import { Fragment } from 'react'
import { hitRect, linePath, num } from '@/@panther.core/charts/geometry'
import { chrome, ink, MARK, seriesFill } from '@/@panther.core/theme/tokens'

/**
 * A line, with optional markers.
 *
 * 2 px, round caps, markers no smaller than r=4, and a 2 px ring of the chart
 * surface on each marker so overlapping points stay countable - the ring is the
 * surface showing through, not a border stroked around the mark.
 *
 * The path BREAKS at every absent value. Interpolating across a gap invents a
 * measurement the report does not contain, and on this data that would quietly
 * turn a pending step into a completed one.
 *
 * Labels are selective: `labelPoint` marks the endpoint or the extreme, never
 * every point.
 */
export interface LinePoint {
  /** Pre-scaled pixel coordinates; `null` y is a gap. */
  x: number
  y: number | null
  /** Key for the marker, and for a hover callback. */
  key?: string
  /** Pre-formatted value, used when this point is labelled. */
  label?: string
}

export interface LineProps {
  points: readonly LinePoint[]
  stroke?: string
  strokeWidth?: number
  markers?: boolean
  markerRadius?: number
  /** Which point gets a direct label. `none` is the default. */
  labelPoint?: 'none' | 'last' | 'max' | 'min'
  onHover?: (point: LinePoint | null) => void
}

const finitePoints = (points: readonly LinePoint[]) =>
  points.filter(
    (point): point is LinePoint & { y: number } =>
      typeof point.y === 'number' && Number.isFinite(point.y) && Number.isFinite(point.x)
  )

export const Line = ({
  points,
  stroke,
  strokeWidth = MARK.lineWidth,
  markers = true,
  markerRadius = MARK.markerRadius,
  labelPoint = 'none',
  onHover,
}: LineProps) => {
  const paint = stroke ?? seriesFill(1)
  const drawn = finitePoints(points)

  let labelled: (LinePoint & { y: number }) | null = null
  if (drawn.length > 0 && labelPoint !== 'none') {
    if (labelPoint === 'last') labelled = drawn[drawn.length - 1]
    else if (labelPoint === 'max') labelled = drawn.reduce((a, b) => (b.y < a.y ? b : a))
    else labelled = drawn.reduce((a, b) => (b.y > a.y ? b : a))
  }

  return (
    <g>
      <path
        d={linePath(points.map(point => (point.y === null ? null : { x: point.x, y: point.y })))}
        fill="none"
        stroke={paint}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {markers &&
        drawn.map((point, index) => (
          <Fragment key={point.key ?? index}>
            <circle
              cx={num(point.x)}
              cy={num(point.y)}
              r={Math.max(MARK.markerRadius, markerRadius)}
              fill={paint}
              stroke={chrome.surface1}
              strokeWidth={MARK.surfaceGap}
            />
            {onHover && (
              <rect
                {...hitRect(point.x, point.y, markerRadius * 2, markerRadius * 2)}
                fill="transparent"
                onPointerEnter={() => onHover(point)}
                onPointerLeave={() => onHover(null)}
              />
            )}
          </Fragment>
        ))}

      {labelled && (
        <text
          x={num(labelled.x) + 6}
          y={num(labelled.y) - 6}
          fill={ink.primary}
          fontSize={10}
          fontWeight={600}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {labelled.label ?? ''}
        </text>
      )}
    </g>
  )
}
