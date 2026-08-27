import { useCallback, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { getFixtureReport } from '@/features/build/fixtures'
import type { FixtureStateKey } from '@/features/build/fixtures'
import {
  selectExpandedPhaseIds,
  selectFixtureStateKey,
  selectPhaseSelection,
  selectSelectedOscode,
  selectPhase,
  selectSpecies,
  setFixtureStateKey,
  togglePhaseExpanded,
} from '@/features/build/slices/buildSlice'
import type { PhaseSelection } from '@/features/build/slices/buildSlice'
import type { BuildReport, SpeciesRecord } from '@/features/build/model'

/**
 * The one seam between the derived model and every view.
 *
 * No component imports a fixture or calls `parseBuildState`: they call `useBuildReport()`. That
 * makes the swap from a static fixture to a fetched report a change to this file alone, with
 * `parseBuildState` still in front of it.
 *
 * The parse is memoised per fixture recipe inside the model, so this hook is a lookup rather than
 * a computation and no view parses per render.
 */
export function useBuildReport(): BuildReport {
  const key = useFixtureStateKey()
  return useMemo(() => getFixtureReport(key), [key])
}

export function useFixtureStateKey(): FixtureStateKey {
  return useAppSelector(selectFixtureStateKey)
}

export function useSelectFixtureState(): (key: FixtureStateKey) => void {
  const dispatch = useAppDispatch()
  return useCallback((key: FixtureStateKey) => dispatch(setFixtureStateKey(key)), [dispatch])
}

/**
 * A species joined across node tracking, the previous-versus-new counts and the UniProt match
 * table. `null` when no source in this report mentions the oscode - which is not the same as a
 * species with zero of something, and views must say so.
 */
export function useSpeciesRecord(oscode: string): SpeciesRecord | null {
  const report = useBuildReport()
  return report.species.byOscode[oscode] ?? report.species.byOscode[oscode.toUpperCase()] ?? null
}

/* -- Selection: not part of the cross-plan contract, but shared by every view -------------- */

/** The raw selection, where `null` means "follow the frontier". */
export function usePhaseSelection(): PhaseSelection {
  return useAppSelector(selectPhaseSelection)
}

export function useSelectPhase(): (selection: PhaseSelection) => void {
  const dispatch = useAppDispatch()
  return useCallback((selection: PhaseSelection) => dispatch(selectPhase(selection)), [dispatch])
}

export function useSelectedOscode(): string | null {
  return useAppSelector(selectSelectedOscode)
}

/** Opens (or with `null` closes) the species detail the shell mounts. */
export function useSelectSpecies(): (oscode: string | null) => void {
  const dispatch = useAppDispatch()
  return useCallback((oscode: string | null) => dispatch(selectSpecies(oscode)), [dispatch])
}

export function useExpandedPhaseIds(): string[] {
  return useAppSelector(selectExpandedPhaseIds)
}

export function useTogglePhaseExpanded(): (phaseId: string) => void {
  const dispatch = useAppDispatch()
  return useCallback((phaseId: string) => dispatch(togglePhaseExpanded(phaseId)), [dispatch])
}
