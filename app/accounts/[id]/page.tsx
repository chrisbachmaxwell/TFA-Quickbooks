import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { accountBalanceCents } from "@/lib/ledger";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) notFound();
  const lines = await prisma.journalLine.findMany({
    where: { accountId: id },
    include: {
      entry: {
        include: { lines: { include: { account: true } } },
      },
    },
  });
  lines.sort(
    (a, b) =>
      a.entry.date.getTime() - b.entry.date.getTime() ||
      a.entry.createdAt.getTime() - b.entry.createdAt.getTime(),
  );

  let running = 0;
  const rows = lines.map((line) => {
    running += accountBalanceCents(account.type, [line]);
    const others = [
      ...new Set(
        line.entry.lines
          .filter((l) => l.accountId !== id)
          .map((l) => l.account.name),
      ),
    ].join(", ");
    return { line, others, runningCents: running };
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{account.name} — register</h1>
          <p className="page-subtitle">
            Every posting that touched this account, with a running balance
            (in the account&apos;s normal direction).
          </p>
        </div>
      </div>

      <div className="card flush">
        <table data-testid="register-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Memo</th>
              <th>Other account(s)</th>
              <th className="amount">Debit</th>
              <th className="amount">Credit</th>
              <th className="amount">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No postings yet.
                </td>
              </tr>
            )}
            {rows.map(({ line, others, runningCents }) => (
              <tr key={line.id} data-testid="register-row">
                <td>{line.entry.date.toISOString().slice(0, 10)}</td>
                <td>{line.entry.memo}</td>
                <td>{others}</td>
                <td className="amount">
                  {line.debitCents > 0 ? formatCents(line.debitCents) : ""}
                </td>
                <td className="amount">
                  {line.creditCents > 0 ? formatCents(line.creditCents) : ""}
                </td>
                <td className="amount">{formatCents(runningCents)}</td>
              </tr>
            ))}
            <tr className="total">
              <td colSpan={5}>Ending balance</td>
              <td className="amount" data-testid="register-final-balance">
                {formatCents(running)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <Link href="/accounts">← Back to chart of accounts</Link>
      </p>
    </div>
  );
}
