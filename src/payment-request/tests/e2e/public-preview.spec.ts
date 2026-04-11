import { expect, test } from '@playwright/test'

test('renders the bundled public share-link preview and routes back to login', async ({
  page,
}) => {
  await page.goto('/request/demo-public-pending')

  await expect(page.getByText('Demo preview mode:')).toBeVisible()
  await expect(page.getByText('Weekend house rental split')).toBeVisible()

  await page.getByRole('link', { name: 'Log in to Pay' }).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('link', { name: 'Open interactive demo' })).toBeVisible()
})

test('pending public preview shows amount and status', async ({ page }) => {
  await page.goto('/request/demo-public-pending')

  // Amount: ₺420,50
  await expect(page.getByText(/420/)).toBeVisible()
  await expect(page.getByText('pending')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Log in to Pay' })).toBeVisible()
})

test('expired public preview shows not actionable message and no pay button', async ({ page }) => {
  await page.goto('/request/demo-public-expired')

  await expect(page.getByText('Demo preview mode:')).toBeVisible()
  await expect(page.getByText('Late museum ticket reimbursement')).toBeVisible()
  // Use exact match — MUI Chip can render sibling elements with similar text
  await expect(page.getByText('expired', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('no longer actionable')).toBeVisible()

  // No pay button for expired requests
  await expect(page.getByRole('link', { name: 'Log in to Pay' })).not.toBeVisible()
})

test('unknown request ID shows error state', async ({ page }) => {
  await page.goto('/request/nonexistent-id-xyz')

  // Either "Request not found" (view exists) or a DB error message (view not set up).
  // Either way an error Alert should be visible after the loading skeleton resolves.
  await expect(page.getByRole('alert').filter({ hasText: /.+/ })).toBeVisible({ timeout: 15_000 })

  // The request content should not appear
  await expect(page.getByText('Weekend house rental split')).not.toBeVisible()
})
