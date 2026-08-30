import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Panel, StatusChip } from '@/@panther.core/components'
import { plural } from '@/app/format'
import { phaseRoute } from '@/features/build/model'
import { useBuildReport } from '@/features/build/hooks'
import { buildStatement } from '@/features/pipeline/summary'

/**
 * The answer to acceptance questions 1 and 2, written out.
 *
 * A reviewer must not have to scan fourteen nodes to work out where the build reached and what is
 * incomplete behind it, and the two are DIFFERENT findings: the frontier is how far the build
 * genuinely progressed, a hole is an earlier phase that never finished even though later ones did.
 * Conflating them - by calling the earliest incomplete phase "where the build stopped" - is the
 * single most consequential mistake available in this product, so both sentences are stated
 * explicitly and the hole sentence names the steps that remain rather than counting them.
 *
 * Marked as derived: these sentences are the dashboard's reading of the report, not something the
 * generator wrote.
 */
export const FrontierSummary = () => {
  const report = useBuildReport()
  const statement = useMemo(() => buildStatement(report), [report])
  const frontierIndex = report.pipeline.frontierIndex
  const frontier = frontierIndex === null ? null : (report.pipeline.phases[frontierIndex] ?? null)

  return (
    <Panel
      title="Where this build stands"
      provenance="derived"
      density="tight"
      status={
        frontier === null ? undefined : (
          <StatusChip
            status="frontier"
            detail={`${frontier.completedSteps}/${frontier.totalSteps}`}
            size="md"
          />
        )
      }
      breakBefore={false}
    >
      <div className="space-y-1.5">
        <p className="text-ink max-w-prose text-xs" data-pb-statement="frontier">
          {statement.ahead === null
            ? statement.frontier
            : `${statement.frontier} ${statement.ahead}`}
        </p>

        {frontier !== null && (
          <Link
            to={phaseRoute(frontier.id)}
            className="text-accent hover:text-accent-hover text-2xs inline-block"
          >
            Open {frontier.name} →
          </Link>
        )}

        <p className="text-ink max-w-prose text-xs" data-pb-statement="holes">
          {statement.holes}
        </p>

        {statement.holeDetails.length > 0 && (
          <ul className="list-none space-y-1 p-0">
            {statement.holeDetails.map(hole => (
              <li key={hole.phaseId} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <StatusChip status="hole" />
                <Link
                  to={phaseRoute(hole.phaseId)}
                  className="text-accent hover:text-accent-hover text-xs"
                >
                  {hole.name}
                </Link>
                <span className="text-ink-muted text-2xs" data-pb-statement="hole-detail">
                  {`${hole.counter} done. Incomplete: ${hole.incompleteGoals.join(', ')}. ` +
                    `${hole.laterPhasesRan} later ${plural(
                      hole.laterPhasesRan,
                      'phase'
                    )} carried on past it.`}
                </span>
              </li>
            ))}
          </ul>
        )}

        {statement.failureSentence !== null && (
          <p
            className="flex flex-wrap items-baseline gap-x-1.5 text-xs"
            data-pb-statement="failure"
          >
            <StatusChip status="failed" />
            <span className="text-ink">{statement.failureSentence}</span>
          </p>
        )}

        {statement.blockedSentence !== null && (
          <p
            className="flex flex-wrap items-baseline gap-x-1.5 text-xs"
            data-pb-statement="blocked"
          >
            <StatusChip status="blocked" />
            <span className="text-ink">{statement.blockedSentence}</span>
          </p>
        )}
      </div>
    </Panel>
  )
}

export default FrontierSummary
