import clsx from 'clsx'
import { chrome, MARK, divergingFillForValue, seriesFill } from '@/@panther.core/theme/tokens'
import { ABSENT_MARK } from '@/@panther.core/vocabulary'

/**
 * A micro bar inside a table cell, with its figure beside it.
 *
 * The bar is comparison, the figure is the value; neither replaces the other,
 * which is why `label` is rendered as text rather than left to a tooltip.
 *
 * `max` is the caller's, not derived per row: bars only mean anything if every
 * row in the column shares one domain. Passing the row's own value as `max`
 * would draw every bar full-width, which is the classic version of this bug.
 *
 * `baseline: 'center'` gives the signed bar the release comparison needs, with
 * the diverging ramp's neutral midpoint at zero. Geometry is the app's shared
 * geometry: rounded at the data end, square at the baseline.
 */
export interface BarCellProps {
  value: number | null | undefined
  /** Largest absolute value in the column. Shared by every row. */
  max: number
  baseline?: 'zero' | 'center'
  /** A token reference from `theme/tokens`. Defaults by baseline. */
  fill?: string
  /** The figure, already formatted. Rendered beside the bar, not inside it. */
  label?: string
  width?: number
  height?: number
  /** Native tooltip: what the bar is measuring. */
  title?: string
  /** Where the figure sits relative to the bar. */
  labelPosition?: 'before' | 'after' | 'none'
  className?: string
}

export const BarCell = ({
  value,
  max,
  baseline = 'zero',
  fill,
  label,
  width = 88,
  height = 8,
  title,
  labelPosition = 'after',
  className,
}: BarCellProps) => {
  const usable = typeof value === 'number' && Number.isFinite(value)
  const domain = Number.isFinite(max) ? Math.abs(max) : 0
  const scale = domain > 0 ? width / (baseline === 'center' ? domain * 2 : domain) : 0

  const figure =
    labelPosition === 'none' ? null : (
      <span
        className={clsx(
          'pb-figures text-2xs shrink-0',
          usable ? 'text-ink' : 'text-ink-faint',
          labelPosition === 'before' ? 'order-first' : 'order-last'
        )}
      >
        {usable ? (label ?? value.toLocaleString()) : ABSENT_MARK}
      </span>
    )

  // No bar at all when there is nothing to scale against - a zero-width bar
  // reads as "measured zero", and an absent measurement is not a zero.
  const drawable = usable && scale > 0
  const paint =
    fill ?? (baseline === 'center' ? divergingFillForValue(value ?? 0, domain) : seriesFill(1))
  const magnitude = drawable ? Math.min(width, Math.abs(value) * scale) : 0
  const origin = baseline === 'center' ? width / 2 : 0
  const negative = drawable && (value as number) < 0
  const barX = negative ? origin - magnitude : origin
  const radius = Math.min(MARK.barEndRadius, height / 2)

  return (
    <span className={clsx('flex items-center gap-1.5', className)} title={title}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        focusable="false"
        className="shrink-0"
      >
        <rect x={0} y={height / 2 - 0.5} width={width} height={1} fill={chrome.grid} />
        {baseline === 'center' && (
          <rect x={origin - 0.5} y={0} width={1} height={height} fill={chrome.axis} />
        )}
        {drawable && magnitude > 0 && (
          // Rounded on the data end only: the baseline end must stay square so
          // the bar visibly starts at zero rather than floating.
          <path
            d={
              negative
                ? `M${barX + radius} 0 H${origin} V${height} H${barX + radius} A${radius} ${radius} 0 0 1 ${barX} ${height - radius} V${radius} A${radius} ${radius} 0 0 1 ${barX + radius} 0 Z`
                : `M${origin} 0 H${barX + magnitude - radius} A${radius} ${radius} 0 0 1 ${barX + magnitude} ${radius} V${height - radius} A${radius} ${radius} 0 0 1 ${barX + magnitude - radius} ${height} H${origin} Z`
            }
            fill={paint}
          />
        )}
      </svg>
      {figure}
    </span>
  )
}
