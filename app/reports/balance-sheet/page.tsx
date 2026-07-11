import { balanceSheet, type ReportSection } from "@/lib/ledger";
import { loadLedger } from "@/lib/reports";
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

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  const params = await searchParams;
  const asOf = params.asOf ? parseIsoDateStrict(params.asOf) : todayUtc();
  if (asOf === null) {
    return (
      <div>
        <h1>Balance sheet</h1>
        <div className="banner error" data-testid="error-banner">
          &quot;{params.asOf}&quot; is not a valid date — use YYYY-MM-DD.
        </div>
      </div>
    );
  }
  const asOfIso = asOf.toISOString().slice(0, 10);
  const { accounts, lines } = await loadLedger();
  const report = balanceSheet(accounts, lines, asOf);
  const balanced =
    report.totalAssetsCents === report.totalLiabilitiesAndEquityCents;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Balance sheet</h1>
          <p className="page-subtitle">What TFA owns, owes, and keeps.</p>
        </div>
      </div>

      <form method="get" className="report-controls">
        <label>
          As of <input type="date" name="asOf" defaultValue={asOfIso} />
        </label>
        <button type="submit">Run report</button>
        <a href={`/reports/balance-sheet/csv?asOf=${asOfIso}`} data-testid="csv-link">
          Download CSV
        </a>
      </form>

      <div className="statement">
        <div className="statement-header">
          <p className="statement-company">TFA</p>
          <p className="statement-title">Balance Sheet</p>
          <p className="statement-dates">As of {prettyDate(asOf)}</p>
        </div>

        <table>
          <tbody>
            <tr className="section-head">
              <td>Assets</td>
              <td></td>
            </tr>
            <SectionRows section={report.assets} />
            <tr className="total">
              <td>Total assets</td>
              <td className="amount" data-testid="total-assets">
                {formatCents(report.totalAssetsCents)}
              </td>
            </tr>

            <tr className="section-head">
              <td>Liabilities</td>
              <td></td>
            </tr>
            <SectionRows section={report.liabilities} />
            <tr className="total">
              <td>Total liabilities</td>
              <td className="amount" data-testid="total-liabilities">
                {formatCents(report.liabilities.totalCents)}
              </td>
            </tr>

            <tr className="section-head">
              <td>Equity</td>
              <td></td>
            </tr>
            <SectionRows section={report.equity} />
            <tr className="line">
              <td>Retained earnings</td>
              <td className="amount" data-testid="retained-earnings">
                {formatCents(report.retainedEarningsCents)}
              </td>
            </tr>

            <tr className="grand-total">
              <td>Total liabilities + equity</td>
              <td className="amount" data-testid="total-liabilities-equity">
                {formatCents(report.totalLiabilitiesAndEquityCents)}
              </td>
            </tr>
          </tbody>
        </table>

        <div
          className={`banner ${balanced ? "success" : "error"}`}
          data-testid="balance-check"
          style={{ textAlign: "center" }}
        >
          {balanced
            ? "Assets = Liabilities + Equity ✓"
            : "OUT OF BALANCE — assets do not equal liabilities + equity"}
        </div>
      </div>
    </div>
  );
}
