import { useMemo } from 'react'
import { Sparkline } from '@/@panther.core/charts'
import {
  DeltaValue,
  Disclosure,
  MetricValue,
  Panel,
  SectionHeading,
  StatusChip,
  UnavailableNotice,
} from '@/@panther.core/components'
import { seriesFill } from '@/@panther.core/theme/tokens'
import { formatCount, plural } from '@/app/format'
import { useBuildReport } from '@/features/build/hooks'
import type { BuildReport } from '@/features/build/model'
import { BlastQcMetrics } from '@/features/mapping/components/BlastQcMetrics'
import { MappingChanges } from '@/features/mapping/components/MappingChanges'
import { MappingProgression } from '@/features/mapping/components/MappingProgression'
import { MappingStageTable } from '@/features/mapping/components/MappingStageTable'
import { StageAnnotations } from '@/features/mapping/components/StageAnnotations'
import { buildMappingView } from '@/features/mapping/model'

/**
 * Sequence mapping and family assignment: the progression, the changes, then the raw table.
 *
 * The order is the argument. The story first (composition against the envelope, then what each
 * stage changed), the annotations that spare a reader the arithmetic, and only then the exact
 * figures behind a disclosure. A table opening this view would answer "what are the numbers"
 * before answering "what happened", which is the wrong way round for a build report.
 *
 * Every count here comes from the metric definitions registry. Three of the report's six distinct
 * sequence counts appear in this panel alone, and the whole point of the registry is that none of
 * them can end up labelled "Sequences".
 */
export interface MappingReportViewProps {
  report: BuildReport
}

export const MappingReportView = ({ report }: MappingReportViewProps) => {
  const view = useMemo(() => buildMappingView(report), [report])
  const mapping = view.summary
  const finalStage = view.stages[view.stages.length - 1] ?? null
  const phase = view.phase

  const holeNotice =
    phase === null || phase.completedSteps >= phase.totalSteps ? null : (
      <div className="bg-surface-2 pb-hairline rounded-hair space-y-1 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusChip
            status={phase.isHole ? 'hole' : phase.status}
            detail={`${phase.completedSteps}/${phase.totalSteps}`}
          />
          <span className="text-ink text-2xs font-semibold">
            {phase.name} did not finish, but the mapping figures below are present.
          </span>
        </div>
        <p className="text-ink-muted text-2xs">
          {view.incompleteStepGoals.length}{' '}
          {plural(view.incompleteStepGoals.length, 'declared step')} in this phase never finished
          {view.incompleteStepGoals.length === 0 ? '' : ': '}
          <span className="pb-ident text-ink">{view.incompleteStepGoals.join(', ')}</span>.
          {view.laterCompletePhaseCount > 0 && (
            <>
              {' '}
              {view.laterCompletePhaseCount} later {plural(view.laterCompletePhaseCount, 'phase')}{' '}
              completed, so this is a hole behind the frontier rather than where the build stopped —
              and the numbers below were produced without those steps running.
            </>
          )}
        </p>
      </div>
    )

  // One notice, not four. When the section is missing entirely there is nothing for the
  // progression, the changes or the stage table to qualify, so they are not mounted at all.
  if (mapping.availability === 'absent' || mapping.availability === 'error') {
    return (
      <div className="space-y-gutter">
        <Panel
          title="Sequence mapping and family assignment"
          subtitle={mapping.sectionId ?? 'mapping'}
          provenance="generator"
          density="tight"
        >
          <UnavailableNotice
            availability={mapping.availability}
            subject="Sequence mapping and family assignment"
            message={mapping.message ?? undefined}
          >
            No stage progression, per-stage change or mapping-file detail is shown, and no figure
            elsewhere in this report is adjusted to compensate.
          </UnavailableNotice>
        </Panel>
        <BlastQcMetrics report={report} />
      </div>
    )
  }

  return (
    <div className="space-y-gutter">
      <Panel
        title="Sequence mapping and family assignment"
        subtitle={mapping.sectionId ?? 'mapping'}
        availability={mapping.availability}
        message={mapping.message ?? undefined}
        missingSubject="Sequence mapping and family assignment"
        provenance="generator"
        status={
          <span className="pb-figures text-ink-muted text-2xs">
            {view.stages.length} {plural(view.stages.length, 'stage')} · {view.series.length}{' '}
            {plural(view.series.length, 'mechanism')}
          </span>
        }
        footer="Each figure above carries its own definition: this report holds six distinct sequence counts and three of them appear here. Hover a label to see which is which."
      >
        <div className="space-y-3">
          {holeNotice}

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <MetricValue
              metricId="inputReferenceSequences"
              value={mapping.inputSequences}
              layout="stack"
              absentReason="no first stage reported"
            />
            <MetricValue
              metricId="finalStageSequences"
              value={mapping.finalTotalSequences}
              layout="stack"
              aside={
                view.envelopeLoss === null ? undefined : (
                  <DeltaValue value={-view.envelopeLoss} compareLabel="vs first stage" />
                )
              }
            />
            <MetricValue
              metricId="assignedSequences"
              value={mapping.finalAssigned}
              layout="stack"
              emphasis="accent"
            />
            <MetricValue
              metricId="unassignedSequences"
              value={finalStage?.unassigned ?? null}
              layout="stack"
            />
            <MetricValue
              metricId="pctAssigned"
              value={mapping.finalPctAssigned}
              layout="stack"
              unit="%"
              format={value => value.toFixed(1)}
              aside={
                <DeltaValue
                  value={mapping.assignmentGainPoints}
                  kind="percentage-point"
                  sentiment="higher-is-better"
                  compareLabel="across the run"
                />
              }
            />
            <MetricValue metricId="families" value={mapping.finalFamilies} layout="stack" />
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="flex items-center gap-1.5">
              <span className="text-ink-muted text-2xs">Assignment rate by stage</span>
              <Sparkline
                values={view.pctSeries}
                ariaLabel={`Assignment rate across ${view.stages.length} mapping stages`}
                valueLabel={`${mapping.firstPctAssigned?.toFixed(1) ?? '—'} → ${
                  mapping.finalPctAssigned?.toFixed(1) ?? '—'
                } %`}
                stroke={seriesFill(1)}
              />
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-ink-muted text-2xs">Families by stage</span>
              <Sparkline
                values={view.familySeries}
                ariaLabel={`Family count across ${view.stages.length} mapping stages`}
                valueLabel={`${formatCount(view.stages[0]?.families ?? null)} → ${formatCount(
                  finalStage?.families ?? null
                )}`}
                stroke={seriesFill(1)}
              />
            </span>
          </div>

          <MappingProgression view={view} />
        </div>
      </Panel>

      <Panel
        title="Per-stage change"
        subtitle={mapping.sectionId ?? 'mapping'}
        availability={mapping.availability}
        message={mapping.message ?? undefined}
        missingSubject="Per-stage mapping change"
        provenance="derived"
      >
        <div className="space-y-3">
          <MappingChanges view={view} />
          <StageAnnotations view={view} />
        </div>
      </Panel>

      <Panel
        title="Stage detail"
        subtitle={mapping.sectionId ?? 'mapping'}
        availability={mapping.availability}
        message={mapping.message ?? undefined}
        missingSubject="Mapping stage detail"
        provenance="generator"
        density="tight"
      >
        <Disclosure
          summary="Exact figures, mapping files and the step that produced each stage"
          count={`${view.stages.length} ${plural(view.stages.length, 'row')}`}
          bare
        >
          <div className="space-y-2">
            <SectionHeading level={4} description="Every value as the report wrote it.">
              Raw mapping stages
            </SectionHeading>
            <MappingStageTable view={view} />
          </div>
        </Disclosure>
      </Panel>

      <BlastQcMetrics report={report} />
    </div>
  )
}

const MappingReport = () => <MappingReportView report={useBuildReport()} />

export default MappingReport
