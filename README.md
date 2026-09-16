# URL Shortener with Analytics

A learning-focused URL shortener that makes each infrastructure layer observable: Express handles link creation and redirects, Redis caches hot destinations and rate limits writes, Supabase stores users and analytics, and React visualizes activity. Cloudflare edge caching is the next planned phase.

## Stack

- React, Vite, TanStack Query, and Recharts
- Express and TypeScript
- Supabase Postgres and Auth
- Redis with cache-aside lookups and distributed rate limiting
- Docker Compose for local Redis

## Run locally

1. Create a Supabase project and run `supabase/migrations/20260916000000_initial_schema.sql` in its SQL editor (or apply it with the Supabase CLI).
2. Enable email authentication in Supabase and add `http://localhost:5173` as an allowed redirect URL.
3. Copy `.env.example` to `.env`, fill in the Supabase URL and secret key, then copy the four `VITE_` variables into `apps/web/.env.local`.
4. Start Redis and the applications:

   ```bash
   docker compose up -d redis
   npm install
   npm run dev
   ```

The dashboard runs at `http://localhost:5173` and the API at `http://localhost:4000`.

> The secret key belongs only in the API environment. Never expose it through a `VITE_` variable or commit it.

## API routes

| Method  | Route                     | Purpose                                                         |
| ------- | ------------------------- | --------------------------------------------------------------- |
| `GET`   | `/api/health`             | API and Redis status                                            |
| `POST`  | `/api/links`              | Create a short link (10 requests/minute)                        |
| `GET`   | `/api/links`              | List the signed-in user's links and totals                      |
| `PATCH` | `/api/links/:id`          | Change destination, label, or active state and invalidate Redis |
| `GET`   | `/api/analytics/overview` | 30-day click series and top links                               |
| `GET`   | `/:shortCode`             | Resolve, record, and redirect a short link                      |

Use the `X-Redirect-Cache` response header to observe Redis `HIT` and `MISS` results. Redirect responses currently use `Cache-Control: private, no-store`; this deliberately establishes an origin baseline before Cloudflare Workers and edge analytics are introduced.

## Commands

```bash
npm run dev
npm run typecheck
npm run build
npm test
```

## Roadmap

- Add request diagnostics for cache hit rate and redirect latency.
- Move redirect handling to a Cloudflare Worker and compare edge/origin behavior.
- Queue edge click events and write them to Supabase idempotently.
- Add abuse controls, bot classification, and hashed IP-based uniqueness estimates.
