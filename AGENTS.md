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

which must run, in order, failing loudly if any stage fails:

1. `npm run build` — the app compiles
2. `npm run lint` — lint is clean
3. `npm test` — unit tests (Vitest), including the double-entry posting engine
4. `npm run e2e` — Playwright browser tests that click the app like a user (UI claims are only proven here — server/API checks alone don't count)

**No code exists yet, so these gates are aspirational:** making `npm run gates` real and runnable is the first item of the first goal (`goals/001-ledger-v0.md` in the brain). Until then, nothing can be marked done.

Never commit secrets, credentials, `.env` files, or real financial data to this repo.
