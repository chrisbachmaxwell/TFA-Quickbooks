import { expect, test } from "@playwright/test";
import {
  categorizeAllViaUi,
  createAccountViaUi,
  db,
  importFixtureViaUi,
  resetDb,
} from "./helpers";

// Hand-computed from fixtures/sample-bank-statement.csv (mirrored by the
// unit tests in lib/reports.spec.ts):
//   income  = 2,500 + 1,200 + 2,500            =  6,200.00
//   expense = 89.25 + 15 + 450.75 + 320.50     =    875.50
//   equity contribution                        = 10,000.00
//   checking = 6,200 - 875.50 + 10,000         = 15,324.50
// Through 2026-02-28: income 3,700.00, expenses 104.25, net 3,595.75.

const CATEGORY_MAP: Record<string, { account: string; type: string }> = {
  "Dividend - Acme Holdings": { account: "Dividend Income", type: "income" },
  "Consulting income - Beta LLC": {
    account: "Consulting Income",
    type: "income",
  },
  "Office Supplies Co": { account: "Office Expenses", type: "expense" },
  "Bank service fee": { account: "Bank Fees", type: "expense" },
  "Legal fees, Smith & Co": {
    account: "Legal & Professional",
    type: "expense",
  },
  "Owner contribution": { account: "Owner Contributions", type: "equity" },
  "Insurance premium": { account: "Insurance", type: "expense" },
};

test.beforeAll(async () => {
  await resetDb();
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("full user flow: accounts → import → categorize everything", async ({
  page,
}) => {
  await createAccountViaUi(page, "TFA Checking", "Asset");
  await createAccountViaUi(page, "Dividend Income", "Income");
  await createAccountViaUi(page, "Consulting Income", "Income");
  await createAccountViaUi(page, "Office Expenses", "Expense");
  await createAccountViaUi(page, "Bank Fees", "Expense");
  await createAccountViaUi(page, "Legal & Professional", "Expense");
  await createAccountViaUi(page, "Insurance", "Expense");
  await createAccountViaUi(page, "Owner Contributions", "Equity");
  await importFixtureViaUi(page, "TFA Checking");
  await categorizeAllViaUi(page, CATEGORY_MAP);
  await expect(page.getByTestId("categorized-row")).toHaveCount(8);
});

test("balance sheet balances and matches the hand-computed totals", async ({
  page,
}) => {
  await page.goto("/reports/balance-sheet?asOf=2026-12-31");
  await expect(page.getByTestId("total-assets")).toHaveText("$15,324.50");
  await expect(page.getByTestId("total-liabilities")).toHaveText("$0.00");
  await expect(page.getByTestId("retained-earnings")).toHaveText("$5,324.50");
  await expect(page.getByTestId("total-liabilities-equity")).toHaveText(
    "$15,324.50",
  );
  await expect(page.getByTestId("balance-check")).toContainText(
    "Assets = Liabilities + Equity ✓",
  );
});

test("balance sheet respects the as-of date", async ({ page }) => {
  await page.goto("/reports/balance-sheet?asOf=2026-02-28");
  await expect(page.getByTestId("total-assets")).toHaveText("$3,595.75");
  await expect(page.getByTestId("total-liabilities-equity")).toHaveText(
    "$3,595.75",
  );
  await expect(page.getByTestId("balance-check")).toContainText("✓");
});

test("P&L over the full year matches the hand-computed totals", async ({
  page,
}) => {
  await page.goto("/reports/pnl?from=2026-01-01&to=2026-12-31");
  await expect(page.getByTestId("total-income")).toHaveText("$6,200.00");
  await expect(page.getByTestId("total-expenses")).toHaveText("$875.50");
  await expect(page.getByTestId("net-income")).toHaveText("$5,324.50");
});

test("P&L respects the date range", async ({ page }) => {
  await page.goto("/reports/pnl?from=2026-01-01&to=2026-02-28");
  await expect(page.getByTestId("total-income")).toHaveText("$3,700.00");
  await expect(page.getByTestId("total-expenses")).toHaveText("$104.25");
  await expect(page.getByTestId("net-income")).toHaveText("$3,595.75");
});

test("an impossible as-of date shows an error, not an empty balanced report", async ({
  page,
}) => {
  await page.goto("/reports/balance-sheet?asOf=2026-99-99");
  await expect(page.getByTestId("error-banner")).toContainText(
    "not a valid date",
  );
  await expect(page.getByTestId("balance-check")).toHaveCount(0);
});

test("a P&L with from after to shows an error instead of an empty report", async ({
  page,
}) => {
  await page.goto("/reports/pnl?from=2026-06-01&to=2026-01-01");
  await expect(page.getByTestId("error-banner")).toContainText(
    "from date is after",
  );
  await expect(page.getByTestId("net-income")).toHaveCount(0);
});
