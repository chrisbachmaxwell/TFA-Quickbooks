import fs from "fs";
import path from "path";
import { expect, test as setup } from "@playwright/test";

// Runs once before the main project: log in and persist the session so
// every spec starts authenticated.
setup("authenticate", async ({ page }) => {
  const password = process.env.APP_PASSWORD;
  if (!password) throw new Error("APP_PASSWORD missing from environment/.env");
  fs.mkdirSync(path.join(__dirname, ".auth"), { recursive: true });
  await page.goto("/login");
  await page.getByLabel("App password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
