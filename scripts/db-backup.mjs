#!/usr/bin/env node
// Dumps the configured database to backups/tfa-backup-<timestamp>.sql
// (plain SQL with --clean --if-exists, so restoring over an existing
// schema works). Prints the file path on success.
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

try {
  process.loadEnvFile(".env");
} catch {
  /* rely on caller env */
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (put it in .env)");
  process.exit(1);
}

const dir = path.resolve("backups");
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const file = path.join(dir, `tfa-backup-${stamp}.sql`);

execFileSync(
  "pg_dump",
  ["--clean", "--if-exists", "--no-owner", "--no-privileges", "-f", file, url],
  { stdio: ["ignore", "inherit", "inherit"] },
);
console.log(file);
