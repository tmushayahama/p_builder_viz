import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getFixtureReport } from '@/features/build/fixtures'
import type { FixtureStateKey } from '@/features/build/fixtures'
import { initialBuildUiState } from '@/features/build/slices/buildSlice'
import { PhaseDetail } from '@/features/pipeline/components/PhaseDetail'
import { renderWithProviders } from '@tests/test-utils'

const preloaded = (fixtureStateKey: FixtureStateKey) => ({
  build: { ...initialBuildUiState, fixtureStateKey },
})

const phaseOf = (key: FixtureStateKey, index: number) =>
  getFixtureReport(key).pipeline.phases[index]

describe('PhaseDetail for the hole', () => {
  it('explains that later phases ran past it rather than that the build stopped', () => {
    renderWithProviders(<PhaseDetail phase={phaseOf('real', 2)} />, {
      preloadedState: preloaded('real'),
    })

    expect(
      screen.getByText(
        'Incomplete, but 11 later phases carried on past it. This is a hole behind the frontier, not the point where the build stopped.'
      )
    ).toBeInTheDocument()
  })

  it('lists both pending validation steps in declared order, with their status', () => {
    renderWithProviders(<PhaseDetail phase={phaseOf('real', 2)} />, {
      preloadedState: preloaded('real'),
    })

    const first = screen.getByText('validate_idmapping_step')
    const second = screen.getByText('validate_blast_step')
    expect(first).toBeInTheDocument()
    expect(second).toBeInTheDocument()

    // Declared order, not artifact order: the two pending steps come first in this phase.
    const goals = screen
      .getAllByRole('listitem')
      .map(item => item.textContent ?? '')
      .filter(text => text.includes('validate_') || text.includes('tribe_mcl'))
    expect(goals[0]).toContain('validate_idmapping_step')
    expect(goals[1]).toContain('validate_blast_step')

    expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(2)
  })

  it('shows the artifact timestamp and its provenance for a completed step', () => {
    renderWithProviders(<PhaseDetail phase={phaseOf('real', 2)} />, {
      preloadedState: preloaded('real'),
    })

    expect(screen.getByText('08-17 02:48')).toBeInTheDocument()
    expect(screen.getAllByText('Inferred').length).toBeGreaterThan(0)
  })
})

describe('PhaseDetail for the frontier under toFailed()', () => {
  it('opens the failed step and shows its attempt history with job ids and log references', () => {
    renderWithProviders(<PhaseDetail phase={phaseOf('failed', 12)} />, {
      preloadedState: preloaded('failed'),
    })

    expect(screen.getByText('TreeGrafter_data/PANTHER20.0_data.tar.gz')).toBeInTheDocument()
    expect(screen.getByText('3 attempts')).toBeInTheDocument()

    const attempts = screen.getByRole('table', {
      name: /Attempt history for TreeGrafter_data/,
    })
    expect(within(attempts).getByText('slurm-4820561')).toBeInTheDocument()
    expect(within(attempts).getByText('logs/slurm-4820613.out')).toBeInTheDocument()
    expect(
      within(attempts).getByText('Prerequisite node_closure_files.touch is missing')
    ).toBeInTheDocument()
    expect(within(attempts).getAllByText('Failed')).toHaveLength(3)
  })

  it('marks the attempt timing as measured, not inferred', () => {
    renderWithProviders(<PhaseDetail phase={phaseOf('failed', 12)} />, {
      preloadedState: preloaded('failed'),
    })

    expect(screen.getAllByText('Measured').length).toBeGreaterThan(0)
    expect(
      screen.getByText(
        'Attempt timing is measured execution, unlike the inferred artifact spans elsewhere in this view.'
      )
    ).toBeInTheDocument()
  })
})

describe('PhaseDetail flags reported values it could not reconcile', () => {
  it('surfaces the generator stale-artifact warning on the phase whose step it names', () => {
    renderWithProviders(<PhaseDetail phase={phaseOf('real', 12)} />, {
      preloadedState: preloaded('real'),
    })

    expect(
      screen.getByText(/is older than QfO_OrthoXML\.xml, which precedes it in the build/)
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'go to step' })).toBeInTheDocument()
  })

  it('withUnknownStatus() keeps an unrecognised step status verbatim', () => {
    const report = getFixtureReport('unknownStatus')
    const phase = report.pipeline.phases.find(candidate => candidate.unknownStatusValues.length > 0)
    expect(phase).toBeDefined()

    renderWithProviders(<PhaseDetail phase={phase!} />, {
      preloadedState: preloaded('unknownStatus'),
    })

    expect(screen.getAllByText(/skipped_by_operator/).length).toBeGreaterThan(0)
  })
})
