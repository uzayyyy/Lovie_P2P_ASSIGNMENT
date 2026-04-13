# Payment Request App Constitution

## Core Principles

### I. Security-First (Fintech Mandate)
All features involving money movement, user identity, or financial state MUST prioritize security.
- No financial action (Pay, Decline, Cancel) may be performed without an authenticated session.
- All Supabase tables MUST have Row Level Security (RLS) enabled.
- No sensitive data (amounts, emails, phone numbers) may be exposed in shareable URLs — only opaque request IDs.
- Auth is via Supabase Magic Link; no passwords stored.

### II. API-First via Supabase
The database layer IS the API layer. Business logic lives in:
- Supabase RLS policies for access control
- Supabase Edge Functions for side-effects (expiration, simulation)
- React Admin `dataProvider` as the sole client interface to Supabase

No custom REST API server shall be introduced unless Supabase cannot fulfill the requirement.

### III. Test-First (NON-NEGOTIABLE)
TDD is mandatory:
1. Write tests describing the expected behavior
2. Get user approval on test cases
3. Confirm tests FAIL (Red)
4. Implement to make tests pass (Green)
5. Refactor

No implementation code may be written before step 3 is confirmed.

### IV. Integration Testing Priority
Prefer real Supabase (local via `supabase start`) over mocks.
- RLS policy tests MUST use real DB rows
- Payment simulation MUST be tested end-to-end (status transition: Pending → Paid)
- Expiration logic MUST be tested with time-manipulated fixtures

### V. Simplicity (YAGNI)
- Maximum 3 Supabase tables for v1: `users`, `payment_requests`, `profiles`
- No additional microservices, no message queues, no caching layer for v1
- React Admin resources map 1:1 to Supabase tables — no intermediate adapters
- Every added dependency requires documented justification

### VI. Responsive Design Contract
All UI components MUST be functional on:
- Mobile: 375px minimum width
- Desktop: 1280px standard
- React Admin's built-in responsive utilities are preferred over custom CSS breakpoints

## Technology Constraints

- **Frontend**: React Admin v5+ with `ra-supabase` data provider
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Auth**: Supabase Magic Link (email-based)
- **Styling**: React Admin default theme + MUI; no external CSS frameworks
- **No**: Redux, custom REST servers, external payment gateways (simulated only)

## Quality Gates

- All PRs must include passing tests before merge
- RLS policies must be reviewed alongside any schema change
- Shareable links must be tested for unauthorized access (non-owner cannot act on request)
- Payment simulation timing (2–3s) must be covered by a test with a mocked timer

## Governance

This constitution supersedes all other practices in this project.
Amendments require: documented rationale + backward-compatibility assessment.

**Version**: 1.0.0 | **Ratified**: 2026-04-09 | **Last Amended**: 2026-04-09
