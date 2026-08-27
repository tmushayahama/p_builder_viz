import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBuildReport, useSelectSpecies } from '@/features/build/hooks'
import { buildSearchIndex } from '@/features/search/model/searchIndex'
import type { SearchEntry, SearchIndex } from '@/features/search/model/searchIndex'

/**
 * The index is a pure function of the report, so it is memoised on the report object rather than
 * rebuilt per keystroke. A few hundred entries over a static report costs nothing to build once.
 */
export function useSearchIndex(): SearchIndex {
  const report = useBuildReport()
  return useMemo(() => buildSearchIndex(report), [report])
}

/**
 * Jumping to a hit.
 *
 * Navigation is the anchor, not a bespoke selection per entity type: the spine already resolves a
 * phase, step or report anchor to the node that has to be selected for the target to exist, so a
 * hash change is enough for those. A species is the exception - it is mounted from the store, not
 * from the hash - so it is selected here as well as linked to.
 */
export function useJumpToEntry(): (entry: SearchEntry) => void {
  const navigate = useNavigate()
  const selectSpecies = useSelectSpecies()

  return useCallback(
    (entry: SearchEntry) => {
      if (entry.oscode !== null) selectSpecies(entry.oscode)
      navigate(entry.route)
    },
    [navigate, selectSpecies]
  )
}
