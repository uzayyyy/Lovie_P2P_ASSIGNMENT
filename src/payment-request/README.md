# Payment Request

P2P Payment Request feature — React Admin v5 + Supabase.

## Phase 1 scaffold setup

### Prerequisites

- Node 20+
- npm 10+
- Supabase CLI (`npm install -g supabase`)

### Getting started

```bash
# 1. Install dependencies
npm install

# 2. Start local Supabase
supabase start
supabase db push

# 3. Copy env files and fill in your Supabase credentials
cp .env.local.example .env.local

# 4. Start dev server
npm run dev
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server (http://localhost:5173) |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:run` | Run tests once (CI) |

### Project structure

```
src/
  auth/                      # Magic link auth provider and pages
  components/                # Shared UI components
  pages/                     # Standalone pages (Login, Callback, PublicRequest)
  providers/                 # Supabase and React Admin providers
  resources/paymentRequests/ # React Admin resource views
  types/                     # Shared domain types
supabase/
  migrations/               # SQL migrations
  functions/expire-requests/ # Edge function fallback
tests/
  contract/                 # RLS and schema-level tests
  integration/              # End-to-end flows against local Supabase
  unit/                     # Component and validation tests
```

### Next tasks

- Wire Supabase migrations and local CLI config
- Build React Admin resources for create/list/show flows
- Add public shareable request page and simulation actions
- Finish contract, integration, and unit test coverage
