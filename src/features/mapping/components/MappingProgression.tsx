import { useState } from 'react'
import {
  ChartFrame,
  ChartLegend,
  ChartTooltip,
  StackedBars,
  TableView,
  linearScale,
  bandScale,
} from '@/@panther.core/charts'
import type { AxisTick, LegendItem, PlotRect } from '@/@panther.core/charts'
import { EmptyState } from '@/@panther.core/components'
import type { DataColumn } from '@/@panther.core/components'
import { formatCount } from '@/app/format'
import { formatCompact, formatSigned } from '@/features/mapping/model'
import type { MappingView, StageRow } from '@/features/mapping/model'

/**
 * Cumulative assignment by mechanism, inside the total-sequence envelope.
 *
 * The envelope is the point of this chart. A normalised stack would hide the trimming and
 * de-duplication losses entirely - the total falls 2,297,097 to 2,291,508 across the fourteen
 * stages - so the total is drawn as a hairline outline and the assigned stack sits inside it. The
 * air between the fill and the outline is the unassigned remainder, which is how the assignment
 * rate becomes visible without a second axis.
 *
 * Colour is mechanism identity in the model's fixed slot order, so a segment keeps its colour at
 * every stage and a legend toggle cannot repaint the survivors.
 */
export interface MappingProgressionProps {
  view: MappingView
}

const MARGINS = { top: 12, right: 12, bottom: 24, left: 54 }
const PLOT_HEIGHT = 210

interface Hover {
  row: StageRow
  x: number
  y: number
}

export const MappingProgression = ({ view }: MappingProgressionProps) => {
  const [hover, setHover] = useState<Hover | null>(null)
  const [hidden, setHidden] = useState<string[]>([])

  const stages = view.stages
  const byId = new Map(stages.map(row => [row.id, row]))
  const finalStage = stages[stages.length - 1] ?? null

  const finalCumulative = (mechanism: string): number | null =>
    finalStage?.mechanisms.find(candidate => candidate.mechanism === mechanism)?.cumulative ?? null

  const legendItems: LegendItem[] = view.series.map(entry => ({
    key: entry.mechanism,
    label: entry.label,
    swatch: view.scale.fill(entry.mechanism),
    value: formatCount(finalCumulative(entry.mechanism)),
  }))

  // A band under half a percent of the envelope cannot be drawn at this height. Saying so is
  // better than letting a reader conclude the mechanism contributed nothing.
  const faintBands = view.series
    .map(entry => {
      const cumulative = finalCumulative(entry.mechanism)
      return cumulative === null || view.envelopeMax <= 0
        ? null
        : { label: entry.label, cumulative, share: (cumulative / view.envelopeMax) * 100 }
    })
    .filter(
      (entry): entry is { label: string; cumulative: number; share: number } =>
        entry !== null && entry.share < 0.5
    )
    .sort((a, b) => a.share - b.share)
  const faint = faintBands.length > 0 ? faintBands[0] : null

  const columns: readonly DataColumn<StageRow>[] = [
    { id: 'stage', header: 'Stage', kind: 'mono', render: row => row.stage },
    {
      id: 'total',
      header: 'Sequences at stage',
      kind: 'number',
      hint: 'Sequences still present at this stage: the envelope.',
      render: row => formatCount(row.totalSequences),
    },
    {
      id: 'assigned',
      header: 'Assigned to a family',
      kind: 'number',
      render: row => formatCount(row.assigned),
    },
    {
      id: 'unassigned',
      header: 'Unassigned',
      kind: 'number',
      render: row => formatCount(row.unassigned),
    },
    {
      id: 'pct',
      header: 'Assignment rate',
      kind: 'number',
      render: row => (row.pctAssigned === null ? '—' : `${row.pctAssigned.toFixed(1)} %`),
    },
    {
      id: 'families',
      header: 'Families',
      kind: 'number',
      render: row => formatCount(row.families),
    },
    ...view.series.map((entry): DataColumn<StageRow> => ({
      id: `mech-${entry.mechanism}`,
      header: `${entry.label} (cumulative)`,
      kind: 'number',
      hint: 'Running total for this mechanism at this stage, as the report stores it.',
      render: row =>
        formatCount(
          row.mechanisms.find(candidate => candidate.mechanism === entry.mechanism)?.cumulative ??
            null
        ),
    })),
  ]

  return (
    <ChartFrame
      title="Assignment by mechanism against the total-sequence envelope"
      description="One column per mapping stage. The hairline outline is the total sequence count at that stage; the filled stack is the sequences assigned to a family, split by the mechanism that assigned them. The gap between the two is the unassigned remainder."
      height={PLOT_HEIGHT}
      margins={MARGINS}
      minWidth={860}
      grid="y"
      axes="both"
      isEmpty={stages.length === 0}
      empty={
        <EmptyState
          title="No mapping stages in this report"
          description="The mapping section carries no stage rows, so there is no progression to draw. Nothing here is inferred from that absence."
        />
      }
      yTicks={plot => {
        const scale = linearScale([0, view.envelopeMax], [plot.y + plot.height, plot.y])
        return scale.ticks(5).map((tick, index, all): AxisTick => ({
          position: scale(tick),
          label: formatCompact(tick),
          emphasis: index === all.length - 1,
          noGrid: tick === 0,
        }))
      }}
      xTicks={plot => {
        const band = bandScale(
          stages.map(row => row.id),
          [plot.x, plot.x + plot.width]
        )
        return stages.map((row, index): AxisTick => ({
          position: band.center(row.id),
          label: row.label,
          emphasis: index === 0 || index === stages.length - 1,
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
          note="Figures are the cumulative total at the final stage. The exten stage's gain is booked to HMM scoring: this report has no separate extension mechanism, though the brief lists one."
        />
      }
      tableView={
        <TableView
          caption="Mapping stages: sequences, assignment and cumulative mechanism totals"
          columns={columns}
          rows={stages}
          rowKey={row => row.id}
          footNote="Mechanism columns are cumulative totals at that stage, not per-stage gains."
        />
      }
      footer={
        <span className="flex flex-wrap gap-x-2">
          <span>
            The outline is the envelope: it narrows by {formatCount(view.envelopeLoss)} sequences
            across the run, so trimming and de-duplication losses stay visible instead of being
            normalised away.
          </span>
          {faint !== null && (
            <span>
              {faint.label} accounts for {formatCount(faint.cumulative)} sequences, about{' '}
              {faint.share.toFixed(2)} % of the envelope, so its band is too thin to see at this
              scale. It is legible in the per-stage change chart and exact in the table view.
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
          title={hover === null ? undefined : hover.row.stage}
          rows={
            hover === null
              ? []
              : [
                  { label: 'Sequences at stage', value: formatCount(hover.row.totalSequences) },
                  {
                    label: 'Assigned to a family',
                    value: formatCount(hover.row.assigned),
                    emphasis: true,
                  },
                  { label: 'Unassigned', value: formatCount(hover.row.unassigned) },
                  {
                    label: 'Assignment rate',
                    value:
                      hover.row.pctAssigned === null
                        ? '—'
                        : `${hover.row.pctAssigned.toFixed(1)} %`,
                  },
                  { label: 'Families', value: formatCount(hover.row.families) },
                  ...hover.row.mechanisms
                    .filter(entry => entry.cumulative !== null)
                    .map(entry => ({
                      label: entry.label,
                      value: `${formatCount(entry.cumulative)} (${formatSigned(entry.delta)})`,
                      swatch: view.scale.fill(entry.mechanism),
                    })),
                ]
          }
          footer={
            hover?.row.isBaseline === true
              ? 'First stage: the mechanism figure is the opening balance, not a change.'
              : 'Mechanism figures are cumulative, with the change from the previous stage in brackets.'
          }
        />
      )}
    >
      {(plot: PlotRect) => {
        const band = bandScale(
          stages.map(row => row.id),
          [plot.x, plot.x + plot.width]
        )
        const value = linearScale([0, view.envelopeMax], [plot.y + plot.height, plot.y])

        return (
          <StackedBars
            data={stages.map(row => ({
              key: row.id,
              segments: row.mechanisms.map(entry => ({
                seriesKey: entry.mechanism,
                value: entry.cumulative,
              })),
            }))}
            plot={plot}
            band={band}
            value={value}
            series={view.seriesKeys}
            fillFor={key => view.scale.fill(key)}
            hidden={hidden}
            envelope={key => byId.get(key)?.totalSequences ?? null}
            onHover={(datum, _seriesKey, point) =>
              setHover(
                datum === null
                  ? null
                  : { row: byId.get(datum.key) as StageRow, x: point.x, y: point.y }
              )
            }
          />
        )
      }}
    </ChartFrame>
  )
}
