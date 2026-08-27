import { expect, test } from '@playwright/test'

/**
 * Proves the Playwright harness itself works: the config starts a dev server, the
 * app mounts, and the store-driven colour-scheme toggle round-trips. Replace or
 * extend once there are real flows to cover.
 */
test('app boots and the colour-scheme toggle works', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'PANTHER Build Visualization' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Stack is wired' })).toBeVisible()
  await expect(page.getByText('colour scheme from the store:')).toContainText('light')

  await page.getByRole('button', { name: 'Switch to dark mode' }).click()

  await expect(page.getByText('colour scheme from the store:')).toContainText('dark')
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'dark')
})
