import { trialBalance } from "@/lib/ledger";
import { loadLedger } from "@/lib/reports";
import { formatCents } from "@/lib/money";
import { parseIsoDateStrict, todayUtc } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function TrialBalancePage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>;
}) {
  const params = await searchParams;
  const asOf = params.asOf ? parseIsoDateStrict(params.asOf) : todayUtc();
  if (asOf === null) {
    return (
      <div>
        <h1>Trial balance</h1>
        <div className="banner error" data-testid="error-banner">
          &quot;{params.asOf}&quot; is not a valid date — use YYYY-MM-DD.
        </div>
      </div>
    );
  }
  const { accounts, lines } = await loadLedger();
  const tb = trialBalance(accounts, lines, asOf);
  const balanced = tb.totalDebitsCents === tb.totalCreditsCents;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Trial balance</h1>
          <p className="page-subtitle">
            Every account&apos;s net balance — debits left, credits right,
            totals equal or something is broken.
          </p>
        </div>
      </div>

      <form method="get" className="report-controls">
        <label>
          As of{" "}
          <input
            type="date"
            name="asOf"
            defaultValue={asOf.toISOString().slice(0, 10)}
          />
        </label>
        <button type="submit">Run report</button>
      </form>

      <div className="statement">
        <div className="statement-header">
          <p className="statement-company">TFA</p>
          <p className="statement-title">Trial Balance</p>
          <p className="statement-dates">
            As of {asOf.toISOString().slice(0, 10)}
          </p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th className="amount">Debit</th>
              <th className="amount">Credit</th>
            </tr>
          </thead>
          <tbody>
            {tb.rows.map((row) => (
              <tr className="line" key={row.account.id}>
                <td>{row.account.name}</td>
                <td className="amount">
                  {row.debitCents > 0 ? formatCents(row.debitCents) : ""}
                </td>
                <td className="amount">
                  {row.creditCents > 0 ? formatCents(row.creditCents) : ""}
                </td>
              </tr>
            ))}
            <tr className="grand-total">
              <td>Totals</td>
              <td className="amount" data-testid="tb-total-debits">
                {formatCents(tb.totalDebitsCents)}
              </td>
              <td className="amount" data-testid="tb-total-credits">
                {formatCents(tb.totalCreditsCents)}
              </td>
            </tr>
          </tbody>
        </table>
        <div
          className={`banner ${balanced ? "success" : "error"}`}
          data-testid="tb-check"
          style={{ textAlign: "center" }}
        >
          {balanced
            ? "Debits = Credits ✓"
            : "OUT OF BALANCE — the ledger is corrupt"}
        </div>
      </div>
    </div>
  );
}
