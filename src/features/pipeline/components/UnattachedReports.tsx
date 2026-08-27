import { useMemo } from 'react'
import { EmptyState, Panel, SectionHeading, StatusChip } from '@/@panther.core/components'
import { plural } from '@/app/format'
import { UNATTACHED_PHASE_NAME } from '@/features/build/model'
import { useBuildReport } from '@/features/build/hooks'
import { unattachedReports } from '@/features/pipeline/model'
import { ReportMount } from '@/features/reports/registry'

/**
 * Sections bound to no phase.
 *
 * This node exists so that extensibility is demonstrable rather than claimed. A section this
 * dashboard has never seen - a future Pfam coverage report, a tree-quality summary - has no
 * specialised view and no phase binding, and the wrong answer is to drop it: the report would then
 * be lying about its own contents. So it lands here, is named, keeps its literal status, and is
 * rendered through the generic fallback.
 *
 * The node is shown even when it is empty, because "nothing was left out" is itself a finding a
 * reviewer needs to be able to establish.
 */
export const UnattachedReports = () => {
  const report = useBuildReport()
  const entries = useMemo(() => unattachedReports(report), [report])

  return (
    <div className="space-y-gutter">
      <Panel
        title={UNATTACHED_PHASE_NAME}
        breakBefore
        status={
          <span className="pb-figures text-ink-muted text-2xs">
            {entries.length} {plural(entries.length, 'section')}
          </span>
        }
      >
        <div className="space-y-2">
          <p className="text-ink-muted max-w-prose text-xs">
            These report sections are not bound to a pipeline phase — either this dashboard has no
            registered binding for them, or they name a phase the report never declared. They are
            surfaced here rather than hidden, and rendered through the generic fallback.
          </p>

          {entries.length === 0 ? (
            <EmptyState
              compact
              title="Every section is bound to a phase"
              description="Nothing in this report was left out of the spine."
            />
          ) : (
            <ul className="list-none space-y-1 p-0">
              {entries.map(entry => (
                <li key={entry.sectionId} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-ink text-xs">{entry.title ?? entry.sectionId}</span>
                  <span className="pb-ident text-ink-faint text-2xs">{entry.sectionId}</span>
                  <StatusChip
                    status={
                      entry.status.isUnknown ? (entry.status.raw ?? 'unknown') : entry.status.kind
                    }
                  />
                  {!entry.known && (
                    <span className="text-ink-faint text-2xs">
                      no specialised renderer registered
                    </span>
                  )}
                  {entry.phaseHint !== null && (
                    <span className="text-ink-faint text-2xs">
                      phase hint <span className="pb-ident">{entry.phaseHint}</span> matched no
                      declared phase
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      {entries.length > 0 && (
        <>
          <SectionHeading level={3} count={`${entries.length} ${plural(entries.length, 'report')}`}>
            Generic rendering
          </SectionHeading>
          {entries.map(entry => (
            <ReportMount key={entry.sectionId} report={entry} />
          ))}
        </>
      )}
    </div>
  )
}

export default UnattachedReports
