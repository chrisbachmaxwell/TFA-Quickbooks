import { expect, test } from "@playwright/test";
import { db, importFixtureViaUi, resetDb } from "./helpers";

test.beforeAll(async () => {
  await resetDb();
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("an empty book offers starter accounts, exactly once", async ({ page }) => {
  await page.goto("/accounts");
  await page.getByTestId("starter-accounts").click(); // installs the default (holding) template
  const { templateById } = await import("../lib/coa-templates");
  const holding = templateById("holding")!;
  await expect(page.getByTestId("account-row")).toHaveCount(holding.accounts.length);
  // Checking is cash; Brokerage Investments is not.
  await expect(
    page.locator('tr[data-name="Checking"] .badge').filter({ hasText: "Cash" }),
  ).toHaveCount(1);
  await expect(
    page.locator('tr[data-name="Brokerage Investments"] .badge').filter({ hasText: "Cash" }),
  ).toHaveCount(0);
  await expect(page.getByTestId("starter-accounts")).toHaveCount(0);
});

test("a repeated payee arrives pre-selected with a suggestion hint", async ({
  page,
}) => {
  await importFixtureViaUi(page, "Checking");
  await page.goto("/transactions");

  const firstDividend = page
    .getByTestId("uncategorized-row")
    .filter({ hasText: "2026-01-05" });
  await expect(firstDividend.getByTestId("suggested-hint")).toHaveCount(0);
  await firstDividend
    .locator('select[name="accountId"]')
    .selectOption({ label: "Dividend Income (income)" });
  await firstDividend.getByRole("button", { name: "Categorize" }).click();
  await expect(page.getByTestId("categorized-row")).toHaveCount(1);

  // The March dividend has the same description — now suggested.
  const secondDividend = page
    .getByTestId("uncategorized-row")
    .filter({ hasText: "2026-03-01" });
  await expect(secondDividend.getByTestId("suggested-hint")).toBeVisible();
  await expect(
    secondDividend.locator('select[name="accountId"]'),
  ).toHaveValue(
    await secondDividend
      .locator('select[name="accountId"] option', { hasText: "Dividend Income" })
      .getAttribute("value")
      .then((v) => v ?? ""),
  );
  // One click finishes it.
  await secondDividend.getByRole("button", { name: "Categorize" }).click();
  await expect(page.getByTestId("categorized-row")).toHaveCount(2);

  // A description never seen before gets no hint.
  const contribution = page
    .getByTestId("uncategorized-row")
    .filter({ hasText: "2026-03-15" });
  await expect(contribution.getByTestId("suggested-hint")).toHaveCount(0);
});

test("bulk categorize posts every selected row in one action", async ({
  page,
}) => {
  await page.goto("/transactions");
  await expect(page.getByTestId("uncategorized-row")).toHaveCount(6);

  await page.getByLabel("Select Bank service fee").check();
  await page.getByLabel("Select Insurance premium").check();
  await page
    .getByTestId("bulk-form")
    .locator('select[name="accountId"]')
    .selectOption({ label: "Bank Fees (expense)" });
  await page.getByRole("button", { name: "Categorize selected" }).click();

  await expect(page.getByTestId("bulk-result")).toContainText(
    "Categorized 2 transactions",
  );
  await expect(page.getByTestId("uncategorized-row")).toHaveCount(4);
  await expect(page.getByTestId("categorized-row")).toHaveCount(4);

  // Both posted to Bank Fees, balanced.
  const lines = await db.journalLine.aggregate({
    _sum: { debitCents: true, creditCents: true },
  });
  expect(lines._sum.debitCents).toBe(lines._sum.creditCents);
});
