/**
 * The release lineage of the `PREV_*` configuration.
 *
 * A 20.0 build referencing 19.0 through `PREV_*` is correct, expected and worth SHOWING - about a
 * third of this config points at previous releases, and a rule that flagged each one would bury
 * the single real mismatch under roughly twenty-five false positives. So the lineage tier is
 * display-only and positive: it passes when the `PREV_*` set is internally consistent, and warns
 * only when the set is self-contradictory, meaning inputs from two different previous releases are
 * mixed into one build.
 *
 * `PREV_PREV_*` here references 17.0 where 18.0 would be the naive expectation for a 20.0 build.
 * That is stated as a note on a passing finding rather than as a warning: two variables agreeing
 * with each other is evidence of intent, not of an error.
 */

import { plural } from '@/app/format'
import { noted, passing, unevaluated, warned } from '../finding'
import { configTarget, currentMajorRelease } from '../context'
import type { ConfigLineageEntry } from '@/features/build/model'
import type { CheckFinding, CheckRule } from '../types'

const RULE_ID = 'config.lineage'

interface LineageReading {
  entries: ConfigLineageEntry[]
  releases: string[]
  withRelease: ConfigLineageEntry[]
}

function read(entries: ConfigLineageEntry[]): LineageReading {
  const withRelease = entries.filter(entry => entry.release !== null)
  return {
    entries,
    withRelease,
    releases: [...new Set(withRelease.map(entry => entry.release as string))],
  }
}

function generationSentence(reading: LineageReading, prefix: string): string {
  if (reading.withRelease.length === 0) return ''
  return (
    ` ${reading.withRelease.length} ${prefix} ${plural(reading.withRelease.length, 'variable')} ` +
    `${plural(reading.withRelease.length, 'references', 'reference')} ` +
    `PANTHER${reading.releases.join(' and ')}.0.`
  )
}

export const configLineageRule: CheckRule = {
  id: RULE_ID,
  label: 'Config release lineage',
  category: 'config',
  run: report => {
    const previous = read(report.config.previousLineage)
    const older = read(report.config.previousPreviousLineage)
    const current = currentMajorRelease(report.config)

    const evidence = [
      ...previous.withRelease.map(entry => `${entry.key} → PANTHER${entry.release}.0`),
      ...older.withRelease.map(entry => `${entry.key} → PANTHER${entry.release}.0`),
    ]

    const seed = {
      id: RULE_ID,
      ruleId: RULE_ID,
      category: 'config' as const,
      tier: 'lineage' as const,
      label: 'Previous-release lineage',
      explanation: '',
      source: 'config.mk PREV_* and PREV_PREV_* values',
      evidence,
      ...configTarget('PREV_RELEASE_DIR'),
      anchorLabel: 'the configuration lineage',
    }

    if (previous.withRelease.length === 0) {
      return [
        unevaluated({
          ...seed,
          label: 'No previous-release lineage to read',
          explanation:
            'No PREV_* variable in this configuration carries a release token, so there is no ' +
            'lineage pattern to confirm.',
          reason: 'not-applicable',
        }),
      ]
    }

    if (previous.releases.length > 1) {
      return [
        warned({
          ...seed,
          label: 'PREV_* inputs reference more than one release',
          explanation:
            `The PREV_* variables reference PANTHER${previous.releases.join('.0, PANTHER')}.0. ` +
            'Inputs from two different previous releases in one build is a real inconsistency ' +
            'rather than a lineage pattern, because the "previous library" is then not one ' +
            'library.',
        }),
      ]
    }

    const previousRelease = Number.parseInt(previous.releases[0], 10)
    const expectedPrevious = current === null ? null : current - 1
    const naiveOlder = current === null ? null : current - 2
    const olderNote =
      older.releases.length === 1 && naiveOlder !== null && older.releases[0] !== String(naiveOlder)
        ? ` PREV_PREV_* references PANTHER${older.releases[0]}.0 where PANTHER${naiveOlder}.0 ` +
          'would be the naive expectation for a ' +
          `${current}.0 build; both PREV_PREV_* variables agree with each other, so this reads as ` +
          'a deliberate choice of an older baseline rather than a mistake.'
        : ''

    const shared =
      `${previous.withRelease.length} PREV_* ${plural(previous.withRelease.length, 'variable')} ` +
      `consistently ${plural(previous.withRelease.length, 'references', 'reference')} ` +
      `PANTHER${previous.releases[0]}.0.` +
      generationSentence(older, 'PREV_PREV_*') +
      olderNote

    if (expectedPrevious !== null && previousRelease !== expectedPrevious) {
      const finding: CheckFinding = noted({
        ...seed,
        label: `PREV_* inputs reference PANTHER${previous.releases[0]}.0, not ${expectedPrevious}.0`,
        explanation:
          `${shared} The set is internally consistent, so it is shown as a lineage pattern rather ` +
          `than an error — but the previous release of a ${current}.0 build would normally be ` +
          `${expectedPrevious}.0, which is worth confirming.`,
      })
      return [finding]
    }

    return [
      passing({
        ...seed,
        label: `Previous-release lineage is consistent at PANTHER${previous.releases[0]}.0`,
        explanation:
          `${shared} The PREV_* generation is the expected relationship for a ` +
          `${current ?? 'new'}.0 build, so the lineage is displayed as a satisfied pattern and ` +
          'does not count as an issue.',
      }),
    ]
  },
}
