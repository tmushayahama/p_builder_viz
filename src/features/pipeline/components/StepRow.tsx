import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { Disclosure, KeyValueList, StatusChip } from '@/@panther.core/components'
import type { KeyValueItem } from '@/@panther.core/components'
import { formatUtc, formatUtcShort, plural } from '@/app/format'
import { formatDuration, stepElementId, stepPositionLabel } from '@/features/build/model'
import type { BuildStep } from '@/features/build/model'
import { AttemptHistory } from '@/features/pipeline/components/AttemptHistory'
import { ABSENT_MARK } from '@/@panther.core/vocabulary'

/**
 * One step, closed by default.
 *
 * There are 61 of these in the captured report, so the row carries only what a reviewer scans for -
 * the goal, its status, its artifact timestamp and whether that timestamp is measured or inferred -
 * and everything else waits behind the disclosure. A failed step opens itself, because a failure
 * whose attempt history is one click away is a failure someone will miss.
 *
 * The provenance chip is not decoration. An artifact mtime is evidence of activity and a recorded
 * runtime is a measurement, and a report that shows them identically invites the reader to treat
 * an mtime difference as a runtime.
 */
export interface StepRowProps {
  step: BuildStep
  predecessorGoal: string | null
  highlighted: boolean
}

export const StepRow = ({ step, predecessorGoal, highlighted }: StepRowProps) => {
  const failed = step.status.kind === 'failed' || step.hasFailedAttempt
  const [open, setOpen] = useState(failed)

  // A deep link to a step has to reveal it, not just scroll to its collapsed row.
  useEffect(() => {
    if (highlighted) setOpen(true)
  }, [highlighted])

  const statusValue = step.status.isUnknown ? (step.status.raw ?? 'unknown') : step.status.kind

  const details: KeyValueItem[] = [
    {
      key: 'artifact',
      label: 'Artifact mtime',
      value: step.timing.artifactAt.present ? formatUtc(step.timing.artifactAt) : null,
      absentReason: 'no artifact produced yet',
    },
    {
      key: 'position',
      label: 'Declared position',
      value: stepPositionLabel(step),
      mono: false,
    },
    {
      key: 'elapsed',
      label: 'Elapsed',
      value: step.timing.label,
      mono: false,
      aside: <StatusChip status={step.timing.provenance} variant="plain" />,
    },
  ]

  if (step.timing.inferredFromStepId !== null) {
    details.push({
      key: 'inferred-from',
      label: 'Measured against',
      value: predecessorGoal ?? step.timing.inferredFromStepId,
      aside: <span className="text-ink-faint text-2xs">previous artifact in time order</span>,
    })
  }

  if (step.timing.startedAt.present || step.timing.endedAt.present) {
    details.push(
      { key: 'started', label: 'Started', value: formatUtc(step.timing.startedAt) },
      { key: 'ended', label: 'Ended', value: formatUtc(step.timing.endedAt) }
    )
  }

  if (step.timing.jobId !== null) {
    details.push({ key: 'job', label: 'Job id', value: step.timing.jobId })
  }

  if (step.timing.declaredOutOfOrder) {
    details.push({
      key: 'out-of-order',
      label: 'Declared order',
      value:
        'This artifact is older than the artifact of the step declared before it. Artifact times ' +
        'are evidence of activity, not an execution log.',
      mono: false,
      attention: true,
    })
  }

  if (step.timing.potentiallyConcurrent) {
    details.push({
      key: 'concurrent',
      label: 'Concurrency',
      value:
        'Artifacts around this step land within the concurrency window, so it may have run in ' +
        'parallel with its neighbours rather than after them.',
      mono: false,
    })
  }

  const unknownKeys = Object.keys(step.unknownFields)
  if (unknownKeys.length > 0) {
    details.push({
      key: 'unknown-fields',
      label: 'Unread fields',
      value: unknownKeys.join(', '),
      aside: <span className="text-ink-faint text-2xs">kept on the raw report</span>,
    })
  }

  return (
    <li className={clsx('pb-hairline-b', highlighted && 'bg-accent-wash')}>
      <Disclosure
        bare
        anchorId={stepElementId(step.id)}
        open={open}
        onOpenChange={setOpen}
        count={
          step.attemptCount > 0
            ? `${step.attemptCount} ${plural(step.attemptCount, 'attempt')}`
            : undefined
        }
        summary={
          <span className="flex items-baseline gap-1.5">
            <span className="pb-figures text-ink-faint text-2xs w-5 shrink-0 text-right">
              {step.indexInPhase + 1}
            </span>
            <span className="pb-ident text-ink text-2xs min-w-0 truncate">{step.goal}</span>
          </span>
        }
        summaryAside={
          <span className="flex items-center gap-2">
            <StatusChip status={statusValue} />
            <span className="pb-figures text-ink-muted text-2xs hidden w-[6.5rem] text-right sm:inline-block">
              {step.timing.artifactAt.present
                ? formatUtcShort(step.timing.artifactAt)
                : ABSENT_MARK}
            </span>
            <span className="hidden w-[5.5rem] md:inline-block">
              <StatusChip status={step.timing.provenance} variant="plain" />
            </span>
            <span className="pb-figures text-ink-faint text-2xs hidden w-14 text-right lg:inline-block">
              {step.timing.seconds === null
                ? ABSENT_MARK
                : `≈ ${formatDuration(step.timing.seconds)}`}
            </span>
          </span>
        }
      >
        <div className="space-y-2">
          <KeyValueList items={details} labelWidth={18} />
          {step.attempts.length > 0 && <AttemptHistory attempts={step.attempts} goal={step.goal} />}
        </div>
      </Disclosure>
    </li>
  )
}
