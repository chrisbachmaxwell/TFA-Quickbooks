import path from "path";
import { PrismaClient } from "@prisma/client";
import { expect, type Page } from "@playwright/test";

export const db = new PrismaClient();

export const FIXTURE_CSV = path.join(
  __dirname,
  "..",
  "fixtures",
  "sample-bank-statement.csv",
);

/** Wipes all ledger data so each spec starts from an empty book. */
export async function resetDb(): Promise<void> {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "JournalLine", "JournalEntry", "BankTransaction", "Account" CASCADE',
  );
}

export type AccountTypeLabel =
  | "Asset"
  | "Liability"
  | "Equity"
  | "Income"
  | "Expense";

export async function createAccountViaUi(
  page: Page,
  name: string,
  type: AccountTypeLabel,
  opts: { cash?: boolean } = {},
): Promise<void> {
  await page.goto("/accounts");
  const form = page.getByTestId("new-account-form");
  await form.locator('input[name="name"]').fill(name);
  await form.locator('select[name="type"]').selectOption({ label: type });
  await form.locator('input[name="cash"]').setChecked(opts.cash ?? true);
  await form.getByRole("button", { name: "Create account" }).click();
  await expect(accountRow(page, name)).toBeVisible();
}

export function accountRow(page: Page, name: string) {
  return page.locator(`tr[data-testid="account-row"][data-name="${name}"]`);
}

export async function importFixtureViaUi(
  page: Page,
  bankAccountName: string,
): Promise<void> {
  await page.goto("/import");
  const form = page.getByTestId("import-form");
  await form
    .locator('select[name="bankAccountId"]')
    .selectOption({ label: bankAccountName });
  await form.locator('input[name="file"]').setInputFiles(FIXTURE_CSV);
  await form.getByRole("button", { name: "Upload statement" }).click();
  await expect(page.getByTestId("import-result")).toBeVisible();
}

export async function uploadCsvViaUi(
  page: Page,
  bankAccountName: string,
  csvContent: string,
): Promise<void> {
  await page.goto("/import");
  const form = page.getByTestId("import-form");
  await form
    .locator('select[name="bankAccountId"]')
    .selectOption({ label: bankAccountName });
  await form.locator('input[name="file"]').setInputFiles({
    name: "statement.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csvContent),
  });
  await form.getByRole("button", { name: "Upload statement" }).click();
  await expect(page.getByTestId("import-result")).toBeVisible();
}

/**
 * Categorizes every uncategorized transaction via the UI, mapping statement
 * descriptions to account names. Fails if a description has no mapping.
 */
export async function categorizeAllViaUi(
  page: Page,
  mapping: Record<string, { account: string; type: string }>,
): Promise<void> {
  await page.goto("/transactions");
  for (;;) {
    const rows = page.getByTestId("uncategorized-row");
    const count = await rows.count();
    if (count === 0) break;
    const row = rows.first();
    // td 0 is the bulk checkbox, td 1 the date, td 2 the description
    const description = (await row.locator("td").nth(2).innerText()).trim();
    const target = mapping[description];
    if (!target) throw new Error(`no category mapping for "${description}"`);
    await row
      .locator('select[name="accountId"]')
      .selectOption({ label: `${target.account} (${target.type})` });
    await row.getByRole("button", { name: "Categorize" }).click();
    await expect(rows).toHaveCount(count - 1);
  }
}
