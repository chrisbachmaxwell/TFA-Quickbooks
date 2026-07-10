"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteManualEntry, postJournalEntry } from "@/lib/posting";
import { parseManualEntryLines, type JournalFormRow } from "@/lib/journal-form";
import { parseIsoDateStrict } from "@/lib/dates";
import { formatCents } from "@/lib/money";

function fail(message: string): never {
  redirect(`/journal?error=${encodeURIComponent(message)}`);
}

export async function createEntry(formData: FormData): Promise<void> {
  const dateRaw = String(formData.get("date") ?? "");
  const memo = String(formData.get("memo") ?? "").trim();
  const count = Number(formData.get("lineCount") ?? 0);
  const date = parseIsoDateStrict(dateRaw);
  if (!date) fail("Pick a valid date.");
  if (!memo) fail("A memo is required — say what this entry is.");
  const rows: JournalFormRow[] = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      accountId: String(formData.get(`account_${i}`) ?? ""),
      debit: String(formData.get(`debit_${i}`) ?? ""),
      credit: String(formData.get(`credit_${i}`) ?? ""),
    });
  }
  let errorMessage: string | null = null;
  try {
    const lines = parseManualEntryLines(rows);
    const debits = lines.reduce((s, l) => s + l.debitCents, 0);
    const credits = lines.reduce((s, l) => s + l.creditCents, 0);
    if (debits !== credits) {
      throw new Error(
        `Entry doesn't balance: debits ${formatCents(debits)} vs credits ${formatCents(credits)}.`,
      );
    }
    await postJournalEntry({ date, memo, lines });
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : "could not post entry";
  }
  if (errorMessage !== null) fail(errorMessage);
  revalidatePath("/journal");
  redirect("/journal");
}

export async function removeManualEntry(formData: FormData): Promise<void> {
  const entryId = String(formData.get("entryId") ?? "");
  let errorMessage: string | null = null;
  try {
    await deleteManualEntry(entryId);
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : "could not delete entry";
  }
  if (errorMessage !== null) fail(errorMessage);
  revalidatePath("/journal");
  redirect("/journal");
}
