"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { importBankStatement } from "@/lib/import";

export async function uploadStatement(formData: FormData): Promise<void> {
  const bankAccountId = String(formData.get("bankAccountId") ?? "");
  const file = formData.get("file");
  if (!bankAccountId) {
    redirect(`/import?error=${encodeURIComponent("Pick a bank account.")}`);
  }
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/import?error=${encodeURIComponent("Choose a CSV file to upload.")}`);
  }
  let imported = 0;
  let skipped = 0;
  let errorMessage: string | null = null;
  try {
    const result = await importBankStatement(bankAccountId, await file.text());
    imported = result.imported;
    skipped = result.skipped;
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : "import failed";
  }
  if (errorMessage !== null) {
    redirect(`/import?error=${encodeURIComponent(errorMessage)}`);
  }
  revalidatePath("/transactions");
  redirect(`/import?imported=${imported}&skipped=${skipped}`);
}
