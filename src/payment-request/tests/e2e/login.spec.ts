import { expect, test } from '@playwright/test'

test('login page renders with heading and call-to-action buttons', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { level: 1 }).or(
    page.getByText(/Request money from friends/i)
  )).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open interactive demo' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Preview a public share link' })).toBeVisible()
})

test('password mode shows password field and Sign in button', async ({ page }) => {
  await page.goto('/login')

  // Default mode is password
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Use magic link instead' })).toBeVisible()
})

test('toggling to magic link hides password field and shows Send magic link button', async ({ page }) => {
  await page.goto('/login')

  await page.getByRole('button', { name: 'Use magic link instead' }).click()

  await expect(page.getByLabel('Password')).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Send magic link' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Use password instead' })).toBeVisible()
})

test('toggling back to password restores password field', async ({ page }) => {
  await page.goto('/login')

  await page.getByRole('button', { name: 'Use magic link instead' }).click()
  await page.getByRole('button', { name: 'Use password instead' }).click()

  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
})

test('Open interactive demo button navigates to /demo', async ({ page }) => {
  await page.goto('/login')

  await page.getByRole('link', { name: 'Open interactive demo' }).click()

  await expect(page).toHaveURL(/\/demo$/)
  await expect(page.getByText(/Review the full payment request flow/i)).toBeVisible()
})

test('Preview a public share link button navigates to public request page', async ({ page }) => {
  await page.goto('/login')

  await page.getByRole('link', { name: 'Preview a public share link' }).click()

  await expect(page).toHaveURL(/\/request\/demo-public-pending$/)
  await expect(page.getByText('Demo preview mode:')).toBeVisible()
})
