# Data Provider Filters Reference

**Feature**: 001-payment-request  
**Date**: 2026-04-09  
**Data Provider**: ra-supabase v3.5.1 (wraps ra-data-postgrest)

---

## How ra-supabase Translates Filters

`ra-supabase` translates React Admin `filter` objects to PostgREST query parameters. The key in the filter object becomes the column name; optional suffixes (separated by `@`) specify the PostgREST operator. Examples:

| Filter key | PostgREST operator | URL parameter |
|---|---|---|
| `sender_id` | `eq` (default) | `?sender_id=eq.{value}` |
| `status` | `eq` (default) | `?status=eq.{value}` |
| `recipient_email@ilike` | `ilike` | `?recipient_email=ilike.{value}` |
| `expires_at@lt` | `lt` | `?expires_at=lt.{value}` |

All filters are passed as the `filter` prop on `<List>` or via `filterDefaultValues`. The `<SearchInput>` with `source` set to the filter key writes into the filter object automatically.

---

## Filter Objects

---

### 1. Incoming Requests List

Shows requests where the current user is the recipient (the user owes money to the sender).

```tsx
// Used in PaymentRequestList.tsx — Incoming tab
// identity.id comes from useGetIdentity()

const incomingFilter = {
  recipient_id: identity.id,      // eq — PostgREST: ?recipient_id=eq.{uuid}
};
```

**React Admin usage**:
```tsx
<List
  resource="payment_requests"
  filter={{ recipient_id: identity.id }}
  sort={{ field: 'created_at', order: 'DESC' }}
>
```

**PostgREST query produced**:
```
GET /rest/v1/payment_requests?recipient_id=eq.{uuid}&order=created_at.desc
```

---

### 2. Outgoing Requests List

Shows requests where the current user is the sender (the user is owed money by the recipient).

```tsx
// Used in PaymentRequestList.tsx — Outgoing tab

const outgoingFilter = {
  sender_id: identity.id,         // eq — PostgREST: ?sender_id=eq.{uuid}
};
```

**React Admin usage**:
```tsx
<List
  resource="payment_requests"
  filter={{ sender_id: identity.id }}
  sort={{ field: 'created_at', order: 'DESC' }}
>
```

**PostgREST query produced**:
```
GET /rest/v1/payment_requests?sender_id=eq.{uuid}&order=created_at.desc
```

---

### 3. Status Filter

Filters requests by a specific status value. Composed with the tab filter (incoming or outgoing) using React Admin's filter merging — both the tab filter and the status filter are active simultaneously.

```tsx
// Used in the <SelectInput> filter bar in PaymentRequestList.tsx

// Example: filter outgoing requests to "pending" only
const statusFilter = {
  sender_id: identity.id,
  status: 'pending',              // eq — PostgREST: ?status=eq.pending
};

// Example: filter incoming requests to "paid" only
const statusFilter = {
  recipient_id: identity.id,
  status: 'paid',
};
```

**React Admin usage**:
```tsx
<List
  resource="payment_requests"
  filter={{ sender_id: identity.id }}
  filters={[
    <SelectInput
      source="status"
      choices={[
        { id: 'pending',   name: 'Pending'   },
        { id: 'paid',      name: 'Paid'      },
        { id: 'declined',  name: 'Declined'  },
        { id: 'cancelled', name: 'Cancelled' },
        { id: 'expired',   name: 'Expired'   },
      ]}
      alwaysOn
    />,
  ]}
>
```

**PostgREST query produced (outgoing + pending)**:
```
GET /rest/v1/payment_requests?sender_id=eq.{uuid}&status=eq.pending&order=created_at.desc
```

**Valid status values**: `pending` | `paid` | `declined` | `cancelled` | `expired`

---

### 4. Search Filter (Email / Name)

Performs a case-insensitive partial match on `recipient_email` (for the outgoing tab) or on the sender's email (for the incoming tab). Uses the PostgREST `ilike` operator with `%` wildcards.

```tsx
// For the Outgoing tab: search by recipient email
const outgoingSearchFilter = {
  sender_id: identity.id,
  'recipient_email@ilike': `%${searchTerm}%`,
  // PostgREST: ?recipient_email=ilike.%alice%
};

// For the Incoming tab: search by sender email is not directly possible via
// PostgREST on payment_requests (sender_id is a UUID, not an email).
// Solution: join via profiles using the PostgREST embedded resource syntax,
// OR display sender email by eager-loading sender profile in the list and
// filtering client-side for v1.
//
// v1 pragmatic approach — search by recipient_email on incoming tab
// (which is the current user's email, so it is always the same value).
// Instead, expose a computed column or use a DB function.
//
// Recommended v1 approach for incoming search:
// Store sender_email as a denormalized column populated at INSERT time
// via a trigger or DEFAULT expression. If sender_email is not available,
// disable the search input on the Incoming tab and document as a v2 item.
//
// If sender_email column is added:
const incomingSearchFilter = {
  recipient_id: identity.id,
  'sender_email@ilike': `%${searchTerm}%`,
  // PostgREST: ?sender_email=ilike.%bob%
};
```

**React Admin usage (Outgoing tab)**:
```tsx
<List
  resource="payment_requests"
  filter={{ sender_id: identity.id }}
  filters={[
    <SearchInput
      source="recipient_email@ilike"
      alwaysOn
      placeholder="Search by recipient email"
    />,
    <SelectInput source="status" choices={statusChoices} />,
  ]}
>
```

**PostgREST query produced (outgoing + email search)**:
```
GET /rest/v1/payment_requests?sender_id=eq.{uuid}&recipient_email=ilike.%alice%&order=created_at.desc
```

---

## Combined Filter Examples

### Outgoing + Pending + Email Search

```ts
const filter = {
  sender_id: 'a1b2c3d4-...',
  status: 'pending',
  'recipient_email@ilike': '%alice@example%',
};
```

PostgREST URL:
```
?sender_id=eq.a1b2c3d4-...&status=eq.pending&recipient_email=ilike.%25alice%40example%25&order=created_at.desc
```

### Incoming + All Statuses (no status filter applied)

```ts
const filter = {
  recipient_id: 'a1b2c3d4-...',
};
```

PostgREST URL:
```
?recipient_id=eq.a1b2c3d4-...&order=created_at.desc
```

---

## Notes

- `ra-supabase` applies RLS on the server side. Even if a client sends `sender_id=eq.{someone-elses-uuid}`, the RLS SELECT policy `auth.uid() = sender_id OR auth.uid() = recipient_id` will return an empty result set — no data leak.
- The `@ilike` suffix is a `ra-supabase` / PostgREST convention. Always wrap the value in `%` wildcards for partial matching: `%searchTerm%`.
- For the public shareable link page (`/request/:id`), no filter object is used — the page queries `public_payment_request_view` directly by `id` using the Supabase client (not the React Admin dataProvider).
