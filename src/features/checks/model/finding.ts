/**
 * The only way to build a finding.
 *
 * Four factories, one per state/weight pairing, so the pairing cannot drift: nothing in the rules
 * writes `state` and `weight` separately, and there is no way to produce a `warn` that does not
 * count or a `note` that inflates the verified total.
 *
 * Every factory demands an anchor and a source. A finding with nowhere to point and no stated
 * origin is not a check, it is an opinion - and the dashboard may become part of the permanent
 * build record.
 */

import { BUILD_ROUTE } from '@/features/build/model'
import type { AbsentReason, CheckCategory, CheckFinding, ConfigTier } from './types'

export interface FindingSeed {
  /** Unique across the whole run. A rule emitting several findings suffixes a discriminator. */
  id: string
  ruleId: string
  category: CheckCategory
  label: string
  explanation: string
  /** Where the numbers came from, in report terms: `giga.books_total`, `config.mk:12`. */
  source: string
  /** From the model's anchor builders. Never hand-written. */
  anchor: string
  anchorLabel: string
  evidence?: string[]
  tier?: ConfigTier
  configKey?: string
  phaseId?: string
  stepId?: string
  oscode?: string
  metricId?: CheckFinding['metricId']
  evidenceTokens?: string[]
}

function base(seed: FindingSeed): Omit<CheckFinding, 'state' | 'weight' | 'origin'> {
  return {
    id: seed.id,
    ruleId: seed.ruleId,
    category: seed.category,
    label: seed.label,
    explanation: seed.explanation,
    source: seed.source,
    anchor: seed.anchor,
    anchorLabel: seed.anchorLabel,
    evidence: seed.evidence ?? [],
    absentReason: null,
    tier: seed.tier ?? null,
    configKey: seed.configKey ?? null,
    phaseId: seed.phaseId ?? null,
    stepId: seed.stepId ?? null,
    oscode: seed.oscode ?? null,
    metricId: seed.metricId ?? null,
    evidenceTokens: seed.evidenceTokens ?? [],
    supersededBy: null,
  }
}

/** Something was checked and held. Positive evidence, shown first-class. */
export function passing(seed: FindingSeed): CheckFinding {
  return { ...base(seed), state: 'pass', weight: 'verified', origin: 'dashboard' }
}

/**
 * Observed, explained, and not known to be wrong. Counts as neither an issue nor a verification:
 * the config tiers depend on this existing, and so does the reading of a hole behind the frontier.
 */
export function noted(seed: FindingSeed): CheckFinding {
  return { ...base(seed), state: 'pass', weight: 'note', origin: 'dashboard' }
}

/** Worth reviewing. The only weight that enters the issue count. */
export function warned(seed: FindingSeed): CheckFinding {
  return { ...base(seed), state: 'warn', weight: 'issue', origin: 'dashboard' }
}

/**
 * The check could not run. Never a `pass`: a missing input is not evidence of soundness, and a
 * stripped section must not turn a consistency check into a silent success.
 */
export function unevaluated(seed: FindingSeed & { reason: AbsentReason }): CheckFinding {
  return {
    ...base(seed),
    state: 'absent',
    weight: 'absent',
    origin: 'dashboard',
    absentReason: seed.reason,
  }
}

/** A string the report generator wrote. Its `explanation` is the message verbatim, never reworded. */
export function fromGenerator(seed: FindingSeed): CheckFinding {
  return { ...base(seed), state: 'warn', weight: 'issue', origin: 'generator' }
}

/** The in-app route for a finding's anchor, so a link moves the spine as well as scrolling. */
export function findingRoute(finding: CheckFinding): string {
  return `${BUILD_ROUTE}${finding.anchor}`
}
