import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Panel } from '@/@panther.core/components/Panel'
import type { Availability } from '@/@panther.core/vocabulary'
import { renderWithProviders } from '@tests/test-utils'

/**
 * Panel owns how the whole app degrades, so each Availability is asserted by
 * what a reader sees rather than by a class name.
 */
describe('Panel degradation', () => {
  const body = 'Sequences 1,736,983'

  it('renders children and no notice when available', () => {
    renderWithProviders(
      <Panel title="Library" availability="available">
        {body}
      </Panel>
    )

    expect(screen.getByText(body)).toBeInTheDocument()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it.each<[Exclude<Availability, 'available'>, string]>([
    ['absent', 'Not in this report'],
    ['error', 'The generator failed here'],
  ])('replaces children with the notice when %s', (availability, headline) => {
    renderWithProviders(
      <Panel title="Previous library" availability={availability} message="inputs not present yet">
        {body}
      </Panel>
    )

    expect(screen.getByRole('note')).toBeInTheDocument()
    expect(screen.getByText(/Not in this report|The generator failed here/)).toHaveTextContent(
      headline
    )
    // the whole point: no zero, no empty chart, no stale children
    expect(screen.queryByText(body)).not.toBeInTheDocument()
  })

  it.each<Exclude<Availability, 'available'>>(['partial', 'unknown'])(
    'keeps children and qualifies them when %s',
    availability => {
      renderWithProviders(
        <Panel title="Comparison" availability={availability} message="inputs not present yet">
          {body}
        </Panel>
      )

      expect(screen.getByRole('note')).toBeInTheDocument()
      expect(screen.getByText(body)).toBeInTheDocument()
    }
  )

  it('quotes the generator message verbatim rather than paraphrasing it', () => {
    renderWithProviders(
      <Panel title="Previous library" availability="absent" message="inputs not present yet" />
    )

    expect(screen.getByText('inputs not present yet')).toBeInTheDocument()
  })

  it('names the missing subject from the title when no override is given', () => {
    renderWithProviders(<Panel title="Node forward tracking" availability="absent" />)

    expect(screen.getByText('Node forward tracking — Not in this report')).toBeInTheDocument()
  })

  it('prefers an explicit missingSubject over the title', () => {
    renderWithProviders(
      <Panel
        title="Comparison"
        availability="absent"
        missingSubject="Previous-library comparison"
      />
    )

    expect(screen.getByText('Previous-library comparison — Not in this report')).toBeInTheDocument()
  })
})
