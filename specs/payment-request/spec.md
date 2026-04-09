# Feature Specification: P2P Payment Request

**Feature Branch**: `001-payment-request`
**Created**: 2026-04-09
**Status**: Draft
**Stack**: React Admin + Supabase
**Author**: uzaycevikkantekin

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Create a Payment Request (Priority: P1)

A logged-in user can request money from another user by entering their email or phone number, a positive amount, and an optional note. The system generates a unique request ID and a shareable link.

**Why this priority**: Core value of the feature — nothing else works without request creation.

**Independent Test**: User logs in → fills the "New Request" form → submits → sees the request appear in "Outgoing" dashboard with status Pending and a shareable link. Delivers standalone value.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they submit a valid email, amount > 0, and optional note, **Then** a `payment_request` row is created with status `pending`, a UUID `id`, `expires_at = now() + 7 days`, and a shareable URL is displayed.
2. **Given** a logged-in user, **When** they submit amount = 0 or negative, **Then** the form shows an inline error "Amount must be greater than 0" and no request is created.
3. **Given** a logged-in user, **When** they submit an invalid email format, **Then** the form shows "Enter a valid email address" and no request is created.
4. **Given** a logged-in user, **When** they submit an invalid phone format, **Then** the form shows "Enter a valid phone number (e.g. +90 555 000 0000)" and no request is created.
5. **Given** a logged-in user, **When** a request is created, **Then** the recipient receives a notification (email or in-app) with the shareable link. `[NEEDS CLARIFICATION: notification channel — email via Supabase SMTP or in-app only for v1?]`

---

### User Story 2 — View Request Dashboard (Priority: P1)

A logged-in user can see all their incoming and outgoing payment requests, filterable by status, with search by sender/recipient name or email.

**Why this priority**: Without visibility, users cannot act on requests — P1 alongside creation.

**Independent Test**: After creating at least one request (or seeding test data), user opens the dashboard, sees separate Incoming/Outgoing tabs, can filter by status, and can search by email. Delivers standalone value even without Pay/Decline actions.

**Acceptance Scenarios**:

1. **Given** a user with outgoing requests, **When** they open the dashboard, **Then** they see a list of outgoing requests showing: recipient, amount, status badge, creation date, expiry countdown.
2. **Given** a user with incoming requests, **When** they switch to the Incoming tab, **Then** they see requests directed to them with: sender, amount, status, creation date, expiry countdown.
3. **Given** requests of multiple statuses exist, **When** user filters by status "Pending", **Then** only Pending requests are shown.
4. **Given** requests from multiple senders exist, **When** user types a name/email in the search field, **Then** list is filtered to matching entries (case-insensitive, partial match).
5. **Given** a request is 6 days old, **When** the dashboard renders, **Then** the expiry countdown shows "1 day remaining" in orange.
6. **Given** a request has expired (> 7 days), **When** the dashboard renders, **Then** its status is shown as `Expired` and no action buttons are available.

---

### User Story 3 — Act on an Incoming Request: Pay or Decline (Priority: P1)

A logged-in user who has received a payment request can open its detail view and choose to Pay (simulated) or Decline.

**Why this priority**: The core transaction action — completing the payment loop.

**Independent Test**: Seed a pending incoming request → user clicks Pay → sees 2–3s loading state → status updates to Paid. Or clicks Decline → status updates to Declined. Both testable independently.

**Acceptance Scenarios**:

1. **Given** a pending incoming request, **When** user clicks "Pay", **Then** a loading spinner appears for 2–3 seconds, after which the request status updates to `paid` and a success message is shown.
2. **Given** a pending incoming request, **When** user clicks "Decline", **Then** a confirmation dialog appears; on confirm, status updates to `declined` immediately.
3. **Given** a paid/declined/expired request, **When** user views it, **Then** no Pay or Decline buttons are shown — only read-only detail.
4. **Given** an outgoing request, **When** user views the detail, **Then** they see only a "Cancel" button (not Pay/Decline).
5. **Given** user clicks Pay and simulated payment succeeds, **Then** the sender's outgoing dashboard updates the status to `paid` within the same session (real-time or on next load).

---

### User Story 4 — Cancel an Outgoing Request (Priority: P2)

A logged-in user can cancel a pending request they sent.

**Why this priority**: Important for UX completeness but does not block core flow.

**Independent Test**: Seed a pending outgoing request → user clicks Cancel → status updates to `cancelled`. Independently testable.

**Acceptance Scenarios**:

1. **Given** a pending outgoing request, **When** user clicks "Cancel", **Then** a confirmation dialog appears; on confirm, status updates to `cancelled`.
2. **Given** a paid or declined outgoing request, **When** user views it, **Then** no Cancel button is shown.

---

### User Story 5 — Authentication via Magic Link (Priority: P1)

A user can sign in with their email address via a magic link — no password required.

**Why this priority**: All other stories depend on authentication.

**Independent Test**: User enters email → receives magic link → clicks it → lands on dashboard as authenticated user. Fully testable in isolation.

**Acceptance Scenarios**:

1. **Given** a new visitor, **When** they enter a valid email and request a magic link, **Then** Supabase sends a login email and the UI shows "Check your email".
2. **Given** a user who clicks the magic link, **When** Supabase validates the token, **Then** the user is redirected to the dashboard in an authenticated state.
3. **Given** an expired or invalid magic link, **When** clicked, **Then** the user sees an error "This link has expired. Please request a new one."

---

### User Story 6 — Shareable Request Link (Priority: P2)

Anyone with a shareable link can view a payment request's detail (read-only), but only the authenticated recipient can act on it.

**Why this priority**: Nice-to-have for viral distribution, not blocking core flow.

**Independent Test**: Copy shareable link → open in incognito → see request details (amount, sender, note) → cannot Pay/Decline without login.

**Acceptance Scenarios**:

1. **Given** a shareable link `/request/{uuid}`, **When** opened by an unauthenticated user, **Then** request details are shown in read-only mode with a "Log in to Pay" CTA.
2. **Given** the same link opened by the authenticated recipient, **When** request is pending, **Then** Pay and Decline buttons are shown.
3. **Given** the same link opened by a logged-in user who is NOT the recipient, **Then** only read-only view is shown, no action buttons.

---

### Edge Cases

- What happens when the recipient email/phone does not match any registered user? → Request is still created; recipient is notified via email with a signup CTA. `[NEEDS CLARIFICATION: required for v1 or future?]`
- What if a user submits the Pay action twice (double-click)? → Button is disabled after first click; server-side checks status before transitioning (idempotency).
- What if the request expires mid-session (user has the detail view open)? → On next server round-trip or real-time subscription event, status updates to `expired` and action buttons disappear.
- What if the Supabase Edge Function for expiration is delayed? → UI relies on `expires_at` field client-side for display; status is authoritative only from DB.
- What if a user tries to pay their own request (sender = recipient)? → System must block this at both UI and RLS policy level.
- What happens to `cancelled` requests? → They are immutable; no further state transitions allowed.
- Currency? → `[NEEDS CLARIFICATION: single currency (TRY/USD) or multi-currency?]` Assume single currency (TRY) for v1.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow authenticated users to create a payment request with recipient (email OR phone), amount (decimal > 0), and optional note (max 280 chars).
- **FR-002**: System MUST generate a UUID for each request and a shareable URL in the format `/request/{uuid}`.
- **FR-003**: System MUST set `expires_at = created_at + 7 days` on every new request.
- **FR-004**: System MUST display a countdown timer for pending requests ("X days remaining", turning red when ≤ 1 day).
- **FR-005**: System MUST transition request status automatically to `expired` when `now() > expires_at` and status is still `pending`.
- **FR-006**: System MUST allow the recipient to Pay (simulated, 2–3s delay) or Decline a pending incoming request.
- **FR-007**: System MUST allow the sender to Cancel a pending outgoing request.
- **FR-008**: System MUST prevent any state transition on non-pending requests (idempotency).
- **FR-009**: System MUST enforce RLS so users can only read/act on requests they own (as sender or recipient).
- **FR-010**: System MUST provide a dashboard with Incoming and Outgoing tabs, filterable by status and searchable by name/email.
- **FR-011**: System MUST support magic link authentication via Supabase Auth.
- **FR-012**: System MUST be responsive and functional on 375px–1280px+ screen widths.
- **FR-013**: Payment simulation MUST show a loading state for 2–3 seconds before updating status to `paid`.
- **FR-014**: Shareable link MUST be viewable (read-only) without authentication.

### Key Entities

- **User** (Supabase Auth): identity, email, phone (optional). Managed by Supabase Auth.
- **Profile**: user_id (FK → auth.users), display_name, avatar_url. Extended user info.
- **PaymentRequest**: the core entity — see Data Models below.

---

## Data Models

### Table: `profiles`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users.id` |
| `display_name` | `text` | NOT NULL |
| `phone` | `text` | NULLABLE, unique |
| `avatar_url` | `text` | NULLABLE |
| `created_at` | `timestamptz` | DEFAULT now() |

### Table: `payment_requests`
| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() |
| `sender_id` | `uuid` | FK → `auth.users.id`, NOT NULL |
| `recipient_email` | `text` | NOT NULL |
| `recipient_phone` | `text` | NULLABLE |
| `recipient_id` | `uuid` | FK → `auth.users.id`, NULLABLE (resolved on recipient login) |
| `amount` | `numeric(12,2)` | NOT NULL, CHECK amount > 0 |
| `currency` | `text` | NOT NULL, DEFAULT 'TRY' |
| `note` | `text` | NULLABLE, max 280 chars |
| `status` | `text` | NOT NULL, DEFAULT 'pending', CHECK IN ('pending','paid','declined','cancelled','expired') |
| `created_at` | `timestamptz` | DEFAULT now() |
| `expires_at` | `timestamptz` | NOT NULL, DEFAULT now() + INTERVAL '7 days' |
| `paid_at` | `timestamptz` | NULLABLE |
| `updated_at` | `timestamptz` | DEFAULT now() |

**Indexes**: `sender_id`, `recipient_email`, `status`, `expires_at`

**RLS Policies**:
- SELECT: `auth.uid() = sender_id OR auth.uid() = recipient_id` (+ public read for shareable link via anon key, status/amount/note only)
- INSERT: `auth.uid() = sender_id` AND `sender_id != recipient_id`
- UPDATE (status): sender may set `cancelled`; recipient may set `paid` or `declined`; no one sets `expired` directly (done via Edge Function / cron)

---

## API / Edge Functions

> React Admin talks to Supabase directly via `ra-supabase`. Edge Functions handle side-effects only.

### Edge Function: `expire-requests`
- **Trigger**: Supabase cron (pg_cron) every hour OR on-demand
- **Logic**: `UPDATE payment_requests SET status='expired', updated_at=now() WHERE status='pending' AND expires_at < now()`
- **Returns**: count of expired rows

### Client-Side Actions (via `dataProvider.update`)
| Action | Method | Table | Condition | New Status |
|---|---|---|---|---|
| Pay | UPDATE | `payment_requests` | status=pending, recipient=me | `paid` + `paid_at=now()` |
| Decline | UPDATE | `payment_requests` | status=pending, recipient=me | `declined` |
| Cancel | UPDATE | `payment_requests` | status=pending, sender=me | `cancelled` |

---

## UI Components (React Admin)

### Resources
| Resource | Supabase Table | Notes |
|---|---|---|
| `paymentRequests` | `payment_requests` | Main resource |
| `profiles` | `profiles` | For display names |

### Pages & Components

#### `PaymentRequestList`
- Tabs: Incoming / Outgoing (filtered by `recipient_id = me` vs `sender_id = me`)
- Columns: Counterparty, Amount, Status (badge), Created, Expires (countdown chip)
- Filters: `<SelectInput>` for status, `<SearchInput>` for email/name
- Row click → `PaymentRequestShow`

#### `PaymentRequestShow`
- Fields: Amount (large), Counterparty, Note, Status badge, Created, Expires countdown
- Conditional action buttons:
  - Incoming + pending → `<PayButton>` + `<DeclineButton>`
  - Outgoing + pending → `<CancelButton>`
  - Any non-pending → read-only
- Shareable link display with copy-to-clipboard

#### `PaymentRequestCreate`
- Fields: `<TextInput>` recipient email, `<TextInput>` recipient phone (optional), `<NumberInput>` amount, `<TextInput>` note (multiline, 280 char limit)
- Inline validation (React Admin `validate` prop)
- On success → redirect to Show page with shareable link

#### `PayButton` (custom)
- Triggers `dataProvider.update` with status=`paid`
- Shows `<CircularProgress>` for 2–3s (simulated delay via `setTimeout`)
- On resolve → shows `<Alert severity="success">` + refreshes record

#### `ExpiryCountdown` (custom field)
- Computes `expires_at - now()` in client
- Displays "X days Y hrs" remaining
- Color: green > 3 days, orange 1–3 days, red < 1 day, grey = expired

#### `ShareableLinkField` (custom)
- Displays `https://app.domain/request/{id}`
- Copy-to-clipboard button

### Auth Pages
- `LoginPage`: email input + "Send Magic Link" button
- `CallbackPage`: handles Supabase auth redirect token

---

## Validation Rules

| Field | Rule | Error Message |
|---|---|---|
| `recipient_email` | Required if phone empty; valid RFC 5322 format | "Enter a valid email address" |
| `recipient_phone` | Required if email empty; E.164 format (`+\d{7,15}`) | "Enter a valid phone number (e.g. +90 555 000 0000)" |
| `amount` | Required; numeric; > 0; max 2 decimal places; max 999,999.99 | "Amount must be greater than 0" / "Maximum amount is 999,999.99" |
| `note` | Optional; max 280 characters | "Note must be 280 characters or less" |
| `sender != recipient` | sender_id must not equal recipient_id (DB + UI check) | "You cannot request money from yourself" |

---

## Workflow Diagram (Textual)

```
[User] → Login (Magic Link) → [Dashboard]
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
             [Outgoing Tab]                  [Incoming Tab]
                    │                               │
          [New Request Form]              [Request Detail View]
                    │                               │
           Create PaymentRequest            ┌───────┴───────┐
           (status: pending)                ▼               ▼
                    │                   [Pay]           [Decline]
           [Shareable Link]         2–3s simulate    Confirm dialog
                    │                   │               │
           Copy / Share           status: paid    status: declined
                    │
           [Cancel] (sender)
               │
         status: cancelled

[Cron / Edge Function] → every hour
   → SET status='expired' WHERE expires_at < now() AND status='pending'
```

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can create a payment request in under 30 seconds from the dashboard.
- **SC-002**: The Pay simulation completes and updates status within 2–3 seconds (measured client-side).
- **SC-003**: All requests with `expires_at < now()` are marked `expired` within 1 hour of expiry.
- **SC-004**: Shareable links are accessible read-only without authentication (0 auth errors on anon access).
- **SC-005**: RLS blocks unauthorized access — a user cannot read or act on requests they don't own (verified by tests).
- **SC-006**: Dashboard loads with up to 100 requests in under 2 seconds on a standard connection.
- **SC-007**: UI is fully functional on a 375px-wide mobile viewport (no horizontal scroll, no clipped buttons).

---

## Assumptions

- Single currency (TRY) for v1; multi-currency is out of scope.
- Notification system (email to recipient) is out of scope for v1 unless Supabase SMTP is trivially available.
- No real payment gateway integration; payment is fully simulated.
- Supabase project is pre-created; environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) are provided.
- React Admin v5+ with `ra-supabase` data provider is used — no custom REST layer.
- Users must be registered (have a Supabase Auth account) to act on requests; unregistered recipients see a signup CTA on the shareable link page.
- Phone number field is optional; at least one of email or phone must be provided.
- `pg_cron` extension is available in the Supabase project for the expiration Edge Function.
