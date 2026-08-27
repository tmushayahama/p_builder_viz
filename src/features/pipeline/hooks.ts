import { useEffect } from 'react'
import { useHashTarget } from '@/@panther.core/hooks'
import type { HashTarget } from '@/@panther.core/hooks'
import { usePhaseSelection, useSelectPhase } from '@/features/build/hooks'
import type { BuildReport } from '@/features/build/model'
import { resolveSelectionForAnchor } from '@/features/pipeline/model'

/**
 * Which spine node the content column is showing.
 *
 * A stored selection of `null` follows the FRONTIER rather than the first phase. That is the whole
 * product in one default: arriving at the report shows where the build genuinely reached, not the
 * earliest phase that happens to be incomplete. An index left over from a different report state
 * falls back the same way instead of rendering an empty column.
 */
export function useActivePhaseIndex(report: BuildReport): number | 'unattached' | null {
  const selection = usePhaseSelection()
  const phases = report.pipeline.phases
  const fallback = report.pipeline.frontierIndex ?? (phases.length > 0 ? 0 : null)

  if (selection === 'unattached') return 'unattached'
  if (selection === null) return fallback
  return phases[selection] === undefined ? fallback : selection
}

/**
 * Makes a deep link land on something.
 *
 * A step, a report or a config value only exists in the DOM while its owning spine node is
 * selected, so scrolling to the anchor is not enough - the selection has to move first. This hook
 * resolves the hash to a node, selects it, and then scrolls once the target has actually mounted,
 * which is a render later than `useHashTarget`'s own attempt.
 */
export function usePhaseDeepLink(report: BuildReport): HashTarget {
  const target = useHashTarget()
  const selection = usePhaseSelection()
  const select = useSelectPhase()

  useEffect(() => {
    if (target.id === null) return
    const resolved = resolveSelectionForAnchor(report, target.id)
    if (resolved === null || resolved === selection) return
    select(resolved)
  }, [report, select, selection, target.id])

  useEffect(() => {
    if (target.id === null || !target.isRecent) return
    if (typeof document === 'undefined') return
    const element = document.getElementById(target.id)
    element?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
  }, [selection, target.id, target.isRecent])

  return target
}
