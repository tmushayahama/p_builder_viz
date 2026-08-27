import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BarCell } from '@/@panther.core/components/BarCell'
import { DeltaValue } from '@/@panther.core/components/DeltaValue'
import { Disclosure } from '@/@panther.core/components/Disclosure'
import { MetricValue } from '@/@panther.core/components/MetricValue'
import { MetricDefinitionsProvider } from '@/@panther.core/components/metricDefinitions'
import { TruncationNotice } from '@/@panther.core/components/TruncationNotice'
import { UnknownValue } from '@/@panther.core/components/UnknownValue'
import { Sparkline } from '@/@panther.core/charts/marks/Sparkline'
import { renderWithProviders } from '@tests/test-utils'

/**
 * One rule, six primitives: an absent measurement is never rendered as a zero,
 * and a sign is never carried by colour alone. Both are brief requirements and
 * both are the kind of thing that regresses quietly, because a zero looks like
 * data.
 */
describe('absent values never become zeros', () => {
  it('MetricValue shows the absent mark and a reason, not a 0', () => {
    renderWithProviders(
      <MetricValue
        metricId="prev_lib_sequences"
        value={null}
        absentReason="previous library not in this report"
        definition={{
          id: 'prev_lib_sequences',
          label: 'Previous-library reference sequences',
          description: 'Input sequences the previous library was built from.',
        }}
      />
    )

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('previous library not in this report')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('MetricValue makes a missing definition visible instead of guessing a label', () => {
    renderWithProviders(
      <MetricDefinitionsProvider registry={{}}>
        <MetricValue metricId="sequences" value={1736983} />
      </MetricDefinitionsProvider>
    )

    expect(screen.getByText(/no definition registered/)).toBeInTheDocument()
  })

  it('MetricValue reads its label from the registry', () => {
    renderWithProviders(
      <MetricDefinitionsProvider
        registry={{
          library_sequences: {
            id: 'library_sequences',
            label: 'Sequences in the built library',
            description: 'Sequences represented in the library that was produced.',
            unit: 'sequences',
          },
        }}
      >
        <MetricValue metricId="library_sequences" value={1736983} />
      </MetricDefinitionsProvider>
    )

    expect(screen.getByText('Sequences in the built library')).toBeInTheDocument()
    expect(screen.getByText('1,736,983')).toBeInTheDocument()
  })

  it('BarCell draws no bar where the value is absent', () => {
    const { container } = renderWithProviders(<BarCell value={null} max={100} />)

    expect(screen.getByText('—')).toBeInTheDocument()
    // only the baseline rule, never a zero-length fill that reads as a measurement
    expect(container.querySelectorAll('path')).toHaveLength(0)
  })

  it('Sparkline says there is no series rather than drawing a flat line', () => {
    renderWithProviders(
      <Sparkline values={[null, undefined]} valueLabel="—" ariaLabel="Assignment by stage" />
    )

    expect(screen.getByText('no series')).toBeInTheDocument()
  })

  it('TruncationNotice treats an unknown total as truncated', () => {
    renderWithProviders(<TruncationNotice completeness={{ included: 20, total: null }} />)

    expect(screen.getByText(/the report does not say how many exist/)).toBeInTheDocument()
  })

  it('UnknownValue preserves the literal the report contained', () => {
    renderWithProviders(
      <UnknownValue value="half_done" kind="status" source="sections[3].status" />
    )

    expect(screen.getByText('half_done')).toBeInTheDocument()
    expect(screen.getByText(/Unknown status/)).toBeInTheDocument()
  })
})

describe('DeltaValue carries its sign in glyph and text', () => {
  it.each([
    [12.1, '+12.1 pp'],
    [-12.1, '-12.1 pp'],
  ])('renders %s as %s', (value, expected) => {
    const { container } = renderWithProviders(<DeltaValue value={value} kind="percentage-point" />)

    expect(screen.getByText(expected)).toBeInTheDocument()
    // the arrow is the redundant cue: sign is never hue alone
    expect(container.textContent).toMatch(value > 0 ? /▲/ : /▼/)
  })

  it('stays in plain ink unless a polarity is declared', () => {
    const { container } = renderWithProviders(<DeltaValue value={-6788} />)

    expect(container.querySelector('[data-delta-sign="negative"]')?.className).toContain('text-ink')
  })

  it('renders an absent change as the absent mark', () => {
    renderWithProviders(<DeltaValue value={null} absentReason="no previous library" />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('Disclosure is keyboard operable and print-safe', () => {
  it('toggles on Enter and reports state through aria-expanded', async () => {
    const { user } = renderWithProviders(
      <Disclosure summary="validate_idmapping_step" count="3 attempts">
        <span>attempt history</span>
      </Disclosure>
    )

    const toggle = screen.getByRole('button', { name: /validate_idmapping_step/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.tab()
    await user.keyboard('{Enter}')

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('keeps the panel mounted when closed so print can expand it', () => {
    const { container } = renderWithProviders(
      <Disclosure summary="61 steps">
        <span>step list</span>
      </Disclosure>
    )

    const panel = container.querySelector('[data-pb-disclosure-panel]')
    expect(panel).not.toBeNull()
    expect(screen.getByText('step list')).toBeInTheDocument()
    expect(panel?.className).toContain('hidden')
  })
})
