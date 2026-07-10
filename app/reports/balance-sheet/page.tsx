import { balanceSheet } from "@/lib/ledger";
import { loadLedger } from "@/lib/reports";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

function parseIsoDate(s: string | undefined, fallback: Date): Date {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return fallback;
  return new Date(`${s}T00:00:00Z`);
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  const params = await searchParams;
  const asOf = parseIsoDate(params.asOf, todayUtc());
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
