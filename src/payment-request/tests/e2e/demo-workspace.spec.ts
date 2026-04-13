import { expect, test } from '@playwright/test'

// ─── Create + Cancel ──────────────────────────────────────────────────────────

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

test('creates an email-only outgoing request', async ({ page }) => {
  await page.goto('/demo')

  await page.getByTestId('demo-recipient-email').fill('selin@example.com')
  await page.getByTestId('demo-amount').fill('320')
  await page.getByTestId('demo-note').fill('Bodrum taxi split')
  await page.getByTestId('demo-create-request').click()

  await expect(page.getByTestId('demo-create-success')).toContainText('Created request')
  await expect(page.getByTestId('demo-detail-panel')).toContainText('selin@example.com')
  await expect(page.getByTestId('demo-detail-panel')).toContainText('Bodrum taxi split')
  await expect(page.getByTestId('demo-detail-status')).toContainText('pending')
})

// ─── Pay ──────────────────────────────────────────────────────────────────────

test('pays an incoming request after the simulated delay', async ({ page }) => {
  await page.goto('/demo/request/demo-incoming-pending')

  await expect(page.getByTestId('demo-detail-status')).toContainText('pending')

  await page.getByTestId('demo-pay').click()
  await expect(page.getByTestId('demo-pay')).toContainText('Processing')
  await expect(page.getByTestId('demo-detail-status')).toContainText('paid', {
    timeout: 6_000,
  })
})

// ─── Decline ──────────────────────────────────────────────────────────────────

test('declines an incoming request', async ({ page }) => {
  await page.goto('/demo/request/demo-incoming-pending')

  await expect(page.getByTestId('demo-detail-status')).toContainText('pending')
  await expect(page.getByTestId('demo-decline')).toBeVisible()

  await page.getByTestId('demo-decline').click()
  await expect(page.getByTestId('demo-detail-status')).toContainText('declined')

  // Pay and Decline buttons are gone after terminal status
  await expect(page.getByTestId('demo-pay')).not.toBeVisible()
  await expect(page.getByTestId('demo-decline')).not.toBeVisible()
})

// ─── Expiration ───────────────────────────────────────────────────────────────

test('expired request shows expired status and hides action buttons', async ({ page }) => {
  await page.goto('/demo/request/demo-incoming-expired')

  await expect(page.getByTestId('demo-detail-status')).toContainText('expired')

  // No pay/decline actions on expired requests
  await expect(page.getByTestId('demo-pay')).not.toBeVisible()
  await expect(page.getByTestId('demo-decline')).not.toBeVisible()
})
