/**
 * The check contract.
 *
 * The model hands this layer FACTS - which numbers should agree, whether they do, what the config
 * says - and deliberately no verdicts. Turning a fact into pass/warn/absent is a judgement, and a
 * judgement belongs where it can be read, argued with and attributed. So every finding carries:
 *
 *   state       the model's own `CheckState`: pass, warn or absent
 *   weight      what the finding does to the reader's attention, which `state` alone cannot say -
 *               a configuration value inherited from an older release is neither a failure nor a
 *               verification, and must not inflate either count
 *   origin      generator-emitted or dashboard-derived, rendered with `Provenance`
 *   anchor      where the evidence lives, built by the model's anchor builders only
 *   evidence    the literal figures and lines the finding rests on
 *
 * `CheckFinding extends Check`, so anything typed against the model's published `Check` (an export,
 * a future API) accepts one of these unchanged.
 *
 * WHY `weight` AND `state`. Four states would have been simpler, but `CheckState` is the model's
 * published union and the brief names those three. `weight` is the second axis, and the pairing is
 * an invariant the factories in `finding.ts` are the only way to satisfy:
 *
 *   issue     <-> warn      counted as an issue
 *   verified  <-> pass      positive evidence: something was checked and held
 *   note      <-> pass      observed, explained, counted as neither
 *   absent    <-> absent    the check could not run
 */

import type { BuildReport, Check, CheckOrigin, CheckState, MetricId } from '@/features/build/model'
import type { ProvenanceSource } from '@/@panther.core/vocabulary'

export type CheckWeight = 'issue' | 'verified' | 'note' | 'absent'

/** Which part of the report a finding reads. Groups the registry and the per-phase markers. */
export type CheckCategory =
  'freshness' | 'consistency' | 'pipeline' | 'nodes' | 'terminology' | 'timing' | 'config'

/**
 * The three tiers configuration findings are read in. A third of this config legitimately points
 * at previous releases, so a rule that flagged every older-release reference would bury the one
 * real mismatch in around twenty-five false positives - which is why `lineage` and `notable` are
 * separate tiers rather than weaker warnings.
 */
export type ConfigTier = 'lineage' | 'notable' | 'mismatch'

/**
 * Why a check could not run. `absent` was doing double duty - "the record is missing this" versus
 * "this build has nothing to check" - and only the first is a gap in the build record.
 */
export type AbsentReason = 'inputs-missing' | 'not-applicable'

export interface CheckFinding extends Check {
  /** The rule that produced it. Several findings may share one rule id. */
  ruleId: string
  state: CheckState
  weight: CheckWeight
  origin: CheckOrigin
  category: CheckCategory
  /** What the anchor points at, in words, for the link text and for an export. */
  anchorLabel: string
  /** Set only on `absent`. */
  absentReason: AbsentReason | null
  /** Set only on a configuration finding. */
  tier: ConfigTier | null
  configKey: string | null
  /** The phase this finding is about, for the spine's per-phase marker. `null` for build-wide. */
  phaseId: string | null
  /** The step whose artifact the finding rests on, when there is one. */
  stepId: string | null
  /** An oscode named by the finding: the row opens that species rather than following a link. */
  oscode: string | null
  metricId: MetricId | null
  /**
   * Literal strings that identify this finding's evidence. A generator warning naming all of them
   * describes the same thing, so the derived finding stands down rather than reporting it twice.
   */
  evidenceTokens: string[]
  /** Set when a generator warning superseded this derived finding. */
  supersededBy: string | null
}

/** The `Provenance` primitive's vocabulary, which names the dashboard side `derived`. */
export function provenanceSourceOf(finding: CheckFinding): ProvenanceSource {
  return finding.origin === 'generator' ? 'generator' : 'derived'
}

export function countsAsIssue(finding: CheckFinding): boolean {
  return finding.weight === 'issue'
}

export interface CheckSummary {
  /** Warnings and mismatches. Passing and notable findings deliberately do not enter this. */
  issues: number
  generatorIssues: number
  derivedIssues: number
  verified: number
  notes: number
  absent: number
  /** Derived findings a generator warning already described. */
  suppressed: number
  total: number
}

export interface CheckRunResult {
  checks: CheckFinding[]
  summary: CheckSummary
  byId: Record<string, CheckFinding>
  byPhaseId: Record<string, CheckFinding[]>
  byConfigKey: Record<string, CheckFinding[]>
  byTier: Record<ConfigTier, CheckFinding[]>
  /** Kept, not discarded: a suppressed finding is evidence the dedupe happened. */
  suppressed: CheckFinding[]
}

/** A rule is pure and total: it reads the report and returns zero or more findings. */
export interface CheckRule {
  id: string
  /** The family name, for the rule registry listing. */
  label: string
  category: CheckCategory
  run: (report: BuildReport) => CheckFinding[]
}
