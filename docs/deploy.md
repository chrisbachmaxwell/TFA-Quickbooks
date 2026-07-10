# Deploying TFA Books to Railway (click by click)

You'll create one Railway project with two pieces: a **Postgres database** and the **app**. Ten minutes, no terminal needed.

## 1. Create the project and database

1. Go to <https://railway.com> and log in (GitHub login is easiest).
2. Click **New Project** → **Deploy PostgreSQL**. That's the database created.

## 2. Add the app from GitHub

3. In the same project, click **Create** (or **+ New**) → **GitHub Repo**.
4. If Railway asks to install its GitHub app, allow it access to **chrisbachmaxwell/TFA-Quickbooks**, then pick that repo.
5. Railway starts building automatically. Let it — the first build may fail until the variables in step 3 are set; that's fine.

## 3. Set the two variables on the app service

6. Click the **TFA-Quickbooks service** (the app, not Postgres) → **Variables** tab.
7. Add variable → name `DATABASE_URL`. For the value, click the **reference** option and pick the Postgres service's `DATABASE_URL` (it looks like `${{Postgres.DATABASE_URL}}`). This wires the app to the database with no copying of passwords.
8. Add variable → name `APP_PASSWORD` → value: the password you'll type to open the books. Make it long. **Don't reuse a bank password, and don't commit it anywhere.**
9. The service redeploys itself. Wait for the green **Success**.

## 4. Give it a URL and log in

10. Still on the app service: **Settings** tab → **Networking** → **Generate Domain**.
11. Open the URL it gives you. You should see the TFA Books login screen.
12. Log in with your `APP_PASSWORD`. Done — the books are live and private.

## Afterwards

- **Every push to the repo's default branch deploys automatically.** The start command runs database migrations first, so schema changes apply themselves.
- **Backups**: Railway's Postgres has point-in-time recovery on paid plans; additionally, anyone with the repo checked out and `DATABASE_URL` in `.env` can run `npm run db:backup` (and `npm run db:restore -- <file> --yes`) — see AGENTS.md.
- **Changing the app password**: edit `APP_PASSWORD` in Variables. Every logged-in session everywhere is signed out instantly (sessions are derived from the password).
- If the deploy fails, open the failed deploy's **logs** and read the last lines — most likely a missing variable from step 3.
