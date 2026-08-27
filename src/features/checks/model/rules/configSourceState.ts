/**
 * The state of the source tree at build time, and whether the ledger resolved every variable.
 *
 * Two findings, both from the config ledger and both about whether this build can be reproduced.
 *
 * A dirty source tree COUNTS. It is not a style complaint: the recorded revision then does not
 * describe the code that produced the library, so the single most useful provenance field in the
 * whole report is incomplete. `unresolved_vars` being empty is the mirror image, and passes.
 */

import { passing, unevaluated, warned } from '../finding'
import { configTarget } from '../context'
import type { CheckFinding, CheckRule } from '../types'

const DIRTY_RULE_ID = 'config.source-dirty'
const UNRESOLVED_RULE_ID = 'config.unresolved-vars'

/** The ledger field this finding rests on; also the anchor key the config tiers render it under. */
const DIRTY_KEY = 'panther_build_dirty'

export const configSourceStateRule: CheckRule = {
  id: DIRTY_RULE_ID,
  label: 'Source tree state',
  category: 'config',
  run: report => {
    const { sourceDirty } = report.consistency
    const revision = report.config.sourceRevision

    const seed = {
      id: DIRTY_RULE_ID,
      ruleId: DIRTY_RULE_ID,
      category: 'config' as const,
      tier: 'mismatch' as const,
      label: 'Source tree state',
      explanation: '',
      source: 'config_ledger.current.panther_build_dirty',
      evidence: [
        `panther_build_dirty: ${sourceDirty === null ? 'not reported' : String(sourceDirty)}`,
        `panther_build_git_rev: ${revision ?? 'not captured'}`,
      ],
      ...configTarget(DIRTY_KEY),
    }

    if (sourceDirty === null) {
      return [
        unevaluated({
          ...seed,
          label: 'Source tree state not reported',
          explanation:
            'The config ledger does not say whether the source tree had uncommitted changes, so ' +
            'the recorded revision cannot be taken as a complete description of the code.',
          reason: 'inputs-missing',
        }),
      ]
    }

    if (sourceDirty) {
      return [
        warned({
          ...seed,
          label: 'Source tree was dirty at build time',
          explanation:
            'The pipeline source had uncommitted changes when this build ran, so revision ' +
            `${revision ?? 'unknown'} does not fully describe the code that produced this ` +
            'library. A checkout of that revision may not reproduce it.',
          evidenceTokens: ['panther_build_dirty'],
        }),
      ]
    }

    return [
      passing({
        ...seed,
        label: 'Source tree was clean at build time',
        explanation:
          `The pipeline source had no uncommitted changes, so revision ${revision ?? 'unknown'} ` +
          'describes exactly the code that produced this library.',
      }),
    ]
  },
}

export const configUnresolvedRule: CheckRule = {
  id: UNRESOLVED_RULE_ID,
  label: 'Unresolved configuration variables',
  category: 'config',
  run: report => {
    const unresolved = report.consistency.unresolvedVars

    const seed = {
      id: UNRESOLVED_RULE_ID,
      ruleId: UNRESOLVED_RULE_ID,
      category: 'config' as const,
      label: 'Unresolved configuration variables',
      explanation: '',
      source: 'config_ledger.current.unresolved_vars',
      ...configTarget('unresolved_vars'),
      anchorLabel: 'the configuration ledger',
    }

    if (unresolved.length === 0) {
      const finding: CheckFinding = passing({
        ...seed,
        label: 'Every configuration variable resolved',
        explanation:
          'unresolved_vars is empty: every variable the configuration references had a value at ' +
          'build time, so no step ran against an unset path.',
        evidence: ['unresolved_vars: []'],
      })
      return [finding]
    }

    return [
      warned({
        ...seed,
        tier: 'mismatch',
        label: `${unresolved.length} configuration variables did not resolve`,
        explanation:
          `${unresolved.join(', ')} had no value at build time. A step reading an unset path ` +
          'either failed or silently used a default, and neither is visible in the artifacts.',
        evidence: unresolved.map(name => `${name}: unresolved`),
      }),
    ]
  },
}
