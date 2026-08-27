import { TextInput } from '@mantine/core'
import { useMemo, useState } from 'react'
import {
  DataTable,
  DeltaValue,
  FilterRow,
  StatusChip,
  TruncationNotice,
} from '@/@panther.core/components'
import type { DataColumn } from '@/@panther.core/components'
import { ABSENT_MARK } from '@/@panther.core/vocabulary'
import { formatCount, plural } from '@/app/format'
import type { SpeciesRecord } from '@/features/build/model'
import type { DistributionPoint } from '@/features/species/model/distribution'
import { formatPercent } from '@/features/species/model/format'
import { VERDICT_STATUS, readSpecies } from '@/features/species/model/interpretation'
import type { ReadingContext } from '@/features/species/model/interpretation'
import { SpeciesButton } from '@/features/species/components/SpeciesButton'

/**
 * Every species the report tracks individually, with the joined columns beside it.
 *
 * Supporting evidence, not the headline: it lives behind a toggle because a 131-row table is what
 * the distribution above exists to replace as the default reading.
 *
 * Sorting IS offered here, and that is deliberate rather than inconsistent. The node forward
 * tracking rows are complete - 131 of 131 - so ordering them by a column tells the truth. The
 * previous/current sequence columns beside them come from a table holding 50 of 147 rows, so a
 * missing value in those columns renders as UNKNOWN with the reason attached and sorts last. A
 * blank there would read as zero, which is what would manufacture phantom new species.
 */
export interface SpeciesTableProps {
  points: readonly DistributionPoint[]
  byOscode: Record<string, SpeciesRecord>
  context: ReadingContext
  selectedOscode?: string | null
  onSelect: (oscode: string) => void
  /** Species that appear only in the comparison tables, for the footnote. */
  onlyInComparison?: number
}

interface Row {
  point: DistributionPoint
  record: SpeciesRecord | null
}

const Unknown = ({ reason }: { reason: string }) => (
  <span className="text-ink-faint" title={reason}>
    {ABSENT_MARK}
  </span>
)

export const SpeciesTable = ({
  points,
  byOscode,
  context,
  selectedOscode = null,
  onSelect,
  onlyInComparison = 0,
}: SpeciesTableProps) => {
  const [query, setQuery] = useState('')

  const rows = useMemo<Row[]>(
    () => points.map(point => ({ point, record: byOscode[point.oscode] ?? null })),
    [points, byOscode]
  )

  const needle = query.trim().toUpperCase()
  const visible = needle === '' ? rows : rows.filter(row => row.point.oscode.includes(needle))

  const countsUnknown =
    `Not among the ${context.counts.label} of “${context.counts.tableName}” this report ` +
    'includes: unknown, not zero.'
  const uniprotUnknown =
    `Not among the ${context.uniprot.label} of “${context.uniprot.tableName}” this report ` +
    'includes: unknown, not zero.'

  const columns: readonly DataColumn<Row>[] = [
    {
      id: 'oscode',
      header: 'Species',
      kind: 'node',
      render: row => (
        <SpeciesButton
          oscode={row.point.oscode}
          onSelect={onSelect}
          selected={row.point.oscode === selectedOscode}
        />
      ),
      sortValue: row => row.point.oscode,
    },
    {
      id: 'pct',
      header: 'Forward-tracked',
      kind: 'number',
      hint: 'Share of this species’ nodes that mapped forward.',
      render: row => formatPercent(row.point.pct),
      sortValue: row => row.point.pct,
    },
    {
      id: 'total',
      header: 'Nodes total',
      kind: 'number',
      render: row => formatCount(row.point.total),
      sortValue: row => row.point.total,
    },
    {
      id: 'unmapped',
      header: 'Not tracked',
      kind: 'number',
      render: row => formatCount(row.point.unmapped),
      sortValue: row => row.point.unmapped,
    },
    {
      id: 'previous',
      header: 'Previous sequences',
      kind: 'number',
      hint: countsUnknown,
      render: row =>
        row.record?.counts.present === true ? (
          formatCount(row.record.counts.value?.previousCount ?? null)
        ) : (
          <Unknown reason={countsUnknown} />
        ),
      sortValue: row =>
        row.record?.counts.present === true
          ? (row.record.counts.value?.previousCount ?? null)
          : null,
    },
    {
      id: 'current',
      header: 'Current sequences',
      kind: 'number',
      hint: countsUnknown,
      render: row =>
        row.record?.counts.present === true ? (
          formatCount(row.record.counts.value?.currentCount ?? null)
        ) : (
          <Unknown reason={countsUnknown} />
        ),
      sortValue: row =>
        row.record?.counts.present === true
          ? (row.record.counts.value?.currentCount ?? null)
          : null,
    },
    {
      id: 'change',
      header: 'Change',
      kind: 'node',
      align: 'right',
      render: row =>
        row.record?.counts.present === true ? (
          <DeltaValue value={row.record.counts.value?.countDiff ?? null} kind="count" />
        ) : (
          <Unknown reason={countsUnknown} />
        ),
      sortValue: row =>
        row.record?.counts.present === true ? (row.record.counts.value?.countDiff ?? null) : null,
    },
    {
      id: 'uniprot',
      header: 'Same UniProt id',
      kind: 'number',
      hint: uniprotUnknown,
      render: row =>
        row.record?.uniprot.present === true ? (
          formatPercent(row.record.uniprot.value?.pctSameUniprot ?? null)
        ) : (
          <Unknown reason={uniprotUnknown} />
        ),
      sortValue: row =>
        row.record?.uniprot.present === true
          ? (row.record.uniprot.value?.pctSameUniprot ?? null)
          : null,
    },
    {
      id: 'reading',
      header: 'Note',
      kind: 'node',
      sortable: false,
      render: row => {
        if (row.record === null) return null
        const reading = readSpecies(row.record, context)
        if (reading.verdict === 'nominal') return null
        return (
          <span className="flex flex-wrap items-baseline gap-x-1.5">
            <StatusChip
              status={VERDICT_STATUS[reading.verdict]}
              label={reading.verdictLabel}
              hint={reading.headline}
            />
            <span className="text-ink-muted text-2xs">{reading.short}</span>
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-1.5">
      <FilterRow
        summary={`${formatCount(visible.length)} of ${formatCount(rows.length)} ${plural(
          rows.length,
          'species'
        )}`}
      >
        <TextInput
          size="xs"
          value={query}
          onChange={event => setQuery(event.currentTarget.value)}
          placeholder="Filter by oscode"
          aria-label="Filter species by oscode"
          className="w-44"
        />
      </FilterRow>

      {/* The forward-tracking rows are complete; the columns joined onto them are not, and the
          notice has to say which is which or sorting the table looks dishonest. */}
      <TruncationNotice
        completeness={{
          included: context.counts.includedRows,
          total: context.counts.totalRows,
          noun: 'rows',
        }}
        detail={
          `applies to the previous/current sequence columns only, from “${context.counts.tableName}”. ` +
          `The ${formatCount(rows.length)} forward-tracking rows are complete, which is why this ` +
          'table can be sorted.'
        }
      />

      <DataTable
        caption="Species node forward tracking, joined with the previous-library comparison"
        columns={columns}
        rows={visible}
        rowKey={row => row.point.oscode}
        selectedRowKey={selectedOscode}
        defaultSort={{ columnId: 'pct', direction: 'asc' }}
        pageSize={40}
        density="tight"
        maxHeight={460}
        footNote={
          onlyInComparison > 0
            ? `${formatCount(onlyInComparison)} further ${plural(
                onlyInComparison,
                'species'
              )} appear in the comparison tables but not in node forward tracking, so they have no row here.`
            : undefined
        }
      />
    </div>
  )
}
