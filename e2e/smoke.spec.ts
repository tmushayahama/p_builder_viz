import { expect, test } from '@playwright/test'

/**
 * Proves the harness and the shell boot together: the config starts a dev server, the build record
 * mounts against the captured report, the spine is present, and the store-driven colour-scheme
 * toggle round-trips.
 */
test('the build record boots on the frontier', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'PANTHER 20.0' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Build pipeline phases' })).toBeVisible()

  // Acceptance question 1: the frontier is the furthest phase with completed work, not the
  // earliest incomplete one.
  await expect(page.getByText(/^The build frontier is Library export products/)).toBeVisible()
  await expect(page.getByText(/^1 phase behind the frontier is incomplete/)).toBeVisible()
})

test('the colour-scheme toggle round-trips through the store', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'dark')

  await page.getByRole('button', { name: 'Switch to light mode' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'light')
})
