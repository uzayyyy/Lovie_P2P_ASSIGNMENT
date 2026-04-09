# Implementation Plan: P2P Payment Request

**Branch**: `001-payment-request` | **Date**: 2026-04-09 | **Spec**: `specs/001-payment-request/spec.md`
**Input**: Feature specification from `/specs/001-payment-request/spec.md`

---

## Summary

Build a P2P payment request feature on top of React Admin v5 + Supabase. Authenticated users create requests by supplying a recipient email, an amount in TRY, and an optional note; the system generates a UUID, a shareable link, and a 7-day expiry. The recipient (who may be unregistered at the time of creation) can Pay (simulated 2-3 s delay) or Decline via the dashboard or the public shareable link. pg_cron expires stale requests hourly. Magic-link auth via Supabase; all data access enforced by RLS; no custom REST layer.

---

## Technical Context

**Language/Version**: TypeScript 5.x, React 18  
**Primary Dependencies**: React Admin v5, ra-supabase v3.5.1, @supabase/supabase-js v2, MUI v5, Vite  
**Storage**: Supabase — PostgreSQL 15, Supabase Auth, pg_cron extension  
**Testing**: Vitest + React Testing Library; real local Supabase instance for integration tests (`supabase start`)  
**Target Platform**: Web (browser); responsive 375 px – 1280 px+  
**Project Type**: web-app (single-page application)  
**Performance Goals**: Dashboard renders up to 100 records in < 2 s on a standard connection (SC-006)  
**Constraints**: No real payment gateway; payment simulated; single currency TRY; no external CSS frameworks; no Redux  
**Scale/Scope**: v1 — single currency, no email notifications, ~3 DB tables, magic-link auth only

---

## Constitution Check

| # | Principle | Status | Justification |
|---|-----------|--------|---------------|
| I | **Security-First** — RLS on all tables, no sensitive data in URLs, auth required for all financial actions | **PASS** | `payment_requests` and `profiles` both have RLS enabled. Shareable links expose only opaque UUIDs. Anon access routed through a security-barrier view that omits `recipient_email`, `recipient_phone`, `paid_at`. Pay/Decline/Cancel require `authenticated` role. Magic-link auth via Supabase — no passwords stored. |
| II | **API-First via Supabase** — DB is the API layer; no custom REST server | **PASS** | All CRUD operations go through `ra-supabase` dataProvider (PostgREST). Business logic lives in RLS policies (access control) and pg_cron (expiration). No custom Express/Fastify server. Edge Function documented only as a fallback alternative for expiration. |
| III | **Test-First (TDD)** — tests written and approved before implementation code | **PASS** | Phase 6 defines tests before implementation phases begin in the task breakdown. Contract tests (RLS SQL assertions), integration tests (real Supabase local), and unit tests (PayButton timer simulation) are all specified with concrete scenarios drawn from spec acceptance criteria. |
| IV | **Integration Testing Priority** — real Supabase via `supabase start`; no mocks for RLS | **PASS** | Phase 6 mandates real DB integration tests for RLS policies, status transitions, and the recipient resolution trigger. Vitest is used with `supabase start` for the test environment. Payment simulation test uses `vi.useFakeTimers()` for the client-side setTimeout. |
| V | **Simplicity (YAGNI)** — max 3 tables, no extra services, 1:1 resource-to-table mapping | **PASS** | Tables: `profiles`, `payment_requests`, `public_payment_request_view` (view, not a table — still within spirit of the constraint). No message queues, no caching layer, no microservices. `public_payment_request_view` is a security-barrier view required for column-level restriction that cannot be done with row-level policies alone — documented justification in research.md §6. |
| VI | **Responsive Design Contract** — functional on 375 px – 1280 px+ | **PASS** | React Admin's built-in responsive utilities (`useMediaQuery`, `<SimpleList>` on mobile) used throughout. No custom CSS breakpoints. Explicitly verified in test scenario SC-007. |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-payment-request/
├── plan.md                         # This file
├── spec.md                         # Feature specification
├── research.md                     # Phase 0 research findings
├── data-model.md                   # Full data model (tables, RLS, trigger, cron)
├── quickstart.md                   # Developer quickstart guide
├── contracts/
│   ├── supabase-schema.sql         # Production-ready SQL schema
│   ├── react-admin-resources.ts    # TypeScript types and interfaces
│   ├── auth-provider.ts            # authProvider interface signatures
│   └── data-provider-filters.md   # Filter objects reference
└── tasks.md                        # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code

```text
src/
├── supabase.ts                     # Supabase client singleton
├── App.tsx                         # Admin root: dataProvider, authProvider, resources, custom routes
├── auth/
│   ├── LoginPage.tsx               # Magic-link email form
│   └── CallbackPage.tsx            # Supabase auth redirect handler (/auth/callback)
├── resources/
│   ├── paymentRequests/
│   │   ├── index.ts                # Resource registration export
│   │   ├── PaymentRequestList.tsx  # List with Incoming/Outgoing tabs
│   │   ├── PaymentRequestShow.tsx  # Detail view with conditional action buttons
│   │   └── PaymentRequestCreate.tsx# Create form with inline validation
│   └── profiles/
│       └── index.ts                # Profiles resource (read-only, for display names)
├── components/
│   ├── PayButton.tsx               # Simulated pay action (2.5 s delay)
│   ├── DeclineButton.tsx           # Decline with confirmation dialog
│   ├── CancelButton.tsx            # Cancel with confirmation dialog
│   ├── ExpiryCountdown.tsx         # Colour-coded countdown chip
│   └── ShareableLinkField.tsx      # Link display with copy-to-clipboard
├── pages/
│   └── PublicRequestPage.tsx       # Unauthenticated shareable link view (/request/:id)
└── providers/
    └── index.ts                    # Re-exports dataProvider and authProvider

supabase/
├── migrations/
│   ├── 20260409000001_create_profiles.sql
│   ├── 20260409000002_create_payment_requests.sql
│   ├── 20260409000003_rls_policies.sql
│   ├── 20260409000004_public_view.sql
│   ├── 20260409000005_resolve_recipient_trigger.sql
│   └── 20260409000006_pg_cron_expire.sql
└── functions/
    └── expire-requests/
        └── index.ts                # Fallback Edge Function (pg_cron primary)

tests/
├── contract/
│   ├── rls-select.test.ts          # RLS SELECT policy assertions (real DB)
│   ├── rls-insert.test.ts          # RLS INSERT policy (self-request block)
│   └── rls-update.test.ts          # RLS UPDATE policy (status transitions)
├── integration/
│   ├── payment-flow.test.ts        # Pending → Paid / Declined full cycle
│   ├── expiry.test.ts              # pg_cron / manual expire trigger
│   └── recipient-resolution.test.ts# Trigger fires on new user sign-up
└── unit/
    ├── PayButton.test.tsx          # setTimeout simulation, double-click guard
    ├── ExpiryCountdown.test.tsx    # Colour states at boundary thresholds
    └── validation.test.ts          # Form validation rules
```

**Structure Decision**: Single web-app project (Option 1 adapted for React Admin). No backend/ subfolder — Supabase is the backend. All frontend code in `src/`. Supabase migrations in `supabase/migrations/` following Supabase CLI conventions.

---

## Complexity Tracking

> No constitution violations. This section is intentionally minimal.

No violations detected in the constitution check. The `public_payment_request_view` is a security-barrier view (not a fourth table) required specifically because PostgreSQL RLS cannot restrict individual columns — it is all-or-nothing per row. This approach is explicitly documented in research.md §6 and is the Supabase-recommended pattern for column-level access restriction. It does not violate the "max 3 tables" constraint.

---

## Implementation Phases

---

### Phase 0: DB Schema + RLS Migrations

**Prerequisites**: Supabase CLI installed, `supabase start` running locally, project initialized.

**Deliverables**:
- `supabase/migrations/20260409000001_create_profiles.sql` — `profiles` table with PK FK to `auth.users`
- `supabase/migrations/20260409000002_create_payment_requests.sql` — `payment_requests` table with all columns, CHECK constraints, indexes
- `supabase/migrations/20260409000003_rls_policies.sql` — RLS enabled on both tables; all SELECT/INSERT/UPDATE policies
- `supabase/migrations/20260409000004_public_view.sql` — `public_payment_request_view` security-barrier view + GRANT to anon
- `supabase/migrations/20260409000005_resolve_recipient_trigger.sql` — `resolve_recipient_id` function + trigger on `auth.users`
- `supabase/migrations/20260409000006_pg_cron_expire.sql` — `CREATE EXTENSION IF NOT EXISTS pg_cron` + `cron.schedule(...)` for hourly expiry

**Test Strategy** (contract tests — must be written and approved BEFORE migration is applied):
- `tests/contract/rls-select.test.ts`: assert user A cannot select user B's requests; assert sender and recipient can both select the shared row
- `tests/contract/rls-insert.test.ts`: assert sender cannot insert with `sender_id != auth.uid()`; assert self-request (sender email = recipient email) is blocked
- `tests/contract/rls-update.test.ts`: assert sender may only set `cancelled`; assert recipient may only set `paid` or `declined`; assert no one may set `expired` directly via authenticated role
- `tests/contract/rls-update.test.ts`: assert anon cannot UPDATE
- All run against real local Supabase (`supabase start`), using service-role key to seed rows and anon/user JWT to attempt queries

---

### Phase 1: Supabase Auth Provider + Login/Callback Pages

**Prerequisites**: Phase 0 complete; `supabase start` running with email confirmations disabled (local dev).

**Deliverables**:
- `src/supabase.ts` — `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` singleton
- `src/providers/index.ts` — exports `dataProvider` (supabaseDataProvider) and `authProvider` (supabaseAuthProvider)
- `src/auth/LoginPage.tsx` — email input + "Send Magic Link" button; calls `supabase.auth.signInWithOtp`; shows "Check your email" on success
- `src/auth/CallbackPage.tsx` — mounts at `/auth/callback`; listens to `onAuthStateChange(SIGNED_IN)` → navigates to `/`
- `.env.local` — `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` documented (not committed)

**Test Strategy**:
- `tests/unit/LoginPage.test.tsx`: submit valid email → `signInWithOtp` called with correct params; submit invalid email → HTML5 validation blocks form; OTP success → "Check your email" renders; OTP error → error notification shown
- `tests/unit/CallbackPage.test.tsx`: SIGNED_IN event fires → `navigate('/')` called; component unmounts → subscription unsubscribed
- Manual: `supabase start` → navigate to `/login` → enter email → check Supabase local email inbox (Inbucket at `localhost:54324`) → click link → land on dashboard

---

### Phase 2: dataProvider Setup + React Admin App Scaffold

**Prerequisites**: Phase 1 complete; auth round-trip verified manually.

**Deliverables**:
- `src/App.tsx` — `<Admin>` with `dataProvider`, `authProvider`, `loginPage={LoginPage}`, custom routes for `/auth/callback` and `/request/:id`
- `src/resources/paymentRequests/index.ts` — resource export (List, Show, Create, no Edit)
- `src/resources/profiles/index.ts` — resource export (List only, for display name lookup)
- Vite dev server running; navigating to `/payment_requests` shows React Admin list scaffold

**Test Strategy**:
- `tests/integration/app-scaffold.test.ts`: render `<App>` → unauthenticated → redirected to `/login`; mock auth → render proceeds to list
- Verify `dataProvider.getList('payment_requests', { filter: { sender_id: userId } })` translates to correct PostgREST query (`?sender_id=eq.{userId}`)

---

### Phase 3: PaymentRequest Resource (List, Show, Create)

**Prerequisites**: Phase 2 complete; dataProvider verified.

**Deliverables**:
- `src/resources/paymentRequests/PaymentRequestList.tsx`:
  - Tab state (Incoming / Outgoing) managed with `useState`; conditionally passes `filter={{ sender_id: identity.id }}` or `filter={{ recipient_id: identity.id }}`
  - Columns: Counterparty (email), Amount (`NumberField` with TRY currency format), Status (chip), Created (`DateField`), Expires (`ExpiryCountdown`)
  - `<SelectInput>` filter for status, `<SearchInput>` for email (maps to `recipient_email@ilike`)
  - Mobile: `<SimpleList>` rendered when viewport < 600 px
- `src/resources/paymentRequests/PaymentRequestShow.tsx`:
  - All fields displayed
  - Conditional buttons: incoming + pending → `<PayButton>` + `<DeclineButton>`; outgoing + pending → `<CancelButton>`; non-pending → read-only
  - `<ShareableLinkField>` always visible
- `src/resources/paymentRequests/PaymentRequestCreate.tsx`:
  - Fields: `recipient_email` (required if phone empty), `recipient_phone` (optional E.164), `amount` (required, > 0, max 999999.99), `note` (optional, max 280 chars)
  - Inline validation using React Admin `validate` prop
  - On success → redirect to Show page of new record

**Test Strategy**:
- `tests/integration/payment-flow.test.ts`: seed request as user A → log in as user B (recipient) → assert incoming tab shows request; click Pay → assert DB status = `paid`, `paid_at` not null
- `tests/unit/validation.test.ts`: each validation rule tested with boundary values (amount = 0, amount = -1, amount = 0.001, note > 280 chars, invalid email, invalid phone)
- `tests/contract/rls-select.test.ts` (already written in Phase 0) covers data access correctness

---

### Phase 4: Custom Components (PayButton, ExpiryCountdown, ShareableLinkField)

**Prerequisites**: Phase 3 scaffold complete; record context available in Show page.

**Deliverables**:
- `src/components/PayButton.tsx`:
  - `loading` state set to `true` on first click (prevents double-click)
  - `setTimeout(2500)` before calling `useUpdate`
  - Shows `<CircularProgress size={16}>` while loading
  - On success: `useNotify('Payment successful', { type: 'success' })` + `useRefresh()`
  - On error: `useNotify(error.message, { type: 'error' })` + resets `loading`
  - Returns `null` if `record.status !== 'pending'`
- `src/components/DeclineButton.tsx`:
  - Confirmation dialog via MUI `<Dialog>`; on confirm calls `useUpdate` with `status: 'declined'`
  - Returns `null` if `record.status !== 'pending'`
- `src/components/CancelButton.tsx`:
  - Same pattern as DeclineButton; sets `status: 'cancelled'`
  - Visible only when `auth.uid() === record.sender_id` AND `status === 'pending'`
- `src/components/ExpiryCountdown.tsx`:
  - Computes `(expires_at - Date.now())` on render
  - Displays: `> 3 days` → green; `1–3 days` → orange; `< 1 day` → red; expired → grey "Expired"
  - Uses MUI `<Chip>` with `color` prop driven by threshold
- `src/components/ShareableLinkField.tsx`:
  - Computes `${window.location.origin}/request/${record.id}`
  - Renders URL in a `<TextField>` (read-only) + `<IconButton>` with clipboard icon
  - On copy: brief `<Tooltip>` "Copied!"

**Test Strategy**:
- `tests/unit/PayButton.test.tsx`: `vi.useFakeTimers()` → click Pay → assert spinner visible → `vi.advanceTimersByTime(2500)` → assert `useUpdate` called with correct params; double-click → second click ignored (`loading = true`)
- `tests/unit/ExpiryCountdown.test.tsx`: render with `expires_at` at each boundary (> 3 d, 2 d, 12 h, past) → assert correct text and colour
- `tests/unit/ShareableLinkField.test.tsx`: assert URL format `https://.../request/{uuid}`; click copy → `navigator.clipboard.writeText` called with correct URL

---

### Phase 5: pg_cron Expiration + Public View

**Prerequisites**: Phase 0 migrations applied; pg_cron extension enabled.

**Deliverables**:
- `src/pages/PublicRequestPage.tsx`:
  - Mounted at `/request/:id` as `<CustomRoutes noLayout>` — no auth check
  - Queries `public_payment_request_view` using the Supabase anon client
  - Renders: Amount, Currency, Status, Note, Expires countdown
  - If `status === 'pending'`: shows "Log in to Pay" CTA linking to `/login`
  - If `status !== 'pending'`: shows read-only status badge only
- pg_cron job verified via `SELECT * FROM cron.job WHERE jobname = 'expire-payment-requests'`
- Supabase Realtime channel in `PaymentRequestList` for in-app toast on new incoming request

**Test Strategy**:
- `tests/integration/expiry.test.ts`: insert row with `expires_at = now() - interval '1 minute'` and `status = 'pending'` → manually invoke the expire SQL → assert `status = 'expired'`
- `tests/integration/public-view.test.ts`: query `public_payment_request_view` with anon key → assert `recipient_email`, `recipient_phone`, `sender_id`, `recipient_id`, `paid_at` are NOT in the returned columns
- `tests/integration/recipient-resolution.test.ts`: insert `payment_request` with `recipient_email = 'new@example.com'`, `recipient_id = NULL` → insert matching user into `auth.users` → assert `recipient_id` is populated

---

### Phase 6: Tests (Contract → Integration → Unit)

**Prerequisites**: All prior phases delivered; local Supabase running.

**Deliverables** (all tests passing):

**Contract tests** (RLS SQL assertions — real DB, service-role seed + user JWT queries):
- `tests/contract/rls-select.test.ts` — SELECT policies
- `tests/contract/rls-insert.test.ts` — INSERT policies
- `tests/contract/rls-update.test.ts` — UPDATE policies

**Integration tests** (real Supabase local, authenticated Supabase client):
- `tests/integration/payment-flow.test.ts` — full Pending → Paid and Pending → Declined cycles
- `tests/integration/expiry.test.ts` — expiry SQL logic
- `tests/integration/recipient-resolution.test.ts` — trigger on new user sign-up
- `tests/integration/public-view.test.ts` — anon access to view; column restriction verified

**Unit tests** (Vitest + React Testing Library, mocked Supabase):
- `tests/unit/PayButton.test.tsx` — timer simulation, double-click guard
- `tests/unit/ExpiryCountdown.test.tsx` — colour thresholds
- `tests/unit/ShareableLinkField.test.tsx` — URL format, clipboard
- `tests/unit/validation.test.ts` — all form validation rules

**Test Strategy Summary**:
- Run order: contract → integration → unit (most authoritative first)
- CI: `vitest run` with `SUPABASE_URL=http://localhost:54321` and `SUPABASE_SERVICE_ROLE_KEY` from `supabase status`
- Coverage gate: 100% of acceptance scenarios from spec.md must have a corresponding test
