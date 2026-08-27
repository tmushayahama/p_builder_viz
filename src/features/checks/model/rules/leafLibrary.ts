/**
 * The LEAF node total against the library sequence count.
 *
 * Two parts of the build that never speak to each other - node forward tracking, which reads the
 * previous library, and library assembly, which writes the new one - arrive at 1,736,983 exactly.
 * An exact match between independently produced totals is meaningful evidence, so it is surfaced
 * as a finding rather than left for a reader to notice.
 *
 * When node forward tracking is missing from the report this becomes `absent`, never a pass. A
 * check with no inputs has not verified anything.
 */

import { passing, unevaluated, warned } from '../finding'
import { count, sectionTarget } from '../context'
import type { CheckRule } from '../types'

const RULE_ID = 'consistency.leaf-library'

export const leafLibraryRule: CheckRule = {
  id: RULE_ID,
  label: 'Leaf/library consistency',
  category: 'consistency',
  run: report => {
    const fact = report.consistency.leafLibraryAgreement
    const target = sectionTarget(report, 'node_tracking')
    const missing = fact.values.filter(entry => entry.value === null)
    const evidence = fact.values.map(
      entry => `${entry.label}: ${count(entry.value)} (${entry.source})`
    )

    const seed = {
      id: RULE_ID,
      ruleId: RULE_ID,
      category: 'consistency' as const,
      label: fact.label,
      explanation: '',
      source: fact.values.map(entry => entry.source).join(' vs '),
      evidence,
      metricId: 'librarySequences' as const,
      ...target,
    }

    if (!fact.comparable) {
      return [
        unevaluated({
          ...seed,
          label: 'LEAF nodes and library sequences could not be compared',
          explanation:
            `${missing.map(entry => entry.label).join(' and ')} ` +
            `${missing.length === 1 ? 'is' : 'are'} not present in this report, so the two totals ` +
            'cannot be compared. This is a gap in the record, not a clean bill of health.',
          reason: 'inputs-missing',
        }),
      ]
    }

    const [first, second] = fact.values
    if (!fact.allEqual) {
      const difference = (first.value ?? 0) - (second.value ?? 0)
      return [
        warned({
          ...seed,
          label: 'LEAF nodes and library sequences disagree',
          explanation:
            `The LEAF node total and the library sequence count differ by ` +
            `${count(Math.abs(difference))}. Every leaf in the previous library corresponds to a ` +
            'library sequence, so a difference means one of the two counts is not describing what ' +
            'it appears to.',
        }),
      ]
    }

    return [
      passing({
        ...seed,
        label: 'LEAF node total matches library sequences exactly',
        explanation:
          `Both report ${count(first.value)}. Node forward tracking and library assembly are ` +
          'produced by different steps from different inputs, so an exact match is evidence the ' +
          'two agree about what is in this library - not a duplicated metric.',
      }),
    ]
  },
}
