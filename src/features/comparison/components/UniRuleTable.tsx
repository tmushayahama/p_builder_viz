import {
  DataTable,
  EmptyState,
  MetricValue,
  Provenance,
  SectionHeading,
  TruncationNotice,
} from '@/@panther.core/components'
import type { DataColumn } from '@/@panther.core/components'
import { formatCount, plural } from '@/app/format'
import type { UniRuleRow } from '@/features/build/model'
import type { ComparisonView } from '@/features/comparison/model'

/**
 * UniRules that now apply across more than one family - and the report's ragged-row case.
 *
 * `ragged_rows` is a COUNT, not a boolean, and on this table it is 813: every row in the full
 * result set. Read as a boolean it would merely be "truthy"; read as a count it says the generator
 * considers every row uneven. So this view does two separate things rather than one: it reports the
 * generator's count verbatim, and it independently checks the rows that ARE present for missing
 * declared columns and names them per row. On this fixture none of the twenty included rows is
 * missing a column, which is worth saying out loud - a blank cell in a count column reads as a
 * measured zero, and the honest answer here is that nothing is blank.
 */
export interface UniRuleTableProps {
  view: ComparisonView
}

const PREVIEW_FAMILIES = 5

export const UniRuleTable = ({ view }: UniRuleTableProps) => {
  const ragged = view.uniRuleRagged
  const missingByRow = new Map(
    ragged.rowsMissingColumns.map(entry => [entry.rowKey, entry.missingColumns])
  )

  const columns: readonly DataColumn<UniRuleRow>[] = [
    { id: 'unirule', header: 'UniRule', kind: 'mono', width: 116, render: row => row.uniRule },
    {
      id: 'count',
      header: 'Families',
      kind: 'number',
      render: row => formatCount(row.familyCount),
      sortValue: row => row.familyCount,
    },
    {
      id: 'families',
      header: 'Family ids',
      kind: 'mono',
      render: row => {
        if (row.families.length === 0) return '—'
        const shown = row.families.slice(0, PREVIEW_FAMILIES).join(', ')
        const rest = row.families.length - PREVIEW_FAMILIES
        return (
          <span title={row.families.join(', ')}>
            {shown}
            {rest > 0 && <span className="text-ink-faint">{` +${rest} more`}</span>}
          </span>
        )
      },
    },
    {
      id: 'missing',
      header: 'Missing columns',
      kind: 'node',
      hint: 'Declared columns this row does not carry. Named rather than left blank, because a blank in a count column reads as zero.',
      render: row => {
        const missing = missingByRow.get(row.uniRule)
        return missing === undefined || missing.length === 0 ? (
          <span className="text-ink-faint text-2xs">none</span>
        ) : (
          <span className="text-status-warn pb-ident text-2xs">{missing.join(', ')}</span>
        )
      },
    },
  ]

  return (
    <div className="space-y-2">
      <SectionHeading
        level={4}
        count={`${view.uniRuleRows.length} ${plural(view.uniRuleRows.length, 'rule')} listed`}
        description="Rules that gained membership in more than one family, which is worth reviewing when family boundaries move between releases."
      >
        UniRules spanning several families
      </SectionHeading>

      <div className="flex flex-wrap gap-x-6 gap-y-1.5">
        <MetricValue
          metricId="uniRulesInMultipleFamilies"
          value={view.uniRuleTruncation.totalRows}
          layout="stack"
          provenance="generator"
          absentReason="not reported"
        />
      </div>

      {view.uniRuleCompleteness !== undefined && (
        <TruncationNotice
          completeness={view.uniRuleCompleteness}
          detail="Sorting and filtering are withheld; no statement below ranks the rules."
        />
      )}

      {ragged.reportedCount !== null && ragged.reportedCount > 0 && (
        <p className="text-ink-muted text-2xs flex flex-wrap items-baseline gap-x-2">
          <Provenance source="generator" detail="ragged_rows" />
          <span className="min-w-0 flex-1">
            The report marks {ragged.reportedCount.toLocaleString()}{' '}
            {plural(ragged.reportedCount, 'row')} of the full result set as ragged.{' '}
            {ragged.rowsMissingColumns.length === 0
              ? `Every one of the ${view.uniRuleRows.length} rows included here carries all ${ragged.columns.length} declared columns, so within this subset nothing is missing; the variable-length family list is the only unevenness visible.`
              : `${ragged.rowsMissingColumns.length} of the included rows are missing a declared column; the Missing columns cell names which.`}
          </span>
        </p>
      )}

      {view.uniRuleRows.length === 0 ? (
        <EmptyState
          title="No UniRule rows in this report"
          description="The UniRules table is not present, so nothing is shown here."
        />
      ) : (
        <DataTable
          caption="UniRules gaining membership in more than one family"
          columns={columns}
          rows={view.uniRuleRows}
          rowKey={row => row.uniRule}
          completeness={view.uniRuleCompleteness}
          completenessDetail="Sorting and filtering are withheld: over a subset they would imply a complete ranking."
          pageSize={0}
          density="tight"
          maxHeight={320}
          footNote="Family ids are truncated in the cell; the full list is in the row's tooltip and in the report JSON."
        />
      )}
    </div>
  )
}
