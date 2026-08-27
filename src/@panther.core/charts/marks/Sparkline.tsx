import clsx from 'clsx'
import type { ReactNode } from 'react'
import { linePath, num } from '@/@panther.core/charts/geometry'
import { extent, extentWithZero, linearScale } from '@/@panther.core/charts/scales'
import { chrome, ink, MARK, seriesFill } from '@/@panther.core/theme/tokens'
import { ABSENT_MARK } from '@/@panther.core/vocabulary'

/**
 * A sparkline: shape at a glance, inline in a row or beside a figure.
 *
 * `valueLabel` is REQUIRED, and that is the point. A sparkline has no axes, no
 * tooltip and no table twin, so the number has to be next to it in text; a trend
 * line that is the only way to read a value is unreadable to a screen reader, on
 * paper, and to anyone who cannot resolve a 3 px slope.
 *
 * Degenerate inputs are the normal case in a build report: an empty series, one
 * datum, a run of identical values, a gap in the middle. Each renders something
 * honest rather than a blank box - and never a NaN coordinate.
 */
export interface SparklineProps {
  values: readonly (number | null | undefined)[]
  /** The figure in text. Required: the line is never the only reading. */
  valueLabel: ReactNode
  /** Accessible description of the trend, e.g. `Assignment across 14 stages`. */
  ariaLabel: string
  width?: number
  height?: number
  stroke?: string
  /** Anchor the domain to zero. Off by default: a sparkline shows shape. */
  zeroBaseline?: boolean
  showEndpoint?: boolean
  className?: string
}

export const Sparkline = ({
  values,
  valueLabel,
  ariaLabel,
  width = 64,
  height = 16,
  stroke,
  zeroBaseline = false,
  showEndpoint = true,
  className,
}: SparklineProps) => {
  const paint = stroke ?? seriesFill(1)
  const pad = MARK.lineWidth
  const w = Math.max(0, num(width))
  const h = Math.max(0, num(height))

  const finiteValues = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  )

  const label = (
    <span className="pb-figures text-ink text-2xs shrink-0">
      {finiteValues.length === 0 ? ABSENT_MARK : valueLabel}
    </span>
  )

  if (finiteValues.length === 0) {
    return (
      <span className={clsx('inline-flex items-center gap-1.5', className)}>
        <span className="text-ink-faint text-3xs">no series</span>
        {label}
      </span>
    )
  }

  const measured = zeroBaseline ? extentWithZero(values) : (extent(values) ?? [0, 1])
  const [min, max] = measured[0] === measured[1] ? [measured[0] - 0.5, measured[1] + 0.5] : measured
  const y = linearScale([min, max], [h - pad, pad])
  const lastIndex = values.length - 1
  const x = linearScale([0, Math.max(1, lastIndex)], [pad, Math.max(pad, w - pad)])

  const points = values.map((value, index) =>
    typeof value === 'number' && Number.isFinite(value) ? { x: x(index), y: y(value) } : null
  )

  const endpoint = [...points].reverse().find(point => point !== null) ?? null
  const single = finiteValues.length === 1

  return (
    <span className={clsx('inline-flex items-center gap-1.5', className)}>
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={ariaLabel}
        className="block shrink-0"
      >
        {/* A single datum is a point, not a line: a one-value line would be
            invisible and a two-point line through nothing would be a lie. */}
        {!single && (
          <path
            d={linePath(points)}
            fill="none"
            stroke={paint}
            strokeWidth={MARK.lineWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {showEndpoint && endpoint && (
          <circle
            cx={num(endpoint.x)}
            cy={num(endpoint.y)}
            r={single ? MARK.lineWidth : MARK.lineWidth - 0.5}
            fill={paint}
            stroke={chrome.surface1}
            strokeWidth={single ? 1 : 0}
          />
        )}
        {single && (
          <text x={0} y={h - 1} fill={ink.faint} fontSize={8}>
            1 pt
          </text>
        )}
      </svg>
      {label}
    </span>
  )
}
