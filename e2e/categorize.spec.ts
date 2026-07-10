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

test("categorizing a transaction posts a balanced entry and moves it to the categorized list", async ({
  page,
}) => {
  await createAccountViaUi(page, "TFA Checking", "Asset");
  await createAccountViaUi(page, "Dividend Income", "Income");
  await importFixtureViaUi(page, "TFA Checking");

  await page.goto("/transactions");
  const uncategorized = page.getByTestId("uncategorized-row");
  await expect(uncategorized).toHaveCount(8);

  const dividend = uncategorized
    .filter({ hasText: "Dividend - Acme Holdings" })
    .first();
  await dividend
    .locator('select[name="accountId"]')
    .selectOption({ label: "Dividend Income (income)" });
  await dividend.getByRole("button", { name: "Categorize" }).click();

  await expect(uncategorized).toHaveCount(7);
  const categorized = page.getByTestId("categorized-row");
  await expect(categorized).toHaveCount(1);
  await expect(categorized.first()).toContainText("Dividend - Acme Holdings");
  await expect(categorized.first()).toContainText("Dividend Income");
  await expect(categorized.first()).toContainText("$2,500.00");

  // The move survives a reload — it's in the ledger, not page state.
  await page.reload();
  await expect(page.getByTestId("uncategorized-row")).toHaveCount(7);
  await expect(page.getByTestId("categorized-row")).toHaveCount(1);

  // And the posted journal entry is balanced, straight from the database.
  const entries = await db.journalEntry.findMany({ include: { lines: true } });
  expect(entries).toHaveLength(1);
  const debits = entries[0].lines.reduce((s, l) => s + l.debitCents, 0);
  const credits = entries[0].lines.reduce((s, l) => s + l.creditCents, 0);
  expect(debits).toBe(250000);
  expect(credits).toBe(250000);
});

test("the bank account itself is not offered as a category", async ({
  page,
}) => {
  await page.goto("/transactions");
  const row = page.getByTestId("uncategorized-row").first();
  const options = row.locator('select[name="accountId"] option');
  await expect(options.filter({ hasText: "TFA Checking" })).toHaveCount(0);
  await expect(options.filter({ hasText: "Dividend Income" })).toHaveCount(1);
});
