# Research: P2P Payment Request — Phase 0 Findings

**Feature**: 001-payment-request  
**Date**: 2026-04-09  
**Status**: Complete — feeds directly into Phase 1 planning

---

## 1. ra-supabase Data Provider

### Decision
Use `ra-supabase` v3.5.1 (the official marmelab package) as the single data provider and auth provider. No alternative package is needed.

### Rationale
`ra-supabase` is the first-party Supabase adapter maintained by the react-admin authors (marmelab). It wraps `ra-data-postgrest` under the hood (PostgREST protocol) and also ships a ready-made `supabaseAuthProvider`. The constitution explicitly mandates `ra-supabase`, and the package is actively maintained (last published ~1 month before this writing, v3.5.1).

### Alternatives Considered
- `ra-data-postgrest` directly: lower-level, no auth integration, more boilerplate.
- `ra-data-graphql-supabase` (community): uses `pg_graphql`; heavier, adds GraphQL complexity for no benefit at v1 scale.
- Custom REST layer: explicitly forbidden by the constitution.

### Implementation Note

**Install:**
```bash
npm install ra-supabase @supabase/supabase-js
```

**Scaffold (bootstrap file):**
```tsx
// src/supabase.ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// src/App.tsx
import { Admin, Resource } from 'react-admin';
import { supabaseDataProvider, supabaseAuthProvider } from 'ra-supabase';
import { supabase } from './supabase';

const dataProvider = supabaseDataProvider({ instanceUrl: import.meta.env.VITE_SUPABASE_URL, apiKey: import.meta.env.VITE_SUPABASE_ANON_KEY, supabaseClient: supabase });
const authProvider = supabaseAuthProvider(supabase, { getIdentity: async (user) => ({ id: user.id, fullName: user.email }) });
```

**Filtering for Incoming vs Outgoing tabs** — use `filter` prop on `<List>` or pass `filterDefaultValues`. The `ra-supabase` data provider translates React Admin filter objects to PostgREST query parameters:
```tsx
// Outgoing tab
<List resource="payment_requests" filter={{ sender_id: userId }}>

// Incoming tab
<List resource="payment_requests" filter={{ recipient_id: userId }}>
```
For the tab-switched view, use a custom `<TabbedList>` that swaps the filter value between `sender_id=me` and `recipient_id=me` using `useListFilterContext` or simply two separate filtered `<List>` components rendered conditionally.

---

## 2. Supabase RLS for Shared Resources (sender + recipient)

### Decision
A single `SELECT` policy using `OR` on `auth.uid()` against both `sender_id` and `recipient_id`. Separate `INSERT` and `UPDATE` policies enforce write constraints.

### Rationale
This is the canonical Supabase pattern. PostgreSQL evaluates the policy as an implicit `WHERE` clause appended to every query. Using `OR` correctly allows both parties to read their shared row with zero application-layer involvement.

### Alternatives Considered
- Separate policies per role (one for sender, one for recipient): works identically in Postgres when multiple policies are ORed by default, but a single combined policy is simpler to reason about and audit.
- A junction/permission table: over-engineered for two fixed roles.

### Implementation Note

```sql
-- Enable RLS
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: sender or recipient can read
CREATE POLICY "select_own_requests"
ON payment_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = sender_id
  OR auth.uid() = recipient_id
);

-- INSERT: only the sender can create; cannot request from yourself
CREATE POLICY "insert_own_requests"
ON payment_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND sender_id IS DISTINCT FROM recipient_id
);

-- UPDATE: sender may cancel; recipient may pay or decline
-- Enforced at application layer + a guard policy:
CREATE POLICY "update_own_requests"
ON payment_requests
FOR UPDATE
TO authenticated
USING (
  auth.uid() = sender_id   -- sender sees outgoing rows for update
  OR auth.uid() = recipient_id  -- recipient sees incoming rows for update
)
WITH CHECK (
  -- Sender may only set cancelled
  (auth.uid() = sender_id AND status = 'cancelled')
  OR
  -- Recipient may only set paid or declined
  (auth.uid() = recipient_id AND status IN ('paid', 'declined'))
);

-- No DELETE policy → no one can delete rows
```

> Note: The expiration Edge Function/cron job must use the `service_role` key (bypasses RLS) to set `status = 'expired'` because no authenticated user owns that transition.

---

## 3. Supabase Magic Link Auth with React Admin

### Decision
Use `ra-supabase`'s built-in `supabaseAuthProvider` combined with a custom `LoginPage` component that calls `supabase.auth.signInWithOtp({ email })`. The callback route handles the token exchange via `supabase.auth.getSessionFromUrl()` (or `onAuthStateChange`).

### Rationale
`ra-supabase` ships `supabaseAuthProvider` which already handles `checkAuth`, `logout`, `getIdentity`, and `checkError`. The only customisation needed is the login method — replacing a password field with a magic link OTP call. This keeps the auth surface minimal and aligned with the constitution.

### Alternatives Considered
- Full custom `authProvider` from scratch: unnecessary duplication when `ra-supabase` covers 90% of it.
- Social/OAuth login: out of scope for v1 per spec.

### Implementation Note

```tsx
// src/auth/LoginPage.tsx
import { useState } from 'react';
import { useNotify } from 'react-admin';
import { supabase } from '../supabase';
import { Button, TextField, Box, Typography } from '@mui/material';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const notify = useNotify();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      notify(error.message, { type: 'error' });
    } else {
      setSent(true);
    }
  };

  if (sent) return <Typography>Check your email for the magic link.</Typography>;

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <TextField label="Email" value={email} onChange={e => setEmail(e.target.value)} type="email" required />
      <Button type="submit" variant="contained">Send Magic Link</Button>
    </Box>
  );
};

// src/auth/CallbackPage.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export const CallbackPage = () => {
  const navigate = useNavigate();
  useEffect(() => {
    // Supabase JS v2 auto-processes the hash fragment on load.
    // onAuthStateChange fires with SIGNED_IN once the session is ready.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') navigate('/');
    });
    return () => listener.subscription.unsubscribe();
  }, [navigate]);
  return <div>Signing you in…</div>;
};

// src/App.tsx — wire up
<Admin loginPage={LoginPage} authProvider={authProvider}>
  {/* register /auth/callback as a custom route */}
  <CustomRoutes noLayout>
    <Route path="/auth/callback" element={<CallbackPage />} />
  </CustomRoutes>
</Admin>
```

---

## 4. Payment Simulation Pattern

### Decision
Use `useUpdate` from `react-admin` with an explicit `setTimeout` wrapping the mutate call to introduce the 2–3 second delay client-side. The button tracks a local `loading` boolean to disable itself and show a `CircularProgress` indicator immediately on click.

### Rationale
`useUpdate` provides `isPending` automatically, but that reflects actual network latency, not the simulated 2–3 second delay. An explicit `setTimeout` before calling `mutate` makes the simulation deterministic and testable with `jest.useFakeTimers`. The button disables on first click (local state) so double-clicks are ignored before `mutate` even fires.

### Alternatives Considered
- Using `isPending` only (no setTimeout): the network round-trip to Supabase is too fast; simulation requirement would not be met.
- Supabase Edge Function with `await sleep(2500)`: server-side delay, harder to test and wastes serverless execution time for a pure simulation.

### Implementation Note

```tsx
// src/components/PayButton.tsx
import { useState } from 'react';
import { useUpdate, useRecordContext, useRefresh, useNotify, Button } from 'react-admin';
import CircularProgress from '@mui/material/CircularProgress';

const SIMULATION_DELAY_MS = 2500; // 2.5 s — within the 2–3 s spec range

export const PayButton = () => {
  const record = useRecordContext();
  const refresh = useRefresh();
  const notify = useNotify();
  const [loading, setLoading] = useState(false);
  const [update] = useUpdate();

  if (!record || record.status !== 'pending') return null;

  const handlePay = () => {
    if (loading) return; // guard against double-click
    setLoading(true);

    setTimeout(() => {
      update(
        'payment_requests',
        {
          id: record.id,
          data: { status: 'paid', paid_at: new Date().toISOString() },
          previousData: record,
        },
        {
          onSuccess: () => {
            notify('Payment successful', { type: 'success' });
            refresh();
          },
          onError: (error) => {
            notify(`Payment failed: ${error.message}`, { type: 'error' });
            setLoading(false);
          },
        }
      );
    }, SIMULATION_DELAY_MS);
  };

  return (
    <Button
      label="Pay"
      onClick={handlePay}
      disabled={loading}
      startIcon={loading ? <CircularProgress size={16} /> : undefined}
    />
  );
};
```

**Testing with fake timers:**
```ts
jest.useFakeTimers();
fireEvent.click(screen.getByRole('button', { name: /pay/i }));
expect(screen.getByRole('progressbar')).toBeInTheDocument(); // spinner visible
jest.advanceTimersByTime(2500);
// assert update was called
```

---

## 5. Request Expiration via pg_cron

### Decision
Use `pg_cron` (enabled via Supabase Dashboard → Extensions or `CREATE EXTENSION IF NOT EXISTS pg_cron`) to run a direct SQL `UPDATE` every hour. No Edge Function is required for the expiration logic itself.

### Rationale
pg_cron v1.6.4 is available on all hosted Supabase projects; it simply needs to be enabled (it is not on by default). A direct SQL cron job is simpler, faster, and more reliable than an Edge Function for a pure DB mutation. Edge Functions introduce cold-start latency and an additional network hop for what is a single SQL statement. The spec mentions Edge Function as a possibility but direct pg_cron is the better choice.

### Alternatives Considered
- **Supabase Edge Function with Deno cron (`Deno.cron`)**: Available in Supabase Edge Runtime ≥1.30, but requires deploying a function and adds cold-start overhead. Use only if the project cannot enable pg_cron (e.g., self-hosted with restricted extensions).
- **Client-side expiry only**: Unreliable — status stays `pending` in DB until someone reads it. Violates FR-005 and SC-003.

### Implementation Note

**Step 1 — Enable the extension (run once, as project owner):**
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```
Or enable it in the Supabase Dashboard under Database → Extensions → pg_cron.

**Step 2 — Create the cron job:**
```sql
-- Schedule: every hour on the hour
SELECT cron.schedule(
  'expire-payment-requests',      -- job name (unique)
  '0 * * * *',                    -- cron expression: minute 0 of every hour
  $$
    UPDATE payment_requests
    SET status = 'expired', updated_at = now()
    WHERE status = 'pending'
      AND expires_at < now();
  $$
);
```

**Step 3 — Verify:**
```sql
SELECT * FROM cron.job WHERE jobname = 'expire-payment-requests';
SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'expire-payment-requests') ORDER BY start_time DESC LIMIT 10;
```

**Step 4 — Remove (if needed):**
```sql
SELECT cron.unschedule('expire-payment-requests');
```

> The cron job runs with the database's `postgres` superuser role and therefore bypasses RLS — it can update rows regardless of `sender_id`/`recipient_id`. This is the correct and intended behaviour for system-initiated transitions.

**Edge Function alternative (fallback only):**
```ts
// supabase/functions/expire-requests/index.ts
Deno.serve(async () => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { count, error } = await supabase
    .from('payment_requests')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .select('id', { count: 'exact', head: true });
  return new Response(JSON.stringify({ expired: count, error }), { headers: { 'Content-Type': 'application/json' } });
});
```
Schedule it with `cron.schedule` calling `net.http_post` to the function URL, or use the Supabase Dashboard's Edge Function scheduler.

---

## 6. Shareable Link Public Read

### Decision
Add a second `SELECT` policy scoped to the `anon` role that allows anyone to read **only the safe columns** (`id`, `amount`, `currency`, `note`, `status`, `created_at`, `expires_at`) by using a **PostgreSQL security-barrier view** exposed via the PostgREST API. The underlying table remains fully protected; the view exposes only the safe subset.

### Rationale
PostgreSQL RLS itself is row-level and cannot restrict columns — it is all-or-nothing per row. Column restriction requires either (a) column-level `GRANT` revocations on the table, or (b) a dedicated view that projects only the allowed columns. The view approach is cleaner, avoids confusing `SELECT *` errors, and is the Supabase-recommended pattern for Postgres 15+ (`security_invoker = true`). Sensitive fields like `sender_id`, `recipient_id`, `recipient_email`, `recipient_phone`, and `paid_at` are never surfaced to anonymous callers.

### Alternatives Considered
- Anon RLS policy on the base table with no column restriction: exposes `recipient_email` and `recipient_phone` to anyone with the UUID — a privacy violation.
- Separate `public_payment_requests` table populated by trigger: write complexity, synchronisation risk, overkill.
- Supabase Edge Function as a proxy for public reads: unnecessary indirection for a simple read.

### Implementation Note

```sql
-- 1. Create a security-barrier view with only the safe columns
CREATE VIEW public_payment_request_view
WITH (security_barrier = true, security_invoker = true)
AS
SELECT
  id,
  amount,
  currency,
  note,
  status,
  created_at,
  expires_at
FROM payment_requests;

-- 2. Grant SELECT on the view to the anon role
GRANT SELECT ON public_payment_request_view TO anon;

-- 3. Revoke direct anon access to the base table (RLS covers authenticated;
--    but to be explicit, ensure no anon policy exists on the base table)
-- (no anon SELECT policy on payment_requests → anon cannot access base table)
```

**React Admin / Supabase client — public shareable link page:**
```tsx
// src/pages/PublicRequestPage.tsx — rendered at /request/:id (no auth required)
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabase';

export const PublicRequestPage = () => {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<any>(null);

  useEffect(() => {
    supabase
      .from('public_payment_request_view')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setRequest(data));
  }, [id]);

  if (!request) return <div>Loading…</div>;
  return (
    <div>
      <p>Amount: {request.amount} {request.currency}</p>
      <p>Status: {request.status}</p>
      <p>Note: {request.note}</p>
      <a href="/login">Log in to Pay</a>
    </div>
  );
};
```

This page is registered as a `<CustomRoutes noLayout>` route in the `<Admin>` component so it renders without auth checks.

---

## 7. Notifications — v1 Decision

### Decision
**In-app only for v1.** No email notification to the recipient on request creation.

### Rationale
The spec marks this `[NEEDS CLARIFICATION]` and the Assumptions section explicitly states: "Notification system (email to recipient) is out of scope for v1 unless Supabase SMTP is trivially available." Setting up Supabase SMTP requires configuring a third-party SMTP provider (SendGrid, Resend, etc.) and writing an Edge Function trigger — that is non-trivial effort that is not core to the payment flow. The shareable link covers the primary distribution channel: the requester copies and sends the link manually (WhatsApp, SMS, email, etc.). In-app notifications can be surfaced by showing a badge/count on the Incoming tab derived from the existing `payment_requests` query.

### Alternatives Considered
- **Supabase SMTP + Edge Function trigger**: Adds an Edge Function, a Database Webhook, SMTP credentials management, and email template HTML to v1 scope. Deferred to v2.
- **Supabase Realtime notifications (in-app toast)**: The recipient must already have the app open — useful as a real-time update but does not substitute for a notification to an offline user. Can be added in v1 as a progressive enhancement using `supabase.channel().on('postgres_changes', …)` with near-zero overhead.

### v1 Implementation Note
Wire a Supabase Realtime channel in the dashboard so that if the recipient is already logged in, a toast notification fires automatically:

```tsx
useEffect(() => {
  const channel = supabase
    .channel('incoming-requests')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'payment_requests',
      filter: `recipient_id=eq.${userId}`,
    }, (payload) => {
      notify(`New payment request for ${payload.new.amount} TRY`, { type: 'info' });
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [userId]);
```

Email notifications are a clear v2 item. Document in the backlog.

---

## 8. Currency Decision

### Decision
**Single currency: TRY (Turkish Lira) for v1.** The `currency` column exists in the schema but is fixed to `'TRY'` via a `DEFAULT 'TRY'` constraint. No currency selector is shown in the UI.

### Rationale
The spec already says "Assume single currency (TRY) for v1" and the Assumptions section confirms it. Multi-currency requires locale-aware formatting, exchange rates, and more complex validation — all out of scope. Keeping `currency` as a column (with a hard-coded default) preserves the schema for v2 multi-currency without a migration.

### Alternatives Considered
- **USD as default**: No basis in the spec; TRY is explicitly called out.
- **Multi-currency from the start**: YAGNI — adds UI complexity (currency picker, amount formatting per locale) for no v1 user value.
- **Omitting the currency column entirely**: Would require a schema migration to add multi-currency later. Keeping the column is zero-cost.

### Implementation Note
```sql
-- Schema already includes: currency text NOT NULL DEFAULT 'TRY'
-- Add a CHECK constraint to enforce the v1 restriction:
ALTER TABLE payment_requests
  ADD CONSTRAINT currency_v1_only CHECK (currency = 'TRY');
-- Remove this constraint in v2 when multi-currency is introduced.
```

In the React Admin form, do not render a currency field. Display amounts with the TRY symbol:
```tsx
<NumberField source="amount" options={{ style: 'currency', currency: 'TRY' }} />
```

---

## 9. Unregistered Recipient — v1 Decision

### Decision
**Allow requests to unregistered email addresses for v1.** The `recipient_id` column is `NULLABLE`. The request is stored with `recipient_email` set and `recipient_id = NULL`. When the recipient later registers or logs in, a Supabase Database Function resolves `recipient_id` by matching `auth.users.email`. The shareable link is the primary delivery mechanism.

### Rationale
The spec already has `recipient_id` as `NULLABLE` in the data model and the edge case says "Request is still created; recipient is notified via email with a signup CTA." Requiring registered-only recipients would severely limit the product's utility — the requester cannot know which contacts have accounts. The shareable link pattern (User Story 6) is explicitly designed for this: an unregistered user lands on `/request/{uuid}`, sees the amount and note, and is prompted to sign up to pay.

### Alternatives Considered
- **Require registered users only**: Simpler RLS (`recipient_id = auth.uid()` is never NULL), but poor UX — requester must know whether their contact is registered. Rejected.
- **Resolve recipient_id eagerly at create time** (look up `auth.users` by email): Not possible client-side — `auth.users` is not exposed via PostgREST for security. Requires an Edge Function or Database Function. Deferred to the resolution step below.

### Implementation Note

**Resolution trigger — auto-populate `recipient_id` when the matching user signs up:**
```sql
-- Function: called by a trigger on auth.users INSERT
CREATE OR REPLACE FUNCTION resolve_recipient_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE payment_requests
  SET recipient_id = NEW.id, updated_at = now()
  WHERE recipient_email = NEW.email
    AND recipient_id IS NULL
    AND status = 'pending';
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_user_resolve_recipient
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION resolve_recipient_id();
```

**RLS adjustment for unresolved rows:**
The SELECT policy `auth.uid() = recipient_id` will return no rows for an unresolved recipient (since `recipient_id IS NULL`). Public read via the shareable link view (item 6) covers the unauthenticated case. Once the user signs up and the trigger fires, the standard authenticated SELECT policy kicks in.

**Self-request guard** (no `recipient_id` to compare at insert time, compare emails):
```sql
-- Added to INSERT WITH CHECK:
AND (
  sender_id IS DISTINCT FROM recipient_id  -- registered recipient
  OR (
    recipient_id IS NULL
    AND recipient_email != (SELECT email FROM auth.users WHERE id = auth.uid())
  )
)
```

---

## Summary Table

| # | Topic | Decision |
|---|-------|----------|
| 1 | Data provider | `ra-supabase` v3.5.1 (official marmelab) |
| 2 | RLS dual-owner | Single `SELECT` policy with `OR` on `sender_id`/`recipient_id` |
| 3 | Magic link auth | `supabase.auth.signInWithOtp` + custom `LoginPage` + `CallbackPage` |
| 4 | Payment simulation | `useUpdate` + `setTimeout(2500ms)` + local `loading` state |
| 5 | Expiration | `pg_cron` hourly SQL UPDATE (enable extension; fallback = Edge Function) |
| 6 | Public shareable read | Security-barrier view projecting safe columns; granted to `anon` role |
| 7 | Notifications | In-app Realtime toast only for v1; email deferred to v2 |
| 8 | Currency | Single currency TRY; column kept for v2 multi-currency migration path |
| 9 | Unregistered recipient | Allowed; `recipient_id` nullable; resolved via DB trigger on user sign-up |
