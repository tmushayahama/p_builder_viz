import {
  DeltaValue,
  MetricValue,
  SectionHeading,
  useMetricDefinition,
} from '@/@panther.core/components'
import type { MetricDefinition } from '@/@panther.core/components'
import type { ComparisonMetric } from '@/features/build/model'
import type { ComparisonView } from '@/features/comparison/model'

/**
 * The release-level totals: sequences, families, subfamilies, genomes.
 *
 * Two things this layout has to get right.
 *
 * The two sides of a comparison are often DIFFERENT CONCEPTS. The previous figure for input
 * sequences is `prev_lib_sequences` (2,692,827 reference/input sequences) while the current figure
 * is this build's reference-proteome input (2,297,097); labelling both "Sequences" is the defect
 * acceptance question 5 is about, so each side takes its own registry definition and the model
 * carries a separate `previousMetricId` for exactly this reason.
 *
 * And a missing previous side must not look like a broken row. `prev_lib` is absent here, so four
 * of the five comparisons have no previous figure at all - including subfamilies, where the report
 * carries no previous count anywhere. Each row therefore still shows the current value and states
 * why the other half is missing, instead of collapsing to an empty card.
 */
export interface ComparisonOverviewProps {
  view: ComparisonView
  previousLibraryLabel: string | null
}

interface MetricRowProps {
  metric: ComparisonMetric
  previousLibraryLabel: string | null
}

const MetricRow = ({ metric, previousLibraryLabel }: MetricRowProps) => {
  const previousRegistered = useMetricDefinition(metric.previousMetricId)
  const sameConcept = metric.previousMetricId === metric.metricId

  // When both sides measure the same concept the registry label would read identically twice, so
  // the previous side is named by the release instead. When they differ - the input-sequence row -
  // the registry label is exactly what has to show.
  const previousDefinition: MetricDefinition | undefined =
    sameConcept && previousRegistered !== null
      ? {
          ...previousRegistered,
          label: previousLibraryLabel === null ? 'Previous library' : previousLibraryLabel,
        }
      : undefined

  const absentReason =
    metric.previousSource === null
      ? 'not in this report'
      : `not reported by ${metric.previousSource}`

  return (
    <div className="pb-hairline-b space-y-0.5 py-1.5">
      <MetricValue
        metricId={metric.metricId}
        value={metric.current}
        layout="row"
        provenance="generator"
        absentReason="not reported"
      />
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <MetricValue
          metricId={metric.previousMetricId}
          definition={previousDefinition}
          value={metric.previous}
          layout="row"
          absentReason={absentReason}
        />
        <DeltaValue
          value={metric.delta}
          absentReason="no previous figure to compare"
          compareLabel={
            metric.previous === null
              ? undefined
              : (previousLibraryLabel ?? 'the previous library') + ' → this build'
          }
        />
        {metric.percentChange !== null && (
          <DeltaValue value={metric.percentChange} kind="percent" />
        )}
      </div>
    </div>
  )
}

export const ComparisonOverview = ({ view, previousLibraryLabel }: ComparisonOverviewProps) => (
  <div className="space-y-2">
    <SectionHeading
      level={4}
      count={`${view.metricsWithPrevious} of ${view.metrics.length} comparable`}
      description="Each row shows this build's figure and, where the report carries one, the previous release's. The two sides are not always the same concept: hover a label for its definition."
    >
      Release totals
    </SectionHeading>

    <div className="gap-x-gutter grid grid-cols-1 lg:grid-cols-2">
      {view.metrics.map(metric => (
        <MetricRow
          key={`${metric.metricId}-${metric.previousMetricId}`}
          metric={metric}
          previousLibraryLabel={previousLibraryLabel}
        />
      ))}
    </div>

    <div>
      <p className="text-ink-muted text-2xs mb-0.5 font-semibold uppercase">Species denominators</p>
      <div className="flex flex-wrap gap-x-6 gap-y-1.5">
        {view.denominators.map(entry => (
          <MetricValue
            key={entry.metricId}
            metricId={entry.metricId}
            value={entry.value}
            layout="stack"
            absentReason="not reported"
          />
        ))}
      </div>
      <p className="text-ink-faint text-2xs mt-0.5">
        These differ legitimately from the genome count above
        {view.libraryGenomes === null ? '' : ` (${view.libraryGenomes.toLocaleString()})`}: the
        comparison table counts species appearing in either release, so it exceeds the number of
        genomes this library actually holds.
      </p>
    </div>
  </div>
)
