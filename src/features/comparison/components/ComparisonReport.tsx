import { useMemo } from 'react'
import { Panel, StatusChip } from '@/@panther.core/components'
import { plural } from '@/app/format'
import { useBuildReport } from '@/features/build/hooks'
import type { BuildReport } from '@/features/build/model'
import { ComparisonOverview } from '@/features/comparison/components/ComparisonOverview'
import { ComparisonSources } from '@/features/comparison/components/ComparisonSources'
import { IdentifierAgreement } from '@/features/comparison/components/IdentifierAgreement'
import { SpeciesChanges } from '@/features/comparison/components/SpeciesChanges'
import { UniRuleTable } from '@/features/comparison/components/UniRuleTable'
import { buildComparisonView } from '@/features/comparison/model'

/**
 * The release review: what materially changed, and which changes deserve investigation.
 *
 * This view is assembled, not section-bound, and that is the whole demonstration. `prev_lib` - the
 * section a comparison would naturally hang from - is absent on this report; the generator says
 * "inputs not present yet". Tying the view to that section would render an empty card while
 * `other_reports` still holds the previous-versus-new sequence counts, a 50-of-147 species table
 * and previous-UniProt agreement for 132 proteomes. So availability reads `partial`, the missing
 * source is named with the generator's own words, and everything the remaining sources support is
 * shown.
 *
 * Each block below degrades on its own table's availability rather than on the assembly's, so
 * losing one of the three tables costs one block instead of the page.
 */
export interface ComparisonReportViewProps {
  report: BuildReport
}

export const ComparisonReportView = ({ report }: ComparisonReportViewProps) => {
  const view = useMemo(() => buildComparisonView(report), [report])
  const summary = view.summary

  return (
    <div className="space-y-gutter">
      <Panel
        title="Previous-library comparison"
        subtitle={summary.contributors.map(entry => entry.sectionId).join(' + ')}
        availability={summary.availability}
        message={summary.previousLibrary.message ?? undefined}
        missingSubject="Direct previous-library totals"
        provenance="derived"
        status={
          <StatusChip
            status={summary.availability}
            detail={`${view.presentSources.length}/${summary.contributors.length} ${plural(
              summary.contributors.length,
              'source'
            )}`}
          />
        }
      >
        <div className="space-y-3">
          <ComparisonSources view={view} />
          <ComparisonOverview
            view={view}
            previousLibraryLabel={report.identity.previousLibraryLabel}
          />
        </div>
      </Panel>

      <Panel
        title="Species changes"
        subtitle={summary.speciesCounts.name}
        availability={view.speciesAvailability}
        message={summary.speciesCounts.message ?? undefined}
        missingSubject="Previous-versus-new species counts"
        provenance="generator"
        tone={view.renames.length > 0 || view.replacements.length > 0 ? 'attention' : 'default'}
      >
        <SpeciesChanges view={view} />
      </Panel>

      <Panel
        title="Identifier continuity"
        subtitle={summary.uniprotAgreement.name}
        availability={view.uniprotAvailability}
        message={summary.uniprotAgreement.message ?? undefined}
        missingSubject="Previous-UniProt identifier agreement"
        provenance="generator"
      >
        <IdentifierAgreement view={view} />
      </Panel>

      <Panel
        title="UniRule coverage"
        subtitle={report.otherReports.uniRules.name}
        availability={view.uniRuleAvailability}
        message={report.otherReports.uniRules.message ?? undefined}
        missingSubject="UniRules spanning several families"
        provenance="generator"
      >
        <UniRuleTable view={view} />
      </Panel>
    </div>
  )
}

const ComparisonReport = () => <ComparisonReportView report={useBuildReport()} />

export default ComparisonReport
