/**
 * The dual timing model.
 *
 * Artifact modification times are evidence of activity, not an execution log, so this module
 * keeps two orderings and never reconciles them:
 *
 *   - declared pipeline order, which the step list and the spine read
 *   - artifact time order, which the inferred timeline reads
 *
 * Every value carries a provenance of `measured | inferred | unavailable`. `measured` reads the
 * optional `started_at` / `ended_at` / `job_id` fields, which are absent from this fixture but
 * supported from day one so Slurm timing can take precedence later without a UI change.
 *
 * Two rules are load-bearing. Elapsed intervals are clamped at zero, because this fixture has two
 * out-of-order completed steps and naive subtraction produces a negative. And an inferred span is
 * labelled as artifact activity, never as measured runtime.
 */

import { asNumber, asString, roundTo } from './primitives'
import type {
  ArtifactCluster,
  Elapsed,
  OutOfOrderPair,
  PhaseTiming,
  StepTiming,
  SummaryMeta,
  TimePoint,
  TimingModel,
} from './types'

/** Artifacts landing this close together are treated as potentially concurrent, not sequential. */
export const CONCURRENCY_WINDOW_SECONDS = 300

export const ABSENT_TIME_POINT: TimePoint = { present: false, epochSeconds: null, iso: null }

export function timePointFromEpochSeconds(value: unknown): TimePoint {
  const seconds = asNumber(value)
  if (seconds === null) return ABSENT_TIME_POINT
  return {
    present: true,
    epochSeconds: seconds,
    iso: new Date(seconds * 1000).toISOString(),
  }
}

export function timePointFromIso(value: unknown): TimePoint {
  const text = asString(value)
  if (text === null || text.trim() === '') return ABSENT_TIME_POINT
  const millis = Date.parse(text.trim())
  if (!Number.isFinite(millis)) return ABSENT_TIME_POINT
  return { present: true, epochSeconds: millis / 1000, iso: new Date(millis).toISOString() }
}

/** Accepts either an epoch number or an ISO string, since generators differ on this. */
export function timePointFromUnknown(value: unknown): TimePoint {
  if (typeof value === 'number') return timePointFromEpochSeconds(value)
  return timePointFromIso(value)
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'unavailable'
  if (seconds < 1) return '0s'
  if (seconds < 90) return `${Math.round(seconds)}s`
  if (seconds < 5400) return `${roundTo(seconds / 60, 1)}m`
  if (seconds < 604800) return `${roundTo(seconds / 3600, 1)}h`
  return `${roundTo(seconds / 86400, 1)}d`
}

export interface ClampedInterval {
  seconds: number | null
  clampedFromNegative: boolean
}

/**
 * Elapsed seconds between two points, never negative. A negative raw difference means the
 * artifact order contradicts the declared order, which is information the caller keeps rather
 * than a value to render.
 */
export function elapsedBetween(from: TimePoint, to: TimePoint): ClampedInterval {
  if (from.epochSeconds === null || to.epochSeconds === null) {
    return { seconds: null, clampedFromNegative: false }
  }
  const raw = to.epochSeconds - from.epochSeconds
  return raw < 0
    ? { seconds: 0, clampedFromNegative: true }
    : { seconds: raw, clampedFromNegative: false }
}

export const UNAVAILABLE_ELAPSED: Elapsed = {
  seconds: null,
  provenance: 'unavailable',
  kind: 'none',
  label: 'Timing unavailable',
  clampedFromNegative: false,
}

export function measuredElapsed(interval: ClampedInterval): Elapsed {
  return {
    seconds: interval.seconds,
    provenance: 'measured',
    kind: 'measured-runtime',
    label:
      interval.seconds === null
        ? 'Timing unavailable'
        : `${formatDuration(interval.seconds)} runtime`,
    clampedFromNegative: interval.clampedFromNegative,
  }
}

export function inferredElapsed(interval: ClampedInterval): Elapsed {
  return {
    seconds: interval.seconds,
    provenance: 'inferred',
    kind: 'artifact-activity',
    label:
      interval.seconds === null
        ? 'Timing unavailable'
        : `≈ ${formatDuration(interval.seconds)} elapsed`,
    clampedFromNegative: interval.clampedFromNegative,
  }
}

/* -- Inputs the pipeline extractor hands over -------------------------------------------- */

export interface StepTimeInputs {
  id: string
  goal: string
  phaseId: string
  declaredIndex: number
  isComplete: boolean
  /** The goal artifact's mtime. */
  artifactAt: TimePoint
  /** Optional measured execution fields, absent in schema 1. */
  startedAt: TimePoint
  endedAt: TimePoint
  jobId: string | null
}

export interface TimingComputation {
  model: TimingModel
  stepTiming: Map<string, StepTiming>
  phaseTiming: Map<string, PhaseTiming>
  newestArtifactStepId: string | null
}

function emptyPhaseTiming(): PhaseTiming {
  return {
    ...UNAVAILABLE_ELAPSED,
    firstArtifactAt: ABSENT_TIME_POINT,
    lastArtifactAt: ABSENT_TIME_POINT,
    artifactCount: 0,
    potentiallyConcurrent: false,
  }
}

export function emptyTimingModel(meta: SummaryMeta): TimingModel {
  return {
    ...meta,
    declaredOrder: [],
    artifactOrder: [],
    oldestArtifactAt: ABSENT_TIME_POINT,
    newestArtifactAt: ABSENT_TIME_POINT,
    activitySpan: UNAVAILABLE_ELAPSED,
    outOfOrder: [],
    clusters: [],
    concurrencyWindowSeconds: CONCURRENCY_WINDOW_SECONDS,
    hasMeasuredTiming: false,
  }
}

/**
 * Builds the timing model, per-step timing and per-phase timing from the declared step list.
 *
 * Inferred per-step spans are measured against the artifact-order predecessor, which is the only
 * ordering in which an interval means anything. The declared-order gap is kept separately so the
 * spine can flag a step whose artifact predates the step before it.
 */
export function computeTiming(
  steps: readonly StepTimeInputs[],
  meta: SummaryMeta
): TimingComputation {
  const stepTiming = new Map<string, StepTiming>()
  const phaseTiming = new Map<string, PhaseTiming>()

  const declaredOrder = steps.map(step => step.id)
  const withArtifacts = steps.filter(step => step.artifactAt.epochSeconds !== null)
  const artifactSorted = [...withArtifacts].sort((a, b) => {
    const delta = (a.artifactAt.epochSeconds ?? 0) - (b.artifactAt.epochSeconds ?? 0)
    // Declared index breaks ties so the ordering is deterministic for identical mtimes.
    return delta !== 0 ? delta : a.declaredIndex - b.declaredIndex
  })

  const hasMeasuredTiming = steps.some(
    step => step.startedAt.present || step.endedAt.present || step.jobId !== null
  )

  /* Clusters over artifact order; a gap wider than the window starts a new one. */
  const clusters: ArtifactCluster[] = []
  const clusterOf = new Map<string, number>()
  for (const step of artifactSorted) {
    const current = clusters[clusters.length - 1]
    const previousSeconds = current === undefined ? null : (current.lastAt.epochSeconds ?? null)
    const seconds = step.artifactAt.epochSeconds ?? 0
    if (
      current === undefined ||
      previousSeconds === null ||
      seconds - previousSeconds > CONCURRENCY_WINDOW_SECONDS
    ) {
      clusters.push({
        id: `cluster-${clusters.length + 1}`,
        stepIds: [step.id],
        firstAt: step.artifactAt,
        lastAt: step.artifactAt,
        spanSeconds: 0,
        potentiallyConcurrent: false,
      })
    } else {
      current.stepIds.push(step.id)
      current.lastAt = step.artifactAt
      current.spanSeconds = seconds - (current.firstAt.epochSeconds ?? seconds)
    }
    clusterOf.set(step.id, clusters.length - 1)
  }
  for (const cluster of clusters) cluster.potentiallyConcurrent = cluster.stepIds.length > 1

  /* Declared-order gaps and out-of-order detection. */
  const declaredDelta = new Map<string, ClampedInterval>()
  const outOfOrder: OutOfOrderPair[] = []
  let previousDeclared: StepTimeInputs | null = null
  for (const step of steps) {
    if (step.artifactAt.epochSeconds === null) continue
    if (previousDeclared !== null) {
      const interval = elapsedBetween(previousDeclared.artifactAt, step.artifactAt)
      declaredDelta.set(step.id, interval)
      if (interval.clampedFromNegative) {
        outOfOrder.push({
          stepId: step.id,
          goal: step.goal,
          previousStepId: previousDeclared.id,
          previousGoal: previousDeclared.goal,
          rawDeltaSeconds:
            (step.artifactAt.epochSeconds ?? 0) - (previousDeclared.artifactAt.epochSeconds ?? 0),
        })
      }
    }
    previousDeclared = step
  }

  /* Per-step timing. */
  const artifactIndex = new Map(artifactSorted.map((step, index) => [step.id, index]))
  for (const step of steps) {
    const declared = declaredDelta.get(step.id) ?? { seconds: null, clampedFromNegative: false }
    const clusterIndex = clusterOf.get(step.id)
    const potentiallyConcurrent =
      clusterIndex !== undefined && clusters[clusterIndex].potentiallyConcurrent

    let base: Elapsed
    let inferredFromStepId: string | null = null

    if (step.startedAt.present && step.endedAt.present) {
      base = measuredElapsed(elapsedBetween(step.startedAt, step.endedAt))
    } else if (step.artifactAt.present) {
      const index = artifactIndex.get(step.id) ?? 0
      const predecessor = index > 0 ? artifactSorted[index - 1] : null
      if (predecessor === null) {
        base = {
          seconds: null,
          provenance: 'unavailable',
          kind: 'none',
          label: 'No preceding artifact',
          clampedFromNegative: false,
        }
      } else {
        base = inferredElapsed(elapsedBetween(predecessor.artifactAt, step.artifactAt))
        inferredFromStepId = predecessor.id
      }
    } else {
      base = UNAVAILABLE_ELAPSED
    }

    stepTiming.set(step.id, {
      ...base,
      artifactAt: step.artifactAt,
      startedAt: step.startedAt,
      endedAt: step.endedAt,
      jobId: step.jobId,
      inferredFromStepId,
      potentiallyConcurrent,
      declaredDeltaSeconds: declared.seconds,
      declaredOutOfOrder: declared.clampedFromNegative,
    })
  }

  /* Per-phase timing. */
  const phaseIds: string[] = []
  const byPhase = new Map<string, StepTimeInputs[]>()
  for (const step of steps) {
    if (!byPhase.has(step.phaseId)) {
      byPhase.set(step.phaseId, [])
      phaseIds.push(step.phaseId)
    }
    byPhase.get(step.phaseId)?.push(step)
  }

  for (const phaseId of phaseIds) {
    const phaseSteps = byPhase.get(phaseId) ?? []
    const measuredStarts = phaseSteps.filter(step => step.startedAt.present)
    const measuredEnds = phaseSteps.filter(step => step.endedAt.present)
    const artifacts = phaseSteps
      .filter(step => step.artifactAt.epochSeconds !== null)
      .sort((a, b) => (a.artifactAt.epochSeconds ?? 0) - (b.artifactAt.epochSeconds ?? 0))

    if (measuredStarts.length > 0 && measuredEnds.length > 0) {
      const first = measuredStarts.reduce((a, b) =>
        (a.startedAt.epochSeconds ?? 0) <= (b.startedAt.epochSeconds ?? 0) ? a : b
      )
      const last = measuredEnds.reduce((a, b) =>
        (a.endedAt.epochSeconds ?? 0) >= (b.endedAt.epochSeconds ?? 0) ? a : b
      )
      phaseTiming.set(phaseId, {
        ...measuredElapsed(elapsedBetween(first.startedAt, last.endedAt)),
        firstArtifactAt: artifacts[0]?.artifactAt ?? ABSENT_TIME_POINT,
        lastArtifactAt: artifacts[artifacts.length - 1]?.artifactAt ?? ABSENT_TIME_POINT,
        artifactCount: artifacts.length,
        potentiallyConcurrent: artifacts.some(
          step => stepTiming.get(step.id)?.potentiallyConcurrent === true
        ),
      })
      continue
    }

    if (artifacts.length === 0) {
      phaseTiming.set(phaseId, emptyPhaseTiming())
      continue
    }

    const firstAt = artifacts[0].artifactAt
    const lastAt = artifacts[artifacts.length - 1].artifactAt
    // One artifact yields no interval, and reporting 0 would read as "took no time".
    const span =
      artifacts.length > 1
        ? inferredElapsed(elapsedBetween(firstAt, lastAt))
        : {
            seconds: null,
            provenance: 'inferred' as const,
            kind: 'none' as const,
            label: 'Single artifact — no interval',
            clampedFromNegative: false,
          }

    phaseTiming.set(phaseId, {
      ...span,
      firstArtifactAt: firstAt,
      lastArtifactAt: lastAt,
      artifactCount: artifacts.length,
      potentiallyConcurrent: artifacts.some(
        step => stepTiming.get(step.id)?.potentiallyConcurrent === true
      ),
    })
  }

  const oldest = artifactSorted[0]?.artifactAt ?? ABSENT_TIME_POINT
  const newestStep = artifactSorted[artifactSorted.length - 1] ?? null
  const newest = newestStep?.artifactAt ?? ABSENT_TIME_POINT

  const activitySpan =
    artifactSorted.length > 1
      ? inferredElapsed(elapsedBetween(oldest, newest))
      : UNAVAILABLE_ELAPSED

  return {
    model: {
      ...meta,
      declaredOrder,
      artifactOrder: artifactSorted.map(step => step.id),
      oldestArtifactAt: oldest,
      newestArtifactAt: newest,
      activitySpan,
      outOfOrder,
      clusters,
      concurrencyWindowSeconds: CONCURRENCY_WINDOW_SECONDS,
      hasMeasuredTiming,
    },
    stepTiming,
    phaseTiming,
    newestArtifactStepId: newestStep?.id ?? null,
  }
}
