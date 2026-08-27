import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export type ColorScheme = 'light' | 'dark'

export interface UiState {
  colorScheme: ColorScheme
}

const initialState: UiState = {
  colorScheme: 'light',
}

/**
 * App-chrome state. The colour scheme lives in the store rather than in Mantine's
 * own hook so it can be read by anything (including tests) through the same typed
 * selector path as the rest of the app's state.
 */
export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setColorScheme(state, action: PayloadAction<ColorScheme>) {
      state.colorScheme = action.payload
    },
    toggleColorScheme(state) {
      state.colorScheme = state.colorScheme === 'dark' ? 'light' : 'dark'
    },
  },
  selectors: {
    selectColorScheme: state => state.colorScheme,
  },
})

export const { setColorScheme, toggleColorScheme } = uiSlice.actions
export const { selectColorScheme } = uiSlice.selectors
