import Link from "next/link";
import { prisma } from "@/lib/db";
import { uploadStatement } from "./actions";

export const dynamic = "force-dynamic";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    imported?: string;
    skipped?: string;
    zeros?: string;
  }>;
}) {
  const { error, imported, skipped, zeros } = await searchParams;
  const bankAccounts = await prisma.account.findMany({
    where: { type: "ASSET", active: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1>Import a bank statement</h1>
      {error && (
        <div className="banner error" data-testid="error-banner">
          {error}
        </div>
      )}
      {imported !== undefined && (
        <div className="banner success" data-testid="import-result">
          Imported {imported} transaction{imported === "1" ? "" : "s"}, skipped{" "}
          {skipped} duplicate{skipped === "1" ? "" : "s"}.
          {zeros !== undefined && zeros !== "0"
            ? ` Ignored ${zeros} zero-amount row${zeros === "1" ? "" : "s"}.`
            : ""}{" "}
          <Link href="/transactions">View transactions</Link>
        </div>
      )}

      <div className="card">
        <p>
          Upload a CSV with a header line and <code>Date</code>,{" "}
          <code>Description</code>, and <code>Amount</code> columns (positive =
          money in, negative = money out). Rows you already imported are
          skipped automatically.
        </p>
        {bankAccounts.length === 0 ? (
          <p className="muted">
            First create an <strong>Asset</strong> account for your bank on the{" "}
            <Link href="/accounts">chart of accounts</Link> page.
          </p>
        ) : (
          <form action={uploadStatement} data-testid="import-form">
            <p>
              <label>
                Bank account:{" "}
                <select name="bankAccountId" required>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>
            </p>
            <p>
              <label>
                Statement CSV: <input type="file" name="file" accept=".csv,text/csv" required />
              </label>
            </p>
            <button type="submit">Upload statement</button>
          </form>
        )}
      </div>
    </div>
  );
}
