/**
 * Node forward tracking by node type.
 *
 * The overall rate is 93.5 %, which hides the finding: the UNKNOWN node type mapped 0 of 362
 * nodes. Every other type is above 84 %, so this is a category with no forward mapping at all
 * rather than a degraded one, and 362 nodes are too few to move the headline. A check on the
 * headline alone would never see it.
 */

import { passing, unevaluated, warned } from '../finding'
import { count, sectionTarget } from '../context'
import { percentOf, roundTo } from '@/features/build/model'
import type { CheckRule } from '../types'

const RULE_ID = 'nodes.type-coverage'

export const nodeTypeCoverageRule: CheckRule = {
  id: RULE_ID,
  label: 'Node-type coverage',
  category: 'nodes',
  run: report => {
    const { byType, nodesTotal } = report.nodeTracking
    const target = sectionTarget(report, 'node_tracking')
    const measured = byType.filter(entry => entry.total !== null && entry.total > 0)

    const seed = {
      id: RULE_ID,
      ruleId: RULE_ID,
      category: 'nodes' as const,
      label: 'Node-type coverage',
      explanation: '',
      source: 'node_tracking.by_type[]',
      evidence: byType.map(
        entry =>
          `${entry.nodeType}: ${count(entry.mapped)} of ${count(entry.total)} ` +
          `(${entry.recomputedPct === null ? '—' : `${roundTo(entry.recomputedPct, 1)} %`})`
      ),
      metricId: 'pctNodesMapped' as const,
      ...target,
    }

    if (measured.length === 0) {
      return [
        unevaluated({
          ...seed,
          label: 'Node-type coverage could not be checked',
          explanation:
            'This report carries no per-node-type forward-tracking figures, so nothing can be ' +
            'said about coverage by type. Absence is not coverage.',
          reason: 'inputs-missing',
        }),
      ]
    }

    const unmapped = measured.filter(entry => entry.mapped === 0)

    if (unmapped.length === 0) {
      const worst = measured.reduce((low, entry) =>
        (entry.recomputedPct ?? 0) < (low.recomputedPct ?? 0) ? entry : low
      )
      return [
        passing({
          ...seed,
          label: 'Every node type mapped forward',
          explanation:
            `All ${measured.length} node types have some forward mapping; the lowest is ` +
            `${worst.nodeType} at ${roundTo(worst.recomputedPct ?? 0, 1)} %. No category was ` +
            'left entirely behind.',
        }),
      ]
    }

    const share = unmapped.reduce((sum, entry) => sum + (entry.total ?? 0), 0)
    const sharePct = percentOf(share, nodesTotal, 2)

    return [
      warned({
        ...seed,
        label:
          `${unmapped.map(entry => entry.nodeType).join(', ')} node ` +
          `${unmapped.length === 1 ? 'type' : 'types'} mapped forward 0 %`,
        explanation:
          `${unmapped
            .map(entry => `${entry.nodeType} mapped 0 of ${count(entry.total)} nodes`)
            .join('; ')}. That is ` +
          `${sharePct === null ? 'a small share of' : `${sharePct} % of`} the ` +
          `${count(nodesTotal)} previous-library nodes, so the overall rate barely moves — but ` +
          'nothing in the category mapped forward at all, which is a different condition from a ' +
          'low rate and worth resolving before release.',
      }),
    ]
  },
}
