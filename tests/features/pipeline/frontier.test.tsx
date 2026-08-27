import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { initialBuildUiState } from '@/features/build/slices/buildSlice'
import type { FixtureStateKey } from '@/features/build/fixtures'
import { FrontierSummary } from '@/features/pipeline/components/FrontierSummary'
import { renderWithProviders } from '@tests/test-utils'

/**
 * Acceptance questions 1 and 2.
 *
 * Every assertion here is on VISIBLE TEXT rather than on a class or a data attribute, because the
 * failure this guards against is not a styling regression - it is the dashboard telling a reviewer
 * that the build stopped at the earliest incomplete phase. That mistake reads perfectly well in the
 * markup and only shows up in the words.
 */

const preloaded = (fixtureStateKey: FixtureStateKey) => ({
  build: { ...initialBuildUiState, fixtureStateKey },
})

describe('FrontierSummary on the captured report', () => {
  it('puts the frontier at Library export products, not at the earliest incomplete phase', () => {
    renderWithProviders(<FrontierSummary />, { preloadedState: preloaded('real') })

    const frontier = screen.getByText(/^The build frontier is Library export products/)
    expect(frontier).toHaveTextContent('incomplete at 10 of 12 steps')
    expect(frontier).toHaveTextContent('Final packaging has not started')

    // Phase 2 is the earliest incomplete phase and must not be named as the frontier.
    expect(frontier.textContent).not.toContain('Sequence-to-family mapping')
  })

  it('states that a phase behind the frontier is incomplete, and calls it a hole', () => {
    renderWithProviders(<FrontierSummary />, { preloadedState: preloaded('real') })

    const holes = screen.getByText(/^1 phase behind the frontier is incomplete/)
    expect(holes).toHaveTextContent(/while 9 later phases completed/)
    expect(holes).toHaveTextContent('This is a hole, not where the build stopped.')
  })

  it('names both remaining validation steps rather than counting them', () => {
    renderWithProviders(<FrontierSummary />, { preloadedState: preloaded('real') })

    const detail = screen.getByText(/^3 of 5 steps done\./)
    expect(detail).toHaveTextContent('Incomplete: validate_idmapping_step, validate_blast_step')
    expect(detail).toHaveTextContent('9 later phases completed anyway')
    expect(screen.getByRole('link', { name: 'Sequence-to-family mapping' })).toBeInTheDocument()
  })
})

describe('FrontierSummary across the derived states', () => {
  it('toEarly() moves the frontier back and leaves no holes', () => {
    renderWithProviders(<FrontierSummary />, { preloadedState: preloaded('early') })

    const frontier = screen.getByText(/^The build frontier is Sequence-to-family mapping/)
    expect(frontier).toHaveTextContent('incomplete at 1 of 5 steps')
    expect(frontier).toHaveTextContent('11 later phases have not started')

    expect(screen.getByText(/^Nothing behind the frontier is incomplete/)).toBeInTheDocument()
    expect(screen.queryByText(/is a hole, not where the build stopped/)).toBeNull()
  })

  it('toCompleted() leaves neither a frontier gap nor a hole', () => {
    renderWithProviders(<FrontierSummary />, { preloadedState: preloaded('completed') })

    const frontier = screen.getByText(/^All 14 phases are complete/)
    expect(frontier).toHaveTextContent('The frontier is the last phase, Final packaging')
    expect(screen.getByText(/^Nothing behind the frontier is incomplete/)).toBeInTheDocument()
  })

  it('toFailed() reports the failure and the phase it blocks, separately from the hole', () => {
    renderWithProviders(<FrontierSummary />, { preloadedState: preloaded('failed') })

    expect(
      screen.getByText(
        'TreeGrafter_data/PANTHER20.0_data.tar.gz failed in Library export products after 3 attempts.'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText('1 phase is blocked behind that failure: Final packaging.')
    ).toBeInTheDocument()

    // The hole is still reported, and it is a different finding with a different word.
    expect(screen.getByText(/^1 phase behind the frontier is incomplete/)).toBeInTheDocument()
    expect(screen.getByText('Blocked')).toBeInTheDocument()
    expect(screen.getByText('Hole')).toBeInTheDocument()
  })
})
