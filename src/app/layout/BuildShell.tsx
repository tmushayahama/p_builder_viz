import { EmptyState } from '@/@panther.core/components'
import { useBuildReport, useSelectSpecies, useSelectedOscode } from '@/features/build/hooks'
import { BuildPreamble } from '@/features/preamble/components/BuildPreamble'
import { GlanceCharts } from '@/features/overview/components/GlanceCharts'
import { FrontierSummary } from '@/features/pipeline/components/FrontierSummary'
import { PhaseDetail } from '@/features/pipeline/components/PhaseDetail'
import { PhaseTimeline } from '@/features/pipeline/components/PhaseTimeline'
import { PipelineSpine } from '@/features/pipeline/components/PipelineSpine'
import { UnattachedReports } from '@/features/pipeline/components/UnattachedReports'
import { useActivePhaseIndex, usePhaseDeepLink } from '@/features/pipeline/hooks'
import { ReportsIndex } from '@/features/reports/components/ReportsIndex'
import { ChecksMount, SpeciesDetailMount } from '@/features/reports/registry'

/**
 * The build record: preamble across the top, the spine persistent down the left, and the selected
 * phase plus its bound reports in the content column.
 *
 * The layout carries an argument. The spine is not a sidebar of links, it is the structure of the
 * build, so it stays on screen while the content column changes and it is the only way into a
 * report. Above it sit the two things that must be true before any figure below means anything:
 * what build this is and whether the report is fresh, then where the build actually reached and
 * what is incomplete behind that.
 *
 * The species detail is mounted here rather than inside a report, because the same species record
 * is reached from node tracking, from the release comparison and from a deep link, and three
 * copies of one panel would be three places for it to drift.
 */
const BuildShell = () => {
  const report = useBuildReport()
  const target = usePhaseDeepLink(report)
  const active = useActivePhaseIndex(report)
  const oscode = useSelectedOscode()
  const selectSpecies = useSelectSpecies()

  const highlightId = target.isRecent ? target.id : null
  const phase = typeof active === 'number' ? (report.pipeline.phases[active] ?? null) : null

  return (
    <div className="space-y-gutter">
      <BuildPreamble />
      <FrontierSummary />
      <GlanceCharts />

      <div className="gap-gutter flex flex-col md:flex-row md:items-start">
        <div
          data-pb-scroll=""
          className="md:sticky md:top-2 md:max-h-[calc(100vh-1rem)] md:w-64 md:shrink-0 md:overflow-y-auto lg:w-72 xl:w-80"
        >
          <PipelineSpine highlightId={highlightId} />
        </div>

        <div className="space-y-gutter min-w-0 flex-1">
          {oscode !== null && (
            <SpeciesDetailMount oscode={oscode} onClose={() => selectSpecies(null)} />
          )}

          {active === 'unattached' ? (
            <UnattachedReports />
          ) : phase !== null ? (
            <PhaseDetail phase={phase} highlightId={highlightId} />
          ) : (
            <EmptyState
              title="No pipeline phases in this report"
              description="The report carries no readable progress section, so there is no phase to show. Nothing below is inferred from that absence."
            />
          )}

          <PhaseTimeline />
          <ChecksMount />
          <ReportsIndex />
        </div>
      </div>
    </div>
  )
}

export default BuildShell
