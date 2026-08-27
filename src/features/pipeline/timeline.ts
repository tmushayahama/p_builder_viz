import { formatUtc } from '@/app/format'
import type { BuildPhase, BuildReport, PhaseStatus } from '@/features/build/model'

/**
 * The inferred timeline's row model, kept pure so the invariants can be tested without a DOM.
 *
 * Three of them matter, and all three are places a naive gantt gets the build wrong:
 *
 *   The order is ARTIFACT TIME, not declared order. The spine reads declared order; mixing the two
 *   would present artifact mtimes as an execution log, which they are not.
 *
 *   No interval is ever negative. This report has two completed steps whose artifacts land before
 *   the step declared ahead of them, and the phase span is taken from the earliest and latest
 *   artifact rather than from the first and last declared step, so the ends cannot cross. The
 *   clamp is still applied, because a coordinate is not the place to discover that they did.
 *
 *   A phase with no artifacts has NO span. It gets an empty track and a reason, never a
 *   zero-width bar, because a zero-width bar reads as "ran instantly".
 */

export type TimelineSpanKind = 'span' | 'instant' | 'none'

export interface TimelineRow {
  phaseId: string
  /** Declared index, so the row keeps its identity even though the order is artifact time. */
  index: number
  name: string
  /** Axis label: the declared position and the name, since the rows are not in declared order. */
  label: string
  status: PhaseStatus
  isFrontier: boolean
  isHole: boolean
  hasFailure: boolean
  kind: TimelineSpanKind
  startSeconds: number | null
  endSeconds: number | null
  elapsedSeconds: number | null
  /** The model's own wording: an approximation of artifact activity, never a runtime. */
  elapsedLabel: string
  firstArtifactLabel: string
  lastArtifactLabel: string
  artifactCount: number
  potentiallyConcurrent: boolean
  /** Why this row has no bar, or what to be careful about when reading it. */
  note: string | null
}

export interface TimelineModel {
  rows: readonly TimelineRow[]
  /** Wall-clock domain in epoch seconds. */
  domain: readonly [number, number]
  /** False when there is nothing to place on a clock, so the chart shows a reason instead. */
  hasDomain: boolean
  /** Phases whose artifacts cluster tightly enough to be concurrent rather than sequential. */
  concurrentPhaseCount: number
  /** Rows worth labelling in place: the longest spans, not every row. */
  labelledPhaseIds: readonly string[]
  activityLabel: string
  concurrencyWindowSeconds: number
}

/** How many spans carry an in-place label. Labelling every row is noise, not information. */
const LABELLED_ROWS = 3

function rowOf(phase: BuildPhase): TimelineRow {
  const first = phase.timing.firstArtifactAt.epochSeconds
  const last = phase.timing.lastArtifactAt.epochSeconds
  const startSeconds = first === null ? null : first
  // Clamped rather than trusted: an end before its start must never reach a coordinate.
  const endSeconds = last === null || startSeconds === null ? null : Math.max(startSeconds, last)

  const kind: TimelineSpanKind =
    phase.timing.artifactCount === 0 || startSeconds === null || endSeconds === null
      ? 'none'
      : endSeconds > startSeconds
        ? 'span'
        : 'instant'

  const elapsedSeconds =
    kind === 'span' && startSeconds !== null && endSeconds !== null
      ? Math.max(0, endSeconds - startSeconds)
      : null

  const note =
    kind === 'none'
      ? 'No completed steps, so there is no artifact activity to place on the clock.'
      : kind === 'instant'
        ? 'A single artifact fixes an instant, not an interval.'
        : phase.timing.potentiallyConcurrent
          ? 'Artifacts here land within the concurrency window, so parts of this phase may have ' +
            'run in parallel rather than in sequence.'
          : null

  return {
    phaseId: phase.id,
    index: phase.index,
    name: phase.name,
    label: `${phase.index + 1}. ${phase.name}`,
    status: phase.status,
    isFrontier: phase.isFrontier,
    isHole: phase.isHole,
    hasFailure: phase.hasFailure,
    kind,
    startSeconds,
    endSeconds,
    elapsedSeconds,
    elapsedLabel: phase.timing.label,
    firstArtifactLabel: formatUtc(phase.timing.firstArtifactAt),
    lastArtifactLabel: formatUtc(phase.timing.lastArtifactAt),
    artifactCount: phase.timing.artifactCount,
    potentiallyConcurrent: phase.timing.potentiallyConcurrent,
    note,
  }
}

export function buildTimelineModel(report: BuildReport): TimelineModel {
  const phases = report.pipeline.phases
  const rows = phases.map(rowOf)

  /* Artifact time order. Phases with no artifacts keep declared order at the end: they have no
     place on the clock, and inventing one would be the whole mistake this module avoids. */
  const ordered = [...rows].sort((a, b) => {
    if (a.startSeconds === null && b.startSeconds === null) return a.index - b.index
    if (a.startSeconds === null) return 1
    if (b.startSeconds === null) return -1
    return a.startSeconds - b.startSeconds || a.index - b.index
  })

  const oldest = report.timing.oldestArtifactAt.epochSeconds
  const newest = report.timing.newestArtifactAt.epochSeconds
  const hasDomain = oldest !== null && newest !== null && newest > oldest
  const domain: readonly [number, number] = hasDomain
    ? [oldest as number, newest as number]
    : [0, 1]

  const labelledPhaseIds = [...ordered]
    .filter(row => row.elapsedSeconds !== null)
    .sort((a, b) => (b.elapsedSeconds ?? 0) - (a.elapsedSeconds ?? 0))
    .slice(0, LABELLED_ROWS)
    .map(row => row.phaseId)

  return {
    rows: ordered,
    domain,
    hasDomain,
    concurrentPhaseCount: ordered.filter(row => row.potentiallyConcurrent).length,
    labelledPhaseIds,
    activityLabel: report.timing.activitySpan.label,
    concurrencyWindowSeconds: report.timing.concurrencyWindowSeconds,
  }
}
