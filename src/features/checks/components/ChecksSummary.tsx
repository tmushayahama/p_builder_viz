import { Tooltip } from '@mantine/core'
import { StatusChip } from '@/@panther.core/components'
import { plural } from '@/app/format'
import { useChecks } from '@/features/checks/hooks'
import type { CheckSummary } from '@/features/checks/model'

/**
 * The compact global summary.
 *
 * Counting is the whole point of this component, so it is worth being explicit: the issue count is
 * warnings and mismatches ONLY. Passing checks are shown but do not enter it, notable configuration
 * does not enter it, and a check that could not run does not enter it either - a missing input is
 * not a problem with the build, it is a gap in the report, and conflating the two makes the number
 * useless.
 *
 * The generator/dashboard split is on the face of the summary rather than in a tooltip, because
 * "four of these five findings are ours, not the report's" is the first thing a reviewer needs to
 * know about a number like this.
 */
export interface ChecksSummaryProps {
  /** Pass a summary to render one that is not the current report's. */
  summary?: CheckSummary
}

export const ChecksSummary = ({ summary }: ChecksSummaryProps) => {
  const fallback = useChecks().summary
  const counts = summary ?? fallback

  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1" data-checks-summary="">
      <StatusChip
        status={counts.issues === 0 ? 'pass' : 'warn'}
        size="md"
        label={
          counts.issues === 0
            ? 'No issues'
            : `${counts.issues} ${plural(counts.issues, 'issue')} to review`
        }
        detail={
          counts.issues === 0
            ? undefined
            : `${counts.generatorIssues} from the generator · ${counts.derivedIssues} derived here`
        }
        hint="Warnings and mismatches only. Passing and notable findings are not counted."
      />

      <StatusChip
        status="pass"
        label={`${counts.verified} verified`}
        hint="Checks that ran and held. Shown in full, not hidden behind a filter."
      />

      {counts.notes > 0 && (
        <Tooltip
          label="Observed and explained; counted as neither an issue nor a verification."
          withArrow
          multiline
          maw={280}
        >
          <span className="text-ink-muted pb-figures text-2xs">{counts.notes} noted</span>
        </Tooltip>
      )}

      {counts.absent > 0 && (
        <StatusChip
          status="absent"
          label={`${counts.absent} not evaluated`}
          hint="The report does not carry the inputs these checks need. Absence is not a pass."
        />
      )}

      {counts.suppressed > 0 && (
        <Tooltip
          label="A derived check found the same evidence as a generator warning and stood down, so the finding is not reported twice."
          withArrow
          multiline
          maw={280}
        >
          <span className="text-ink-faint pb-figures text-2xs">
            {counts.suppressed} duplicate {plural(counts.suppressed, 'finding')} suppressed
          </span>
        </Tooltip>
      )}
    </span>
  )
}
