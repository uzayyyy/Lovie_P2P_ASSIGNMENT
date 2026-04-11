import { expect, test } from '@playwright/test'

// Seed data summary:
// Outgoing: demo-outgoing-phone (pending), demo-outgoing-paid (paid → selin@lovie.app)
// Incoming: demo-incoming-pending (pending), demo-incoming-expired (expired)

// ─── Tab switching ────────────────────────────────────────────────────────────

test('outgoing tab shows outgoing requests', async ({ page }) => {
  await page.goto('/demo')

  // Default tab is outgoing — seed has two outgoing requests
  const cards = page.locator('[data-testid^="demo-request-card-"]')
  await expect(cards).toHaveCount(2)
  await expect(cards.first()).toBeVisible()
})

test('incoming tab shows incoming requests', async ({ page }) => {
  await page.goto('/demo')

  await page.getByTestId('demo-tab-incoming').click()

  const cards = page.locator('[data-testid^="demo-request-card-"]')
  await expect(cards).toHaveCount(2)

  // One pending, one expired — neither should be from the outgoing sender
  const listText = await page.locator('[data-testid^="demo-request-card-"]').allTextContents()
  expect(listText.join(' ')).toMatch(/emir@lovie\.app|melis@lovie\.app/)
})

// ─── Status filter ────────────────────────────────────────────────────────────

test('status filter narrows outgoing list to paid only', async ({ page }) => {
  await page.goto('/demo')

  // MUI Select: click the visible combobox div, not the hidden native input
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Paid' }).click()

  const cards = page.locator('[data-testid^="demo-request-card-"]')
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toContainText('selin@lovie.app')
})

test('status filter narrows outgoing list to pending only', async ({ page }) => {
  await page.goto('/demo')

  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Pending' }).click()

  const cards = page.locator('[data-testid^="demo-request-card-"]')
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toContainText('+905550000099')
})

test('status filter with no matches shows empty state', async ({ page }) => {
  await page.goto('/demo')

  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Declined' }).click()

  await expect(page.getByText('No requests match the current filter.')).toBeVisible()
})

// ─── Search ───────────────────────────────────────────────────────────────────

test('search filters outgoing list by email', async ({ page }) => {
  await page.goto('/demo')

  await page.getByTestId('demo-search').fill('selin')

  const cards = page.locator('[data-testid^="demo-request-card-"]')
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toContainText('selin@lovie.app')
})

test('search filters outgoing list by phone', async ({ page }) => {
  await page.goto('/demo')

  await page.getByTestId('demo-search').fill('+905550000099')

  const cards = page.locator('[data-testid^="demo-request-card-"]')
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toContainText('+905550000099')
})

test('search with no match shows empty state', async ({ page }) => {
  await page.goto('/demo')

  await page.getByTestId('demo-search').fill('nobody@nonexistent.invalid')

  await expect(page.getByText('No requests match the current filter.')).toBeVisible()
})
