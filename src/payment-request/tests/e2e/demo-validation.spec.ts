import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/demo')
})

// ─── Required fields ──────────────────────────────────────────────────────────

test('empty submit requires at least email or phone', async ({ page }) => {
  await page.getByTestId('demo-create-request').click()

  // Both contact fields should show the "provide email or phone" error
  const helpers = page.locator('.MuiFormHelperText-root')
  await expect(helpers.filter({ hasText: 'Provide a recipient email or phone number' }).first()).toBeVisible()
})

test('amount is required', async ({ page }) => {
  await page.getByTestId('demo-recipient-email').fill('friend@example.com')
  await page.getByTestId('demo-create-request').click()

  await expect(page.locator('.MuiFormHelperText-root', { hasText: 'Amount is required' })).toBeVisible()
})

// ─── Email validation ─────────────────────────────────────────────────────────

test('invalid email format shows error', async ({ page }) => {
  await page.getByTestId('demo-recipient-email').fill('notanemail')
  await page.getByTestId('demo-amount').fill('100')
  await page.getByTestId('demo-create-request').click()

  await expect(
    page.locator('.MuiFormHelperText-root', { hasText: 'Enter a valid email address' }),
  ).toBeVisible()
})

test('self-request by email is blocked', async ({ page }) => {
  // DEMO_CURRENT_USER.email = 'alex@lovie.app'
  await page.getByTestId('demo-recipient-email').fill('alex@lovie.app')
  await page.getByTestId('demo-amount').fill('100')
  await page.getByTestId('demo-create-request').click()

  await expect(
    page.locator('.MuiFormHelperText-root', { hasText: 'cannot request money from yourself' }),
  ).toBeVisible()
})

// ─── Phone validation ─────────────────────────────────────────────────────────

test('phone without + prefix shows error', async ({ page }) => {
  await page.getByTestId('demo-recipient-phone').fill('905551112233')
  await page.getByTestId('demo-amount').fill('100')
  await page.getByTestId('demo-create-request').click()

  await expect(
    page.locator('.MuiFormHelperText-root', { hasText: 'valid phone number' }),
  ).toBeVisible()
})

test('self-request by phone is blocked', async ({ page }) => {
  // DEMO_CURRENT_USER.phone = '+905550000001'
  await page.getByTestId('demo-recipient-phone').fill('+905550000001')
  await page.getByTestId('demo-amount').fill('100')
  await page.getByTestId('demo-create-request').click()

  await expect(
    page.locator('.MuiFormHelperText-root', { hasText: 'cannot request money from yourself' }),
  ).toBeVisible()
})

// ─── Amount validation ────────────────────────────────────────────────────────

test('zero amount shows error', async ({ page }) => {
  await page.getByTestId('demo-recipient-email').fill('friend@example.com')
  await page.getByTestId('demo-amount').fill('0')
  await page.getByTestId('demo-create-request').click()

  await expect(
    page.locator('.MuiFormHelperText-root', { hasText: 'greater than 0' }),
  ).toBeVisible()
})

test('negative amount shows error', async ({ page }) => {
  await page.getByTestId('demo-recipient-email').fill('friend@example.com')
  await page.getByTestId('demo-amount').fill('-50')
  await page.getByTestId('demo-create-request').click()

  await expect(
    page.locator('.MuiFormHelperText-root', { hasText: 'greater than 0' }),
  ).toBeVisible()
})

// ─── Note validation ──────────────────────────────────────────────────────────

test('note over 280 characters shows error', async ({ page }) => {
  const longNote = 'x'.repeat(281)
  await page.getByTestId('demo-recipient-email').fill('friend@example.com')
  await page.getByTestId('demo-amount').fill('100')
  await page.getByTestId('demo-note').fill(longNote)
  await page.getByTestId('demo-create-request').click()

  await expect(
    page.locator('.MuiFormHelperText-root', { hasText: '280 characters or less' }),
  ).toBeVisible()
})

test('note at exactly 280 characters is accepted', async ({ page }) => {
  const note = 'x'.repeat(280)
  await page.getByTestId('demo-recipient-email').fill('friend@example.com')
  await page.getByTestId('demo-amount').fill('100')
  await page.getByTestId('demo-note').fill(note)
  await page.getByTestId('demo-create-request').click()

  await expect(page.getByTestId('demo-create-success')).toContainText('Created request')
})
