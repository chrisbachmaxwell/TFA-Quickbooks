import { type NextRequest, NextResponse } from "next/server";
import { trialBalance } from "@/lib/ledger";
import { loadLedger } from "@/lib/reports";
import { trialBalanceCsv } from "@/lib/report-csv";
import { parseIsoDateStrict, todayUtc } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const asOf = sp.get("asOf") ? parseIsoDateStrict(sp.get("asOf")!) : todayUtc();
  if (!asOf) return new NextResponse("invalid date", { status: 400 });
  const { accounts, lines } = await loadLedger();
  const asOfIso = asOf.toISOString().slice(0, 10);
  const csv = trialBalanceCsv(trialBalance(accounts, lines, asOf), asOfIso);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="trial-balance-${asOfIso}.csv"`,
    },
  });
}
