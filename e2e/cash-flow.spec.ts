import { expect, test } from "@playwright/test";
import {
  categorizeAllViaUi,
  createAccountViaUi,
  db,
  importFixtureViaUi,
  resetDb,
} from "./helpers";

const CATEGORY_MAP: Record<string, { account: string; type: string }> = {
  "Dividend - Acme Holdings": { account: "Dividend Income", type: "income" },
  "Consulting income - Beta LLC": { account: "Consulting Income", type: "income" },
  "Office Supplies Co": { account: "Office Expenses", type: "expense" },
  "Bank service fee": { account: "Bank Fees", type: "expense" },
  "Legal fees, Smith & Co": { account: "Legal & Professional", type: "expense" },
  "Owner contribution": { account: "Owner Contributions", type: "equity" },
  "Insurance premium": { account: "Insurance", type: "expense" },
};

test.beforeAll(async () => {
  await resetDb();
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("cash accounts are flagged; only they accept statement imports", async ({
  page,
}) => {
  await createAccountViaUi(page, "TFA Checking", "Asset"); // cash by default
  await createAccountViaUi(page, "Brokerage Holdings", "Asset", { cash: false });

  await page.goto("/accounts");
  const checkingBadges = page.locator('tr[data-name="TFA Checking"] .badge');
  await expect(checkingBadges.filter({ hasText: "Cash" })).toHaveCount(1);
  await expect(
    page.locator('tr[data-name="Brokerage Holdings"] .badge').filter({ hasText: "Cash" }),
  ).toHaveCount(0);

  await page.goto("/import");
  const options = page.locator('select[name="bankAccountId"] option');
  await expect(options.filter({ hasText: "TFA Checking" })).toHaveCount(1);
  await expect(options.filter({ hasText: "Brokerage Holdings" })).toHaveCount(0);
});

test("full year cash flow matches the hand-computed fixture", async ({
  page,
}) => {
  await createAccountViaUi(page, "Dividend Income", "Income");
  await createAccountViaUi(page, "Consulting Income", "Income");
  await createAccountViaUi(page, "Office Expenses", "Expense");
  await createAccountViaUi(page, "Bank Fees", "Expense");
  await createAccountViaUi(page, "Legal & Professional", "Expense");
  await createAccountViaUi(page, "Insurance", "Expense");
  await createAccountViaUi(page, "Owner Contributions", "Equity");
  await importFixtureViaUi(page, "TFA Checking");
  await categorizeAllViaUi(page, CATEGORY_MAP);

  await page.goto("/reports/cash-flow?from=2026-01-01&to=2026-12-31");
  await expect(page.getByTestId("cf-operating")).toHaveText("$5,324.50");
  await expect(page.getByTestId("cf-investing")).toHaveText("$0.00");
  await expect(page.getByTestId("cf-financing")).toHaveText("$10,000.00");
  await expect(page.getByTestId("cf-net-change")).toHaveText("$15,324.50");
  await expect(page.getByTestId("cf-beginning")).toHaveText("$0.00");
  await expect(page.getByTestId("cf-ending")).toHaveText("$15,324.50");
});

test("sub-period beginning cash carries over and ending reconciles with the balance sheet", async ({
  page,
}) => {
  await page.goto("/reports/cash-flow?from=2026-02-01&to=2026-02-28");
  await expect(page.getByTestId("cf-beginning")).toHaveText("$2,410.75");
  await expect(page.getByTestId("cf-net-change")).toHaveText("$1,185.00");
  await expect(page.getByTestId("cf-ending")).toHaveText("$3,595.75");

  await page.goto("/reports/balance-sheet?asOf=2026-02-28");
  await expect(page.getByTestId("total-assets")).toHaveText("$3,595.75");
});

test("invalid dates error instead of rendering an empty statement", async ({
  page,
}) => {
  await page.goto("/reports/cash-flow?from=2026-99-01&to=2026-12-31");
  await expect(page.getByTestId("error-banner")).toContainText("not a valid date");
  await expect(page.getByTestId("cf-ending")).toHaveCount(0);
});
