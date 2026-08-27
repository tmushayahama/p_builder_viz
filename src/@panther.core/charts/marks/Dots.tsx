import { Fragment } from 'react'
import { hitRect, num } from '@/@panther.core/charts/geometry'
import { chrome, ink, MARK, seriesFill } from '@/@panther.core/theme/tokens'

/**
 * Dots: the building block for a strip plot, a beeswarm and a scatter.
 *
 * Every dot carries a 2 px ring of the chart surface, which is what makes a
 * dense cluster countable instead of a blob - the species distribution in this
 * report has 120 of 131 points above 90 %, so overlap is the normal case rather
 * than the exception.
 *
 * `jitter` is deterministic, derived from the point's key rather than from
 * `Math.random()`. A plot that moves its points on every render cannot be read,
 * compared between screenshots, or trusted.
 *
 * A scatter or beeswarm is the chart form where every pair of colours is
 * visually adjacent, so it caps at `SERIES_ALL_PAIRS_SAFE_SLOTS` (3) categorical
 * fills - see the validation note in `src/index.css`.
 */
export interface DotDatum {
  key: string
  /** Pre-scaled pixel coordinates. Non-finite values are skipped, not clamped. */
  x: number
  y: number
  fill?: string
  /** Pre-formatted label. Drawn only when the key is in `labelKeys`. */
  label?: string
  /** Draws this dot larger and in front: an outlier worth pointing at. */
  emphasis?: boolean
}

export interface DotsProps {
  data: readonly DotDatum[]
  fill?: string
  radius?: number
  /** Deterministic spread in px, applied along `jitterAxis`. */
  jitter?: number
  jitterAxis?: 'x' | 'y'
  /** Selective direct labels: the extremes, the named outliers. */
  labelKeys?: readonly string[]
  onHover?: (datum: DotDatum | null) => void
  onSelect?: (datum: DotDatum) => void
}

/** A small stable hash, so a point's jitter is a property of the point. */
const hash = (key: string): number => {
  let value = 2166136261
  for (let index = 0; index < key.length; index += 1) {
    value ^= key.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return ((value >>> 0) % 2000) / 1000 - 1
}

export const Dots = ({
  data,
  fill,
  radius = MARK.markerRadius,
  jitter = 0,
  jitterAxis = 'y',
  labelKeys,
  onHover,
  onSelect,
}: DotsProps) => {
  const paint = fill ?? seriesFill(1)
  const labelled = new Set(labelKeys ?? [])
  const r = Math.max(MARK.markerRadius, radius)

  const usable = data.filter(datum => Number.isFinite(datum.x) && Number.isFinite(datum.y))
  // Emphasised dots paint last so an outlier is never hidden under the cluster.
  const ordered = [...usable].sort(
    (a, b) => Number(Boolean(a.emphasis)) - Number(Boolean(b.emphasis))
  )

  return (
    <g>
      {ordered.map(datum => {
        const offset = jitter > 0 ? hash(datum.key) * jitter : 0
        const cx = num(datum.x) + (jitterAxis === 'x' ? offset : 0)
        const cy = num(datum.y) + (jitterAxis === 'y' ? offset : 0)
        const size = datum.emphasis ? r + 1 : r

        return (
          <Fragment key={datum.key}>
            <circle
              cx={cx}
              cy={cy}
              r={size}
              fill={datum.fill ?? paint}
              stroke={chrome.surface1}
              strokeWidth={MARK.surfaceGap}
            />
            {labelled.has(datum.key) && (
              <text
                x={cx + size + 4}
                y={cy + 3}
                fill={ink.primary}
                fontSize={10}
                fontWeight={600}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {datum.label ?? datum.key}
              </text>
            )}
            {(onHover || onSelect) && (
              <rect
                {...hitRect(cx, cy, size * 2, size * 2)}
                fill="transparent"
                onPointerEnter={() => onHover?.(datum)}
                onPointerLeave={() => onHover?.(null)}
                onClick={onSelect ? () => onSelect(datum) : undefined}
                style={{ cursor: onSelect ? 'pointer' : 'default' }}
              />
            )}
          </Fragment>
        )
      })}
    </g>
  )
}
