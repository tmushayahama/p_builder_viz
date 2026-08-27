/**
 * The declared QfO release against the reference-proteome path actually in force.
 *
 * The one configuration MISMATCH on this report, and the reason the three-tier model exists: a
 * blanket "older release referenced" rule would have produced about twenty-five findings and this
 * one would have been indistinguishable from the rest.
 *
 * The evidence is what makes it credible. `QFO_RELEASE_VERSION` declares one release while the
 * active `QFO_DATA_DIR` resolves to another, and the captured `config.mk` still carries the
 * commented-out line for the declared release - so the path was deliberately switched and the
 * declaration was not switched with it. The finding keeps that line verbatim, with its line number,
 * rather than paraphrasing it.
 */

import { passing, unevaluated, warned } from '../finding'
import { configTarget, datedReleaseTokenOf } from '../context'
import type { CheckRule } from '../types'

const RULE_ID = 'config.qfo-release'

export const configQfoRule: CheckRule = {
  id: RULE_ID,
  label: 'QfO release against the active data path',
  category: 'config',
  run: report => {
    const { qfoDeclaredRelease, qfoActiveDataDir, qfoReleaseMatchesDataDir, qfoCommentedEvidence } =
      report.consistency

    const seed = {
      id: RULE_ID,
      ruleId: RULE_ID,
      category: 'config' as const,
      tier: 'mismatch' as const,
      label: 'QfO release',
      explanation: '',
      source: 'config.mk QFO_RELEASE_VERSION and QFO_DATA_DIR',
      ...configTarget('QFO_DATA_DIR'),
    }

    if (qfoDeclaredRelease === null || qfoActiveDataDir === null) {
      return [
        unevaluated({
          ...seed,
          label: 'QfO release could not be compared with its data path',
          explanation:
            (qfoDeclaredRelease === null
              ? 'QFO_RELEASE_VERSION is not resolved in this report. '
              : 'QFO_DATA_DIR is not resolved in this report. ') +
            'Without both, the declared release and the path in force cannot be compared.',
          reason: 'inputs-missing',
          evidence: [
            `QFO_RELEASE_VERSION: ${qfoDeclaredRelease ?? 'not resolved'}`,
            `QFO_DATA_DIR: ${qfoActiveDataDir ?? 'not resolved'}`,
          ],
        }),
      ]
    }

    const evidence = [
      `QFO_RELEASE_VERSION=${qfoDeclaredRelease}`,
      `QFO_DATA_DIR=${qfoActiveDataDir}`,
      ...qfoCommentedEvidence.map(
        entry =>
          `config.mk:${entry.line ?? '?'} (commented out) #export ${entry.key}=${entry.value}`
      ),
    ]

    if (qfoReleaseMatchesDataDir === true) {
      return [
        passing({
          ...seed,
          label: `QfO release ${qfoDeclaredRelease} matches the active data path`,
          explanation:
            `The declared release ${qfoDeclaredRelease} appears in the reference-proteome path in ` +
            'force, so the sequences this build consumed are the release it claims.',
          evidence,
        }),
      ]
    }

    const activeRelease = datedReleaseTokenOf(qfoActiveDataDir)
    const commented = qfoCommentedEvidence.find(entry => entry.value.includes(qfoDeclaredRelease))

    return [
      warned({
        ...seed,
        label: `QfO release ${qfoDeclaredRelease} disagrees with the active data path`,
        explanation:
          `QFO_RELEASE_VERSION declares ${qfoDeclaredRelease}, but the active QFO_DATA_DIR is ` +
          `${qfoActiveDataDir}` +
          (activeRelease === null ? '' : `, which carries ${activeRelease}`) +
          '. ' +
          (commented === undefined
            ? 'The reference proteomes this build actually read are therefore not the release it ' +
              'declares, so anything derived from the declared version is describing a different ' +
              'input set.'
            : `The captured config.mk still holds the commented-out line for ` +
              `${qfoDeclaredRelease} on line ${commented.line ?? '?'}, so the path was switched ` +
              'deliberately and the declared version was not switched with it. The proteomes this ' +
              'build read are the ones in the active path, not the declared release.'),
        evidence,
        evidenceTokens: ['QFO_RELEASE_VERSION', qfoDeclaredRelease, 'QFO_DATA_DIR'],
      }),
    ]
  },
}
