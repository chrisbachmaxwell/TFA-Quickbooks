import { defineConfig } from "@playwright/test";
import fs from "fs";

// Prisma (in the webServer and in test helpers) needs DATABASE_URL.
try {
  process.loadEnvFile(".env");
} catch {
  // no .env — rely on the caller's environment
}

// Managed environments ship a Chromium at a fixed path; elsewhere fall back
// to Playwright's own browser resolution.
const localChromium = "/opt/pw-browsers/chromium";
const executablePath =
  fs.existsSync(localChromium) && fs.statSync(localChromium).isFile()
    ? localChromium
    : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1, // specs share one database; run them serially
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3111",
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: {
    command: "npx next start --port 3111",
    url: "http://localhost:3111",
    reuseExistingServer: false,
    timeout: 90_000,
  },
});
