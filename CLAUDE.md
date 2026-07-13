# Agent instructions — TFA-Quickbooks (code repo)

(`CLAUDE.md` and `AGENTS.md` are identical mirrors — if you edit one, make the same edit to the other.)

This repo is the application. The project's memory lives in the sibling **brain repo**: <https://github.com/chrisbachmaxwell/TFA-Quickbooks-Project-Brain>, expected at `../TFA-Quickbooks-Project-Brain`. If it isn't there, clone it there before doing anything else.

## Knowledge

1. **Before starting:** read `INDEX.md`, `entities/project-status.md`, and `entities/roadmap.md` in the brain repo, then follow the links your situation needs (the INDEX has a situation router).
2. **Ground every project claim in a brain page** — and when the field contradicts a page, fix the page (and log the correction) rather than working around it.
3. **End every session** with a dated note in the brain's `log/` (decisions, mistakes caught, patterns confirmed, commits) and with `entities/project-status.md` and `entities/roadmap.md` updated to match reality.

## Roles

Agents: read your role page — `roles/architect.md`, `roles/worker.md`, or `roles/tester.md` in the brain — before working. If no role was named, you are the worker.

## Build & verify

The verification gates for this repo. **A goal's work only counts when these pass** — all of them, from a clean checkout, not just the ones you touched.

```
npm run gates
```

which runs, in order, failing loudly if any stage fails:

1. `npm run build` — Prisma client generation + Next.js production build
2. `npm run lint` — eslint is clean
3. `npm test` — unit tests (Vitest), including the double-entry posting engine
4. `npm run e2e` — applies migrations, then Playwright browser tests that click the app like a user (UI claims are only proven here — server/API checks alone don't count)

### One-time local setup

The gates need Node 20+ and a running PostgreSQL:

```
npm install
cp .env.example .env            # DATABASE_URL (postgresql://tfa:tfa@localhost:5432/tfa_quickbooks) + SESSION_SECRET
service postgresql start        # or however Postgres runs on this machine
sudo -u postgres psql -c "CREATE USER tfa WITH PASSWORD 'tfa' CREATEDB;" \
                      -c "CREATE DATABASE tfa_quickbooks OWNER tfa;"
npx prisma migrate deploy
```

The app uses passwordless email magic-link login against an authorized-user allowlist (sessions signed with `SESSION_SECRET` from `.env`; without `RESEND_API_KEY` the links print to the server log). The Playwright suite authorizes a test email and signs itself in via `e2e/auth.setup.ts`. Database backup/restore: `npm run db:backup`, `npm run db:restore -- <file> --yes` (needs `pg_dump`/`psql` on PATH). Production deployment is Railway — see `docs/deploy.md`.

The Playwright suite **truncates every table** in the configured database — never point `.env` at a database whose data you care about. Playwright browsers: managed environments with a Chromium at `/opt/pw-browsers/chromium` are picked up automatically; elsewhere run `npx playwright install chromium` once.

Never commit secrets, credentials, `.env` files, or real financial data to this repo.
