/**
 * Reading the checks from a component.
 *
 * The runner is memoised on the report object, so these are lookups rather than computations: the
 * panel, a marker on each of fourteen phase nodes and a marker beside each configuration value all
 * read one run.
 */

import { useMemo } from 'react'
import { useBuildReport } from '@/features/build/hooks'
import { reportAnchor } from '@/features/build/model'
import type { MetricId } from '@/features/build/model'
import { runChecksCached } from '@/features/checks/model'
import type { CheckFinding, CheckRunResult } from '@/features/checks/model'

export function useChecks(): CheckRunResult {
  const report = useBuildReport()
  return runChecksCached(report)
}

/** Findings anchored to one phase, for the spine's per-phase marker. */
export function useChecksForPhase(phaseId: string): CheckFinding[] {
  const { byPhaseId } = useChecks()
  return byPhaseId[phaseId] ?? []
}

/** Findings about one configuration key, for a marker beside the value itself. */
export function useChecksForConfigKey(configKey: string): CheckFinding[] {
  const { byConfigKey } = useChecks()
  return byConfigKey[configKey] ?? []
}

/** Findings about one metric, for a marker beside the figure. */
export function useChecksForMetric(metricId: MetricId): CheckFinding[] {
  const { checks } = useChecks()
  return useMemo(() => checks.filter(finding => finding.metricId === metricId), [checks, metricId])
}

/** Findings anchored to one report section, so a report view can show its own checks in context. */
export function useChecksForSection(sectionId: string): CheckFinding[] {
  const { checks } = useChecks()
  return useMemo(() => {
    const anchor = reportAnchor(sectionId)
    return checks.filter(finding => finding.anchor === anchor)
  }, [checks, sectionId])
}
