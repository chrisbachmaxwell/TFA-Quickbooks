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

test("the app shell has a sidebar with grouped navigation and an active state", async ({
  page,
}) => {
  await page.goto("/");
  const sidebar = page.getByTestId("sidebar");
  await expect(sidebar).toBeVisible();
  await expect(sidebar).toContainText("TFA Books");
  await expect(sidebar).toContainText("Banking");
  await expect(sidebar).toContainText("Accounting");
  await expect(sidebar).toContainText("Reports");
  await expect(page.locator(".nav-link.active")).toHaveText(/Dashboard/);

  await sidebar.getByRole("link", { name: "Chart of accounts" }).click();
  await expect(page).toHaveURL(/\/accounts$/);
  await expect(page.locator(".nav-link.active")).toHaveText(/Chart of accounts/);
});

test("after an import, the dashboard prompts review and shows zero posted balances", async ({
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

  await page.goto("/");
  await expect(page.getByTestId("review-callout")).toContainText(
    "8 transactions waiting for review",
  );
  await expect(page.getByTestId("kpi-cash")).toHaveText("$0.00");
  await expect(page.getByTestId("kpi-income")).toHaveText("$0.00");
});

test("after categorizing, KPI tiles match the hand-computed fixture totals", async ({
  page,
}) => {
  await categorizeAllViaUi(page, CATEGORY_MAP);

  await page.goto("/");
  await expect(page.getByTestId("review-callout")).toHaveCount(0);
  await expect(page.getByTestId("kpi-cash")).toHaveText("$15,324.50");
  await expect(page.getByTestId("kpi-income")).toHaveText("$6,200.00");
  await expect(page.getByTestId("kpi-expenses")).toHaveText("$875.50");
  await expect(page.getByTestId("kpi-net")).toHaveText("$5,324.50");
});

test("the monthly chart renders bars for exactly the months with activity", async ({
  page,
}) => {
  await page.goto("/");
  const chart = page.getByTestId("monthly-chart");
  await expect(chart).toBeVisible();
  await expect(chart).toContainText("Income");
  await expect(chart).toContainText("Expenses");
  // Fixture: income in Jan/Feb/Mar; expenses in Jan/Feb/Mar/Apr.
  await expect(chart.locator('[data-bar="income"]')).toHaveCount(3);
  await expect(chart.locator('[data-bar="expense"]')).toHaveCount(4);
});
