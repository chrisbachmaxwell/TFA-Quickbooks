import { expect, test } from "@playwright/test";
import { templateById } from "../lib/coa-templates";
import { db, resetDb } from "./helpers";

test.beforeAll(async () => {
  await resetDb();
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("an empty book installs a full template from the picker", async ({
  page,
}) => {
  const smallBiz = templateById("small-business")!;
  await page.goto("/accounts");
  await page
    .getByLabel("Chart of accounts template")
    .selectOption({ label: `${smallBiz.name} (${smallBiz.accounts.length} accounts)` });
  await page.getByTestId("starter-accounts").click();

  await expect(page.getByTestId("account-row")).toHaveCount(
    smallBiz.accounts.length,
  );
  await expect(
    page.locator('tr[data-name="Accounts Receivable"] .badge').filter({ hasText: "Asset" }),
  ).toHaveCount(1);
  await expect(
    page.locator('tr[data-name="Checking"] .badge').filter({ hasText: "Cash" }),
  ).toHaveCount(1);
});

test("suggested accounts shows only what's missing from the chosen template", async ({
  page,
}) => {
  const holding = templateById("holding")!;
  await page.goto("/accounts?suggest=holding");
  const card = page.getByTestId("suggested-card");
  await expect(card).toBeVisible();

  // Overlap between small-business and holding exists (Checking, Bank Fees…),
  // so the missing list must be strictly smaller than the whole template.
  const rows = page.getByTestId("suggested-row");
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThan(holding.accounts.length);
  await expect(rows.filter({ hasText: "Dividend Income" })).toHaveCount(1);
  await expect(rows.filter({ hasText: "Checking" })).toHaveCount(0); // already present
});

test("adding one suggested account removes it from the list and adds the row", async ({
  page,
}) => {
  await page.goto("/accounts?suggest=holding");
  const before = await page.getByTestId("suggested-row").count();
  await page
    .getByTestId("suggested-row")
    .filter({ hasText: "Dividend Income" })
    .getByRole("button", { name: "Add" })
    .click();
  await expect(page.getByTestId("suggested-row")).toHaveCount(before - 1);
  await expect(page.locator('tr[data-name="Dividend Income"]')).toHaveCount(1);
});

test("add-all-missing empties the suggestions for that template", async ({
  page,
}) => {
  await page.goto("/accounts?suggest=holding");
  await page.getByTestId("add-all-missing").click();
  // The action redirects to /accounts (no query) — wait for it so the
  // navigation below can't cancel the in-flight install.
  await expect(page).toHaveURL(/\/accounts$/);
  await page.goto("/accounts?suggest=holding");
  await expect(page.getByTestId("suggestions-empty")).toBeVisible();
  await expect(page.getByTestId("suggested-row")).toHaveCount(0);

  // The install skipped what existed: no duplicate names were created.
  const names = (await db.account.findMany()).map((a) => a.name.toLowerCase());
  expect(new Set(names).size).toBe(names.length);
});
