import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import BuildShell from '@/app/layout/BuildShell'
import { FIXTURE_STATE_KEYS } from '@/features/build/fixtures'
import type { FixtureStateKey } from '@/features/build/fixtures'
import { BUILD_ROUTE } from '@/features/build/model'
import { initialBuildUiState } from '@/features/build/slices/buildSlice'
import { renderWithProviders } from '@tests/test-utils'

/**
 * Every fixture state renders, and none of them leaks a non-value into the page.
 *
 * The transforms exist to put the record under conditions the captured report never shows -
 * a failed step, an absent section, an unknown status, a schema this model does not support.
 * Each one is a plausible real build, so "it renders" is the floor, not the goal: the thing
 * being guarded is that absence stays visibly absent. `NaN`, `Infinity` and `[object Object]`
 * all mean a computation escaped its guard, and a literal `undefined` on screen means a value
 * was interpolated where the model meant "not measured".
 *
 * Parameterised over the catalog rather than a hand-written list, so adding a transform
 * automatically requires it to pass this.
 */

const FORBIDDEN = ['NaN', 'Infinity', '[object Object]', 'undefined'] as const

describe.each(FIXTURE_STATE_KEYS)('fixture state %s', (key: FixtureStateKey) => {
  it('renders the record without leaking a non-value into the page', async () => {
    renderWithProviders(<BuildShell />, {
      route: BUILD_ROUTE,
      preloadedState: { build: { ...initialBuildUiState, fixtureStateKey: key } },
    })

    // The spine is the shell's backbone; if it mounted, the record rendered.
    expect(
      await screen.findByRole('navigation', { name: 'Build pipeline phases' })
    ).toBeInTheDocument()

    const text = document.body.textContent ?? ''
    const leaked = FORBIDDEN.filter(token => text.includes(token))
    expect(leaked, `${key} leaked ${leaked.join(', ')}`).toEqual([])
  })
})
