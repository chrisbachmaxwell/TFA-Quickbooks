import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatCents } from "@/lib/money";
import SplitForm from "./split-form";

export const dynamic = "force-dynamic";

export default async function SplitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const txn = await prisma.bankTransaction.findUnique({
    where: { id },
    include: { bankAccount: true },
  });
  if (!txn) notFound();
  const accounts = await prisma.account.findMany({
    where: { active: true, id: { not: txn.bankAccountId } },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Split transaction</h1>
          <p className="page-subtitle">
            Divide one bank line across several accounts.
          </p>
        </div>
      </div>

      {error && (
        <div className="banner error" data-testid="error-banner">
          {error}
        </div>
      )}

      <div className="card">
        <p className="card-title">
          {txn.date.toISOString().slice(0, 10)} · {txn.description} ·{" "}
          <span className={txn.amountCents > 0 ? "amount-pos" : ""}>
            {formatCents(txn.amountCents)}
          </span>{" "}
          <span className="muted">({txn.bankAccount.name})</span>
        </p>
        {txn.journalEntryId ? (
          <p>
            This transaction is already categorized —{" "}
            <Link href="/transactions">undo it from the review screen</Link>{" "}
            first if you want to split it differently.
          </p>
        ) : txn.excluded ? (
          <p>
            This transaction is excluded —{" "}
            <Link href="/transactions">restore it</Link> before splitting.
          </p>
        ) : (
          <SplitForm
            transactionId={txn.id}
            absAmountCents={Math.abs(txn.amountCents)}
            accounts={accounts.map((a) => ({
              id: a.id,
              name: a.name,
              type: a.type,
            }))}
          />
        )}
      </div>
      <p>
        <Link href="/transactions">← Back to transactions</Link>
      </p>
    </div>
  );
}
