# Developer Quickstart: P2P Payment Request

**Feature**: 001-payment-request  
**Date**: 2026-04-09  
**Estimated setup time**: ~10 minutes  
**Estimated validation time**: ~10 minutes after setup

---

## Prerequisites

Install these before continuing:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20 LTS | https://nodejs.org or `nvm install 20` |
| Supabase CLI | 1.x+ | `npm install -g supabase` or `brew install supabase/tap/supabase` |
| uv (Python package manager) | 0.4+ | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Docker Desktop | 4.x+ | Required by `supabase start` |

Verify:
```bash
node --version        # v20.x.x
supabase --version    # 1.x.x
docker info           # must be running
```

---

## 1. Clone + Install

```bash
git clone <repo-url> my-project
cd my-project

# Install Node dependencies
npm install

# Verify ra-supabase and Supabase JS are present
npm list ra-supabase @supabase/supabase-js
```

---

## 2. Start Local Supabase

```bash
# Initialise Supabase (skip if supabase/ directory already exists)
supabase init

# Start the local Supabase stack (PostgreSQL, Auth, Storage, Studio)
supabase start
```

After `supabase start` completes, note the output:

```
API URL:     http://localhost:54321
Anon Key:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Studio URL:  http://localhost:54323
Inbucket URL: http://localhost:54324   ← email inbox for magic links
```

Create `.env.local` in the project root:

```bash
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon key from supabase start output>
```

---

## 3. Apply the Schema

Run the full schema SQL against your local Supabase instance:

```bash
# Apply via Supabase CLI (runs all files in supabase/migrations/ in order)
supabase db push

# OR apply the combined contract file directly via psql:
psql "postgresql://postgres:postgres@localhost:54322/postgres" \
  -f specs/001-payment-request/contracts/supabase-schema.sql
```

Verify the schema was applied:

```bash
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "\dt public.*"
```

Expected output includes: `payment_requests`, `profiles`

Verify RLS is enabled:

```sql
-- Run in psql or Supabase Studio SQL editor (localhost:54323)
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('payment_requests', 'profiles');
```

Both rows should show `rowsecurity = true`.

Verify pg_cron job is registered:

```sql
SELECT jobname, schedule FROM cron.job WHERE jobname = 'expire-payment-requests';
```

Verify the public view exists:

```sql
SELECT id, amount, status FROM public_payment_request_view LIMIT 1;
-- Returns 0 rows (empty DB) — no error means the view exists
```

---

## 4. Start the Dev Server

```bash
npm run dev
```

The app is available at `http://localhost:5173`.

You should see the React Admin login page with an email input and "Send Magic Link" button.

---

## 5. Key Validation Scenarios

Complete these 5 scenarios in order. Each takes 1–2 minutes. Together they confirm the entire feature works end to end.

---

### Scenario 1: Create a Payment Request

**Setup**: You need two email addresses. Use `alice@example.com` and `bob@example.com` (local Inbucket accepts any address at `localhost:54324`).

1. Open `http://localhost:5173` in your browser.
2. Enter `alice@example.com` and click "Send Magic Link".
3. Open Inbucket at `http://localhost:54324`.
4. Click the magic link for `alice@example.com`. You are redirected to the dashboard.
5. Click "Create" (or the "+" button) to open the New Request form.
6. Fill in:
   - **Recipient email**: `bob@example.com`
   - **Amount**: `150`
   - **Note**: `Dinner split`
7. Click "Save".

**Expected result**:
- You are redirected to the Show page for the new request.
- Status badge shows **Pending**.
- A shareable URL is displayed in the `ShareableLinkField` (format: `http://localhost:5173/request/{uuid}`).
- The `expires_at` countdown shows approximately **7 days**.

**Verify in DB**:
```sql
SELECT id, sender_id, recipient_email, amount, status, expires_at
FROM payment_requests
ORDER BY created_at DESC
LIMIT 1;
-- amount = 150.00, status = 'pending', expires_at ≈ now() + 7 days
```

---

### Scenario 2: View Incoming / Outgoing Dashboard

1. Still logged in as `alice@example.com`, click "Payment Requests" in the sidebar.
2. The **Outgoing** tab shows the request you just created: recipient `bob@example.com`, amount `150.00 TRY`, status **Pending**, expiry countdown.
3. Click the **Incoming** tab — it is empty (no one has requested money from Alice yet).
4. Switch back to **Outgoing**. Use the status filter dropdown — select **Pending**. The request remains visible.
5. Select **Paid** from the status filter — the list is empty (no paid requests yet).
6. Clear the status filter. Type `bob` in the search field — the request appears.
7. Type `carol` in the search field — the list is empty.

**Expected result**: Filters and search work; tabs correctly partition by `sender_id` vs `recipient_id`.

---

### Scenario 3: Pay a Request (See Simulation)

1. Open a new browser window (or use a different browser profile) for Bob.
2. Navigate to `http://localhost:5173`, enter `bob@example.com`, click "Send Magic Link".
3. Check Inbucket (`localhost:54324`) for Bob's magic link, click it.
4. Bob lands on the dashboard → click the **Incoming** tab.
5. The request from Alice (`150.00 TRY`, note `Dinner split`) appears.
6. Click the row to open the Show page.
7. Click the **Pay** button.

**Expected result**:
- The Pay button becomes disabled immediately and shows a loading spinner.
- After approximately 2.5 seconds, the spinner disappears.
- A green success notification: "Payment successful" appears at the top.
- The status badge updates to **Paid**.
- The Pay and Decline buttons are gone — the record is now read-only.

**Verify in DB**:
```sql
SELECT status, paid_at FROM payment_requests ORDER BY created_at DESC LIMIT 1;
-- status = 'paid', paid_at IS NOT NULL
```

**Verify from Alice's perspective**: Refresh Alice's dashboard (or wait for Realtime update). The request in the Outgoing tab shows status **Paid**.

---

### Scenario 4: Shareable Link in Incognito

1. From the request Show page (logged in as Alice or Bob), copy the shareable URL from the `ShareableLinkField` component.
2. Open a new **incognito / private** window.
3. Paste the URL and navigate to it.

**Expected result**:
- The page loads without authentication (no redirect to `/login`).
- Request details are visible: **Amount** (150.00 TRY), **Status** (Paid), **Note** (Dinner split).
- Sensitive fields are NOT shown: no sender email, no recipient email, no phone numbers.
- A "Log in to Pay" button or CTA link is present (even though the request is already paid — the CTA is shown for any unauthenticated visitor on pending requests; for paid requests, the status badge is sufficient).

**Verify by checking the network tab**: the page queries `public_payment_request_view`, not `payment_requests`. Confirm no `recipient_email` or `sender_id` fields appear in the API response JSON.

**Test with a pending request**: Create a second request (repeat Scenario 1 with `carol@example.com`), copy its shareable link, open in incognito. The "Log in to Pay" CTA should be visible and link to `/login`.

---

### Scenario 5: Cancel a Request

1. Log back in as `alice@example.com` (or use the existing session).
2. Create a new payment request:
   - **Recipient email**: `carol@example.com`
   - **Amount**: `75`
   - **Note**: `Coffee`
3. On the Show page for this request, click **Cancel**.
4. A confirmation dialog appears: "Are you sure you want to cancel this request?"
5. Click **Confirm**.

**Expected result**:
- The dialog closes.
- The status badge updates to **Cancelled**.
- The Cancel button disappears (record is now read-only).
- No Pay or Decline buttons are shown.

**Verify in DB**:
```sql
SELECT id, status FROM payment_requests
WHERE recipient_email = 'carol@example.com'
ORDER BY created_at DESC
LIMIT 1;
-- status = 'cancelled'
```

**Verify idempotency** (attempt a second cancel via the API directly):
```bash
curl -X PATCH "http://localhost:54321/rest/v1/payment_requests?id=eq.{uuid}" \
  -H "apikey: <anon key>" \
  -H "Authorization: Bearer <alice's jwt>" \
  -H "Content-Type: application/json" \
  -d '{"status": "cancelled"}'
# Expected: 0 rows updated (RLS UPDATE USING clause finds no matching row
# for a non-pending request)
```

---

## Troubleshooting

**`supabase start` fails**: Ensure Docker Desktop is running. Run `docker info` to confirm.

**Magic link not appearing in Inbucket**: Local Supabase sends all emails to Inbucket at `http://localhost:54324` regardless of the recipient address. If nothing appears, check that the OTP request succeeded (no error toast in the UI).

**RLS blocks all reads**: Confirm the migration was applied (`supabase db push`) and that you are using the anon key in `.env.local`, not the service role key.

**Status not updating after Pay**: Check the browser console for Supabase RLS errors. The most common cause is that `recipient_id` is NULL (Bob's account was not yet registered when Alice created the request). Verify the `resolve_recipient_id` trigger fired:
```sql
SELECT recipient_id FROM payment_requests ORDER BY created_at DESC LIMIT 1;
-- Should be Bob's UUID, not NULL
```

**pg_cron extension missing**: Run `CREATE EXTENSION IF NOT EXISTS pg_cron;` in the Supabase Studio SQL editor (`localhost:54323`). If the extension is not available, your local Supabase version may not include it — update the Supabase CLI and Docker image.
