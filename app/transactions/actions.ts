"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { categorizeBankTransaction } from "@/lib/posting";

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
