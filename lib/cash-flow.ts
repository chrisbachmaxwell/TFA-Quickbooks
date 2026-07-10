// Direct-method cash flow: every journal entry that moves money in or out
// of a cash account is classified by what the money touched on the other
// side — income/expense → Operating, non-cash assets → Investing,
// liabilities/equity → Financing. Entries that touch no cash account
// (pure accruals) don't move cash and are excluded by construction.
import type { AccountInfo, EntryLine, ReportRow, ReportSection } from "./ledger";

export interface DatedEntry {
  date: Date;
  lines: EntryLine[];
}

export interface CashFlowStatement {
  operating: ReportSection;
  investing: ReportSection;
  financing: ReportSection;
  netChangeCents: number;
  beginningCents: number;
  endingCents: number;
}

type Bucket = "operating" | "investing" | "financing";

function bucketFor(
  type: AccountInfo["type"],
  isCash: boolean,
): Bucket | null {
  if (isCash) return null; // the cash side itself is what we're explaining
  switch (type) {
    case "INCOME":
    case "EXPENSE":
      return "operating";
    case "ASSET":
      return "investing";
    case "LIABILITY":
    case "EQUITY":
      return "financing";
  }
}

export function cashFlow(
  accounts: AccountInfo[],
  cashAccountIds: ReadonlySet<string>,
  entries: DatedEntry[],
  from: Date,
  to: Date,
): CashFlowStatement {
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  let beginningCents = 0;
  const contributions = new Map<string, number>(); // non-cash accountId → cents

  for (const entry of entries) {
    const t = entry.date.getTime();
    const touchesCash = entry.lines.some((l) => cashAccountIds.has(l.accountId));
    if (!touchesCash) continue;
    if (t < from.getTime()) {
      for (const line of entry.lines) {
        if (cashAccountIds.has(line.accountId)) {
          beginningCents += line.debitCents - line.creditCents;
        }
      }
      continue;
    }
    if (t > to.getTime()) continue;
    for (const line of entry.lines) {
      if (cashAccountIds.has(line.accountId)) continue;
      const prev = contributions.get(line.accountId) ?? 0;
      contributions.set(line.accountId, prev + line.creditCents - line.debitCents);
    }
  }

  const sections: Record<Bucket, ReportRow[]> = {
    operating: [],
    investing: [],
    financing: [],
  };
  for (const [accountId, cents] of contributions) {
    if (cents === 0) continue;
    const account = accountById.get(accountId);
    if (!account) continue;
    const bucket = bucketFor(account.type, cashAccountIds.has(accountId));
    if (!bucket) continue;
    sections[bucket].push({ account, balanceCents: cents });
  }

  const toSection = (rows: ReportRow[]): ReportSection => {
    rows.sort((a, b) => a.account.name.localeCompare(b.account.name));
    return {
      rows,
      totalCents: rows.reduce((s, r) => s + r.balanceCents, 0),
    };
  };

  const operating = toSection(sections.operating);
  const investing = toSection(sections.investing);
  const financing = toSection(sections.financing);
  const netChangeCents =
    operating.totalCents + investing.totalCents + financing.totalCents;
  return {
    operating,
    investing,
    financing,
    netChangeCents,
    beginningCents,
    endingCents: beginningCents + netChangeCents,
  };
}
