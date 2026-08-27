import {
  DataTable,
  EmptyState,
  MetricValue,
  Provenance,
  SectionHeading,
  StatusChip,
  TruncationNotice,
} from '@/@panther.core/components'
import type { DataColumn } from '@/@panther.core/components'
import { formatCount, plural } from '@/app/format'
import { useSelectSpecies } from '@/features/build/hooks'
import type { UniprotMatchRow } from '@/features/build/model'
import type { ComparisonView } from '@/features/comparison/model'

/**
 * How many sequences kept the UniProt identifier they had in the previous release.
 *
 * Two honesty problems live in this table. Its twenty included rows contain a `TOTAL` aggregate, so
 * only nineteen of them are proteomes - reporting "20 of 132 proteomes" would overcount by one, and
 * the aggregate is pulled out and labelled rather than left to sort among the species.
 *
 * And the rows are ordered by agreement ascending, stopping at 92.9 % against an overall 90.5 %, so
 * they read as the weakest proteomes rather than a sample. That is a useful thing to say and a
 * dangerous thing to assume, so it is stated as an observation about the ORDER of the rows, marked
 * as this dashboard's inference, and never as a claim about how the generator chose them.
 */
export interface IdentifierAgreementProps {
  view: ComparisonView
}

export const IdentifierAgreement = ({ view }: IdentifierAgreementProps) => {
  const selectSpecies = useSelectSpecies()
  const totals = view.uniprotTotals

  const columns: readonly DataColumn<UniprotMatchRow>[] = [
    {
      id: 'oscode',
      header: 'Proteome',
      kind: 'node',
      width: 92,
      render: row => (
        <button
          type="button"
          onClick={() => selectSpecies(row.oscode)}
          className="pb-ident text-accent hover:text-accent-hover cursor-pointer text-xs"
        >
          {row.oscode}
        </button>
      ),
      sortValue: row => row.oscode,
    },
    {
      id: 'total',
      header: 'Sequences compared',
      kind: 'number',
      render: row => formatCount(row.totalSequences),
      sortValue: row => row.totalSequences,
    },
    {
      id: 'same',
      header: 'Same UniProt ID',
      kind: 'number',
      render: row => formatCount(row.sameUniprot),
      sortValue: row => row.sameUniprot,
    },
    {
      id: 'pct',
      header: 'Agreement',
      kind: 'number',
      render: row => (row.pctSameUniprot === null ? '—' : `${row.pctSameUniprot.toFixed(1)} %`),
      sortValue: row => row.pctSameUniprot,
    },
    {
      id: 'diff',
      header: 'Different UniProt ID',
      kind: 'number',
      render: row => formatCount(row.diffUniprot),
      sortValue: row => row.diffUniprot,
    },
    {
      id: 'nomatch',
      header: 'No previous match',
      kind: 'number',
      hint: 'Sequences with no counterpart in the previous release at all.',
      render: row => formatCount(row.noPreviousMatch),
      sortValue: row => row.noPreviousMatch,
    },
    {
      id: 'reading',
      header: 'Reading',
      kind: 'node',
      render: row =>
        row.allUnmatched ? (
          <StatusChip
            status="changed"
            label="every sequence unmatched"
            hint="No sequence in this proteome has a previous-release counterpart, which is what a species new to this build looks like."
          />
        ) : (
          <span className="text-ink-faint text-2xs">—</span>
        ),
    },
  ]

  const unmatched = view.uniprotRows.filter(row => row.allUnmatched)

  return (
    <div className="space-y-2">
      <SectionHeading
        level={4}
        count={`${view.uniprotRows.length} ${plural(view.uniprotRows.length, 'proteome')} listed`}
        description="Identifier continuity between the previous release and this build. Percentages are the report's own; counts are parsed from its string columns."
      >
        Previous-UniProt identifier agreement
      </SectionHeading>

      <div className="flex flex-wrap gap-x-6 gap-y-1.5">
        <MetricValue
          metricId="prevUniprotProteomes"
          value={view.uniprotProteomes}
          layout="stack"
          provenance="generator"
          absentReason="not reported"
        />
      </div>

      {view.uniprotCompleteness !== undefined && (
        <TruncationNotice
          completeness={view.uniprotCompleteness}
          detail={`Sorting and filtering are withheld. ${
            totals === null
              ? ''
              : 'One of the included rows is the TOTAL aggregate, so ' +
                `${view.uniprotRows.length} of them are proteomes.`
          }`}
        />
      )}

      {view.uniprotOrdering === 'ascending' && (
        <p className="text-ink-muted text-2xs flex flex-wrap items-baseline gap-x-2">
          <Provenance source="derived" detail="observed by this dashboard" />
          <span className="min-w-0 flex-1">
            The included rows rise in agreement from{' '}
            {view.uniprotRows[0]?.pctSameUniprot?.toFixed(1) ?? '—'} % to{' '}
            {view.uniprotRows[view.uniprotRows.length - 1]?.pctSameUniprot?.toFixed(1) ?? '—'} %, so
            they read as the weakest proteomes rather than a cross-section. The report does not say
            how it selected them, so treat this as a floor, not a distribution.
          </span>
        </p>
      )}

      {totals !== null && (
        <div className="bg-surface-2 pb-hairline rounded-hair flex flex-wrap items-baseline gap-x-4 gap-y-1 px-2 py-1.5">
          <span className="text-ink text-2xs font-semibold">
            Aggregate row from the report ({totals.oscode})
          </span>
          <MetricValue
            metricId="prevUniprotTotalSeqs"
            value={totals.totalSequences}
            layout="row"
            provenance="generator"
          />
          <MetricValue
            metricId="prevUniprotSameUniprot"
            value={totals.sameUniprot}
            layout="row"
            provenance="generator"
          />
          <MetricValue
            metricId="prevUniprotPctSame"
            value={totals.pctSameUniprot}
            layout="row"
            unit="%"
            format={value => value.toFixed(1)}
            provenance="generator"
          />
          <span className="text-ink-faint text-2xs">
            An aggregate across every compared proteome, not a species: it is kept out of the table
            and out of the species join.
          </span>
        </div>
      )}

      {unmatched.length > 0 && (
        <p className="text-ink-muted text-2xs">
          <span className="text-ink font-semibold">Every sequence unmatched: </span>
          <span className="pb-ident">{unmatched.map(row => row.oscode).join(', ')}</span>. That is
          the signature of a species new to this build rather than of a failure — the species detail
          joins the other sources that confirm it.
        </p>
      )}

      {view.uniprotRows.length === 0 ? (
        <EmptyState
          title="No proteome rows in this report"
          description="The previous-UniProt match table is not present, so no identifier agreement is shown."
        />
      ) : (
        <DataTable
          caption="Previous-UniProt-ID match by proteome"
          columns={columns}
          rows={view.uniprotRows}
          rowKey={row => row.oscode}
          completeness={view.uniprotCompleteness}
          completenessDetail="Sorting and filtering are withheld: over a subset they would imply a complete ranking."
          pageSize={0}
          density="tight"
          maxHeight={360}
          onRowClick={row => selectSpecies(row.oscode)}
          footNote="The report's TOTAL row is shown above rather than in the table: it is an aggregate, not a proteome."
        />
      )}
    </div>
  )
}
