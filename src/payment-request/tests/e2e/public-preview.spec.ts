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
