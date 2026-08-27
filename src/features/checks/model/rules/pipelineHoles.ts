/**
 * Incomplete work behind the frontier.
 *
 * Recorded as an observation, not an issue. The distinction matters: a hole is a phase that never
 * finished even though later phases did, which is a different condition from the build having
 * stopped, and the pipeline spine states it in full. Counting it here as well would double-report
 * the single most consequential reading in the product.
 */

import { plural } from '@/app/format'
import { noted, passing } from '../finding'
import { phaseTarget } from '../context'
import type { CheckFinding, CheckRule } from '../types'

const RULE_ID = 'pipeline.holes'

export const pipelineHolesRule: CheckRule = {
  id: RULE_ID,
  label: 'Incomplete work behind the frontier',
  category: 'pipeline',
  run: report => {
    const { holes, phases, frontierIndex } = report.pipeline
    if (frontierIndex === null) return []

    if (holes.length === 0) {
      return [
        passing({
          id: RULE_ID,
          ruleId: RULE_ID,
          category: 'pipeline',
          label: 'Nothing incomplete behind the frontier',
          explanation:
            `Every phase before ${phases[frontierIndex]?.name ?? 'the frontier'} finished every ` +
            'step it declares, so there are no holes to account for.',
          source: 'progress.phases[].steps[].status',
          ...phaseTarget(report, phases[frontierIndex]?.id ?? ''),
        }),
      ]
    }

    const findings: CheckFinding[] = holes.map(hole => {
      const later = phases.filter(
        phase => phase.index > hole.index && phase.status === 'complete'
      ).length
      const incomplete = hole.steps.filter(step => !step.isComplete)
      return noted({
        id: `${RULE_ID}:${hole.id}`,
        ruleId: RULE_ID,
        category: 'pipeline',
        label: `Hole behind the frontier: ${hole.name}`,
        explanation:
          `${hole.completedSteps} of ${hole.totalSteps} steps are done and ` +
          `${incomplete.map(step => step.goal).join(', ')} ` +
          `${plural(incomplete.length, 'remains', 'remain')}, while ${later} later ` +
          `${plural(later, 'phase')} completed. This is a hole, not where the build stopped, so ` +
          'it is recorded here as an observation rather than counted as an issue.',
        source: `progress.phases[${hole.index}].steps[].status`,
        evidence: incomplete.map(step => `${step.goal}: ${step.status.label}`),
        ...phaseTarget(report, hole.id),
      })
    })

    return findings
  },
}
