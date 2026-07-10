import { expect, test } from "@playwright/test";

// These tests exercise the logged-OUT experience.
test.use({ storageState: { cookies: [], origins: [] } });

const PASSWORD = process.env.APP_PASSWORD!;

test("every page redirects unauthenticated visitors to /login", async ({
  page,
}) => {
  for (const target of ["/", "/accounts", "/transactions", "/reports/pnl"]) {
    await page.goto(target);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId("login-form")).toBeVisible();
  }
});

test("a wrong password shows an error and grants nothing", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("App password").fill("not-the-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByTestId("error-banner")).toContainText("Wrong password");
  await page.goto("/accounts");
  await expect(page).toHaveURL(/\/login$/);
});

test("login works, survives a browser restart (cookie), and logout ends it", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await page.getByLabel("App password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/$/);

  // Cookie is httpOnly and persistent (not session-scoped).
  const cookie = (await context.cookies()).find((c) => c.name === "tfa_session");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie && cookie.expires > Date.now() / 1000 + 86400).toBe(true);

  await page.goto("/accounts");
  await expect(page).toHaveURL(/\/accounts$/);

  await page.getByTestId("logout").click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/accounts");
  await expect(page).toHaveURL(/\/login$/);
});

test("repeated failures hit a rate limit", async ({ page }) => {
  for (let i = 0; i < 8; i++) {
    await page.goto("/login");
    await page.getByLabel("App password").fill(`wrong-${i}`);
    await page.getByRole("button", { name: "Log in" }).click();
    // The field resets only after the failed action re-renders the page —
    // this pins each iteration to a completed server round-trip.
    await expect(page.getByLabel("App password")).toHaveValue("");
    await expect(page.getByTestId("error-banner")).toBeVisible();
  }
  await page.goto("/login");
  await page.getByLabel("App password").fill("wrong-final");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByTestId("error-banner")).toContainText(
    "Too many attempts",
  );
});
