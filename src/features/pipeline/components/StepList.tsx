import { EmptyState } from '@/@panther.core/components'
import { stepElementId } from '@/features/build/model'
import type { BuildPhase, BuildReport } from '@/features/build/model'
import { StepRow } from '@/features/pipeline/components/StepRow'

/**
 * A phase's steps in DECLARED order.
 *
 * Declared order is not negotiable here even though two of this report's artifacts land out of
 * sequence: the step list is what the pipeline said it would do, and re-sorting it by mtime would
 * turn a list of intentions into a fabricated execution log. The artifact ordering lives in the
 * timeline and nowhere else.
 */
export interface StepListProps {
  phase: BuildPhase
  report: BuildReport
  /** The deep-link target element id, so a linked step opens and flashes. */
  highlightId?: string | null
}

export const StepList = ({ phase, report, highlightId }: StepListProps) => {
  if (phase.steps.length === 0) {
    return (
      <EmptyState
        compact
        title="No steps declared"
        description="The report lists this phase but gives it no steps, so its state cannot be derived from step data."
      />
    )
  }

  const goalById = new Map(report.pipeline.steps.map(step => [step.id, step.goal]))

  return (
    <ol className="list-none p-0">
      {phase.steps.map(step => (
        <StepRow
          key={step.id}
          step={step}
          predecessorGoal={
            step.timing.inferredFromStepId === null
              ? null
              : (goalById.get(step.timing.inferredFromStepId) ?? null)
          }
          highlighted={highlightId === stepElementId(step.id)}
        />
      ))}
    </ol>
  )
}
