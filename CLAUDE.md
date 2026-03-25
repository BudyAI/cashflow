## Environment setup

- **First-time local env:** run `pnpm env:create` to create `.env` from `.env.example` and set `NEXTAUTH_SECRET` to a random value (32-byte base64).
- If `.env` already exists but `NEXTAUTH_SECRET` is missing or still the placeholder from `.env.example`, `pnpm env:create` fills or updates it; if a real secret is already set, the script leaves it unchanged.
- Alternatively, copy `.env.example` to `.env` manually and set `NEXTAUTH_SECRET` yourself (for example `openssl rand -base64 32`).

## Git workflow rules

- **Never push to `main` or `master`.**
- **Before any push**, verify you are on a feature branch:
  - If on `main`/`master` (or detached HEAD), create a new feature branch and switch to it **before** committing or pushing.
  - Use a descriptive branch name (e.g. `feat/aging-report-chart`, `fix/prisma-client`, `chore/pnpm-migration`).
- **Push using the current branch name**, and set upstream on first push (e.g. `git push -u origin HEAD`).
- **Never force-push** to `main`/`master`.
- Prefer small, focused commits with clear messages.

## Safe push checklist

1. `git status` is clean (or only intended changes).
2. `git branch --show-current` is **not** `main`/`master`.
3. `git log -1` looks correct.
4. Push: `git push -u origin HEAD` (first time) or `git push`.

## Database workflow (Prisma)

- Default provider is SQLite for local development (`DB_PROVIDER=sqlite`).
- `DATABASE_URL` must match provider:
  - SQLite: `file:./dev.db`
  - Postgres: `postgresql://...`
- First local run is automatic:
  - `pnpm dev` runs `scripts/ensure-local-db.mjs`
  - this auto-syncs SQLite schema via `prisma db push`
- Safe command usage:
  - Local SQLite sync: `pnpm db:local:sync`
  - Local seed: `pnpm seed`
  - Postgres migration authoring: `pnpm db:migrate:dev` (requires Postgres `DATABASE_URL`)
  - Production migration deploy: `pnpm migrate:deploy` (requires Postgres `DATABASE_URL`)
- Migration source of truth is Postgres migrations in `prisma/migrations`; do not treat SQLite `db push` as canonical migration history.
- Postgres migration scripts are executed via `scripts/run-prisma-postgres.mjs`, which generates a temporary Postgres schema from `prisma/schema.prisma`.

## Local auth bypass (dev only)

- Set `DEV_AUTH_BYPASS=true` to bypass Google OAuth in local development.
- To disable local bypass, remove `DEV_AUTH_BYPASS` or set `DEV_AUTH_BYPASS=false` in `.env`, then restart `pnpm dev`.
- Bypass mode is guarded to non-production environments only.
- Login uses a credentials provider and auto-upserts a deterministic dev user:
  - id: `dev-user`
  - email: `dev@test.com`
  - name: `Dev User`
- This keeps local sign-in simple and ensures DB-backed user queries still work on first run.
- Keep `DEV_AUTH_BYPASS` disabled outside local development.

