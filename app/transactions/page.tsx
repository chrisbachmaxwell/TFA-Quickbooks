import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { categorize } from "./actions";

export const dynamic = "force-dynamic";

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [transactions, accounts] = await Promise.all([
    prisma.bankTransaction.findMany({
      include: {
        bankAccount: true,
        journalEntry: { include: { lines: { include: { account: true } } } },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.account.findMany({
      where: { active: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ]);

  const uncategorized = transactions.filter((t) => !t.journalEntryId);
  const categorized = transactions.filter((t) => t.journalEntryId);

  return (
    <div>
      <h1>Transactions</h1>
      {error && (
        <div className="banner error" data-testid="error-banner">
          {error}
        </div>
      )}
      {transactions.length === 0 && (
        <p className="muted">
          Nothing here yet — <Link href="/import">import a bank statement</Link>{" "}
          first.
        </p>
      )}

      <h2>Uncategorized ({uncategorized.length})</h2>
      <table data-testid="uncategorized-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th className="amount">Amount</th>
            <th>Bank account</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          {uncategorized.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                Nothing waiting to be categorized.
              </td>
            </tr>
          )}
          {uncategorized.map((t) => (
            <tr key={t.id} data-testid="uncategorized-row">
              <td>{isoDate(t.date)}</td>
              <td>{t.description}</td>
              <td className="amount">{formatCents(t.amountCents)}</td>
              <td>{t.bankAccount.name}</td>
              <td>
                <form action={categorize} className="inline">
                  <input type="hidden" name="transactionId" value={t.id} />
                  <select name="accountId" required defaultValue="" aria-label={`Category for ${t.description}`}>
                    <option value="" disabled>
                      Pick an account…
                    </option>
                    {accounts
                      .filter((a) => a.id !== t.bankAccountId)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.type.toLowerCase()})
                        </option>
                      ))}
                  </select>
                  <button type="submit">Categorize</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Categorized ({categorized.length})</h2>
      <table data-testid="categorized-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th className="amount">Amount</th>
            <th>Bank account</th>
            <th>Categorized to</th>
          </tr>
        </thead>
        <tbody>
          {categorized.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                Nothing categorized yet.
              </td>
            </tr>
          )}
          {categorized.map((t) => {
            const categoryLine = t.journalEntry?.lines.find(
              (l) => l.accountId !== t.bankAccountId,
            );
            return (
              <tr key={t.id} data-testid="categorized-row">
                <td>{isoDate(t.date)}</td>
                <td>{t.description}</td>
                <td className="amount">{formatCents(t.amountCents)}</td>
                <td>{t.bankAccount.name}</td>
                <td>{categoryLine?.account.name ?? "?"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
