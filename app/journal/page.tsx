import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { todayUtc } from "@/lib/dates";
import EntryForm from "./entry-form";
import { removeManualEntry } from "./actions";

export const dynamic = "force-dynamic";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [entries, accounts] = await Promise.all([
    prisma.journalEntry.findMany({
      include: {
        lines: { include: { account: true } },
        bankTransaction: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.account.findMany({
      where: { active: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Journal entries</h1>
          <p className="page-subtitle">
            The raw ledger — every posting, whether it came from a bank
            statement or was entered by hand.
          </p>
        </div>
      </div>

      {error && (
        <div className="banner error" data-testid="error-banner">
          {error}
        </div>
      )}

      <div className="card">
        <p className="card-title">New manual entry</p>
        <EntryForm
          accounts={accounts.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
          }))}
          today={todayUtc().toISOString().slice(0, 10)}
        />
      </div>

      <h2>All entries ({entries.length})</h2>
      <div className="card flush">
        <table data-testid="journal-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Memo</th>
              <th>Lines</th>
              <th>Source</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No entries posted yet.
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.id} data-testid="journal-row">
                <td>{entry.date.toISOString().slice(0, 10)}</td>
                <td>{entry.memo}</td>
                <td>
                  {entry.lines.map((line) => (
                    <div key={line.id} style={{ whiteSpace: "nowrap" }}>
                      {line.account.name}{" "}
                      <span className="muted">
                        {line.debitCents > 0
                          ? `Dr ${formatCents(line.debitCents)}`
                          : `Cr ${formatCents(line.creditCents)}`}
                      </span>
                    </div>
                  ))}
                </td>
                <td>
                  <span
                    className={`badge ${entry.bankTransaction ? "asset" : "equity"}`}
                  >
                    {entry.bankTransaction ? "Bank" : "Manual"}
                  </span>
                </td>
                <td>
                  {!entry.bankTransaction && (
                    <form action={removeManualEntry} className="inline">
                      <input type="hidden" name="entryId" value={entry.id} />
                      <button type="submit" className="secondary">
                        Delete
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
