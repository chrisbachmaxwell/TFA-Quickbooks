import { expect, test } from "@playwright/test";
import { accountRow, createAccountViaUi, db, resetDb } from "./helpers";

test.beforeAll(async () => {
  await resetDb();
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("create accounts of each type and see them listed", async ({ page }) => {
  await createAccountViaUi(page, "TFA Checking", "Asset");
  await createAccountViaUi(page, "Credit Card", "Liability");
  await createAccountViaUi(page, "Owner Contributions", "Equity");
  await createAccountViaUi(page, "Dividend Income", "Income");
  await createAccountViaUi(page, "Office Expenses", "Expense");

  await expect(page.getByTestId("account-row")).toHaveCount(5);
  await expect(accountRow(page, "TFA Checking")).toContainText("Asset");
  await expect(accountRow(page, "Credit Card")).toContainText("Liability");
  await expect(accountRow(page, "Owner Contributions")).toContainText("Equity");
  await expect(accountRow(page, "Dividend Income")).toContainText("Income");
  await expect(accountRow(page, "Office Expenses")).toContainText("Expense");
});

test("accounts survive a page reload", async ({ page }) => {
  await page.goto("/accounts");
  await page.reload();
  await expect(page.getByTestId("account-row")).toHaveCount(5);
  await expect(accountRow(page, "TFA Checking")).toBeVisible();
});

test("rename an account", async ({ page }) => {
  await page.goto("/accounts");
  const row = accountRow(page, "Dividend Income");
  await row.locator('input[name="name"]').fill("Dividend Revenue");
  await row.getByRole("button", { name: "Rename" }).click();
  await expect(accountRow(page, "Dividend Revenue")).toBeVisible();
  await expect(accountRow(page, "Dividend Income")).toHaveCount(0);
  await page.reload();
  await expect(accountRow(page, "Dividend Revenue")).toBeVisible();
});

test("deactivate and reactivate an account", async ({ page }) => {
  await page.goto("/accounts");
  const row = accountRow(page, "Credit Card");
  await expect(row).toContainText("Active");
  await row.getByRole("button", { name: "Deactivate" }).click();
  await expect(accountRow(page, "Credit Card")).toContainText("Inactive");
  await page.reload();
  await expect(accountRow(page, "Credit Card")).toContainText("Inactive");
  await accountRow(page, "Credit Card")
    .getByRole("button", { name: "Reactivate" })
    .click();
  await expect(accountRow(page, "Credit Card")).toContainText("Active");
});

test("duplicate account names are rejected with a visible error", async ({
  page,
}) => {
  await page.goto("/accounts");
  const form = page.getByTestId("new-account-form");
  await form.locator('input[name="name"]').fill("TFA Checking");
  await form.locator('select[name="type"]').selectOption({ label: "Asset" });
  await form.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("error-banner")).toContainText(
    "already exists",
  );
  await expect(page.getByTestId("account-row")).toHaveCount(5);
});
