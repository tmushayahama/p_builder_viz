import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  DataTable,
  Disclosure,
  EmptyState,
  Panel,
  Provenance,
  SectionHeading,
  StatusChip,
  UnknownValue,
} from '@/@panther.core/components'
import type { DataColumn } from '@/@panther.core/components'
import { plural } from '@/app/format'
import { reportRoute } from '@/features/build/model'
import type { BuildReport, ReportPlacement, ReportRegistryEntry } from '@/features/build/model'
import { useBuildReport } from '@/features/build/hooks'
import { GenericReport } from '@/features/reports/components/GenericReport'
import { getReportRenderer } from '@/features/reports/registry'

/**
 * Every section the report carries, recognised or not.
 *
 * The spine is the navigation, so this is deliberately not a second navigation model: it is the
 * report's own table of contents, at the foot of the record, answering one question a reviewer has
 * to be able to answer about a generated document - what is in here, and how much of it does this
 * dashboard actually understand?
 *
 * That is why it lists sections the dashboard has never seen beside the ones it has, states for
 * each whether the model had a specialised extractor and whether a specialised VIEW exists, and
 * renders the unrecognised ones through the generic fallback right here. A section the dashboard
 * cannot name is a fact about the report, not a reason to hide it.
 */

const GROUPS: readonly { placement: ReportPlacement; label: string; description: string }[] = [
  {
    placement: 'preamble',
    label: 'Build preamble',
    description:
      'Configuration and provenance are the header of the build record, not a peer report tab.',
  },
  {
    placement: 'pipeline',
    label: 'The pipeline spine',
    description: 'This section is the spine itself; it does not hang from a phase.',
  },
  {
    placement: 'phase',
    label: 'Bound to a pipeline phase',
    description: 'Hangs from the phase it describes, and is mounted when that phase is open.',
  },
  {
    placement: 'unattached',
    label: 'Unattached',
    description:
      'No phase binding, either because no binding is registered or because the phase hint names ' +
      'a phase the report never declared. Surfaced at the end of the spine.',
  },
]

function phaseNameOf(report: BuildReport, entry: ReportRegistryEntry): string | null {
  if (entry.primaryPhaseId === null) return null
  return report.pipeline.phases.find(phase => phase.id === entry.primaryPhaseId)?.name ?? null
}

const StatusCell = ({ entry }: { entry: ReportRegistryEntry }) =>
  entry.status.isUnknown ? (
    <UnknownValue
      value={entry.status.raw ?? '(not reported)'}
      kind="status"
      source={`sections[${entry.index}].status`}
    />
  ) : (
    <StatusChip status={entry.status.kind} label={entry.status.label} />
  )

function buildColumns(report: BuildReport): DataColumn<ReportRegistryEntry>[] {
  return [
    {
      id: 'section',
      header: 'Section',
      kind: 'node',
      render: entry => (
        <span className="flex flex-col gap-px">
          <Link to={reportRoute(entry.sectionId)} className="text-accent text-xs">
            {entry.title ?? entry.sectionId}
          </Link>
          <span className="pb-ident text-ink-faint text-2xs">{entry.sectionId}</span>
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Reported status',
      kind: 'node',
      render: entry => <StatusCell entry={entry} />,
    },
    {
      id: 'reading',
      header: 'Model reading',
      kind: 'node',
      render: entry =>
        entry.known ? (
          <span className="text-ink-muted text-2xs">Specialised extractor</span>
        ) : (
          <StatusChip
            status="unknown"
            label="Unrecognised section"
            hint="This dashboard has no extractor for this section id. It is read from its structure alone."
          />
        ),
    },
    {
      id: 'view',
      header: 'View',
      kind: 'node',
      render: entry => {
        if (entry.placement === 'pipeline') {
          return <span className="text-ink-muted text-2xs">The spine itself</span>
        }
        const renderer = getReportRenderer(entry.sectionId)
        return renderer === null ? (
          <span className="text-ink-muted text-2xs">Generic fallback</span>
        ) : (
          <span className="text-ink text-2xs">{renderer.title}</span>
        )
      },
    },
    {
      id: 'phase',
      header: 'Bound to',
      kind: 'text',
      render: entry => {
        const name = phaseNameOf(report, entry)
        const extra = entry.phaseIds.length - (entry.primaryPhaseId === null ? 0 : 1)
        return (
          <span className="text-ink-muted text-2xs">
            {name ?? '—'}
            {extra > 0 && ` (+${extra} contributing)`}
            {entry.phaseHint !== null && (
              <span className="pb-ident text-ink-faint"> hint: {entry.phaseHint}</span>
            )}
          </span>
        )
      },
    },
  ]
}

export const ReportsIndex = () => {
  const report = useBuildReport()
  const columns = useMemo(() => buildColumns(report), [report])

  const unrecognised = report.reports.filter(entry => !entry.known)
  // `progress` has no specialised renderer either, but it is not rendered by the fallback: it IS
  // the spine, and listing it here would claim a view it does not have.
  const genericViews = report.reports.filter(
    entry => entry.placement !== 'pipeline' && getReportRenderer(entry.sectionId) === null
  )
  const groups = GROUPS.map(group => ({
    ...group,
    entries: report.reports.filter(entry => entry.placement === group.placement),
  })).filter(group => group.entries.length > 0)

  return (
    <div className="space-y-gutter">
      <Panel
        title="Report sections"
        subtitle={`${report.reports.length} in this report`}
        provenance="derived"
        status={
          <span className="flex flex-wrap items-center gap-1.5">
            <StatusChip
              status={unrecognised.length === 0 ? 'pass' : 'unknown'}
              label={
                unrecognised.length === 0
                  ? 'Every section recognised'
                  : `${unrecognised.length} unrecognised`
              }
              hint="Whether this dashboard has a specialised extractor for each section id."
            />
            <StatusChip
              status={report.schema.degraded ? 'warn' : 'pass'}
              label={
                report.schema.degraded
                  ? 'Schema not fully supported'
                  : `Schema ${report.schema.version} supported`
              }
              hint={report.schema.explanation}
            />
          </span>
        }
        footer={
          <span className="flex flex-wrap items-baseline gap-x-2">
            <Provenance source="derived" detail="section registry" />
            <span>
              Assembled by the dashboard from the report&rsquo;s own section list. Sections it does
              not recognise are listed and rendered, never dropped.
            </span>
          </span>
        }
      >
        <div className="space-y-3">
          {report.schema.degraded && (
            <div role="note" className="bg-status-warn-wash pb-hairline rounded-hair px-2 py-1.5">
              <p className="text-ink-muted text-2xs max-w-prose">
                {report.schema.explanation} The sections below are still listed and still render;
                what this dashboard cannot claim is that it understands every field in them.
              </p>
              <UnknownValue
                value={report.schema.reported}
                kind="schema version"
                source="schema_version"
              />
            </div>
          )}

          {groups.map(group => (
            <div key={group.placement} className="space-y-1.5">
              <SectionHeading
                level={4}
                count={`${group.entries.length} ${plural(group.entries.length, 'section')}`}
                description={group.description}
              >
                {group.label}
              </SectionHeading>
              <DataTable
                columns={columns}
                rows={group.entries}
                rowKey={entry => entry.sectionId}
                caption={`${group.label} sections`}
                density="tight"
                pageSize={0}
              />
            </div>
          ))}
        </div>
      </Panel>

      <SectionHeading
        level={3}
        count={`${genericViews.length} ${plural(genericViews.length, 'section')}`}
        description="No specialised view is registered for these section ids, so the fallback reads them from their structure. Adding a specialised view later is one row in the renderer registry."
      >
        Rendered by the generic fallback
      </SectionHeading>

      {genericViews.length === 0 ? (
        <EmptyState
          compact
          title="Every section has a specialised view"
          description="Nothing in this report needed the fallback."
        />
      ) : (
        genericViews.map(entry => (
          <Disclosure
            key={entry.sectionId}
            summary={
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-ink">{entry.title ?? entry.sectionId}</span>
                <span className="pb-ident text-ink-faint text-2xs">{entry.sectionId}</span>
                {!entry.known && <StatusChip status="unknown" label="Unrecognised section" />}
              </span>
            }
            summaryAside={<StatusCell entry={entry} />}
            // Unmounted while closed, unlike every other disclosure in the app: this is a SECOND
            // rendering of a section that is already mounted in full under the phase or the preamble
            // that owns it, so the printed record loses nothing and the page does not carry the
            // captured config.mk twice.
            unmountClosed
          >
            {/* Anchors off: the canonical mount for this section already owns its DOM id. */}
            <GenericReport report={entry} anchors={false} />
          </Disclosure>
        ))
      )}
    </div>
  )
}

export default ReportsIndex
