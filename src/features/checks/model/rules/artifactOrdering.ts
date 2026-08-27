/**
 * Completed artifacts that land out of declared order.
 *
 * The report declares a step order and the filesystem records mtimes; two of the fixture's steps
 * have artifacts older than the step declared before them. That is worth reporting and easy to
 * over-claim: artifact times are evidence of activity, not an execution log, so a pair may be
 * parallel execution rather than a stale artifact. The finding says both.
 *
 * Each pair carries the two goal names as `evidenceTokens`, which is what lets the runner drop the
 * derived finding for the pair the generator already warned about instead of reporting it twice.
 */

import { formatDuration } from '@/features/build/model'
import { passing, unevaluated, warned } from '../finding'
import { sectionTarget, stepTarget } from '../context'
import type { CheckFinding, CheckRule } from '../types'

const RULE_ID = 'timing.artifact-order'

export const artifactOrderingRule: CheckRule = {
  id: RULE_ID,
  label: 'Artifact ordering',
  category: 'timing',
  run: report => {
    const { outOfOrder, artifactOrder } = report.timing

    if (artifactOrder.length === 0) {
      return [
        unevaluated({
          id: RULE_ID,
          ruleId: RULE_ID,
          category: 'timing',
          label: 'Artifact ordering could not be checked',
          explanation:
            'No completed step in this report carries an artifact timestamp, so declared order ' +
            'cannot be compared with artifact order.',
          source: 'progress.phases[].steps[].mtime',
          reason: 'inputs-missing',
          ...sectionTarget(report, 'progress'),
        }),
      ]
    }

    if (outOfOrder.length === 0) {
      return [
        passing({
          id: RULE_ID,
          ruleId: RULE_ID,
          category: 'timing',
          label: 'Artifact times follow declared order',
          explanation:
            `All ${artifactOrder.length} timestamped artifacts land in the order the pipeline ` +
            'declares its steps, so nothing looks like a leftover from an earlier run.',
          source: 'declared step order against artifact mtime order',
          ...sectionTarget(report, 'progress'),
        }),
      ]
    }

    const findings: CheckFinding[] = outOfOrder.map(pair => {
      const target = stepTarget(report, pair.stepId) ?? sectionTarget(report, 'progress')
      const gap = formatDuration(Math.abs(pair.rawDeltaSeconds))
      return warned({
        id: `${RULE_ID}:${pair.stepId}`,
        ruleId: RULE_ID,
        category: 'timing',
        label: `Artifact out of declared order: ${pair.goal}`,
        explanation:
          `${pair.goal} has an artifact ${gap} OLDER than ${pair.previousGoal}, which is declared ` +
          'ahead of it. Either the artifact is a leftover from an earlier run, or the two steps ' +
          'ran concurrently and the declared order does not describe execution. Artifact times ' +
          'are activity evidence, not a runtime log, so this is a prompt to look rather than a ' +
          'failure.',
        source: `progress step mtime: ${pair.goal} vs ${pair.previousGoal}`,
        evidence: [
          `${pair.previousGoal} is declared first.`,
          `${pair.goal} is declared second but its artifact is ${gap} older.`,
        ],
        evidenceTokens: [pair.goal, pair.previousGoal],
        ...target,
      })
    })

    return findings
  },
}
