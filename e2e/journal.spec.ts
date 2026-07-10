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

test("a balanced manual entry posts and lands on the balance sheet", async ({
  page,
}) => {
  await createAccountViaUi(page, "TFA Checking", "Asset");
  await createAccountViaUi(page, "Owner Contributions", "Equity");

  await page.goto("/journal");
  const form = page.getByTestId("journal-form");
  await form.locator('input[name="date"]').fill("2026-06-01");
  await form.locator('input[name="memo"]').fill("Opening balance");
  await form
    .getByLabel("Account for line 1")
    .selectOption({ label: "TFA Checking (asset)" });
  await form.getByLabel("Debit for line 1").fill("500.00");
  await form
    .getByLabel("Account for line 2")
    .selectOption({ label: "Owner Contributions (equity)" });
  await form.getByLabel("Credit for line 2").fill("500.00");
  await expect(page.getByTestId("journal-balance-hint")).toHaveText("Balanced ✓");
  await form.getByRole("button", { name: "Post entry" }).click();

  const row = page.getByTestId("journal-row").filter({ hasText: "Opening balance" });
  await expect(row).toHaveCount(1);
  await expect(row.locator(".badge")).toHaveText("Manual");

  await page.goto("/reports/balance-sheet?asOf=2026-06-30");
  await expect(page.getByTestId("total-assets")).toHaveText("$500.00");
  await expect(page.getByTestId("balance-check")).toContainText("✓");
});

test("an unbalanced entry is rejected with the imbalance shown, and writes nothing", async ({
  page,
}) => {
  await page.goto("/journal");
  const form = page.getByTestId("journal-form");
  await form.locator('input[name="date"]').fill("2026-06-02");
  await form.locator('input[name="memo"]').fill("Bad entry");
  await form
    .getByLabel("Account for line 1")
    .selectOption({ label: "TFA Checking (asset)" });
  await form.getByLabel("Debit for line 1").fill("500.00");
  await form
    .getByLabel("Account for line 2")
    .selectOption({ label: "Owner Contributions (equity)" });
  await form.getByLabel("Credit for line 2").fill("400.00");
  await expect(page.getByTestId("journal-balance-hint")).toContainText(
    "must match",
  );
  await form.getByRole("button", { name: "Post entry" }).click();

  await expect(page.getByTestId("error-banner")).toContainText(
    "doesn't balance",
  );
  await expect(page.getByTestId("journal-row")).toHaveCount(1); // only the opening balance
  expect(await db.journalEntry.count()).toBe(1);
});

test("manual entries can be deleted; bank-linked entries cannot", async ({
  page,
}) => {
  await importFixtureViaUi(page, "TFA Checking");
  await page.goto("/transactions");
  // Filter on the description CELL exactly — every row's category dropdown
  // contains "Owner Contributions (equity)" as option text, so a plain
  // hasText filter would match all 8 rows and pick the wrong one.
  const dividend = page
    .getByTestId("uncategorized-row")
    .filter({ has: page.getByRole("cell", { name: "Owner contribution", exact: true }) });
  await dividend
    .locator('select[name="accountId"]')
    .selectOption({ label: "Owner Contributions (equity)" });
  await dividend.getByRole("button", { name: "Categorize" }).click();
  await expect(page.getByTestId("categorized-row")).toHaveCount(1);

  await page.goto("/journal");
  // Filter by the entry's unique date — "Owner contribution" (the memo) is a
  // case-insensitive substring of the manual entry's "Owner Contributions" line.
  const bankRow = page.getByTestId("journal-row").filter({ hasText: "2026-03-15" });
  await expect(bankRow.locator(".badge")).toHaveText("Bank");
  await expect(bankRow.getByRole("button", { name: "Delete" })).toHaveCount(0);

  const manualRow = page
    .getByTestId("journal-row")
    .filter({ hasText: "Opening balance" });
  await manualRow.getByRole("button", { name: "Delete" }).click();
  await expect(
    page.getByTestId("journal-row").filter({ hasText: "Opening balance" }),
  ).toHaveCount(0);
  expect(
    await db.journalEntry.count({ where: { memo: "Opening balance" } }),
  ).toBe(0);
});
