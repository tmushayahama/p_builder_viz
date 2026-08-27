import { metricLabel } from '@/features/build/model'
import type { MetricId } from '@/features/build/model'
import { useChecksForMetric } from '@/features/checks/hooks'
import { InlineCheckMarker } from '@/features/checks/components/InlineCheckMarker'

/**
 * The findings about one metric, beside the figure.
 *
 * The third of the in-context placements the brief asks for, after the phase node and the
 * configuration value. It is what lets the node-forward-tracking rate carry its own UNKNOWN-type
 * warning where a reader meets the number, rather than only in a panel further down the page.
 *
 * The subject is taken from the metric definitions registry, so the accessible name says
 * "Sequences in the built library" and never "librarySequences".
 */
export interface MetricCheckMarkerProps {
  metricId: MetricId
  className?: string
}

export const MetricCheckMarker = ({ metricId, className }: MetricCheckMarkerProps) => {
  const findings = useChecksForMetric(metricId)
  return (
    <InlineCheckMarker findings={findings} subject={metricLabel(metricId)} className={className} />
  )
}
