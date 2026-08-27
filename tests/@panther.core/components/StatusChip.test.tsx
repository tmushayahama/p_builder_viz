import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusChip } from '@/@panther.core/components/StatusChip'
import type { StatusKey } from '@/@panther.core/vocabulary'
import { STATUS_DESCRIPTORS } from '@/@panther.core/vocabulary'
import { renderWithProviders } from '@tests/test-utils'

const keys = Object.keys(STATUS_DESCRIPTORS) as StatusKey[]

/**
 * The regression these guard against is a colour-only status: a chip that drops
 * its word, or two states that end up sharing a glyph. Both would break the
 * brief's redundant-cue requirement, and the second is acceptance question 2.
 */
describe('StatusChip redundant cues', () => {
  it.each(keys)('renders a text label for %s', key => {
    renderWithProviders(<StatusChip status={key} />)

    expect(screen.getByText(STATUS_DESCRIPTORS[key].label)).toBeInTheDocument()
  })

  it.each(keys)('renders a shape alongside the label for %s', key => {
    const { container } = renderWithProviders(<StatusChip status={key} />)

    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('gives failed, pending, hole, warn and frontier five different words', () => {
    const words = (['failed', 'pending', 'hole', 'warn', 'frontier'] as StatusKey[]).map(
      key => STATUS_DESCRIPTORS[key].label
    )

    expect(new Set(words).size).toBe(words.length)
  })

  it('gives failed, pending, hole, warn and frontier five different shapes', () => {
    const shapes = (['failed', 'pending', 'hole', 'warn', 'frontier'] as StatusKey[]).map(
      key => STATUS_DESCRIPTORS[key].shape
    )

    expect(new Set(shapes).size).toBe(shapes.length)
  })

  it('preserves an unrecognised literal instead of coercing it', () => {
    renderWithProviders(<StatusChip status="half_done" />)

    expect(screen.getByText('Unknown status: half_done')).toBeInTheDocument()
  })

  it('keeps the label when a caller overrides the wording', () => {
    renderWithProviders(<StatusChip status="active" label="Frontier: 10/12" />)

    expect(screen.getByText('Frontier: 10/12')).toBeInTheDocument()
  })
})
