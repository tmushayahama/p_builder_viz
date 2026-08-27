import { DataTable, StatusChip } from '@/@panther.core/components'
import type { DataColumn } from '@/@panther.core/components'
import { formatUtc } from '@/app/format'
import { elapsedBetween, formatDuration } from '@/features/build/model'
import type { StepAttempt } from '@/features/build/model'
import { ABSENT_MARK } from '@/@panther.core/vocabulary'

/**
 * A step's retry history.
 *
 * The captured report carries no populated attempts, which is exactly why this exists now: the
 * failure path has to be designed and exercised before real Slurm history arrives, or the first
 * failed build will be the first time anyone looks at it. The `toFailed()` report state drives it.
 *
 * Attempt timing is MEASURED - it comes from recorded start and end times rather than from artifact
 * mtimes - so it is labelled differently from the inferred spans everywhere else in this view.
 */
export interface AttemptHistoryProps {
  attempts: readonly StepAttempt[]
  /** The step's goal, for the table's accessible caption. */
  goal: string
}

const attemptElapsed = (attempt: StepAttempt): string => {
  const interval = elapsedBetween(attempt.startedAt, attempt.endedAt)
  return interval.seconds === null ? ABSENT_MARK : formatDuration(interval.seconds)
}

export const AttemptHistory = ({ attempts, goal }: AttemptHistoryProps) => {
  const columns: readonly DataColumn<StepAttempt>[] = [
    {
      id: 'attempt',
      header: '#',
      kind: 'number',
      width: 32,
      render: attempt => attempt.index + 1,
      sortValue: attempt => attempt.index + 1,
    },
    {
      id: 'status',
      header: 'Status',
      kind: 'node',
      render: attempt => (
        <StatusChip
          status={
            attempt.status.isUnknown ? (attempt.status.raw ?? 'unknown') : attempt.status.kind
          }
        />
      ),
    },
    {
      id: 'started',
      header: 'Started',
      kind: 'mono',
      render: attempt => formatUtc(attempt.startedAt),
    },
    {
      id: 'ended',
      header: 'Ended',
      kind: 'mono',
      render: attempt => formatUtc(attempt.endedAt),
    },
    {
      id: 'elapsed',
      header: 'Measured',
      kind: 'number',
      hint: 'Recorded execution time for this attempt, not inferred from an artifact timestamp.',
      render: attemptElapsed,
    },
    {
      id: 'job',
      header: 'Job id',
      kind: 'mono',
      render: attempt => attempt.jobId ?? ABSENT_MARK,
    },
    {
      id: 'log',
      header: 'Log',
      kind: 'mono',
      render: attempt => attempt.logReference ?? ABSENT_MARK,
    },
    {
      id: 'reason',
      header: 'Reason',
      kind: 'text',
      render: attempt => attempt.reason ?? ABSENT_MARK,
    },
  ]

  return (
    <DataTable
      caption={`Attempt history for ${goal}`}
      columns={columns}
      rows={attempts}
      rowKey={attempt => String(attempt.index)}
      density="tight"
      pageSize={0}
      maxHeight={260}
      footNote="Attempt timing is measured execution, unlike the inferred artifact spans elsewhere in this view."
    />
  )
}
