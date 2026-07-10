#!/usr/bin/env node
// Restores a backup produced by db-backup.mjs into the configured database.
// DESTRUCTIVE: the dump's --clean statements drop existing tables first,
// so it requires an explicit --yes.
//   npm run db:restore -- <file> --yes
import { execFileSync } from "child_process";
import fs from "fs";

try {
  process.loadEnvFile(".env");
} catch {
  /* rely on caller env */
}

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const confirmed = args.includes("--yes");

if (!file || !fs.existsSync(file)) {
  console.error("usage: npm run db:restore -- <backup.sql> --yes");
  process.exit(1);
}
if (!confirmed) {
  console.error(
    "Refusing to restore without --yes (this REPLACES the current database).",
  );
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (put it in .env)");
  process.exit(1);
}

execFileSync("psql", ["-q", "-v", "ON_ERROR_STOP=1", "-f", file, url], {
  stdio: ["ignore", "inherit", "inherit"],
});
console.log(`restored ${file}`);
