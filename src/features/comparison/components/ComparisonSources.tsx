import { Provenance, StatusChip } from '@/@panther.core/components'
import { plural } from '@/app/format'
import type { ComparisonView } from '@/features/comparison/model'

/**
 * Which report sections this comparison was assembled from, and which one is missing.
 *
 * The comparison is not tied to the `prev_lib` section, and this block is the reason that choice is
 * legible rather than merely convenient. `prev_lib` is absent on this report - the generator says
 * "inputs not present yet" - yet `other_reports` still carries the previous-versus-new sequence
 * counts, the species count table and the previous-UniProt agreement. Naming the missing source
 * beside the ones that contributed is what turns "partially available" from an apology into a
 * statement about the architecture: the report degraded and the view still has most of its value.
 */
export interface ComparisonSourcesProps {
  view: ComparisonView
}

export const ComparisonSources = ({ view }: ComparisonSourcesProps) => {
  const { presentSources, missingSources, summary } = view

  return (
    <div className="space-y-1.5">
      <p className="text-ink-muted text-2xs">
        <span className="text-ink font-semibold">
          Assembled from {presentSources.length} of {summary.contributors.length} report{' '}
          {plural(summary.contributors.length, 'section')}.
        </span>{' '}
        {missingSources.length === 0
          ? 'Every source this comparison can use is present.'
          : `Missing: ${missingSources.map(entry => entry.sectionId).join(', ')}. What follows is what the remaining sources support, and nothing below is inferred from the absence.`}
      </p>

      <ul className="list-none p-0">
        {summary.contributors.map(entry => (
          <li
            key={entry.sectionId}
            className="pb-hairline-b flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-1"
          >
            <StatusChip status={entry.present ? 'available' : 'absent'} />
            <code className="pb-ident text-ink text-2xs">{entry.sectionId}</code>
            <span className="text-ink-muted text-2xs min-w-0 flex-1">{entry.what}</span>
            {entry.note !== null && (
              <span className="text-2xs">
                <span className="text-ink-faint">
                  {entry.present ? 'note: ' : 'generator message: '}
                </span>
                <q className="pb-ident text-ink">{entry.note}</q>
              </span>
            )}
          </li>
        ))}
      </ul>

      {summary.notes.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Provenance source="derived" detail="assembled by this dashboard" />
          <ul className="text-ink-muted text-2xs min-w-0 flex-1 list-none p-0">
            {summary.notes.map(note => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
