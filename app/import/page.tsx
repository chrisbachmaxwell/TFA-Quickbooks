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
      <div className="page-header">
        <div>
          <h1>Import a bank statement</h1>
          <p className="page-subtitle">
            Upload a CSV export from your bank — every line becomes a
            transaction waiting for review.
          </p>
        </div>
      </div>

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

      {bankAccounts.length === 0 ? (
        <div className="card empty-state">
          <div className="glyph">🏦</div>
          <p>
            <strong>First, tell us where this money lives.</strong>
          </p>
          <p>
            Create an <strong>Asset</strong> account for your bank on the{" "}
            <Link href="/accounts">chart of accounts</Link> page, then come
            back here.
          </p>
        </div>
      ) : (
        <div className="card">
          <p className="card-title">Upload statement</p>
          <form action={uploadStatement} data-testid="import-form">
            <p>
              <label>
                Bank account{" "}
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
                Statement CSV{" "}
                <input type="file" name="file" accept=".csv,text/csv" required />
              </label>
            </p>
            <button type="submit">Upload statement</button>
          </form>
          <p className="muted" style={{ marginBottom: 0 }}>
            Needs a header line with <code>Date</code>, <code>Description</code>,
            and <code>Amount</code> columns (positive = money in, negative =
            money out). Rows you already imported are skipped automatically, so
            overlapping statements are safe.
          </p>
        </div>
      )}
    </div>
  );
}
