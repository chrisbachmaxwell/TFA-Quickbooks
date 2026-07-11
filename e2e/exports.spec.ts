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

test("every statement's CSV download matches the rendered totals", async ({
  page,
}) => {
  const pnl = await page.request.get(
    "/reports/pnl/csv?from=2026-01-01&to=2026-12-31",
  );
  expect(pnl.ok()).toBe(true);
  expect(pnl.headers()["content-type"]).toContain("text/csv");
  const pnlText = await pnl.text();
  expect(pnlText).toContain("Total income,6200.00");
  expect(pnlText).toContain("Total expenses,875.50");
  expect(pnlText).toContain("Net income,5324.50");
  expect(pnlText).toContain("Legal & Professional,450.75");

  const bs = await page.request.get("/reports/balance-sheet/csv?asOf=2026-12-31");
  expect(await bs.text()).toContain("Total assets,15324.50");

  const tb = await page.request.get("/reports/trial-balance/csv?asOf=2026-12-31");
  expect(await tb.text()).toContain("Totals,16200.00,16200.00");

  const cf = await page.request.get(
    "/reports/cash-flow/csv?from=2026-01-01&to=2026-12-31",
  );
  const cfText = await cf.text();
  expect(cfText).toContain("Net change in cash,15324.50");
  expect(cfText).toContain("Cash at end of period,15324.50");

  const bad = await page.request.get("/reports/pnl/csv?from=2026-99-01");
  expect(bad.status()).toBe(400);
});

test("the P&L comparison shows previous period and change, aligned by account", async ({
  page,
}) => {
  await page.goto("/reports/pnl?from=2026-02-01&to=2026-02-28&compare=previous");
  await expect(page.getByTestId("pnl-comparison")).toBeVisible();
  await expect(page.getByTestId("total-income")).toHaveText("$1,200.00");
  await expect(page.getByTestId("total-income-prev")).toHaveText("$2,500.00");
  await expect(page.getByTestId("total-income-change")).toHaveText("-$1,300.00");
  await expect(page.getByTestId("net-income")).toHaveText("$1,185.00");
  await expect(page.getByTestId("net-income-prev")).toHaveText("$2,410.75");
  await expect(page.getByTestId("net-income-change")).toHaveText("-$1,225.75");
});

test("date presets set the range in one click", async ({ page }) => {
  await page.goto("/reports/pnl");
  const year = new Date().getUTCFullYear();
  await page
    .getByTestId("preset-links")
    .getByRole("link", { name: "Last year" })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`from=${year - 1}-01-01&to=${year - 1}-12-31`),
  );
  await page
    .getByTestId("preset-links")
    .getByRole("link", { name: "This year" })
    .click();
  await expect(page).toHaveURL(new RegExp(`from=${year}-01-01&to=${year}-12-31`));
  await expect(page.getByTestId("total-income")).toHaveText("$6,200.00");
});
