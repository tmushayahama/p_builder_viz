import clsx from 'clsx'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Panel, StatusChip, StatusIcon } from '@/@panther.core/components'
import { plural } from '@/app/format'
import { UNATTACHED_PHASE_ID, phaseElementId, phaseRoute } from '@/features/build/model'
import type { PhaseStatus } from '@/features/build/model'
import {
  useBuildReport,
  useExpandedPhaseIds,
  useSelectPhase,
  useTogglePhaseExpanded,
} from '@/features/build/hooks'
import { useActivePhaseIndex } from '@/features/pipeline/hooks'
import { PhaseNode } from '@/features/pipeline/components/PhaseNode'
import {
  attributeWarningsToPhases,
  buildSpineNodes,
  laterPhasesWithWork,
  phaseMarkers,
  unattachedReports,
} from '@/features/pipeline/model'
import type { PhaseSelectionTarget } from '@/features/pipeline/model'
import type { StatusKey } from '@/@panther.core/vocabulary'

/**
 * The spine: the application's primary navigation, its progress display and its frontier/hole
 * readout, all in one persistent structure.
 *
 * It lists the phases in DECLARED order - the inferred timeline is the only place artifact time
 * order is used - and it ends with a node for the sections bound to no phase, so an unfamiliar or
 * unmapped report is surfaced rather than dropped. There is deliberately no top-level navigation
 * mirroring the report's section ids: reports hang from the phase they describe, and the binding is
 * only visible if the phase is the way in.
 */

/** Fixed reading order for the legend, so the states are learned in one arrangement. */
const LEGEND_ORDER: readonly PhaseStatus[] = ['complete', 'active', 'hole', 'blocked', 'pending']

const LEGEND_KEY: Record<PhaseStatus, StatusKey> = {
  complete: 'complete',
  active: 'frontier',
  hole: 'hole',
  blocked: 'blocked',
  pending: 'pending',
}

export interface PipelineSpineProps {
  /** The deep-link target, so the node a link points at flashes when it arrives. */
  highlightId?: string | null
}

export const PipelineSpine = ({ highlightId }: PipelineSpineProps) => {
  const report = useBuildReport()
  const active = useActivePhaseIndex(report)
  const select = useSelectPhase()
  const navigate = useNavigate()
  const expandedIds = useExpandedPhaseIds()
  const toggleExpanded = useTogglePhaseExpanded()

  const nodes = useMemo(() => buildSpineNodes(report), [report])
  const warningsByPhase = useMemo(() => attributeWarningsToPhases(report), [report])
  const unattached = useMemo(() => unattachedReports(report), [report])

  const { pipeline } = report
  const phaseCount = pipeline.phases.length
  // One scale for every duration bar in the spine, so a longer bar always means a
  // longer phase rather than a differently-scaled row.
  const longestPhaseSeconds = pipeline.phases.reduce<number | null>(
    (max, phase) =>
      phase.timing.seconds === null ? max : Math.max(max ?? 0, phase.timing.seconds),
    null
  )
  const stepsTotal = pipeline.computedHeadline.stepsTotal ?? 0

  const choose = (target: PhaseSelectionTarget, phaseId: string) => {
    select(target)
    // The route carries the selection, so a phase is linkable and the back button works.
    navigate(phaseRoute(phaseId))
  }

  const unattachedSelected = active === 'unattached'
  const unattachedElementId = phaseElementId(UNATTACHED_PHASE_ID)

  return (
    <Panel
      title="Pipeline"
      availability={pipeline.availability}
      message={pipeline.message ?? undefined}
      missingSubject="The pipeline progress section"
      density="flush"
      status={
        <span className="pb-figures text-ink-muted text-2xs">
          {phaseCount} {plural(phaseCount, 'phase')} · {stepsTotal} {plural(stepsTotal, 'step')} ·
          declared order
        </span>
      }
      footer={
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {LEGEND_ORDER.filter(status => pipeline.phaseStatusCounts[status] > 0).map(status => (
            <StatusChip
              key={status}
              status={LEGEND_KEY[status]}
              detail={String(pipeline.phaseStatusCounts[status])}
            />
          ))}
        </div>
      }
    >
      <nav aria-label="Build pipeline phases">
        <ol className="list-none p-0">
          {nodes.map((node, position) => {
            if (node.kind === 'unattached') {
              return (
                <li
                  key={node.id}
                  id={unattachedElementId}
                  data-pb-anchor=""
                  className={clsx(
                    'pb-hairline-t',
                    highlightId === unattachedElementId && 'pb-hairline-accent'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => choose('unattached', UNATTACHED_PHASE_ID)}
                    aria-current={unattachedSelected ? 'true' : undefined}
                    className={clsx(
                      'flex w-full items-start gap-2 px-2 py-1.5 text-left',
                      unattachedSelected ? 'bg-wash-selected' : 'hover:bg-wash-hover'
                    )}
                  >
                    <span className="text-ink-faint mt-0.5 flex w-3 shrink-0 justify-center">
                      <StatusIcon shape="diamond" size={11} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-ink text-xs leading-4">{node.name}</span>
                      <span className="text-ink-faint text-2xs mt-0.5 block">
                        {unattached.length === 0
                          ? 'Every section in this report is bound to a phase.'
                          : `${unattached.length} ${plural(
                              unattached.length,
                              'section'
                            )} bound to no phase — surfaced here, not hidden.`}
                      </span>
                    </span>
                  </button>
                </li>
              )
            }

            const phase = node.phase
            if (phase === null) return null

            return (
              <PhaseNode
                key={node.id}
                phase={phase}
                laterPhasesRan={laterPhasesWithWork(phase, pipeline.phases)}
                longestPhaseSeconds={longestPhaseSeconds}
                markers={phaseMarkers(phase, warningsByPhase)}
                reportCount={node.reportCount}
                selected={active === phase.index}
                onSelect={() => choose(phase.index, phase.id)}
                expanded={expandedIds.includes(phase.id)}
                onToggleExpanded={() => toggleExpanded(phase.id)}
                isFirst={position === 0}
                isLast={position === report.pipeline.phases.length - 1}
                highlighted={highlightId === phaseElementId(phase.id)}
              />
            )
          })}
        </ol>
      </nav>
    </Panel>
  )
}

export default PipelineSpine
