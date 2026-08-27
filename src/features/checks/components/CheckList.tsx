import { EmptyState } from '@/@panther.core/components'
import { plural } from '@/app/format'
import { checkElementId } from '@/features/build/model'
import { CheckRow } from '@/features/checks/components/CheckRow'
import type { CheckFinding, CheckWeight } from '@/features/checks/model'

/**
 * The findings, grouped by what they ask of the reader.
 *
 * Passing checks are NOT behind a filter and not collapsed. On this report they are the strongest
 * evidence the build is sound - an exact leaf/library agreement, a four-way family agreement, every
 * book with a usable tree - and a diagnostic tool that hides what it verified is only half a tool.
 * The groups are ordered by what needs attention first, which is enough hierarchy; hiding the rest
 * would be a different claim.
 */
export interface CheckListProps {
  checks: readonly CheckFinding[]
  highlightId?: string | null
}

interface Group {
  weight: CheckWeight
  heading: string
  /** Why this group exists, in one line, so the grouping itself is legible. */
  note: string
}

const GROUPS: readonly Group[] = [
  {
    weight: 'issue',
    heading: 'Needs review',
    note: 'Warnings and mismatches. These are the only findings counted as issues.',
  },
  {
    weight: 'note',
    heading: 'Noted',
    note: 'Visible and explained, not known to be wrong, counted as neither.',
  },
  {
    weight: 'verified',
    heading: 'Verified',
    note: 'Checks that ran and held. What the build got right, stated rather than assumed.',
  },
  {
    weight: 'absent',
    heading: 'Not evaluated',
    note: 'The report does not carry the inputs these checks need. Absence is not a pass.',
  },
]

export const CheckList = ({ checks, highlightId = null }: CheckListProps) => {
  if (checks.length === 0) {
    return (
      <EmptyState
        title="No checks ran"
        description="Nothing in this report gave any rule inputs to work from — which is itself a finding about the report, not about the build."
      />
    )
  }

  return (
    <div className="space-y-2.5">
      {GROUPS.map(group => {
        const rows = checks.filter(finding => finding.weight === group.weight)
        if (rows.length === 0) return null
        return (
          <section key={group.weight} data-check-group={group.weight}>
            <div className="pb-hairline-b flex flex-wrap items-baseline gap-x-2 pb-0.5">
              <h4 className="text-ink text-2xs font-semibold tracking-wide uppercase">
                {group.heading}
              </h4>
              <span className="pb-figures text-ink-muted text-2xs">
                {rows.length} {plural(rows.length, 'check')}
              </span>
              <span className="text-ink-faint text-2xs basis-full sm:basis-auto">{group.note}</span>
            </div>
            <ul className="list-none p-0">
              {rows.map(finding => (
                <CheckRow
                  key={finding.id}
                  finding={finding}
                  highlighted={highlightId === checkElementId(finding.id)}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
