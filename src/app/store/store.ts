import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { uiSlice } from '@/app/slices/uiSlice'

/**
 * `combineSlices` rather than `combineReducers` so feature slices can be added
 * (and lazily injected) without editing a central reducer map.
 */
const rootReducer = combineSlices({
  ui: uiSlice.reducer,
})

export type RootState = ReturnType<typeof rootReducer>

/** Used by tests to build an isolated store; see `tests/test-utils.tsx`. */
export const makeStore = (preloadedState?: Partial<RootState>) =>
  configureStore({
    reducer: rootReducer,
    preloadedState,
  })

export const store = makeStore()

export type AppStore = typeof store
export type AppDispatch = AppStore['dispatch']
