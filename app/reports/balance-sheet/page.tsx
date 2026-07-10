import { balanceSheet } from "@/lib/ledger";
import { loadLedger } from "@/lib/reports";
import { formatCents } from "@/lib/money";
import { parseIsoDateStrict, todayUtc } from "@/lib/dates";

export const dynamic = "force-dynamic";

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
      <h1>Balance sheet</h1>
      <form method="get" className="inline">
        <label>
          As of <input type="date" name="asOf" defaultValue={asOfIso} />
        </label>
        <button type="submit">Run report</button>
      </form>

      <h2>Assets</h2>
      <table>
        <tbody>
          {report.assets.rows.map((row) => (
            <tr key={row.account.id}>
              <td>{row.account.name}</td>
              <td className="amount">{formatCents(row.balanceCents)}</td>
            </tr>
          ))}
          <tr className="total">
            <td>Total assets</td>
            <td className="amount" data-testid="total-assets">
              {formatCents(report.totalAssetsCents)}
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Liabilities</h2>
      <table>
        <tbody>
          {report.liabilities.rows.map((row) => (
            <tr key={row.account.id}>
              <td>{row.account.name}</td>
              <td className="amount">{formatCents(row.balanceCents)}</td>
            </tr>
          ))}
          <tr className="total">
            <td>Total liabilities</td>
            <td className="amount" data-testid="total-liabilities">
              {formatCents(report.liabilities.totalCents)}
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Equity</h2>
      <table>
        <tbody>
          {report.equity.rows.map((row) => (
            <tr key={row.account.id}>
              <td>{row.account.name}</td>
              <td className="amount">{formatCents(row.balanceCents)}</td>
            </tr>
          ))}
          <tr>
            <td>Retained earnings</td>
            <td className="amount" data-testid="retained-earnings">
              {formatCents(report.retainedEarningsCents)}
            </td>
          </tr>
          <tr className="total">
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
      >
        {balanced
          ? "Assets = Liabilities + Equity ✓"
          : "OUT OF BALANCE — assets do not equal liabilities + equity"}
      </div>
    </div>
  );
}
