/**
 * The runner: a pure function from `BuildReport` to findings.
 *
 * It does three things and deliberately no more, because everything else belongs in a rule.
 *
 * DEDUPLICATION. A derived finding whose `evidenceTokens` are all named by a generator warning is
 * describing the same evidence, so it stands down: the report's own words survive and the derived
 * duplicate is moved to `suppressed` rather than deleted. On the captured report this is exactly
 * the second out-of-order artifact pair, which the generator already warned about; on the
 * `toWarning` state it is also the QfO mismatch. Suppressed findings are kept because the fact that
 * the dashboard reached the same conclusion independently is itself worth having in the record.
 *
 * ORDERING. Issues, then observations, then verifications, then what could not be evaluated. Within
 * a group, registry order.
 *
 * COUNTING. The issue count is warnings only. Passing checks are first-class in the display and
 * must not inflate the number a reviewer reads as "things wrong with this build"; notable
 * configuration is visible and counts as nothing at all.
 */

import type { BuildReport } from '@/features/build/model'
import { CHECK_RULES } from './rules'
import type { CheckFinding, CheckRunResult, CheckSummary, CheckWeight, ConfigTier } from './types'

const WEIGHT_ORDER: Record<CheckWeight, number> = {
  issue: 0,
  note: 1,
  verified: 2,
  absent: 3,
}

interface Partitioned {
  kept: CheckFinding[]
  suppressed: CheckFinding[]
}

/**
 * A generator warning supersedes a derived finding when its message names every token the derived
 * finding rests on. Tokens are the literal identifiers - a step goal, a config key, a release
 * string - so the test is evidential rather than a similarity score: no token, no suppression.
 */
function deduplicate(findings: readonly CheckFinding[]): Partitioned {
  const generatorFindings = findings.filter(finding => finding.origin === 'generator')
  const kept: CheckFinding[] = []
  const suppressed: CheckFinding[] = []
  const corroboration = new Map<string, string[]>()

  for (const finding of findings) {
    if (finding.origin === 'generator' || finding.evidenceTokens.length === 0) {
      kept.push(finding)
      continue
    }
    const match = generatorFindings.find(candidate =>
      finding.evidenceTokens.every(token => candidate.explanation.includes(token))
    )
    if (match === undefined) {
      kept.push(finding)
      continue
    }
    suppressed.push({ ...finding, supersededBy: match.id })
    corroboration.set(match.id, [...(corroboration.get(match.id) ?? []), finding.label])
  }

  if (corroboration.size === 0) return { kept, suppressed }

  return {
    kept: kept.map(finding => {
      const labels = corroboration.get(finding.id)
      if (labels === undefined) return finding
      return {
        ...finding,
        evidence: [
          ...finding.evidence,
          `This dashboard reached the same finding independently (${labels.join('; ')}) and ` +
            'suppressed its own copy so the evidence is not reported twice.',
        ],
      }
    }),
    suppressed,
  }
}

function summarise(checks: readonly CheckFinding[], suppressed: number): CheckSummary {
  const issues = checks.filter(finding => finding.weight === 'issue')
  return {
    issues: issues.length,
    generatorIssues: issues.filter(finding => finding.origin === 'generator').length,
    derivedIssues: issues.filter(finding => finding.origin === 'dashboard').length,
    verified: checks.filter(finding => finding.weight === 'verified').length,
    notes: checks.filter(finding => finding.weight === 'note').length,
    absent: checks.filter(finding => finding.weight === 'absent').length,
    suppressed,
    total: checks.length,
  }
}

function index(
  checks: readonly CheckFinding[]
): Pick<CheckRunResult, 'byId' | 'byPhaseId' | 'byConfigKey' | 'byTier'> {
  const byId: Record<string, CheckFinding> = {}
  const byPhaseId: Record<string, CheckFinding[]> = {}
  const byConfigKey: Record<string, CheckFinding[]> = {}
  const byTier: Record<ConfigTier, CheckFinding[]> = { lineage: [], notable: [], mismatch: [] }

  for (const finding of checks) {
    byId[finding.id] = finding
    if (finding.phaseId !== null) {
      byPhaseId[finding.phaseId] = [...(byPhaseId[finding.phaseId] ?? []), finding]
    }
    if (finding.configKey !== null) {
      byConfigKey[finding.configKey] = [...(byConfigKey[finding.configKey] ?? []), finding]
    }
    if (finding.tier !== null) byTier[finding.tier].push(finding)
  }

  return { byId, byPhaseId, byConfigKey, byTier }
}

export function runChecks(report: BuildReport): CheckRunResult {
  const produced: CheckFinding[] = []
  for (const rule of CHECK_RULES) produced.push(...rule.run(report))

  const { kept, suppressed } = deduplicate(produced)
  const checks = kept
    .map((finding, order) => ({ finding, order }))
    .sort(
      (a, b) => WEIGHT_ORDER[a.finding.weight] - WEIGHT_ORDER[b.finding.weight] || a.order - b.order
    )
    .map(entry => entry.finding)

  return {
    checks,
    summary: summarise(checks, suppressed.length),
    suppressed,
    ...index(checks),
  }
}

/**
 * Memoised per report object. Several components read the checks at once - the panel, a marker on
 * every phase node, a marker beside every config value - and the report itself is already memoised
 * per fixture state, so keying on its identity means the rules run once per report rather than once
 * per component.
 */
const cache = new WeakMap<BuildReport, CheckRunResult>()

export function runChecksCached(report: BuildReport): CheckRunResult {
  const cached = cache.get(report)
  if (cached !== undefined) return cached
  const result = runChecks(report)
  cache.set(report, result)
  return result
}
