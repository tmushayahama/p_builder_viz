/**
 * The `progress` section: phases, steps, attempts, the frontier and the holes.
 *
 * The frontier is the highest phase index with any completed step. A phase behind the frontier
 * that never finished is a HOLE - a distinct status, not a wording choice - because on this
 * fixture the frontier is phase 12 while phase 2 is incomplete with five later phases complete.
 * Calling the earliest incomplete phase "where the build stopped" would be wrong.
 *
 * Per-phase counters are recomputed from step statuses. The generator's own `done`/`total` are
 * kept as `declaredDone`/`declaredTotal` and compared, because a phase reading 3/5 with five
 * `done` steps is a shape the real generator would never emit and it makes the frontier
 * derivation nonsense.
 */

import { buildStepId } from '../anchors'
import {
  asArray,
  asInteger,
  asNonEmptyString,
  asRecord,
  asStringArray,
  isRecord,
  pickUnknown,
  slugify,
} from '../primitives'
import { availabilityFor } from '../status'
import { makeMeta } from '../notes'
import { parseStepStatus } from '../status'
import {
  ABSENT_TIME_POINT,
  computeTiming,
  emptyTimingModel,
  timePointFromEpochSeconds,
  timePointFromUnknown,
} from '../timing'
import type { NoteSink } from '../notes'
import type { StepTimeInputs, TimingComputation } from '../timing'
import type {
  BuildPhase,
  BuildStep,
  PhaseStatus,
  PipelineHeadline,
  PipelineSummary,
  StepAttempt,
} from '../types'
import { describeDataShape, sectionBaseNotes } from './input'
import type { SectionInput } from './input'

const PHASE_KEYS = ['name', 'done', 'total', 'steps'] as const
const STEP_KEYS = [
  'goal',
  'status',
  'mtime',
  'attempts',
  'started_at',
  'ended_at',
  'job_id',
] as const

const EMPTY_PHASE_STATUS_COUNTS: Record<PhaseStatus, number> = {
  complete: 0,
  active: 0,
  hole: 0,
  pending: 0,
  blocked: 0,
}

/**
 * Phase ids, read without building the whole pipeline. `parse` needs them before it can resolve
 * section bindings, which the phases themselves then carry.
 */
export function readPhaseIds(section: SectionInput): string[] {
  const phases = asArray(section.dataRecord?.phases)
  const used = new Set<string>()
  const ids: string[] = []
  phases.forEach((phase, index) => {
    const name = asNonEmptyString(asRecord(phase)?.name) ?? `Phase ${index + 1}`
    let id = slugify(name)
    let suffix = 2
    while (used.has(id)) {
      id = `${slugify(name)}-${suffix}`
      suffix += 1
    }
    used.add(id)
    ids.push(id)
  })
  return ids
}

function readAttempts(raw: unknown, sink: NoteSink, scope: string): StepAttempt[] {
  return asArray(raw).map((entry, index) => {
    const record = asRecord(entry)
    if (record === null) {
      sink.add('warning', scope, `Attempt ${index + 1} is not an object; kept as raw evidence.`)
    }
    return {
      index,
      status: parseStepStatus(record?.status),
      startedAt: timePointFromUnknown(record?.started_at),
      endedAt: timePointFromUnknown(record?.ended_at),
      jobId: asNonEmptyString(record?.job_id),
      logReference:
        asNonEmptyString(record?.log_reference) ??
        asNonEmptyString(record?.log) ??
        asNonEmptyString(record?.log_path),
      reason: asNonEmptyString(record?.reason) ?? asNonEmptyString(record?.message),
      raw: entry,
    }
  })
}

export interface PipelineExtraction {
  pipeline: PipelineSummary
  timing: TimingComputation
}

export function extractPipeline(
  section: SectionInput,
  sink: NoteSink,
  phaseSectionIds: (phaseId: string) => string[]
): PipelineExtraction {
  const scope = `section:${section.sectionId}`
  const hasData = section.dataRecord !== null
  const notes = sectionBaseNotes(section, sink, 'pipeline progress')

  const meta = makeMeta({
    availability: availabilityFor(section.status, hasData),
    sectionId: section.sectionId,
    message: section.message,
    status: section.status,
    notes,
  })

  const rawPhases = asArray(section.dataRecord?.phases)
  const phaseIds = readPhaseIds(section)

  /* Pass 1: steps and their time inputs, in declared order. */
  const timeInputs: StepTimeInputs[] = []
  interface StepSeed {
    phaseIndex: number
    step: Omit<BuildStep, 'timing'>
  }
  const seeds: StepSeed[] = []
  let declaredIndex = 0

  rawPhases.forEach((rawPhase, phaseIndex) => {
    const phaseRecord = asRecord(rawPhase)
    if (phaseRecord === null) {
      sink.add(
        'warning',
        scope,
        `Phase ${phaseIndex + 1} is not an object; it contributes no steps.`,
        describeDataShape(rawPhase)
      )
    }
    const phaseId = phaseIds[phaseIndex]
    const rawSteps = asArray(phaseRecord?.steps)
    const usedStepIds = new Set<string>()

    rawSteps.forEach((rawStep, indexInPhase) => {
      const stepRecord = asRecord(rawStep)
      if (stepRecord === null) {
        sink.add(
          'warning',
          scope,
          `Step ${indexInPhase + 1} of phase "${phaseId}" is not an object.`,
          describeDataShape(rawStep)
        )
      }
      const goal = asNonEmptyString(stepRecord?.goal) ?? `step_${indexInPhase + 1}`
      let id = buildStepId(phaseId, goal)
      let suffix = 2
      while (usedStepIds.has(id)) {
        id = `${buildStepId(phaseId, goal)}-${suffix}`
        suffix += 1
      }
      usedStepIds.add(id)

      const status = parseStepStatus(stepRecord?.status)
      if (status.isUnknown && status.raw !== null) {
        sink.add(
          'info',
          scope,
          `Step "${goal}" reports an unrecognised status; it is shown verbatim.`,
          status.raw
        )
      }
      const attempts = readAttempts(stepRecord?.attempts, sink, scope)
      const artifactAt = timePointFromEpochSeconds(stepRecord?.mtime)
      const startedAt = timePointFromUnknown(stepRecord?.started_at)
      const endedAt = timePointFromUnknown(stepRecord?.ended_at)
      const jobId = asNonEmptyString(stepRecord?.job_id)

      if (status.kind === 'done' && !artifactAt.present) {
        sink.add('warning', scope, `Step "${goal}" is done but carries no artifact mtime.`)
      }

      timeInputs.push({
        id,
        goal,
        phaseId,
        declaredIndex,
        isComplete: status.kind === 'done',
        artifactAt,
        startedAt,
        endedAt,
        jobId,
      })

      seeds.push({
        phaseIndex,
        step: {
          id,
          goal,
          phaseId,
          phaseIndex,
          indexInPhase,
          declaredIndex,
          status,
          isComplete: status.kind === 'done',
          attempts,
          attemptCount: attempts.length,
          hasFailedAttempt: attempts.some(attempt => attempt.status.kind === 'failed'),
          unknownFields: pickUnknown(stepRecord, STEP_KEYS),
        },
      })
      declaredIndex += 1
    })
  })

  const timing =
    timeInputs.length > 0
      ? computeTiming(timeInputs, meta)
      : {
          model: emptyTimingModel(meta),
          stepTiming: new Map(),
          phaseTiming: new Map(),
          newestArtifactStepId: null,
        }

  const steps: BuildStep[] = seeds.map(seed => ({
    ...seed.step,
    timing:
      timing.stepTiming.get(seed.step.id) ??
      ({
        seconds: null,
        provenance: 'unavailable',
        kind: 'none',
        label: 'Timing unavailable',
        clampedFromNegative: false,
        artifactAt: ABSENT_TIME_POINT,
        startedAt: ABSENT_TIME_POINT,
        endedAt: ABSENT_TIME_POINT,
        jobId: null,
        inferredFromStepId: null,
        potentiallyConcurrent: false,
        declaredDeltaSeconds: null,
        declaredOutOfOrder: false,
      } as BuildStep['timing']),
  }))

  /* Pass 2: phases, then the frontier, then statuses that depend on it. */
  const stepsByPhase = new Map<number, BuildStep[]>()
  seeds.forEach((seed, index) => {
    const list = stepsByPhase.get(seed.phaseIndex) ?? []
    list.push(steps[index])
    stepsByPhase.set(seed.phaseIndex, list)
  })

  interface PhaseSeed {
    id: string
    index: number
    name: string
    declaredDone: number | null
    declaredTotal: number | null
    steps: BuildStep[]
    completedSteps: number
    totalSteps: number
  }

  const phaseSeeds: PhaseSeed[] = rawPhases.map((rawPhase, phaseIndex) => {
    const phaseRecord = asRecord(rawPhase)
    const phaseSteps = stepsByPhase.get(phaseIndex) ?? []
    return {
      id: phaseIds[phaseIndex],
      index: phaseIndex,
      name: asNonEmptyString(phaseRecord?.name) ?? `Phase ${phaseIndex + 1}`,
      declaredDone: asInteger(phaseRecord?.done),
      declaredTotal: asInteger(phaseRecord?.total),
      steps: phaseSteps,
      completedSteps: phaseSteps.filter(step => step.isComplete).length,
      totalSteps: phaseSteps.length,
    }
  })

  let frontierIndex: number | null = null
  for (const phase of phaseSeeds) {
    if (phase.completedSteps > 0) frontierIndex = phase.index
  }

  const failedBeforeFrontier = phaseSeeds.some(
    phase =>
      (frontierIndex === null || phase.index <= frontierIndex) &&
      phase.steps.some(step => step.status.kind === 'failed' || step.hasFailedAttempt)
  )

  const phaseStatusCounts: Record<PhaseStatus, number> = { ...EMPTY_PHASE_STATUS_COUNTS }

  const phases: BuildPhase[] = phaseSeeds.map(seed => {
    const complete = seed.totalSteps > 0 && seed.completedSteps === seed.totalSteps
    let status: PhaseStatus
    if (complete) status = 'complete'
    else if (seed.totalSteps === 0) {
      status = 'pending'
      sink.add(
        'warning',
        scope,
        `Phase "${seed.name}" declares no steps, so its status cannot be derived from step data.`
      )
    } else if (frontierIndex === null) status = 'pending'
    else if (seed.index === frontierIndex) status = 'active'
    else if (seed.index < frontierIndex) status = 'hole'
    else if (failedBeforeFrontier && seed.completedSteps === 0) status = 'blocked'
    else status = 'pending'

    phaseStatusCounts[status] += 1

    const countersConsistent =
      (seed.declaredDone === null || seed.declaredDone === seed.completedSteps) &&
      (seed.declaredTotal === null || seed.declaredTotal === seed.totalSteps)
    if (!countersConsistent) {
      sink.add(
        'warning',
        scope,
        `Phase "${seed.name}" reports ${seed.declaredDone}/${seed.declaredTotal} but its steps ` +
          `say ${seed.completedSteps}/${seed.totalSteps}; the step statuses are used.`
      )
    }

    return {
      id: seed.id,
      index: seed.index,
      name: seed.name,
      status,
      declaredDone: seed.declaredDone,
      declaredTotal: seed.declaredTotal,
      completedSteps: seed.completedSteps,
      totalSteps: seed.totalSteps,
      countersConsistent,
      isFrontier: frontierIndex !== null && seed.index === frontierIndex,
      isHole: status === 'hole',
      hasFailure: seed.steps.some(step => step.status.kind === 'failed' || step.hasFailedAttempt),
      steps: seed.steps,
      incompleteSteps: seed.steps.filter(step => !step.isComplete).map(step => step.id),
      timing: timing.phaseTiming.get(seed.id) ?? {
        seconds: null,
        provenance: 'unavailable',
        kind: 'none',
        label: 'Timing unavailable',
        clampedFromNegative: false,
        firstArtifactAt: ABSENT_TIME_POINT,
        lastArtifactAt: ABSENT_TIME_POINT,
        artifactCount: 0,
        potentiallyConcurrent: false,
      },
      sectionIds: phaseSectionIds(seed.id),
      unknownStatusValues: [
        ...new Set(
          seed.steps
            .filter(step => step.status.isUnknown && step.status.raw !== null)
            .map(step => step.status.raw as string)
        ),
      ],
    }
  })

  const headlineRecord = asRecord(section.dataRecord?.headline)
  const declaredHeadline: PipelineHeadline = {
    phasesComplete: asInteger(headlineRecord?.phases_complete),
    stepsComplete: asInteger(headlineRecord?.steps_complete),
    stepsTotal: asInteger(headlineRecord?.steps_total),
  }
  const computedHeadline: PipelineHeadline = {
    phasesComplete: phases.filter(phase => phase.status === 'complete').length,
    stepsComplete: steps.filter(step => step.isComplete).length,
    stepsTotal: steps.length,
  }
  const headlineConsistent =
    (declaredHeadline.phasesComplete === null ||
      declaredHeadline.phasesComplete === computedHeadline.phasesComplete) &&
    (declaredHeadline.stepsComplete === null ||
      declaredHeadline.stepsComplete === computedHeadline.stepsComplete) &&
    (declaredHeadline.stepsTotal === null ||
      declaredHeadline.stepsTotal === computedHeadline.stepsTotal)
  if (!headlineConsistent) {
    sink.add(
      'warning',
      scope,
      'The progress headline disagrees with the step statuses; the step statuses are used.'
    )
  }

  const frontier = frontierIndex === null ? null : (phases[frontierIndex] ?? null)

  const warnings = asStringArray(section.dataRecord?.warnings)
  const unknownPhaseFields = rawPhases
    .filter(isRecord)
    .flatMap(phase => Object.keys(pickUnknown(phase as Record<string, unknown>, PHASE_KEYS)))
  if (unknownPhaseFields.length > 0) {
    sink.add(
      'info',
      scope,
      'Phases carry fields this model does not read; they remain available on the raw report.',
      [...new Set(unknownPhaseFields)].join(', ')
    )
  }

  const pipeline: PipelineSummary = {
    ...meta,
    phases,
    steps,
    frontierIndex,
    frontierPhaseId: frontier?.id ?? null,
    frontierPhaseName: frontier?.name ?? null,
    holes: phases.filter(phase => phase.isHole),
    phaseStatusCounts,
    declaredHeadline,
    computedHeadline,
    headlineConsistent,
    warnings,
  }

  return { pipeline, timing }
}

/** Text a view can show for a step's declared position, kept here so wording stays in one place. */
export function stepPositionLabel(step: BuildStep): string {
  return `step ${step.indexInPhase + 1} of its phase (declared position ${step.declaredIndex + 1})`
}
