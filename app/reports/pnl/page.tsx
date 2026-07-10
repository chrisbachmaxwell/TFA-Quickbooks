import { profitAndLoss } from "@/lib/ledger";
import { loadLedger } from "@/lib/reports";
import { formatCents } from "@/lib/money";
import { parseIsoDateStrict, todayUtc } from "@/lib/dates";

export const dynamic = "force-dynamic";

function reportError(message: string) {
  return (
    <div>
      <h1>Profit &amp; loss</h1>
      <div className="banner error" data-testid="error-banner">
        {message}
      </div>
    </div>
  );
}

export default async function ProfitAndLossPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const today = todayUtc();
  const startOfYear = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  const from = params.from ? parseIsoDateStrict(params.from) : startOfYear;
  const to = params.to ? parseIsoDateStrict(params.to) : today;
  if (from === null || to === null) {
    return reportError(
      `"${from === null ? params.from : params.to}" is not a valid date — use YYYY-MM-DD.`,
    );
  }
  if (from.getTime() > to.getTime()) {
    return reportError("The from date is after the to date.");
  }
  const { accounts, lines } = await loadLedger();
  const report = profitAndLoss(accounts, lines, from, to);

  return (
    <div>
      <h1>Profit &amp; loss</h1>
      <form method="get" className="inline">
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

      <h2>Income</h2>
      <table>
        <tbody>
          {report.income.rows.map((row) => (
            <tr key={row.account.id}>
              <td>{row.account.name}</td>
              <td className="amount">{formatCents(row.balanceCents)}</td>
            </tr>
          ))}
          <tr className="total">
            <td>Total income</td>
            <td className="amount" data-testid="total-income">
              {formatCents(report.income.totalCents)}
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Expenses</h2>
      <table>
        <tbody>
          {report.expenses.rows.map((row) => (
            <tr key={row.account.id}>
              <td>{row.account.name}</td>
              <td className="amount">{formatCents(row.balanceCents)}</td>
            </tr>
          ))}
          <tr className="total">
            <td>Total expenses</td>
            <td className="amount" data-testid="total-expenses">
              {formatCents(report.expenses.totalCents)}
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Net income</h2>
      <table>
        <tbody>
          <tr className="total">
            <td>Net income</td>
            <td className="amount" data-testid="net-income">
              {formatCents(report.netIncomeCents)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
