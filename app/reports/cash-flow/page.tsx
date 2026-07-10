import { cashFlow } from "@/lib/cash-flow";
import type { ReportSection } from "@/lib/ledger";
import { loadEntries } from "@/lib/reports";
import { formatCents } from "@/lib/money";
import { parseIsoDateStrict, todayUtc } from "@/lib/dates";

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
      <h1>Cash flow</h1>
      <div className="banner error" data-testid="error-banner">
        {message}
      </div>
    </div>
  );
}

function Section({
  title,
  section,
  testid,
}: {
  title: string;
  section: ReportSection;
  testid: string;
}) {
  return (
    <>
      <tr className="section-head">
        <td>{title}</td>
        <td></td>
      </tr>
      {section.rows.map((row) => (
        <tr className="line" key={row.account.id}>
          <td>{row.account.name}</td>
          <td className="amount">{formatCents(row.balanceCents)}</td>
        </tr>
      ))}
      <tr className="total">
        <td>Net cash from {title.toLowerCase()}</td>
        <td className="amount" data-testid={testid}>
          {formatCents(section.totalCents)}
        </td>
      </tr>
    </>
  );
}

export default async function CashFlowPage({
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
  const { accounts, cashAccountIds, entries } = await loadEntries();
  const report = cashFlow(accounts, cashAccountIds, entries, from, to);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Cash flow</h1>
          <p className="page-subtitle">
            Where cash actually came from and went.
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

      <div className="statement">
        <div className="statement-header">
          <p className="statement-company">TFA</p>
          <p className="statement-title">Statement of Cash Flows</p>
          <p className="statement-dates">
            {prettyDate(from)} – {prettyDate(to)}
          </p>
        </div>

        <table>
          <tbody>
            <Section
              title="Operating activities"
              section={report.operating}
              testid="cf-operating"
            />
            <Section
              title="Investing activities"
              section={report.investing}
              testid="cf-investing"
            />
            <Section
              title="Financing activities"
              section={report.financing}
              testid="cf-financing"
            />
            <tr className="grand-total">
              <td>Net change in cash</td>
              <td className="amount" data-testid="cf-net-change">
                {formatCents(report.netChangeCents)}
              </td>
            </tr>
            <tr className="line">
              <td>Cash at beginning of period</td>
              <td className="amount" data-testid="cf-beginning">
                {formatCents(report.beginningCents)}
              </td>
            </tr>
            <tr className="total">
              <td>Cash at end of period</td>
              <td className="amount" data-testid="cf-ending">
                {formatCents(report.endingCents)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
