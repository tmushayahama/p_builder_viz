import { UNATTACHED_PHASE_ID, UNATTACHED_PHASE_NAME, parseAnchor } from '@/features/build/model'
import type {
  BuildPhase,
  BuildReport,
  GeneratorWarning,
  ReportRegistryEntry,
} from '@/features/build/model'
import type { StatusKey } from '@/@panther.core/vocabulary'
import { rendererKeyFor } from '@/features/reports/registry'

/**
 * The spine's own reading of the report: what the nodes are, which reports hang from each phase,
 * which findings belong to which phase, and where a deep link points.
 *
 * Pure, so the frontier/hole logic and the report binding are testable without a DOM. Nothing
 * here re-derives a fact the model already computed - `frontierIndex`, `isHole` and the section
 * bindings all come from the model, and this module only arranges them for the view.
 */

/* -- Spine nodes -------------------------------------------------------------------------- */

export type SpineNodeKind = 'phase' | 'unattached'

export interface SpineNode {
  kind: SpineNodeKind
  id: string
  name: string
  /** Declared index for a phase; `null` for the synthetic node at the end. */
  index: number | null
  phase: BuildPhase | null
  /** Sections that hang from this node and have no other home. */
  reportCount: number
}

/**
 * The declared phases, then Unattached reports.
 *
 * The synthetic node is appended even when it is empty, because a reviewer needs to be able to
 * establish that nothing was left out - an absent node proves nothing.
 */
export function buildSpineNodes(report: BuildReport): SpineNode[] {
  const nodes: SpineNode[] = report.pipeline.phases.map(phase => ({
    kind: 'phase' as const,
    id: phase.id,
    name: phase.name,
    index: phase.index,
    phase,
    reportCount: primaryReportsFor(report, phase.id).length,
  }))

  nodes.push({
    kind: 'unattached',
    id: UNATTACHED_PHASE_ID,
    name: UNATTACHED_PHASE_NAME,
    index: null,
    phase: null,
    reportCount: unattachedReports(report).length,
  })

  return nodes
}

/* -- Status vocabulary ------------------------------------------------------------------- */

/**
 * The frontier gets its own key rather than reusing `active`, because "how far the build has
 * genuinely progressed" is the question the spine exists to answer and it deserves its own word.
 */
export function phaseStatusKey(phase: BuildPhase): StatusKey {
  return phase.isFrontier ? 'frontier' : phase.status
}

export function phaseCounter(phase: BuildPhase): string {
  return `${phase.completedSteps}/${phase.totalSteps}`
}

/** One line explaining what this phase's state means, in the spine's own words. */
export function phaseInterpretation(phase: BuildPhase, phaseCount: number): string {
  const later = phaseCount - phase.index - 1
  switch (phase.status) {
    case 'complete':
      return 'Every step in this phase produced its artifact.'
    case 'active':
      return (
        'This is the build frontier: the furthest phase with completed work, and where the ' +
        'build currently stands.'
      )
    case 'hole':
      return (
        `Incomplete, but ${later} later ${later === 1 ? 'phase' : 'phases'} carried on past it. ` +
        'This is a hole behind the frontier, not the point where the build stopped.'
      )
    case 'blocked':
      return 'Nothing here has started and an earlier step failed, so this phase cannot proceed.'
    default:
      return 'Not started: the build has not reached this phase yet.'
  }
}

/* -- Report binding ---------------------------------------------------------------------- */

/**
 * Sections this phase is the primary home for. De-duplicated by RENDERER, because the release
 * comparison is assembled from two sections that both bind to the same phase and must not be
 * mounted twice.
 */
export function primaryReportsFor(report: BuildReport, phaseId: string): ReportRegistryEntry[] {
  const seen = new Set<string>()
  return report.reports.filter(entry => {
    if (entry.primaryPhaseId !== phaseId) return false
    const key = rendererKeyFor(entry.sectionId)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Sections that contribute to this phase but are shown in full elsewhere. Surfaced as
 * cross-references so one report visibly serves several phases without the same view appearing
 * on five nodes.
 */
export function contributingReportsFor(
  report: BuildReport,
  phaseId: string
): ReportRegistryEntry[] {
  return report.reports.filter(
    entry => entry.primaryPhaseId !== phaseId && entry.phaseIds.includes(phaseId)
  )
}

/** Sections bound to no phase: unmapped, unknown, or pointing at a phase nobody declared. */
export function unattachedReports(report: BuildReport): ReportRegistryEntry[] {
  return report.reports.filter(entry => entry.placement === 'unattached')
}

/** Where a contributing section is shown in full, for the cross-reference wording. */
export function primaryPhaseNameOf(report: BuildReport, entry: ReportRegistryEntry): string | null {
  if (entry.placement === 'preamble') return 'the build preamble'
  if (entry.placement === 'pipeline') return 'the pipeline spine'
  const phase = report.pipeline.phases.find(candidate => candidate.id === entry.primaryPhaseId)
  return phase?.name ?? null
}

/* -- Findings anchored to a phase -------------------------------------------------------- */

export interface PhaseFinding {
  warning: GeneratorWarning
  /** `step` when the warning names a step goal, `section` when it came in through its section. */
  via: 'step' | 'section'
  stepId: string | null
  stepGoal: string | null
}

/**
 * Attributes each generator warning to the phase it concerns.
 *
 * Two routes, in order of strength. A warning whose text names a step goal is attributed to that
 * step's phase - this is how the fixture's stale-artifact warning reaches Library export products,
 * which is the phase a reviewer would look for it on. Otherwise the warning goes to the phase its
 * section is bound to. A warning matching neither stays build-wide and is shown in the preamble
 * summary rather than being forced onto an arbitrary node.
 */
export function attributeWarningsToPhases(report: BuildReport): Map<string, PhaseFinding[]> {
  const byPhase = new Map<string, PhaseFinding[]>()
  const add = (phaseId: string, finding: PhaseFinding) => {
    const list = byPhase.get(phaseId)
    if (list === undefined) byPhase.set(phaseId, [finding])
    else list.push(finding)
  }

  // Longest goal first, so a short goal cannot claim a warning that names a longer one
  // containing it.
  const goals = [...report.pipeline.steps]
    .filter(step => step.goal.length >= 4)
    .sort((a, b) => b.goal.length - a.goal.length)

  for (const warning of report.generatorWarnings) {
    const matchedPhases = new Set<string>()
    for (const step of goals) {
      if (!warning.message.includes(step.goal)) continue
      if (matchedPhases.has(step.phaseId)) continue
      matchedPhases.add(step.phaseId)
      add(step.phaseId, { warning, via: 'step', stepId: step.id, stepGoal: step.goal })
    }
    if (matchedPhases.size > 0) continue

    const entry = report.reports.find(candidate => candidate.sectionId === warning.sectionId)
    const phaseId = entry?.primaryPhaseId ?? null
    if (phaseId !== null) {
      add(phaseId, { warning, via: 'section', stepId: null, stepGoal: null })
    }
  }

  return byPhase
}

/** Warnings this module could not tie to any phase, so the preamble can still show them. */
export function buildWideWarnings(report: BuildReport): GeneratorWarning[] {
  const attributed = new Set<string>()
  for (const findings of attributeWarningsToPhases(report).values()) {
    for (const finding of findings) attributed.add(finding.warning.id)
  }
  return report.generatorWarnings.filter(warning => !attributed.has(warning.id))
}

/**
 * Everything the spine marks a phase for beyond its status: a failure, a generator warning, a
 * counter the generator disagrees with itself about, or a step whose artifact predates the step
 * declared before it.
 */
export interface PhaseMarkers {
  warnings: PhaseFinding[]
  hasFailure: boolean
  countersInconsistent: boolean
  outOfOrderStepIds: string[]
  unknownStatusValues: string[]
}

export function phaseMarkers(
  phase: BuildPhase,
  warningsByPhase: Map<string, PhaseFinding[]>
): PhaseMarkers {
  return {
    warnings: warningsByPhase.get(phase.id) ?? [],
    hasFailure: phase.hasFailure,
    countersInconsistent: !phase.countersConsistent,
    outOfOrderStepIds: phase.steps
      .filter(step => step.timing.declaredOutOfOrder)
      .map(step => step.id),
    unknownStatusValues: phase.unknownStatusValues,
  }
}

export function markerCount(markers: PhaseMarkers): number {
  return (
    markers.warnings.length +
    (markers.hasFailure ? 1 : 0) +
    (markers.countersInconsistent ? 1 : 0) +
    markers.outOfOrderStepIds.length +
    markers.unknownStatusValues.length
  )
}

/* -- Deep links -------------------------------------------------------------------------- */

export type PhaseSelectionTarget = number | 'unattached'

/**
 * Resolves a deep-link anchor to the spine node that has to be selected for its target to exist.
 *
 * A step, a report or a config value is only mounted while its owning node is selected, so a link
 * that only scrolled would land on nothing. `null` means the anchor does not belong to a node -
 * a species or a check - and the current selection stands.
 */
export function resolveSelectionForAnchor(
  report: BuildReport,
  anchor: string
): PhaseSelectionTarget | null {
  const parsed = parseAnchor(anchor)
  if (parsed === null) return null
  const phases = report.pipeline.phases

  if (parsed.kind === 'phase') {
    const phaseId = parsed.parts.join('--')
    if (phaseId === UNATTACHED_PHASE_ID) return 'unattached'
    const phase = phases.find(candidate => candidate.id === phaseId)
    return phase?.index ?? null
  }

  if (parsed.kind === 'step') {
    const stepId = parsed.parts.join('--')
    const step = report.pipeline.steps.find(candidate => candidate.id === stepId)
    return step?.phaseIndex ?? null
  }

  if (parsed.kind === 'report') {
    const slug = parsed.parts.join('--')
    const entry = report.reports.find(
      candidate => candidate.sectionId === slug || candidate.sectionId.replace(/_/g, '-') === slug
    )
    if (entry === undefined) return null
    if (entry.placement === 'unattached') return 'unattached'
    const phase = phases.find(candidate => candidate.id === entry.primaryPhaseId)
    return phase?.index ?? null
  }

  return null
}
