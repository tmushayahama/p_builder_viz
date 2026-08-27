/**
 * The species denominators.
 *
 * Three sources say 131 and a fourth says 147, which looks like a contradiction and is not:
 * `other_reports.species_total` counts species appearing in EITHER release, while the other three
 * count genomes in this library. The check's job is to state that difference so nobody reconciles
 * two numbers that were never measuring the same set.
 */

import { passing, unevaluated, warned } from '../finding'
import { count, joinList, sectionTarget } from '../context'
import { metricLabel } from '@/features/build/model'
import type { CheckRule } from '../types'

const RULE_ID = 'consistency.species-denominator'

export const speciesDenominatorRule: CheckRule = {
  id: RULE_ID,
  label: 'Species denominator',
  category: 'consistency',
  run: report => {
    const sources = [
      {
        label: metricLabel('speciesReported'),
        value: report.nodeTracking.speciesReported,
        source: 'node_tracking.headline.species_reported',
      },
      {
        label: metricLabel('genomes'),
        value: report.library.genomes,
        source: 'library.genomes',
      },
      {
        label: metricLabel('prevUniprotProteomes'),
        value: report.otherReports.values.prev_uniprot_proteomes ?? null,
        source: 'other_reports.prev_uniprot_proteomes',
      },
    ]
    const present = sources.filter(entry => entry.value !== null)
    const missing = sources.filter(entry => entry.value === null)
    const speciesTotal = report.otherReports.values.species_total ?? null

    const evidence = sources.map(entry => `${entry.label}: ${count(entry.value)} (${entry.source})`)
    if (speciesTotal !== null) {
      evidence.push(
        `${metricLabel('speciesTotal')}: ${count(speciesTotal)} (other_reports.species_total)`
      )
    }
    for (const entry of missing) {
      evidence.push(`${entry.label} is not in this report, so it was not compared.`)
    }

    const target = sectionTarget(report, 'node_tracking')
    const seed = {
      id: RULE_ID,
      ruleId: RULE_ID,
      category: 'consistency' as const,
      label: 'Species denominators',
      explanation: '',
      source: sources.map(entry => entry.source).join(', '),
      evidence,
      metricId: 'speciesReported' as const,
      ...target,
    }

    if (present.length < 2) {
      return [
        unevaluated({
          ...seed,
          label: 'Species denominators could not be compared',
          explanation:
            'Fewer than two species counts are present in this report, so agreement between them ' +
            'would mean nothing.',
          reason: 'inputs-missing',
        }),
      ]
    }

    const agreed = present[0].value as number
    const allEqual = present.every(entry => entry.value === agreed)

    const totalSentence =
      speciesTotal === null || speciesTotal === agreed
        ? ''
        : ` A further figure, ${metricLabel('speciesTotal')}, is ` +
          `${count(speciesTotal)}: it counts species present in either release, not genomes in ` +
          'this library, so the difference is a different denominator rather than a discrepancy.'

    const partialSentence =
      missing.length === 0
        ? ''
        : ` ${missing.map(entry => entry.label).join(' and ')} ` +
          `${missing.length === 1 ? 'is' : 'are'} absent from this report and ` +
          `${missing.length === 1 ? 'was' : 'were'} not part of the comparison.`

    if (!allEqual) {
      return [
        warned({
          ...seed,
          label: 'Species counts disagree between sections',
          explanation:
            'Counts that should describe the same set of genomes do not: ' +
            joinList(present.map(entry => `${entry.label} ${count(entry.value)}`)) +
            '.' +
            totalSentence +
            partialSentence,
        }),
      ]
    }

    return [
      passing({
        ...seed,
        label: `Species counts agree at ${count(agreed)}`,
        explanation:
          `${joinList(present.map(entry => entry.label))} all report ${count(agreed)}.` +
          totalSentence +
          partialSentence,
      }),
    ]
  },
}
