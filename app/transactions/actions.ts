"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  categorizeBankTransaction,
  setBankTransactionExcluded,
  uncategorizeBankTransaction,
} from "@/lib/posting";

async function run(op: () => Promise<void>): Promise<void> {
  let errorMessage: string | null = null;
  try {
    await op();
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : "operation failed";
  }
  if (errorMessage !== null) {
    redirect(`/transactions?error=${encodeURIComponent(errorMessage)}`);
  }
  revalidatePath("/transactions");
  redirect("/transactions");
}

export async function uncategorize(formData: FormData): Promise<void> {
  const transactionId = String(formData.get("transactionId") ?? "");
  await run(() => uncategorizeBankTransaction(transactionId));
}

export async function setExcluded(formData: FormData): Promise<void> {
  const transactionId = String(formData.get("transactionId") ?? "");
  const excluded = String(formData.get("excluded") ?? "") === "true";
  await run(() => setBankTransactionExcluded(transactionId, excluded));
}

export async function categorize(formData: FormData): Promise<void> {
  const transactionId = String(formData.get("transactionId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  if (!transactionId || !accountId) {
    redirect(
      `/transactions?error=${encodeURIComponent("Pick a category account.")}`,
    );
  }
  let errorMessage: string | null = null;
  try {
    await categorizeBankTransaction(transactionId, accountId);
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : "categorization failed";
  }
  if (errorMessage !== null) {
    redirect(`/transactions?error=${encodeURIComponent(errorMessage)}`);
  }
  revalidatePath("/transactions");
  redirect("/transactions");
}
