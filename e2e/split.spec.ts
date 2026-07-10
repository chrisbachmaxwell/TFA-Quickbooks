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

function insuranceRow(page: import("@playwright/test").Page) {
  return page
    .getByTestId("uncategorized-row")
    .filter({ has: page.getByRole("cell", { name: "Insurance premium", exact: true }) });
}

test("a transaction splits across two accounts into one balanced entry", async ({
  page,
}) => {
  await createAccountViaUi(page, "TFA Checking", "Asset");
  await createAccountViaUi(page, "Insurance", "Expense");
  await createAccountViaUi(page, "Office Expenses", "Expense");
  await importFixtureViaUi(page, "TFA Checking");

  await page.goto("/transactions");
  await insuranceRow(page).getByRole("link", { name: "Split" }).click();

  const form = page.getByTestId("split-form");
  await expect(page.getByTestId("split-remaining")).toContainText("320.50");
  await form
    .getByLabel("Account for split 1")
    .selectOption({ label: "Insurance (expense)" });
  await form.getByLabel("Amount for split 1").fill("200.50");
  await form
    .getByLabel("Account for split 2")
    .selectOption({ label: "Office Expenses (expense)" });
  await form.getByLabel("Amount for split 2").fill("120.00");
  await expect(page.getByTestId("split-remaining")).toContainText("$0.00");
  await form.getByRole("button", { name: "Post split" }).click();

  await expect(page).toHaveURL(/\/transactions$/);
  const categorized = page.getByTestId("categorized-row");
  await expect(categorized).toHaveCount(1);
  await expect(categorized.first()).toContainText("Split (2)");
  await expect(categorized.first()).toContainText("Insurance");
  await expect(categorized.first()).toContainText("Office Expenses");

  const entries = await db.journalEntry.findMany({ include: { lines: true } });
  expect(entries).toHaveLength(1);
  expect(entries[0].lines).toHaveLength(3);
  const debits = entries[0].lines.reduce((s, l) => s + l.debitCents, 0);
  const credits = entries[0].lines.reduce((s, l) => s + l.creditCents, 0);
  expect(debits).toBe(32050);
  expect(credits).toBe(32050);
});

test("the P&L shows each split part in its own account", async ({ page }) => {
  await page.goto("/reports/pnl?from=2026-01-01&to=2026-12-31");
  await expect(page.getByTestId("total-expenses")).toHaveText("$320.50");
  const statement = page.locator(".statement");
  await expect(statement).toContainText("Insurance");
  await expect(statement).toContainText("$200.50");
  await expect(statement).toContainText("Office Expenses");
  await expect(statement).toContainText("$120.00");
});

test("undo works on a split exactly like a simple categorization", async ({
  page,
}) => {
  await page.goto("/transactions");
  await page
    .getByTestId("categorized-row")
    .first()
    .getByRole("button", { name: "Undo" })
    .click();
  await expect(page.getByTestId("categorized-row")).toHaveCount(0);
  await expect(insuranceRow(page)).toHaveCount(1);
  expect(await db.journalEntry.count()).toBe(0);
  expect(await db.journalLine.count()).toBe(0);
});

test("a split that doesn't add up is rejected server-side and writes nothing", async ({
  page,
}) => {
  await page.goto("/transactions");
  await insuranceRow(page).getByRole("link", { name: "Split" }).click();
  const form = page.getByTestId("split-form");
  await form
    .getByLabel("Account for split 1")
    .selectOption({ label: "Insurance (expense)" });
  await form.getByLabel("Amount for split 1").fill("200.00");
  await form.getByRole("button", { name: "Post split" }).click();

  await expect(page.getByTestId("error-banner")).toContainText("add up");
  expect(await db.journalEntry.count()).toBe(0);

  await page.goto("/transactions");
  await expect(insuranceRow(page)).toHaveCount(1);
});
