/**
 * Report readings several rules need, computed once and shared.
 *
 * The point is that no rule re-derives a fact the model already established, and that two rules
 * describing the same value describe it identically: the phase a section belongs to, the words for
 * an anchor, and the active configuration entries with their `config.mk` line numbers all come
 * from here.
 */

import { formatCount } from '@/app/format'
import {
  configAnchor,
  phaseAnchor,
  reportAnchor,
  releaseTokenOf,
  stepAnchor,
} from '@/features/build/model'
import type { BuildReport, ConfigEntry, ConfigSummary } from '@/features/build/model'

export interface AnchorTarget {
  anchor: string
  anchorLabel: string
  phaseId?: string
  stepId?: string
  configKey?: string
}

/** The phase a report section hangs from, or `null` for a preamble/pipeline-level section. */
export function phaseIdForSection(report: BuildReport, sectionId: string): string | null {
  const entry = report.reports.find(candidate => candidate.sectionId === sectionId)
  return entry?.primaryPhaseId ?? null
}

function phaseName(report: BuildReport, phaseId: string | null): string | null {
  if (phaseId === null) return null
  return report.pipeline.phases.find(phase => phase.id === phaseId)?.name ?? null
}

/**
 * An anchor pointing at a report section, carrying the phase it is mounted under so a link both
 * selects the right spine node and lands on the section itself.
 */
export function sectionTarget(report: BuildReport, sectionId: string): AnchorTarget {
  const entry = report.reports.find(candidate => candidate.sectionId === sectionId) ?? null
  const phaseId = entry?.primaryPhaseId ?? null
  return {
    anchor: reportAnchor(sectionId),
    anchorLabel: entry?.title ?? sectionId,
    ...(phaseId === null ? {} : { phaseId }),
  }
}

export function phaseTarget(report: BuildReport, phaseId: string): AnchorTarget {
  return {
    anchor: phaseAnchor(phaseId),
    anchorLabel: phaseName(report, phaseId) ?? phaseId,
    phaseId,
  }
}

export function stepTarget(report: BuildReport, stepId: string): AnchorTarget | null {
  const step = report.pipeline.steps.find(candidate => candidate.id === stepId)
  if (step === undefined) return null
  return { anchor: stepAnchor(step.id), anchorLabel: step.goal, phaseId: step.phaseId, stepId }
}

export function configTarget(key: string): AnchorTarget {
  return { anchor: configAnchor(key), anchorLabel: key, configKey: key }
}

/* -- Configuration reading ---------------------------------------------------------------- */

export interface ActiveConfigEntry {
  key: string
  value: string
  /** 1-based line in the captured `config.mk`, when the value came from the file. */
  line: number | null
  /** The major release the value references, e.g. `19` for a `PANTHER19.0` path. */
  release: string | null
  /** True when the release token sits in a `PANTHER<n>` path element rather than a filename. */
  releaseInPath: boolean
}

const PANTHER_PATH = /PANTHER\d{1,2}/i

/**
 * Every active configuration key once, the generator's resolved value winning over the file's.
 *
 * Commented-out lines are deliberately excluded here - they are evidence for a finding, not
 * configuration in force - and are read straight from `config.commentedEntries` where needed.
 */
export function activeConfigEntries(config: ConfigSummary): ActiveConfigEntry[] {
  const byKey = new Map<string, ActiveConfigEntry>()
  const add = (entry: ConfigEntry) => {
    byKey.set(entry.key, {
      key: entry.key,
      value: entry.value,
      line: entry.line,
      release: releaseTokenOf(entry.value),
      releaseInPath: PANTHER_PATH.test(entry.value),
    })
  }
  for (const entry of config.fileEntries) add(entry)
  for (const entry of config.resolvedEntries) {
    const existing = byKey.get(entry.key)
    add({ ...entry, line: existing?.line ?? entry.line })
  }
  return [...byKey.values()]
}

/** The build's own major release as a number, from `PTHR_VERSION`. `null` when unresolved. */
export function currentMajorRelease(config: ConfigSummary): number | null {
  if (config.pantherVersion === null) return null
  const major = Number.parseInt(config.pantherVersion, 10)
  return Number.isFinite(major) ? major : null
}

/** A YYYY_MM release token, as QfO uses. Used to name what a data path actually carries. */
export function datedReleaseTokenOf(value: string): string | null {
  const match = /(\d{4}_\d{2})/.exec(value)
  return match === null ? null : match[1]
}

/* -- Wording ------------------------------------------------------------------------------ */

/** `15,797` with grouping and never a bare zero standing in for an absent measurement. */
export const count = formatCount

/** `a, b and c` - so a sentence naming three sources reads as a sentence. */
export function joinList(parts: readonly string[]): string {
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/** `1,736,983 (library.sequences)` - a figure with the report field it came from. */
export function sourcedValue(value: number | null, source: string): string {
  return `${count(value)} — ${source}`
}
