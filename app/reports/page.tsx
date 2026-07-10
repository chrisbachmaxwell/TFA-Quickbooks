import Link from "next/link";

export const dynamic = "force-dynamic";

const REPORTS = [
  {
    href: "/reports/balance-sheet",
    title: "Balance sheet",
    blurb: "What TFA owns, owes, and keeps — as of any date.",
  },
  {
    href: "/reports/pnl",
    title: "Profit & loss",
    blurb: "Income, expenses, and net income over a period.",
  },
  {
    href: "/reports/cash-flow",
    title: "Cash flow",
    blurb: "Where cash came from and went: operating, investing, financing.",
  },
  {
    href: "/reports/trial-balance",
    title: "Trial balance",
    blurb: "Every account's net balance in debit/credit columns.",
  },
  {
    href: "/reports/general-ledger",
    title: "General ledger",
    blurb: "Every posting in a period, account by account.",
  },
];

export default function ReportsHub() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="page-subtitle">The books, from every angle.</p>
        </div>
      </div>
      {REPORTS.map((report) => (
        <div className="card" key={report.href} data-testid="report-card">
          <p className="card-title" style={{ marginBottom: 4 }}>
            <Link href={report.href}>{report.title}</Link>
          </p>
          <p className="muted" style={{ margin: 0 }}>
            {report.blurb}
          </p>
        </div>
      ))}
    </div>
  );
}
