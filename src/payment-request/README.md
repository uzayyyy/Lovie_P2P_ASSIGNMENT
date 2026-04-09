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

# 2. Copy env file and fill in your Supabase credentials
cp .env.local.example .env.local

# 3. Start dev server
npm run dev
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server (http://localhost:5173) |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once (CI) |

### Project structure

```
src/
  components/   # Shared UI components
  pages/        # Standalone pages (Login, Callback, PublicRequest)
  services/     # Supabase client, data helpers
  hooks/        # Custom React hooks
  App.tsx       # Root component
  main.tsx      # Entry point
public/         # Static assets
tests/          # Test setup and helpers
```

### Next tasks

- T002: Install ra-supabase + configure dataProvider
- T003: Set up Supabase local dev (`supabase start`)
- T011–T016: Write DB migrations (profiles, payment_requests, RLS)
- T019: Implement authProvider (Magic Link)
