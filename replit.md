# Livematchmv

Livematchmv — Live scores, match updates, and sports coverage. 150+ Leagues. 30+ Sports.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000 → exposed at `/api`)
- `pnpm --filter @workspace/football-app run dev` — run the frontend (exposed at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — used for signing admin cookies
- Required env: `ADMIN_PASSWORD` — admin dashboard password (default: `admin2024`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui (dark navy theme, orange accents)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Routing: wouter (frontend)
- Data fetching: TanStack Query + Orval-generated hooks

## Where things live

- `artifacts/football-app/` — React+Vite frontend
- `artifacts/api-server/` — Express 5 backend
- `lib/db/` — Drizzle schema + migrations (source of truth for DB)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-zod/` — generated Zod validators from spec
- `lib/api-client-react/` — generated React Query hooks from spec
- `artifacts/football-app/src/pages/admin.tsx` — admin dashboard root
- `artifacts/football-app/src/components/admin/` — admin tab components

## Architecture decisions

- Contract-first API: OpenAPI spec → Zod validators + React Query hooks via Orval codegen
- Admin auth via signed cookies (`fl_admin=authenticated`) using `SESSION_SECRET`; no JWT/sessions library needed
- Standings computed on-the-fly from finished match scores (no separate table)
- Event log stores player name + number directly (denormalized) so it's preserved even if lineup changes
- Sport column on both teams and matches supports football/futsal filtering throughout

## Product

- **Home**: Date selector, sport filter pills, competition-grouped flat match rows, featured teal hero card
- **Live**: Live matches with red pulsing dot, live minute counter, stream count badge
- **Match Detail**: Score, events timeline, lineup, stream links
- **Streaming**: Embedded stream player with quality/language selector
- **Highlights**: Browse and play video highlights
- **Admin Dashboard** (`/admin`):
  - Login-gated with password auth
  - Overview: live/scheduled/finished counts + team/tournament/stream stats
  - Teams: CRUD with sport type (football/futsal)
  - Tournaments: CRUD + automatic standings table from finished matches
  - Matches: CRUD with team dropdown selector, sport filter, tournament linking, venue, inline score/status update
  - Live Events: Select match → log goal/yellow/red/own-goal/penalty/substitution/MVP with player # and name (from lineup or manual)
  - Lineup: Select match → add/remove players per team (Starting XI + substitutes)
  - Streams: Select match → add/remove stream links with quality and language

## User preferences

- Dark navy blue theme, orange accent branding, teal gradient hero cards
- MatchFoari.com visual style: competition-grouped flat match rows, sport filter pills
- Support both football and futsal

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change before editing frontend code
- Run `pnpm --filter @workspace/db run push` after any DB schema change
- The `/matches/live` route must be defined BEFORE `/matches/:id` in Express to avoid route collision
- Admin cookie is signed with `SESSION_SECRET` env var — must match across server restarts
- Always use `localhost:80` (proxy) not `localhost:8080` (direct) for curl testing

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- OpenAPI spec: `lib/api-spec/openapi.yaml`
- DB schema: `lib/db/src/schema.ts`
