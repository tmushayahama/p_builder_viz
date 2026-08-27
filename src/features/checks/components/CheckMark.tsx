import clsx from 'clsx'
import { Tooltip } from '@mantine/core'
import { StatusChip, StatusIcon } from '@/@panther.core/components'
import type { CheckFinding } from '@/features/checks/model'

/**
 * The state of one finding, as a word plus a shape.
 *
 * Three of the four weights map onto the shared status vocabulary. The fourth - `note` - does not,
 * and that is the point: a configuration value inherited from an older release is neither a warning
 * nor a verification, and dressing it as either would be a lie about the build. So it gets its own
 * quiet mark, in ink rather than a status tone, with the accent left free for the one real
 * mismatch. It carries a word like everything else, so the distinction survives a monochrome print.
 */
export interface CheckMarkProps {
  finding: CheckFinding
  size?: 'sm' | 'md'
  className?: string
}

const NOTE_HINT =
  'Observed, explained, and not known to be wrong. Counted as neither an issue nor a verification.'

export const CheckMark = ({ finding, size = 'sm', className }: CheckMarkProps) => {
  if (finding.weight === 'note') {
    return (
      <Tooltip label={NOTE_HINT} withArrow openDelay={250} multiline maw={280}>
        <span
          data-check-mark="note"
          className={clsx(
            'border-hairline-strong rounded-hair text-ink-muted inline-flex items-center gap-1',
            'border border-solid px-1.5 py-px align-middle whitespace-nowrap',
            size === 'md' ? 'text-xs' : 'text-2xs',
            className
          )}
        >
          <StatusIcon shape="diamond" size={size === 'md' ? 12 : 10} className="shrink-0" />
          <span className="uppercase">{finding.tier === 'notable' ? 'Notable' : 'Noted'}</span>
        </span>
      </Tooltip>
    )
  }

  return (
    <StatusChip
      status={finding.state}
      size={size}
      className={className}
      hint={
        finding.weight === 'absent' && finding.absentReason === 'not-applicable'
          ? 'This check does not apply to this build, which is not the same as a gap in the report.'
          : undefined
      }
    />
  )
}
