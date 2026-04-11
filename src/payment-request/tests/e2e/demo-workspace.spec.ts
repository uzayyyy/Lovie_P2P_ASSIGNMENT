import { expect, test } from '@playwright/test'

test('creates and cancels a phone-only outgoing request', async ({ page }) => {
  await page.goto('/demo')

  await expect(page.getByText(/Review the full payment request flow/i)).toBeVisible()

  await page.getByTestId('demo-recipient-phone').fill('+905551112233')
  await page.getByTestId('demo-amount').fill('245.75')
  await page.getByTestId('demo-note').fill('Team dinner reimbursement')
  await page.getByTestId('demo-create-request').click()

  await expect(page.getByTestId('demo-create-success')).toContainText('Created request')
  await expect(page.getByTestId('demo-detail-panel')).toContainText('Team dinner reimbursement')
  await expect(page.getByTestId('demo-detail-status')).toContainText('pending')

  await page.getByTestId('demo-search').fill('+905551112233')
  await expect(page.locator('[data-testid^="demo-request-card-"]').first()).toContainText(
    '+905551112233',
  )

  await page.getByTestId('demo-cancel').click()
  await expect(page.getByTestId('demo-detail-status')).toContainText('cancelled')
})

test('pays an incoming request after the simulated delay', async ({ page }) => {
  await page.goto('/demo/request/demo-incoming-pending')

  await expect(page.getByTestId('demo-detail-status')).toContainText('pending')

  await page.getByTestId('demo-pay').click()
  await expect(page.getByTestId('demo-pay')).toContainText('Processing…')
  await expect(page.getByTestId('demo-detail-status')).toContainText('paid', {
    timeout: 6_000,
  })
})
