import { Link } from 'react-router-dom'
import { SectionHeading } from '@/@panther.core/components'
import { plural } from '@/app/format'
import { reportRoute } from '@/features/build/model'
import type { BuildPhase, BuildReport } from '@/features/build/model'
import {
  contributingReportsFor,
  primaryPhaseNameOf,
  primaryReportsFor,
} from '@/features/pipeline/model'
import { ReportMount } from '@/features/reports/registry'

/**
 * The reports that hang from a phase.
 *
 * Two relationships, shown differently. A section this phase is the primary home for is mounted in
 * full. A section that merely CONTRIBUTES to the phase - mapping stages span five phases, the
 * previous-versus-new tables inform three - is a cross-reference to where it is shown in full,
 * because mounting one report on five nodes would make the binding meaningless and the page long.
 */
export interface BoundReportsProps {
  report: BuildReport
  phase: BuildPhase
}

export const BoundReports = ({ report, phase }: BoundReportsProps) => {
  const primary = primaryReportsFor(report, phase.id)
  const contributing = contributingReportsFor(report, phase.id)

  if (primary.length === 0 && contributing.length === 0) return null

  return (
    <div className="space-y-gutter">
      <SectionHeading
        level={3}
        count={
          primary.length === 0
            ? 'cross-references only'
            : `${primary.length} ${plural(primary.length, 'report')}`
        }
        description={
          contributing.length === 0 ? undefined : (
            <span>
              Also informed by{' '}
              {contributing.map((entry, index) => (
                <span key={entry.sectionId}>
                  {index > 0 && ', '}
                  <Link to={reportRoute(entry.sectionId)} className="text-accent">
                    {entry.title ?? entry.sectionId}
                  </Link>
                  <span className="text-ink-faint">
                    {' '}
                    (shown under {primaryPhaseNameOf(report, entry) ?? 'another phase'})
                  </span>
                </span>
              ))}
              .
            </span>
          )
        }
      >
        Reports for this phase
      </SectionHeading>

      {primary.map(entry => (
        <ReportMount key={entry.sectionId} report={entry} />
      ))}
    </div>
  )
}
