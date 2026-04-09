# Data Model: P2P Payment Request

**Feature**: 001-payment-request  
**Date**: 2026-04-09  
**PostgreSQL Version**: 15  
**Supabase Auth**: Managed by `auth.users` (Supabase internal schema)

---

## Tables

### `profiles`

Stores extended user information beyond what Supabase Auth provides. One row per auth user, created automatically via a trigger on `auth.users INSERT`.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NOT NULL | — | PRIMARY KEY, REFERENCES `auth.users(id)` ON DELETE CASCADE |
| `display_name` | `text` | NOT NULL | — | — |
| `phone` | `text` | NULL | NULL | UNIQUE |
| `avatar_url` | `text` | NULL | NULL | — |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |

**Indexes**:
- `profiles_pkey` — B-tree on `id` (implicit from PRIMARY KEY)
- `profiles_phone_key` — B-tree on `phone` (implicit from UNIQUE)

**RLS**: Enabled. See policies below.

---

### `payment_requests`

The core entity. Each row represents a single money request from one user to another.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PRIMARY KEY |
| `sender_id` | `uuid` | NOT NULL | — | REFERENCES `auth.users(id)` ON DELETE RESTRICT |
| `recipient_email` | `text` | NOT NULL | — | — |
| `recipient_phone` | `text` | NULL | NULL | — |
| `recipient_id` | `uuid` | NULL | NULL | REFERENCES `auth.users(id)` ON DELETE SET NULL |
| `amount` | `numeric(12,2)` | NOT NULL | — | CHECK (`amount > 0`) |
| `currency` | `text` | NOT NULL | `'TRY'` | CHECK (`currency = 'TRY'`) — remove in v2 for multi-currency |
| `note` | `text` | NULL | NULL | CHECK (`char_length(note) <= 280`) |
| `status` | `text` | NOT NULL | `'pending'` | CHECK (`status IN ('pending','paid','declined','cancelled','expired')`) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — |
| `expires_at` | `timestamptz` | NOT NULL | `now() + INTERVAL '7 days'` | — |
| `paid_at` | `timestamptz` | NULL | NULL | — |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | — |

**Indexes**:
- `payment_requests_pkey` — B-tree on `id` (implicit from PRIMARY KEY)
- `idx_payment_requests_sender_id` — B-tree on `sender_id`
- `idx_payment_requests_recipient_email` — B-tree on `recipient_email`
- `idx_payment_requests_recipient_id` — B-tree on `recipient_id`
- `idx_payment_requests_status` — B-tree on `status`
- `idx_payment_requests_expires_at` — B-tree on `expires_at` (used by pg_cron job scan)

**RLS**: Enabled. See policies below.

---

### `public_payment_request_view`

A security-barrier view that exposes only the safe, non-sensitive columns of `payment_requests` to anonymous callers (shareable link feature). PostgreSQL RLS is row-level and cannot restrict columns on the base table; this view is the correct pattern for column restriction.

**This is a view, not a table.** It has no independent indexes or RLS policies. Access control is via the `GRANT SELECT TO anon` and the `security_barrier` option.

| Column | Source Column | Type |
|--------|---------------|------|
| `id` | `payment_requests.id` | `uuid` |
| `amount` | `payment_requests.amount` | `numeric(12,2)` |
| `currency` | `payment_requests.currency` | `text` |
| `note` | `payment_requests.note` | `text` |
| `status` | `payment_requests.status` | `text` |
| `created_at` | `payment_requests.created_at` | `timestamptz` |
| `expires_at` | `payment_requests.expires_at` | `timestamptz` |

**Columns intentionally omitted**: `sender_id`, `recipient_email`, `recipient_phone`, `recipient_id`, `paid_at`, `updated_at`

**Access**: `GRANT SELECT ON public_payment_request_view TO anon` — anonymous Supabase clients (using the anon key) can SELECT from this view by `id`. No INSERT, UPDATE, or DELETE.

---

## RLS Policies

### `profiles`

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: users can read their own profile
CREATE POLICY "profiles_select_own"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- INSERT: users can insert their own profile only
CREATE POLICY "profiles_insert_own"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- UPDATE: users can update their own profile only
CREATE POLICY "profiles_update_own"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

### `payment_requests`

```sql
-- Enable RLS
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: sender or recipient can read; anon cannot (anon uses view)
CREATE POLICY "payment_requests_select_own"
ON payment_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = sender_id
  OR auth.uid() = recipient_id
);

-- INSERT: only the authenticated user may create; sender != recipient
-- Self-request blocked by comparing email of current user
CREATE POLICY "payment_requests_insert_own"
ON payment_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND (
    -- If recipient already registered, IDs must differ
    (recipient_id IS NOT NULL AND sender_id IS DISTINCT FROM recipient_id)
    OR
    -- If recipient not yet registered, compare email
    (
      recipient_id IS NULL
      AND recipient_email != (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  )
);

-- UPDATE: enforce role-based status transitions
-- Sender may only set status = 'cancelled'
-- Recipient may only set status = 'paid' or 'declined'
-- No one (via authenticated role) may set status = 'expired' directly
CREATE POLICY "payment_requests_update_own"
ON payment_requests
FOR UPDATE
TO authenticated
USING (
  auth.uid() = sender_id
  OR auth.uid() = recipient_id
)
WITH CHECK (
  (auth.uid() = sender_id AND status = 'cancelled')
  OR
  (auth.uid() = recipient_id AND status IN ('paid', 'declined'))
);

-- No DELETE policy: rows are immutable after creation
```

---

## Status Machine

### Valid Status Values

`pending` | `paid` | `declined` | `cancelled` | `expired`

### Transitions

```
                     ┌──────────────────────────────────────────────────────────┐
                     │                                                          │
                     ▼                                                          │
              [ pending ]  ─────(recipient pays)──────────────►  [ paid ]     │
                  │   │                                                         │
                  │   └──────(recipient declines)──────────────► [ declined ]  │
                  │                                                             │
                  └──────────(sender cancels)───────────────────► [ cancelled ]│
                  │                                                             │
                  └──────────(pg_cron: expires_at < now())───────► [ expired ] │
                                                                               │
      [ paid ] [ declined ] [ cancelled ] [ expired ]  ──── NO FURTHER ───────┘
                                                            TRANSITIONS
```

### Transition Table

| From | To | Actor | Condition | Mechanism |
|------|----|-------|-----------|-----------|
| `pending` | `paid` | Recipient | `auth.uid() = recipient_id` AND `status = 'pending'` | `dataProvider.update` via RLS UPDATE policy |
| `pending` | `declined` | Recipient | `auth.uid() = recipient_id` AND `status = 'pending'` | `dataProvider.update` via RLS UPDATE policy |
| `pending` | `cancelled` | Sender | `auth.uid() = sender_id` AND `status = 'pending'` | `dataProvider.update` via RLS UPDATE policy |
| `pending` | `expired` | System (pg_cron) | `status = 'pending'` AND `expires_at < now()` | pg_cron SQL UPDATE using postgres superuser (bypasses RLS) |
| `paid` | any | — | BLOCKED | No RLS UPDATE policy allows any transition out of `paid` |
| `declined` | any | — | BLOCKED | No RLS UPDATE policy allows any transition out of `declined` |
| `cancelled` | any | — | BLOCKED | No RLS UPDATE policy allows any transition out of `cancelled` |
| `expired` | any | — | BLOCKED | No RLS UPDATE policy allows any transition out of `expired` |

**Idempotency**: The RLS `WITH CHECK` clause on UPDATE only permits `status IN ('paid','declined')` for the recipient or `status = 'cancelled'` for the sender. Since the `USING` clause applies to the **existing** row, an attempt to re-update an already-paid row will find no matching row in the USING filter (the row is still visible to both parties for SELECT, but the UPDATE WITH CHECK will fail). Additionally, the UI disables action buttons for non-pending records.

---

## DB Trigger: `resolve_recipient_id`

When a new user signs up (row inserted into `auth.users`), this trigger updates all existing `payment_requests` where `recipient_email` matches the new user's email and `recipient_id IS NULL`. This resolves previously unmatched requests and enables the standard RLS SELECT policy to function for the newly registered recipient.

### Function

```sql
CREATE OR REPLACE FUNCTION resolve_recipient_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE payment_requests
  SET
    recipient_id = NEW.id,
    updated_at   = now()
  WHERE
    recipient_email = NEW.email
    AND recipient_id IS NULL
    AND status       = 'pending';

  RETURN NEW;
END;
$$;
```

- **SECURITY DEFINER**: runs with the privileges of the function owner (postgres), not the calling user. This is required because `auth.users` is in a restricted schema and `payment_requests` UPDATE would otherwise require the anon/authenticated role to have direct UPDATE access via RLS on system-initiated rows.
- **`SET search_path = public`**: prevents search-path injection attacks.
- **Scope**: only updates rows with `status = 'pending'` — expired, paid, declined, or cancelled requests are not affected even if the recipient later registers.

### Trigger

```sql
CREATE TRIGGER on_new_user_resolve_recipient
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION resolve_recipient_id();
```

- **Fires**: AFTER INSERT on `auth.users` (Supabase Auth schema) — i.e., on every new user sign-up, including magic-link first-time sign-in.
- **FOR EACH ROW**: executes once per inserted user.

---

## pg_cron Job: `expire-requests`

Runs every hour and transitions all overdue `pending` requests to `expired`. Executes as the `postgres` superuser, bypassing RLS — the correct behaviour for a system-initiated status transition.

### Schedule

```sql
-- Step 1: Enable the extension (run once)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Schedule the job
SELECT cron.schedule(
  'expire-payment-requests',        -- unique job name
  '0 * * * *',                      -- cron expression: top of every hour
  $$
    UPDATE payment_requests
    SET
      status     = 'expired',
      updated_at = now()
    WHERE
      status     = 'pending'
      AND expires_at < now();
  $$
);
```

### Verification

```sql
-- Confirm the job is registered
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname = 'expire-payment-requests';

-- Inspect recent run history
SELECT start_time, end_time, status, return_message
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'expire-payment-requests'
)
ORDER BY start_time DESC
LIMIT 10;
```

### Removal

```sql
SELECT cron.unschedule('expire-payment-requests');
```

### Notes

- The job is idempotent: running it multiple times on the same dataset produces the same result.
- Client-side `ExpiryCountdown` uses `expires_at` to display the countdown label in real time, but the authoritative `status` field is only updated by this pg_cron job. A request may display "Expired" client-side before the next cron run; the status in DB will catch up within the hour (SC-003).
- For integration tests: invoke the expire SQL directly (without waiting for the cron schedule) to keep test run times short.
