"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { categorizeBankTransactionSplit } from "@/lib/posting";
import { parseAmountToCents } from "@/lib/money";
import type { SplitInput } from "@/lib/ledger";

export async function submitSplit(formData: FormData): Promise<void> {
  const transactionId = String(formData.get("transactionId") ?? "");
  const count = Number(formData.get("lineCount") ?? 0);
  let errorMessage: string | null = null;
  try {
    const splits: SplitInput[] = [];
    for (let i = 0; i < count; i++) {
      const accountId = String(formData.get(`account_${i}`) ?? "");
      const amountRaw = String(formData.get(`amount_${i}`) ?? "").trim();
      if (!accountId && !amountRaw) continue; // blank row
      if (!accountId) throw new Error(`Line ${i + 1}: pick an account`);
      if (!amountRaw) throw new Error(`Line ${i + 1}: enter an amount`);
      splits.push({ accountId, amountCents: parseAmountToCents(amountRaw) });
    }
    await categorizeBankTransactionSplit(transactionId, splits);
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : "split failed";
  }
  if (errorMessage !== null) {
    redirect(
      `/transactions/${transactionId}/split?error=${encodeURIComponent(errorMessage)}`,
    );
  }
  revalidatePath("/transactions");
  redirect("/transactions");
}
