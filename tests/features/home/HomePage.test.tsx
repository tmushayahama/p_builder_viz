import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import HomePage from '@/features/home/components/HomePage'
import { renderWithProviders } from '@tests/test-utils'

/**
 * Smoke test for the template wiring. If the alias, the provider stack or the
 * typed store hooks break, this fails before anything else does.
 */
describe('HomePage', () => {
  it('renders and reads the colour scheme from the store', () => {
    renderWithProviders(<HomePage />)
    expect(screen.getByRole('heading', { name: 'Stack is wired' })).toBeInTheDocument()
    expect(screen.getByText('light')).toBeInTheDocument()
  })

  it('reflects preloaded store state', () => {
    renderWithProviders(<HomePage />, { preloadedState: { ui: { colorScheme: 'dark' } } })
    expect(screen.getByText('dark')).toBeInTheDocument()
  })
})
