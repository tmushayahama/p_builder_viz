import { Link } from 'react-router-dom'
import { DataTable, StatusChip } from '@/@panther.core/components'
import type { DataColumn } from '@/@panther.core/components'
import { formatCount } from '@/app/format'
import { stepRoute } from '@/features/build/model'
import { formatSigned } from '@/features/mapping/model'
import type { MappingView, StageAttribution, StageRow } from '@/features/mapping/model'

/**
 * The exact numbers, plus the two things a reader needs to go and check them: the mapping file each
 * stage wrote and the declared pipeline step that produced it.
 *
 * The attribution is a match on the step's goal artifact, and it is deliberately conservative. The
 * previous-library rebuild declares goals with the same basenames under a `prev_lib_rebuilt/`
 * prefix, so a basename match is only accepted when it is unique; anything else is reported as
 * ambiguous or unmatched rather than resolved by guessing. Four stages on this fixture have no
 * declared step at all, and saying so is more useful than an invented link.
 */
export interface MappingStageTableProps {
  view: MappingView
}

const Attribution = ({ attribution }: { attribution: StageAttribution }) => {
  if (attribution.kind === 'none') {
    return <span className="text-ink-faint text-2xs">no declared step names this artifact</span>
  }

  if (attribution.kind === 'ambiguous') {
    return (
      <span className="text-ink-muted text-2xs">
        {`ambiguous — ${attribution.candidates.length} declared goals share this filename: `}
        {attribution.candidates.map(candidate => candidate.goal).join(', ')}
      </span>
    )
  }

  const { step } = attribution
  return (
    <span className="flex flex-wrap items-baseline gap-x-1.5">
      <Link to={stepRoute(step.stepId)} className="text-accent pb-ident text-2xs">
        {step.goal}
      </Link>
      <span className="text-ink-faint text-2xs">{step.phaseName}</span>
      {!step.isComplete && <StatusChip status="pending" label={step.statusLabel} />}
    </span>
  )
}

export const MappingStageTable = ({ view }: MappingStageTableProps) => {
  const columns: readonly DataColumn<StageRow>[] = [
    {
      id: 'order',
      header: 'Order',
      kind: 'number',
      width: 56,
      render: row => (row.order === null ? '—' : row.order),
      sortValue: row => row.order,
    },
    { id: 'stage', header: 'Stage', kind: 'mono', render: row => row.stage },
    {
      id: 'total',
      header: 'Sequences at stage',
      kind: 'number',
      hint: 'Sequences still present at this stage. Falls through trimming and de-duplication.',
      render: row => formatCount(row.totalSequences),
      sortValue: row => row.totalSequences,
    },
    {
      id: 'assigned',
      header: 'Assigned to a family',
      kind: 'number',
      render: row => formatCount(row.assigned),
      sortValue: row => row.assigned,
    },
    {
      id: 'assignedDelta',
      header: 'Change in assigned',
      kind: 'number',
      render: row => (row.isBaseline ? 'baseline' : formatSigned(row.assignedDelta)),
      sortValue: row => row.assignedDelta,
    },
    {
      id: 'unassigned',
      header: 'Unassigned',
      kind: 'number',
      render: row => formatCount(row.unassigned),
      sortValue: row => row.unassigned,
    },
    {
      id: 'pct',
      header: 'Assignment rate',
      kind: 'number',
      render: row => (row.pctAssigned === null ? '—' : `${row.pctAssigned.toFixed(1)} %`),
      sortValue: row => row.pctAssigned,
    },
    {
      id: 'families',
      header: 'Families',
      kind: 'number',
      render: row => formatCount(row.families),
      sortValue: row => row.families,
    },
    ...view.series.flatMap((entry): DataColumn<StageRow>[] => [
      {
        id: `cum-${entry.mechanism}`,
        header: `${entry.label} cumulative`,
        kind: 'number',
        render: row =>
          formatCount(
            row.mechanisms.find(candidate => candidate.mechanism === entry.mechanism)?.cumulative ??
              null
          ),
      },
      {
        id: `delta-${entry.mechanism}`,
        header: `${entry.label} change`,
        kind: 'number',
        render: row => {
          const value = row.mechanisms.find(candidate => candidate.mechanism === entry.mechanism)
          if (value === undefined || value.cumulative === null) return '—'
          return value.isFirstAppearance
            ? `first seen (${formatCount(value.cumulative)})`
            : formatSigned(value.delta)
        },
      },
    ]),
    {
      id: 'file',
      header: 'Mapping file',
      kind: 'mono',
      render: row => row.mappingFile ?? '—',
    },
    {
      id: 'step',
      header: 'Produced by',
      kind: 'node',
      hint: 'The declared pipeline step whose goal artifact is this mapping file.',
      render: row => <Attribution attribution={row.attribution} />,
    },
  ]

  return (
    <DataTable
      caption="Mapping stages: exact figures, mapping files and the steps that produced them"
      columns={columns}
      rows={view.stages}
      rowKey={row => row.id}
      pageSize={0}
      density="tight"
      maxHeight={420}
      footNote="Mechanism cumulative columns are running totals as the report stores them; the change columns are differences against the previous stage that reported the mechanism."
    />
  )
}
