import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { categorize, setExcluded, uncategorize } from "./actions";

export const dynamic = "force-dynamic";

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function Amount({ cents }: { cents: number }) {
  return (
    <td className={`amount${cents > 0 ? " amount-pos" : ""}`}>
      {formatCents(cents)}
    </td>
  );
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

  const uncategorized = transactions.filter(
    (t) => !t.journalEntryId && !t.excluded,
  );
  const categorized = transactions.filter((t) => t.journalEntryId);
  const excluded = transactions.filter((t) => t.excluded);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Review transactions</h1>
          <p className="page-subtitle">
            Assign each imported bank line to an account — that posting is what
            builds your reports.
          </p>
        </div>
      </div>

      {error && (
        <div className="banner error" data-testid="error-banner">
          {error}
        </div>
      )}

      {transactions.length === 0 && (
        <div className="card empty-state">
          <div className="glyph">🏦</div>
          <p>
            <strong>Nothing here yet.</strong>
          </p>
          <p>
            <Link href="/import">Import a bank statement</Link> to get started.
          </p>
        </div>
      )}

      <h2>For review ({uncategorized.length})</h2>
      <div className="card flush">
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
                  Nothing waiting for review. ✨
                </td>
              </tr>
            )}
            {uncategorized.map((t) => (
              <tr key={t.id} data-testid="uncategorized-row">
                <td>{isoDate(t.date)}</td>
                <td>{t.description}</td>
                <Amount cents={t.amountCents} />
                <td>{t.bankAccount.name}</td>
                <td>
                  <form action={categorize} className="inline">
                    <input type="hidden" name="transactionId" value={t.id} />
                    <select
                      name="accountId"
                      required
                      defaultValue=""
                      aria-label={`Category for ${t.description}`}
                    >
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
                  </form>{" "}
                  <form action={setExcluded} className="inline">
                    <input type="hidden" name="transactionId" value={t.id} />
                    <input type="hidden" name="excluded" value="true" />
                    <button type="submit" className="secondary">
                      Exclude
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Categorized ({categorized.length})</h2>
      <div className="card flush">
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
                  <Amount cents={t.amountCents} />
                  <td>{t.bankAccount.name}</td>
                  <td>
                    {categoryLine?.account.name ?? "?"}{" "}
                    <form action={uncategorize} className="inline">
                      <input type="hidden" name="transactionId" value={t.id} />
                      <button type="submit" className="secondary">
                        Undo
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>Excluded ({excluded.length})</h2>
      <div className="card flush">
        <table data-testid="excluded-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th className="amount">Amount</th>
              <th>Bank account</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {excluded.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  Nothing excluded. Exclude statement rows that don&apos;t
                  belong in the books (personal spend, bank artifacts).
                </td>
              </tr>
            )}
            {excluded.map((t) => (
              <tr key={t.id} data-testid="excluded-row">
                <td>{isoDate(t.date)}</td>
                <td>{t.description}</td>
                <Amount cents={t.amountCents} />
                <td>{t.bankAccount.name}</td>
                <td>
                  <form action={setExcluded} className="inline">
                    <input type="hidden" name="transactionId" value={t.id} />
                    <input type="hidden" name="excluded" value="false" />
                    <button type="submit" className="secondary">
                      Restore
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
