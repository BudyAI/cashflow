This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Package manager

This repo uses **pnpm** (see `packageManager` in `package.json`).

## Getting Started

Create your local env file and install dependencies:

```bash
cp .env.example .env
pnpm install
```

### Database workflow

- Default local mode uses SQLite (`DB_PROVIDER=sqlite` and `DATABASE_URL=file:./dev.db`)
- `pnpm dev` auto-runs a local SQLite schema sync (`prisma db push`) before starting Next.js
- Seed local data with:

```bash
pnpm seed
```

- PostgreSQL is canonical for migrations and production:
  - author migrations with `DATABASE_URL=...` and run `pnpm db:migrate:dev`
  - deploy migrations in production with `DATABASE_URL=...` and run `pnpm migrate:deploy`
  - these scripts use a Postgres schema wrapper internally, while local runtime remains SQLite by default

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.