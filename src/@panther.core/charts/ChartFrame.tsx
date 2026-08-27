import clsx from 'clsx'
import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { SegmentedToggle } from '@/@panther.core/components/SegmentedToggle'
import { useElementSize } from '@/@panther.core/hooks/useElementSize'
import { chrome, ink, MARK } from '@/@panther.core/theme/tokens'
import { num } from '@/@panther.core/charts/geometry'

/**
 * The chart chassis. Every chart in the app is built on this, and no chart
 * re-implements a scale, an axis or a tooltip layer.
 *
 * Three decisions are load-bearing.
 *
 * It SIZES TO INCLUDE THE AXIS BAND. `height` is the height of the PLOT; the
 * margins are added on top, so the SVG is always tall enough for its tick
 * labels. A frame that sized to the plot alone would push labels outside the
 * card and produce a nested scrollbar - which is how a card ends up cropping
 * its own axis.
 *
 * It does not render marks until it has a width. `children` and the tick
 * builders are render props taking the plot rect, and they are not called while
 * the container measures 0 - which is the one moment a chart can divide by zero
 * and emit a `NaN` coordinate. A `NaN` blanks a chart silently instead of
 * throwing, so the guard belongs here rather than in each mark.
 *
 * It requires a table view. `tableView` is the twin every chart must ship: a
 * tooltip may enhance a value but must never be the only way to read it.
 * Omitting it is a defect, not an option.
 */
export interface PlotRect {
  x: number
  y: number
  width: number
  height: number
}

export interface ChartMargins {
  top: number
  right: number
  bottom: number
  left: number
}

export interface AxisTick {
  /** Coordinate along the axis, in SVG user space. */
  position: number
  label: string
  /** Draws the label in primary ink: the endpoint, the extreme, the one that matters. */
  emphasis?: boolean
  /** Suppresses this tick's gridline (useful on a zero baseline). */
  noGrid?: boolean
}

export interface ChartFrameProps {
  /** The SVG `<title>`, and the chart's accessible name. Always required. */
  title: string
  /** The SVG `<desc>`: what the reader should take from the chart. */
  description?: string
  /** PLOT height in px. Margins are added to it, never taken out of it. */
  height?: number
  margins?: Partial<ChartMargins>
  /** Below this container width the frame scrolls horizontally instead of cramping. */
  minWidth?: number
  xTicks?: (plot: PlotRect) => readonly AxisTick[]
  yTicks?: (plot: PlotRect) => readonly AxisTick[]
  xLabel?: string
  yLabel?: string
  grid?: 'none' | 'x' | 'y' | 'both'
  /** Draws the zero/baseline axis lines. */
  axes?: 'none' | 'x' | 'y' | 'both'
  /** Marks, as a function of the plot rect. Not called until width > 0. */
  children: (plot: PlotRect) => ReactNode
  /** HTML layer above the SVG, positioned in container space: tooltips, labels. */
  overlay?: (plot: PlotRect) => ReactNode
  /** A ChartLegend. Present for >= 2 series, absent for one. */
  legend?: ReactNode
  /** The table twin. Required in practice; the toggle appears when it is given. */
  tableView?: ReactNode
  /** Rendered in place of the plot when there is nothing to draw. */
  empty?: ReactNode
  isEmpty?: boolean
  /** A note under the chart: a truncation notice, a provenance line, a caveat. */
  footer?: ReactNode
  anchorId?: string
  className?: string
}

const DEFAULT_MARGINS: ChartMargins = { top: 6, right: 8, bottom: 0, left: 0 }

export const ChartFrame = ({
  title,
  description,
  height = 160,
  margins,
  minWidth = 0,
  xTicks,
  yTicks,
  xLabel,
  yLabel,
  grid = 'y',
  axes = 'both',
  children,
  overlay,
  legend,
  tableView,
  empty,
  isEmpty = false,
  footer,
  anchorId,
  className,
}: ChartFrameProps) => {
  const [ref, size] = useElementSize<HTMLDivElement>()
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const baseId = useId()
  const titleId = `${baseId}-title`
  const descId = `${baseId}-desc`

  const resolved: ChartMargins = {
    top: margins?.top ?? DEFAULT_MARGINS.top,
    right: margins?.right ?? DEFAULT_MARGINS.right,
    bottom: margins?.bottom ?? (xTicks ? 20 : 0) + (xLabel ? 14 : 0),
    left: margins?.left ?? (yTicks ? 44 : 0) + (yLabel ? 14 : 0),
  }

  const plotHeight = Math.max(0, num(height))
  const svgHeight = resolved.top + plotHeight + resolved.bottom
  const svgWidth = Math.max(0, Math.max(num(size.width), minWidth))
  const plotWidth = Math.max(0, svgWidth - resolved.left - resolved.right)
  const plot: PlotRect = {
    x: resolved.left,
    y: resolved.top,
    width: plotWidth,
    height: plotHeight,
  }

  const drawable = plotWidth > 0 && plotHeight > 0 && !isEmpty
  const xs = drawable && xTicks ? xTicks(plot) : []
  const ys = drawable && yTicks ? yTicks(plot) : []

  const chart = (
    <div className="relative" data-pb-break="avoid">
      <div ref={ref} className={clsx(minWidth > 0 && 'min-w-0')}>
        <div data-pb-scroll="" className={clsx(minWidth > 0 && 'overflow-x-auto')}>
          <svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            role="img"
            aria-labelledby={description ? `${titleId} ${descId}` : titleId}
            aria-busy={size.measured ? undefined : true}
            className="block max-w-none"
          >
            <title id={titleId}>{title}</title>
            {description && <desc id={descId}>{description}</desc>}

            {drawable && (
              <>
                {/* Gridlines: solid 1 px hairlines one step off the surface.
                    Never dashed, never heavy - they are behind the data, not in
                    front of it. */}
                {(grid === 'y' || grid === 'both') &&
                  ys
                    .filter(tick => !tick.noGrid)
                    .map(tick => (
                      <line
                        key={`gy-${tick.position}-${tick.label}`}
                        x1={plot.x}
                        x2={plot.x + plot.width}
                        y1={num(tick.position)}
                        y2={num(tick.position)}
                        stroke={chrome.grid}
                        strokeWidth={MARK.hairlineWidth}
                        shapeRendering="crispEdges"
                      />
                    ))}
                {(grid === 'x' || grid === 'both') &&
                  xs
                    .filter(tick => !tick.noGrid)
                    .map(tick => (
                      <line
                        key={`gx-${tick.position}-${tick.label}`}
                        x1={num(tick.position)}
                        x2={num(tick.position)}
                        y1={plot.y}
                        y2={plot.y + plot.height}
                        stroke={chrome.grid}
                        strokeWidth={MARK.hairlineWidth}
                        shapeRendering="crispEdges"
                      />
                    ))}

                {children(plot)}

                {(axes === 'x' || axes === 'both') && (
                  <line
                    x1={plot.x}
                    x2={plot.x + plot.width}
                    y1={plot.y + plot.height}
                    y2={plot.y + plot.height}
                    stroke={chrome.axis}
                    strokeWidth={MARK.hairlineWidth}
                    shapeRendering="crispEdges"
                  />
                )}
                {(axes === 'y' || axes === 'both') && (
                  <line
                    x1={plot.x}
                    x2={plot.x}
                    y1={plot.y}
                    y2={plot.y + plot.height}
                    stroke={chrome.axis}
                    strokeWidth={MARK.hairlineWidth}
                    shapeRendering="crispEdges"
                  />
                )}

                {/* Tick text wears ink tokens, never a series colour. */}
                {xs.map(tick => (
                  <text
                    key={`tx-${tick.position}-${tick.label}`}
                    x={num(tick.position)}
                    y={plot.y + plot.height + MARK.tickPadding + 6}
                    textAnchor="middle"
                    fill={tick.emphasis ? ink.primary : ink.muted}
                    fontSize={10}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {tick.label}
                  </text>
                ))}
                {ys.map(tick => (
                  <text
                    key={`ty-${tick.position}-${tick.label}`}
                    x={plot.x - MARK.tickPadding}
                    y={num(tick.position) + 3}
                    textAnchor="end"
                    fill={tick.emphasis ? ink.primary : ink.muted}
                    fontSize={10}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {tick.label}
                  </text>
                ))}

                {xLabel && (
                  <text
                    x={plot.x + plot.width / 2}
                    y={svgHeight - 2}
                    textAnchor="middle"
                    fill={ink.faint}
                    fontSize={10}
                  >
                    {xLabel}
                  </text>
                )}
                {yLabel && (
                  <text
                    x={10}
                    y={plot.y + plot.height / 2}
                    textAnchor="middle"
                    transform={`rotate(-90 10 ${plot.y + plot.height / 2})`}
                    fill={ink.faint}
                    fontSize={10}
                  >
                    {yLabel}
                  </text>
                )}
              </>
            )}
          </svg>
        </div>
      </div>

      {isEmpty && <div className="absolute inset-0 flex items-center">{empty}</div>}
      {drawable && overlay && (
        <div className="pointer-events-none absolute inset-0">{overlay(plot)}</div>
      )}
    </div>
  )

  return (
    <figure
      id={anchorId}
      data-pb-anchor={anchorId ? '' : undefined}
      className={clsx('m-0 space-y-1.5', className)}
    >
      {tableView && (
        <div className="flex justify-end">
          <SegmentedToggle
            value={view}
            onChange={setView}
            ariaLabel={`${title}: chart or table view`}
            options={[
              { value: 'chart', label: 'Chart' },
              { value: 'table', label: 'Table' },
            ]}
          />
        </div>
      )}

      {view === 'chart' || !tableView ? chart : tableView}

      {legend}

      {footer && <figcaption className="text-ink-muted text-2xs">{footer}</figcaption>}
    </figure>
  )
}
