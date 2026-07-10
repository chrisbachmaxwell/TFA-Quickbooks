import Link from "next/link";
import { prisma } from "@/lib/db";
import { loadLedger } from "@/lib/reports";
import { profitAndLoss } from "@/lib/ledger";
import { cashBalanceCents, monthlyIncomeExpenses } from "@/lib/dashboard";
import { formatCents } from "@/lib/money";
import { todayUtc } from "@/lib/dates";
import MonthlyChart from "./monthly-chart";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [{ accounts, lines }, toReview, hasAccounts] = await Promise.all([
    loadLedger(),
    prisma.bankTransaction.count({ where: { journalEntryId: null } }),
    prisma.account.count().then((n) => n > 0),
  ]);

  const today = todayUtc();
  const year = today.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const ytd = profitAndLoss(accounts, lines, startOfYear, today);
  const cash = cashBalanceCents(accounts, lines);
  const months = monthlyIncomeExpenses(accounts, lines, year);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">
            TFA · books through {today.toISOString().slice(0, 10)}
          </p>
        </div>
      </div>

      {!hasAccounts ? (
        <div className="card empty-state">
          <div className="glyph">📒</div>
          <p>
            <strong>Welcome to TFA Books.</strong>
          </p>
          <p>
            Start by setting up your <Link href="/accounts">chart of accounts</Link>,
            then <Link href="/import">import a bank statement</Link>.
          </p>
        </div>
      ) : (
        <>
          {toReview > 0 && (
            <div className="banner success" data-testid="review-callout">
              <strong>{toReview}</strong> transaction{toReview === 1 ? "" : "s"}{" "}
              waiting for review — <Link href="/transactions">categorize now</Link>
            </div>
          )}

          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Cash on hand</div>
              <div className="kpi-value" data-testid="kpi-cash">
                {formatCents(cash)}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Income · YTD</div>
              <div className="kpi-value" data-testid="kpi-income">
                {formatCents(ytd.income.totalCents)}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Expenses · YTD</div>
              <div className="kpi-value" data-testid="kpi-expenses">
                {formatCents(ytd.expenses.totalCents)}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Net income · YTD</div>
              <div
                className={`kpi-value ${ytd.netIncomeCents > 0 ? "pos" : ytd.netIncomeCents < 0 ? "neg" : ""}`}
                data-testid="kpi-net"
              >
                {formatCents(ytd.netIncomeCents)}
              </div>
            </div>
          </div>

          <MonthlyChart months={months} year={year} />
        </>
      )}
    </div>
  );
}
