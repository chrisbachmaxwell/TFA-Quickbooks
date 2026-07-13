import { expect, test } from "@playwright/test";
import { db } from "./helpers";

const TEST_EMAIL = "e2e@tfa.test"; // the session in storageState belongs to this user

test.beforeAll(async () => {
  await db.authorizedUser.deleteMany({ where: { email: { not: TEST_EMAIL } } });
  await db.authorizedUser.upsert({
    where: { email: TEST_EMAIL },
    update: {},
    create: { email: TEST_EMAIL },
  });
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("add an authorized user (normalized), reject duplicates", async ({
  page,
}) => {
  await page.goto("/settings/users");
  await expect(page.getByTestId("user-row")).toHaveCount(1);

  const form = page.getByTestId("add-user-form");
  await form.locator('input[name="email"]').fill("  NewPerson@Example.COM ");
  await form.getByRole("button", { name: "Authorize" }).click();
  await expect(page.getByTestId("user-row")).toHaveCount(2);
  await expect(page.getByTestId("users-table")).toContainText(
    "newperson@example.com",
  );

  await form.locator('input[name="email"]').fill("newperson@example.com");
  await form.getByRole("button", { name: "Authorize" }).click();
  await expect(page.getByTestId("error-banner")).toContainText("already authorized");
  await expect(page.getByTestId("user-row")).toHaveCount(2);
});

test("remove a user; the last one is protected", async ({ page }) => {
  await page.goto("/settings/users");
  await page
    .getByTestId("user-row")
    .filter({ hasText: "newperson@example.com" })
    .getByRole("button", { name: "Remove" })
    .click();
  await expect(page.getByTestId("user-row")).toHaveCount(1);

  await page
    .getByTestId("user-row")
    .first()
    .getByRole("button", { name: "Remove" })
    .click();
  await expect(page.getByTestId("error-banner")).toContainText(
    "can't remove the last authorized user",
  );
  await expect(page.getByTestId("user-row")).toHaveCount(1);
});
