/**
 * Where a generator warning belongs.
 *
 * The generator emits strings. A string is not a finding until it points at something, so each
 * message is matched against the entities the report actually contains - step goals, mapping stage
 * names, oscodes, configuration keys - and anchored to the strongest match. Only if none matches
 * does it fall back to the section it came in through.
 *
 * Step attribution deliberately reuses `attributeWarningsToPhases` from the pipeline spine rather
 * than re-implementing the match. If the two disagreed, a warning would flag one phase on the spine
 * and link to another from the checks panel, and a reviewer would have no way to tell which was
 * right.
 */

import { configAnchor, reportAnchor, speciesAnchor, stepAnchor } from '@/features/build/model'
import type { BuildReport, GeneratorWarning } from '@/features/build/model'
import { attributeWarningsToPhases } from '@/features/pipeline/model'
import type { PhaseFinding } from '@/features/pipeline/model'

export type WarningMatch = 'step-goal' | 'stage' | 'oscode' | 'config-key' | 'section'

export interface WarningAnchor {
  anchor: string
  anchorLabel: string
  phaseId: string | null
  stepId: string | null
  oscode: string | null
  configKey: string | null
  matchedBy: WarningMatch
}

/**
 * The shortest token worth matching. Below this a match is coincidence: the mapping stage `id` and
 * the step goal `hmm` would otherwise claim every message containing those letters.
 */
const MIN_TOKEN_LENGTH = 5

/** One finding per warning id, from the spine's own attribution. */
export function indexPhaseFindings(report: BuildReport): Map<string, PhaseFinding> {
  const byWarning = new Map<string, PhaseFinding>()
  for (const findings of attributeWarningsToPhases(report).values()) {
    for (const finding of findings) {
      if (!byWarning.has(finding.warning.id)) byWarning.set(finding.warning.id, finding)
    }
  }
  return byWarning
}

/** A whole-token match, so `exten` does not match inside `extension`. */
function mentions(message: string, token: string): boolean {
  if (token.length < MIN_TOKEN_LENGTH) return false
  const index = message.indexOf(token)
  if (index < 0) return false
  const before = message[index - 1]
  const after = message[index + token.length]
  const isWordChar = (character: string | undefined) =>
    character !== undefined && /[A-Za-z0-9]/.test(character)
  return !isWordChar(before) && !isWordChar(after)
}

export function resolveWarningAnchor(
  report: BuildReport,
  warning: GeneratorWarning,
  phaseFinding: PhaseFinding | undefined
): WarningAnchor {
  if (phaseFinding !== undefined && phaseFinding.via === 'step' && phaseFinding.stepId !== null) {
    const step = report.pipeline.steps.find(candidate => candidate.id === phaseFinding.stepId)
    return {
      anchor: stepAnchor(phaseFinding.stepId),
      anchorLabel: phaseFinding.stepGoal ?? phaseFinding.stepId,
      phaseId: step?.phaseId ?? null,
      stepId: phaseFinding.stepId,
      oscode: null,
      configKey: null,
      matchedBy: 'step-goal',
    }
  }

  const stage = [...report.mapping.stages]
    .sort((a, b) => b.stage.length - a.stage.length)
    .find(candidate => mentions(warning.message, candidate.stage))
  if (stage !== undefined) {
    const entry = report.reports.find(candidate => candidate.sectionId === 'mapping')
    return {
      anchor: reportAnchor('mapping'),
      anchorLabel: `mapping stage ${stage.stage}`,
      phaseId: entry?.primaryPhaseId ?? null,
      stepId: null,
      oscode: null,
      configKey: null,
      matchedBy: 'stage',
    }
  }

  const oscode = report.species.records
    .map(record => record.oscode)
    .find(candidate => mentions(warning.message, candidate))
  if (oscode !== undefined) {
    return {
      anchor: speciesAnchor(oscode),
      anchorLabel: oscode,
      phaseId: null,
      stepId: null,
      oscode,
      configKey: null,
      matchedBy: 'oscode',
    }
  }

  const configKey = Object.keys(report.config.values)
    .sort((a, b) => b.length - a.length)
    .find(candidate => mentions(warning.message, candidate))
  if (configKey !== undefined) {
    return {
      anchor: configAnchor(configKey),
      anchorLabel: configKey,
      phaseId: null,
      stepId: null,
      oscode: null,
      configKey,
      matchedBy: 'config-key',
    }
  }

  const entry = report.reports.find(candidate => candidate.sectionId === warning.sectionId)
  return {
    anchor: warning.anchor,
    anchorLabel: entry?.title ?? warning.sectionId,
    phaseId: entry?.primaryPhaseId ?? null,
    stepId: null,
    oscode: null,
    configKey: null,
    matchedBy: 'section',
  }
}
