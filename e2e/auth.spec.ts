import { expect, test } from "@playwright/test";
import { newLoginToken } from "../lib/auth";
import { db } from "./helpers";

// Logged-out experience throughout this spec.
test.use({ storageState: { cookies: [], origins: [] } });

const AUTHORIZED = "authorized@tfa.test";
const STRANGER = "stranger@tfa.test";

async function mintLink(email: string, minutesFromNow = 15): Promise<string> {
  const { token, tokenHash } = newLoginToken();
  await db.loginToken.create({
    data: {
      email,
      tokenHash,
      expiresAt: new Date(Date.now() + minutesFromNow * 60_000),
    },
  });
  return `/login/verify?token=${token}`;
}

test.beforeAll(async () => {
  await db.loginToken.deleteMany();
  await db.authorizedUser.upsert({
    where: { email: AUTHORIZED },
    update: {},
    create: { email: AUTHORIZED },
  });
  await db.authorizedUser.deleteMany({ where: { email: STRANGER } });
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("every page redirects visitors without a session to /login", async ({
  page,
}) => {
  for (const target of ["/", "/accounts", "/transactions", "/settings/users"]) {
    await page.goto(target);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId("login-form")).toBeVisible();
  }
});

test("authorized and unauthorized emails get the same message — but only authorized ones get a token", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(AUTHORIZED);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  const sentText = await page.getByTestId("sent-banner").innerText();

  await page.goto("/login");
  await page.getByLabel("Email address").fill(STRANGER);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByTestId("sent-banner")).toHaveText(sentText); // no enumeration

  expect(await db.loginToken.count({ where: { email: AUTHORIZED } })).toBe(1);
  expect(await db.loginToken.count({ where: { email: STRANGER } })).toBe(0);
});

test("a sign-in link works exactly once", async ({ page }) => {
  const link = await mintLink(AUTHORIZED);
  await page.goto(link);
  await expect(page).toHaveURL(/\/$/); // signed in, on the dashboard
  await page.goto("/accounts");
  await expect(page).toHaveURL(/\/accounts$/);

  // Same link from a fresh, logged-out context: rejected.
  await page.context().clearCookies();
  await page.goto(link);
  await expect(page).toHaveURL(/\/login\?error/);
  await expect(page.getByTestId("error-banner")).toContainText(
    "invalid, expired, or already used",
  );
});

test("expired and garbage tokens are rejected", async ({ page }) => {
  const expired = await mintLink(AUTHORIZED, -1);
  await page.goto(expired);
  await expect(page.getByTestId("error-banner")).toContainText("expired");
  await page.goto("/login/verify?token=not-a-real-token");
  await expect(page.getByTestId("error-banner")).toContainText("invalid");
});

test("removing a user kills their outstanding links", async ({ page }) => {
  const email = "temporary@tfa.test";
  await db.authorizedUser.create({ data: { email } });
  const link = await mintLink(email);
  await db.authorizedUser.delete({ where: { email } });
  await page.goto(link);
  await expect(page.getByTestId("error-banner")).toContainText("invalid");
});

test("a tampered session cookie is rejected", async ({ page, context }) => {
  await context.addCookies([
    {
      name: "tfa_session",
      value:
        Buffer.from(`${AUTHORIZED}|${Date.now() + 86400000}`).toString(
          "base64url",
        ) + ".forgedsignature",
      url: "http://localhost:3111",
    },
  ]);
  await page.goto("/accounts");
  await expect(page).toHaveURL(/\/login$/);
});

test("logout ends the session", async ({ page }) => {
  await page.goto(await mintLink(AUTHORIZED));
  await expect(page).toHaveURL(/\/$/);
  await page.getByTestId("logout").click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/accounts");
  await expect(page).toHaveURL(/\/login$/);
});

test("repeated link requests hit the rate limit", async ({ page }) => {
  const email = "hammered@tfa.test"; // unauthorized — requests still count
  for (let i = 0; i < 8; i++) {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByTestId("sent-banner")).toBeVisible();
  }
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByTestId("error-banner")).toContainText(
    "Too many requests",
  );
});
