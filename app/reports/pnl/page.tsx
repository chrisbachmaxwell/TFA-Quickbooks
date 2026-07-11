import { profitAndLoss, type ReportSection } from "@/lib/ledger";
import { loadLedger } from "@/lib/reports";
import { formatCents } from "@/lib/money";
import { parseIsoDateStrict, todayUtc } from "@/lib/dates";
import { comparePnl, previousPeriod, type ComparisonRow } from "@/lib/comparison";
import PresetLinks from "../preset-links";

export const dynamic = "force-dynamic";

function prettyDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

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

function SectionRows({ section }: { section: ReportSection }) {
  return (
    <>
      {section.rows.map((row) => (
        <tr className="line" key={row.account.id}>
          <td>{row.account.name}</td>
          <td className="amount">{formatCents(row.balanceCents)}</td>
        </tr>
      ))}
    </>
  );
}

function ComparisonRows({ rows }: { rows: ComparisonRow[] }) {
  return (
    <>
      {rows.map((row) => (
        <tr className="line" key={row.account.id}>
          <td>{row.account.name}</td>
          <td className="amount">{formatCents(row.currentCents)}</td>
          <td className="amount">{formatCents(row.previousCents)}</td>
          <td className="amount">{formatCents(row.changeCents)}</td>
        </tr>
      ))}
    </>
  );
}

export default async function ProfitAndLossPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; compare?: string }>;
}) {
  const params = await searchParams;
  const today = todayUtc();
  const startOfYear = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  const from = params.from ? parseIsoDateStrict(params.from) : startOfYear;
  const to = params.to ? parseIsoDateStrict(params.to) : today;
  const compare = params.compare === "previous";
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
  const prev = compare ? previousPeriod(from, to) : null;
  const comparison = prev
    ? comparePnl(report, profitAndLoss(accounts, lines, prev.from, prev.to))
    : null;
  const fromIso = from.toISOString().slice(0, 10);
  const toIso = to.toISOString().slice(0, 10);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Profit &amp; loss</h1>
          <p className="page-subtitle">
            What TFA earned and spent over a period.
          </p>
        </div>
      </div>

      <form method="get" className="report-controls">
        <label>
          From <input type="date" name="from" defaultValue={fromIso} />
        </label>
        <label>
          to <input type="date" name="to" defaultValue={toIso} />
        </label>
        <label>
          <input
            type="checkbox"
            name="compare"
            value="previous"
            defaultChecked={compare}
          />{" "}
          compare to previous period
        </label>
        <button type="submit">Run report</button>
        <a
          href={`/reports/pnl/csv?from=${fromIso}&to=${toIso}`}
          data-testid="csv-link"
        >
          Download CSV
        </a>
      </form>
      <PresetLinks basePath="/reports/pnl" />

      <div className="statement">
        <div className="statement-header">
          <p className="statement-company">TFA</p>
          <p className="statement-title">Profit &amp; Loss</p>
          <p className="statement-dates">
            {prettyDate(from)} – {prettyDate(to)}
            {prev &&
              ` · compared to ${prettyDate(prev.from)} – ${prettyDate(prev.to)}`}
          </p>
        </div>

        {comparison ? (
          <table data-testid="pnl-comparison">
            <thead>
              <tr>
                <th>Account</th>
                <th className="amount">Current</th>
                <th className="amount">Previous</th>
                <th className="amount">Change</th>
              </tr>
            </thead>
            <tbody>
              <tr className="section-head">
                <td>Income</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <ComparisonRows rows={comparison.income} />
              <tr className="total">
                <td>Total income</td>
                <td className="amount" data-testid="total-income">
                  {formatCents(comparison.incomeTotals.currentCents)}
                </td>
                <td className="amount" data-testid="total-income-prev">
                  {formatCents(comparison.incomeTotals.previousCents)}
                </td>
                <td className="amount" data-testid="total-income-change">
                  {formatCents(comparison.incomeTotals.changeCents)}
                </td>
              </tr>
              <tr className="section-head">
                <td>Expenses</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <ComparisonRows rows={comparison.expenses} />
              <tr className="total">
                <td>Total expenses</td>
                <td className="amount" data-testid="total-expenses">
                  {formatCents(comparison.expenseTotals.currentCents)}
                </td>
                <td className="amount" data-testid="total-expenses-prev">
                  {formatCents(comparison.expenseTotals.previousCents)}
                </td>
                <td className="amount" data-testid="total-expenses-change">
                  {formatCents(comparison.expenseTotals.changeCents)}
                </td>
              </tr>
              <tr className="grand-total">
                <td>Net income</td>
                <td className="amount" data-testid="net-income">
                  {formatCents(comparison.netTotals.currentCents)}
                </td>
                <td className="amount" data-testid="net-income-prev">
                  {formatCents(comparison.netTotals.previousCents)}
                </td>
                <td className="amount" data-testid="net-income-change">
                  {formatCents(comparison.netTotals.changeCents)}
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table>
            <tbody>
              <tr className="section-head">
                <td>Income</td>
                <td></td>
              </tr>
              <SectionRows section={report.income} />
              <tr className="total">
                <td>Total income</td>
                <td className="amount" data-testid="total-income">
                  {formatCents(report.income.totalCents)}
                </td>
              </tr>
              <tr className="section-head">
                <td>Expenses</td>
                <td></td>
              </tr>
              <SectionRows section={report.expenses} />
              <tr className="total">
                <td>Total expenses</td>
                <td className="amount" data-testid="total-expenses">
                  {formatCents(report.expenses.totalCents)}
                </td>
              </tr>
              <tr className="grand-total">
                <td>Net income</td>
                <td className="amount" data-testid="net-income">
                  {formatCents(report.netIncomeCents)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
