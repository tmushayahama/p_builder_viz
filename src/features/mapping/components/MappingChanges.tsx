import { useState } from 'react'
import {
  ChartFrame,
  ChartLegend,
  ChartTooltip,
  TableView,
  bandScale,
  linearScale,
  num,
} from '@/@panther.core/charts'
import type { AxisTick, LegendItem, PlotRect } from '@/@panther.core/charts'
import { EmptyState } from '@/@panther.core/components'
import type { DataColumn } from '@/@panther.core/components'
import { chrome, MARK } from '@/@panther.core/theme/tokens'
import { formatCount } from '@/app/format'
import { DeltaStack } from '@/features/mapping/components/DeltaStack'
import { deltaAxisTicks, formatCompact, formatSigned } from '@/features/mapping/model'
import type { MappingView, StageRow } from '@/features/mapping/model'

/**
 * Per-stage change in assignment, by the mechanism the change is booked to.
 *
 * This is the chart that answers "what changed". The cumulative view above is dominated by the
 * flat `ID` band, so the movements that matter - `hmm` +182,097, `blast` +84,440, `exten` +9,887,
 * `pass1_trim` -4,030 - are invisible there and obvious here.
 *
 * The first stage is excluded on purpose: it has no predecessor, so its mechanism figure is an
 * opening balance of 1,536,527 rather than a change, and including it would set the domain an
 * order of magnitude too wide. The baseline is stated in the footer instead.
 *
 * There is no cumulative line on this chart. The cumulative series runs 1.54 M-1.81 M against a
 * delta domain of -4 K to +182 K, so drawing both would need a second axis, and a dual-axis chart
 * invites a comparison the axes do not support. The chart above carries the cumulative reading.
 */
export interface MappingChangesProps {
  view: MappingView
}

const MARGINS = { top: 16, right: 12, bottom: 24, left: 54 }
const PLOT_HEIGHT = 180

interface Hover {
  row: StageRow
  x: number
  y: number
}

export const MappingChanges = ({ view }: MappingChangesProps) => {
  const [hover, setHover] = useState<Hover | null>(null)
  const [hidden, setHidden] = useState<string[]>([])

  const stages = view.deltaStages
  const byId = new Map(stages.map(row => [row.id, row]))
  const baseline = view.stages[0] ?? null

  const legendItems: LegendItem[] = view.series.map(entry => ({
    key: entry.mechanism,
    label: entry.label,
    swatch: view.scale.fill(entry.mechanism),
  }))

  const columns: readonly DataColumn<StageRow>[] = [
    { id: 'stage', header: 'Stage', kind: 'mono', render: row => row.stage },
    {
      id: 'assigned',
      header: 'Change in assigned',
      kind: 'number',
      render: row => formatSigned(row.assignedDelta),
    },
    ...view.series.map((entry): DataColumn<StageRow> => ({
      id: `mech-${entry.mechanism}`,
      header: entry.label,
      kind: 'number',
      hint: 'Change from the previous stage that reported this mechanism.',
      render: row =>
        formatSigned(
          row.mechanisms.find(candidate => candidate.mechanism === entry.mechanism)?.delta ?? null
        ),
    })),
    {
      id: 'envelope',
      header: 'Change in sequences at stage',
      kind: 'number',
      hint: 'Movement of the envelope: trimming, de-duplication and single-genome removal.',
      render: row => formatSigned(row.totalSequencesDelta),
    },
    {
      id: 'families',
      header: 'Change in families',
      kind: 'number',
      render: row => formatSigned(row.familiesDelta),
    },
  ]

  return (
    <ChartFrame
      title="Per-stage change in assigned sequences, by mechanism"
      description="One column per mapping stage after the first. Gains stack upward from zero and losses stack downward, coloured by the mechanism the change is booked to."
      height={PLOT_HEIGHT}
      margins={MARGINS}
      minWidth={860}
      grid="y"
      // The zero line is inside the plot whenever there are losses, so it is drawn with the marks
      // rather than taken from the frame's bottom edge - a baseline in the wrong place would read
      // as though every loss bar started from zero.
      axes="y"
      isEmpty={stages.length === 0 || !view.hasChange}
      empty={
        <EmptyState
          title="No stage has changed the assigned count yet"
          description="Every stage in this report reports the same assignment as the stage before it, so there is no per-stage change to draw."
        />
      }
      yTicks={plot => {
        const scale = linearScale(view.deltaDomain, [plot.y + plot.height, plot.y])
        return deltaAxisTicks(view.deltaDomain).map((tick): AxisTick => ({
          position: scale(tick),
          label: formatCompact(tick),
          emphasis: tick === 0,
          noGrid: tick === 0,
        }))
      }}
      xTicks={plot => {
        const band = bandScale(
          stages.map(row => row.id),
          [plot.x, plot.x + plot.width]
        )
        return stages.map((row): AxisTick => ({
          position: band.center(row.id),
          label: row.label,
          emphasis: view.emphasisStageIds.includes(row.id),
        }))
      }}
      legend={
        <ChartLegend
          items={legendItems}
          hidden={hidden}
          onToggle={key =>
            setHidden(current =>
              current.includes(key) ? current.filter(entry => entry !== key) : [...current, key]
            )
          }
          note="Colour is the mechanism, in the same slot order as the chart above. Direction is read from the zero line and the sign, never from the colour."
        />
      }
      tableView={
        <TableView
          caption="Per-stage change in assignment, mechanism totals and the envelope"
          columns={columns}
          rows={stages}
          rowKey={row => row.id}
          footNote="Changes are measured against the previous stage. The first stage is omitted: it has no predecessor."
        />
      }
      footer={
        <span className="flex flex-wrap gap-x-2">
          {baseline !== null && (
            <span>
              The first stage ({baseline.stage}) is omitted: with no previous stage its{' '}
              {formatCount(baseline.assigned)} assignments are the opening balance, not a change.
            </span>
          )}
          <span>
            Only the three largest gains carry a direct label; the largest loss is called out below.
            Every figure is exact in the table view and on hover.
          </span>
        </span>
      }
      overlay={plot => (
        <ChartTooltip
          x={hover?.x ?? 0}
          y={hover?.y ?? 0}
          bounds={plot}
          visible={hover !== null}
          title={hover === null ? undefined : hover.row.stage}
          rows={
            hover === null
              ? []
              : [
                  {
                    label: 'Change in assigned',
                    value: formatSigned(hover.row.assignedDelta),
                    emphasis: true,
                  },
                  ...hover.row.mechanisms
                    .filter(entry => entry.delta !== null && entry.delta !== 0)
                    .map(entry => ({
                      label: entry.label,
                      value: formatSigned(entry.delta),
                      swatch: view.scale.fill(entry.mechanism),
                    })),
                  {
                    label: 'Change in sequences at stage',
                    value: formatSigned(hover.row.totalSequencesDelta),
                  },
                  { label: 'Change in families', value: formatSigned(hover.row.familiesDelta) },
                  {
                    label: 'Assignment rate here',
                    value:
                      hover.row.pctAssigned === null
                        ? '—'
                        : `${hover.row.pctAssigned.toFixed(1)} %`,
                  },
                ]
          }
          footer="Change is measured against the previous stage that reported the mechanism."
        />
      )}
    >
      {(plot: PlotRect) => {
        const band = bandScale(
          stages.map(row => row.id),
          [plot.x, plot.x + plot.width]
        )
        const value = linearScale(view.deltaDomain, [plot.y + plot.height, plot.y])
        const zeroY = num(value(0))

        return (
          <>
            <line
              x1={plot.x}
              x2={plot.x + plot.width}
              y1={zeroY}
              y2={zeroY}
              stroke={chrome.axis}
              strokeWidth={MARK.hairlineWidth}
              shapeRendering="crispEdges"
            />
            <DeltaStack
              data={stages.map(row => ({
                key: row.id,
                segments: row.mechanisms.map(entry => ({
                  seriesKey: entry.mechanism,
                  value: entry.delta,
                })),
                label: formatSigned(row.assignedDelta),
              }))}
              plot={plot}
              band={band}
              value={value}
              series={view.seriesKeys}
              fillFor={key => view.scale.fill(key)}
              hidden={hidden}
              labelKeys={view.labelledStageIds}
              onHover={(datum, point) =>
                setHover(
                  datum === null
                    ? null
                    : { row: byId.get(datum.key) as StageRow, x: point.x, y: point.y }
                )
              }
            />
          </>
        )
      }}
    </ChartFrame>
  )
}
