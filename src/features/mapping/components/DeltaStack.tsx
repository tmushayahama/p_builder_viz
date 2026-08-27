import { barPath, insetSegment, num, roundedRectPath } from '@/@panther.core/charts'
import type { BandScale, LinearScale, PlotRect } from '@/@panther.core/charts'
import { ink, MARK } from '@/@panther.core/theme/tokens'

/**
 * A signed stacked column: gains stack up from zero, losses stack down from it.
 *
 * The shared `StackedBars` mark deliberately draws only positive segments, because the stacks it
 * was written for are compositions of a total. A per-stage mapping delta is not a composition -
 * `pass1_trim` loses 4,030 HMM-scored assignments while `hmm` gains 182,097 - so the sign has to
 * be part of the geometry. Everything else is the chassis: the same 2 px gap of chart surface
 * between touching fills (an inset, never a stroke), the same capped thickness with the band's
 * leftover left as air, and the same rounding on the data end only.
 *
 * Sign is never carried by colour here. Fill is mechanism identity in fixed slot order, and the
 * direction is read from the position relative to the zero line plus the explicit `+`/`-` label.
 */
export interface DeltaSegment {
  seriesKey: string
  value: number | null | undefined
}

export interface DeltaStackDatum {
  key: string
  segments: readonly DeltaSegment[]
  /** Pre-formatted net change, drawn when the key is in `labelKeys`. */
  label?: string
}

export interface DeltaStackProps {
  data: readonly DeltaStackDatum[]
  plot: PlotRect
  band: BandScale
  value: LinearScale
  /** Full series domain in fixed slot order, so a hidden series cannot repaint the others. */
  series: readonly string[]
  fillFor: (seriesKey: string) => string
  hidden?: readonly string[]
  labelKeys?: readonly string[]
  maxThickness?: number
  onHover?: (datum: DeltaStackDatum | null, point: { x: number; y: number }) => void
}

interface Piece {
  seriesKey: string
  start: number
  length: number
  outermost: boolean
  direction: 'up' | 'down'
}

/** Stacks one signed direction, insetting each piece so the surface shows between neighbours. */
function stackPieces(
  keys: readonly string[],
  valueOf: (key: string) => number,
  value: LinearScale,
  direction: 'up' | 'down'
): Piece[] {
  const pieces: Piece[] = []
  let cumulative = 0
  keys.forEach((key, index) => {
    const from = value(cumulative)
    cumulative += valueOf(key)
    const to = value(cumulative)
    const { start, length } = insetSegment(from, to, {
      first: index === 0,
      last: index === keys.length - 1,
    })
    if (length <= 0) return
    pieces.push({
      seriesKey: key,
      start,
      length,
      outermost: index === keys.length - 1,
      direction,
    })
  })
  return pieces
}

export const DeltaStack = ({
  data,
  plot,
  band,
  value,
  series,
  fillFor,
  hidden,
  labelKeys,
  maxThickness = MARK.maxBarThickness,
  onHover,
}: DeltaStackProps) => {
  const hiddenSet = new Set(hidden ?? [])
  const visible = series.filter(key => !hiddenSet.has(key))
  const thickness = Math.max(1, band.markThickness(maxThickness) - MARK.surfaceGap)
  const labelled = new Set(labelKeys ?? [])
  const zeroY = num(value(0))

  return (
    <g>
      {data.map(datum => {
        const position = band.center(datum.key) - thickness / 2
        const byKey = new Map(datum.segments.map(segment => [segment.seriesKey, segment.value]))
        const readable = (key: string): number => {
          const magnitude = byKey.get(key)
          return typeof magnitude === 'number' && Number.isFinite(magnitude) ? magnitude : 0
        }

        const positives = visible.filter(key => readable(key) > 0)
        const negatives = visible.filter(key => readable(key) < 0)
        const pieces = [
          ...stackPieces(positives, readable, value, 'up'),
          ...stackPieces(negatives, readable, value, 'down'),
        ]

        const net = visible.reduce((total, key) => total + readable(key), 0)
        const isLabelled = labelled.has(datum.key) && datum.label !== undefined

        // The outer end of the stack, and `zeroY` when nothing was drawable - `Math.min` of an
        // empty list is Infinity, which would silently place the label at the top of the frame.
        const upStarts = pieces.filter(piece => piece.direction === 'up').map(piece => piece.start)
        const downEnds = pieces
          .filter(piece => piece.direction === 'down')
          .map(piece => piece.start + piece.length)
        const outerY =
          net > 0 && upStarts.length > 0
            ? Math.min(...upStarts)
            : net < 0 && downEnds.length > 0
              ? Math.max(...downEnds)
              : zeroY

        return (
          <g key={datum.key}>
            {onHover && (
              <rect
                x={num(position - (Math.max(thickness, MARK.minHitTarget) - thickness) / 2)}
                y={num(plot.y)}
                width={num(Math.max(thickness, MARK.minHitTarget))}
                height={num(plot.height)}
                fill="transparent"
                onPointerEnter={() =>
                  onHover(datum, { x: position + thickness / 2, y: num(outerY) })
                }
                onPointerLeave={() => onHover(null, { x: 0, y: 0 })}
              />
            )}

            {pieces.map(piece => (
              <path
                key={`${piece.direction}-${piece.seriesKey}`}
                d={
                  piece.outermost
                    ? barPath(
                        position,
                        piece.start,
                        thickness,
                        piece.length,
                        piece.direction === 'up' ? 'top' : 'bottom',
                        MARK.barEndRadius
                      )
                    : roundedRectPath(position, piece.start, thickness, piece.length)
                }
                fill={fillFor(piece.seriesKey)}
              />
            ))}

            {isLabelled && (
              <text
                x={position + thickness / 2}
                y={net < 0 ? num(outerY) + 11 : num(outerY) - 4}
                textAnchor="middle"
                fill={ink.primary}
                fontSize={10}
                fontWeight={600}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {datum.label}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}
