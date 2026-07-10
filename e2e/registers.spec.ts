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

test("set up the fixture books", async ({ page }) => {
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

test("the checking register lists every posting with a correct running balance", async ({
  page,
}) => {
  await page.goto("/accounts");
  await page
    .locator('tr[data-name="TFA Checking"]')
    .getByRole("link", { name: "Register" })
    .click();
  await expect(page.getByTestId("register-row")).toHaveCount(8);
  await expect(page.getByTestId("register-final-balance")).toHaveText(
    "$15,324.50",
  );
  // Running balance after the first posting (dividend on Jan 5).
  const firstRow = page.getByTestId("register-row").first();
  await expect(firstRow).toContainText("2026-01-05");
  await expect(firstRow).toContainText("Dividend Income");
  await expect(firstRow.locator("td").last()).toHaveText("$2,500.00");
});

test("an income register runs in its normal (credit) direction", async ({
  page,
}) => {
  await page.goto("/accounts");
  await page
    .locator('tr[data-name="Dividend Income"]')
    .getByRole("link", { name: "Register" })
    .click();
  await expect(page.getByTestId("register-row")).toHaveCount(2);
  await expect(page.getByTestId("register-final-balance")).toHaveText(
    "$5,000.00",
  );
});

test("the trial balance totals match and equal 16,200.00", async ({ page }) => {
  await page.goto("/reports/trial-balance?asOf=2026-12-31");
  await expect(page.getByTestId("tb-total-debits")).toHaveText("$16,200.00");
  await expect(page.getByTestId("tb-total-credits")).toHaveText("$16,200.00");
  await expect(page.getByTestId("tb-check")).toContainText("Debits = Credits ✓");
});

test("the general ledger shows one section per touched account with period totals", async ({
  page,
}) => {
  await page.goto("/reports/general-ledger?from=2026-01-01&to=2026-12-31");
  await expect(page.getByTestId("gl-account")).toHaveCount(8);
  const statement = page.locator(".statement");
  await expect(statement).toContainText("Period totals — TFA Checking");
  await expect(statement).toContainText("Period totals — Dividend Income");
});

test("the reports hub links every report", async ({ page }) => {
  await page.goto("/reports");
  await expect(page.getByTestId("report-card")).toHaveCount(5);
  await page.getByRole("link", { name: "Trial balance" }).click();
  await expect(page).toHaveURL(/\/reports\/trial-balance$/);
});
