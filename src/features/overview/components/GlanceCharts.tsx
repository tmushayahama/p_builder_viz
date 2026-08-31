import { useMemo } from 'react'
import { AreaChart, BarChart, DonutChart } from '@mantine/charts'
import { Panel, PanelGrid } from '@/@panther.core/components'
import { formatCount } from '@/app/format'
import { useBuildReport } from '@/features/build/hooks'
import { seriesFill } from '@/@panther.core/theme/tokens'
import type { SeriesSlot } from '@/@panther.core/theme/tokens'

/**
 * The three numbers a reviewer wants before reading anything.
 *
 * The record opened entirely as text and tables, which meant the shape of the build - how
 * assignment climbs, how lopsided node coverage is by type, what actually did the assigning - was
 * only reachable by reading a column of figures and comparing them mentally. These are the same
 * numbers the report views carry; the point is that they are visible without navigating.
 *
 * Charts come from `@mantine/charts`, which is Recharts underneath and inherits Mantine's theming,
 * so the colour scheme flips without a second definition. Colours are still passed as `var(--pb-*)`
 * references rather than Mantine colour names, so the token layer stays the only place a literal
 * lives.
 */
/** One decimal, matching how every other percentage in the record reads. */
const asPercent = (value: number) => `${value.toFixed(1)}%`

export const GlanceCharts = () => {
  const report = useBuildReport()
  const { mapping, nodeTracking } = report

  // Assignment across the mapping stages. One series, so no legend: the panel title names it.
  const assignment = useMemo(
    () =>
      mapping.stages
        .filter(stage => stage.recomputedPctAssigned !== null)
        .map(stage => ({
          stage: stage.stage,
          assigned: stage.recomputedPctAssigned,
        })),
    [mapping.stages]
  )

  // What did the assigning, at the final stage. Cumulative rather than delta: this is a
  // composition question, not a change question.
  const composition = useMemo(() => {
    const finalStage = mapping.stages.at(-1)
    if (finalStage === undefined) return []
    return finalStage.byMechanism
      .filter(entry => entry.cumulative !== null && entry.cumulative > 0)
      .map(entry => {
        const slot = mapping.mechanismOrder.find(item => item.mechanism === entry.mechanism)
        return {
          name: slot?.label ?? entry.mechanism,
          value: entry.cumulative ?? 0,
          color: seriesFill((Math.min(entry.slot, 5) + 1) as SeriesSlot),
        }
      })
  }, [mapping.stages, mapping.mechanismOrder])

  // Node forward tracking by type. Nominal categories, so every bar takes the same hue - the
  // length is the variable, and colouring by value would spend the identity channel on it twice.
  const byType = useMemo(
    () =>
      nodeTracking.byType
        .filter(row => row.recomputedPct !== null)
        .map(row => ({ type: row.nodeType, pct: row.recomputedPct })),
    [nodeTracking.byType]
  )

  const hasAnything = assignment.length > 0 || composition.length > 0 || byType.length > 0
  if (!hasAnything) return null

  return (
    <PanelGrid minColumnWidth={300}>
      <Panel
        title="Sequence assignment"
        subtitle="share assigned across the mapping stages"
        availability={mapping.availability}
        message={mapping.message ?? undefined}
        missingSubject="Mapping statistics"
        density="tight"
        provenance="derived"
      >
        {assignment.length > 0 && (
          <AreaChart
            h={150}
            data={assignment}
            dataKey="stage"
            series={[{ name: 'assigned', label: 'Assigned', color: seriesFill(1) }]}
            curveType="step"
            withDots={false}
            withXAxis={false}
            withLegend={false}
            gridAxis="y"
            yAxisProps={{ domain: [60, 85], width: 34 }}
            valueFormatter={asPercent}
            fillOpacity={0.18}
          />
        )}
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
        {composition.length > 0 && (
          <div className="flex items-center gap-3">
            <DonutChart
              h={150}
              data={composition}
              withLabels={false}
              withTooltip
              thickness={18}
              paddingAngle={2}
              tooltipDataSource="segment"
              valueFormatter={value => formatCount(value)}
            />
            {/* A legend, not a tooltip. Four segments with no key is unreadable without
                hovering, and a hover is not a way to read a value - it is a way to confirm
                one you can already see. The counts sit here too, so the panel carries the
                numbers as well as the shape. */}
            <ul className="min-w-0 flex-1 list-none space-y-1 p-0">
              {composition.map(entry => (
                <li key={entry.name} className="flex items-baseline gap-1.5">
                  <span
                    aria-hidden="true"
                    className="mt-px size-2 shrink-0 rounded-[1px]"
                    style={{ background: entry.color }}
                  />
                  <span className="text-ink text-2xs min-w-0 flex-1 truncate">{entry.name}</span>
                  <span className="pb-figures text-ink-muted text-2xs">
                    {formatCount(entry.value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
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
          <BarChart
            h={150}
            data={byType}
            dataKey="type"
            orientation="vertical"
            series={[{ name: 'pct', label: 'Mapped', color: seriesFill(1) }]}
            withLegend={false}
            gridAxis="none"
            xAxisProps={{ domain: [0, 100], hide: true }}
            yAxisProps={{ width: 96 }}
            valueFormatter={asPercent}
            withBarValueLabel
            barProps={{ radius: 2 }}
          />
        )}
      </Panel>
    </PanelGrid>
  )
}

export default GlanceCharts
