import { BarCell, DataTable, EmptyState, StatusChip } from '@/@panther.core/components'
import type { DataColumn } from '@/@panther.core/components'
import { formatCount, plural } from '@/app/format'
import type { DistributionPoint } from '@/features/species/model/distribution'
import { formatPercent, formatPercentTerse } from '@/features/species/model/format'
import { VERDICT_STATUS } from '@/features/species/model/interpretation'
import type { SpeciesReading } from '@/features/species/model/interpretation'
import { SpeciesButton } from '@/features/species/components/SpeciesButton'

/**
 * The low tail, with the dashboard's reading of each entry.
 *
 * This is the table that decides whether the panel is trustworthy. Every row carries a verdict -
 * explained, not explained, or no evidence either way - and the point is that they are not all the
 * same: `DAPMA` at 0 % is explained by two other sources, while `FELCA` at 65 % has an established
 * previous proteome and nothing in the report accounts for it. A panel that produced a reassuring
 * sentence for every row would be worthless on the row that matters.
 *
 * Ordered by nodes NOT tracked forward rather than by rate, because the rate alone misranks the
 * tail: a species at 65 % with 8,910 nodes has lost fewer nodes than one at 90 % with 200,000.
 */
export interface LowTailRow {
  point: DistributionPoint
  /** `null` only when the cross-section carries no record for the species at all. */
  reading: SpeciesReading | null
}

export interface LowTailReadingsProps {
  rows: readonly LowTailRow[]
  threshold: number
  selectedOscode?: string | null
  onSelect: (oscode: string) => void
}

export const LowTailReadings = ({
  rows,
  threshold,
  selectedOscode = null,
  onSelect,
}: LowTailReadingsProps) => {
  const largestShortfall = rows.reduce((max, row) => Math.max(max, row.point.unmapped ?? 0), 0)

  const columns: readonly DataColumn<LowTailRow>[] = [
    {
      id: 'oscode',
      header: 'Species',
      kind: 'node',
      width: '7ch',
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
      render: row => formatPercent(row.point.pct),
      sortValue: row => row.point.pct,
    },
    {
      id: 'unmapped',
      header: 'Nodes not tracked',
      kind: 'node',
      align: 'left',
      hint: 'The size of the shortfall in nodes, which is what a rate on its own hides.',
      render: row => (
        <BarCell
          value={row.point.unmapped}
          max={largestShortfall}
          label={formatCount(row.point.unmapped)}
          width={72}
          title={`${formatCount(row.point.unmapped)} of ${formatCount(
            row.point.total
          )} nodes did not track forward`}
        />
      ),
      sortValue: row => row.point.unmapped,
    },
    {
      id: 'total',
      header: 'Nodes total',
      kind: 'number',
      render: row => formatCount(row.point.total),
      sortValue: row => row.point.total,
    },
    {
      id: 'reading',
      header: 'Dashboard reading',
      kind: 'node',
      render: row =>
        row.reading === null ? (
          <StatusChip
            status="unknown"
            label="No cross-section record"
            hint="No source in this report joins onto this oscode, so there is nothing to read."
          />
        ) : (
          <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <StatusChip
              status={VERDICT_STATUS[row.reading.verdict]}
              label={row.reading.verdictLabel}
              hint={row.reading.headline}
            />
            <span className="text-ink-muted text-2xs">{row.reading.short}</span>
          </span>
        ),
      sortValue: row => row.reading?.verdict ?? null,
    },
  ]

  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        title={`No species below ${formatPercentTerse(threshold, 0)}`}
        description="Every species the report tracks individually is at or above the low-outlier threshold."
      />
    )
  }

  return (
    <DataTable
      caption={`Species below ${formatPercentTerse(threshold, 0)} node forward tracking`}
      captionVisible={false}
      columns={columns}
      rows={rows}
      rowKey={row => row.point.oscode}
      selectedRowKey={selectedOscode}
      defaultSort={{ columnId: 'unmapped', direction: 'desc' }}
      pageSize={0}
      density="tight"
      maxHeight={320}
      footNote={
        `${formatCount(rows.length)} ${plural(rows.length, 'species')} below ` +
        `${formatPercentTerse(threshold, 0)}, ordered by nodes not tracked forward rather than by ` +
        'rate. The verdict in the last column is this dashboard reading the report, not something ' +
        'the generator wrote.'
      }
    />
  )
}
