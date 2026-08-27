import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getFixtureReport } from '@/features/build/fixtures'
import type { FixtureStateKey } from '@/features/build/fixtures'
import { initialBuildUiState } from '@/features/build/slices/buildSlice'
import { PhaseTimeline } from '@/features/pipeline/components/PhaseTimeline'
import { buildTimelineModel } from '@/features/pipeline/timeline'
import { renderWithProviders } from '@tests/test-utils'

const preloaded = (fixtureStateKey: FixtureStateKey) => ({
  build: { ...initialBuildUiState, fixtureStateKey },
})

/**
 * The captured report has two completed steps whose artifacts land before the step declared ahead
 * of them, which is exactly where a naive gantt emits a negative interval. A negative width does
 * not throw - the browser drops the attribute and the bar silently disappears - so these assertions
 * look at the emitted geometry, not at whether rendering succeeded.
 */
describe('the timeline row model', () => {
  it('never produces a negative interval on the report with out-of-order artifacts', () => {
    const report = getFixtureReport('real')
    expect(report.timing.outOfOrder.length).toBe(2)

    const model = buildTimelineModel(report)
    for (const row of model.rows) {
      if (row.startSeconds !== null && row.endSeconds !== null) {
        expect(row.endSeconds).toBeGreaterThanOrEqual(row.startSeconds)
      }
      if (row.elapsedSeconds !== null) {
        expect(row.elapsedSeconds).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('orders rows by artifact time and leaves phases with no artifacts at the end', () => {
    const model = buildTimelineModel(getFixtureReport('real'))
    const placed = model.rows.filter(row => row.startSeconds !== null)
    const unplaced = model.rows.filter(row => row.startSeconds === null)

    for (let index = 1; index < placed.length; index += 1) {
      expect(placed[index].startSeconds).toBeGreaterThanOrEqual(
        placed[index - 1].startSeconds as number
      )
    }
    expect(model.rows.slice(placed.length)).toEqual(unplaced)
    expect(unplaced.map(row => row.name)).toEqual(['Final packaging'])
  })

  it('gives a phase with no completed steps no span at all, rather than a zero-length one', () => {
    const model = buildTimelineModel(getFixtureReport('real'))
    const finalPackaging = model.rows.find(row => row.name === 'Final packaging')

    expect(finalPackaging?.kind).toBe('none')
    expect(finalPackaging?.elapsedSeconds).toBeNull()
    expect(finalPackaging?.note).toBe(
      'No completed steps, so there is no artifact activity to place on the clock.'
    )
  })

  it('treats a single-artifact phase as an instant, not an interval', () => {
    const model = buildTimelineModel(getFixtureReport('real'))
    const single = model.rows.find(row => row.artifactCount === 1)

    expect(single?.kind).toBe('instant')
    expect(single?.elapsedSeconds).toBeNull()
    expect(single?.note).toBe('A single artifact fixes an instant, not an interval.')
  })

  it('labels only the longest spans, not every row', () => {
    const model = buildTimelineModel(getFixtureReport('real'))
    expect(model.labelledPhaseIds.length).toBeLessThan(model.rows.length)
    expect(model.labelledPhaseIds).toContain('library-export-products')
  })
})

describe('PhaseTimeline rendering', () => {
  it('emits no negative or non-finite coordinate', () => {
    const { container } = renderWithProviders(<PhaseTimeline />, {
      preloadedState: preloaded('real'),
    })

    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/)

    for (const rect of Array.from(container.querySelectorAll('rect'))) {
      const width = Number(rect.getAttribute('width') ?? '0')
      const height = Number(rect.getAttribute('height') ?? '0')
      expect(Number.isFinite(width)).toBe(true)
      expect(width).toBeGreaterThanOrEqual(0)
      expect(height).toBeGreaterThanOrEqual(0)
    }
    for (const line of Array.from(container.querySelectorAll('line'))) {
      const x1 = Number(line.getAttribute('x1') ?? '0')
      const x2 = Number(line.getAttribute('x2') ?? '0')
      expect(x2).toBeGreaterThanOrEqual(x1)
    }
  })

  it('says the spans are inferred artifact activity rather than measured runtime', () => {
    renderWithProviders(<PhaseTimeline />, { preloadedState: preloaded('real') })

    expect(
      screen.getByText(
        'Spans are inferred from artifact timestamps: elapsed activity, not measured runtime.'
      )
    ).toBeInTheDocument()
    expect(screen.getByText(/≈ 29\.2h elapsed · artifact time order/)).toBeInTheDocument()
  })

  it('says which phases may have run concurrently instead of drawing them as a sequence', () => {
    renderWithProviders(<PhaseTimeline />, { preloadedState: preloaded('real') })

    expect(
      screen.getByText(/of 14 phases contain artifacts within 5 minutes of each other/)
    ).toBeInTheDocument()
  })

  it('marks the empty track rather than drawing an instantaneous bar', () => {
    renderWithProviders(<PhaseTimeline />, { preloadedState: preloaded('real') })

    expect(screen.getByText('no artifacts — no span')).toBeInTheDocument()
  })

  it('carries a table twin naming every phase and its inferred activity', async () => {
    const { user } = renderWithProviders(<PhaseTimeline />, {
      preloadedState: preloaded('real'),
    })

    await user.click(screen.getByRole('radio', { name: 'Table' }))

    const table = screen.getByRole('table', {
      name: /Phase activity inferred from artifact timestamps/,
    })
    expect(table).toHaveTextContent('13. Library export products')
    expect(table).toHaveTextContent('14. Final packaging')
    // No elapsed value in the twin may read as a negative duration.
    expect(table.textContent).not.toMatch(/≈ -/)
  })
})
