# Tasks: P2P Payment Request

**Feature Branch**: `001-payment-request`
**Generated**: 2026-04-09
**Spec**: `specs/001-payment-request/spec.md`
**Plan**: `specs/001-payment-request/plan.md`
**Target**: React Admin v5 + Supabase (ra-supabase v3.5.1)

---

## Phase 1: Project Setup

- [x] T001 Run `npm create vite@latest . -- --template react-ts` in the project root to scaffold a Vite + React 18 + TypeScript project
- [x] T002 Install production dependencies: `npm install react-admin ra-supabase @supabase/supabase-js @mui/material @mui/icons-material @emotion/react @emotion/styled react-router-dom`
- [x] T003 Install dev dependencies: `npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event typescript @types/react @types/react-dom`
- [x] T004 Create `.env.local` at the project root with placeholder values: `VITE_SUPABASE_URL=https://your-project.supabase.co` and `VITE_SUPABASE_ANON_KEY=your-anon-key`; add `.env.local` to `.gitignore`
- [x] T005 Configure `tsconfig.json` at the project root: set `"strict": true`, `"target": "ES2020"`, `"lib": ["ES2020","DOM","DOM.Iterable"]`, `"moduleResolution": "bundler"`, `"jsx": "react-jsx"`, and `"baseUrl": "."` with `"paths": { "src/*": ["src/*"] }`
- [x] T006 Configure `vite.config.ts` at the project root: add `resolve.alias` mapping `src` to `./src`, set `server.port` to `5173`, and enable `envPrefix: ['VITE_']`
- [x] T007 Configure `vitest.config.ts` at the project root: set `environment: 'jsdom'`, `globals: true`, `setupFiles: ['./src/test-setup.ts']`, and `include: ['tests/**/*.test.{ts,tsx}']`
- [x] T008 Create `src/test-setup.ts`: import `@testing-library/jest-dom` for custom matchers
- [x] T009 Create the full folder structure: `src/auth/`, `src/resources/paymentRequests/`, `src/components/`, `src/providers/`, `src/pages/`, `src/types/`, `supabase/migrations/`, `supabase/functions/expire-requests/`, `tests/contract/`, `tests/integration/`, `tests/unit/`
- [x] T010 Add `supabase/.gitignore` at `supabase/.gitignore` with entries: `.env`, `*.key`, `config.toml` local overrides, and `supabase/.branches/` to prevent committing local Supabase credentials

---

## Phase 2: Foundational — Database & Types (blocks all other phases)

- [x] T011 Create `supabase/migrations/001_profiles.sql`: `CREATE TABLE IF NOT EXISTS public.profiles` with columns `id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`, `display_name text NOT NULL`, `phone text UNIQUE`, `avatar_url text`, `created_at timestamptz NOT NULL DEFAULT now()`; add `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY`; add the `handle_new_user_profile` SECURITY DEFINER trigger function that inserts a profile row on `auth.users` INSERT using `COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)` as `display_name`; attach trigger `on_auth_user_created_profile AFTER INSERT ON auth.users FOR EACH ROW`
- [x] T012 Create `supabase/migrations/002_payment_requests.sql`: `CREATE TABLE IF NOT EXISTS public.payment_requests` with all columns from the schema contract (`id`, `sender_id`, `recipient_email`, `recipient_phone`, `recipient_id`, `amount numeric(12,2)`, `currency text NOT NULL DEFAULT 'TRY'`, `note text`, `status text NOT NULL DEFAULT 'pending'`, `created_at`, `expires_at DEFAULT now() + INTERVAL '7 days'`, `paid_at`, `updated_at`); add CHECK constraints `payment_requests_amount_positive (amount > 0)`, `payment_requests_currency_v1 (currency = 'TRY')`, `payment_requests_note_length (char_length(note) <= 280)`, `payment_requests_status_valid (status IN ('pending','paid','declined','cancelled','expired'))`; add all five indexes (`idx_payment_requests_sender_id`, `idx_payment_requests_recipient_email`, `idx_payment_requests_recipient_id`, `idx_payment_requests_status`, `idx_payment_requests_expires_at`); add `ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY`
- [x] T013 Create `supabase/migrations/003_rls.sql`: add all six RLS policies — `profiles_select_own` (SELECT TO authenticated USING `auth.uid() = id`), `profiles_insert_own` (INSERT TO authenticated WITH CHECK `auth.uid() = id`), `profiles_update_own` (UPDATE TO authenticated USING+WITH CHECK `auth.uid() = id`), `payment_requests_select_own` (SELECT TO authenticated USING `auth.uid() = sender_id OR auth.uid() = recipient_id`), `payment_requests_insert_own` (INSERT TO authenticated WITH CHECK `auth.uid() = sender_id` AND self-request guard comparing `recipient_email` against `auth.users.email` when `recipient_id IS NULL`), `payment_requests_update_own` (UPDATE TO authenticated USING sender-or-recipient, WITH CHECK `(sender = cancelled) OR (recipient IN (paid, declined))`)
- [x] T014 Create `supabase/migrations/004_public_view.sql`: `CREATE VIEW public.public_payment_request_view WITH (security_barrier = true, security_invoker = true) AS SELECT id, amount, currency, note, status, created_at, expires_at FROM public.payment_requests`; add `GRANT SELECT ON public.public_payment_request_view TO anon`; add `REVOKE ALL ON public.payment_requests FROM anon`
- [x] T015 Create `supabase/migrations/005_triggers.sql`: implement `public.resolve_recipient_id()` RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER with `SET search_path = public` that UPDATEs `payment_requests` setting `recipient_id = NEW.id, updated_at = now()` WHERE `recipient_email = NEW.email AND recipient_id IS NULL AND status = 'pending'`; attach trigger `on_new_user_resolve_recipient AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.resolve_recipient_id()`
- [x] T016 Create `supabase/migrations/006_pg_cron.sql`: `CREATE EXTENSION IF NOT EXISTS pg_cron`; then `SELECT cron.schedule('expire-payment-requests', '0 * * * *', $$ UPDATE public.payment_requests SET status = 'expired', updated_at = now() WHERE status = 'pending' AND expires_at < now(); $$)`; add a verification comment with the SELECT query to confirm the job registered: `SELECT jobid, jobname, schedule FROM cron.job WHERE jobname = 'expire-payment-requests'`
- [x] T017 [P] Create `src/providers/supabaseClient.ts`: `import { createClient } from '@supabase/supabase-js'`; export `supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)`; export `supabaseUrl = import.meta.env.VITE_SUPABASE_URL` and `supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY` for use in the dataProvider factory
- [x] T018 [P] Create `src/types/index.ts`: export `PaymentRequestStatusValues` const array and `PaymentRequestStatus` type; export `Profile` interface; export `PaymentRequest` interface; export `PublicPaymentRequest` interface; export `PaymentRequestCreateInput` interface; export `OutgoingRequestFilter` and `IncomingRequestFilter` interfaces; export `RESOURCE_PAYMENT_REQUESTS`, `RESOURCE_PROFILES`, `RESOURCE_PUBLIC_VIEW` constants and `ResourceName` type — all copied verbatim from `specs/001-payment-request/contracts/react-admin-resources.ts`

---

## Phase 3: US5 — Authentication via Magic Link (P1, blocks US1–US4)

- [x] T019 [US5] Create `src/auth/supabaseAuthProvider.ts`: import `supabaseAuthProvider` from `ra-supabase` and `supabase` from `src/providers/supabaseClient`; create and export `authProvider` using `supabaseAuthProvider(supabase, { getIdentity: async (user) => { const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single(); return { id: user.id, fullName: profile?.display_name ?? user.email ?? '', avatar: profile?.avatar_url ?? undefined }; } })`; the provider must satisfy the `SupabaseAuthProvider` interface from `specs/001-payment-request/contracts/auth-provider.ts`
- [x] T020 [US5] Create `src/pages/LoginPage.tsx`: render a centered MUI `<Box component="form">` with a `<TextField label="Email" type="email" required>`, a `<Button type="submit" variant="contained">Send Magic Link</Button>`, and a `<Typography>Check your email for the magic link.</Typography>` shown when `sent === true`; on submit call `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: \`\${window.location.origin}/auth/callback\` } })`; on error call `useNotify(error.message, { type: 'error' })`; on success set `setSent(true)`
- [x] T021 [US5] Create `src/pages/AuthCallbackPage.tsx`: use `useEffect` to subscribe to `supabase.auth.onAuthStateChange`; when `event === 'SIGNED_IN'` call `navigate('/')`; return the subscription cleanup (`listener.subscription.unsubscribe()`) from `useEffect`; render a `<div>Signing you in…</div>` placeholder while processing
- [x] T022 [US5] Create `src/providers/dataProvider.ts`: import `supabaseDataProvider` from `ra-supabase` and `supabase`, `supabaseUrl`, `supabaseAnonKey` from `src/providers/supabaseClient`; create and export `dataProvider = supabaseDataProvider({ instanceUrl: supabaseUrl, apiKey: supabaseAnonKey, supabaseClient: supabase })`
- [x] T023 [US5] Create `src/App.tsx`: import `Admin`, `Resource`, `CustomRoutes` from `react-admin`; import `dataProvider` from `src/providers/dataProvider`; import `authProvider` from `src/auth/supabaseAuthProvider`; import `LoginPage` from `src/pages/LoginPage`; import `AuthCallbackPage` from `src/pages/AuthCallbackPage`; render `<Admin dataProvider={dataProvider} authProvider={authProvider} loginPage={LoginPage}>` with a `<CustomRoutes noLayout>` child containing `<Route path="/auth/callback" element={<AuthCallbackPage />} />`; render `src/main.tsx` that mounts `<App />` into `document.getElementById('root')`

---

## Phase 4: US1 — Create Payment Request (P1)

- [x] T024 [US1] Create `src/resources/paymentRequests/PaymentRequestCreate.tsx`: render a React Admin `<Create redirect="show">` wrapping a `<SimpleForm>`; add `<TextInput source="recipient_email" label="Recipient Email" validate={[validateRecipientEmail]} fullWidth />`; add `<TextInput source="recipient_phone" label="Recipient Phone (optional)" validate={[validatePhone]} fullWidth />`; add `<NumberInput source="amount" label="Amount (TRY)" validate={[required(), minValue(0.01, 'Amount must be greater than 0'), maxValue(999999.99, 'Maximum amount is 999,999.99')]} fullWidth />`; add `<TextInput source="note" label="Note (optional)" multiline rows={3} validate={[maxLength(280, 'Note must be 280 characters or less')]} fullWidth />`; do NOT render a currency field (fixed to TRY)
- [x] T025 [US1] Add validation helpers in `src/resources/paymentRequests/PaymentRequestCreate.tsx`: implement `validateRecipientEmail` that returns `"Enter a valid email address"` for non-RFC-5322 emails (use `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` regex); implement `validatePhone` that returns `"Enter a valid phone number (e.g. +90 555 000 0000)"` for non-E.164 strings (use `/^\+\d{7,15}$/` regex); implement cross-field validation that returns `"You cannot request money from yourself"` if `recipient_email` matches the authenticated user's email (obtain via `useGetIdentity()`)
- [x] T026 [US1] Create `src/resources/paymentRequests/index.ts`: export a default React Admin `<Resource name="payment_requests" list={PaymentRequestList} show={PaymentRequestShow} create={PaymentRequestCreate} recordRepresentation={(r) => \`Request \${r.id.slice(0,8)}\`} />`; import the three component files using relative paths
- [x] T027 [US1] Update `src/App.tsx`: import the `paymentRequests` resource from `src/resources/paymentRequests/index.ts` and add it as a child of `<Admin>`

---

## Phase 5: US2 — Request Dashboard (P1)

- [x] T028 [US2] Create `src/components/StatusBadge.tsx`: accept a `status: PaymentRequestStatus` prop; render a MUI `<Chip>` with `label={status}` and `color` mapped as: `pending` → `warning`, `paid` → `success`, `declined` → `error`, `cancelled` → `default`, `expired` → `default`; export as `StatusBadge`; also export a `StatusField` wrapper that uses `useRecordContext` to read `record.status` and renders `<StatusBadge status={record.status} />`
- [x] T029 [US2] Create `src/components/ExpiryCountdown.tsx`: accept an `expiresAt: string` ISO timestamp prop; compute `diffMs = new Date(expiresAt).getTime() - Date.now()`; if `diffMs <= 0` render a grey MUI `<Chip label="Expired" color="default" size="small" />`; if `diffMs < 86_400_000` (< 1 day) render a red chip with text `"< 1 day remaining"`; if `diffMs < 3 * 86_400_000` (1–3 days) render an orange chip with text `"X days remaining"` where X is `Math.ceil(diffMs / 86_400_000)`; otherwise render a green chip; also export an `ExpiryCountdownField` wrapper using `useRecordContext` reading `record.expires_at`
- [x] T030 [US2] Create `src/resources/paymentRequests/PaymentRequestList.tsx`: use `useGetIdentity()` to obtain `identity.id`; maintain `tab` state (`'outgoing' | 'incoming'`) initialized to `'outgoing'`; render two MUI `<Tab>` buttons inside a `<Tabs>` bar; when `tab === 'outgoing'` render `<List resource="payment_requests" filter={{ sender_id: identity.id }} sort={{ field: 'created_at', order: 'DESC' }} filters={outgoingFilters}>` and when `tab === 'incoming'` render the same with `filter={{ recipient_id: identity.id }}` and `incomingFilters`
- [x] T031 [US2] Complete `src/resources/paymentRequests/PaymentRequestList.tsx`: define `outgoingFilters` array containing `<SearchInput source="recipient_email@ilike" alwaysOn placeholder="Search by recipient email" />` and `<SelectInput source="status" choices={statusChoices} />`; define `incomingFilters` with `<SearchInput source="recipient_email@ilike" alwaysOn placeholder="Search by email" />` and `<SelectInput source="status" choices={statusChoices} />`; define `statusChoices` from `PaymentRequestStatusValues`; inside each `<List>` render a `<Datagrid rowClick="show">` with columns: `<TextField source="recipient_email" label="Recipient" />`, `<NumberField source="amount" options={{ style: 'currency', currency: 'TRY' }} />`, `<StatusField />`, `<DateField source="created_at" />`, `<ExpiryCountdownField />`; for mobile (viewport < 600px) use `<SimpleList primaryText={r => r.recipient_email} secondaryText={r => \`₺\${r.amount}\`} tertiaryText={r => r.status} linkType="show" />` via `useMediaQuery(theme => theme.breakpoints.down('sm'))`
- [x] T032 [US2] Update `src/resources/paymentRequests/index.ts`: import `PaymentRequestList` from `./PaymentRequestList` and ensure it is used in the resource's `list` prop

---

## Phase 6: US3 + US4 — Pay / Decline / Cancel (P1 + P2)

- [x] T033 [US3] Create `src/components/PayButton.tsx`: declare `const SIMULATION_DELAY_MS = 2500`; use `useRecordContext<PaymentRequest>()`, `useUpdate`, `useNotify`, `useRefresh`; maintain `const [loading, setLoading] = useState(false)`; return `null` if `!record || record.status !== 'pending'`; on click: guard with `if (loading) return`, call `setLoading(true)`, then inside `setTimeout(() => { update('payment_requests', { id: record.id, data: { status: 'paid', paid_at: new Date().toISOString() }, previousData: record }, { onSuccess: () => { notify('Payment successful', { type: 'success' }); refresh(); }, onError: (err) => { notify(\`Payment failed: \${err.message}\`, { type: 'error' }); setLoading(false); } }); }, SIMULATION_DELAY_MS)`; render `<Button label="Pay" onClick={handlePay} disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : undefined} />`
- [x] T034 [US3] Create `src/components/DeclineButton.tsx`: use `useRecordContext<PaymentRequest>()`, `useUpdate`, `useNotify`, `useRefresh`; maintain `const [open, setOpen] = useState(false)` for the confirm dialog; return `null` if `!record || record.status !== 'pending'`; render a MUI `<Button onClick={() => setOpen(true)}>Decline</Button>` and a MUI `<Dialog open={open}>` with title "Decline this request?", body "This action cannot be undone.", and Cancel/Confirm buttons; on Confirm call `update('payment_requests', { id: record.id, data: { status: 'declined' }, previousData: record }, { onSuccess: () => { setOpen(false); notify('Request declined', { type: 'info' }); refresh(); } })`
- [x] T035 [US4] Create `src/components/CancelButton.tsx`: use `useRecordContext<PaymentRequest>()`, `useGetIdentity`, `useUpdate`, `useNotify`, `useRefresh`; maintain `const [open, setOpen] = useState(false)`; return `null` if `!record || record.status !== 'pending' || identity?.id !== record.sender_id`; render a MUI `<Button onClick={() => setOpen(true)}>Cancel</Button>` and a `<Dialog>` with title "Cancel this request?" and Cancel/Confirm buttons; on Confirm call `update('payment_requests', { id: record.id, data: { status: 'cancelled' }, previousData: record }, { onSuccess: () => { setOpen(false); notify('Request cancelled', { type: 'info' }); refresh(); } })`
- [x] T036 [US3] Create `src/components/ShareableLinkField.tsx`: use `useRecordContext<PaymentRequest>()`; compute `url = \`\${window.location.origin}/request/\${record.id}\``; maintain `const [copied, setCopied] = useState(false)`; on copy icon click call `navigator.clipboard.writeText(url)` then `setCopied(true)` then `setTimeout(() => setCopied(false), 2000)`; render the URL in a read-only MUI `<TextField value={url} InputProps={{ readOnly: true, endAdornment: <Tooltip title={copied ? 'Copied!' : 'Copy link'}><IconButton onClick={handleCopy}><ContentCopyIcon /></IconButton></Tooltip> }} fullWidth />`
- [x] T037 [US3] Create `src/resources/paymentRequests/PaymentRequestShow.tsx`: use `useRecordContext<PaymentRequest>()` and `useGetIdentity()`; compute `isIncoming = identity?.id !== undefined && record.recipient_id === identity.id`; compute `isOutgoing = identity?.id !== undefined && record.sender_id === identity.id`; compute `isPending = record.status === 'pending'`; render a React Admin `<Show>` wrapping a `<SimpleShowLayout>` with fields: `<NumberField source="amount" options={{ style: 'currency', currency: 'TRY' }} />`, `<TextField source="recipient_email" />`, `<TextField source="note" />`, `<StatusField />`, `<DateField source="created_at" />`, `<ExpiryCountdownField />`, `<ShareableLinkField />`; conditionally render `{isIncoming && isPending && <><PayButton /><DeclineButton /></>}` and `{isOutgoing && isPending && <CancelButton />}`
- [x] T038 [US3] Update `src/resources/paymentRequests/index.ts`: import `PaymentRequestShow` from `./PaymentRequestShow` and add it to the `show` prop of the resource

---

## Phase 7: US6 — Shareable Link (P2)

- [x] T039 [US6] Create `src/pages/PublicRequestPage.tsx`: import `useParams` from `react-router-dom` and `supabase` from `src/providers/supabaseClient`; declare state `const [request, setRequest] = useState<PublicPaymentRequest | null>(null)` and `const [loading, setLoading] = useState(true)` and `const [error, setError] = useState<string | null>(null)`; in `useEffect` query `supabase.from('public_payment_request_view').select('*').eq('id', id).single()` then set state; render a loading skeleton while `loading`; render an error message if `error`; render a read-only card showing `amount` (formatted as TRY), `currency`, `status` via `<StatusBadge>`, `note`, `<ExpiryCountdown expiresAt={request.expires_at} />`; if `request.status === 'pending'` render a MUI `<Button href="/login" variant="contained">Log in to Pay</Button>`; if status is non-pending show only read-only status badge with no CTA
- [x] T040 [US6] Update `src/App.tsx`: add a second `<CustomRoutes noLayout>` child (or extend the existing one) with `<Route path="/request/:id" element={<PublicRequestPage />} />`; this route must not require authentication — it must render without triggering `authProvider.checkAuth`
- [x] T041 [US6] Add real-time Supabase channel in `src/resources/paymentRequests/PaymentRequestList.tsx`: inside a `useEffect` that runs when `identity?.id` changes, subscribe to `supabase.channel('incoming-requests').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payment_requests', filter: \`recipient_id=eq.\${identity.id}\` }, (payload) => { notify(\`New payment request for ₺\${payload.new.amount}\`, { type: 'info' }); }).subscribe()`; return cleanup calling `supabase.removeChannel(channel)` from the effect

---

## Phase 8: Supabase Edge Function — Expiration Fallback (infrastructure)

- [x] T042 Create `supabase/functions/expire-requests/index.ts`: implement a Deno Edge Function using `Deno.serve(async () => { ... })`; inside the handler import `createClient` from `https://esm.sh/@supabase/supabase-js@2`; create a service-role client using `Deno.env.get('SUPABASE_URL')` and `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`; run `supabase.from('payment_requests').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('status', 'pending').lt('expires_at', new Date().toISOString()).select('id', { count: 'exact', head: true })`; return a JSON response `{ expired: count, error }` with `Content-Type: application/json`
- [x] T043 Add a comment block at the top of `supabase/migrations/006_pg_cron.sql` documenting how to manually trigger the expiration SQL for integration tests: `-- Integration test: run this SQL directly to simulate pg_cron without waiting for the schedule: UPDATE public.payment_requests SET status = 'expired', updated_at = now() WHERE status = 'pending' AND expires_at < now();`; add verification queries for `cron.job` and `cron.job_run_details`

---

## Phase 9: Tests

- [x] T044 [P] Create `tests/contract/rls-select.test.ts`: import `createClient` from `@supabase/supabase-js`; create `serviceClient` using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `process.env`; write test "user A cannot select user B's requests": seed a payment_request owned by user A (service role), query as user B JWT, assert result is empty; write test "sender can select their own request": seed as user A, query as user A JWT, assert row returned; write test "recipient can select shared request": seed with `recipient_id = userB.id`, query as user B JWT, assert row returned; write test "anon cannot select from payment_requests base table": query with anon key, assert empty or 401
- [x] T045 [P] Create `tests/contract/rls-insert.test.ts`: write test "authenticated user can insert with sender_id = auth.uid()": attempt insert via user A JWT, assert success; write test "insert rejected when sender_id != auth.uid()": attempt insert with mismatched sender_id, assert RLS error; write test "self-request blocked when recipient_email matches sender email": attempt insert where recipient_email equals user A's email, assert RLS check fails; write test "anon cannot insert": attempt insert via anon key, assert error
- [x] T046 [P] Create `tests/contract/rls-update.test.ts`: write test "sender can set status to cancelled": seed pending row owned by user A, update via user A JWT with `{ status: 'cancelled' }`, assert success; write test "sender cannot set status to paid": attempt update by sender to `paid`, assert RLS WITH CHECK fails; write test "recipient can set status to paid": update by user B (recipient) to `paid`, assert success; write test "recipient can set status to declined": update by user B to `declined`, assert success; write test "recipient cannot set status to cancelled": update by user B to `cancelled`, assert failure; write test "no one (authenticated) can set status to expired directly": attempt by both parties, assert failure; write test "anon cannot update": assert error
- [x] T047 [P] Create `tests/integration/payment-flow.test.ts`: seed a pending payment_request with `sender_id = userA.id, recipient_id = userB.id` via service role; sign in as user B; call `dataProvider.update('payment_requests', { id, data: { status: 'paid', paid_at: now } })`; assert DB row now has `status = 'paid'` and `paid_at IS NOT NULL`; repeat test for `declined` transition; assert that after either terminal transition, a second update attempt returns an RLS error
- [x] T048 [P] Create `tests/integration/expiry.test.ts`: seed a row with `expires_at = now() - interval '1 minute'` and `status = 'pending'` via service role; run the expire SQL directly (`UPDATE payment_requests SET status='expired', updated_at=now() WHERE status='pending' AND expires_at < now()`); re-query the row via service role; assert `status === 'expired'`; assert that a pending row with `expires_at` in the future is NOT affected
- [x] T049 [P] Create `tests/integration/recipient-resolution.test.ts`: seed a payment_request with `recipient_email = 'newuser@test.com', recipient_id = NULL, status = 'pending'` via service role; simulate new user sign-up by inserting into `auth.users` with matching email via service role (or call `supabase.auth.admin.createUser`); query the payment_request row; assert `recipient_id` is now populated with the new user's UUID; assert that a request with `status = 'paid'` is NOT updated by the trigger
- [x] T050 [P] Create `tests/integration/public-view.test.ts`: query `public_payment_request_view` using the anon Supabase client with a known row UUID; assert columns `id`, `amount`, `currency`, `note`, `status`, `created_at`, `expires_at` are returned; assert that `sender_id`, `recipient_email`, `recipient_phone`, `recipient_id`, `paid_at`, `updated_at` are NOT present in the response object; assert that querying a non-existent UUID returns `null` (not an error)
- [x] T051 [P] Create `tests/unit/PayButton.test.tsx`: wrap component in a React Admin `<AdminContext>` with mocked `dataProvider` and `authProvider`; provide a mock record with `status: 'pending'` via `RecordContextProvider`; call `vi.useFakeTimers()`; render `<PayButton />`; `fireEvent.click` the Pay button; assert `<CircularProgress>` is visible immediately; assert button is disabled; call `vi.advanceTimersByTime(2500)`; assert `dataProvider.update` was called with `{ status: 'paid', paid_at: expect.any(String) }`; render a second time with `status: 'paid'` and assert `<PayButton />` returns null (no button rendered)
- [x] T052 [P] Create `tests/unit/ExpiryCountdown.test.tsx`: render `<ExpiryCountdown expiresAt={futureDate(4)} />` and assert green chip text contains "days remaining"; render with `expiresAt={futureDate(2)}` and assert orange chip; render with `expiresAt={futureDate(0.5)}` and assert red chip text is "< 1 day remaining"; render with `expiresAt={pastDate(1)}` and assert grey chip with text "Expired"; `futureDate(days)` and `pastDate(days)` are test helpers computing ISO strings relative to `Date.now()`
- [x] T053 [P] Create `tests/unit/validation.test.ts`: import `validateRecipientEmail` and `validatePhone` from `src/resources/paymentRequests/PaymentRequestCreate`; test `validateRecipientEmail('')` returns an error string; test `validateRecipientEmail('invalid')` returns "Enter a valid email address"; test `validateRecipientEmail('a@b.com')` returns `undefined`; test `validatePhone('+905550000000')` returns `undefined`; test `validatePhone('05550000000')` (missing +) returns the phone error; test amount validation: value `0` triggers "Amount must be greater than 0"; value `999999.99` is valid; value `1000000` triggers "Maximum amount is 999,999.99"; note length `280` is valid; length `281` triggers the note error

---

## Phase 10: Polish & Cross-Cutting

- [x] T054 [P] Create `src/providers/index.ts`: re-export `dataProvider` from `./dataProvider` and `authProvider` from `../auth/supabaseAuthProvider` so consumers import from a single providers barrel
- [x] T055 [P] Add error boundary in `src/resources/paymentRequests/PaymentRequestList.tsx`: wrap the `<List>` components in a class-based `ErrorBoundary` component defined in `src/components/ErrorBoundary.tsx` that renders a MUI `<Alert severity="error">Failed to load requests. Please refresh the page.</Alert>` on error; the `ErrorBoundary` component must implement `componentDidCatch` and `getDerivedStateFromError`
- [x] T056 [P] Create `src/components/ErrorBoundary.tsx`: implement a class component `ErrorBoundary` extending `React.Component<{ children: React.ReactNode }, { hasError: boolean }>` with `static getDerivedStateFromError()` returning `{ hasError: true }` and `render()` returning either `children` or the MUI Alert fallback; export as default
- [x] T057 [P] Add empty state to `src/resources/paymentRequests/PaymentRequestList.tsx`: pass an `empty` prop to each `<List>` component pointing to a custom `<Empty>` component defined inline or imported from `src/components/EmptyState.tsx`; the empty state must render a MUI `<Typography>` message "No payment requests yet." and a `<CreateButton />` from `react-admin`
- [x] T058 Create `src/components/EmptyState.tsx`: render a centered MUI `<Box>` with `<Typography variant="h6" color="text.secondary">No payment requests yet.</Typography>` and a React Admin `<CreateButton label="Create Request" />` to direct the user to the create form
- [ ] T059 Perform responsive audit: open browser dev tools at 375px viewport width; verify `PaymentRequestList` renders `<SimpleList>` (not `<Datagrid>`); verify `PaymentRequestCreate` form inputs stack vertically with `fullWidth`; verify `PaymentRequestShow` action buttons do not overflow; verify `PublicRequestPage` has no horizontal scroll; document any fixes needed as inline `sx` prop adjustments using MUI's responsive syntax (no custom CSS files)
- [x] T060 Add `<meta name="viewport" content="width=device-width, initial-scale=1.0">` to `index.html` at the project root if not already present from the Vite template; verify MUI `<CssBaseline />` is rendered inside `<Admin>` to normalize box-sizing and base typography
- [x] T061 Update `src/App.tsx`: wrap the `<Admin>` with a MUI `<ThemeProvider>` using `createTheme({ palette: { mode: 'light' } })` or use React Admin's `defaultTheme` if preferred; import and render `<CssBaseline />` inside the Admin to normalize styles across viewports

---

## Phase 11: Supabase Project Wiring & Final Integration

- [ ] T062 Verify Supabase CLI is installed (`supabase --version`) and run `supabase init` in the project root if `supabase/config.toml` does not exist; run `supabase start` to start the local stack and confirm Studio is accessible at `http://localhost:54323`
- [ ] T063 Run `supabase db push` (or `supabase migration up`) to apply all six migration files in order; confirm in Supabase Studio that tables `profiles`, `payment_requests`, the view `public_payment_request_view`, and the two triggers exist
- [ ] T064 Enable the `pg_cron` extension in the local Supabase instance by running the migration SQL or enabling it in Supabase Dashboard (local) → Database → Extensions → pg_cron; then run the cron schedule SQL from `supabase/migrations/006_pg_cron.sql`; verify with `SELECT * FROM cron.job WHERE jobname = 'expire-payment-requests'`
- [ ] T065 Update `.env.local` with the actual local Supabase values from `supabase status` output: set `VITE_SUPABASE_URL=http://localhost:54321` and `VITE_SUPABASE_ANON_KEY=<anon key from supabase status>`; also document `SUPABASE_SERVICE_ROLE_KEY=<service_role key>` in `.env.test` (not `.env.local`) for use by contract and integration tests
- [ ] T066 Create `.env.test` at the project root with `SUPABASE_URL=http://localhost:54321` and `SUPABASE_SERVICE_ROLE_KEY=<service role key from supabase status>`; add `.env.test` to `.gitignore`; reference this file in `vitest.config.ts` via `envFiles: ['.env.test']` or set vars via `process.env` in the test setup file
- [ ] T067 Run `npm run dev` and manually walk through the auth flow: navigate to `http://localhost:5173` → redirected to `/login` → enter a test email → check Inbucket at `http://localhost:54324` → click the magic link → land on dashboard → confirm identity is shown in the React Admin app bar
- [ ] T068 Run `npm test` (or `npx vitest run`) and confirm all contract and unit tests pass; if any test fails due to migration not being applied, re-run `supabase db push` and retry; fix any import path errors or TypeScript type mismatches before proceeding

---

## Phase 12: Documentation

- [x] T069 Update `README.md` at the project root with a quickstart section containing the following steps: (1) prerequisites (Node 20+, Supabase CLI), (2) `npm install`, (3) `supabase start`, (4) `supabase db push`, (5) copy `.env.local` values from `supabase status`, (6) `npm run dev`, (7) visit `http://localhost:5173`; also document the test command `npm test` and the Inbucket URL for local email inspection

---

## Summary

| Phase | Tasks | Blocked By |
|-------|-------|-----------|
| 1: Setup | T001–T010 | — |
| 2: Foundational | T011–T018 | Phase 1 |
| 3: US5 Auth | T019–T023 | Phase 2 |
| 4: US1 Create | T024–T027 | Phase 3 |
| 5: US2 Dashboard | T028–T032 | Phase 4 |
| 6: US3+US4 Actions | T033–T038 | Phase 5 |
| 7: US6 Shareable | T039–T041 | Phase 3 (can start after App.tsx exists) |
| 8: Edge Function | T042–T043 | Phase 2 |
| 9: Tests | T044–T053 | Phases 2–7 |
| 10: Polish | T054–T061 | Phase 6 |
| 11: Integration | T062–T068 | All prior phases |
| 12: Docs | T069 | Phase 11 |

**Total tasks**: 69

---

## Dependencies

```
Phase 1 (Setup)
  └── Phase 2 (DB + Types)  ← blocks everything below
        ├── Phase 3 (Auth)
        │     ├── Phase 4 (Create)
        │     │     └── Phase 5 (Dashboard)
        │     │           └── Phase 6 (Actions)
        │     │                 └── Phase 7 (Shareable Link)  ← also needs Phase 3
        │     └── Phase 7 (Shareable Link)  ← can start in parallel with Phase 4
        └── Phase 8 (Edge Function)  ← independent of Phases 3–7
```

Phase 9 (Tests) requires Phases 2–7 to be written first but individual test files are independent of each other.
Phase 10 (Polish) requires Phases 5–7 complete.
Phase 11 (Integration/wiring) requires all prior phases.

---

## Parallel Execution Examples

The following tasks carry `[P]` and can be executed in parallel (they touch different files):

**Phase 2 parallelizable tasks**:
- T017 (`src/providers/supabaseClient.ts`) and T018 (`src/types/index.ts`) can run simultaneously

**Phase 9 parallelizable tasks** — all test files are independent:
- T044, T045, T046 (contract tests) can all run in parallel
- T047, T048, T049, T050 (integration tests) can all run in parallel
- T051, T052, T053 (unit tests) can all run in parallel

**Phase 10 parallelizable tasks**:
- T054 (`src/providers/index.ts`) and T056 (`src/components/ErrorBoundary.tsx`) and T058 (`src/components/EmptyState.tsx`) can run in parallel

---

## MVP Strategy

To deliver a working end-to-end demo as quickly as possible:

**MVP = Phase 1 + Phase 2 + Phase 3 + Phase 4**

This gives: project scaffold → DB schema with RLS → magic-link auth → create payment request. A user can log in and create a request. The shareable link URL is generated (UUID exists in DB) but the public page is not yet built.

**Next increment**: Add Phase 5 (dashboard) + Phase 6 (actions) to complete the core loop (create → view → pay/decline/cancel).

**Final increment**: Phase 7 (shareable public link) + Phase 8 (expiry edge function) + Phase 9 (all tests) + Phase 10 (polish).

---

## Conventions

### `[P]` — Parallelizable

A task marked `[P]` touches a file that has no incomplete dependencies at the time it runs. Two `[P]` tasks at the same phase level can be handed to separate agents or worked concurrently without merge conflicts. Do NOT mark a task `[P]` if it modifies a file that another in-progress task is also modifying.

### `[US1]`–`[US6]` — User Story Tags

Maps to the user stories in `specs/001-payment-request/spec.md`:
- `[US1]` — Create a Payment Request (FR-001, FR-002, FR-003)
- `[US2]` — View Request Dashboard (FR-004, FR-010)
- `[US3]` — Pay or Decline an Incoming Request (FR-006, FR-008, FR-013)
- `[US4]` — Cancel an Outgoing Request (FR-007, FR-008)
- `[US5]` — Authentication via Magic Link (FR-011)
- `[US6]` — Shareable Request Link (FR-002, FR-014)

Tasks without a `[US]` tag are infrastructure, cross-cutting, or testing tasks that serve multiple stories.
