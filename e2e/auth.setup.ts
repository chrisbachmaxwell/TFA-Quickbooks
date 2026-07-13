import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { expect, test as setup } from "@playwright/test";

const TEST_EMAIL = "e2e@tfa.test";

// Runs once before the main project: authorize a test email, request a
// sign-in link through the UI, pull the token straight from the database
// (log-mode email delivery), sign in, and persist the session.
setup("authenticate", async ({ page }) => {
  fs.mkdirSync(path.join(__dirname, ".auth"), { recursive: true });
  const db = new PrismaClient();
  await db.authorizedUser.upsert({
    where: { email: TEST_EMAIL },
    update: {},
    create: { email: TEST_EMAIL },
  });

  await page.goto("/login");
  await page.getByLabel("Email address").fill(TEST_EMAIL);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByTestId("sent-banner")).toBeVisible();

  // In log-mode the raw token isn't recoverable from the hash, so mint a
  // fresh one directly — same table, same verify route the email would hit.
  const { newLoginToken } = await import("../lib/auth");
  const { token, tokenHash } = newLoginToken();
  await db.loginToken.create({
    data: {
      email: TEST_EMAIL,
      tokenHash,
      expiresAt: new Date(Date.now() + 15 * 60_000),
    },
  });
  await page.goto(`/login/verify?token=${token}`);
  await expect(page).toHaveURL(/\/$/);
  await page.context().storageState({ path: "e2e/.auth/user.json" });
  await db.$disconnect();
});
