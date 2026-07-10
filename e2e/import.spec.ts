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

test("upload the sample statement and see every row as an uncategorized transaction", async ({
  page,
}) => {
  await createAccountViaUi(page, "TFA Checking", "Asset");
  await importFixtureViaUi(page, "TFA Checking");
  await expect(page.getByTestId("import-result")).toHaveText(
    /Imported 8 transactions, skipped 0 duplicates\./,
  );

  await page.goto("/transactions");
  const rows = page.getByTestId("uncategorized-row");
  await expect(rows).toHaveCount(8);

  // Spot-check data integrity: dates, descriptions (incl. a quoted comma), amounts.
  const dividend = rows.filter({ hasText: "Dividend - Acme Holdings" }).first();
  await expect(dividend).toContainText("2026-01-05");
  await expect(dividend).toContainText("$2,500.00");
  await expect(dividend).toContainText("TFA Checking");

  const legal = rows.filter({ hasText: "Legal fees, Smith & Co" });
  await expect(legal).toHaveCount(1);
  await expect(legal).toContainText("-$450.75");
});

test("re-uploading the same statement skips every row and creates no duplicates", async ({
  page,
}) => {
  await importFixtureViaUi(page, "TFA Checking");
  await expect(page.getByTestId("import-result")).toHaveText(
    /Imported 0 transactions, skipped 8 duplicates\./,
  );
  await page.goto("/transactions");
  await expect(page.getByTestId("uncategorized-row")).toHaveCount(8);
});

test("zero-amount rows are ignored with a visible count, not imported", async ({
  page,
}) => {
  await page.goto("/import");
  const form = page.getByTestId("import-form");
  await form.locator('input[name="file"]').setInputFiles({
    name: "with-zero.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Date,Description,Amount\n2026-05-01,Voided check,0.00\n2026-05-02,Real charge,-12.00",
    ),
  });
  await form.getByRole("button", { name: "Upload statement" }).click();
  await expect(page.getByTestId("import-result")).toHaveText(
    /Imported 1 transaction, skipped 0 duplicates\. Ignored 1 zero-amount row\./,
  );
  await page.goto("/transactions");
  await expect(
    page.getByTestId("uncategorized-row").filter({ hasText: "Voided check" }),
  ).toHaveCount(0);
  await expect(
    page.getByTestId("uncategorized-row").filter({ hasText: "Real charge" }),
  ).toHaveCount(1);
});

test("a broken CSV is rejected with a row-numbered error and imports nothing", async ({
  page,
}) => {
  await page.goto("/import");
  const form = page.getByTestId("import-form");
  await form.locator('input[name="file"]').setInputFiles({
    name: "broken.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Date,Description,Amount\n2026-05-01,ok,10.00\nnot-a-date,bad,5.00",
    ),
  });
  await form.getByRole("button", { name: "Upload statement" }).click();
  await expect(page.getByTestId("error-banner")).toContainText("Row 3");
  await page.goto("/transactions");
  // 8 fixture rows + 1 from the zero-amount test above; the broken file added none.
  await expect(page.getByTestId("uncategorized-row")).toHaveCount(9);
});
