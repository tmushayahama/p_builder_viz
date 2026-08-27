/**
 * The six sequence counts, each named by its concept.
 *
 * This is a check on the PRESENTATION rather than on the data, and it earns its place because the
 * failure it guards against is a reader treating 2,297,097 and 1,736,983 as a contradiction. Both
 * are correct; they count different things. The check enumerates the six counts with their registry
 * labels so the terminology is on screen next to the numbers, and it fails if any of them has no
 * registered definition - which is the only way a screen could end up printing a bare "Sequences".
 */

import { METRIC_DEFINITIONS, metricLabel } from '@/features/build/model'
import type { MetricId } from '@/features/build/model'
import { passing, unevaluated, warned } from '../finding'
import { count, sectionTarget } from '../context'
import type { CheckRule } from '../types'

const RULE_ID = 'terminology.sequence-counts'

/**
 * Whether the registry actually holds a definition for this id. The record is typed as total, so
 * only an own-property test can catch a metric that reaches the UI with no label behind it.
 */
function isRegistered(id: MetricId): boolean {
  return Object.hasOwn(METRIC_DEFINITIONS, id)
}

export const sequenceTerminologyRule: CheckRule = {
  id: RULE_ID,
  label: 'Sequence terminology',
  category: 'terminology',
  run: report => {
    const counts = report.consistency.sequenceCounts
    const present = counts.filter(entry => entry.value !== null)
    const unregistered = counts.filter(entry => !isRegistered(entry.metricId))

    const evidence = counts.map(
      entry =>
        `${isRegistered(entry.metricId) ? metricLabel(entry.metricId) : entry.metricId}: ` +
        `${count(entry.value)} (${entry.source})`
    )

    const target = sectionTarget(report, 'mapping')
    const seed = {
      id: RULE_ID,
      ruleId: RULE_ID,
      category: 'terminology' as const,
      label: 'Sequence counts are named by concept',
      explanation: '',
      source: 'the metric definitions registry against every sequence count in the report',
      evidence,
      ...target,
    }

    if (present.length < 2) {
      return [
        unevaluated({
          ...seed,
          label: 'Sequence terminology could not be checked',
          explanation:
            'This report carries fewer than two sequence counts, so there is no ambiguity to ' +
            'resolve.',
          reason: 'not-applicable',
        }),
      ]
    }

    if (unregistered.length > 0) {
      return [
        warned({
          ...seed,
          label: 'A sequence count has no registered definition',
          explanation:
            `${unregistered.map(entry => entry.metricId).join(', ')} would be rendered without a ` +
            'concept label, which is how two legitimately different counts end up both reading ' +
            '"Sequences".',
        }),
      ]
    }

    const distinct = new Set(present.map(entry => entry.value)).size

    return [
      passing({
        ...seed,
        label: `${present.length} sequence counts, ${distinct} distinct values`,
        explanation:
          `This report carries ${present.length} counts that all reduce to the word "sequences", ` +
          `and ${distinct === present.length ? 'every one of them is' : `${distinct} of them are`} ` +
          'a different number. Each is labelled with its concept from the metric definitions ' +
          'registry, so the differences read as different measurements rather than as ' +
          'contradictions.',
      }),
    ]
  },
}
