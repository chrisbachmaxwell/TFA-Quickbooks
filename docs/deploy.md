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
8. Add variable → name `SESSION_SECRET` → value: any long random string (30+ characters of keyboard mashing is fine). It signs login sessions; changing it later signs everyone out instantly.
8b. (For email sign-in links) Add `RESEND_API_KEY` with your key from resend.com, and optionally `EMAIL_FROM` (e.g. `TFA Books <books@yourdomain.com>`). Without these, sign-in links are printed to the service's **Logs** tab instead of emailed — you can still log in by copying the link from there.
9. The service redeploys itself. Wait for the green **Success**.

## 4. Give it a URL and log in

10. Still on the app service: **Settings** tab → **Networking** → **Generate Domain**.
11. Open the URL it gives you. You should see the TFA Books login screen.
12. Enter an authorized email address and click the sign-in link you receive (or grab it from the Logs tab if email isn't configured yet). Done — the books are live and private.

## Afterwards

- **Every push to the repo's default branch deploys automatically.** The start command runs database migrations first, so schema changes apply themselves.
- **Backups**: Railway's Postgres has point-in-time recovery on paid plans; additionally, anyone with the repo checked out and `DATABASE_URL` in `.env` can run `npm run db:backup` (and `npm run db:restore -- <file> --yes`) — see AGENTS.md.
- **Managing who can log in**: inside the app, Settings → Users. **Signing everyone out at once**: change `SESSION_SECRET` in Variables.
- If the deploy fails, open the failed deploy's **logs** and read the last lines — most likely a missing variable from step 3.
