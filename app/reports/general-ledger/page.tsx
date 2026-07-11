import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { parseIsoDateStrict, todayUtc } from "@/lib/dates";
import PresetLinks from "../preset-links";

export const dynamic = "force-dynamic";

export default async function GeneralLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const today = todayUtc();
  const startOfYear = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  const from = params.from ? parseIsoDateStrict(params.from) : startOfYear;
  const to = params.to ? parseIsoDateStrict(params.to) : today;
  if (from === null || to === null || from.getTime() > to.getTime()) {
    return (
      <div>
        <h1>General ledger</h1>
        <div className="banner error" data-testid="error-banner">
          Invalid date range — use YYYY-MM-DD with from ≤ to.
        </div>
      </div>
    );
  }
  const accounts = await prisma.account.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      lines: {
        where: { entry: { is: { date: { gte: from, lte: to } } } },
        include: { entry: true },
      },
    },
  });
  const active = accounts.filter((a) => a.lines.length > 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>General ledger</h1>
          <p className="page-subtitle">
            Every posting in the period, account by account.
          </p>
        </div>
      </div>

      <form method="get" className="report-controls">
        <label>
          From{" "}
          <input
            type="date"
            name="from"
            defaultValue={from.toISOString().slice(0, 10)}
          />
        </label>
        <label>
          to{" "}
          <input
            type="date"
            name="to"
            defaultValue={to.toISOString().slice(0, 10)}
          />
        </label>
        <button type="submit">Run report</button>
      </form>
      <PresetLinks basePath="/reports/general-ledger" />

      <div className="statement">
        <div className="statement-header">
          <p className="statement-company">TFA</p>
          <p className="statement-title">General Ledger</p>
          <p className="statement-dates">
            {from.toISOString().slice(0, 10)} – {to.toISOString().slice(0, 10)}
          </p>
        </div>
        {active.length === 0 && (
          <p className="muted" style={{ textAlign: "center" }}>
            No postings in this period.
          </p>
        )}
        <table>
          <tbody>
            {active.map((account) => {
              const sorted = [...account.lines].sort(
                (a, b) => a.entry.date.getTime() - b.entry.date.getTime(),
              );
              const debits = sorted.reduce((s, l) => s + l.debitCents, 0);
              const credits = sorted.reduce((s, l) => s + l.creditCents, 0);
              return (
                <FragmentRows
                  key={account.id}
                  name={account.name}
                  rows={sorted.map((l) => ({
                    id: l.id,
                    date: l.entry.date.toISOString().slice(0, 10),
                    memo: l.entry.memo,
                    debitCents: l.debitCents,
                    creditCents: l.creditCents,
                  }))}
                  debits={debits}
                  credits={credits}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentRows({
  name,
  rows,
  debits,
  credits,
}: {
  name: string;
  rows: Array<{
    id: string;
    date: string;
    memo: string;
    debitCents: number;
    creditCents: number;
  }>;
  debits: number;
  credits: number;
}) {
  return (
    <>
      <tr className="section-head" data-testid="gl-account">
        <td>{name}</td>
        <td></td>
        <td></td>
      </tr>
      {rows.map((row) => (
        <tr className="line" key={row.id}>
          <td>
            {row.date} · {row.memo}
          </td>
          <td className="amount">
            {row.debitCents > 0 ? formatCents(row.debitCents) : ""}
          </td>
          <td className="amount">
            {row.creditCents > 0 ? formatCents(row.creditCents) : ""}
          </td>
        </tr>
      ))}
      <tr className="total">
        <td>Period totals — {name}</td>
        <td className="amount">{formatCents(debits)}</td>
        <td className="amount">{formatCents(credits)}</td>
      </tr>
    </>
  );
}
