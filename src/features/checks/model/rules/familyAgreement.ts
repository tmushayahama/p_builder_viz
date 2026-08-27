/**
 * Family counts across the major stages.
 *
 * The interesting part is not the agreement, it is the ONE value that legitimately differs.
 * Reclustering reports 15,823 families where the four downstream sources agree at 15,797, and a
 * naive equality check would call that a discrepancy. It is not: trimming, de-duplication and
 * single-genome family removal all run after reclustering, so the count is expected to fall. The
 * rule therefore explains the difference from the stage order rather than flagging it - which is
 * exactly the interpretation the generator did not provide.
 */

import { passing, unevaluated, warned } from '../finding'
import { count, joinList, sectionTarget } from '../context'
import type { BuildReport, MappingStage } from '@/features/build/model'
import type { CheckRule } from '../types'

const RULE_ID = 'consistency.family-agreement'

/** The stage families are counted at before the trimming passes run. */
const PRE_TRIM_STAGE = 'recluster'

function preTrimStage(report: BuildReport): MappingStage | null {
  return report.mapping.stages.find(stage => stage.stage === PRE_TRIM_STAGE) ?? null
}

/** The stages that run after `recluster`, named so the explanation cites the pipeline, not a guess. */
function stagesAfter(report: BuildReport, stageName: string): string[] {
  const index = report.mapping.stages.findIndex(stage => stage.stage === stageName)
  if (index < 0) return []
  return report.mapping.stages.slice(index + 1).map(stage => stage.stage)
}

export const familyAgreementRule: CheckRule = {
  id: RULE_ID,
  label: 'Family-count consistency',
  category: 'consistency',
  run: report => {
    const fact = report.consistency.familyAgreement
    const present = fact.values.filter(entry => entry.value !== null)
    const target = sectionTarget(report, 'mapping')

    const seed = {
      id: RULE_ID,
      ruleId: RULE_ID,
      category: 'consistency' as const,
      label: fact.label,
      explanation: '',
      source: present.map(entry => entry.source).join(', ') || 'mapping, library, giga',
      metricId: 'families' as const,
      ...target,
    }

    if (!fact.comparable) {
      return [
        unevaluated({
          ...seed,
          label: 'Family counts could not be compared',
          explanation:
            `Only ${present.length} of ${fact.values.length} family counts are present in this ` +
            'report, so agreement between them says nothing either way.',
          evidence: fact.values.map(entry => `${entry.label}: ${count(entry.value)}`),
          reason: 'inputs-missing',
        }),
      ]
    }

    const agreed = present[0].value as number
    const evidence = present.map(entry => `${entry.label}: ${count(entry.value)} (${entry.source})`)

    const preTrim = preTrimStage(report)
    const laterStages = stagesAfter(report, PRE_TRIM_STAGE)
    let preTrimSentence = ''
    if (preTrim !== null && preTrim.families !== null && preTrim.families !== agreed) {
      const difference = preTrim.families - agreed
      evidence.push(
        `Reclustering stage (${preTrim.stage}): ${count(preTrim.families)} — ` +
          `mapping.rows[stage=${preTrim.stage}].n_families`
      )
      preTrimSentence =
        ` Reclustering reports ${count(preTrim.families)}, ` +
        `${count(Math.abs(difference))} ${difference > 0 ? 'higher' : 'lower'}, which is expected ` +
        `rather than a disagreement: ${laterStages.length} stages run after it ` +
        `(${laterStages.join(', ')}) and trimming, de-duplication and single-genome family ` +
        'removal all change the family count.'
    }

    if (!fact.allEqual) {
      return [
        warned({
          ...seed,
          label: 'Family counts disagree across stages',
          explanation: 'Sources that should report the same family count do not.' + preTrimSentence,
          evidence,
        }),
      ]
    }

    return [
      passing({
        ...seed,
        label: `Family counts agree across ${present.length} sources`,
        explanation:
          `All ${present.length} sources report ${count(agreed)} families: ` +
          `${joinList(present.map(entry => entry.label))}. Independent parts of the build ` +
          'arriving at the same number is the strongest single signal that family assignment, ' +
          'tree building and library assembly agree.' +
          preTrimSentence,
        evidence,
      }),
    ]
  },
}
