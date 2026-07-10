import { expect, test } from "@playwright/test";
import {
  createAccountViaUi,
  db,
  resetDb,
  uploadCsvViaUi,
} from "./helpers";

test.beforeAll(async () => {
  await resetDb();
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("categorizing a transfer auto-matches the already-imported mirror row", async ({
  page,
}) => {
  await createAccountViaUi(page, "Checking", "Asset");
  await createAccountViaUi(page, "Savings", "Asset");
  await createAccountViaUi(page, "Dividend Income", "Income");

  await uploadCsvViaUi(
    page,
    "Checking",
    "Date,Description,Amount\n2026-05-01,Transfer to savings,-5000.00\n2026-05-10,Dividend - Acme,1000.00",
  );
  await uploadCsvViaUi(
    page,
    "Savings",
    "Date,Description,Amount\n2026-05-02,Transfer from checking,5000.00",
  );

  await page.goto("/transactions");
  await expect(page.getByTestId("uncategorized-row")).toHaveCount(3);

  const transferRow = page
    .getByTestId("uncategorized-row")
    .filter({ has: page.getByRole("cell", { name: "Transfer to savings", exact: true }) });
  await transferRow
    .locator('select[name="accountId"]')
    .selectOption({ label: "Savings (transfer)" });
  await transferRow.getByRole("button", { name: "Categorize" }).click();

  // Transfer posted once; mirror matched, not posted.
  await expect(page.getByTestId("categorized-row")).toHaveCount(1);
  await expect(page.getByTestId("matched-row")).toHaveCount(1);
  await expect(page.getByTestId("matched-row")).toContainText(
    "Transfer from checking",
  );
  await expect(page.getByTestId("uncategorized-row")).toHaveCount(1);

  expect(await db.journalEntry.count()).toBe(1);
});

test("both registers are right and the trial balance still sums to zero", async ({
  page,
}) => {
  await page.goto("/accounts");
  await page
    .locator('tr[data-name="Checking"]')
    .getByRole("link", { name: "Register" })
    .click();
  await expect(page.getByTestId("register-final-balance")).toHaveText(
    "-$5,000.00",
  );
  await page.goto("/accounts");
  await page
    .locator('tr[data-name="Savings"]')
    .getByRole("link", { name: "Register" })
    .click();
  await expect(page.getByTestId("register-final-balance")).toHaveText(
    "$5,000.00",
  );
  await page.goto("/reports/trial-balance?asOf=2026-12-31");
  await expect(page.getByTestId("tb-check")).toContainText("Debits = Credits ✓");
});

test("the dashboard review count ignores matched and excluded rows", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("review-callout")).toContainText(
    "1 transaction waiting for review",
  );
});

test("undoing the transfer releases the mirror back to review", async ({
  page,
}) => {
  await page.goto("/transactions");
  await page
    .getByTestId("categorized-row")
    .first()
    .getByRole("button", { name: "Undo" })
    .click();
  await expect(page.getByTestId("categorized-row")).toHaveCount(0);
  await expect(page.getByTestId("matched-row")).toHaveCount(0);
  await expect(page.getByTestId("uncategorized-row")).toHaveCount(3);
  expect(await db.journalEntry.count()).toBe(0);
});

test("a mirror imported AFTER the transfer was categorized matches at import time", async ({
  page,
}) => {
  // Re-categorize the checking-side transfer (mirror is sitting in review,
  // so it matches immediately); then bring in a brand-new transfer pair the
  // other way around.
  await page.goto("/transactions");
  const transferRow = page
    .getByTestId("uncategorized-row")
    .filter({ has: page.getByRole("cell", { name: "Transfer to savings", exact: true }) });
  await transferRow
    .locator('select[name="accountId"]')
    .selectOption({ label: "Savings (transfer)" });
  await transferRow.getByRole("button", { name: "Categorize" }).click();
  await expect(page.getByTestId("matched-row")).toHaveCount(1);

  // New transfer on Checking, categorized before Savings' statement arrives.
  await uploadCsvViaUi(
    page,
    "Checking",
    "Date,Description,Amount\n2026-06-01,Move to savings,-2000.00",
  );
  await page.goto("/transactions");
  const move = page
    .getByTestId("uncategorized-row")
    .filter({ has: page.getByRole("cell", { name: "Move to savings", exact: true }) });
  await move
    .locator('select[name="accountId"]')
    .selectOption({ label: "Savings (transfer)" });
  await move.getByRole("button", { name: "Categorize" }).click();
  await expect(page.getByTestId("categorized-row")).toHaveCount(2);
  await expect(page.getByTestId("matched-row")).toHaveCount(1); // no mirror yet

  // The Savings statement with the mirror arrives later.
  await uploadCsvViaUi(
    page,
    "Savings",
    "Date,Description,Amount\n2026-06-02,Incoming from checking,2000.00",
  );
  await expect(page.getByTestId("import-result")).toHaveText(
    /Imported 1 transaction, skipped 0 duplicates\. Matched 1 transfer\./,
  );
  await page.goto("/transactions");
  await expect(page.getByTestId("matched-row")).toHaveCount(2);
  // Only the dividend remains open.
  await expect(page.getByTestId("uncategorized-row")).toHaveCount(1);
  expect(await db.journalEntry.count()).toBe(2);
});
