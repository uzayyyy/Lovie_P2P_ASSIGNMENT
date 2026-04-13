/**
 * Submission demo recording — full ~3min feature walkthrough.
 * Run: npx playwright test demo-recording.spec.ts --headed
 * Video → test-results/demo-recording-.../video.webm
 */
import { expect, test } from '@playwright/test'

test.setTimeout(480_000)

const RECORDING_PACE_MULTIPLIER = 4

const pause = (ms: number) =>
  new Promise((r) => setTimeout(r, ms * RECORDING_PACE_MULTIPLIER))

test('Lovie P2P — full feature walkthrough', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  // ── 1. Login / Landing page ───────────────────────────────────────────────
  await page.goto('/login')
  await expect(page.getByRole('link', { name: 'Open interactive demo' })).toBeVisible()
  await pause(2000)

  await page.getByText('Request money from friends').scrollIntoViewIfNeeded()
  await pause(1800)

  await page.getByText('Flexible request creation').scrollIntoViewIfNeeded()
  await pause(1500)

  // ── 2. Open Demo Sandbox ──────────────────────────────────────────────────
  await page.getByRole('link', { name: 'Open interactive demo' }).click()
  await expect(page).toHaveURL(/\/demo$/)
  await expect(page.getByText(/Review the full payment request flow/i)).toBeVisible()
  await pause(2000)

  // ── 3. Create outgoing request ────────────────────────────────────────────
  await page.locator('[data-testid="demo-recipient-email"]').fill('alice@example.com')
  await pause(600)
  await page.locator('[data-testid="demo-amount"]').fill('250')
  await pause(600)
  await page.locator('[data-testid="demo-note"]').fill('Dinner last night 🍕')
  await pause(900)

  await page.locator('[data-testid="demo-create-request"]').click()
  await expect(page.locator('[data-testid="demo-create-success"]')).toBeVisible({ timeout: 5000 })
  await pause(1500)

  // ── 4. Select request → show detail + cancel button ──────────────────────
  await page.locator('[data-testid^="demo-request-card-"]').first().click()
  await pause(1500)

  // Scroll down to show shareable link
  await page.getByText('Demo share link').scrollIntoViewIfNeeded().catch(() => {})
  await pause(1200)

  // Show cancel button if visible
  await page.locator('[data-testid="demo-cancel"]').scrollIntoViewIfNeeded().catch(() => {})
  await pause(1000)

  // ── 5. Incoming tab → Pay ─────────────────────────────────────────────────
  await page.locator('[data-testid="demo-tab-incoming"]').click()
  await pause(1000)

  await expect(page.locator('[data-testid^="demo-request-card-"]').first()).toBeVisible({ timeout: 5000 })
  await page.locator('[data-testid^="demo-request-card-"]').first().click()
  await pause(1000)

  await page.locator('[data-testid="demo-pay"]').click()
  await expect(page.getByText('Processing…')).toBeVisible({ timeout: 3000 })
  await pause(500)
  // wait for 2.5s simulation
  await expect(page.locator('[data-testid="demo-detail-status"]')).toContainText('paid', { timeout: 6000 })
  await pause(1500)

  // ── 6. Second incoming request → Decline ─────────────────────────────────
  const remainingCards = page.locator('[data-testid^="demo-request-card-"]')
  if (await remainingCards.count().then((c) => c > 0)) {
    await remainingCards.first().click()
    await pause(800)
    const declineBtn = page.locator('[data-testid="demo-decline"]')
    if (await declineBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await declineBtn.click()
      await expect(page.locator('[data-testid="demo-detail-status"]')).toContainText('declined', { timeout: 5000 })
      await pause(1200)
    }
  }

  // ── 7. Outgoing tab + status filter + search ──────────────────────────────
  await page.locator('[data-testid="demo-tab-outgoing"]').click()
  await pause(800)

  // MUI Select — click the combobox to open
  await page.getByRole('combobox').click()
  await pause(500)
  await page.getByRole('option', { name: 'Pending' }).click()
  await pause(1200)

  // Reset
  await page.getByRole('combobox').click()
  await pause(400)
  await page.getByRole('option', { name: 'All statuses' }).click()
  await pause(600)

  // Search
  await page.locator('[data-testid="demo-search"]').fill('alice')
  await pause(1000)
  await page.locator('[data-testid="demo-search"]').clear()
  await pause(500)

  // ── 8. Public share-link preview ──────────────────────────────────────────
  await page.goto('/request/demo-public-pending')
  await expect(page.getByText('Demo preview mode:')).toBeVisible()
  await pause(2200)

  await page.getByRole('link', { name: /log in to pay/i })
    .scrollIntoViewIfNeeded().catch(() => {})
  await pause(1500)

  await page.getByRole('link', { name: /back/i }).first().click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('link', { name: 'Open interactive demo' })).toBeVisible()
  await pause(800)

  // ── 9. Live Supabase app — sign in ────────────────────────────────────────
  await page.goto('/login')
  await expect(page.getByRole('button', { name: /Have a password/i })).toBeVisible()
  await pause(1200)

  await page.getByRole('button', { name: /have a password/i }).click()
  await pause(700)

  await page.getByLabel('Email').fill('demo@lovie.app')
  await pause(500)
  await page.getByLabel('Password').fill('Demo1234!')
  await pause(900)

  await page.getByRole('button', { name: 'Sign in' }).click()

  // Wait for the authenticated dashboard shell to appear.
  await expect(page.getByRole('tab', { name: 'Outgoing' })).toBeVisible({ timeout: 20_000 })
  await pause(1500)

  // ── 10. Dashboard overview ────────────────────────────────────────────────
  // Switch to Incoming tab if visible
  await page.getByRole('tab', { name: 'Incoming' })
    .click().catch(() => {})
  await pause(1200)

  await page.getByRole('tab', { name: 'Outgoing' })
    .click().catch(() => {})
  await pause(1000)

  // ── 11. Create a real Supabase request ────────────────────────────────────
  await page.getByRole('link', { name: /create/i }).click().catch(async () => {
    await page.goto('/#/payment_requests/create')
  })
  await expect(page.getByLabel('Recipient Email')).toBeVisible({ timeout: 20_000 })
  await pause(1200)

  const emailInput = page.getByLabel('Recipient Email')
  await emailInput.click()
  await emailInput.fill('reviewer@lovie.app')
  await pause(600)

  const amountInput = page.getByLabel('Amount (TRY)')
  await amountInput.click()
  await amountInput.fill('100')
  await pause(600)

  const noteInput = page.getByLabel('Note (optional)')
  await noteInput.click()
  await noteInput.fill('Thanks for reviewing! 🙏')
  await pause(1500)

  await page.getByRole('button', { name: /save/i }).click()
  await expect(page.getByRole('button', { name: 'Back to dashboard' })).toBeVisible({ timeout: 20_000 })
  await pause(2500)

  // ── 12. Detail page → back to dashboard ──────────────────────────────────
  await page.getByRole('button', { name: 'Back to dashboard' })
    .scrollIntoViewIfNeeded().catch(() => {})
  await pause(1500)

  await page.getByRole('button', { name: 'Back to dashboard' }).click()
  await expect(page.getByRole('tab', { name: 'Outgoing' })).toBeVisible({ timeout: 20_000 })
  await pause(2000)
})
