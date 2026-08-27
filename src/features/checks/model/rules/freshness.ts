/**
 * Report freshness as a check.
 *
 * The preamble already shows the state; this makes it a first-class finding so an export of the
 * checks carries it too. On the captured report it is Current by 73.7 h, and Current is POSITIVE
 * evidence - the report was generated after every artifact it describes, which is what makes every
 * figure below it trustworthy. Rendering that as a neutral badge would waste the strongest thing
 * the report says about itself.
 */

import { formatUtc } from '@/app/format'
import { formatDuration } from '@/features/build/model'
import { passing, unevaluated, warned } from '../finding'
import { sectionTarget, stepTarget } from '../context'
import type { CheckRule } from '../types'

const RULE_ID = 'freshness.report'

export const freshnessRule: CheckRule = {
  id: RULE_ID,
  label: 'Report freshness',
  category: 'freshness',
  run: report => {
    const { freshness } = report
    const step =
      freshness.newestArtifactStepId === null
        ? null
        : stepTarget(report, freshness.newestArtifactStepId)
    const target = step ?? sectionTarget(report, 'progress')

    const evidence = [
      `Report generated ${formatUtc(freshness.generatedAt)}.`,
      `Newest artifact ${formatUtc(freshness.newestArtifactAt)}` +
        (step === null ? '.' : ` — ${step.anchorLabel}.`),
    ]

    const seed = {
      id: RULE_ID,
      ruleId: RULE_ID,
      category: 'freshness' as const,
      label: `Report is ${freshness.label.toLowerCase()}`,
      explanation: freshness.explanation,
      source: 'generated_at against the newest step artifact mtime',
      evidence,
      metricId: 'reportLeadTime' as const,
      ...target,
    }

    if (freshness.state === 'unknown') {
      return [
        unevaluated({
          ...seed,
          label: 'Report freshness could not be established',
          reason: 'inputs-missing',
        }),
      ]
    }

    const lead = freshness.leadSeconds

    if (freshness.state === 'potentially-stale') {
      return [
        warned({
          ...seed,
          label: 'Report may be stale',
          explanation:
            (lead === null
              ? 'An artifact appears newer than the report. '
              : `An artifact is ${formatDuration(Math.abs(lead))} newer than the report. `) +
            'Figures below may describe a build state that has since moved on.',
        }),
      ]
    }

    return [
      passing({
        ...seed,
        explanation:
          (lead === null
            ? 'The report was generated after the newest artifact it describes. '
            : `The report was generated ${formatDuration(lead)} after the newest artifact it ` +
              'describes. ') +
          'Nothing in the build finished after the report was written, so every figure here ' +
          'describes the same build state.',
      }),
    ]
  },
}
