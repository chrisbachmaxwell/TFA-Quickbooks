import { type NextRequest, NextResponse } from "next/server";
import { cashFlow } from "@/lib/cash-flow";
import { loadEntries } from "@/lib/reports";
import { cashFlowCsv } from "@/lib/report-csv";
import { parseIsoDateStrict, todayUtc } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const today = todayUtc();
  const startOfYear = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  const from = sp.get("from") ? parseIsoDateStrict(sp.get("from")!) : startOfYear;
  const to = sp.get("to") ? parseIsoDateStrict(sp.get("to")!) : today;
  if (!from || !to || from.getTime() > to.getTime()) {
    return new NextResponse("invalid date range", { status: 400 });
  }
  const { accounts, cashAccountIds, entries } = await loadEntries();
  const fromIso = from.toISOString().slice(0, 10);
  const toIso = to.toISOString().slice(0, 10);
  const csv = cashFlowCsv(
    cashFlow(accounts, cashAccountIds, entries, from, to),
    fromIso,
    toIso,
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cash-flow-${fromIso}-to-${toIso}.csv"`,
    },
  });
}
