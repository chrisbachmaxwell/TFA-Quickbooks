import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h1>TFA Books</h1>
      <div className="card">
        <p>Double-entry books for TFA. The usual flow:</p>
        <ol>
          <li>
            Set up the <Link href="/accounts">chart of accounts</Link>.
          </li>
          <li>
            <Link href="/import">Import a bank statement</Link> (CSV).
          </li>
          <li>
            Categorize the imported{" "}
            <Link href="/transactions">transactions</Link>.
          </li>
          <li>
            Read the <Link href="/reports/balance-sheet">balance sheet</Link>{" "}
            and <Link href="/reports/pnl">P&amp;L</Link>.
          </li>
        </ol>
      </div>
    </div>
  );
}
