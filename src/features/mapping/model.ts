/**
 * Presentation model for the mapping progression.
 *
 * The derived report already carries the hard part - `byMechanism` exposes BOTH a `cumulative`
 * total and a per-stage `delta`, so no view has to difference the cumulative series itself. What
 * this module adds is the reading: which stages actually changed something, which mechanism the
 * change is booked to, how far the total-sequence envelope narrowed, and which declared pipeline
 * step produced each stage's mapping file.
 *
 * Two facts drive the shape of everything here.
 *
 * The cumulative series is nearly flat. `ID` sits at ~1.536 M for all fourteen stages, `BLAST` at
 * ~84 K after stage three and `RECLUSTER_NEW` at ~2.5 K throughout, so a stacked view of the
 * cumulative totals is dominated by one unchanging band: it answers "what is the composition, and
 * how much is unassigned" rather than "what changed". The per-stage deltas answer the second
 * question, which is why both series are built here and drawn as two charts rather than one.
 *
 * The first stage has no predecessor, so its mechanism delta EQUALS its cumulative - 1,536,527 for
 * `ID`. That is an opening balance, not a change, and including it in the delta chart would set
 * the domain at 1.5 M and flatten every real movement (the largest of which is 182,097).
 * `deltaStages` therefore starts at the second stage and the baseline is stated in words instead.
 */

import { niceTicks } from '@/@panther.core/charts'
import { createCategoricalScale } from '@/@panther.core/theme/tokens'
import type { CategoricalScale } from '@/@panther.core/theme/tokens'
import { ABSENT_MARK } from '@/@panther.core/vocabulary'
import type { BuildPhase, BuildReport, BuildStep, MappingSummary } from '@/features/build/model'

/* -- Labels ------------------------------------------------------------------------------- */

/**
 * Abbreviations for the axis only. The report's own stage name stays on the tooltip, in the table
 * twin and in the detail table, because the mapping file and the step goal are matched against it.
 */
const STAGE_LABELS: Readonly<Record<string, string>> = {
  id_pombe_syms: 'id pombe',
  fams_corrected: 'fams corr',
  post_giga: 'post giga',
}

export function shortStageLabel(stage: string): string {
  const direct = STAGE_LABELS[stage]
  if (direct !== undefined) return direct
  const pass = /^pass(\d+)_(.+)$/.exec(stage)
  if (pass !== null) {
    const body = pass[2] === 'single_genome' ? '1-genome' : pass[2].replace(/_/g, ' ')
    return `${body} ${pass[1]}`
  }
  return stage.replace(/_/g, ' ')
}

/** Axis and legend figures. Full precision belongs in the table twin, never on an axis tick. */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return ABSENT_MARK
  const magnitude = Math.abs(value)
  if (magnitude >= 1_000_000) {
    const millions = value / 1_000_000
    return `${Number(millions.toFixed(millions % 1 === 0 ? 0 : 1))}M`
  }
  if (magnitude >= 1_000) {
    const thousands = value / 1_000
    return `${Number(thousands.toFixed(magnitude >= 10_000 ? 0 : 1))}k`
  }
  return value.toLocaleString()
}

export function formatSigned(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return ABSENT_MARK
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${Math.abs(value).toLocaleString()}`
}

/**
 * Ticks for the signed delta axis: rounded steps over the gain side, zero, and the exact floor.
 *
 * Rounding the negative end to a whole step would give a -50,000 floor for a -4,030 loss and
 * squash the loss to a couple of pixels, so the floor keeps its real value and is labelled
 * exactly. Zero is always present, because it is the line the sign is read from.
 */
export function deltaAxisTicks(domain: readonly [number, number], count = 5): number[] {
  const [min, max] = domain
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0]
  const positive = niceTicks(0, Math.max(0, max), count).filter(tick => tick >= 0)
  const ticks = positive.includes(0) ? [...positive] : [0, ...positive]
  if (min < 0) ticks.unshift(min)
  return ticks
}

/* -- Stage rows --------------------------------------------------------------------------- */

/** The declared step whose goal artifact is a stage's mapping file. */
export interface StageStep {
  stepId: string
  goal: string
  phaseId: string
  phaseName: string
  isComplete: boolean
  statusLabel: string
}

export type StageAttribution =
  | { kind: 'matched'; step: StageStep }
  /** Several declared goals carry this filename; the previous-library rebuild reuses some. */
  | { kind: 'ambiguous'; candidates: StageStep[] }
  | { kind: 'none' }

export interface StageMechanismValue {
  mechanism: string
  label: string
  cumulative: number | null
  delta: number | null
  isFirstAppearance: boolean
}

export interface StageRow {
  id: string
  /** The report's own stage name. */
  stage: string
  /** Abbreviated, for an axis tick. */
  label: string
  order: number | null
  mappingFile: string | null
  totalSequences: number | null
  assigned: number | null
  unassigned: number | null
  pctAssigned: number | null
  families: number | null
  assignedDelta: number | null
  totalSequencesDelta: number | null
  familiesDelta: number | null
  mechanisms: StageMechanismValue[]
  /** True for the first stage, whose mechanism deltas are its opening balance. */
  isBaseline: boolean
  attribution: StageAttribution
}

/* -- Changes worth annotating ------------------------------------------------------------- */

export type StageChangeKind = 'gain' | 'loss' | 'unchanged'

export interface StageChange {
  stageId: string
  stage: string
  label: string
  kind: StageChangeKind
  assignedDelta: number
  totalSequencesDelta: number | null
  familiesDelta: number | null
  /** Only the mechanisms that actually moved, largest magnitude first. */
  mechanisms: { mechanism: string; label: string; delta: number }[]
  isLargestGain: boolean
  isLargestLoss: boolean
}

export interface EnvelopeLoss {
  stageId: string
  label: string
  loss: number
}

export interface MappingView {
  summary: MappingSummary
  stages: StageRow[]
  /** Stages after the baseline: the ones a per-stage change can be measured for. */
  deltaStages: StageRow[]
  series: { mechanism: string; label: string; known: boolean }[]
  seriesKeys: string[]
  scale: CategoricalScale
  /** Largest total-sequence count across the stages: the envelope's domain. */
  envelopeMax: number
  /** Domain for the per-stage delta chart, always spanning zero. */
  deltaDomain: [number, number]
  changes: StageChange[]
  gains: StageChange[]
  losses: StageChange[]
  unchanged: StageChange[]
  /** Stage ids whose delta bar earns a direct label: the largest gains, not every bar. */
  labelledStageIds: string[]
  /** Stage ids worth emphasising on the axis: the labelled gains plus the largest loss. */
  emphasisStageIds: string[]
  pctSeries: (number | null)[]
  familySeries: (number | null)[]
  /** Sequences the envelope lost between the first stage and the last. */
  envelopeLoss: number | null
  envelopeLosses: EnvelopeLoss[]
  /** True when at least one stage moved the assigned count. */
  hasChange: boolean
  /**
   * Set when a stage shares its name with a mechanism the brief expects but the report does not
   * have. On this fixture that is `exten`: the gain is real and is booked to HMM scoring.
   */
  extensionNote: string | null
  /** The phase this report hangs from, so a hole behind the frontier can be stated here. */
  phase: BuildPhase | null
  incompleteStepGoals: string[]
  /** Phases after this one that finished, which is what makes an incomplete phase a hole. */
  laterCompletePhaseCount: number
}

function stageStepOf(step: BuildStep, phaseName: string): StageStep {
  return {
    stepId: step.id,
    goal: step.goal,
    phaseId: step.phaseId,
    phaseName,
    isComplete: step.isComplete,
    statusLabel: step.status.label,
  }
}

/**
 * Matches a mapping file to the declared step that produces it.
 *
 * An exact goal match wins outright, because the previous-library rebuild declares goals with the
 * same basename under a `prev_lib_rebuilt/` prefix and attributing a current-build stage to that
 * step would be wrong. A basename match is accepted only when it is unique; otherwise the
 * ambiguity is reported rather than resolved by guessing.
 */
export function attributeStage(
  mappingFile: string | null,
  steps: readonly BuildStep[],
  phaseNameOf: (phaseId: string) => string
): StageAttribution {
  if (mappingFile === null) return { kind: 'none' }

  const exact = steps.filter(step => step.goal === mappingFile)
  if (exact.length === 1) {
    return { kind: 'matched', step: stageStepOf(exact[0], phaseNameOf(exact[0].phaseId)) }
  }

  const suffix = `/${mappingFile}`
  const candidates = steps.filter(step => step.goal === mappingFile || step.goal.endsWith(suffix))
  if (candidates.length === 0) return { kind: 'none' }
  if (candidates.length === 1) {
    return { kind: 'matched', step: stageStepOf(candidates[0], phaseNameOf(candidates[0].phaseId)) }
  }
  return {
    kind: 'ambiguous',
    candidates: candidates.map(step => stageStepOf(step, phaseNameOf(step.phaseId))),
  }
}

function toStageChange(row: StageRow): StageChange | null {
  if (row.assignedDelta === null) return null
  const mechanisms = row.mechanisms
    .filter(entry => entry.delta !== null && entry.delta !== 0)
    .map(entry => ({
      mechanism: entry.mechanism,
      label: entry.label,
      delta: entry.delta as number,
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  return {
    stageId: row.id,
    stage: row.stage,
    label: row.label,
    kind: row.assignedDelta > 0 ? 'gain' : row.assignedDelta < 0 ? 'loss' : 'unchanged',
    assignedDelta: row.assignedDelta,
    totalSequencesDelta: row.totalSequencesDelta,
    familiesDelta: row.familiesDelta,
    mechanisms,
    isLargestGain: false,
    isLargestLoss: false,
  }
}

export function buildMappingView(report: BuildReport): MappingView {
  const summary = report.mapping
  const phaseNames = new Map(report.pipeline.phases.map(phase => [phase.id, phase.name]))
  const phaseNameOf = (phaseId: string) => phaseNames.get(phaseId) ?? phaseId
  const steps = report.pipeline.steps

  const stages: StageRow[] = summary.stages.map((stage, index) => ({
    id: stage.id,
    stage: stage.stage,
    label: shortStageLabel(stage.stage),
    order: stage.order,
    mappingFile: stage.mappingFile,
    totalSequences: stage.totalSequences,
    assigned: stage.assigned,
    unassigned: stage.unassigned,
    pctAssigned: stage.pctAssigned ?? stage.recomputedPctAssigned,
    families: stage.families,
    assignedDelta: stage.assignedDelta,
    totalSequencesDelta: stage.totalSequencesDelta,
    familiesDelta: stage.familiesDelta,
    mechanisms: stage.byMechanism.map(entry => {
      const slot = summary.mechanismOrder.find(candidate => candidate.mechanism === entry.mechanism)
      return {
        mechanism: entry.mechanism,
        label: slot?.label ?? entry.mechanism,
        cumulative: entry.cumulative,
        delta: entry.delta,
        isFirstAppearance: entry.isFirstAppearance,
      }
    }),
    isBaseline: index === 0,
    attribution: attributeStage(stage.mappingFile, steps, phaseNameOf),
  }))

  const seriesKeys = summary.mechanismOrder.map(slot => slot.mechanism)
  const deltaStages = stages.slice(1)

  const changes = deltaStages
    .map(row => toStageChange(row))
    .filter((change): change is StageChange => change !== null)

  const gains = changes
    .filter(change => change.kind === 'gain')
    .sort((a, b) => b.assignedDelta - a.assignedDelta)
  const losses = changes
    .filter(change => change.kind === 'loss')
    .sort((a, b) => a.assignedDelta - b.assignedDelta)
  const unchanged = changes.filter(change => change.kind === 'unchanged')

  if (gains.length > 0) gains[0].isLargestGain = true
  if (losses.length > 0) losses[0].isLargestLoss = true

  const envelopeMax = stages.reduce(
    (max, row) =>
      row.totalSequences !== null && row.totalSequences > max ? row.totalSequences : max,
    0
  )

  // Positives stack up from zero and negatives stack down, so the domain has to cover the two
  // signed sums per stage rather than the largest individual segment.
  let deltaMax = 0
  let deltaMin = 0
  for (const row of deltaStages) {
    let positive = 0
    let negative = 0
    for (const entry of row.mechanisms) {
      if (entry.delta === null) continue
      if (entry.delta > 0) positive += entry.delta
      else negative += entry.delta
    }
    if (positive > deltaMax) deltaMax = positive
    if (negative < deltaMin) deltaMin = negative
  }

  // Gains only. A loss bar's label would land in the axis band underneath the plot, and the
  // largest loss is already called out in the annotations, the tooltip and the table twin.
  const labelledStageIds = gains.slice(0, 3).map(change => change.stageId)
  const emphasisStageIds = [
    ...labelledStageIds,
    ...losses.slice(0, 1).map(change => change.stageId),
  ]

  const envelopeLosses: EnvelopeLoss[] = deltaStages
    .filter(row => row.totalSequencesDelta !== null && row.totalSequencesDelta < 0)
    .map(row => ({
      stageId: row.id,
      label: row.label,
      loss: Math.abs(row.totalSequencesDelta as number),
    }))

  const first = stages[0] ?? null
  const last = stages[stages.length - 1] ?? null
  const envelopeLoss =
    first === null || last === null || first.totalSequences === null || last.totalSequences === null
      ? null
      : first.totalSequences - last.totalSequences

  // The brief lists "extension" as an assignment mechanism; this report has a stage by that name
  // and no such mechanism, so the gain is booked elsewhere and the UI has to say where.
  const extensionStage = changes.find(
    change => /^exten/i.test(change.stage) && change.mechanisms.length > 0
  )
  const extensionMechanismExists = seriesKeys.some(key => /exten/i.test(key))
  const extensionNote =
    extensionStage === undefined || extensionMechanismExists
      ? null
      : `The ${extensionStage.stage} stage's ${formatSigned(
          extensionStage.assignedDelta
        )} is booked to ${extensionStage.mechanisms
          .map(entry => entry.label)
          .join(
            ' and '
          )}. This report has no separate extension mechanism, though the brief lists one.`

  const mappingReport = report.reports.find(entry => entry.sectionId === summary.sectionId) ?? null
  const phase =
    mappingReport === null
      ? null
      : (report.pipeline.phases.find(entry => entry.id === mappingReport.primaryPhaseId) ?? null)

  return {
    summary,
    stages,
    deltaStages,
    series: summary.mechanismOrder.map(slot => ({
      mechanism: slot.mechanism,
      label: slot.label,
      known: slot.known,
    })),
    seriesKeys,
    scale: createCategoricalScale(seriesKeys),
    envelopeMax,
    deltaDomain: [deltaMin, deltaMax],
    changes,
    gains,
    losses,
    unchanged,
    labelledStageIds,
    emphasisStageIds,
    pctSeries: stages.map(row => row.pctAssigned),
    familySeries: stages.map(row => row.families),
    envelopeLoss,
    envelopeLosses,
    hasChange: deltaMax > 0 || deltaMin < 0,
    extensionNote,
    phase,
    incompleteStepGoals:
      phase === null ? [] : phase.steps.filter(step => !step.isComplete).map(step => step.goal),
    laterCompletePhaseCount:
      phase === null
        ? 0
        : report.pipeline.phases.filter(
            entry => entry.index > phase.index && entry.status === 'complete'
          ).length,
  }
}
