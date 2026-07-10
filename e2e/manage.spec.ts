import { expect, test } from "@playwright/test";
import {
  createAccountViaUi,
  db,
  importFixtureViaUi,
  resetDb,
} from "./helpers";

test.beforeAll(async () => {
  await resetDb();
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("undo returns a categorized transaction to review and leaves no orphan ledger rows", async ({
  page,
}) => {
  await createAccountViaUi(page, "TFA Checking", "Asset");
  await createAccountViaUi(page, "Dividend Income", "Income");
  await importFixtureViaUi(page, "TFA Checking");

  await page.goto("/transactions");
  const uncategorized = page.getByTestId("uncategorized-row");
  await expect(uncategorized).toHaveCount(8);
  const dividend = uncategorized.filter({ hasText: "Dividend - Acme Holdings" }).first();
  await dividend
    .locator('select[name="accountId"]')
    .selectOption({ label: "Dividend Income (income)" });
  await dividend.getByRole("button", { name: "Categorize" }).click();
  await expect(uncategorized).toHaveCount(7);

  await page
    .getByTestId("categorized-row")
    .first()
    .getByRole("button", { name: "Undo" })
    .click();
  await expect(uncategorized).toHaveCount(8);
  await expect(page.getByTestId("categorized-row")).toHaveCount(0);

  expect(await db.journalEntry.count()).toBe(0);
  expect(await db.journalLine.count()).toBe(0);
});

test("exclude removes a row from review; restore brings it back", async ({
  page,
}) => {
  await page.goto("/transactions");
  const fee = page
    .getByTestId("uncategorized-row")
    .filter({ hasText: "Bank service fee" });
  await fee.getByRole("button", { name: "Exclude" }).click();

  await expect(page.getByTestId("uncategorized-row")).toHaveCount(7);
  const excludedRow = page
    .getByTestId("excluded-row")
    .filter({ hasText: "Bank service fee" });
  await expect(excludedRow).toHaveCount(1);

  await excludedRow.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByTestId("uncategorized-row")).toHaveCount(8);
  await expect(page.getByTestId("excluded-row")).toHaveCount(0);
});

test("excluded rows still dedupe re-uploads instead of resurrecting", async ({
  page,
}) => {
  await page.goto("/transactions");
  await page
    .getByTestId("uncategorized-row")
    .filter({ hasText: "Insurance premium" })
    .getByRole("button", { name: "Exclude" })
    .click();
  await expect(page.getByTestId("excluded-row")).toHaveCount(1);

  await importFixtureViaUi(page, "TFA Checking");
  await expect(page.getByTestId("import-result")).toHaveText(
    /Imported 0 transactions, skipped 8 duplicates\./,
  );
  await page.goto("/transactions");
  await expect(page.getByTestId("uncategorized-row")).toHaveCount(7);
  await expect(page.getByTestId("excluded-row")).toHaveCount(1);
});
