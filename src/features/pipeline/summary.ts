import { plural } from '@/app/format'
import type { BuildPhase, BuildReport } from '@/features/build/model'

/**
 * The two sentences the whole product is graded on.
 *
 * "Where is the build frontier" and "what is incomplete behind it" are different questions with
 * different answers on this report, and a reviewer must not have to scan fourteen nodes to
 * assemble either. So they are written out here, once, in plain language, from the model's own
 * `frontierIndex` and `holes` - never by re-scanning for the earliest incomplete phase, which is
 * the specific wrong answer.
 */

export interface HoleStatement {
  phaseId: string
  index: number
  name: string
  counter: string
  /** The goals that never completed, named rather than counted. */
  incompleteGoals: string[]
  /** How many phases after this one finished anyway - the evidence it is a hole. */
  /** Later phases that produced work. See `laterPhasesWithWork` for why not simply 'later'. */
  laterPhasesRan: number
}

export interface FailureStatement {
  stepId: string
  goal: string
  phaseName: string
  attemptCount: number
}

export interface BuildStatement {
  /** Where the build genuinely reached. */
  frontier: string
  /** What has not started beyond it, or `null` when nothing is left. */
  ahead: string | null
  /** The holes sentence. Always present: "no holes" is a finding worth stating. */
  holes: string
  holeDetails: HoleStatement[]
  failures: FailureStatement[]
  failureSentence: string | null
  blockedSentence: string | null
}

function frontierSentence(report: BuildReport): string {
  const { pipeline } = report
  const frontier =
    pipeline.frontierIndex === null ? null : (pipeline.phases[pipeline.frontierIndex] ?? null)

  if (frontier === null) {
    return (
      'No step has completed anywhere in the pipeline, so this build has no frontier yet: ' +
      'nothing has been produced to measure progress against.'
    )
  }

  const complete = pipeline.phases.every(phase => phase.status === 'complete')
  if (complete) {
    return (
      `All ${pipeline.phases.length} phases are complete. The frontier is the last phase, ` +
      `${frontier.name} (${frontier.completedSteps} of ${frontier.totalSteps} steps).`
    )
  }

  return (
    `The build frontier is ${frontier.name} — incomplete at ${frontier.completedSteps} of ` +
    `${frontier.totalSteps} steps.`
  )
}

function aheadSentence(report: BuildReport): string | null {
  const { pipeline } = report
  if (pipeline.frontierIndex === null) return null
  const ahead = pipeline.phases.filter(phase => phase.index > (pipeline.frontierIndex ?? 0))
  if (ahead.length === 0) return null
  if (ahead.length === 1) return `${ahead[0].name} has not started.`
  return (
    `${ahead.length} later phases have not started, beginning with ${ahead[0].name} and ending ` +
    `with ${ahead[ahead.length - 1].name}.`
  )
}

function holeStatement(report: BuildReport, hole: BuildPhase): HoleStatement {
  // Counted as "produced work", not "reached status complete", so this agrees with the number the
  // phase row and the phase detail show. The frontier itself is incomplete but plainly carried on
  // past the hole, and excluding it would state a weaker case than the data supports.
  const laterRan = report.pipeline.phases.filter(
    phase => phase.index > hole.index && phase.completedSteps > 0
  ).length

  return {
    phaseId: hole.id,
    index: hole.index,
    name: hole.name,
    counter: `${hole.completedSteps} of ${hole.totalSteps} steps`,
    incompleteGoals: hole.steps.filter(step => !step.isComplete).map(step => step.goal),
    laterPhasesRan: laterRan,
  }
}

function holesSentence(holes: readonly HoleStatement[]): string {
  if (holes.length === 0) {
    return 'Nothing behind the frontier is incomplete: every earlier phase finished every step.'
  }
  const later = holes.reduce((most, hole) => Math.max(most, hole.laterPhasesRan), 0)
  return (
    `${holes.length} ${plural(holes.length, 'phase')} behind the frontier ` +
    `${holes.length === 1 ? 'is' : 'are'} incomplete while ${later} later ` +
    `${plural(later, 'phase')} carried on past it. ` +
    `${holes.length === 1 ? 'This is a hole' : 'These are holes'}, not where the build stopped.`
  )
}

export function buildStatement(report: BuildReport): BuildStatement {
  const holeDetails = report.pipeline.holes.map(hole => holeStatement(report, hole))

  const failures: FailureStatement[] = report.pipeline.steps
    .filter(step => step.status.kind === 'failed' || step.hasFailedAttempt)
    .map(step => ({
      stepId: step.id,
      goal: step.goal,
      phaseName: report.pipeline.phases[step.phaseIndex]?.name ?? step.phaseId,
      attemptCount: step.attemptCount,
    }))

  const blocked = report.pipeline.phases.filter(phase => phase.status === 'blocked')

  const failureSentence =
    failures.length === 0
      ? null
      : failures.length === 1
        ? `${failures[0].goal} failed in ${failures[0].phaseName}` +
          (failures[0].attemptCount > 0
            ? ` after ${failures[0].attemptCount} ${plural(failures[0].attemptCount, 'attempt')}.`
            : '.')
        : `${failures.length} steps failed, across ` +
          `${new Set(failures.map(failure => failure.phaseName)).size} phases.`

  const blockedSentence =
    blocked.length === 0
      ? null
      : `${blocked.length} ${plural(blocked.length, 'phase')} ` +
        `${blocked.length === 1 ? 'is' : 'are'} blocked behind that failure: ` +
        `${blocked.map(phase => phase.name).join(', ')}.`

  return {
    frontier: frontierSentence(report),
    ahead: aheadSentence(report),
    holes: holesSentence(holeDetails),
    holeDetails,
    failures,
    failureSentence,
    blockedSentence,
  }
}
