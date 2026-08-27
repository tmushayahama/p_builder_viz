import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { DEFAULT_FIXTURE_STATE_KEY } from '@/features/build/fixtures'
import type { FixtureStateKey } from '@/features/build/fixtures'

/**
 * Viewer state for the build report, and nothing more.
 *
 * The report itself is not in the store: `parseBuildState` is pure and memoised per fixture
 * recipe, so keeping a parsed copy in Redux would only add a second source of truth that can go
 * stale. What lives here is what a reviewer changed - which report they are looking at, which
 * phase they selected, which species they opened, which spine nodes they expanded.
 */

/**
 * `null` means "follow the frontier", which is what a reviewer wants on arrival and after
 * switching report states: a phase index from one state does not necessarily exist in the next.
 * `'unattached'` selects the synthetic node at the end of the spine.
 */
export type PhaseSelection = number | 'unattached' | null

export interface BuildUiState {
  fixtureStateKey: FixtureStateKey
  selectedPhaseIndex: PhaseSelection
  selectedOscode: string | null
  /** Spine nodes whose incomplete-step list is revealed. */
  expandedPhaseIds: string[]
}

export const initialBuildUiState: BuildUiState = {
  fixtureStateKey: DEFAULT_FIXTURE_STATE_KEY,
  selectedPhaseIndex: null,
  selectedOscode: null,
  expandedPhaseIds: [],
}

export const buildSlice = createSlice({
  name: 'build',
  initialState: initialBuildUiState,
  reducers: {
    /** Switching report state clears every selection made against the previous one. */
    setFixtureStateKey(state, action: PayloadAction<FixtureStateKey>) {
      if (state.fixtureStateKey === action.payload) return
      state.fixtureStateKey = action.payload
      state.selectedPhaseIndex = null
      state.selectedOscode = null
      state.expandedPhaseIds = []
    },
    selectPhase(state, action: PayloadAction<PhaseSelection>) {
      state.selectedPhaseIndex = action.payload
    },
    selectSpecies(state, action: PayloadAction<string | null>) {
      state.selectedOscode = action.payload
    },
    togglePhaseExpanded(state, action: PayloadAction<string>) {
      const index = state.expandedPhaseIds.indexOf(action.payload)
      if (index >= 0) state.expandedPhaseIds.splice(index, 1)
      else state.expandedPhaseIds.push(action.payload)
    },
    setPhaseExpanded(state, action: PayloadAction<{ phaseId: string; expanded: boolean }>) {
      const { phaseId, expanded } = action.payload
      const index = state.expandedPhaseIds.indexOf(phaseId)
      if (expanded && index < 0) state.expandedPhaseIds.push(phaseId)
      if (!expanded && index >= 0) state.expandedPhaseIds.splice(index, 1)
    },
    collapseAllPhases(state) {
      state.expandedPhaseIds = []
    },
  },
  selectors: {
    selectFixtureStateKey: state => state.fixtureStateKey,
    selectPhaseSelection: state => state.selectedPhaseIndex,
    selectSelectedOscode: state => state.selectedOscode,
    selectExpandedPhaseIds: state => state.expandedPhaseIds,
  },
})

export const {
  collapseAllPhases,
  selectPhase,
  selectSpecies,
  setFixtureStateKey,
  setPhaseExpanded,
  togglePhaseExpanded,
} = buildSlice.actions

export const {
  selectExpandedPhaseIds,
  selectFixtureStateKey,
  selectPhaseSelection,
  selectSelectedOscode,
} = buildSlice.selectors
