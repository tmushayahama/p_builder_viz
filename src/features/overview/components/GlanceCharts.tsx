import { useMemo } from 'react'
import {
  Bars,
  ChartFrame,
  ChartLegend,
  Sparkline,
  StackedBars,
  TableView,
  bandScale,
  linearScale,
} from '@/@panther.core/charts'
import { Panel, PanelGrid } from '@/@panther.core/components'
import { createCategoricalScale } from '@/@panther.core/theme/tokens'
import { formatCount } from '@/app/format'
import { useBuildReport } from '@/features/build/hooks'

/**
 * The shape of the build, before a reader opens anything.
 *
 * The record opened entirely as text and tables, so how assignment climbs, what did the assigning
 * and how lopsided node coverage is were reachable only by reading columns of figures and comparing
 * them mentally. These are the same numbers the report views carry in full; the point is that the
 * shape is visible without navigating first.
 *
 * Drawn on the app's own chart chassis rather than a charting library. That was briefly the other
 * way round: `@mantine/charts` rendered these three and cost 433 kB (211 kB gzipped) to do it,
 * while the report views stayed hand-rolled because the library could not express what they do - a
 * beeswarm on a log axis over the shortfall, a stacked bar with the total drawn as an envelope
 * outline, a Gantt over artifact times. Paying that much to maintain two chart systems, for the
 * three simplest charts in the app, was the wrong trade. `d3-scale` now does the arithmetic under
 * the chassis, which is the part a dependency was actually worth having for.
 */

/** One decimal, matching how every other percentage in the record reads. */
const asPercent = (value: number) => `${value.toFixed(1)}%`

export const GlanceCharts = () => {
  const report = useBuildReport()
  const { mapping, nodeTracking } = report

  const assignment = useMemo(
    () => mapping.stages.map(stage => stage.recomputedPctAssigned),
    [mapping.stages]
  )
  const firstPct = assignment.find(value => value !== null) ?? null
  const lastPct = [...assignment].reverse().find(value => value !== null) ?? null

  // Composition at the final stage. Cumulative, not delta: this asks what did the assigning, not
  // what changed. One bar rather than a donut - four shares compare more easily along a common
  // baseline than as arcs, and the largest here is 84 %, which a donut draws as a near-circle.
  const composition = useMemo(() => {
    const finalStage = mapping.stages.at(-1)
    if (finalStage === undefined) return null
    const order = mapping.mechanismOrder.map(slot => slot.mechanism)
    const scale = createCategoricalScale(order)
    const segments = finalStage.byMechanism
      .filter(entry => (entry.cumulative ?? 0) > 0)
      .map(entry => ({ seriesKey: entry.mechanism, value: entry.cumulative }))
    const labelFor = (mechanism: string) =>
      mapping.mechanismOrder.find(slot => slot.mechanism === mechanism)?.label ?? mechanism
    const total = segments.reduce((sum, segment) => sum + (segment.value ?? 0), 0)
    return { order, scale, segments, labelFor, total }
  }, [mapping.stages, mapping.mechanismOrder])

  const byType = useMemo(
    () =>
      nodeTracking.byType
        .filter(row => row.recomputedPct !== null)
        .map(row => ({ key: row.nodeType, value: row.recomputedPct })),
    [nodeTracking.byType]
  )

  const hasAnything =
    assignment.some(value => value !== null) ||
    (composition?.segments.length ?? 0) > 0 ||
    byType.length > 0
  if (!hasAnything) return null

  return (
    <PanelGrid minColumnWidth={300}>
      <Panel
        title="Sequence assignment"
        subtitle="across the mapping stages"
        availability={mapping.availability}
        message={mapping.message ?? undefined}
        missingSubject="Mapping statistics"
        density="tight"
        provenance="derived"
      >
        {/* A sparkline, not a plotted chart: the shape is the point at this size, and the two
            figures that matter are stated in text beside it rather than read off an axis. The
            full stage chart is one click away under Sequence-to-family mapping. */}
        <div className="flex items-center gap-3">
          <Sparkline
            values={assignment}
            ariaLabel={`Assignment rate across ${assignment.length} mapping stages`}
            valueLabel={
              <span className="pb-figures text-ink text-lede font-semibold">
                {lastPct === null ? '—' : asPercent(lastPct)}
              </span>
            }
            width={120}
            height={34}
          />
          <span className="text-ink-muted text-2xs">
            {firstPct === null || lastPct === null
              ? 'assignment rate'
              : `${asPercent(firstPct)} → ${asPercent(lastPct)} across the run`}
          </span>
        </div>
      </Panel>

      <Panel
        title="Assignment mechanism"
        subtitle="at the final mapping stage"
        availability={mapping.availability}
        message={mapping.message ?? undefined}
        missingSubject="Mapping statistics"
        density="tight"
        provenance="derived"
      >
        {composition !== null && composition.segments.length > 0 && (
          <ChartFrame
            title="Assignment mechanism at the final mapping stage"
            description="Share of assigned sequences credited to each mechanism."
            height={38}
            margins={{ top: 2, right: 2, bottom: 2, left: 2 }}
            grid="none"
            axes="none"
            legend={
              <ChartLegend
                items={composition.order
                  .filter(mechanism =>
                    composition.segments.some(segment => segment.seriesKey === mechanism)
                  )
                  .map(mechanism => ({
                    key: mechanism,
                    label: composition.labelFor(mechanism),
                    swatch: composition.scale.fill(mechanism),
                    value: formatCount(
                      composition.segments.find(segment => segment.seriesKey === mechanism)
                        ?.value ?? 0
                    ),
                  }))}
              />
            }
            tableView={
              <TableView
                caption="Sequences credited to each mechanism at the final mapping stage"
                rowKey={row => row.mechanism}
                columns={[
                  { id: 'mechanism', header: 'Mechanism', render: row => row.mechanism },
                  {
                    id: 'sequences',
                    header: 'Sequences',
                    align: 'right',
                    render: row => row.sequences,
                  },
                ]}
                rows={composition.segments.map(segment => ({
                  mechanism: composition.labelFor(segment.seriesKey),
                  sequences: formatCount(segment.value ?? 0),
                }))}
              />
            }
          >
            {plot => (
              <StackedBars
                data={[{ key: 'final', segments: composition.segments }]}
                plot={plot}
                band={bandScale(['final'], [plot.y, plot.y + plot.height], { padding: 0 })}
                value={linearScale([0, composition.total], [plot.x, plot.x + plot.width])}
                series={composition.order}
                fillFor={composition.scale.fill}
                orientation="horizontal"
                maxThickness={26}
              />
            )}
          </ChartFrame>
        )}
      </Panel>

      <Panel
        title="Node forward tracking"
        subtitle="mapped forward, by node type"
        availability={nodeTracking.availability}
        message={nodeTracking.message ?? undefined}
        missingSubject="Node forward tracking"
        density="tight"
        provenance="derived"
      >
        {byType.length > 0 && (
          <ChartFrame
            title="Node forward tracking by node type"
            description="Share of each node type mapped forward from the previous library."
            height={112}
            margins={{ top: 4, right: 44, bottom: 4, left: 96 }}
            grid="none"
            axes="none"
            // Without these the bars are five unlabelled lengths. The band label is the
            // category, so it is the axis, not decoration.
            yTicks={plot => {
              const band = bandScale(
                byType.map(row => row.key),
                [plot.y, plot.y + plot.height]
              )
              return byType.map(row => ({
                position: band.center(row.key),
                label: row.key,
              }))
            }}
            tableView={
              <TableView
                caption="Share of each node type mapped forward"
                rowKey={row => row.type}
                columns={[
                  { id: 'type', header: 'Node type', render: row => row.type },
                  { id: 'pct', header: 'Mapped forward', align: 'right', render: row => row.pct },
                ]}
                rows={byType.map(row => ({
                  type: row.key,
                  pct: row.value === null ? '—' : asPercent(row.value),
                }))}
              />
            }
          >
            {plot => (
              <Bars
                data={byType}
                plot={plot}
                band={bandScale(
                  byType.map(row => row.key),
                  [plot.y, plot.y + plot.height]
                )}
                value={linearScale([0, 100], [plot.x, plot.x + plot.width])}
                orientation="horizontal"
                maxThickness={12}
                labelKeys={byType.map(row => row.key)}
                formatValue={asPercent}
              />
            )}
          </ChartFrame>
        )}
      </Panel>
    </PanelGrid>
  )
}

export default GlanceCharts
