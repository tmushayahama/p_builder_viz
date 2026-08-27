import { useMemo, useState } from 'react'
import { ChartFrame, ChartTooltip, Dots, TableView, num } from '@/@panther.core/charts'
import type { AxisTick, DotDatum, PlotRect } from '@/@panther.core/charts'
import { EmptyState } from '@/@panther.core/components'
import type { DataColumn } from '@/@panther.core/components'
import { MARK, accent, chrome, ink, nominalFill } from '@/@panther.core/theme/tokens'
import { formatCount } from '@/app/format'
import type { SpeciesRecord } from '@/features/build/model'
import {
  NODE_COUNT_BANDS,
  layoutLabels,
  packSwarm,
  shortfallAxis,
} from '@/features/species/model/distribution'
import type { DistributionModel, DistributionPoint } from '@/features/species/model/distribution'
import { formatPercent, formatPercentTerse } from '@/features/species/model/format'

/**
 * The primary node-forward-tracking visual: one mark per species, packed as a beeswarm on a
 * shortfall axis.
 *
 * WHY NOT A LINEAR 0-100 % STRIP. On this report the median is 99.5 % with a MAD of 0.4 and 120 of
 * 131 species sit at or above 90 %, so a linear strip is a solid slab against the right edge with a
 * handful of dots trailing left - the reader can see that most species are fine and nothing else.
 * The shortfall spans four orders of magnitude on the same data, so the axis is spaced by the log
 * of the shortfall while still being LABELLED in forward-tracked percent. The dense cluster spreads
 * out, the tail separates, and `DAPMA` at 0 % ends up alone at the far left where it cannot be
 * missed. See `model/distribution.ts` for the alternatives this was chosen over.
 *
 * Three further decisions:
 *
 *   Mark size is the species' node count, in three stated bands, because rate is not importance: a
 *   species at 65 % with 8,910 nodes has lost far fewer nodes than one at 90 % with 200,000. Size
 *   is a secondary channel here - the axis stays the rate, and the counts are in the tooltip, the
 *   table twin and the low-tail list.
 *
 *   The swarm is packed, not jittered. Positions are a deterministic function of the data, so the
 *   plot is identical between renders and between screenshots.
 *
 *   A species with nothing left to track has no position on a log axis, so the marks at exactly
 *   100 % sit in their own slot beyond a visible break rather than being crowded into the last
 *   decade, where they would read as "nearly perfect" instead of "perfect".
 */
export interface SpeciesDistributionProps {
  model: DistributionModel
  /** Joined records, for the cross-section line in the tooltip. */
  byOscode?: Record<string, SpeciesRecord>
  selectedOscode?: string | null
  onSelect?: (oscode: string) => void
}

const PLOT_HEIGHT = 200
const MARGINS = { top: 4, right: 12, bottom: 34, left: 12 }
/** Distance from the plot floor to the swarm's centre line. */
const SWARM_OFFSET = 52
/**
 * Band and width are sized against the densest column this data produces. At 700 px of plot the
 * tightest 12 px slice holds 8 marks, which a +/-48 px band packs without overlap; below that the
 * frame scrolls rather than letting the swarm collapse into a blob.
 */
const SWARM_HALF_HEIGHT = 48
const MIN_PLOT_WIDTH = 700
const LANE_OFFSETS: readonly number[] = [10, 26, 42]

interface Hover {
  point: DistributionPoint
  x: number
  y: number
}

const bandNote = NODE_COUNT_BANDS.map(band => band.label).join(' · ')

export const SpeciesDistribution = ({
  model,
  byOscode = {},
  selectedOscode = null,
  onSelect,
}: SpeciesDistributionProps) => {
  const [hover, setHover] = useState<Hover | null>(null)

  const drawable = model.onAxis.length + model.perfect.length
  const byOscodePoint = useMemo(
    () => new Map(model.points.map(point => [point.oscode, point])),
    [model.points]
  )

  const columns: readonly DataColumn<DistributionPoint>[] = [
    {
      id: 'oscode',
      header: 'Species',
      kind: 'mono',
      render: point => point.oscode,
      sortValue: point => point.oscode,
    },
    {
      id: 'pct',
      header: 'Forward-tracked',
      kind: 'number',
      hint: 'Share of this species’ nodes that mapped forward, as the report states it.',
      render: point => formatPercent(point.pct),
      sortValue: point => point.pct,
    },
    {
      id: 'mapped',
      header: 'Nodes mapped',
      kind: 'number',
      render: point => formatCount(point.mapped),
      sortValue: point => point.mapped,
    },
    {
      id: 'total',
      header: 'Nodes total',
      kind: 'number',
      render: point => formatCount(point.total),
      sortValue: point => point.total,
    },
    {
      id: 'unmapped',
      header: 'Not tracked',
      kind: 'number',
      hint: 'Nodes with no forward match. The magnitude of the shortfall, rather than its rate.',
      render: point => formatCount(point.unmapped),
      sortValue: point => point.unmapped,
    },
  ]

  const tooltipRecord = hover === null ? null : (byOscode[hover.point.oscode] ?? null)
  const tooltipFooter =
    tooltipRecord === null
      ? 'Select a species to open its cross-section.'
      : tooltipRecord.renameOf !== null
        ? `Paired with ${tooltipRecord.renameOf} by an exact count match: a rename, not an addition.`
        : tooltipRecord.isNewInBuild
          ? 'Reported as new in this build, so it has no previous nodes to track forward.'
          : 'Select a species to open its cross-section.'

  return (
    <ChartFrame
      title="Node forward tracking by species"
      description="One mark per species. Horizontal position is the share of its nodes that mapped forward, spaced by the log of the shortfall so the cluster near 100 % separates. Mark size is the species' node count."
      height={PLOT_HEIGHT}
      margins={MARGINS}
      minWidth={MIN_PLOT_WIDTH}
      grid="x"
      axes="x"
      isEmpty={drawable === 0}
      empty={
        <EmptyState
          title="No species rows to plot"
          description="This report carries no per-species node forward tracking figures, so there is no distribution to draw. Nothing here is inferred from that absence."
        />
      }
      xLabel="Forward-tracked share of a species’ nodes — log spacing on the shortfall"
      xTicks={plot => {
        const axis = shortfallAxis(plot, model.perfect.length > 0)
        return axis.ticks.map((tick): AxisTick => ({
          position: tick.position,
          label: tick.label,
          emphasis: tick.emphasis,
        }))
      }}
      tableView={
        <TableView
          caption="Node forward tracking by species"
          columns={columns}
          rows={model.points}
          rowKey={point => point.oscode}
          maxHeight={340}
          footNote="Node counts are not sequence counts: a sequence with no family has no node."
        />
      }
      footer={
        <span className="flex flex-wrap gap-x-3 gap-y-0.5">
          <span>
            Horizontal spacing is the log of the shortfall, so the gap between 99.9 % and 100 % is
            drawn as wide as the gap between 0 % and 90 %. Ticks are the forward-tracked percentage
            the report publishes.
          </span>
          <span>Mark size is the species’ node count: {bandNote}.</span>
          {model.perfect.length > 0 && (
            <span>
              {formatCount(model.perfect.length)} species tracked every node forward and sit in the
              separated slot at 100 %, which has no position on a log axis.
            </span>
          )}
          {model.unusableOscodes.length > 0 && (
            <span>
              {formatCount(model.unusableOscodes.length)} species rows carry no readable percentage
              and are not drawn: {model.unusableOscodes.join(', ')}.
            </span>
          )}
        </span>
      }
      overlay={plot => (
        <ChartTooltip
          x={hover?.x ?? 0}
          y={hover?.y ?? 0}
          bounds={plot}
          visible={hover !== null}
          title={hover?.point.oscode}
          rows={
            hover === null
              ? []
              : [
                  {
                    label: 'Forward-tracked',
                    value: formatPercent(hover.point.pct),
                    emphasis: true,
                  },
                  { label: 'Nodes mapped', value: formatCount(hover.point.mapped) },
                  { label: 'Nodes total', value: formatCount(hover.point.total) },
                  { label: 'Not tracked', value: formatCount(hover.point.unmapped) },
                ]
          }
          footer={tooltipFooter}
        />
      )}
    >
      {(plot: PlotRect) => {
        const axis = shortfallAxis(plot, model.perfect.length > 0)
        if (!axis.usable) return null

        const centerY = plot.y + plot.height - SWARM_OFFSET
        const xOf = (point: DistributionPoint): number =>
          point.isPerfect ? axis.perfectX : axis.x(point.shortfallPct ?? 0)

        const placements = packSwarm(
          [...model.onAxis, ...model.perfect].map(point => ({
            key: point.oscode,
            x: xOf(point),
            radius: point.band.radius,
          })),
          { centerY, halfHeight: SWARM_HALF_HEIGHT, gap: MARK.surfaceGap }
        )
        const placed = new Map(placements.map(placement => [placement.key, placement]))

        const datumFor = (point: DistributionPoint): DotDatum | null => {
          const placement = placed.get(point.oscode)
          if (placement === undefined) return null
          return {
            key: point.oscode,
            x: placement.x,
            y: placement.y,
            fill: point.oscode === selectedOscode ? accent.base : undefined,
          }
        }

        const labels = layoutLabels(
          model.labelled
            .map(oscode => {
              const placement = placed.get(oscode)
              return placement === undefined
                ? null
                : { key: oscode, text: oscode, x: placement.x, y: placement.y - placement.radius }
            })
            .filter((anchor): anchor is { key: string; text: string; x: number; y: number } =>
              Boolean(anchor)
            ),
          {
            laneYs: LANE_OFFSETS.map(offset => plot.y + offset),
            right: plot.x + plot.width,
          }
        )

        const selectedPoint =
          selectedOscode === null ? null : (byOscodePoint.get(selectedOscode) ?? null)
        const selectedDatum = selectedPoint === null ? null : datumFor(selectedPoint)

        const onHover = (datum: DotDatum | null) => {
          if (datum === null) {
            setHover(null)
            return
          }
          const point = byOscodePoint.get(datum.key)
          if (point === undefined) return
          // The mark's own centre, not the pointer: every coordinate a mark hands back is already
          // in the frame's SVG space, so the readout anchors to the mark instead of jittering.
          setHover({ point, x: num(datum.x), y: num(datum.y) })
        }

        return (
          <>
            {/* The break: the 100 % slot is off the log axis, and the reader has to see that. */}
            {axis.breakX !== null && (
              <line
                x1={num(axis.breakX)}
                x2={num(axis.breakX)}
                y1={plot.y}
                y2={plot.y + plot.height}
                stroke={chrome.axis}
                strokeWidth={MARK.hairlineWidth}
                shapeRendering="crispEdges"
              />
            )}

            <g data-pb-swarm="">
              {NODE_COUNT_BANDS.map(band => {
                const data = [...model.onAxis, ...model.perfect]
                  .filter(point => point.band.key === band.key)
                  .map(datumFor)
                  .filter((datum): datum is DotDatum => datum !== null)
                if (data.length === 0) return null
                return (
                  <Dots
                    key={band.key}
                    data={data}
                    radius={band.radius}
                    fill={nominalFill()}
                    onHover={onHover}
                    onSelect={onSelect ? datum => onSelect(datum.key) : undefined}
                  />
                )
              })}

              {/* Painted last so the species under inspection is never buried in the cluster. */}
              {selectedPoint !== null && selectedDatum !== null && (
                <Dots
                  data={[{ ...selectedDatum, emphasis: true }]}
                  radius={selectedPoint.band.radius}
                  fill={accent.base}
                  onHover={onHover}
                  onSelect={onSelect ? datum => onSelect(datum.key) : undefined}
                />
              )}
            </g>

            {/* Direct labels for the tail only, in lanes with leaders: the compressed low end
                cannot carry a label per mark without text overlapping text. */}
            <g data-pb-swarm-labels="">
              {labels.map(label => (
                <g key={label.key}>
                  <line
                    x1={num(label.x)}
                    x2={num(label.labelX)}
                    y1={num(label.y)}
                    y2={num(label.labelY) + 2}
                    stroke={chrome.axis}
                    strokeWidth={MARK.hairlineWidth}
                  />
                  <text
                    x={num(label.labelX)}
                    y={num(label.labelY)}
                    fill={ink.primary}
                    fontSize={10}
                    fontWeight={600}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {label.text}
                  </text>
                </g>
              ))}
            </g>
          </>
        )
      }}
    </ChartFrame>
  )
}

/** The one-line summary the panel header carries beside the chart. */
export const distributionSummaryLine = (model: DistributionModel): string =>
  model.speciesCount === 0
    ? 'No species rows'
    : `${formatCount(model.speciesCount)} species · median ` +
      `${formatPercentTerse(model.medianPct)} · ${formatCount(model.low.length)} below ` +
      `${formatPercentTerse(model.threshold, 0)}`
