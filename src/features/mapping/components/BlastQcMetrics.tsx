import { MetricValue, Panel } from '@/@panther.core/components'
import type { BuildReport, MetricId } from '@/features/build/model'

/**
 * The BLAST length-consistency check, which lives in `other_reports` but describes mapping.
 *
 * It is here rather than in the release comparison because that is what the section binding says:
 * `other_reports` contributes to sequence-to-family mapping for exactly these four metrics. Showing
 * them under mapping is the cheapest demonstration that a report section can serve more than one
 * phase without being duplicated, and it keeps a figure a reviewer would look for beside the
 * numbers it qualifies.
 */
export interface BlastQcMetricsProps {
  report: BuildReport
}

const METRICS: readonly { metricId: MetricId; key: string; digits: number }[] = [
  { metricId: 'blastSequencesChecked', key: 'blast_sequences_checked', digits: 0 },
  { metricId: 'blastLengthsCompared', key: 'blast_lengths_compared', digits: 0 },
  { metricId: 'blastLengthRatioOutliers', key: 'blast_length_ratio_outliers', digits: 0 },
  { metricId: 'blastAvgLenQuotient', key: 'blast_avg_len_quotient', digits: 4 },
]

export const BlastQcMetrics = ({ report }: BlastQcMetricsProps) => {
  const source = report.otherReports
  const present = METRICS.filter(entry => source.values[entry.key] !== undefined)
  if (present.length === 0) return null

  return (
    <Panel
      title="BLAST length-consistency check"
      subtitle={source.sectionId ?? 'other_reports'}
      availability={source.availability}
      message={source.message ?? undefined}
      missingSubject="BLAST length-consistency check"
      provenance="generator"
      density="tight"
      footer="Reported in other_reports; shown here because it qualifies the BLAST assignments above."
    >
      <div className="flex flex-wrap gap-x-6 gap-y-1.5">
        {present.map(entry => (
          <MetricValue
            key={entry.metricId}
            metricId={entry.metricId}
            value={source.values[entry.key] ?? null}
            layout="stack"
            format={
              entry.digits === 0
                ? undefined
                : value =>
                    value.toLocaleString(undefined, {
                      minimumFractionDigits: entry.digits,
                      maximumFractionDigits: entry.digits,
                    })
            }
            absentReason="not reported"
          />
        ))}
      </div>
    </Panel>
  )
}
